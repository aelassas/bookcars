"use server";

import { db } from "@/platform/db/client";
import { integrationConnection, tenant } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import { createBitrix24Client } from "@/platform/integrations/bitrix24/client";
import { assertSafeBitrixWebhookUrl } from "@/platform/integrations/bitrix24/url-guard";
import { enqueueBitrixDryRun, getBitrixDryRunProgress } from "@/platform/jobs/bitrix-discovery";
import { revalidatePath } from "next/cache";
import { requireTenantAdmin } from "@/platform/auth/authorization";

// Bitrix list endpoints answer either a bare array or `{ items: [...] }`
// depending on the method/portal version — model both shapes.
type BitrixListResult<T> = T[] | { items?: T[] };

function bitrixItems<T>(result: BitrixListResult<T> | undefined): T[] {
  return Array.isArray(result) ? result : result?.items ?? [];
}

interface BitrixDealCategory {
  ID: string | number;
  NAME: string;
}

interface BitrixUserField {
  FIELD_NAME?: string;
}

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


// ─── Connection test ────────────────────────────────────────────────────────

export async function testBitrixConnection(tenantId: string, webhookUrl: string) {
  await verifyAdmin(tenantId);
  // Validate URL + block internal/private hosts (SSRF) — must be a public
  // Bitrix24 REST endpoint. See url-guard.ts.
  assertSafeBitrixWebhookUrl(webhookUrl);
  const client = createBitrix24Client(webhookUrl);
  const res = await client.call<{
    portal?: { NAME?: string };
    LICENSE?: string;
    admin_count?: number;
  }>("app.info");
  if (res.error) {
    throw new Error(`${res.error}: ${res.error_description}`);
  }
  return {
    portalName: res.result?.portal?.NAME ?? res.result?.LICENSE ?? "Bitrix24",
    adminCount: res.result?.admin_count ?? 0,
  };
}

// ─── Save / mask connection ─────────────────────────────────────────────────

