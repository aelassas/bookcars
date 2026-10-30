"use server";

import { db } from "@/platform/db/client";
import { integrationConnection, tenant, customer, lead, deal, vehicle, integrationEvent } from "@/platform/db/schema";
import { eq, and, count, max } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";
import { syncKaitenBoard } from "@/platform/integrations/kaiten/sync";
import { assertSafeBitrixWebhookUrl } from "@/platform/integrations/bitrix24/url-guard";
import {
  scheduleRecurringSync,
  unscheduleRecurringSync,
} from "@/platform/jobs/sync-jobs";
import { revalidatePath } from "next/cache";

import { requireTenantAdmin } from "@/platform/auth/authorization";

// Private guard: resolve the tenant slug from tenantId (cross-tenant lookup via raw db),
// then verify the current session holds tenant_admin or platform_admin for that tenant.
async function verifyAdmin(tenantId: string) {
  const [row] = await db
    .select({ slug: tenant.slug })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  if (!row) throw new Error("Forbidden: tenant not found");
  return requireTenantAdmin(row.slug);
}

// ─── Connect / Save Credentials ──────────────────────────────────────────────

export async function connectBitrix24(tenantId: string, webhookUrl: string) {
  await verifyAdmin(tenantId);
  // Validate URL + block internal/private hosts (SSRF). See url-guard.ts.
  assertSafeBitrixWebhookUrl(webhookUrl);

  await db
    .insert(integrationConnection)
    .values({
      tenantId,
      provider: "bitrix24",
      config: { webhookUrl },
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrationConnection.tenantId, integrationConnection.provider],
      set: { config: { webhookUrl }, status: "active", updatedAt: new Date() },
    });

  await db
    .update(tenant)
    .set({ migrationStatus: "connected" })
    .where(eq(tenant.id, tenantId));

  revalidatePath("/");
  return { ok: true };
}

export async function connectKaiten(tenantId: string, apiKey: string) {
  await verifyAdmin(tenantId);
  if (!apiKey || apiKey.length < 10) {
    throw new Error("Invalid Kaiten API key.");
  }

  await db
    .insert(integrationConnection)
    .values({
      tenantId,
      provider: "kaiten",
      config: { apiKey },
      status: "active",
    })
    .onConflictDoUpdate({
      target: [integrationConnection.tenantId, integrationConnection.provider],
      set: { config: { apiKey }, status: "active", updatedAt: new Date() },
    });

  await db
    .update(tenant)
    .set({ migrationStatus: "connected" })
    .where(eq(tenant.id, tenantId));

  revalidatePath("/");
  return { ok: true };
}

// ─── Sync Now ────────────────────────────────────────────────────────────────

export async function syncBitrix24Now(tenantId: string, quickPreview = false) {
  await verifyAdmin(tenantId);
  const [conn] = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, "bitrix24")
      )
    )
    .limit(1);

  if (!conn) throw new Error("Bitrix24 not connected.");

  const config = conn.config as { webhookUrl?: string };
  if (!config.webhookUrl) throw new Error("Bitrix24 webhook URL missing.");

  await db
    .update(tenant)
    .set({ migrationStatus: "preview" })
    .where(eq(tenant.id, tenantId));

  const result = await syncBitrix24(db, tenantId, config.webhookUrl, {
    maxRecordsPerEntity: quickPreview ? 200 : undefined,
  });

  await db
    .update(integrationConnection)
    .set({ lastSyncAt: new Date() })
    .where(eq(integrationConnection.id, conn.id));

  // Start recurring auto-sync every 6 hours
  await scheduleRecurringSync(tenantId);

  revalidatePath("/");
  return result;
}

