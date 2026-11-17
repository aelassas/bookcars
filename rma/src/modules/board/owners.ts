/**
 * owners.ts — line → owning-manager routing config for The Board.
 *
 * Every board_item comes from a specific WhatsApp line (waobs session slug,
 * stored/derived as board_item.source_line). This map decides which manager
 * OWNS cards from each line and where SLA-breach escalations are sent.
 *
 * ── HOW TO FILL ─────────────────────────────────────────────────────────────
 * telegramChatId: the manager's personal Telegram chat id with the bot behind
 * TELEGRAM_BOT_TOKEN (same bot as driver-bot). To get it: have the manager
 * message the bot once, then read `chat.id` from getUpdates, or use @userinfobot.
 * Either hardcode it below or set the env override, which always wins:
 *     BOARD_TG_CHAT_AZAT=123456789            (key uppercased, "-" → "_")
 *     BOARD_TG_CHAT_CARDIWAN_MANAGER=...
 *
 * KEEP IN SYNC with the assigned_to backfill CASE in
 * drizzle/autonomous/0005_board_ownership.sql.
 *
 * The /lines page's add/edit actions write the overlay registry
 * (modules/messaging/lines-overlay.ts): resolveOwnerForLine consults it fresh
 * on every call (overlay wins when it carries a complete owner pair, but can
 * never remove an owner), and the exported maps below merge it at module load.
 */

import { overlayOwners, overlayPhones } from "../messaging/lines-overlay";

export type BrandOwner = {
  /** Stable key persisted into board_item.assigned_to. */
  key: string;
  /** Display name shown on the Board UI. */
  name: string;
  /** Telegram chat id for escalation nudges. null = escalation skipped for this owner. */
  telegramChatId: string | null;
};

/** WhatsApp line slug (waobs session) → owning manager. Static base map —
 *  the page-managed overlay merges over it (see below). */
const STATIC_BRAND_OWNERS: Record<string, BrandOwner> = {
  "azat-takeauto":         { key: "azat",             name: "Azat (TAKE Auto)",     telegramChatId: null }, // TODO: fill Azat's Telegram chat id
  "firuz-takeauto":        { key: "firuz",            name: "Firuz (TAKE Auto)",    telegramChatId: null }, // paired 2026-07-24
  "mohammed-takeauto":     { key: "mohammed",         name: "Mohammed (TAKE Auto)", telegramChatId: null }, // TODO: fill Mohammed's Telegram chat id
  // ── EasyRent lines. The slug names neither the brand NOR the person. Who is
  // behind each one was settled 2026-08-05 by reading how the line introduces
  // itself to customers, and how customers address it back — the only evidence
  // that survives a re-pairing, because a phone can change hands but the human
  // typing keeps signing their own name.
  "babek-rent":            { key: "babek",            name: "Babek (EasyRent)",     telegramChatId: null }, // 971529965085 · "This is Babek, from EasyRent" ×3
  // NOT Babek, despite the slug: "Hi sir, this is Ali from Easy Rent" ×16 in
  // 30 days against ONE stray Babek. This is Ali's working line and the busiest
  // rent line there is — mis-assigning it sent every one of Ali's cards and SLA
  // escalations to Babek, and left Ali's own day looking empty.
  "babek-rent-2":          { key: "ali",              name: "Ali (Cardiwan)",       telegramChatId: null }, // 971542445835 (was 971564048816 until that session died, re-paired 2026-08-29 by phone-code). Owner 2026-08-31: "Ali is CARDIWAN, he is not easyrent".
  "babek-rent-3":          { key: "babek",            name: "Babek (EasyRent)",     telegramChatId: null }, // 971585809747 · customers write "Hi babek", "Here you go babek brother"
  // babek-rent-4 documented Ali's phone 971542445835; that handset now pairs as
  // babek-rent-2 (2026-08-29), so this slug stays only for its historic rows.
  "babek-rent-4":          { key: "ali",              name: "Ali (Rent)",           telegramChatId: null },
  "cardiwan":              { key: "abdullah",         name: "Abdullah (Cardiwan)",  telegramChatId: null }, // 971569808087 · "This is Abdullah from Cardiwan Car Rental" ×10
  // Rental MANAGER's own line, paired 2026-08-26 on the restructure. His work
  // number, not the personal one (971581417020) the digests were keyed on.
  // Ayham manages Babek / Ali / Abdullah, but their lines keep THEIR owners:
  // ownership here decides whose board a card lands on and who gets the SLA
  // nudge, and pointing four lines at one manager is exactly the mistake that
  // emptied Ali's day when babek-rent-2 was mis-assigned. He reads the whole
  // rental workspace in Twenty already (ayham@rental.ae).
  "ayham-rent":            { key: "ayham",            name: "Ayham (Rental Manager)", telegramChatId: null }, // 971542445836
  // Paired 2026-08-26 by PAIRING CODE, not a QR — he was away and read the
  // code back over a call. Profile "Easy Rent A Car" put him on easyrent.
  "mohamed-etm":           { key: "mohamed-elmougrabi", name: "Mohamed ELMOUGRABI (EasyRent)", telegramChatId: null }, // 971542445832
  // 971564048816 — the ETM WEBSITE line (wa.me on etmluxurycarrental.com).
  // Answered by Babek today ("I'm Babek", Ahmad Judeh chat 2026-09-07), so his
  // board and his SLA nudges. Was babek-rent-2's number until Aug 2026.
  "etm-website":           { key: "babek",            name: "Babek (EasyRent)",     telegramChatId: null },
  // RETIRED 2026-08-05 (owner): "abdullah-takeauto" and "easyrent" — stale second
  // pairings of the two phones already listed above. Cards that still carry those
  // source_lines keep their owner; scripts/fix-board-owners.ts warns about any
  // line that has cards but no entry here, so a retired slug can never go quiet.
  "takeauto-leasing-dept": { key: "leasing-manager",  name: "Leasing Dept Manager", telegramChatId: null }, // TODO: who owns the leasing line? fill name + chat id
  // Meta webhooks (Instagram DM / Messenger) route to the same sales desk as
  // the leasing line — mapped 2026-09-15, BEFORE the webhook went live, so a
  // card from these channels is never born unowned.
  "ig-takeauto":           { key: "leasing-manager",  name: "Leasing Dept Manager", telegramChatId: null }, // Instagram DM
  "fb-takeauto":           { key: "leasing-manager",  name: "Leasing Dept Manager", telegramChatId: null }, // Facebook Messenger
  "takeauto-meta-main":    { key: "leasing-manager",  name: "Leasing Dept Manager", telegramChatId: null }, // WhatsApp Cloud API 971505375594
  // RMA Car Rental, Dubai. The dedicated business line 971581965238 keeps
  // the original rma-main slug so its history and routing stay attached.
  "rma-main":              { key: "ruslan",           name: "Ruslan (RMA)",         telegramChatId: null },
};

