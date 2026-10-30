/**
 * lead-from-whatsapp.ts — turn a stranger's first WhatsApp message into a lead.
 *
 * WHY THIS EXISTS: Bitrix is being switched off for cost. Measured 2026-08-07,
 * 25,361 of 25,387 leads were born in Bitrix and 26 were born here; not one
 * deal has ever been created outside it. Bitrix is not the CRM we are
 * replacing — it is the switchboard, and its single biggest intake channel is
 * WhatsApp through its own open lines (33% of leads). Our observers already
 * receive that same traffic. The step that was missing is this one: the moment
 * a number we do not know asks for a car, somebody must have a lead to work.
 *
 * This module is deliberately pure — no DB, no clock, no network — so the
 * judgement calls below are testable and cannot drift into a runner script.
 */
import { normalizePhone, MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";
import { isBroadcast } from "@/modules/messaging/competitor";

/** Marks both `lead.source` and `lead.external_source` for WhatsApp-born leads. */
export const WA_LEAD_SOURCE = "whatsapp";

/**
 * Another rental shop asking for a car. Sub-rental between shops is real
 * revenue in this market, so these are NOT discarded — they are labelled, so a
 * desk can work them or filter them out deliberately rather than us deciding
 * silently on their behalf.
 */
export const WA_B2B_LEAD_SOURCE = "whatsapp-b2b";

/** A bot answering us, not a person asking for something. */
const AUTO_REPLY = /(thank you for contacting|thanks for contacting|we will get back to you|our team will contact you|this is an automated)/i;

/** Trading names: the sender is a company, not a walk-in customer. */
const BUSINESS_NAME = /(rent[ -]?a[ -]?car|car ?rental|rentals?\b|motors|luxury cars|\bllc\b|investments)/i;

/**
 * The upsert key. The Twenty mirror pages leads by `external_id` and skips
 * NULLs outright, so a lead without one never reaches the desk. Keyed on the
 * phone (not the message) so a person who writes five times is one lead, and
 * so the key is stable across the JID spellings WhatsApp uses for one human.
 */
export function waLeadExternalId(phoneDigits: string): string {
  // Keyed on the LAST 9 digits — the repo-wide phone identity (see
  // MIN_PHONE_MATCH_DIGITS and Postgres' lead_phone_key_idx). One human writes
  // as 971501234567 and as 00971501234567 depending on how the JID was
  // captured; both must land on one lead, not two.
  return `wa:${normalizePhone(phoneDigits).slice(-MIN_PHONE_MATCH_DIGITS)}`;
}

export type InboundMessage = {
  id: string;
  tenantId: string;
  direction: "inbound" | "outbound" | string;
  channel: string;
  /** Raw JID: 9715…@s.whatsapp.net, …@lid, …@g.us, status@broadcast. */
  from: string | null;
  /** Real phone when the JID hides it (@lid). */
  fromPn: string | null;
  /** Observer line slug the message arrived on. */
  to: string | null;
  customerName: string | null;
  body: string | null;
  createdAt: Date;
};

export type NewLead = {
  tenantId: string;
  externalId: string;
  externalSource: string;
  source: string;
  customerName: string;
  phone: string;
  notes: string;
  createdAt: Date;
  /** The message that produced it, for stitching the conversation afterwards. */
  messageId: string;
};

/** A body that carries no information for a salesperson. */
function isEmptyForHumans(body: string | null): boolean {
  const t = (body ?? "").trim();
  if (!t) return true;
  // "[image]", "[document]", "[voice/audio]" — placeholders the importer writes
  // for media. On their own they say nothing; the follow-up text will.
  return /^\[[^\]]+\]$/.test(t);
}

export type LeadRules = {
  /** Our own line numbers — staff coordinating is not demand. */
  ownNumbers?: Set<string>;
};

/**
 * The bar a WhatsApp message must clear to become a LEAD rather than stay a
 * message (owner, 2026-08-10: «only if there is a contact person to reach and
 * an idea of what he wants — otherwise it is a pointless shoutout into
 * darkness»).
 *
 * Two conditions, both machine-checkable, neither guessed:
 *
 *   REACHABLE — a real phone. Without one nobody can call back and the lead
 *   cannot be deduped or matched to a customer; @lid traffic with no number
 *   behind it stays a message until a phone appears.
 *
 *   WANTED SOMETHING — the classifier pulled at least one of car / intent /
 *   term / budget out of what they wrote. Deliberately the machine's reading
 *   rather than a keyword guess: if nothing could be extracted there is
 *   nothing for a salesperson to act on, and a card saying only "someone
 *   wrote" is worse than no card — it costs attention and returns nothing.
 *
 * A rejected message is NOT lost: the watcher still pings the manager and the
 * conversation sits in the chat. Only the board stays clean.
 */
