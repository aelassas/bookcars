// sales-deal-migration.ts — PURE logic for the Bitrix24 → Twenty (SALES)
// open-deals migration. No I/O here; the runner is
// scripts/migrate-bitrix-sales-deals.ts.
//
// The portal (takeauto-bx24.com) runs two sales pipelines that matter:
//   cat 0 "Primary processing": Новая заявка / Заявки без ответа /
//     Выявление потребности / Повторное касание 1 / Повторное касание 2
//   cat 6 "Sales department" (Отдел Продаж): Выявление потребности /
//     КП отправлено / Прогрев КП / Встреча назначена / Встреча проведена /
//     Отправил на СБ / Одобрено СБ
// (stage ids pinned in mappings.ts DEAL_STAGE_MAP, confirmed 2026-07-21.)
//
// THE AMBIGUITY: "Новая заявка" and "Выявление потребности" exist in BOTH
// pipelines. With the live API the deal's CATEGORY_ID settles it; from the
// mycrm archive (no category column — mapDealType collapses every category to
// "rent") the only signal left is the OWNER'S TEAM, so classifyStage takes
// the team and flags every deal it had to guess on.

export type SalesMemberKey = "bayan" | "maria" | "moe" | "firuz" | "azat";

/** The five sales workspace members a Bitrix owner can map onto. */
export const SALES_MEMBERS: Record<
  SalesMemberKey,
  { twentyId: string; team: "primary" | "sales"; firstNames: string[] }
> = {
  bayan: { twentyId: "fa7be172-60c9-4b54-a7ad-336e89cf2b1e", team: "primary", firstNames: ["bayan"] },
  maria: { twentyId: "78988abe-2295-49dc-aabc-696116d7436f", team: "primary", firstNames: ["maria", "мария"] },
  moe: { twentyId: "f78d1e10-0be5-4d5f-b0c7-ec461a41cc5c", team: "sales", firstNames: ["moe", "mohammad"] },
  firuz: { twentyId: "99ff77c1-ef28-4aca-bf99-8f08a47c5a61", team: "sales", firstNames: ["firuz"] },
  azat: { twentyId: "5378507f-32fd-4f41-a6f0-8e48473206c9", team: "sales", firstNames: ["azat"] },
};

/**
 * Bitrix owner NAME ("Bayan Homsi", "Мария Ибрахим", "FIRUZ KHUSAINOV",
 * "Mohammad Imad") → member key, by first token. Cyrillic first names are
 * listed explicitly ("мария"); anything unknown returns null — an unmatched
 * owner must surface in the report, not silently land on somebody's board.
 */
export function matchOwner(bitrixName: string | null | undefined): SalesMemberKey | null {
  const first = (bitrixName ?? "").trim().split(/\s+/)[0]?.toLowerCase();
  if (!first) return null;
  for (const [key, m] of Object.entries(SALES_MEMBERS) as [SalesMemberKey, (typeof SALES_MEMBERS)[SalesMemberKey]][]) {
    if (m.firstNames.includes(first)) return key;
  }
  return null;
}

export type Pipeline = "primary" | "sales";

export type StageClassification = {
  pipeline: Pipeline;
  /** Twenty SELECT value for primaryStage / salesStage. */
  value: string;
  /** True when the stage NAME exists in both pipelines and the owner's team broke the tie. */
  ambiguous: boolean;
};

// Stage NAME → Twenty option value, per pipeline. Names are verbatim Bitrix
// stage names (deal.stage_detail in the archive; crm.status.list NAME live).
const PRIMARY_STAGES: Record<string, string> = {
  "Новая заявка": "NEW_APPLICATION",
  "Заявки без ответа": "UNANSWERED",
  "Выявление потребности": "IDENTIFYING_THE_NEED",
  "Повторное касание 1": "REPEATED_TOUCH_1",
  "Повторное касание 2": "RE_TOUCH_2",
};

const SALES_STAGES: Record<string, string> = {
  // Cat 6 has its own "Новая заявка" (C6:NEW); the Twenty salesStage funnel
  // starts at IDENTIFYING_THE_NEED, so a brand-new cat-6 deal lands there.
  "Новая заявка": "IDENTIFYING_THE_NEED",
  "Выявление потребности": "IDENTIFYING_THE_NEED",
  "КП отправлено": "CP_SENT",
  "Прогрев КП": "GEARBOX_WARM_UP",
  "Встреча назначена": "MEETING_SCHEDULED",
  "Встреча проведена": "MEETING_HELD",
  "Отправил на СБ": "SENT_TO_SB",
  "Одобрено СБ": "APPROVED",
};

