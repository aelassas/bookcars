// Phone matching for chat<->CRM stitching. One rule everywhere: the match key
// is the LAST 9 DIGITS of the number. UAE mobiles are 9 significant digits
// (5xxxxxxxx), which survives +971 / 971 / 0-prefix / spacing / JID suffixes.
// The SQL twin of phoneKey() lives in migration 0052's expression indexes and
// in pulse/stitch queries: right(regexp_replace(x,'\D','','g'), 9) — the two
// MUST stay in lockstep.

/** Digits only. "" for null/undefined. */
export function normalizeDigits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Canonical match key: last 9 digits. Null when the input can't identify a
 * subscriber: group JIDs (@g.us), empty, or fewer than 8 digits.
 */
export function phoneKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.includes("@g.us")) return null;
  const digits = normalizeDigits(raw);
  if (digits.length < 8) return null;
  return digits.slice(-9);
}
