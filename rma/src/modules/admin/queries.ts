// SPEC §5 — platform admin console queries (cross-tenant reads).
//
// Every export is gated by requirePlatformAdmin(). Because almost every
// table is RLS-FORCEd on tenant_id, cross-tenant reads cannot be a single
// global query — they must set app.tenant_id per tenant. We therefore
// iterate tenants via withDrizzleTenant(). At the platform's scale (tens
// of tenants) this is cheap and avoids needing a BYPASSRLS role. We
// process ALL tenants — no silent top-N cap.

import { eq, desc, sql, and, gte } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import {
  tenant,
  tenantMember,
  user,
  auditEvent,
  integrationConnection,
  aiProviderConfig,
  integrationEvent,
  lead,
  deal,
  vehicle,
  rental,
  customer,
  message,
  serviceHoursEntry,
} from "@/platform/db/schema";

// Nominal monthly value per tier — used for an *estimated* MRR rollup
// until real billing amounts land. Clearly labelled "est." in the UI.
const TIER_MRR: Record<string, number> = {
  starter: 1500,
  growth: 2500,
  pro: 3500,
  enterprise: 6000,
};

export type TenantRow = typeof tenant.$inferSelect;

async function allTenants(): Promise<TenantRow[]> {
  return db.select().from(tenant).orderBy(desc(tenant.createdAt));
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface PlatformStats {
  tenantCount: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  estMrr: number;
  userCount: number;
  recentActivity: Array<{
    tenantName: string;
    tenantSlug: string;
    action: string;
    entityType: string;
    actorEmail: string | null;
    at: Date;
  }>;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  await requirePlatformAdmin();
  const tenants = await allTenants();

  const byStatus: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  let estMrr = 0;
  for (const t of tenants) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    byTier[t.tier] = (byTier[t.tier] ?? 0) + 1;
    if (t.status === "active" || t.status === "trial") {
      estMrr += t.customMonthlyPrice ?? TIER_MRR[t.tier] ?? 0;
    }
  }

  const [{ n: userCount }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(user);

  // Recent activity: top 5 audit rows per tenant, merged + sorted.
  const activity: PlatformStats["recentActivity"] = [];
  for (const t of tenants) {
    const rows = await withDrizzleTenant(t.id, async (tx) =>
      tx
        .select({
          action: auditEvent.action,
          entityType: auditEvent.entityType,
          at: auditEvent.at,
          actorEmail: user.email,
        })
        .from(auditEvent)
        .leftJoin(user, eq(auditEvent.actorId, user.id))
        .orderBy(desc(auditEvent.at))
        .limit(5)
    );
    for (const r of rows) {
      activity.push({
        tenantName: t.name,
        tenantSlug: t.slug,
        action: r.action,
        entityType: r.entityType,
        actorEmail: r.actorEmail,
        at: r.at,
      });
    }
  }
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    tenantCount: tenants.length,
    byStatus,
    byTier,
    estMrr,
    userCount,
    recentActivity: activity.slice(0, 15),
  };
}

// ─── Tenant list ──────────────────────────────────────────────────────────

export interface TenantListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  tier: string;
  locale: string | null;
  billingEmail: string | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  memberCount: number;
}

export async function listTenants(filters?: {
  status?: string;
  tier?: string;
}): Promise<TenantListItem[]> {
  await requirePlatformAdmin();
  let tenants = await allTenants();
  if (filters?.status) tenants = tenants.filter((t) => t.status === filters.status);
  if (filters?.tier) tenants = tenants.filter((t) => t.tier === filters.tier);

  const out: TenantListItem[] = [];
  for (const t of tenants) {
    const [{ n }] = await withDrizzleTenant(t.id, async (tx) =>
      tx.select({ n: sql<number>`count(*)::int` }).from(tenantMember)
    );
    out.push({
      id: t.id,
      slug: t.slug,
      name: t.name,
      status: t.status,
      tier: t.tier,
      locale: t.locale,
      billingEmail: t.billingEmail,
      trialEndsAt: t.trialEndsAt,
      createdAt: t.createdAt,
      memberCount: n,
    });
  }
  return out;
}

// ─── Tenant detail ──────────────────────────────────────────────────────────

export interface TenantDetail {
  tenant: TenantRow;
  members: Array<{ userId: string; email: string; name: string | null; roles: string[] }>;
  integrations: Array<{ provider: string; status: string; lastSyncAt: Date | null }>;
  aiConfig: {
    provider: string;
    localEndpoint: string | null;
    localModel: string | null;
    lastHealthyAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorText: string | null;
  } | null;
  counts: Record<string, number>;
  recentAudit: Array<{
    action: string;
    entityType: string;
    actorEmail: string | null;
    intent: string | null;
    at: Date;
  }>;
  serviceHours: {
    perMonth: number;
    usedMinutesThisMonth: number;
    entries: Array<{ minutes: number; note: string | null; at: Date }>;
  };
}

