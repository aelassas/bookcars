// GROUP-CARD PURGE — the selection rule for scripts/purge-group-cards.ts.
//
// Owner 2026-08-13 (overrides the earlier spec): WhatsApp/Telegram GROUPS
// must not create cards in Twenty — group chatter is market noise; the CRM
// shows direct customers and calls only. The ONE named exception is the
// Yango Telegram group, a real lead channel whose bookings stay.
//
// Pure and exported so the harness can matrix it.

/**
 * True = soft-delete this card. The rule, exactly:
 *   - `b2b-demand:*` externalId → DELETE, no exception (demand is routed by
 *     the manager hint DM now, never by a card);
 *   - `wa-lead:*` AND the callSource marks a GROUP (contains "@g.us" or
 *     starts with "WhatsApp group" / "WA group" / "Telegram:") AND the source
 *     is not Yango → DELETE;
 *   - everything else (direct-WA cards, callgear call cards, mirror cards)
 *     → NEVER touched.
 */
export function isGroupCardPurgeCandidate(rec: {
  externalId?: unknown;
  callSource?: unknown;
}): boolean {
  const ext = typeof rec.externalId === "string" ? rec.externalId : "";
  const src = typeof rec.callSource === "string" ? rec.callSource : "";
  if (ext.startsWith("b2b-demand:")) return true;
  if (!ext.startsWith("wa-lead:")) return false;
  if (/yango/i.test(src)) return false; // the one named exception
  return src.includes("@g.us") || /^(WhatsApp group|WA group|Telegram:)/.test(src);
}
