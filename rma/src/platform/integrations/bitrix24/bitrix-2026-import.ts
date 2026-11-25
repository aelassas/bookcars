// bitrix-2026-import.ts — PURE logic for the 2026 active-book import
// (Bitrix deals + leads from the mycrm archive → sales Twenty). No I/O here;
// the runner is scripts/import-bitrix-2026.ts.
//
// This is the SECOND Bitrix import. The first (migrate-bitrix-sales-deals.ts,
// 2026-09-16) covered take-auto open deals only, keyed `bitrix-deal:<id>`.
// This one covers the whole ACTIVE 2026 book — every tenant, deals AND leads
// (Moe's rule: import everything active, exclude only won/lost). It reuses
// that migration's owner/dedupe/phone helpers and its externalId convention,
// and adds the lead funnel plus the stage names the first pass never saw
// (English-named pipeline stages, SPAM/rejection buckets, lead statuses).
//
// View contract (verified live 2026-09-21, core."view" / viewFilter):
//   "Primary processing" kanban = primaryStage IS_NOT_NULL, grouped by it.
//   "Sales Department"   kanban = owner-is-me, grouped by salesStage.
//   "Archive"            table  = stage IS LOST/CUSTOMER/NO_RESPONSE.
//   "All Leads — by stage"      = createdAt IS_AFTER 2026-08-08, grouped stage.
// So: pipeline cards carry primaryStage OR salesStage (never both), junk
// carries stock stage LOST + lossReason (they land in Archive, off the
// boards), and createdAt is backdated to the Bitrix created_at post-create
// (the customer clock; also keeps 10k imported cards out of "Today").
//
// leadNumber is deliberately NOT set: the per-deployment sequence numbers
// NEW system leads (Ayham's board counts from it), and the existing 526
// bitrix24 cards carry none. Historical imports stay unnumbered.

import {
  matchOwner,
  phoneTail9,
  SALES_MEMBERS,
  type SalesMemberKey,
} from "./sales-deal-migration";

// ─── Stage classification ───────────────────────────────────────────────────

export type CardKind = "primary" | "sales" | "lost";

export type ImportClassification = {
  kind: CardKind;
  /** Twenty option value for primaryStage (kind "primary") or salesStage ("sales"). */
  value: string | null;
  /** opportunity.lossReason option value — kind "lost" only. */
  lossReason: string | null;
  /** True when the stage name exists in both pipelines and the owner's team broke the tie. */
  ambiguous: boolean;
};

// Deal stage names observed in the active 2026 set, beyond what
// sales-deal-migration.classifyStage knows (Russian cat-0/cat-6 names).
// "In Progress" is the English pipeline's in-work column — the same position
// "Выявление потребности" holds — so it inherits that name's dual-pipeline
// ambiguity and owner-team tiebreak.
const PRIMARY_DEAL_STAGES: Record<string, string> = {
  "Новая заявка": "NEW_APPLICATION",
  "New": "NEW_APPLICATION",
  "New Leads": "NEW_APPLICATION",
  "Заявки без ответа": "UNANSWERED",
  "Not responding": "UNANSWERED",
  "Выявление потребности": "IDENTIFYING_THE_NEED",
  "In Progress": "IDENTIFYING_THE_NEED",
  "Повторное касание 1": "REPEATED_TOUCH_1",
  "Second touch": "REPEATED_TOUCH_1",
  "Повторное касание 2": "RE_TOUCH_2",
  // Rental-brand deal stages that leak into the sales book under Moe's
  // "import everything active" rule — kept VISIBLE on the board, the
  // original name preserved in stageDetail.
  "Rent in progress": "IDENTIFYING_THE_NEED",
};

const SALES_DEAL_STAGES: Record<string, string> = {
  "Новая заявка": "IDENTIFYING_THE_NEED",
  "Выявление потребности": "IDENTIFYING_THE_NEED",
  "In Progress": "IDENTIFYING_THE_NEED",
  "КП отправлено": "CP_SENT",
  "Прогрев КП": "GEARBOX_WARM_UP",
  "Встреча назначена": "MEETING_SCHEDULED",
  "Встреча проведена": "MEETING_HELD",
  "Отправил на СБ": "SENT_TO_SB",
  "Одобрено СБ": "APPROVED",
};

// Dead-end buckets → stock stage LOST + opportunity.lossReason (the LIVE
// loss-reason field — 1,227 cards use it; `lostReason` is a dead duplicate).
// These land in the Archive view, off both kanban boards, and stay countable.
const LOST_DEAL_STAGES: Record<string, string> = {
  "SPAM": "NOT_TARGET",
  "Rejection by security": "SECURITY_QUERY",
  "Отказ по языку": "OTHER",
  "Отказ компании": "OTHER",
  "Некорректный номер": "WRONG_NUMBER",
  "Работа(Резюме)": "NOT_TARGET",
  "Double": "DUPLICATE",
  "Test": "OTHER",
  "Colleagues/Car rentals": "NOT_TARGET",
};

