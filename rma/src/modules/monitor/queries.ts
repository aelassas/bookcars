"use server";
// The line head's monitor: one screen for "what is my team dropping right now",
// across every brand that belongs to their business line.
//
// This is the first cross-tenant read in the product, and it is deliberate:
// the rent desk's work is split across cardiwan/easyrent/etm purely because
// each brand is its own tenant, so no existing screen can show a head their
// whole line. Isolation is not weakened — each brand is still read inside its
// own withDrizzleTenant, and getTenantBySlug enforces membership per brand, so
// a head only ever sees the brands they belong to. A brand they are not a
// member of is skipped silently rather than erroring, because a partial view
// is more useful to them than a 403.
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getWaitingConversations, type WaitingRow } from "@/modules/crm/my-queries";
import { getCollectionsRentals } from "@/modules/collections/queries";
import { getRentalsOverdue, getRentalsReturningToday } from "@/modules/returns/queries";
import type { BusinessLineKey } from "./lines";
import { BUSINESS_LINES } from "./lines";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { lead, vehicle, user } from "@/platform/db/schema";
import { fleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { canonicalName } from "./people";
import { resolveOwnerForLine } from "@/modules/board/owners";

/** Recent inbound WhatsApp across a brand — the «Message from …» feed on the
 *  cockpit (sender + snippet + time + language tag), newest first. DMs only
 *  (groups excluded) so the list is actionable with a Contact button. */
async function getRecentInbound(tenantId: string) {
  const res = (await withDrizzleTenant(tenantId, (tx) =>
    tx.execute(sql`
      SELECT coalesce(m.from_pn, m."from") AS contact, m.customer_name AS name,
             left(regexp_replace(coalesce(m.body, ''), E'[\\n\\r]+', ' ', 'g'), 60) AS snippet,
             m.extracted_language AS lang, m.created_at AS at
      FROM message m
      WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp' AND m.direction = 'inbound'
        AND m."from" NOT LIKE '%@g.us'
        AND coalesce(m.from_pn, m."from") IS NOT NULL
        AND m.created_at >= now() - interval '2 days'
      ORDER BY m.created_at DESC
      LIMIT 15
    `),
  )) as unknown as { rows: Record<string, unknown>[] };
  return res.rows;
}

/** Car distribution across the SHARED rent fleet (holding-wide, from the fleet
 *  home) — available / on-rent / reserved / service counts for the head's
 *  cockpit, with a drill-down to the availability calendar. */
async function getFleetSnapshot(): Promise<{ status: string; count: number }[]> {
  const home = await fleetHomeTenantId();
  if (!home) return [];
  return withDrizzleTenant(home, (tx) =>
    tx
      .select({ status: vehicle.status, count: sql<number>`count(*)::int` })
      .from(vehicle)
      .where(eq(vehicle.division, "rent"))
      .groupBy(vehicle.status),
  );
}

/** New leads that arrived in the last 3 days, newest FIRST (Bitrix arrival time
 *  ≈ created_at for incrementally-synced leads) — Babek: "show new leads by the
 *  time they came from Bitrix, not randomly". */
async function getRecentNewLeads(tenantId: string) {
  const since = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ id: lead.id, customerName: lead.customerName, phone: lead.phone, car: lead.vouchedCar, at: lead.createdAt, assignee: user.name })
      .from(lead)
      .leftJoin(user, eq(user.id, lead.assignedTo))
      .where(and(eq(lead.status, "new"), gte(lead.createdAt, since)))
      .orderBy(desc(lead.createdAt))
      .limit(40),
  );
}

/** Every row carries the brand it came from — the head reads across several. */
type Branded<T> = T & { tenantSlug: string; brandName: string };

export type TeamLoadRow = {
  ownerKey: string | null;
  ownerName: string;
  /** Conversations waiting on this person right now. */
  waiting: number;
  /** Longest current wait, in work minutes. */
  oldestWaitMin: number;
};

export type LineMonitor = {
  lineKey: BusinessLineKey;
  lineLabel: string;
  /** Brands actually read — those the viewer is a member of. */
  brands: { slug: string; name: string }[];
  /** Brands in this line the viewer cannot see, so the gap is visible. */
  skippedBrands: string[];
  waiting: Branded<WaitingRow>[];
  teamLoad: TeamLoadRow[];
  overdueRentals: Branded<{ id: string; customerName: string | null; balanceDue: number | null }>[];
  overdueReturns: Branded<{ id: string; customerName: string | null }>[];
  /** New leads across the line's brands, newest first (Bitrix arrival order). */
  newLeads: Branded<{ id: string; customerName: string | null; phone: string | null; car: string | null; at: Date | string; assignee: string | null }>[];
  /** Cars due back today across the line's brands. */
  returningToday: Branded<{ id: string; customerName: string | null; phone: string | null; plate: string | null; car: string | null }>[];
  /** Car distribution across the shared rent fleet (available/on_rent/…). */
  fleetSnapshot: { status: string; count: number }[];
  /** Recent inbound WhatsApp — the «Message from …» feed, newest first. */
  inbound: Branded<{ contact: string; name: string | null; snippet: string | null; lang: string | null; at: Date | string }>[];
};

/**
 * Read a role-gated section, treating "you may not see this" as an empty
 * section rather than a failed page.
 *
 * Deliberately narrow: it swallows the authorization throw and nothing else is
 * distinguishable here, so a genuine query fault also degrades to empty. That
 * trade is acceptable for a dashboard made of independent panels — the
 * alternative is one missing role blanking a head's whole screen — but it is
 * the reason this must not be reused for anything that writes.
 */
