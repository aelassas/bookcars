/**
 * constants.ts — the RENTAL desk's vocabulary, read back from the live Twenty
 * rental instance on 2026-08-28 so the report never drifts from the DB.
 *
 * Everything here mirrors `docs/twenty-rental-pipeline-2026-08-28.md` and was
 * re-verified against the actual Postgres enums in the rental workspace
 * (`workspace_7tkxm1eeqb4iopvi5ica5vos4`). The rental funnel is NOT the sales
 * funnel and must not be made to share labels (see stages.ts for why the two
 * deployments are kept separate).
 */

/** The rental Twenty workspace's Postgres schema. */
export const RENTAL_SCHEMA = "workspace_7tkxm1eeqb4iopvi5ica5vos4";

/** Docker container holding the rental workspace's Postgres. */
export const RENTAL_DB_CONTAINER = "twenty-rental-db-1";

/** Platform tenant slugs whose WhatsApp lives on the rental desk. */
export const RENTAL_TENANT_SLUGS = ["cardiwan", "easyrent", "etm"] as const;

/**
 * Opportunity.stage enum values, positions 0-5 are the live funnel. These are
 * the actual Postgres enum labels (NOT the stages.ts mirror vocabulary, which
 * is stale — it still maps LOST -> CANCELLED and the enum has no CANCELLED).
 */
export const STAGE = {
  NEW_LEAD: "NEW_REQUEST",
  CONTACTED: "IN_PROGRESS",
  SUCCESSFUL: "COMPLETED",
  NO_RESPONSE: "CAR_WITH_CUSTOMER",
  FOLLOW_UP: "WE_SHOULD_REACH_OUT_AGAIN",
  LOST: "UNSUCCESSFUL_DEAL",
} as const;

/** Human labels for every stage value (funnel + legacy). */
export const STAGE_LABELS: Record<string, string> = {
  NEW_REQUEST: "New Lead",
  IN_PROGRESS: "Contacted",
  COMPLETED: "Successful Deal",
  CAR_WITH_CUSTOMER: "No Response",
  WE_SHOULD_REACH_OUT_AGAIN: "Follow-up",
  UNSUCCESSFUL_DEAL: "Lost/Unsuccessful",
  SECOND_TOUCH: "Second Touch (legacy)",
  CAR_PREPARATION: "Old client already has a car (legacy)",
  A_CAR_THAT_WE_DON_T_HAVE: "A car we don't have (legacy)",
  NOT_A_LEAD: "Not a lead (legacy)",
  UNDER_INVESTIGATION: "Under investigation (legacy)",
  THE_CLIENT_WILL_REACH_OUT_AGAIN: "Client will reach out again (legacy)",
  B2B_INQUIRY: "B2B inquiry (legacy)",
};

/**
 * Stages that count as "contacted" in the funnel — i.e. the lead left New Lead
 * and entered a real working stage. Legacy stages are deliberately excluded.
 */
export const CONTACTED_STAGES: readonly string[] = [
  STAGE.CONTACTED,
  STAGE.SUCCESSFUL,
  STAGE.NO_RESPONSE,
  STAGE.FOLLOW_UP,
  STAGE.LOST,
];

// ─── Lead source ────────────────────────────────────────────────────────────
//
// The canonical `leadSource` SELECT (uid 5ac27b5a-…) was created on 2026-08-28
// and is NOT yet backfilled (0 populated). The populated source-of-record is
// the pre-existing `callSource` TEXT field — it carried the label "Lead Source"
// until the pipeline task relabelled it "Call Source". We bucket its Bitrix
// free-text values into the 7 canonical buckets below.

export const SOURCE_BUCKETS = [
  "WHATSAPP",
  "CALL",
  "YANGO",
  "TELEGRAM",
  "DUBIZZLE",
  "WALK_IN",
  "OTHER",
] as const;
export type SourceBucket = (typeof SOURCE_BUCKETS)[number];

export const SOURCE_LABELS: Record<SourceBucket, string> = {
  WHATSAPP: "WhatsApp",
  CALL: "Call",
  YANGO: "Yango",
  TELEGRAM: "Telegram",
  DUBIZZLE: "Dubizzle",
  WALK_IN: "Walk-in",
  OTHER: "Other",
};

/** Classify a `callSource` free-text value into one of the 7 buckets. */
export function classifyCallSource(raw: string | null | undefined): SourceBucket {
  if (!raw) return "OTHER";
  const s = raw.toLowerCase();
  if (s.includes("whatsapp")) return "WHATSAPP";
  if (s.includes("dubizzle")) return "DUBIZZLE";
  if (s.includes("telegram")) return "TELEGRAM";
  if (/яндекс|yandex|yango/.test(s)) return "YANGO";
  if (/посетител|visitor|walk[- ]?in/.test(s)) return "WALK_IN";
  if (/отдел продаж|основной|рабочее время|sales/.test(s)) return "CALL";
  return "OTHER";
}

// ─── Lost reason ────────────────────────────────────────────────────────────
//
// The NEW `lostReason` SELECT (uid 099a5e9f-…) is empty. The populated field is
// the pre-existing Bitrix `lossReason` enum — 18 values, owned by the mirror.

export const LOSS_REASON_LABELS: Record<string, string> = {
  NO_ANSWER: "No answer",
  CAR_TOO_EXPENSIVE: "Car too expensive",
  WANTS_OLDER_CAR: "Wants an older car",
  NO_DOWN_PAYMENT: "No down payment",
  NO_MONTHLY_BUDGET: "No monthly budget",
  POSTPONED: "Postponed",
  BOUGHT_ELSEWHERE: "Bought elsewhere",
  CHANGED_MIND: "Changed mind",
  JUST_ASKING: "Just asking",
  WRONG_NUMBER: "Wrong number",
  SECURITY_QUERY: "Security query",
  DUPLICATE: "Duplicate",
  OVERPAYMENT_TOO_HIGH: "Overpayment too high",
  NOT_TARGET: "Not target",
  NOT_INTERESTED: "Not interested",
  WON_FOLLOWUP: "Won (follow-up)",
  OTHER: "Other",
  SALES_AGENT_LACK_OF_COMMUNICATION: "Agent lack of communication",
};

// ─── Agent line-name mapping (response time) ────────────────────────────────
//
// Response time is measured on the platform DB message table. Inbound WhatsApp
// rows carry the receiving LINE in `to` (e.g. "ayham-rent"); this maps that
// line back to an agent. Lines not listed here (shared brand lines, delivery
// groups) fold into "Other / shared line" rather than being guessed.

export const LINE_TO_AGENT: Record<string, string> = {
  "ayham-rent": "Ayham",
  "babek-rent": "Babek",
  "babek-rent-2": "Babek",
  "babek-rent-3": "Babek",
  "babek-rent-4": "Babek",
  "mohamed-etm": "Mohamed",
  "abdullah-takeauto": "Abdullah",
  cardiwan: "Abdullah",
  Cardiwan: "Abdullah",
  "CarDiwan main": "Abdullah",
  easyrent: "Ali",
};

export const OTHER_AGENT_LABEL = "Other / shared line";

/** Follow-up status thresholds (stage age), in days. Documented rule. */
export const FOLLOWUP_DELAYED_DAYS = 2;
export const FOLLOWUP_MISSED_DAYS = 7;