// Lead statuses (Bitrix LEAD funnel, not the deal pipelines). All leads land
// in primary processing; "Not Quality Leads" is the junk bucket → Archive.
// "Качественный лид" ("qualified lead") is Bitrix's final processed status —
// contact was made and the lead qualified, so it enters mid-funnel at
// IDENTIFYING_THE_NEED rather than reading as an untouched new application.
const PRIMARY_LEAD_STAGES: Record<string, string> = {
  "": "NEW_APPLICATION",
  "New Leads": "NEW_APPLICATION",
  "🎯 Leasing opportunity!": "NEW_APPLICATION",
  "🚗 Economy client!": "NEW_APPLICATION",
  "Hot lead": "NEW_APPLICATION",
  "Rent Cars & Colleagues": "NEW_APPLICATION",
  "First Contact": "IDENTIFYING_THE_NEED",
  "Established Contact": "IDENTIFYING_THE_NEED",
  "Качественный лид": "IDENTIFYING_THE_NEED",
  "Need Second Touch": "REPEATED_TOUCH_1",
  // Active renters sitting in the lead table — kept VISIBLE on the board for
  // the team to place by hand rather than hidden as CUSTOMER in Archive.
  "Booked the Car": "IDENTIFYING_THE_NEED",
  "Riding the Car": "IDENTIFYING_THE_NEED",
  "Rent in progress": "IDENTIFYING_THE_NEED",
};

const LOST_LEAD_STAGES: Record<string, string> = {
  "Not Quality Leads": "NOT_TARGET",
};

/**
 * Deal stage name → card placement. Dual-pipeline names
 * ("Новая заявка"/"Выявление потребности"/"In Progress") resolve by the
 * owner's team, same rule as the first migration. Returns null ONLY for an
 * empty stage — every name in the active 2026 set is mapped above, and the
 * runner reports any name that is not (never dropped silently).
 */
export function classifyDealStage(
  stageName: string | null | undefined,
  opts: { ownerTeam?: "primary" | "sales" | null } = {}
): ImportClassification | null {
  const name = (stageName ?? "").trim();
  if (!name) return null;
  if (name in LOST_DEAL_STAGES) {
    return { kind: "lost", value: null, lossReason: LOST_DEAL_STAGES[name], ambiguous: false };
  }
  const inPrimary = name in PRIMARY_DEAL_STAGES;
  const inSales = name in SALES_DEAL_STAGES;
  if (!inPrimary && !inSales) return null;
  if (inPrimary && !inSales) {
    return { kind: "primary", value: PRIMARY_DEAL_STAGES[name], lossReason: null, ambiguous: false };
  }
  if (inSales && !inPrimary) {
    return { kind: "sales", value: SALES_DEAL_STAGES[name], lossReason: null, ambiguous: false };
  }
  const kind: CardKind = opts.ownerTeam === "sales" ? "sales" : "primary";
  return {
    kind,
    value: kind === "sales" ? SALES_DEAL_STAGES[name] : PRIMARY_DEAL_STAGES[name],
    lossReason: null,
    ambiguous: true,
  };
}

/** Lead status name → card placement. Null only for a name nobody mapped. */
export function classifyLeadStage(stageName: string | null | undefined): ImportClassification | null {
  const name = (stageName ?? "").trim();
  if (name in LOST_LEAD_STAGES) {
    return { kind: "lost", value: null, lossReason: LOST_LEAD_STAGES[name], ambiguous: false };
  }
  if (name in PRIMARY_LEAD_STAGES) {
    return { kind: "primary", value: PRIMARY_LEAD_STAGES[name], lossReason: null, ambiguous: false };
  }
  return null;
}

// ─── Owner resolution ───────────────────────────────────────────────────────

/** Round-robin pool for primary-pipeline cards whose Bitrix owner is not a
 *  sales workspace member — the same girls the relay deals NEW cards to. */
export const FALLBACK_PRIMARY_OWNERS: readonly SalesMemberKey[] = ["bayan", "maria"];

/** Sales-pipeline and lost cards with an unmappable owner go to the team lead. */
export const FALLBACK_SALES_OWNER: SalesMemberKey = "moe";

export type OwnerResolution = {
  memberKey: SalesMemberKey;
  twentyId: string;
  /** How the owner was chosen — counted in the report. */
  via: "bitrix-owner" | "fallback-roundrobin" | "fallback-lead";
};

