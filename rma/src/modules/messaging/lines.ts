// WhatsApp observer LINES → business tenant. Single source of truth.
//
// The owner NAMES every line at QR-pairing time (observer BRAND slug → it
// rides in every JSONL row and in message.external_message_id as
// `waobs:<line>:…`). **The slug is a label typed once and never corrected —
// it is NOT the business.** The paired device is: every row below was read on
// 2026-08-05 off `wa-observer/session-<line>/creds.json` (phone + WhatsApp
// profile name) and cross-checked against how the line signs itself in its own
// chats. Where the two disagree, the device wins. Locked by lines.test.ts.
//
// The rental side is TWO companies: Cardiwan, and ETM trading as EasyRent
// (see commit 89b208b) — so "etm" is never a tenant here.
//
// New line paired? Read its creds.json, add ONE row here, and add a case to
// lines.test.ts — or add it from the /lines page, which writes the overlay
// registry (modules/messaging/lines-overlay.ts, wa-observer/lines-registry.json)
// merged over this map at read time. Unknown lines fall back to take-auto with
// a console warning at import time — which silently dumps a rent chat on the
// sales desk, so never leave a live line out of the map AND the overlay.
import { overlayTenants } from "./lines-overlay";

const STATIC_LINE_TENANT: Record<string, string> = {
  // ── EasyRent (ETM) — Babek's three phones. The "babek-rent*" slugs name the
  // PERSON, not the brand; all three profiles read "EasyRent…".
  "babek-rent": "easyrent",   // 971529965085 "EasyRent Luxury Car Rental"
  "babek-rent-2": "easyrent", // Ali's line. Was 971564048816 ("Easy Rent car
                              // rental") until that session died; re-paired
                              // 2026-08-29 by phone-code onto 971542445835 — the
                              // same handset babek-rent-4 documented. Slug kept so
                              // owner routing (Ali) and history stay attached.
  "babek-rent-3": "easyrent", // 971585809747 "EasyRent Car Rental"
  // ── Cardiwan
  "babek-rent-4": "cardiwan", // RETIRED in practice 2026-08-29: its phone
                              // (971542445835, Ali) now pairs as babek-rent-2.
                              // Kept mapped so its historic rows stay filed right.
  "cardiwan": "cardiwan",     // 971569808087 "Abdullah cardiwan"
  // ── Rental restructure, paired 2026-08-26 (all creds were lost when the
  // 15-God pm2 incident's cleanup truncated every creds.json to 0 bytes).
  "ayham-rent": "cardiwan",   // 971542445836 Ayham, rental MANAGER. Profile
                              // reads "Cardiwan Car Rental" — that is the only
                              // hard evidence, so the slug follows it.
  // Mohamed ELMOUGRABI, 971542445832. The owner said "ETM CARDIWAN" — both
  // desks at once, the same contradiction babek-rent-4 sits in — so this sat
  // on cardiwan for ten minutes until the line linked and settled it: the
  // WhatsApp Business profile reads "Easy Rent A Car". Profile beats hearsay,
  // and it was corrected before the importer had filed a single row.
  "mohamed-etm": "easyrent",
  // 971564048816 — the wa.me number on etmluxurycarrental.com, so every website
  // lead lands here. Answered by Babek ("I'm Babek", 2026-09-07). This NUMBER
  // used to pair as babek-rent-2 until that session died (2026-08) and the
  // handset moved to 971542445835; re-paired 2026-09-07 under its own slug
  // because a number and a slug are no longer the same thing.
  "etm-website": "easyrent",
  // RETIRED 2026-08-05 (owner): "abdullah-takeauto" and "easyrent" were stale
  // SECOND pairings of phones already covered above — 971569808087 (Abdullah)
  // and 971542445835 (Ali). Neither had captured anything since Jul 16 / Jul 11.
  // Their observed-*.jsonl and session dirs are retired on the box; their
  // history stays in the DB under cardiwan, where it already sits.
  // Do NOT re-add a slug here without retiring its jsonl first: an unmapped
  // line falls through to take-auto, and the importer would re-file the whole
  // archive into the sales desk as brand-new rows.
  // ── TAKE Auto lease & sale
  "azat-takeauto": "take-auto",         // 97143742002 "Take Auto"
  "firuz-takeauto": "take-auto",        // 971509082870, paired 2026-07-24
  "mohammed-takeauto": "take-auto",     // 97143742003 — number banned 2026-08, line dark
  "takeauto-leasing-dept": "take-auto", // 971567235539, also the notify sender line
  // ── Meta webhooks (2026-09-15) — not WhatsApp lines, but they ride the
  // same slug → tenant → owner machinery. Mapped BEFORE the first webhook
  // subscription is verified, per the standing rule: an unmapped slug falls
  // through to the default tenant and re-files history onto the wrong desk.
  "ig-takeauto": "take-auto", // Instagram DM account (Meta app webhook)
  "fb-takeauto": "take-auto", // Facebook Messenger page inbox (same Meta app)
  // WhatsApp Cloud API line: 971505375594 on WABA 495592020296971
  // (phone_number_id 475692462294687). The main line 971567235539 stays on the
  // Baileys observer until it can be moved off WABA 3003654496655900, which
  // this Meta account cannot access (2026-09-23).
  "takeauto-meta-main": "take-auto",
  // ── RMA Car Rental (Dubai) — self-hosted on Hostinger, deployment "RMA CRM".
  // 971553590533 is Ruslan Anyanov's handset for the pilot; per his 27.10
  // message a dedicated RMA business number will replace it later and the
  // slug stays. Pre-registered so Ruslan can open /lines and pair without an
  // operator editing the overlay first.
  "rma-main": "rma",
};

export const DEFAULT_LINE_TENANT = "take-auto";

/**
 * Static map merged with the page-managed overlay (overlay can only ADD slugs
 * — a static tenant is immutable, so static wins every collision). Merged once
 * at module load for iteration consumers; tenantSlugForLine re-reads the
 * overlay on every call so a line added from /lines is mapped in long-running
 * processes within a second, without a restart.
 */
export const LINE_TENANT: Record<string, string> = { ...overlayTenants(), ...STATIC_LINE_TENANT };

/** Tenant slug for an observer line; unknown lines → take-auto. */
export function tenantSlugForLine(line: string | null | undefined): string {
  if (!line) return DEFAULT_LINE_TENANT;
  return STATIC_LINE_TENANT[line] ?? overlayTenants()[line] ?? DEFAULT_LINE_TENANT;
}

/** True when the line is mapped — statically or in the overlay. The importer's
 *  "unmapped line" warning keys off this, not the frozen module-load map. */
export function isMappedLine(line: string | null | undefined): boolean {
  if (!line) return false;
  return Object.hasOwn(STATIC_LINE_TENANT, line) || Object.hasOwn(overlayTenants(), line);
}