export async function getTenantDetail(idOrSlug: string): Promise<TenantDetail | null> {
  await requirePlatformAdmin();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const [t] = await db
    .select()
    .from(tenant)
    .where(isUuid ? eq(tenant.id, idOrSlug) : eq(tenant.slug, idOrSlug))
    .limit(1);
  if (!t) return null;
  const tenantId = t.id;

  return withDrizzleTenant(tenantId, async (tx) => {
    const members = await tx
      .select({
        userId: tenantMember.userId,
        email: user.email,
        name: user.name,
        roles: tenantMember.roles,
      })
      .from(tenantMember)
      .innerJoin(user, eq(tenantMember.userId, user.id));

    const integrations = await tx
      .select({
        provider: integrationConnection.provider,
        status: integrationConnection.status,
        lastSyncAt: integrationConnection.lastSyncAt,
      })
      .from(integrationConnection);

    const [ai] = await tx.select().from(aiProviderConfig).limit(1);

    const recentAudit = await tx
      .select({
        action: auditEvent.action,
        entityType: auditEvent.entityType,
        intent: auditEvent.intent,
        at: auditEvent.at,
        actorEmail: user.email,
      })
      .from(auditEvent)
      .leftJoin(user, eq(auditEvent.actorId, user.id))
      .orderBy(desc(auditEvent.at))
      .limit(20);

    const counts: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countOf = async (tbl: any) => {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(tbl);
      return n;
    };
    counts.leads = await countOf(lead);
    counts.deals = await countOf(deal);
    counts.vehicles = await countOf(vehicle);
    counts.rentals = await countOf(rental);
    counts.customers = await countOf(customer);
    counts.messages = await countOf(message);

    // Service hours: usage this calendar month + recent entries.
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [{ used }] = await tx
      .select({ used: sql<number>`coalesce(sum(minutes),0)::int` })
      .from(serviceHoursEntry)
      .where(gte(serviceHoursEntry.createdAt, monthStart));
    const entries = await tx
      .select({ minutes: serviceHoursEntry.minutes, note: serviceHoursEntry.note, at: serviceHoursEntry.createdAt })
      .from(serviceHoursEntry)
      .orderBy(desc(serviceHoursEntry.createdAt))
      .limit(10);

    return {
      tenant: t,
      members: members.map((m) => ({ ...m, roles: m.roles ?? [] })),
      integrations,
      aiConfig: ai
        ? {
            provider: ai.provider,
            localEndpoint: ai.localEndpoint,
            localModel: ai.localModel,
            lastHealthyAt: ai.lastHealthyAt,
            lastErrorAt: ai.lastErrorAt,
            lastErrorText: ai.lastErrorText,
          }
        : null,
      counts,
      recentAudit,
      serviceHours: {
        perMonth: t.serviceHoursPerMonth ?? 0,
        usedMinutesThisMonth: used,
        entries,
      },
    };
  });
}

// ─── Health board ─────────────────────────────────────────────────────────

export interface HealthRow {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  integrations: Array<{ provider: string; status: string; lastSyncAt: Date | null }>;
  ai: {
    provider: string;
    lastHealthyAt: Date | null;
    lastErrorAt: Date | null;
    lastErrorText: string | null;
  } | null;
  recentFailures: number;
}

export async function getHealthBoard(): Promise<HealthRow[]> {
  await requirePlatformAdmin();
  const tenants = await allTenants();
  const rows: HealthRow[] = [];
  for (const t of tenants) {
    const data = await withDrizzleTenant(t.id, async (tx) => {
      const integrations = await tx
        .select({
          provider: integrationConnection.provider,
          status: integrationConnection.status,
          lastSyncAt: integrationConnection.lastSyncAt,
        })
        .from(integrationConnection);
      const [ai] = await tx.select().from(aiProviderConfig).limit(1);
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(integrationEvent)
        .where(eq(integrationEvent.processingStatus, "error"));
      return { integrations, ai, failures: n };
    });
    rows.push({
      tenantId: t.id,
      tenantName: t.name,
      tenantSlug: t.slug,
      integrations: data.integrations,
      ai: data.ai
        ? {
            provider: data.ai.provider,
            lastHealthyAt: data.ai.lastHealthyAt,
            lastErrorAt: data.ai.lastErrorAt,
            lastErrorText: data.ai.lastErrorText,
          }
        : null,
      recentFailures: data.failures,
    });
  }
  return rows;
}

// ─── Cross-tenant audit search ──────────────────────────────────────────────

export interface AuditSearchRow {
  tenantName: string;
  tenantSlug: string;
  action: string;
  entityType: string;
  entityId: string;
  intent: string | null;
  actorEmail: string | null;
  at: Date;
}

export async function searchAudit(filters?: {
  tenantId?: string;
  action?: string;
  limit?: number;
}): Promise<AuditSearchRow[]> {
  await requirePlatformAdmin();
  const limit = filters?.limit ?? 100;
  const tenants = (await allTenants()).filter(
    (t) => !filters?.tenantId || t.id === filters.tenantId
  );

  const out: AuditSearchRow[] = [];
  for (const t of tenants) {
    const rows = await withDrizzleTenant(t.id, async (tx) => {
      const where = filters?.action
        ? and(eq(auditEvent.action, filters.action))
        : undefined;
      return tx
        .select({
          action: auditEvent.action,
          entityType: auditEvent.entityType,
          entityId: auditEvent.entityId,
          intent: auditEvent.intent,
          at: auditEvent.at,
          actorEmail: user.email,
        })
        .from(auditEvent)
        .leftJoin(user, eq(auditEvent.actorId, user.id))
        .where(where)
        .orderBy(desc(auditEvent.at))
        .limit(limit);
    });
    for (const r of rows) {
      out.push({ tenantName: t.name, tenantSlug: t.slug, ...r });
    }
  }
  out.sort((a, b) => b.at.getTime() - a.at.getTime());
  return out.slice(0, limit);
}
