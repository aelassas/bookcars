/**
 * stages.ts — the opportunity funnel vocabulary, per Twenty DEPLOYMENT.
 *
 * The two instances do NOT share a funnel and must not be made to. The sales
 * desk (:3001) runs Twenty's stock SaaS stages; the rent desk (:3002) ran
 * Babek's 2026-08-07 columns until the 08-25 meeting pipeline replaced them
 * (applied live 2026-08-28, codified here 2026-09-06 — see the warning below):
 *
 *   new lead → contacted → follow-up → successful deal | lost/unsuccessful,
 *   plus the side columns returning lead / existing client / yangoo-dubizzle /
 *   b2b inquiry / not a lead
 *
 * ── THE LIVE BOARD IS THE SOURCE OF TRUTH ───────────────────────────────────
 * This file drifted once already: the board was rebuilt with UNSUCCESSFUL_DEAL
 * and NOT_A_LEAD while CLOSED_STAGES below still thought only COMPLETED and
 * CANCELLED were terminal. Every lost card looked OPEN, so a customer writing
 * again was upserted onto their own dead card and the new enquiry vanished
 * (Ayham: "linked to previous cards", 2026-09-06). When the board changes,
 * change THIS FILE in the same breath — and verify against the live enum:
 *   select unnest(enum_range(null::workspace_….opportunity_stage_enum));
 * and the live labels:
 *   core."fieldMetadata" options for opportunity.stage.
 *
 * ── WHY A SHARED MODULE ─────────────────────────────────────────────────────
 * Three things have to agree about the rental funnel or the board breaks:
 *   1. the Postgres enum `opportunity_stage_enum` in the rental workspace,
 *   2. `core."fieldMetadata".options` for opportunity.stage (Twenty renders
 *      "Sorry, something went wrong" the moment these two disagree), and
 *   3. what the Bitrix mirror WRITES into the stage field.
 * (1) and (2) are applied by scripts/rental-stage-funnel.sql, which is
 * generated from — and verified against — the table below; (3) is this file.
 * A value added in one place and forgotten in another is the failure mode this
 * module exists to prevent.
 *
 * ── WHY THE MIRROR CANNOT REACH EVERY STAGE ─────────────────────────────────
 * Bitrix carries no signal for "the car is with the customer" or "deposit
 * refunded" — those are things the rent desk knows and Bitrix never recorded.
 * The mirror therefore writes only the stages it can honestly derive
 * (MIRROR_REACHABLE below) and treats the rest as MANUAL: once a human drags a
 * card into one, the mirror must stop asserting a stage for that deal, or the
 * next sync pass silently drags it back to "new lead" and Babek's board resets
 * itself every minute.
 */

import type { TwentyInstanceKey } from "./instance";

export interface TwentyStageOption {
  /** Stable option id — also the enum value written to Postgres. */
  value: string;
  /** Label shown on the board column. */
  label: string;
  /** Twenty palette name. */
  color: string;
}

/** Twenty's stock funnel — the sales instance (:3001). Do not edit for rent. */
export const SALES_STAGES: readonly TwentyStageOption[] = [
  { value: "NEW", label: "New", color: "red" },
  { value: "SCREENING", label: "Screening", color: "purple" },
  { value: "MEETING", label: "Meeting", color: "sky" },
  { value: "PROPOSAL", label: "Proposal", color: "turquoise" },
  { value: "CUSTOMER", label: "Customer", color: "yellow" },
  { value: "LOST", label: "Проиграно", color: "gray" },
] as const;

/**
 * The rent funnel as it EXISTS on the live board (:3002) since 2026-08-28 —
 * values AND labels copied from the live `fieldMetadata` options, position
 * order preserved, including the live typo "B2B inqury" (fixing the label on
 * the board is a UI edit; this file must mirror what IS, not what should be).
 * CAR_WITH_CUSTOMER is the repurposed "B2B inquiry" column.
 */
export const RENTAL_STAGES: readonly TwentyStageOption[] = [
  { value: "NEW_REQUEST", label: "New Lead", color: "red" },
  { value: "IN_PROGRESS", label: "Contacted", color: "orange" },
  { value: "COMPLETED", label: "Successful Deal", color: "green" },
  { value: "CAR_WITH_CUSTOMER", label: "B2B inqury", color: "blue" },
  { value: "WE_SHOULD_REACH_OUT_AGAIN", label: "Follow-up", color: "yellow" },
  { value: "UNSUCCESSFUL_DEAL", label: "Lost/Unsuccessful", color: "gray" },
  { value: "RETURNING_LEAD", label: "Returning Lead", color: "purple" },
  { value: "NOT_A_LEAD", label: "Not a lead", color: "gray" },
  { value: "EXISTING_CLIENT", label: "Existing Client", color: "turquoise" },
  { value: "YANGOO_DUBIZZLE", label: "Yangoo/Dubizzle", color: "sky" },
] as const;