/** Overlay owner entries as full BrandOwner records (telegramChatId carries
 *  over from the static entry when overriding one). */
function overlayBrandOwners(): Record<string, BrandOwner> {
  const out: Record<string, BrandOwner> = {};
  for (const [slug, o] of Object.entries(overlayOwners())) {
    out[slug] = { key: o.key, name: o.name, telegramChatId: STATIC_BRAND_OWNERS[slug]?.telegramChatId ?? null };
  }
  return out;
}

/** Effective owner map: static base + page-managed overlay merged on top at
 *  module load (overlay wins a complete owner pair; it can never delete one).
 *  resolveOwnerForLine re-reads the overlay fresh — prefer it in long-running
 *  processes. */
export const BRAND_OWNERS: Record<string, BrandOwner> = { ...STATIC_BRAND_OWNERS, ...overlayBrandOwners() };

// ── Sales desk (SALES Twenty instance, "default" only) ─────────────────────
//
// The leasing restructure (client, 2026-09): every NEW lead card on the sales
// board is owned by one of the two "primary processing" agents, round-robin —
// they qualify and hand over to the closers. The wa-lead relay assigns from
// SALES_PRIMARY_POOL on creation (cursor persisted in twenty_mirror_state, see
// wa-lead-relay.ts); the sales-automations handover normalizer moves the card
// off the girls' board once a salesStage is set or a closer owns it.
//
// These are Twenty workspaceMember ids on the SALES workspace (:3001) — NOT
// rental, NOT platform user ids. The rental instance must never see them.

export type SalesDeskMember = {
  /** Twenty workspaceMember id (sales workspace). */
  id: string;
  name: string;
  email: string;
  /** Full phone digits ("" = not on file → Telegram DM unresolvable). */
  phone: string;
};

/** Primary-processing pool, in round-robin rotation order. */
export const SALES_PRIMARY_POOL: readonly SalesDeskMember[] = [
  { id: "fa7be172-60c9-4b54-a7ad-336e89cf2b1e", name: "Bayan", email: "bayan@takeauto.ae", phone: "" },
  { id: "78988abe-2295-49dc-aabc-696116d7436f", name: "Maria", email: "maria@takeauto.ae", phone: "" },
];

export const SALES_PRIMARY_IDS: ReadonlySet<string> = new Set(SALES_PRIMARY_POOL.map((m) => m.id));

