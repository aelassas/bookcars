/**
 * deal-link.ts — how a WhatsApp conversation finds the DEAL it belongs to.
 *
 * Babek, 2026-08-07: «Открываю сделку — истории нет. Есть created, updated,
 * owner. И всё.» He was right, and the reason was structural: every one of the
 * 1,536 notes the projector had written carried a `targetPersonId` and nothing
 * else, so the conversation existed in Twenty but hung off the person, never
 * off the opportunity the rent desk actually opens.
 *
 * ── THE JOIN, AND WHY IT IS THE TITLE ───────────────────────────────────────
 * `opportunity.phoneTail9` is the intended key and it was empty on all 1,099
 * rental deals, because nothing ever wrote it: the deals branch of the mirror
 * never set it, and there was nothing to set it FROM — `deal.lead_id` is NULL
 * for all 96,137 mirrored deals (measured 2026-08-07), so a deal has no
 * reachable contact row at all. What a rental deal DOES carry is a phone
 * inside its Bitrix title:
 *
 *   "Новый лид по звонку с 971502222073 из Callgear"
 *   "Гость - 971566997218 Insta Easy Rent"
 *
 * 755 of 1,044 EasyRent deals and 169 of 1,944 Cardiwan deals have one. The
 * mirror now writes that tail into phoneTail9 (see planMirrorRecord); this
 * module reads phoneTail9 first and falls back to the title, so the link works
 * on deals the mirror has not re-touched yet and keeps working after it has.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────
 * It never creates an opportunity. A conversation with no matching deal stays
 * attached to its person exactly as before — 70-80% of inbound WhatsApp comes
 * from numbers nobody has ever entered anywhere, and inventing a deal for each
 * would bury the real pipeline under strangers.
 */

import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import type { TwentyClient } from "./client";
import { CLOSED_STAGES } from "./stages";

/**
 * The customer's number as it survives inside a Bitrix deal TITLE — the only
 * place a rental deal carries one (see the phoneTail9 note in the deals
 * branch of planMirrorRecord). Live titles look like:
 *
 *   "Новый лид по звонку с 971502222073 из Callgear"
 *   "Пропущенный лид по звонку с 97455819604 из Callgear"
 *   "Гость - 971566997218 Insta Easy Rent"
 *
 * Minimum 9 digits, so the widget/queue numbers that also appear in titles
 * ("Открытая линия 8816", "Insta Easy Rent") cannot be mistaken for a client.
 * The result still goes through normalizePhone, which refuses placeholders —
 * this function only decides WHICH substring to offer it.
 */
export function phoneFromDealTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = /(?<!\d)(\+?\d{9,15})(?!\d)/.exec(title);
  return m ? m[1] : null;
}


export interface OpportunityMatch {
  id: string;
  /** False when the deal is in a won/cancelled stage. */
  open: boolean;
  updatedAt: number;
}

/**
 * tail9 → the deal a conversation with that number should be filed under.
 *
 * Built ONCE per run, like the people index — a REST lookup per message would
 * blow the 100 req/min workspace budget on the first backlog.
 *
 * Selection rule when a number has several deals (repeat customers do): an
 * OPEN deal always beats a closed one, and among equals the most recently
 * updated wins. Filing today's message under a deal that was cancelled last
 * year is worse than filing it under the live one; filing it under a closed
 * deal when that is all that exists is still better than dropping it.
 */
export function buildOpportunityPhoneIndex(
  records: Iterable<Record<string, unknown>>,
  /**
   * Restrict to ONE brand. Cardiwan and EasyRent share this workspace and
   * share phone numbers with it: without scoping, an EasyRent customer's
   * WhatsApp would be filed onto a Cardiwan deal because the same human is a
   * client of both. Undefined = no scoping (tests, single-brand instances).
   */
  brandLine?: string | null
): Map<string, OpportunityMatch> {
  const byTail = new Map<string, OpportunityMatch>();
  for (const rec of records) {
    // Soft-deleted records stay readable through the API — filing a live
    // conversation into the trash helps nobody.
    if (rec.deletedAt) continue;
    const id = typeof rec.id === "string" ? rec.id : null;
    if (!id) continue;
    if (brandLine !== undefined && rec.brandLine !== brandLine) continue;

    const stored = typeof rec.phoneTail9 === "string" ? rec.phoneTail9 : "";
    const digits =
      stored.length >= MIN_PHONE_MATCH_DIGITS
        ? stored
        : normalizePhone(phoneFromDealTitle(typeof rec.name === "string" ? rec.name : null));
    if (digits.length < MIN_PHONE_MATCH_DIGITS) continue;
    const tail = digits.slice(-MIN_PHONE_MATCH_DIGITS);

    const stage = typeof rec.stage === "string" ? rec.stage : null;
    const candidate: OpportunityMatch = {
      id,
      open: !stage || !CLOSED_STAGES.has(stage),
      updatedAt: Date.parse(typeof rec.updatedAt === "string" ? rec.updatedAt : "") || 0,
    };
    const current = byTail.get(tail);
    if (!current || beats(candidate, current)) byTail.set(tail, candidate);
  }
  return byTail;
}

function beats(a: OpportunityMatch, b: OpportunityMatch): boolean {
  if (a.open !== b.open) return a.open;
  return a.updatedAt > b.updatedAt;
}