/**
 * Stage NAME → {pipeline, Twenty value}. `categoryId` settles the ambiguity
 * when known (live API path: "0" = primary, "6" = sales); otherwise the
 * owner's team decides (sales team → sales pipeline, anything else →
 * primary, the top of the funnel). Returns null for a stage name that is in
 * NEITHER pipeline — the deal is out of scope and must be counted, not
 * guessed.
 */
export function classifyStage(
  stageName: string | null | undefined,
  opts: { categoryId?: string | number | null; ownerTeam?: "primary" | "sales" | null } = {}
): StageClassification | null {
  const name = (stageName ?? "").trim();
  if (!name) return null;
  const inPrimary = name in PRIMARY_STAGES;
  const inSales = name in SALES_STAGES;
  if (!inPrimary && !inSales) return null;
  if (inPrimary && !inSales) return { pipeline: "primary", value: PRIMARY_STAGES[name], ambiguous: false };
  if (inSales && !inPrimary) return { pipeline: "sales", value: SALES_STAGES[name], ambiguous: false };

  // In BOTH pipelines — needs a tiebreaker.
  const cat = opts.categoryId != null ? String(opts.categoryId) : null;
  if (cat === "0") return { pipeline: "primary", value: PRIMARY_STAGES[name], ambiguous: false };
  if (cat === "6") return { pipeline: "sales", value: SALES_STAGES[name], ambiguous: false };
  const pipeline: Pipeline = opts.ownerTeam === "sales" ? "sales" : "primary";
  return { pipeline, value: pipeline === "sales" ? SALES_STAGES[name] : PRIMARY_STAGES[name], ambiguous: true };
}

/** Last 9 digits of a phone, or null when there aren't 9 digits to take. */
export function phoneTail9(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
}

/** Stock opportunity.stage values that mean the deal is OVER. */
export const CLOSED_STOCK_STAGES = new Set(["CUSTOMER", "LOST"]);

/** The live-relay sources whose open cards must block a migration duplicate. */
export const LIVE_CARD_SOURCES = new Set(["whatsapp", "telegram", "callgear", "instagram", "messenger"]);

export type ExistingCard = {
  externalId?: string | null;
  externalSource?: string | null;
  phoneTail9?: string | null;
  stage?: string | null;
};

export type DedupeDecision = "create" | "already-imported" | "live-card";

/**
 * Should this Bitrix deal become a new card?
 * - `already-imported`: a non-deleted card with this exact externalId exists
 *   (idempotency — a re-run after --commit writes nothing).
 * - `live-card`: the contact's tail9 already has an OPEN card from a live
 *   relay source (whatsapp/telegram/callgear/meta) — that card is what an
 *   agent is working right now; do not double-create.
 */
export function decideDedupe(
  deal: { externalId: string; tail9: string | null },
  existing: { byExternalId: Set<string>; byTail9: Map<string, ExistingCard[]> }
): DedupeDecision {
  if (existing.byExternalId.has(deal.externalId)) return "already-imported";
  if (deal.tail9) {
    const cards = existing.byTail9.get(deal.tail9) ?? [];
    const live = cards.some(
      (c) =>
        c.externalSource !== "bitrix24" &&
        LIVE_CARD_SOURCES.has(c.externalSource ?? "") &&
        !CLOSED_STOCK_STAGES.has(c.stage ?? "")
    );
    if (live) return "live-card";
  }
  return "create";
}

export const NOTE_MAX_CHARS = 2000;

/**
 * Bitrix COMMENTS → note body, or null when there is nothing worth a note
 * (empty/whitespace). Truncated at NOTE_MAX_CHARS with an ellipsis marker so
 * a dumped essay cannot produce a card the editor refuses to open.
 */
export function buildNoteBody(comments: string | null | undefined): string | null {
  const body = (comments ?? "").trim();
  if (!body) return null;
  return body.length > NOTE_MAX_CHARS ? `${body.slice(0, NOTE_MAX_CHARS)}…` : body;
}
