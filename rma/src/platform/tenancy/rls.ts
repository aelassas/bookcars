import { sql } from "drizzle-orm";
import type { PoolClient } from "pg";
import { db, pool } from "@/platform/db/client";
import { setSentryTenant } from "@/platform/observability/tenant-scope";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the company-scope GUC values for the current signed-in user.
 * Returns `companyIds` as a comma-separated, UUID-validated string ('' = no
 * restriction → system/jobs/admin keep full tenant visibility) and `isCross`.
 * Any non-request / session-less context (jobs, scripts, tests) resolves to
 * unscoped, so RLS company scoping is a no-op there (no regression).
 *
 * getUserScope is imported dynamically so this module's static graph stays free
 * of the auth/next-auth chain (which does not resolve in the test runtime).
 */
async function resolveCompanyGuc(tenantId: string): Promise<{ companyIds: string; isCross: boolean }> {
  try {
    const { getUserScope } = await import("@/platform/auth/scope");
    const s = await getUserScope(tenantId);
    const ids = (s.companyIds ?? []).filter((id) => UUID_RE.test(id));
    return { companyIds: ids.join(","), isCross: !!s.crossBranch };
  } catch {
    // No session / lookup failed / non-request context → unscoped.
    return { companyIds: "", isCross: false };
  }
}

// SECURITY: the app connects as a DB owner role which, on managed Postgres
// (e.g. Neon's neondb_owner), has BYPASSRLS — meaning RLS is NOT enforced
// at runtime even though the policies exist. Set DB_APP_ROLE to a
// non-BYPASSRLS role (see scripts/create-app-role.ts) and every tenant
// transaction will `SET LOCAL ROLE` to it, so RLS is actually enforced.
// Unset (dev default) = previous behaviour, no regression.
//
// Auth/admin lookups that must read across tenants without a tenant_id
// (e.g. resolving which tenant a user belongs to) intentionally stay on
// the owner connection via plain `db`, not these helpers.
const APP_ROLE = process.env.DB_APP_ROLE?.trim() || null;
if (APP_ROLE && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(APP_ROLE)) {
  throw new Error(`Invalid DB_APP_ROLE: ${APP_ROLE}`);
}

/**
 * Run a callback inside a Postgres transaction with RLS tenant context set.
 * Every tenant-scoped query must go through this helper.
 *
 * The GUC'd `client` is passed into `fn` and ALL DB work must run on it —
 * `SET LOCAL` only applies to this transaction/connection, so querying the
 * global `db` (a different pool connection) would silently escape the tenant
 * context and RLS would not apply.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!UUID_RE.test(tenantId)) throw new Error("Invalid tenantId format");
  // Attribute any error captured in this scope to the tenant.
  setSentryTenant(tenantId);
  const scope = await resolveCompanyGuc(tenantId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (APP_ROLE) await client.query(`SET LOCAL ROLE "${APP_ROLE}"`);
    await client.query(`SET LOCAL app.tenant_id = '${tenantId}'`);
    await client.query(`SET LOCAL app.is_cross = '${scope.isCross ? "on" : "off"}'`);
    await client.query(`SET LOCAL app.company_ids = '${scope.companyIds}'`);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Same as withTenant but uses Drizzle's transaction wrapper.
 * SET LOCAL cannot use parameterized queries ($1), so we use sql.raw().
 */
export async function withDrizzleTenant<T>(
  tenantId: string,
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  // Validate UUID format to prevent injection
  if (!UUID_RE.test(tenantId)) {
    throw new Error("Invalid tenantId format");
  }

  // Attribute any error captured in this scope to the tenant.
  setSentryTenant(tenantId);
  const scope = await resolveCompanyGuc(tenantId);
  return db.transaction(async (tx) => {
    if (APP_ROLE) await tx.execute(sql.raw(`SET LOCAL ROLE "${APP_ROLE}"`));
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
    await tx.execute(sql.raw(`SET LOCAL app.is_cross = '${scope.isCross ? "on" : "off"}'`));
    await tx.execute(sql.raw(`SET LOCAL app.company_ids = '${scope.companyIds}'`));
    return fn(tx as unknown as typeof db);
  });
}