async function tolerate<T>(p: Promise<T[]>): Promise<T[]> {
  try {
    return await p;
  } catch {
    return [];
  }
}

/**
 * Fold the waiting rows into one line per person.
 *
 * Grouped by ownerKey rather than by line, because a person can own several
 * paired WhatsApp lines and a head cares about the human, not the handset.
 * Conversations on a line with no owner mapped fall into a single "не
 * назначено" bucket instead of vanishing — an unowned queue is exactly what a
 * head needs to see.
 */
function foldTeamLoad(rows: WaitingRow[]): TeamLoadRow[] {
  const byOwner = new Map<string, TeamLoadRow>();

  for (const row of rows) {
    const key = row.ownerKey ?? "__unassigned__";
    const existing = byOwner.get(key);
    if (existing) {
      existing.waiting += 1;
      existing.oldestWaitMin = Math.max(existing.oldestWaitMin, row.waitingMin);
    } else {
      byOwner.set(key, {
        ownerKey: row.ownerKey,
        ownerName: row.ownerName ?? "Unassigned",
        waiting: 1,
        oldestWaitMin: row.waitingMin,
      });
    }
  }

  // Worst first: the person sitting on the longest-ignored customer.
  return [...byOwner.values()].sort((a, b) => b.oldestWaitMin - a.oldestWaitMin);
}

export async function getLineMonitor(lineKey: BusinessLineKey): Promise<LineMonitor> {
  const line = BUSINESS_LINES[lineKey];

  const waiting: Branded<WaitingRow>[] = [];
  const overdueRentals: LineMonitor["overdueRentals"] = [];
  const overdueReturns: LineMonitor["overdueReturns"] = [];
  const newLeads: LineMonitor["newLeads"] = [];
  const returningToday: LineMonitor["returningToday"] = [];
  const inbound: LineMonitor["inbound"] = [];
  const brands: { slug: string; name: string }[] = [];
  const skippedBrands: string[] = [];

  for (const slug of line.tenantSlugs) {
    // Membership check lives here: a head who is not a member of this brand
    // gets null and the brand is skipped, never read.
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      skippedBrands.push(slug);
      continue;
    }
    const brandName = tenant.name;
    brands.push({ slug, name: brandName });

    const rows = await getWaitingConversations(tenant.id, line.lineSlugs, "worst");
    waiting.push(...rows.map((r) => ({ ...r, tenantSlug: slug, brandName })));

    // Both of these are role-gated (collections / rentals). A head who lacks
    // the role for a module still gets the rest of the screen rather than an
    // error page — the section is simply empty for them.
    for (const r of await tolerate(getCollectionsRentals(tenant.id))) {
      overdueRentals.push({
        id: r.rental.id,
        customerName: r.customerName ?? null,
        balanceDue: r.rental.balanceDue ?? null,
        tenantSlug: slug,
        brandName,
      });
    }

    for (const r of await tolerate(getRentalsOverdue(tenant.id))) {
      // getRentalsOverdue now reads the shared fleet-home, so iterating brands
      // returns the same rows each time — de-dup by rental id.
      if (overdueReturns.some((x) => x.id === r.rental.id)) continue;
      overdueReturns.push({
        id: r.rental.id,
        customerName: r.customerName ?? null,
        tenantSlug: slug,
        brandName,
      });
    }

    for (const l of await tolerate(getRecentNewLeads(tenant.id))) {
      newLeads.push({ ...l, assignee: canonicalName(l.assignee), tenantSlug: slug, brandName });
    }

    for (const m of await tolerate(getRecentInbound(tenant.id))) {
      inbound.push({
        contact: String(m.contact),
        name: (m.name as string) ?? null,
        snippet: (m.snippet as string) ?? null,
        lang: (m.lang as string) ?? null,
        at: m.at as string,
        tenantSlug: slug,
        brandName,
      });
    }

    for (const r of await tolerate(getRentalsReturningToday(tenant.id))) {
      // Shared fleet-home read — de-dup across brand iterations by rental id.
      if (returningToday.some((x) => x.id === r.rental.id)) continue;
      returningToday.push({
        id: r.rental.id,
        customerName: r.customerName ?? null,
        phone: r.customerPhone ?? null,
        plate: r.vehiclePlate ?? null,
        car: [r.vehicleMake, r.vehicleModel].filter(Boolean).join(" ") || null,
        tenantSlug: slug,
        brandName,
      });
    }
  }

  // Re-sort across brands — each brand was sorted on its own.
  waiting.sort((a, b) => b.waitingMin - a.waitingMin);
  newLeads.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  inbound.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Every owner of this business line's WhatsApp lines shows in Team load —
  // even at zero. The monitor is a head's wallboard AND the manager's own
  // home screen: "I log in as Azat and I must see Azat" (owner 2026-07-29).
  // Without this, a person with nothing pending simply vanished from the board.
  const teamLoad = foldTeamLoad(waiting);
  const seen = new Set(teamLoad.map((t) => t.ownerKey));
  for (const lineSlug of line.lineSlugs) {
    const owner = resolveOwnerForLine(lineSlug);
    if (owner && !seen.has(owner.key)) {
      seen.add(owner.key);
      teamLoad.push({ ownerKey: owner.key, ownerName: owner.name, waiting: 0, oldestWaitMin: 0 });
    }
  }

  return {
    lineKey,
    lineLabel: line.label,
    brands,
    skippedBrands,
    waiting,
    teamLoad,
    overdueRentals,
    overdueReturns,
    newLeads,
    returningToday,
    fleetSnapshot: await getFleetSnapshot(),
    inbound: inbound.slice(0, 20),
  };
}