/**
 * The closers (the guys' board). When a client writes on a card one of them
 * owns, the relay pings the owner on Telegram (throttled per card). Phones are
 * the personal numbers from the platform `user` table — the same source as
 * OWNER_PHONES in scripts/run-sales-automations.ts; the chat_id resolves
 * through telegram_link at runtime (Azat is the only one linked today).
 */
export const SALES_CLOSERS: readonly SalesDeskMember[] = [
  { id: "f78d1e10-0be5-4d5f-b0c7-ec461a41cc5c", name: "Moe", email: "moe@takeauto.ae", phone: "" },
  { id: "99ff77c1-ef28-4aca-bf99-8f08a47c5a61", name: "Firuz", email: "firuz@takeauto.ae", phone: "971509082870" },
  { id: "5378507f-32fd-4f41-a6f0-8e48473206c9", name: "Azat", email: "azat@takeauto.ae", phone: "97143742002" },
];

export const SALES_CLOSER_IDS: ReadonlySet<string> = new Set(SALES_CLOSERS.map((m) => m.id));

/** Resolve the owning manager for a WhatsApp line slug (null-safe). The
 *  overlay registry is re-read on every call, so an owner edited on /lines
 *  takes effect without a restart. */
export function resolveOwnerForLine(line: string | null | undefined): BrandOwner | null {
  if (!line) return null;
  return overlayBrandOwners()[line] ?? STATIC_BRAND_OWNERS[line] ?? null;
}

/** Every line slug owned by a key (a person can own several paired lines). */
export function linesForOwnerKey(key: string): string[] {
  return Object.entries(BRAND_OWNERS)
    .filter(([, o]) => o.key === key)
    .map(([slug]) => slug);
}

/** Reverse lookup: owner key ('azat') → owner record, for display + escalation. */
export function resolveOwnerByKey(key: string | null | undefined): BrandOwner | null {
  if (!key) return null;
  for (const owner of Object.values(BRAND_OWNERS)) {
    if (owner.key === key) return owner;
  }
  return null;
}

/**
 * Effective Telegram chat id for an owner: env override BOARD_TG_CHAT_<KEY>
 * (key uppercased, '-' → '_') wins over the hardcoded value.
 */
export function ownerTelegramChatId(owner: BrandOwner): string | null {
  const envKey = `BOARD_TG_CHAT_${owner.key.toUpperCase().replace(/-/g, "_")}`;
  const fromEnv = process.env[envKey]?.trim();
  return fromEnv || owner.telegramChatId;
}

/** Human-readable label for an assigned_to value (owner key or raw email/id). */
export function assigneeLabel(assignedTo: string | null | undefined): string | null {
  if (!assignedTo) return null;
  return resolveOwnerByKey(assignedTo)?.name ?? assignedTo;
}

/** Our own WhatsApp line phone numbers (digits) → line slug, for resolving the
 *  officer behind an OUTBOUND message whose row carries no line slug
 *  (push-message outbound rows often store the customer's digits in `to` and
 *  our number's JID in `from`). Kept in sync with lines.ts comments. */
export const LINE_PHONES: Record<string, string> = {
  "971529965085": "babek-rent",
  "971542445835": "babek-rent-2", // Ali — re-paired onto this handset 2026-08-29
  "971585809747": "babek-rent-3",
  "971569808087": "cardiwan",
  "971542445836": "ayham-rent",
  "971542445832": "mohamed-etm",
  "971564048816": "etm-website",
  "97143742002": "azat-takeauto",
  "971509082870": "firuz-takeauto",
  "97143742003": "mohammed-takeauto",
  "971567235539": "takeauto-leasing-dept",
  "971505375594": "takeauto-meta-main", // WhatsApp Cloud API line on WABA 495592020296971
  "971581965238": "rma-main",           // Dedicated RMA business WhatsApp line
};

/** Effective phone → slug map: overlay entries merged UNDER the static map —
 *  a static mapping always wins a collision, so a page edit can never steal a
 *  number from a paired line (that is the duplicate-session failure mode). */
function effectiveLinePhones(): Record<string, string> {
  const out = { ...LINE_PHONES };
  for (const [phone, slug] of Object.entries(overlayPhones())) {
    if (!Object.hasOwn(out, phone)) out[phone] = slug;
  }
  return out;
}

/** Officer owning one of OUR phone numbers (digits or JID), null when unknown.
 *  Re-reads the overlay registry on every call. */
export function resolveOwnerForPhone(raw: string | null | undefined): BrandOwner | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  for (const [phone, slug] of Object.entries(effectiveLinePhones())) {
    if (digits === phone || digits.endsWith(phone)) return resolveOwnerForLine(slug);
  }
  return null;
}