export type DemandSignals = {
  car?: string | null;
  intent?: string | null;
  termMonths?: number | null;
  priceAed?: number | null;
  /**
   * A marketplace enquiry against one of OUR listings (see lead-origin.ts).
   * It satisfies both halves of the bar on its own: the listing names the car
   * they asked about, and — for the notification shape, which never carries a
   * phone — the listing's own chat is how they are reached. Dropping these
   * for want of a phone would throw away the very leads we pay to advertise
   * for; measured 2026-08-09, 87% of them already evaporated.
   */
  marketplaceListingUrl?: string | null;
};

const hasSignal = (v: unknown): boolean =>
  typeof v === "string" ? v.trim().length > 0 : typeof v === "number" ? Number.isFinite(v) && v > 0 : false;

export function qualifiesAsLead(phoneDigits: string, demand: DemandSignals): boolean {
  if (hasSignal(demand.marketplaceListingUrl)) return true;
  if (normalizePhone(phoneDigits).length < MIN_PHONE_MATCH_DIGITS) return false;
  return hasSignal(demand.car) || hasSignal(demand.intent) || hasSignal(demand.termMonths) || hasSignal(demand.priceAed);
}

/**
 * The SAME bar without the REACHABLE-phone half — for phone-less channels
 * (Instagram DM / Facebook Messenger), where the sender's scoped id IS the
 * reachable identity: the relay keys the card `ig-lead:<tenant>:<scopedId>`,
 * so a later message from the same account attaches to the same card and the
 * conversation itself is the call-back channel. Requiring 9 digits there
 * would file every genuine DM as noise.
 *
 * WANTED SOMETHING is unchanged: car / intent / term / budget, or a
 * marketplace listing.
 */
export function qualifiesAsLeadPhoneless(demand: DemandSignals): boolean {
  if (hasSignal(demand.marketplaceListingUrl)) return true;
  return hasSignal(demand.car) || hasSignal(demand.intent) || hasSignal(demand.termMonths) || hasSignal(demand.priceAed);
}

/**
 * Decide whether this message should become a lead, and build the row.
 * Returns null whenever the answer is "not a customer we can act on".
 *
 * Every refusal below is a real thing seen in this traffic, not a hypothetical.
 */
export function leadFromMessage(m: InboundMessage, rules: LeadRules = {}): NewLead | null {
  if (m.direction !== "inbound") return null;              // our own reply
  if (m.channel !== "whatsapp") return null;

  const jid = m.from ?? "";
  if (jid.endsWith("@g.us")) return null;                  // supplier/team group
  if (jid.includes("broadcast")) return null;              // status posts, blasts

  // A lead with no reachable number can never be deduped, called back or
  // matched to a customer. Roughly half of WhatsApp traffic arrives as @lid
  // with no phone behind it; those stay messages until a phone appears.
  //
  // @lid ids are long digit strings, so they pass a naive length check and
  // would masquerade as phone numbers — the JID form has to be refused
  // explicitly, not filtered by shape.
  const raw = m.fromPn?.trim() ? m.fromPn : jid.endsWith("@lid") ? null : jid;
  const digits = normalizePhone(raw);
  if (digits.length < MIN_PHONE_MATCH_DIGITS) return null;

  // Compare on the same tail the rest of the system keys by, so a staff line
  // written with or without its country code is still recognised as ours.
  const tail = digits.slice(-MIN_PHONE_MATCH_DIGITS);
  for (const own of rules.ownNumbers ?? []) {
    if (normalizePhone(own).slice(-MIN_PHONE_MATCH_DIGITS) === tail) return null;
  }

  if (isEmptyForHumans(m.body)) return null;

  const body = (m.body ?? "").trim();
  // Their bot replying to our outreach is our own message bouncing back.
  if (AUTO_REPLY.test(body)) return null;
  // The daily "available cars" list every shop blasts into the same chats.
  if (isBroadcast(body)) return null;

  const name = m.customerName?.trim();
  const isBusiness = BUSINESS_NAME.test(name ?? "") || BUSINESS_NAME.test(body);
  return {
    tenantId: m.tenantId,
    externalId: waLeadExternalId(digits),
    externalSource: WA_LEAD_SOURCE,
    source: isBusiness ? WA_B2B_LEAD_SOURCE : WA_LEAD_SOURCE,
    // WhatsApp push names are often absent. The number is a worse label than a
    // name but a far better one than "Unknown" — it is what the desk searches by.
    customerName: name || `+${digits}`,
    phone: digits,
    notes: (m.body ?? "").trim().slice(0, 500),
    createdAt: m.createdAt,
    messageId: m.id,
  };
}