export async function saveBitrixConnection(tenantId: string, webhookUrl: string) {
  await verifyAdmin(tenantId);
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

export async function getBitrixConnection(tenantId: string) {
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

  if (!conn) return null;
  const config = conn.config as { webhookUrl?: string };
  const url = config.webhookUrl ?? "";
  return {
    connected: true,
    maskedUrl: url.length > 4 ? "…" + url.slice(-4) : url,
    lastSyncAt: conn.lastSyncAt,
  };
}

// ─── Pipeline mapping ───────────────────────────────────────────────────────

async function getStoredWebhookUrl(tenantId: string): Promise<string> {
  const [conn] = await db
    .select()
    .from(integrationConnection)
    .where(and(eq(integrationConnection.tenantId, tenantId), eq(integrationConnection.provider, "bitrix24")))
    .limit(1);
  if (!conn) throw new Error("Bitrix24 not connected.");
  const config = conn.config as { webhookUrl?: string };
  if (!config.webhookUrl) throw new Error("Bitrix24 webhook URL missing.");
  return config.webhookUrl;
}

export async function fetchBitrixPipelines(tenantId: string) {
  await verifyAdmin(tenantId);
  const webhookUrl = await getStoredWebhookUrl(tenantId);
  const client = createBitrix24Client(webhookUrl);
  const res = await client.call<BitrixListResult<BitrixDealCategory>>("crm.dealcategory.list", {});
  const items = bitrixItems(res.result);
  return items.map((p) => ({
    id: String(p.ID),
    name: String(p.NAME),
  }));
}

export async function savePipelineMapping(
  tenantId: string,
  mapping: Record<string, string>
) {
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

  if (!conn) throw new Error("Bitrix24 not connected");

  const config = conn.config as Record<string, unknown>;
  await db
    .update(integrationConnection)
    .set({
      config: { ...config, pipelineMapping: mapping },
      updatedAt: new Date(),
    })
    .where(eq(integrationConnection.id, conn.id));

  revalidatePath("/");
  return { ok: true };
}

export async function getPipelineMapping(tenantId: string) {
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

  if (!conn) return {};
  const config = conn.config as { pipelineMapping?: Record<string, string> };
  return config.pipelineMapping ?? {};
}

// ─── Discovery counts ───────────────────────────────────────────────────────

export async function runDiscoveryCounts(tenantId: string) {
  await verifyAdmin(tenantId);
  const webhookUrl = await getStoredWebhookUrl(tenantId);
  const client = createBitrix24Client(webhookUrl);
  const methods: Record<string, string> = {
    contacts: "crm.contact.list",
    leads: "crm.lead.list",
    deals: "crm.deal.list",
    activities: "crm.activity.list",
    companies: "crm.company.list",
    tasks: "tasks.task.list",
  };

  const counts: Record<string, number> = {};
  for (const [key, method] of Object.entries(methods)) {
    try {
      counts[key] = await client.countRecords(method);
    } catch {
      counts[key] = 0;
    }
  }

  // Custom fields probe
  const customFields: string[] = [];
  try {
    const leadFields = await client.call<BitrixListResult<BitrixUserField>>("crm.lead.userfield.list", {});
    const dealFields = await client.call<BitrixListResult<BitrixUserField>>("crm.deal.userfield.list", {});
    const lf = bitrixItems(leadFields.result);
    const df = bitrixItems(dealFields.result);
    for (const f of lf) {
      if (f.FIELD_NAME?.startsWith("UF_")) customFields.push(`lead.${f.FIELD_NAME}`);
    }
    for (const f of df) {
      if (f.FIELD_NAME?.startsWith("UF_")) customFields.push(`deal.${f.FIELD_NAME}`);
    }
  } catch {
    // ignore
  }

  return { counts, customFields };
}

// ─── Dry run ────────────────────────────────────────────────────────────────

export async function runBitrixDryRun(tenantId: string) {
  await verifyAdmin(tenantId);
  const webhookUrl = await getStoredWebhookUrl(tenantId);
  const runId = crypto.randomUUID();
  return enqueueBitrixDryRun(tenantId, webhookUrl, runId);
}

export async function getDryRunProgress(tenantId: string, runId: string) {
  await verifyAdmin(tenantId);
  // Tenant-scoped read: the run row is fetched under RLS with app.tenant_id
  // set, so a leaked runId from another tenant simply reads as empty.
  const progress = await getBitrixDryRunProgress(tenantId, runId);
  // Defense in depth: a run row carries its tenantId.
  // Reject reading another tenant's run even if its runId leaked.
  if (progress.tenantId && progress.tenantId !== tenantId) {
    throw new Error("Forbidden: run does not belong to this tenant");
  }
  return progress;
}

// ─── Demo import (real data subset) ─────────────────────────────────────────

export async function runBitrixDemoImport(tenantId: string) {
  await verifyAdmin(tenantId);
  const webhookUrl = await getStoredWebhookUrl(tenantId);
  const { syncBitrix24 } = await import("@/platform/integrations/bitrix24/sync");
  const result = await syncBitrix24(db, tenantId, webhookUrl, {
    syncContacts: true,
    syncLeads: true,
    syncDeals: true,
    syncCompanies: true,
    maxRecordsPerEntity: 500,
  });
  return result;
}

// ─── Custom fields mapping helpers ──────────────────────────────────────────

export async function getUnmappedCustomFields(tenantId: string, mapping?: Record<string, string>) {
  await verifyAdmin(tenantId);
  const webhookUrl = await getStoredWebhookUrl(tenantId);
  const client = createBitrix24Client(webhookUrl);
  const unmapped: string[] = [];

  try {
    const leadFields = await client.call<BitrixListResult<BitrixUserField>>("crm.lead.userfield.list", {});
    const dealFields = await client.call<BitrixListResult<BitrixUserField>>("crm.deal.userfield.list", {});
    const lf = bitrixItems(leadFields.result);
    const df = bitrixItems(dealFields.result);

    for (const f of lf) {
      const name = f.FIELD_NAME;
      if (name?.startsWith("UF_") && !mapping?.[name]) unmapped.push(`lead.${name}`);
    }
    for (const f of df) {
      const name = f.FIELD_NAME;
      if (name?.startsWith("UF_") && !mapping?.[name]) unmapped.push(`deal.${name}`);
    }
  } catch {
    // ignore
  }

  return unmapped;
}
