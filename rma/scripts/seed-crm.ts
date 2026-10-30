import { config } from "dotenv";
config({ path: ".env.local" });

import { and, eq } from "drizzle-orm";
import { db } from "../src/platform/db/client";
import {
  tenant,
  tenantMember,
  user,
  lead,
  deal,
  integrationEvent,
} from "../src/platform/db/schema";
import { withDrizzleTenant } from "../src/platform/tenancy/rls";
import { generateCallGearWebhookToken } from "../src/platform/integrations/callgear/webhook";

async function findOrCreateTenant(slug: string, name: string) {
  const [existing] = await db.select().from(tenant).where(eq(tenant.slug, slug)).limit(1);
  if (existing) {
    // Backfill a webhook token if one was never set (pre-0005 tenants).
    if (!existing.callgearWebhookToken) {
      const rows = await db
        .update(tenant)
        .set({ callgearWebhookToken: generateCallGearWebhookToken() })
        .where(eq(tenant.id, existing.id))
        .returning();
      return Array.isArray(rows) ? rows[0] : rows;
    }
    return existing;
  }
  const rows = await db
    .insert(tenant)
    .values({ slug, name, callgearWebhookToken: generateCallGearWebhookToken() })
    .returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function findOrCreateUser(email: string) {
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing) return existing;
  const rows = await db.insert(user).values({ email, name: email.split("@")[0] }).returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function findOrCreateMember(tenantId: string, userId: string) {
  const existing = await db
    .select()
    .from(tenantMember)
    .where(eq(tenantMember.userId, userId));
  const match = existing.find((m) => m.tenantId === tenantId);
  if (match) return match;
  const rows = await db
    .insert(tenantMember)
    .values({ tenantId, userId, roles: ["tenant_admin"] })
    .returning();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function seed() {
  const t = await findOrCreateTenant("take-auto", "TAKE Auto");
  console.log(`Tenant take-auto: ${t.id}`);

  const devEmail = process.env.DEV_USER_EMAIL;
  if (devEmail) {
    const u = await findOrCreateUser(devEmail);
    await findOrCreateMember(t.id, u.id);
    console.log(`Bound ${devEmail} as tenant_admin of take-auto`);
  }

  const [l1] = await withDrizzleTenant(t.id, (tx) =>
    tx
      .insert(lead)
      .values({
        tenantId: t.id,
        customerName: "Ahmed Al-Rashid",
        phone: "+971501234567",
        email: "ahmed@example.com",
        source: "WhatsApp",
        status: "new",
      })
      .returning()
  );

  const [l2] = await withDrizzleTenant(t.id, (tx) =>
    tx
      .insert(lead)
      .values({
        tenantId: t.id,
        customerName: "Sarah Johnson",
        phone: "+971502345678",
        source: "CallGear",
        status: "contacted",
      })
      .returning()
  );

  await withDrizzleTenant(t.id, (tx) =>
    tx
      .insert(deal)
      .values({
        tenantId: t.id,
        ref: "R-2026-001",
        type: "rent",
        leadId: l1.id,
        value: 15000,
        stage: "inquiry",
        status: "open",
      })
      .returning()
  );

  await withDrizzleTenant(t.id, (tx) =>
    tx
      .insert(deal)
      .values({
        tenantId: t.id,
        ref: "L-2026-002",
        type: "lease",
        leadId: l2.id,
        value: 45000,
        stage: "quote",
        status: "open",
      })
      .returning()
  );

  await withDrizzleTenant(t.id, (tx) =>
    tx
      .insert(deal)
      .values({
        tenantId: t.id,
        ref: "P-2026-003",
        type: "purchase",
        value: 180000,
        stage: "contract",
        status: "open",
      })
      .returning()
  );

  await seedCallGearEvents(t.id);

  console.log("CRM seeded ✅");
}

async function seedCallGearEvents(tenantId: string) {
  const fixtures = [
    {
      callId: "cg-demo-001",
      from: "+971501112233",
      to: "+97142000000",
      duration: 47,
      agent: { name: "Sara K.", extension: "1101" },
      customer: { name: "Hassan Al-Mansoori", phone: "+971501112233" },
    },
    {
      callId: "cg-demo-002",
      from: "+971559876543",
      to: "+97142000000",
      duration: 122,
      agent: { name: "Omar T.", extension: "1102" },
      customer: { name: "Aisha Rahman", phone: "+971559876543" },
    },
  ] as const;

  for (const fx of fixtures) {
    const existing = await db
      .select()
      .from(integrationEvent)
      .where(
        and(
          eq(integrationEvent.provider, "callgear"),
          eq(integrationEvent.providerEventId, fx.callId)
        )
      )
      .limit(1);
    if (existing[0]) continue;
    const now = new Date();
    const startTime = new Date(now.getTime() - fx.duration * 1000).toISOString();
    const payload = {
      jsonrpc: "2.0",
      method: "call.finished",
      id: fx.callId,
      params: {
        callId: fx.callId,
        startTime,
        endTime: now.toISOString(),
        duration: fx.duration,
        direction: "inbound",
        from: fx.from,
        to: fx.to,
        recordingUrl: `https://example.invalid/recordings/${fx.callId}.mp3`,
        agent: fx.agent,
        customer: fx.customer,
        metadata: { seed: true },
      },
    };
    await withDrizzleTenant(tenantId, async (tx) => {
      await tx.insert(integrationEvent).values({
        tenantId,
        provider: "callgear",
        providerEventId: fx.callId,
        signatureValid: true,
        rawPayload: payload as unknown as Record<string, unknown>,
        normalizedType: "call.finished",
      });
    });
  }
  console.log(`Seeded ${fixtures.length} CallGear events`);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