export interface StageVocabulary {
  options: readonly TwentyStageOption[];
  /** Deal is over and won — the promo segment, and a hidden kanban column. */
  won: string;
  /** Deal is over and not won. */
  lost: string;
  /** Stages the Bitrix mirror is allowed to assert. */
  mirrorReachable: ReadonlySet<string>;
  /** Translation of the canonical decision tree onto this instance. */
  fromCanonical: Readonly<Record<string, string>>;
}

/**
 * The mirror's decision tree (mapOpportunityStage) is written once, in the
 * stock vocabulary, and translated per instance through this table. Keeping
 * ONE tree and translating it is what makes the SQL row migration and the
 * mirror agree by construction: the rental column below IS the migration.
 */
const RENTAL_FROM_CANONICAL: Readonly<Record<string, string>> = {
  NEW: "NEW_REQUEST",
  SCREENING: "IN_PROGRESS",
  MEETING: "WE_SHOULD_REACH_OUT_AGAIN",
  // PROPOSAL deliberately unmapped: the old target CAR_PREPARATION is gone and
  // CAR_WITH_CUSTOMER now means "B2B inquiry" — guessing would file real deals
  // into the wrong column, so the mirror OMITS the stage (toInstanceStage
  // returns null) exactly as it does for unknown rows.
  CUSTOMER: "COMPLETED",
  LOST: "UNSUCCESSFUL_DEAL",
};

const IDENTITY_FROM_CANONICAL: Readonly<Record<string, string>> = Object.fromEntries(
  SALES_STAGES.map((s) => [s.value, s.value])
);

const VOCABULARIES: Record<TwentyInstanceKey, StageVocabulary> = {
  default: {
    options: SALES_STAGES,
    won: "CUSTOMER",
    lost: "LOST",
    mirrorReachable: new Set(SALES_STAGES.map((s) => s.value)),
    fromCanonical: IDENTITY_FROM_CANONICAL,
  },
  rental: {
    options: RENTAL_STAGES,
    won: "COMPLETED",
    lost: "UNSUCCESSFUL_DEAL",
    // Everything NOT reachable from the canonical tree (RETURNING_LEAD,
    // EXISTING_CLIENT, NOT_A_LEAD, YANGOO_DUBIZZLE) is agent- or
    // automation-owned: the mirror and stage-progression must never assert
    // a card out of those columns.
    mirrorReachable: new Set(Object.values(RENTAL_FROM_CANONICAL)),
    fromCanonical: RENTAL_FROM_CANONICAL,
  },
};

export function stageVocabulary(instance: TwentyInstanceKey): StageVocabulary {
  return VOCABULARIES[instance];
}

/**
 * Translate a canonical stage onto an instance. Returns null when the value
 * has no equivalent — callers OMIT the stage field rather than guessing, the
 * same contract mapOpportunityStage already had for unknown rows.
 */
export function toInstanceStage(
  instance: TwentyInstanceKey,
  canonical: string | null
): string | null {
  if (!canonical) return null;
  return stageVocabulary(instance).fromCanonical[canonical] ?? null;
}

/**
 * True when this stage was set by a human and the mirror must not overwrite
 * it. Only meaningful for stages the mirror could never have written itself.
 */
export function isManualStage(instance: TwentyInstanceKey, current: string | null): boolean {
  if (!current) return false;
  return !stageVocabulary(instance).mirrorReachable.has(current);
}

/**
 * Stages that mean "this deal is over", across BOTH vocabularies. Used to
 * prefer a live deal when attaching a WhatsApp conversation: the union is
 * deliberate so the projector keeps working through the funnel migration and
 * against either instance without being told which one it is looking at.
 */
export const CLOSED_STAGES: ReadonlySet<string> = new Set([
  ...Object.values(VOCABULARIES).flatMap((v) => [v.won, v.lost]),
  // NOT_A_LEAD is terminal for ATTACHMENT, not a lost deal: a number once
  // filed as noise must not block a genuine future enquiry, and attaching
  // would resurrect the noise card — the next real request gets a fresh one.
  // CANCELLED survived the 2026-08-28 funnel rebuild in no live card, but
  // keep it closed so nothing from before the rebuild can look open.
  "NOT_A_LEAD",
  "CANCELLED",
]);
