// Phone / WhatsApp-JID normalization — the shared foundation for linking
// `message` rows to a `lead` (see modules/crm/chat-shared.ts,
// modules/crm/chat-actions.ts, modules/crm/chat-queries.ts).
//
// `message.from` for inbound WhatsApp is a Baileys JID:
//   "971501234567@s.whatsapp.net"  — normal, phone number is the local part
//   "184729384710293@lid"          — "linked device id", an OPAQUE id that
//                                     does NOT encode a real phone number
// `lead.phone` is free-text captured from Bitrix/Kaiten imports or manual
// entry: "+971 50 123 4567", "0501234567", "971-50-123-4567", etc.
//
// We never compare these as strings. We always reduce to digits-only, and
// (for cross-format matching) compare only the LAST N digits — see
// MIN_PHONE_MATCH_DIGITS — because the leading portion is the part most
// likely to disagree between formats (missing/extra country code "971" vs
// leading trunk "0" vs a bare local number).

/**
 * Strip everything but digits.
 *   "+971 50-123-4567"                 -> "971501234567"
 *   "971501234567@s.whatsapp.net"      -> "971501234567"
 *   "184729384710293@lid"              -> "184729384710293" (opaque — may
 *                                          NOT be a real phone number; callers
 *                                          MUST apply MIN_PHONE_MATCH_DIGITS
 *                                          + right-anchored comparison, never
 *                                          trust this in isolation)
 *   null / undefined / "" / junk       -> ""
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).replace(/\D/g, "");
}

/**
 * Minimum trailing-digit run required before two normalized numbers are
 * considered a match. Below this, a match is not trustworthy — too short to
 * be a real local+area portion of a phone number, and more likely to be a
 * coincidental substring of an opaque `@lid` id.
 */
export const MIN_PHONE_MATCH_DIGITS = 9;

/**
 * True if `a` and `b` share the same last MIN_PHONE_MATCH_DIGITS digits.
 * Right-anchored (not left, not full-string equality) so it tolerates the
 * most common real-world mismatch: a leading country-code / trunk-prefix
 * difference between how the lead's phone and the WhatsApp JID were
 * captured — e.g. lead.phone="0501234567" (local, trunk "0") and
 * from="971501234567@s.whatsapp.net" (E.164, no trunk) both normalize to a
 * "...501234567" suffix and correctly match.
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na.length < MIN_PHONE_MATCH_DIGITS || nb.length < MIN_PHONE_MATCH_DIGITS) return false;
  return na.slice(-MIN_PHONE_MATCH_DIGITS) === nb.slice(-MIN_PHONE_MATCH_DIGITS);
}

/**
 * Postgres equivalent of the JS `\D` character class (non-digit), meant to be
 * interpolated into a drizzle `sql` tagged template as a BOUND PARAMETER —
 * i.e. `sql`...${PG_NON_DIGIT_RE}...`` — never spliced directly into the
 * template's literal text as `'\D'`.
 *
 * Why: tagged-template "cooking" in JS silently eats the backslash out of an
 * escape sequence it doesn't recognize (`\D` is not a real JS string escape),
 * so a literal `'\D'` written inside a `sql`...`` template's own text becomes
 * `'D'` at runtime — silently turning `regexp_replace(x, '\D', '', 'g')` into
 * "strip literal letter D", not "strip all non-digits". Binding this constant
 * as a query parameter instead sidesteps template-cooking entirely, since
 * it's a normal JS string literal (`"\\D"` -> `\D`) evaluated outside any
 * template-literal text.
 */
export const PG_NON_DIGIT_RE = "\\D";

// ─── Outbound `to` resolution (the @lid problem) ────────────────────────────
//
// Observer OUTBOUND rows name the customer's remoteJid in `from` — for modern
// WhatsApp DMs a privacy JID ("184486545334403@lid") that does NOT encode the
// phone. The real phone lives in wa_identity (lid → phone, maintained by
// wa-observer/bridge.js on every inbound). These helpers are the one place
// that knows the difference; 35,039 outbound messages were dropped as
// noPerson before they existed (2026-08-22).

/** "<digits>@s.whatsapp.net" → the digits; ANYTHING else (incl. @lid) → null. */
export function phoneFromPhoneJid(jid: string | null | undefined): string | null {
  const m = /^(\d{5,15})@s\.whatsapp\.net$/.exec((jid ?? "").trim());
  return m ? m[1] : null;
}

/** True for a WhatsApp privacy JID ("<n>@lid") — an OPAQUE id, never a phone. */
export function isLidJid(jid: string | null | undefined): boolean {
  return /@lid$/.test((jid ?? "").trim());
}

/**
 * The customer phone behind an outbound row's `from` (remoteJid):
 * plain phone JID → its digits; @lid → wa_identity lookup; otherwise null
 * (caller keeps whatever fallback it had — the brand slug, a skip counter).
 */
export function resolveOutboundCustomerPhone(
  from: string | null | undefined,
  identityByLid: ReadonlyMap<string, string>
): string | null {
  const direct = phoneFromPhoneJid(from);
  if (direct) return direct;
  const jid = (from ?? "").trim();
  if (isLidJid(jid)) return identityByLid.get(jid) ?? null;
  return null;
}

/**
 * Backfill planner: the NEW value for an outbound row's `to`, or null when
 * the row needs no write (unresolvable lid, non-JID from, or already
 * correct). Keeping the equality check here means the fix script and its
 * tests can never drift apart on what "needs fixing" means.
 */
export function planOutboundToFix(
  row: { from: string | null; to: string | null },
  identityByLid: ReadonlyMap<string, string>
): string | null {
  const resolved = resolveOutboundCustomerPhone(row.from, identityByLid);
  if (!resolved) return null;
  return row.to === resolved ? null : resolved;
}
