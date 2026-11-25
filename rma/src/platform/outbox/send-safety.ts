// Outbound content safety — the stop-word guardrail.
//
// Sensitive financial language in an outgoing WhatsApp message (bank details,
// IBAN, refunds, loans, deposit instructions) must NEVER leave the building on
// an AI draft or a junior's click alone. When `screenOutbound` flags a body,
// the row is enqueued with `flagged = true`; the observer drain
// (wa-observer/bridge.js) only sends `status='pending' AND flagged=false`, so a
// flagged message is HELD until a senior explicitly clears it
// (clearOutboxFlag). This is defense-in-depth ON TOP of the existing
// `approved_by NOT NULL` requirement and the `WA_SEND_ENABLED` kill-switch.
//
// Matching is intentionally broad/substring + case-insensitive: a false
// positive (a held message a human must release) is cheap; a false negative
// (bank details wired to a scammer prompt-injecting the AI) is not.

export const OUTBOUND_STOP_WORDS: readonly string[] = [
  // English — banking / payment rails
  "iban", "swift", "bic", "bank detail", "bank account", "account number",
  "account no", "routing number", "sort code", "card number", "cvv", "cvc",
  "wire transfer", "bank transfer", "money transfer", "western union",
  // English — risky commitments
  "refund", "loan", "installment plan", "deposit to", "send the deposit",
  "pay to this account", "transfer to",
  // Russian
  "реквизит", "айбан", "номер счёт", "номер счет", "банковск", "возврат средств",
  "вернём деньги", "вернем деньги", "займ", "кредит", "депозит переве", "переведите на",
  "перевести на счёт", "перевести на счет",
  // Arabic — bank / transfer / refund
  "آيبان", "تحويل بنكي", "حساب بنكي", "استرداد", "قرض",
];

export interface OutboundScreenResult {
  flagged: boolean;
  matched: string[];
}

/**
 * Scan an outbound message body for sensitive financial stop-words.
 * Returns `flagged=true` + the matched terms if any are present.
 * Pure + synchronous — safe to call inside an enqueue transaction.
 */
export function screenOutbound(body: string): OutboundScreenResult {
  const haystack = (body || "").toLowerCase();
  const matched = OUTBOUND_STOP_WORDS.filter((w) => haystack.includes(w));
  return { flagged: matched.length > 0, matched };
}