export async function syncKaitenNow(tenantId: string) {
  await verifyAdmin(tenantId);
  const [conn] = await db
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.tenantId, tenantId),
        eq(integrationConnection.provider, "kaiten")
      )
    )
    .limit(1);

  if (!conn) throw new Error("Kaiten not connected.");

  const config = conn.config as { apiKey?: string };
  if (!config.apiKey) throw new Error("Kaiten API key missing.");

  await db
    .update(tenant)
    .set({ migrationStatus: "preview" })
    .where(eq(tenant.id, tenantId));

  const result = await syncKaitenBoard(db, tenantId, config.apiKey);

  await db
    .update(integrationConnection)
    .set({ lastSyncAt: new Date() })
    .where(eq(integrationConnection.id, conn.id));

  // Start recurring auto-sync every 6 hours
  await scheduleRecurringSync(tenantId);

  revalidatePath("/");
  return result;
}

// ─── Cutover ─────────────────────────────────────────────────────────────────

export async function cutoverToPlatform(tenantId: string) {
  await verifyAdmin(tenantId);
  await db
    .update(tenant)
    .set({ migrationStatus: "cutover" })
    .where(eq(tenant.id, tenantId));

  // Stop recurring auto-sync jobs
  await unscheduleRecurringSync(tenantId);

  revalidatePath("/");
  return { ok: true };
}

// ─── Status / Counts ─────────────────────────────────────────────────────────

export async function getIntegrationStatus(tenantId: string) {
  await verifyAdmin(tenantId);
  const [tenantRow] = await db
    .select({ migrationStatus: tenant.migrationStatus })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);

  const conns = await db
    .select()
    .from(integrationConnection)
    .where(eq(integrationConnection.tenantId, tenantId));

  const bitrixConn = conns.find((c) => c.provider === "bitrix24");
  const kaitenConn = conns.find((c) => c.provider === "kaiten");

  const [contactCount] = await db
    .select({ count: count() })
    .from(customer)
    .where(and(eq(customer.tenantId, tenantId), eq(customer.externalSource, "bitrix24")));

  const [leadCount] = await db
    .select({ count: count() })
    .from(lead)
    .where(and(eq(lead.tenantId, tenantId), eq(lead.externalSource, "bitrix24")));

  const [dealCount] = await db
    .select({ count: count() })
    .from(deal)
    .where(and(eq(deal.tenantId, tenantId), eq(deal.externalSource, "bitrix24")));

  const [vehicleCount] = await db
    .select({ count: count() })
    .from(vehicle)
    .where(and(eq(vehicle.tenantId, tenantId), eq(vehicle.externalSource, "kaiten")));

  // CallGear — ANALYZE-ONLY. Key lives in server env (never in DB); this is pure
  // status (observed-call count from integration_event). No connect/sync/send
  // action exists for CallGear — the platform only reads, never writes back.
  const [callgearAgg] = await db
    .select({ calls: count(), lastAt: max(integrationEvent.receivedAt) })
    .from(integrationEvent)
    .where(and(eq(integrationEvent.tenantId, tenantId), eq(integrationEvent.provider, "callgear")));
  const callgearKeySet = Boolean(process.env.CALLGEAR_API_KEY);

  return {
    migrationStatus: tenantRow?.migrationStatus ?? "none",
    callgear: {
      mode: callgearKeySet ? ("live" as const) : ("not_connected" as const),
      baseUrl: process.env.CALLGEAR_BASE_URL ?? "https://api.callgear.com",
      counts: { calls: callgearAgg?.calls ?? 0 },
      lastEventAt: callgearAgg?.lastAt ?? null,
    },
    bitrix: bitrixConn
      ? {
          status: bitrixConn.status,
          lastSyncAt: bitrixConn.lastSyncAt,
          counts: {
            contacts: contactCount?.count ?? 0,
            leads: leadCount?.count ?? 0,
            deals: dealCount?.count ?? 0,
          },
        }
      : null,
    kaiten: kaitenConn
      ? {
          status: kaitenConn.status,
          lastSyncAt: kaitenConn.lastSyncAt,
          counts: {
            vehicles: vehicleCount?.count ?? 0,
          },
        }
      : null,
  };
}
