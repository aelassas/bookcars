// ─── Customer INTENT taxonomy (shared) ─────────────────────────────────────
//
// ONE vocabulary, used by: the deal-card fast picker (writes deal.intent), the
// Watchers board (groups columns by it), and — later — the messaging
// extraction layer, which writes the SAME deal.intent column. Keep this file
// free of "use server"/DB imports so both server and client bundles can import
// the constants and the pure `deriveIntent` fallback.
//
// Why a dedicated field and not `deal.type`? On live prod data every open deal
// is type='rent' (the Bitrix import never differentiated it), so `type` says
// nothing about what the customer wants. Intent is the explicit signal.

export const INTENT_KEYS = ["rent", "lease_6m", "lease_12m", "lease_to_own", "sale"] as const;
export type Intent = (typeof INTENT_KEYS)[number];

export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENT_KEYS as readonly string[]).includes(v);
}

// RU labels — the team reads Russian. `short` is the column chip; `full` the
// tooltip / picker label.
export const INTENT_LABELS: Record<Intent, { short: string; full: string; hint: string }> = {
  rent:         { short: "Rent",         full: "Rent (daily / monthly)",       hint: "Short-term rental" },
  lease_6m:     { short: "Lease 6 mo",   full: "Six-month lease",              hint: "Six-month contract" },
  lease_12m:    { short: "Lease 1 yr",   full: "One-year lease",               hint: "One-year contract" },
  lease_to_own: { short: "Lease-to-own", full: "Lease to own",                 hint: "Installments / buyout" },
  sale:         { short: "Sale",         full: "Car sale",                     hint: "Outright purchase" },
};

// Column order on the Watchers board — left→right the way the owner thinks
// about the funnel: short commitment → long commitment → ownership.
export const INTENT_ORDER: Intent[] = ["rent", "lease_6m", "lease_12m", "lease_to_own", "sale"];

// ─── Provisional derivation (fallback when deal.intent IS NULL) ─────────────
// Keyword-driven best guess from whatever free text the deal carries (ref +
// notes + the exact Bitrix stage name). Deliberately conservative: only the
// clear signals move a deal off the default, so a manager's explicit pick is
// always the last word. Order matters — most specific first.
type IntentSignal = {
  ref?: string | null;
  notes?: string | null;
  stageDetail?: string | null;
  type?: string | null;
};

const RULES: { intent: Intent; words: string[] }[] = [
  { intent: "lease_to_own", words: ["выкуп", "рассроч", "lease to own", "lease-to-own", "buyout", "own the car", "в собственность"] },
  { intent: "sale",         words: ["продаж", "продать", "купить авто", "outright", "for sale", "buy the car", "покупка авто"] },
  { intent: "lease_6m",     words: ["полгода", "пол года", "6 мес", "6 month", "6 months", "six month", "6-month", "на 6"] },
  { intent: "lease_12m",    words: ["лизинг", "leasing", "lease", "12 мес", "12 month", "на год", "годовой", "1 год", "annual lease"] },
  { intent: "rent",         words: ["аренда", "прокат", "rent", "rental", "посуточно", "помесячно", "daily", "weekly", "monthly rate"] },
];

/**
 * Best-effort provisional intent when nothing is set explicitly. Returns a
 * concrete Intent (never null) so every open deal lands in exactly one Watchers
 * column. Falls back to the dominant business line (`rent`) when no keyword and
 * no type hint is present.
 */
export function deriveIntent(sig: IntentSignal): Intent {
  const hay = ` ${(sig.ref ?? "")} ${(sig.notes ?? "")} ${(sig.stageDetail ?? "")} `.toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => hay.includes(w))) return rule.intent;
  }
  switch ((sig.type ?? "").toLowerCase()) {
    case "purchase":
      return "sale";
    case "lease":
      return "lease_12m";
    case "rent":
    default:
      return "rent";
  }
}

/** deal.intent if it is a valid key, otherwise the derived provisional intent. */
export function effectiveIntent(deal: IntentSignal & { intent?: string | null }): Intent {
  return isIntent(deal.intent) ? deal.intent : deriveIntent(deal);
}

/** Whether an intent value is explicitly set (vs. derived). Drives the "?" UI tag. */
export function isExplicit(intent?: string | null): boolean {
  return isIntent(intent);
}

// ─── Bridge from the extraction fable's vocabulary ─────────────────────────
// The messaging extraction layer emits a coarser `ExtractIntent`
// (rent | lease | lease_to_own | sale) plus a separate `termMonths`, because a
// message rarely states 6-vs-12 in the same breath as "lease". This maps that
// pair onto the shared 5-value column so BOTH fables write ONE vocabulary into
// deal.intent. `lease` splits on the term (≤6 months → lease_6m, else annual).
export function fromExtractIntent(
  intent: "rent" | "lease" | "lease_to_own" | "sale" | null | undefined,
  termMonths?: number | null
): Intent | null {
  switch (intent) {
    case "rent":
      return "rent";
    case "sale":
      return "sale";
    case "lease_to_own":
      return "lease_to_own";
    case "lease":
      return termMonths != null && termMonths <= 6 ? "lease_6m" : "lease_12m";
    default:
      return null;
  }
}
