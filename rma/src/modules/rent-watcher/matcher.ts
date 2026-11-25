/**
 * matcher.ts — PURE core of the rent watcher. Given a customer's structured
 * request and the platform's own truth (fleet, price_tier, current rentals),
 * decide: do we have the car free, do we have it but busy, or is it a gap.
 *
 * The AI supplies only the request; every price, deposit and availability fact
 * here comes from the platform data — so nothing the model says can produce a
 * wrong quote. DB-free and unit-tested (matcher.test.ts); the watcher does the
 * DB reads and hands plain objects in.
 */
import { matchesVehicle } from "@/modules/fleet/demand-model";
import type { Channel, StructuredRequest } from "@/platform/ai/demand-brain";

export interface FleetRow {
  id: string;
  make: string;
  model: string;
  /** business status: available | reserved | on_rent | in_service */
  status: string;
  plate: string;
}
export interface TierRow {
  vehicleId: string;
  channel: Channel;
  minDays: number;
  maxDays: number | null;
  dailyRate: number;
  deposit: number | null;
  cardoo: number | null;
}
export interface RentalRow {
  vehicleId: string;
  startDate: Date | string | null;
  returnDate: Date | string | null;
  status: string;
}

export type MatchResult =
  | { kind: "have_free"; vehicle: FleetRow; days: number; channel: Channel; dailyRate: number | null; deposit: number | null; cardoo: number | null }
  | { kind: "have_busy"; vehicle: FleetRow; nextFreeDate: Date | null }
  | { kind: "gap"; make: string | null; model: string | null; budgetAed: number | null };

const DAY = 86_400_000;
const asDate = (d: Date | string | null): Date | null =>
  d == null ? null : d instanceof Date ? d : new Date(d);

const B2B_RE = /rent[ -]?a[ -]?car|car[ -]?rental|rent a car|rentacar|прокат|аренда авто/i;

/**
 * Build a StructuredRequest from the platform's OWN heuristic extraction
 * (extracted_car_text / price / dates / intent), no LLM. This is the fast,
 * reliable default — the extraction pipeline already runs on every inbound, so
 * the structured ASK is there for free. (The demand-brain LLM stays an optional
 * enricher for when a fast model / Kimi key is available.) PURE, unit-tested.
 */
export function structureFromExtraction(ex: {
  carText: string | null;
  priceAed: number | null;
  dateFrom: Date | string | null;
  dateTo: Date | string | null;
  intent: string | null;
  name?: string | null;
  body?: string | null;
}): import("@/platform/ai/demand-brain").StructuredRequest {
  const text = (ex.carText ?? "").trim().replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  const toks = text.split(" ").filter(Boolean);
  const make = toks[0] ?? null;
  const model = toks.length > 1 ? toks.slice(1).join(" ") : null;
  const iso = (d: Date | string | null): string | null => {
    const dt = asDate(d);
    return dt ? dt.toISOString().slice(0, 10) : null;
  };
  const isB2b = B2B_RE.test(`${ex.name ?? ""} ${ex.body ?? ""}`);
  return {
    make,
    model,
    dateFrom: iso(ex.dateFrom),
    dateTo: iso(ex.dateTo),
    budgetAed: ex.priceAed ?? null,
    channel: isB2b ? "b2b" : "b2c",
    intent: ex.intent ?? null,
  };
}

/** Requested rental length in days (default 3 when the thread gave no window). */
export function requestedDays(req: StructuredRequest): number {
  const a = asDate(req.dateFrom), b = asDate(req.dateTo);
  if (a && b) return Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY));
  return 3;
}

/** Do [aFrom,aTo] and [bFrom,bTo] overlap? Open-ended (null) end = +infinity. */
function overlaps(aFrom: Date | null, aTo: Date | null, bFrom: Date | null, bTo: Date | null): boolean {
  const af = aFrom?.getTime() ?? -Infinity, at = aTo?.getTime() ?? Infinity;
  const bf = bFrom?.getTime() ?? -Infinity, bt = bTo?.getTime() ?? Infinity;
  return af <= bt && bf <= at;
}

/** Pick the price_tier row for this vehicle covering `days` on `channel`. */
export function pickTier(tiers: TierRow[], vehicleId: string, channel: Channel, days: number): TierRow | null {
  const forCar = tiers.filter((t) => t.vehicleId === vehicleId && t.channel === channel);
  return (
    forCar.find((t) => days >= t.minDays && (t.maxDays == null || days <= t.maxDays)) ??
    // Fall back to the closest bracket by minDays so we always quote something.
    forCar.sort((x, y) => Math.abs(x.minDays - days) - Math.abs(y.minDays - days))[0] ??
    null
  );
}

export function matchDemand(
  req: StructuredRequest,
  fleet: FleetRow[],
  tiers: TierRow[],
  rentals: RentalRow[],
): MatchResult {
  const carText = [req.make, req.model].filter(Boolean).join(" ");
  const channel: Channel = req.channel ?? "b2c";
  const days = requestedDays(req);
  const wantFrom = asDate(req.dateFrom);
  const wantTo = asDate(req.dateTo) ?? (wantFrom ? new Date(wantFrom.getTime() + days * DAY) : null);

  const matches = fleet.filter((v) => matchesVehicle(carText, v));
  if (matches.length === 0) {
    return { kind: "gap", make: req.make, model: req.model, budgetAed: req.budgetAed };
  }

  const busyByVehicle = (vid: string) =>
    rentals.filter(
      (r) => r.vehicleId === vid && r.status === "active" &&
        overlaps(wantFrom, wantTo, asDate(r.startDate), asDate(r.returnDate)),
    );

  const free = matches.filter((v) => v.status !== "in_service" && busyByVehicle(v.id).length === 0);
  if (free.length > 0) {
    // Cheapest quoted car for this window wins (best offer to the client).
    const ranked = free
      .map((v) => ({ v, tier: pickTier(tiers, v.id, channel, days) }))
      .sort((a, b) => (a.tier?.dailyRate ?? Infinity) - (b.tier?.dailyRate ?? Infinity));
    const best = ranked[0];
    return {
      kind: "have_free",
      vehicle: best.v,
      days,
      channel,
      dailyRate: best.tier?.dailyRate ?? null,
      deposit: best.tier?.deposit ?? null,
      cardoo: best.tier?.cardoo ?? null,
    };
  }

  // All matching cars are busy for the window → soonest return across them.
  let nextFree: Date | null = null;
  for (const v of matches) {
    for (const r of busyByVehicle(v.id)) {
      const end = asDate(r.returnDate);
      if (end && (!nextFree || end < nextFree)) nextFree = end;
    }
  }
  return { kind: "have_busy", vehicle: matches[0], nextFreeDate: nextFree };
}