/**
 * Bitrix owner name → sales workspaceMember. A matched name always wins;
 * otherwise the card's pipeline decides the fallback (primary → round-robin
 * over the primary-processing pool, sales/lost → Moe). "Owner must be set"
 * is the import's contract, so there is no null path here — but every
 * fallback is counted and the unmatched names are reported.
 */
export function resolveOwner(
  bitrixName: string | null | undefined,
  kind: CardKind,
  roundRobinCursor: number
): { resolution: OwnerResolution; nextCursor: number } {
  const matched = matchOwner(bitrixName);
  if (matched) {
    return {
      resolution: { memberKey: matched, twentyId: SALES_MEMBERS[matched].twentyId, via: "bitrix-owner" },
      nextCursor: roundRobinCursor,
    };
  }
  if (kind === "primary") {
    const memberKey = FALLBACK_PRIMARY_OWNERS[roundRobinCursor % FALLBACK_PRIMARY_OWNERS.length];
    return {
      resolution: { memberKey, twentyId: SALES_MEMBERS[memberKey].twentyId, via: "fallback-roundrobin" },
      nextCursor: roundRobinCursor + 1,
    };
  }
  return {
    resolution: {
      memberKey: FALLBACK_SALES_OWNER,
      twentyId: SALES_MEMBERS[FALLBACK_SALES_OWNER].twentyId,
      via: "fallback-lead",
    },
    nextCursor: roundRobinCursor,
  };
}

// ─── Card + note builders ───────────────────────────────────────────────────

export const IMPORT_EXTERNAL_SOURCE = "bitrix24";

export function dealExternalId(bitrixId: string): string {
  return `bitrix-deal:${bitrixId}`;
}

export function leadExternalId(bitrixId: string): string {
  return `bitrix-lead:${bitrixId}`;
}

/** Card name = the customer name, readable without opening the card. Deals
 *  carry it in `ref` (the Bitrix title, "Name - source"); leads in
 *  customer_name. Never "Unknown" — fall back to the phone, then the id. */
export function cardName(parts: {
  title?: string | null;
  customerName?: string | null;
  phone?: string | null;
  externalId: string;
}): string {
  const title = (parts.title ?? "").trim();
  if (title) return title;
  const customer = (parts.customerName ?? "").trim();
  if (customer) return customer;
  const tail = phoneTail9(parts.phone);
  if (tail) return `+…${tail}`;
  return parts.externalId;
}

/** opportunity body for one record. `stage` is NEW on pipeline cards (the
 *  default every existing bitrix24 card carries) and LOST on junk buckets. */
export function buildOpportunityBody(parts: {
  name: string;
  externalId: string;
  classification: ImportClassification;
  ownerId: string;
  stageDetail: string | null;
  phoneTail9: string | null;
  valueAed?: number | null;
  carModels?: string | null;
}): Record<string, unknown> {
  const c = parts.classification;
  const body: Record<string, unknown> = {
    name: parts.name,
    stage: c.kind === "lost" ? "LOST" : "NEW",
    externalId: parts.externalId,
    externalSource: IMPORT_EXTERNAL_SOURCE,
    ownerId: parts.ownerId,
  };
  if (c.kind === "primary" && c.value) body.primaryStage = c.value;
  if (c.kind === "sales" && c.value) body.salesStage = c.value;
  if (c.kind === "lost" && c.lossReason) body.lossReason = c.lossReason;
  if (parts.stageDetail) body.stageDetail = parts.stageDetail;
  if (parts.phoneTail9) body.phoneTail9 = parts.phoneTail9;
  if (parts.valueAed != null && parts.valueAed > 0) {
    body.amount = { amountMicros: Math.round(parts.valueAed * 1_000_000), currencyCode: "AED" };
  }
  const cars = (parts.carModels ?? "").trim();
  if (cars) body.carModels = cars;
  return body;
}

export const IMPORT_NOTE_MAX_CHARS = 4000;

/** One labeled note per card, assembled from whichever source fields carry
 *  text; null when there is nothing worth a note. Truncated so a dumped essay
 *  cannot produce a card the editor refuses to open. */
export function buildImportNoteBody(sections: [label: string, text: string | null | undefined][]): string | null {
  const parts = sections
    .map(([label, text]) => [label, (text ?? "").trim()] as const)
    .filter(([, text]) => text.length > 0)
    .map(([label, text]) => `${label}:\n${text}`);
  if (parts.length === 0) return null;
  const body = parts.join("\n\n");
  return body.length > IMPORT_NOTE_MAX_CHARS ? `${body.slice(0, IMPORT_NOTE_MAX_CHARS)}…` : body;
}
