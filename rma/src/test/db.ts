import { db, pool } from "@/platform/db/client";
import { user, tenant, tenantMember, lead, company, customer, message } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { inArray } from "drizzle-orm";

export function hasTestDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

// Company-scope RLS (migration 0033) is only enforced when the app connects as
// a non-BYPASSRLS role. Tests that assert scoping must skip otherwise (the
// owner role silently sees everything).
export function hasAppRole(): boolean {
  return !!process.env.DB_APP_ROLE?.trim();
}

export async function createTestCompany(tenantId: string, slug: string, name: string, businessLine: "rental" | "leasing") {
  const rows = await db.insert(company).values({ tenantId, slug, name, businessLine }).returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function createTestCustomer(tenantId: string, companyId: string, name: string, division: "rent" | "lease") {
  const rows = await db.insert(customer).values({ tenantId, companyId, name, division }).returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

/**
 * Read the customer table inside a transaction with the company-scope GUCs set
 * manually (simulating a signed-in user's scope without a session). Mirrors how
 * withTenant/withDrizzleTenant set app.tenant_id / app.is_cross / app.company_ids.
 */
export async function readCustomersScoped(tenantId: string, companyIds: string[], isCross: boolean) {
  const appRole = process.env.DB_APP_ROLE?.trim();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (appRole) await client.query(`SET LOCAL ROLE "${appRole}"`);
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    await client.query(`SET LOCAL app.is_cross = '${isCross ? "on" : "off"}'`);
    await client.query(`SET LOCAL app.company_ids = '${companyIds.join(",")}'`);
    const res = await client.query("SELECT id, company_id FROM customer");
    await client.query("COMMIT");
    return res.rows as { id: string; company_id: string | null }[];
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function createTestUser(email: string) {
  const rows = await db.insert(user).values({ email }).returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function createTestTenant(slug: string, name: string) {
  const rows = await db
    .insert(tenant)
    .values({ slug, name, modules: ["crm"] })
    .returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function addTestMember(tenantId: string, userId: string, roles: string[]) {
  const rows = await db
    .insert(tenantMember)
    .values({ tenantId, userId, roles })
    .returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function createTestLead(tenantId: string, customerName: string) {
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(lead)
      .values({ tenantId, customerName, status: "new" })
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

/**
 * Insert one inbound WhatsApp message on a lead's thread.
 *
 * `line` is the observer line slug the message arrived on — the `to` column.
 * It is what decides which line a reply goes out from, so tests that care
 * about the reply path must be able to leave it null.
 */
export async function createTestInboundMessage(
  tenantId: string,
  leadId: string,
  opts: { from: string; fromPn?: string | null; line?: string | null; body?: string },
) {
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(message)
      .values({
        tenantId,
        channel: "whatsapp",
        direction: "inbound",
        from: opts.from,
        fromPn: opts.fromPn ?? null,
        to: opts.line ?? null,
        body: opts.body ?? "test",
        relatedEntityType: "lead",
        relatedEntityId: leadId,
      })
      .returning();
    return Array.isArray(rows) ? rows[0] : rows;
  });
}

export async function cleanupTestEntities(ids: {
  users?: string[];
  tenants?: string[];
}) {
  // Children before parents: tenant_member references both user and tenant,
  // and the fixture leads reference their tenant — deleting a user or tenant
  // first trips the FK. Deletes ALL passed ids, not just the first.
  if (ids.tenants?.length) {
    await db.delete(tenantMember).where(inArray(tenantMember.tenantId, ids.tenants));
    await db.delete(message).where(inArray(message.tenantId, ids.tenants));
    await db.delete(lead).where(inArray(lead.tenantId, ids.tenants));
    await db.delete(tenant).where(inArray(tenant.id, ids.tenants));
  }
  if (ids.users?.length) {
    await db.delete(tenantMember).where(inArray(tenantMember.userId, ids.users));
    await db.delete(user).where(inArray(user.id, ids.users));
  }
}

export async function resetPool() {
  await pool.end();
}
