"use server";
// Babek's merged rent view: each rent brand's OWN Bitrix lead funnel, side by
// side, on one screen. NOT a column-merge — cardiwan (10 stages) and easyrent
// (5) keep their authentic funnels (owner's call 2026-07-27). Cross-tenant like
// getLineMonitor: each brand is read inside its own withDrizzleTenant, and
// getTenantBySlug enforces membership, so a viewer only ever sees brands they
// belong to (Babek: both; Abdullah: cardiwan; Ali: both).
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { lead, user } from "@/platform/db/schema";
import { canonicalName } from "@/modules/monitor/people";

// The rent brands, in display order, with each portal's Bitrix lead-status
// funnel spelled out (from crm.status.list, cached at build time — this is a
// single-customer install, so hard-coding the two funnels is correct and avoids
// a live API call on every page load). A lead whose stage_detail matches none
// of these lands in the first ("new") column.
// Each stage has a `key` (the exact Bitrix status NAME stored in
// lead.stage_detail — used to bucket rows) and an English `label` (what the
// column header shows). Cardiwan's Bitrix funnel is already English; easyrent's
// is Russian in their portal, so we keep the Russian key for matching but
// render an English label — the app is English-only, the data stays authentic.
const RENT_BRANDS: { slug: string; stages: { key: string; label: string }[] }[] = [
  {
    slug: "cardiwan",
    stages: [
      { key: "New Leads", label: "New Leads" },
      { key: "Need Second Touch", label: "Need Second Touch" },
      { key: "First Contact", label: "First Contact" },
      { key: "Established Contact", label: "Established Contact" },
      { key: "Rent Cars & Colleagues", label: "Rent Cars & Colleagues" },
      { key: "Booked the Car", label: "Booked the Car" },
      { key: "Riding the Car", label: "Riding the Car" },
      { key: "Waiting for Deposit", label: "Waiting for Deposit" },
      { key: "Hot lead", label: "Hot lead" },
      { key: "Not Quality Leads", label: "Not Quality" },
    ],
  },
  {
    slug: "easyrent",
    stages: [
      { key: "Не обработан", label: "Unprocessed" },
      { key: "В работе", label: "In progress" },
      { key: "Обработан", label: "Processed" },
      { key: "Качественный лид", label: "Qualified" },
      { key: "Некачественный лид", label: "Junk" },
    ],
  },
];

// Cards rendered per brand (newest first); column headers show the TRUE count.
const CARD_CAP = 400;

// The person-filter chips should be the working team, not the long tail of
// ex-staff Bitrix accounts (many named in Cyrillic). Drop Cyrillic-named
// assignees from the CHIPS only — their leads still show under "All".
const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s);

// Owner's call 2026-07-29: the chips are the working rent team — "only Ali,
// Abdullah and Babek must remain". Same semantics as the Cyrillic filter:
// everyone else's leads still show under "All", only the chips are trimmed.
const RENT_TEAM_CHIPS = new Set(["Abdullah", "Ali", "Babek"]);
const showChip = (p: string) => !hasCyrillic(p) && RENT_TEAM_CHIPS.has(p);

export type RentLeadCard = {
  id: string;
  name: string;
  phone: string | null;
  car: string | null;
  stage: string;
  assignee: string | null;
  createdAt: string;
};

export type RentFunnelColumn = { stage: string; count: number; cards: RentLeadCard[] };

export type RentFunnel = {
  slug: string;
  brandName: string;
  columns: RentFunnelColumn[];
  /** Canonical assignee names present in this brand (for the person filter). */
  people: string[];
  /** Total live leads in the brand for this year (all columns). */
  total: number;
};

export type RentBoard = {
  funnels: RentFunnel[];
  /** Brands in the rent line the viewer is NOT a member of (kept visible). */
  skipped: string[];
  /** Union of canonical assignee names across visible brands. */
  people: string[];
};

/**
 * Build the side-by-side rent funnels for the viewer, optionally filtered to
 * one canonical assignee (e.g. "Abdullah"). Babek is the exception: his chip
 * is the full rent-team feed (owner's call — Cardiwan + ETM/EasyRent are the
 * rental TEAM's funnels, not per-person territory).
 */
export async function getRentBoard(assignee?: string | null): Promise<RentBoard> {
  const funnels: RentFunnel[] = [];
  const skipped: string[] = [];
  const peopleSet = new Set<string>();

  for (const brand of RENT_BRANDS) {
    const tenant = await getTenantBySlug(brand.slug);
    if (!tenant) {
      skipped.push(brand.slug);
      continue;
    }

    const rows = await withDrizzleTenant(tenant.id, (tx) =>
      tx
        .select({
          id: lead.id,
          name: lead.customerName,
          phone: lead.phone,
          car: lead.vouchedCar,
          stage: lead.stageDetail,
          assignee: user.name,
          createdAt: lead.createdAt,
        })
        .from(lead)
        .leftJoin(user, eq(user.id, lead.assignedTo))
        // Only leads that carry a real Bitrix funnel stage — i.e. the ones the
        // rent team actually worked this year (stage_detail is populated by the
        // 2026 re-pull). Dormant/old leads with no stage are left out rather
        // than dumped into the first column as fake "New".
        .where(and(eq(lead.tenantId, tenant.id), isNotNull(lead.stageDetail)))
        .orderBy(desc(lead.createdAt))
        .limit(4000),
    );

    // Bucket into the brand's known columns by KEY (unknown/empty → first
    // column); display the English label.
    const first = brand.stages[0];
    const labelOf = new Map(brand.stages.map((s) => [s.key, s.label]));
    const byKey = new Map<string, RentLeadCard[]>();
    const countByKey = new Map<string, number>();
    for (const s of brand.stages) {
      byKey.set(s.key, []);
      countByKey.set(s.key, 0);
    }

    let total = 0;
    for (const r of rows) {
      const canon = canonicalName(r.assignee);
      if (canon) peopleSet.add(canon);
      // Person filter (canonical) applies to cards + counts — EXCEPT for the
      // rent manager: owner's call 2026-07-29 ("ETM + Cardiwan is for the
      // rental TEAM — so Babek sees both"). Bitrix formally assigns most
      // Cardiwan leads to Abdullah/Banan/Fatimah, but they are the team's
      // workload, so Babek's chip is the full team feed, not just his name.
      if (assignee && assignee !== "Babek" && canon !== assignee) continue;

      const key = r.stage && byKey.has(r.stage) ? r.stage : first.key;
      total += 1;
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
      const bucket = byKey.get(key)!;
      if (bucket.length < CARD_CAP) {
        bucket.push({
          id: r.id,
          name: r.name ?? "No name",
          phone: r.phone ?? null,
          car: r.car ?? null,
          stage: labelOf.get(key) ?? key,
          assignee: canon,
          createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
        });
      }
    }

    funnels.push({
      slug: brand.slug,
      brandName: tenant.name,
      columns: brand.stages.map((s) => ({ stage: s.label, count: countByKey.get(s.key) ?? 0, cards: byKey.get(s.key) ?? [] })),
      people: [...peopleSet].filter(showChip).sort(),
      total,
    });
  }

  return { funnels, skipped, people: [...peopleSet].filter(showChip).sort() };
}
