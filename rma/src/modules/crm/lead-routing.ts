import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { lead, tenantMember, tenant, user } from "@/platform/db/schema";
import { sendNotification } from "@/modules/notify/send";
import { hotLeadKey } from "@/modules/notify/policy";

// HOT LANE — owner routing (SPEC: new/unowned leads must never rot unowned).
//
// Owner pool = tenant members with role 'sales', excluding demo accounts
// (name ILIKE '%demo%'). "Least-loaded" = fewest currently-assigned
// status='new' leads, so new leads fan out fairly across the sales team
// instead of piling on whoever was assigned first.

type Tx = typeof db;

export interface SalesOwnerLoad {
  userId: string;
  load: number;
}

/**
 * Fetch the tenant's active sales pool + each member's current count of
 * assigned status='new' leads, in exactly two queries — NOT per-lead. Callers
 * that need to assign N leads should call this ONCE and then pick/increment
 * in memory (see `assignLeadOwnersRoundRobin`) rather than re-querying per
 * row, which is what keeps a large Bitrix sync batch from stalling on N+1
 * lookups.
 */
export async function getSalesPoolWithLoad(tx: Tx, tenantId: string): Promise<SalesOwnerLoad[]> {
  const members = await tx
    .select({ userId: tenantMember.userId, roles: tenantMember.roles, name: user.name })
    .from(tenantMember)
    .innerJoin(user, eq(user.id, tenantMember.userId))
    .where(eq(tenantMember.tenantId, tenantId));

  const pool = members.filter(
    (m) => (m.roles ?? []).includes("sales") && !(m.name ?? "").toLowerCase().includes("demo")
  );
  if (pool.length === 0) return [];

  const userIds = pool.map((m) => m.userId);
  const loads = await tx
    .select({ assignedTo: lead.assignedTo, load: sql<number>`count(*)::int` })
    .from(lead)
    .where(and(eq(lead.tenantId, tenantId), eq(lead.status, "new"), inArray(lead.assignedTo, userIds)))
    .groupBy(lead.assignedTo);
  const loadMap = new Map(loads.map((l) => [l.assignedTo, l.load]));

  return pool
    .map((m) => ({ userId: m.userId, load: loadMap.get(m.userId) ?? 0 }))
    .sort((a, b) => a.load - b.load || (a.userId < b.userId ? -1 : 1));
}

/** Deterministic min-pick: lowest load, tie-broken by lowest userId. */
function pickMin(pool: SalesOwnerLoad[]): SalesOwnerLoad | null {
  if (pool.length === 0) return null;
  return pool.reduce((min, cur) =>
    cur.load < min.load || (cur.load === min.load && cur.userId < min.userId) ? cur : min
  );
}

/**
 * Returns the userId of the least-loaded active sales owner (fewest
 * currently-assigned status='new' leads). Returns null if the tenant has no
 * sales members. Use for single-lead assignment (e.g. manual createLead).
 */
export async function pickLeadOwner(tx: Tx, tenantId: string): Promise<string | null> {
  const pool = await getSalesPoolWithLoad(tx, tenantId);
  return pickMin(pool)?.userId ?? null;
}

/**
 * Fair-distribute `count` NEW leads across the sales pool: fetches the pool
 * + load ONCE, then round-robins by incrementing an in-memory copy of each
 * owner's load as picks are made (no DB round-trip per lead). Returns an
 * array of userId|null of length `count`, in assignment order. All-null when
 * there is no sales pool.
 */
export async function assignLeadOwnersRoundRobin(
  tx: Tx,
  tenantId: string,
  count: number
): Promise<(string | null)[]> {
  const pool = await getSalesPoolWithLoad(tx, tenantId);
  if (pool.length === 0) return Array(count).fill(null);
  const working = pool.map((p) => ({ ...p }));
  const result: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    const picked = pickMin(working)!;
    result.push(picked.userId);
    picked.load += 1;
  }
  return result;
}

export interface RoutableLead {
  id: string;
  tenantId: string;
  customerName?: string | null;
  phone?: string | null;
}

/**
 * Best-effort Telegram push to a newly-assigned owner. Never throws — a
 * notification failure (unlinked account, missing bot token, Telegram
 * outage) must never break lead creation or the Bitrix sync that called it.
 * No-op if the owner hasn't linked Telegram yet (telegram_link table is
 * populated lazily as staff log in via the bot — may be empty for a while).
 *
 * Delivery goes through modules/notify/send.ts with force:true — this path
 * pre-dates the NOTIFY_ENABLED flag and was live before it, so the gates must
 * not silently switch it off. It still gains the ledger: one ping per lead,
 * ever, even if two sync runs assign the same lead concurrently.
 */
export async function notifyLeadOwner(userId: string, leadRow: RoutableLead): Promise<void> {
  try {
    const [t] = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, leadRow.tenantId)).limit(1);
    const slug = t?.slug ?? "";

    const label = leadRow.customerName?.trim() || leadRow.phone || "no name";
    const phonePart = leadRow.phone && leadRow.customerName ? ` (${leadRow.phone})` : "";
    const text = `🔥 New lead: ${label}${phonePart}. Reply fast → /${slug}/crm/leads/${leadRow.id}`;

    await sendNotification(leadRow.tenantId, {
      kind: "hot_lead",
      target: { userId },
      text,
      dedupeKey: hotLeadKey(leadRow.id),
      entityType: "lead",
      entityId: leadRow.id,
      force: true,
    });
  } catch (e) {
    console.error("[lead-routing] notifyLeadOwner failed:", e instanceof Error ? e.message : e);
  }
}
