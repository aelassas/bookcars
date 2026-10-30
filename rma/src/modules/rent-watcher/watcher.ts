/**
 * watcher.ts — the rent-demand watcher rule (see docs/superpowers/specs/
 * 2026-07-26-babek-ai-watcher-design.md). Once a minute per rent tenant:
 * take fresh inbound that named a car, let the local model structure the ASK,
 * match it against the platform's own fleet + price_tier + rentals, and push a
 * drafted nudge to the line's agent + a copy to Babek. The AI only parses the
 * request; every price/availability number is the platform's.
 */
import { eq, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { vehicle, rental } from "@/platform/db/schema";
import { priceTier } from "@/platform/db/rental-extras";
import { type StructuredRequest } from "@/platform/ai/demand-brain";
import { matchDemand, structureFromExtraction, type FleetRow, type TierRow, type RentalRow, type MatchResult } from "./matcher";
import { sendNotification, type SendOutcome } from "@/modules/notify/send";
import { resolveOwnerForLine } from "@/modules/board/owners";
import { isBroadcast } from "@/modules/messaging/competitor";
import { perContactKey } from "@/modules/notify/policy";

const RENT_HEAD = process.env.NOTIFY_RENT_HEAD_KEY?.trim() || "babek";

export type RentWatchSummary = { rule: string; scanned: number; structured: number; outcomes: Record<string, number> };
const tally = (s: RentWatchSummary, o: SendOutcome | "skipped_no_car") => { s.outcomes[o] = (s.outcomes[o] ?? 0) + 1; };

const money = (n: number | null) => (n == null ? "—" : `${n.toLocaleString()} AED`);

/** Human push text for a matched request. Pure — unit-friendly. */
export function renderPush(
  who: string,
  contact: string,
  line: string,
  req: StructuredRequest,
  match: MatchResult,
): string {
  const want = [req.make, req.model].filter(Boolean).join(" ") || "car";
  const window = req.dateFrom ? `${req.dateFrom}${req.dateTo ? `–${req.dateTo}` : ""}` : "no dates given";
  const head = `🚗 Request: ${who} (${contact}) — ${want} · ${window}${req.budgetAed ? ` · budget ${money(req.budgetAed)}` : ""}`;

  if (match.kind === "have_free") {
    const v = match.vehicle;
    const price = `${money(match.dailyRate)}/day (${match.channel.toUpperCase()}, ${match.days}d)`;
    return (
      `${head}\n` +
      `✅ AVAILABLE: ${v.make} ${v.model} (${v.plate}) — ${price}, deposit ${money(match.deposit)}.\n` +
      `Draft to customer: «${v.make} ${v.model} is free for your dates. ${money(match.dailyRate)}/day, deposit ${money(match.deposit)}. Shall we book?»\n` +
      `Line: ${line}`
    );
  }
  if (match.kind === "have_busy") {
    const v = match.vehicle;
    const nf = match.nextFreeDate ? match.nextFreeDate.toISOString().slice(0, 10) : "unknown";
    return (
      `${head}\n` +
      `🟡 BUSY: ${v.make} ${v.model} and similar are on rent for these dates. Next free: ${nf}.\n` +
      `Offer the customer ${nf} or an alternative.\nLine: ${line}`
    );
  }
  return (
    `${head}\n` +
    `🔴 NOT IN FLEET: ${want}. ${req.budgetAed ? `Budget ${money(req.budgetAed)}. ` : ""}Candidate for purchase/sub-rental (B2B) or search on Dubizzle.\n` +
    `Line: ${line}`
  );
}

export async function notifyRentDemand(
  tenantId: string,
  opts: { dryRun?: boolean; windowMinutes?: number; fleetTenantId?: string } = {},
): Promise<RentWatchSummary> {
  const summary: RentWatchSummary = { rule: "rent_demand", scanned: 0, structured: 0, outcomes: {} };
  const win = opts.windowMinutes ?? 5;
  // Babek's brands (cardiwan/easyrent/etm) are separate tenants, but the fleet,
  // price_tier and rentals all live under ONE tenant (take-auto) where the sheet
  // importer writes them, scoped to the brand by company_id. So read fleet TRUTH
  // from fleetTenantId, but scan inbound demand from the brand tenant.
  const fleetTid = opts.fleetTenantId ?? tenantId;

  const { fleet, tiers, rentals } = await withDrizzleTenant(fleetTid, async (tx) => {
    // Babek's real rentable inventory = the sheet-imported cars, which are the
    // ones that carry price_tier + a sheet status. Pilot-only GPS rows also have
    // plates but no tier, so a plate filter isn't enough — scope to the sheet.
    const fleet = (await tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, status: vehicle.status, plate: vehicle.plate })
      .from(vehicle)
      .where(eq(vehicle.externalSource, "babek-sheet"))) as FleetRow[];
    const tiers = (await tx
      .select({ vehicleId: priceTier.vehicleId, channel: priceTier.channel, minDays: priceTier.minDays, maxDays: priceTier.maxDays, dailyRate: priceTier.dailyRate, deposit: priceTier.deposit, cardoo: priceTier.cardoo })
      .from(priceTier)) as TierRow[];
    const rentals = (await tx
      .select({ vehicleId: rental.vehicleId, startDate: rental.startDate, returnDate: rental.returnDate, status: rental.status })
      .from(rental)
      .where(eq(rental.status, "active"))) as RentalRow[];
    return { fleet, tiers, rentals };
  });

  const { inbound } = await withDrizzleTenant(tenantId, async (tx) => {
    const res = (await tx.execute(sql`
      SELECT m.id, m."to" AS line, coalesce(m.from_pn, m."from") AS contact,
             m.customer_name AS name, left(m.body, 600) AS body,
             m.extracted_car_text AS car, m.extracted_price_aed AS price,
             m.extracted_date_from AS dfrom, m.extracted_date_to AS dto,
             m.extracted_intent AS intent
      FROM message m
      WHERE m.tenant_id = ${tenantId}
        AND m.channel = 'whatsapp' AND m.direction = 'inbound'
        AND m.created_at >= now() - (${win} || ' minutes')::interval
        AND m.extracted_car_text IS NOT NULL
        AND m."to" IS NOT NULL
        AND (m."from" NOT LIKE '%@g.us'
             OR m.body ~* '(looking for|need |required|anyone (have|has)|ищу|нужн|дайте|есть ли)')
        AND NOT EXISTS (
          SELECT 1 FROM message o
          WHERE o.tenant_id = m.tenant_id AND o.direction = 'outbound'
            AND o."to" = m."to" AND o."from" = m."from"
            AND o.created_at >= now() - interval '2 hours')
      ORDER BY m.created_at DESC
      LIMIT 15
    `)) as unknown as { rows: Record<string, unknown>[] };
    return { inbound: res.rows };
  });

  for (const m of inbound) {
    const body = String(m.body ?? "");
    if (isBroadcast(body)) continue; // rival "available cars" blasts
    summary.scanned++;

    // Structure from the platform's own extraction (instant, reliable). The
    // 9B local model takes ~90s/call on this loaded box — unusable in a 1-min
    // loop — and the heuristic extraction already carries car/price/dates/intent.
    const req = structureFromExtraction({
      carText: m.car as string | null,
      priceAed: m.price as number | null,
      dateFrom: m.dfrom as string | null,
      dateTo: m.dto as string | null,
      intent: m.intent as string | null,
      name: m.name as string | null,
      body,
    });
    if (!req.make && !req.model) { tally(summary, "skipped_no_car"); continue; }
    summary.structured++;

    const line = String(m.line);
    const contact = String(m.contact ?? "");
    const who = (m.name as string) || contact;
    const match = matchDemand(req, fleet, tiers, rentals);
    const text = renderPush(who, contact, line, req, match);

    // Agent (line owner) gets the actionable push; Babek gets a copy for oversight.
    const owner = resolveOwnerForLine(line);
    if (owner) {
      const a = await sendNotification(tenantId, {
        kind: "rent_demand", target: { ownerKey: owner.key }, text,
        dedupeKey: perContactKey(owner.key, contact, new Date()),
        entityType: "message", entityId: String(m.id), dryRun: opts.dryRun,
      });
      tally(summary, a.outcome);
    }
    if (!owner || owner.key !== RENT_HEAD) {
      const b = await sendNotification(tenantId, {
        kind: "rent_demand", target: { ownerKey: RENT_HEAD }, text: `👁 (oversight) ${text}`,
        dedupeKey: perContactKey(RENT_HEAD, contact, new Date()),
        entityType: "message", entityId: String(m.id), dryRun: opts.dryRun,
      });
      tally(summary, b.outcome);
    }
  }
  console.log(`[rent-watcher] source=extraction ${JSON.stringify(summary)}`);
  return summary;
}