/**
 * Same index, read straight off the live workspace by CRAWLING every
 * opportunity. Correct, and affordable only where the book is small — 1,099
 * deals on rental is ~19 requests. Do NOT use it on the sales instance: 78,917
 * deals is ~1,315 requests, which at Twenty's 100 req/min ceiling is 13
 * minutes added to every pass.
 *
 * Use it for one-off backfills that need every deal anyway; the projector,
 * which runs on the minute beat, uses fetchOpportunitiesForTails instead.
 */
export async function fetchOpportunityPhoneIndex(
  client: TwentyClient,
  brandLine?: string | null
): Promise<Map<string, OpportunityMatch>> {
  const records: Record<string, unknown>[] = [];
  for await (const rec of client.listAll<Record<string, unknown>>("opportunities")) {
    records.push(rec);
  }
  return buildOpportunityPhoneIndex(records, brandLine);
}

/** Values per `[in]` list — keeps the request URL well inside any limit. */
const TAIL_CHUNK = 50;

/**
 * The index for JUST the numbers in this batch, fetched with a server-side
 * filter instead of a full crawl.
 *
 * A projector pass reads at most 200 messages, so this is ~4 requests against
 * ~1,315 for the sales book. It relies on `phoneTail9` being POPULATED on the
 * deal — a filter cannot express the deal-title fallback — which is why the
 * mirror writes it and why both workspaces were backfilled from their titles
 * on 2026-08-07. A deal with no tail is simply not found, which is the same
 * outcome as having no deal: the note still lands on the person.
 */
export async function fetchOpportunitiesForTails(
  client: TwentyClient,
  tails: Iterable<string>,
  brandLine?: string | null
): Promise<Map<string, OpportunityMatch>> {
  const wanted = [...new Set(tails)].filter((t) => t.length >= MIN_PHONE_MATCH_DIGITS);
  const records: Record<string, unknown>[] = [];
  for (let i = 0; i < wanted.length; i += TAIL_CHUNK) {
    const chunk = wanted.slice(i, i + TAIL_CHUNK);
    // listAll, not a single get: a repeat customer has several deals, so 50
    // numbers can easily exceed one 60-record page. A truncated page would
    // silently drop the newest deal — the one the conversation belongs on.
    for await (const rec of client.listAll<Record<string, unknown>>("opportunities", {
      filter: `phoneTail9[in]:[${chunk.join(",")}]`,
    })) {
      records.push(rec);
    }
  }
  return buildOpportunityPhoneIndex(records, brandLine);
}

/**
 * The «не хочу второй телефон таскать» line: a WhatsApp deep link that opens
 * the chat with THIS customer on whatever device Babek is holding.
 *
 * Target is web.whatsapp.com/send?phone= directly (owner, 2026-08-13): wa.me
 * lands on an interstitial "Continue to Chat" page first, which reads as
 * broken from the CRM; the managers work at desks logged into WhatsApp Web,
 * so the direct URL drops them straight into the conversation.
 *
 * Rendered into the note body rather than mocked up as a button — a button
 * would need a Twenty field type that can hold an action, and a dead button is
 * worse than a working link. Returns null rather than a broken URL when the
 * number is too short to be dialled.
 */
export function waMeLink(rawPhone: string | null | undefined): string | null {
  const digits = normalizePhone(rawPhone);
  if (digits.length < MIN_PHONE_MATCH_DIGITS) return null;
  return `https://web.whatsapp.com/send?phone=${digits}`;
}

/** Note body with the deep link on its own first line. */
export function bodyWithWaLink(body: string, rawPhone: string | null | undefined): string {
  const link = waMeLink(rawPhone);
  if (!link) return body;
  return `[💬 WhatsApp +${normalizePhone(rawPhone)}](${link})\n\n${body}`;
}

/**
 * Twenty's LINKS composite for the deal's own `whatsapp` field — the link that
 * lives ON THE CARD rather than inside a note. The notes only carry it from
 * the moment the projector wrote them; a field is there for every deal that
 * has a number, including the 1,046 whose conversation predates all of this.
 *
 * Returns {} (not nulls) when there is no dialable number, so the caller can
 * spread it into a payload without ever clearing a value it did not set.
 */
export function waLinksField(rawPhone: string | null | undefined): Record<string, unknown> {
  const link = waMeLink(rawPhone);
  if (!link) return {};
  return {
    whatsapp: {
      primaryLinkUrl: link,
      primaryLinkLabel: `+${normalizePhone(rawPhone)}`,
      secondaryLinks: [],
    },
  };
}

/**
 * Twenty's LINKS composite for the person's `socialProfile` field — the
 * Instagram/… URL Bitrix kept in SOURCE_DESCRIPTION or the contact's WEB
 * multi-field. LINKS (not TEXT) because only LINKS renders a clickable anchor
 * — the same reason as `whatsapp` above.
 *
 * Returns {} when there is no URL, so the caller can spread it into a payload
 * without ever clearing a value it did not set.
 */
export function socialLinksField(url: string | null | undefined): Record<string, unknown> {
  if (!url) return {};
  return {
    socialProfile: {
      primaryLinkUrl: url,
      primaryLinkLabel: url.replace(/^https?:\/\//i, "").replace(/\/+$/, ""),
      secondaryLinks: [],
    },
  };
}
