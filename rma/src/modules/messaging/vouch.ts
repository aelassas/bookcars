// INTELLIGENCE LAYER — roll extracted message signals UP onto lead/deal.
//
// A single inbound line lands its facts on the `message` row (extract.ts). This
// module promotes the freshest of those facts to the customer's lead and open
// deals as `vouched_*` — the car / value / term the CUSTOMER actually named,
// which the hot-car demand model and the deal card then read instead of the
// Bitrix `value`/`type` the owner distrusts.
//
// The DB step is deliberately best-effort and defensive: chat↔record linkage is
// the platform's known #1 gap (messages carry a customer/phone, deals hang off
// leads), so a rollup that can't find a home for a signal is a no-op, never an
// error that could block live message projection.

import { and, desc, eq, sql } from "drizzle-orm";
import { deal, lead } from "@/platform/db/schema";
import type { ExtractedSignals } from "./extract";

export interface VouchedFacts {
  car: string | null;
  value: number | null;
  term: number | null;
}

/**
 * Merge freshly-extracted signals over the existing vouched facts. Freshest
 * non-null wins: a new signal only overwrites when it actually carries that
 * field, so a later "send price" line never wipes an earlier car mention. Pure.
 */
export function mergeVouched(prev: VouchedFacts, sig: ExtractedSignals): VouchedFacts {
  return {
    car: sig.carText ?? prev.car,
    value: sig.priceAed ?? prev.value,
    term: sig.termMonths ?? prev.term,
  };
}

/** True when the signals carry anything worth rolling up. */
export function hasVouchable(sig: ExtractedSignals): boolean {
  return sig.carText != null || sig.priceAed != null || sig.termMonths != null;
}

/**
 * Best-effort promotion of a message's signals to the customer's lead + open
 * deals, keyed by normalized phone. Returns how many rows it touched. Any
 * failure is swallowed by the caller — this must never block projection.
 *
 * `tx` is an already-tenant-scoped Drizzle transaction (from withDrizzleTenant).
 */
export async function rollUpVouched(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  args: { tenantId: string; phone: string | null | undefined; signals: ExtractedSignals }
): Promise<{ leadsUpdated: number; dealsUpdated: number }> {
  const { tenantId, signals } = args;
  if (!hasVouchable(signals)) return { leadsUpdated: 0, dealsUpdated: 0 };
  const phone = (args.phone ?? "").replace(/\D/g, "");
  if (!phone) return { leadsUpdated: 0, dealsUpdated: 0 };

  // Leads for this phone (digits-only compare, tolerant of stored formatting).
  const leads = await tx
    .select({ id: lead.id, car: lead.vouchedCar, value: lead.vouchedValue, term: lead.vouchedTerm })
    .from(lead)
    .where(
      and(
        eq(lead.tenantId, tenantId),
        sql`regexp_replace(coalesce(${lead.phone}, ''), '\\D', '', 'g') = ${phone}`
      )
    )
    .orderBy(desc(lead.updatedAt))
    .limit(5);

  let leadsUpdated = 0;
  let dealsUpdated = 0;

  for (const l of leads) {
    const next = mergeVouched({ car: l.car, value: l.value, term: l.term }, signals);
    await tx
      .update(lead)
      .set({ vouchedCar: next.car, vouchedValue: next.value, vouchedTerm: next.term, updatedAt: new Date() })
      .where(eq(lead.id, l.id));
    leadsUpdated += 1;

    // Open deals hanging off this lead get the same freshest facts.
    const openDeals = await tx
      .select({ id: deal.id, car: deal.vouchedCar, value: deal.vouchedValue, term: deal.vouchedTerm })
      .from(deal)
      .where(and(eq(deal.leadId, l.id), eq(deal.status, "open")));
    for (const d of openDeals) {
      const dn = mergeVouched({ car: d.car, value: d.value, term: d.term }, signals);
      await tx
        .update(deal)
        .set({ vouchedCar: dn.car, vouchedValue: dn.value, vouchedTerm: dn.term, updatedAt: new Date() })
        .where(eq(deal.id, d.id));
      dealsUpdated += 1;
    }
  }

  return { leadsUpdated, dealsUpdated };
}
