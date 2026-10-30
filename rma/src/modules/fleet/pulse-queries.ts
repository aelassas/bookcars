"use server";

import { and, desc, eq, ilike, or, sql, isNull, isNotNull } from "drizzle-orm";
import { deal, lead, user } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageCRMForTenant } from "@/modules/crm/policies";

// ─── "Пульс машины" — live demand signal per vehicle ───────────────────────
//
// Answers, for one car: how many live deals want it right now, who last touched
// the demand, and what the last customer line was. Two demand signals:
//   • direct  — deals with deal.vehicle_id = this car (the car-finder link)
//   • brand   — deals whose ref/notes name this make+model (text match). This
//               matters because on live prod data 0 deals are vehicle-linked yet
//               (the car-finder is new), so text is where the real demand shows.
// If the extraction fable ships modules/fleet/demand-queries.ts later, this can
// delegate to it; until then it computes the count itself. Read-only.

const LIVE_WINDOW_DAYS = 90;

// Live = touched within the window, OR a native deal with no activity stamp yet.
function liveCond() {
  const cutoff = new Date(Date.now() - LIVE_WINDOW_DAYS * 86_400_000).toISOString();
  return or(
    and(isNotNull(deal.lastActivityAt), sql`${deal.lastActivityAt} >= ${cutoff}`),
    and(isNull(deal.lastActivityAt), isNull(deal.externalSource), sql`${deal.createdAt} >= ${cutoff}`)
  )!;
}

export type VehiclePulse = {
  demandDirect: number;
  demandBrand: number;
  demandTotal: number;
  lastToucher: { name: string | null; at: Date | string | null } | null;
  lastLine: string | null;
  /** Up to 3 hottest matched deals for the drill-down. */
  topDeals: { id: string; headline: string; owner: string | null; days: number | null }[];
};

function daysSince(ts: Date | string | null): number | null {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export async function getVehiclePulse(
  tenantId: string,
  v: { vehicleId: string; make: string | null; model: string | null }
): Promise<VehiclePulse> {
  await canManageCRMForTenant(tenantId);
  const live = liveCond();

  // Brand-text predicate: ref OR notes must name the make AND (if present) the
  // model. Guarded so an empty make can never widen it to "every deal".
  const make = (v.make ?? "").trim();
  const model = (v.model ?? "").trim();
  const brandText =
    make.length >= 2
      ? and(
          or(ilike(deal.ref, `%${make}%`), ilike(deal.notes, `%${make}%`)),
          model.length >= 2 ? or(ilike(deal.ref, `%${model}%`), ilike(deal.notes, `%${model}%`)) : undefined
        )
      : sql`false`;

  const matchCond = or(eq(deal.vehicleId, v.vehicleId), brandText)!;

  return withDrizzleTenant(tenantId, async (tx) => {
    const [counts] = await tx
      .select({
        direct: sql<number>`(COUNT(*) FILTER (WHERE ${deal.vehicleId} = ${v.vehicleId}))::int`,
        brand: sql<number>`(COUNT(*) FILTER (WHERE ${deal.vehicleId} IS DISTINCT FROM ${v.vehicleId}))::int`,
      })
      .from(deal)
      .where(and(eq(deal.status, "open"), live, matchCond));

    const rows = await tx
      .select({
        id: deal.id,
        ref: deal.ref,
        customerName: lead.customerName,
        owner: user.name,
        lastActivityAt: deal.lastActivityAt,
      })
      .from(deal)
      .leftJoin(lead, eq(lead.id, deal.leadId))
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(and(eq(deal.status, "open"), live, matchCond))
      .orderBy(sql`${deal.lastActivityAt} DESC NULLS LAST`, desc(deal.createdAt))
      .limit(3);

    const direct = counts?.direct ?? 0;
    const brand = counts?.brand ?? 0;
    const hottest = rows[0];
    return {
      demandDirect: direct,
      demandBrand: brand,
      demandTotal: direct + brand,
      lastToucher: hottest ? { name: hottest.owner, at: hottest.lastActivityAt } : null,
      lastLine: hottest ? (hottest.customerName?.trim() || hottest.ref || null) : null,
      topDeals: rows.map((r) => ({
        id: r.id,
        headline: (r.customerName?.trim() || r.ref || "—").slice(0, 48),
        owner: r.owner,
        days: daysSince(r.lastActivityAt),
      })),
    };
  });
}
