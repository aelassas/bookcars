// WhatsApp/Telegram/Instagram/Messenger/JivoChat → Twenty CRM lead relay (the
// projector for inbound `message` rows — GROUPS INCLUDED — that turns
// qualified demand into cards on the rent/sales boards). Instagram DM and
// Messenger rows arrive from /api/webhooks/meta with `from` = `ig:<scopedId>`
// / `fb:<scopedId>`; JivoChat rows arrive from /api/webhooks/jivo with `from`
// = `jivo:<site_id>:<client>`. Both are phone-less by nature (a Jivo visitor
// who gave a phone carries it in from_pn and keys on the tail9 instead), so
// their threads key on the prefixed id and their cards are found by
// externalId, never by phoneTail9.
//
// Same architecture as the CallGear relay (../callgear/twenty-relay.ts): PURE
// decision logic (threadKeyFor / qualifyThreadBySignals / parseLeadVerdict /
// planLeadProjection / planWaLeadEnrich — no IO, fully unit-testable)
// separated from the adapters that talk to the platform DB (WaLeadRelaySource)
// and to Twenty (the client's own helpers + createTwentyRelay).
//
// Why this exists alongside push-message.ts: the push pipe files messages as
// notes on people/deals that ALREADY exist in Twenty. A stranger asking for a
// car in a WhatsApp group, a direct chat, or the Yango Telegram group matched
// nobody and went nowhere. This relay is the top of that funnel:
//
//   1. THREAD — inbound rows since the checkpoint are batched by the
//      participant's tail9 (COALESCE(from_pn, phone-in-body, from); a group
//      JID or a tg: id is never a key). Groups are included on purpose:
//      Dubizzle/Meta leads and Yango bookings LAND in groups.
//   2. SKIP OURS — staff tail9s (tenant members' user.phone + the
//      NOTIFY_WA_PHONE_* env lines) are never leads.
//   3. QUALIFY — deterministic first (extractSignals + qualifiesAsLead +
//      detectLeadOrigin), then ONE local-Qwen verdict for the threads the bar
//      rejects, behind the resolver/stage-progression evidence gate (verbatim
//      substring or discard). This is where ops-group chatter dies.
//   4. NEW vs CONTINUATION — an OPEN opportunity for the tail9 gets the thread
//      as a note plus fill-the-blanks enrich (never a second card, never an
//      overwrite); a closed-only or absent match gets a fresh card keyed
//      `wa-lead:<tenantSlug>:<tail9>` (idempotent by externalId).
//
// THE RAILS (never crossed):
//   - GROUPS DON'T CREATE CARDS (owner, 2026-08-13 — overrides the earlier
//     spec): group chatter is market noise; the CRM shows DIRECT customers
//     and calls only. A group thread is skipped for card creation AND
//     attachment notes. The ONE named exception is the Yango Telegram group
//     — a real lead channel whose bookings the owner explicitly wants.
//   - Never create a second opportunity for a tail9 with an open deal.
//   - Never overwrite a non-empty card field (planWaLeadEnrich fills blanks).
//   - DRY-RUN BY DEFAULT — zero Twenty writes, no checkpoint move, until the
//     runner passes --commit. The checkpoint moves to the pass START on
//     commit only (stage-progression semantics).

import { and, eq, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { twentyMirrorState } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import { extractSignals, type ExtractedSignals } from "@/modules/messaging/extract";
import { qualifiesAsLead, qualifiesAsLeadPhoneless } from "@/modules/crm/lead-from-whatsapp";
import { detectLeadOrigin, type LeadOrigin } from "@/modules/crm/lead-origin";
import type { TwentyClient } from "./client";
import { bodyWithWaLink, fetchOpportunitiesForTails, waLinksField, type OpportunityMatch } from "./deal-link";
import { CLOSED_STAGES, toInstanceStage } from "./stages";
import { dayHeader, dayKey, ensureContinuousNote, noteLine, waNoteTitle, type DayNoteResult } from "./day-note";
import { parseMediaText, renderMediaLine } from "./chat-line";
import { mediaUrl } from "@/platform/media/token";
import type { TwentyInstanceKey } from "./instance";
import { groupDisplayName } from "./group-names";
import { resolveOwnerForLine, resolveOwnerForPhone } from "@/modules/board/owners";
import { brandLineForLine, twentyPhoneFields } from "./mirror";
import { callTimestamp, type RelayTwenty } from "../callgear/twenty-relay";
import type { LeadNumberSource } from "./lead-number";
import {
  AGENT_REPLY_HINT,
  DEFAULT_RETURNING_GAP_MS,
  MANAGER_STEER_HINT,
  mainLineRotation,
  nextAvailableAgent,
  planReturningPick,
  renderText,
  type AgentAvailability,
  type DistributorTexts,
  type RentalRotationKey,
  type RotationAgent,
} from "@/modules/rental/rotation";

type PlatformDb = typeof platformDb;

// ─── Pure: source rows → threads ────────────────────────────────────────────

/** One inbound `message` row as the relay reads it. */
export interface LeadRelayRow {
  id: string;
  channel: string;
  /** Group JID for group rows, DM JID for direct, `tg:<userId>` for telegram. */
  from: string | null;
  /** Real participant phone (group member PN / sender PN) when known. */
  fromPn: string | null;
  /** Observer line slug (whatsapp) or chat title (telegram). */
  to: string | null;
  customerName: string | null;
  body: string | null;
  /** Present only on rows from loadRecentTwoWay (its query spans directions). */
  direction?: string;
  /** On-disk media file, when the row carries one — the link's only source. */
  mediaPath?: string | null;
  /** external_message_id — the ig/fb account slug rides in its namespace
   *  (`igmsg:<accountSlug>:<mid>`); whatsapp/telegram rows need nothing from it. */
  externalId?: string | null;
  createdAt: Date;
}

/**
 * A phone-less thread identity: `ig:<scopedId>` for Instagram DM and
 * `fb:<scopedId>` for Messenger (Meta webhooks), `jivo:<site_id>:<client>`
 * for a JivoChat visitor with no phone (integrations/jivo/webhook.ts). The
 * prefix is LOAD-BEARING — Meta's scoped ids are pure digits and Jivo client
 * ids are account-scoped, so unprefixed they would sail through every tail9
 * path in this file masquerading as phone numbers. A thread keyed this way
 * has no digits, no wa.me link, no phoneTail9; its card is found by its
 * externalId instead (metaLeadOpportunityExternalId — `jivo-lead:` for Jivo).
 */
const META_KEY_RE = /^(ig|fb|jivo):(.+)$/;

export function metaKeyParts(key: string): { prefix: "ig" | "fb" | "jivo"; id: string } | null {
  const m = META_KEY_RE.exec(key);
  return m && m[2] ? { prefix: m[1] as "ig" | "fb" | "jivo", id: m[2] } : null;
}

/**
 * Merge the customer's OUTBOUND-side rows (our agents' replies) into a
 * thread's note lines, fetched fresh at note time. Dedupes against the
 * thread's inbound lines on (timestamp, body) — the day-pipe's line-level
 * dedupe then keeps whichever copy it already wrote, never a duplicate.
 */
async function withTwoWayLines(thread: LeadThread, source: WaLeadRelaySource): Promise<LeadThread> {
  if (!source.loadRecentTwoWay || thread.channel !== "whatsapp" || thread.sourceContext) return thread;
  const first = thread.lines[0]?.at ?? thread.lastActivityAt;
  const since = new Date(first.getTime() - 24 * 3600 * 1000);
  let rows: LeadRelayRow[];
  try {
    rows = await source.loadRecentTwoWay(thread.digits, since);
  } catch {
    return thread; // a failed history read must never block the card
  }
  if (rows.length === 0) return thread;
  const seen = new Set(thread.lines.map((l) => `${l.at.getTime()}|${l.body}`));
  const extra: LeadThread["lines"] = [];
  for (const r of rows) {
    const body = (r.body ?? "").trim();
    if (!body) continue;
    const key = `${r.createdAt.getTime()}|${body}`;
    if (seen.has(key)) continue;
    const outbound = r.direction === "outbound";
    extra.push({
      body,
      at: r.createdAt,
      mediaPath: r.mediaPath ?? null,
      direction: outbound ? "outbound" : "inbound",
      speaker: outbound
        ? resolveOwnerForLine(r.to)?.name ?? resolveOwnerForPhone(r.from)?.name ?? null
        : r.customerName?.trim() || null,
    });
  }
  if (extra.length === 0) return thread;
  const lines = [...thread.lines, ...extra].sort((a, b) => a.at.getTime() - b.at.getTime());
  return { ...thread, lines };
}

/** One participant's inbound lines since the checkpoint. */
export interface LeadThread {
  /** tail9 — the repo-wide phone identity (MIN_PHONE_MATCH_DIGITS). */
  key: string;
  /** Full normalized digits, for the wa.me link and the phones composite. */
  digits: string;
  /** Channel of the newest line. */
  channel: string;
  participantName: string | null;
  /**
   * Where the lines arrived when it was a GROUP: the group JID (whatsapp) or
   * the chat title (telegram). Null for direct chats. Kept as provenance for
   * the card's callSource — the thread itself is keyed by the participant.
   */
  sourceContext: string | null;
  /** The channel the CONTEXT came from — set and cleared together with
   *  sourceContext (see buildThreads; the mixed-channel label bug). */
  contextChannel: string | null;
  /** Observer line slug of the newest DIRECT WhatsApp row — which of our
   *  numbers the customer wrote to. Owner routing (Ayham 2026-08-17: every
   *  card needs "agent name who got the lead"). Null for telegram/groups. */
  lineSlug: string | null;
  /** Every direct line slug this window saw, newest first (buildThreads).
   *  `lineSlug` keys the thread on the NEWEST row; this list is what lets the
   *  rental returning-customer distribution see a main-line visit when the
   *  newest row came in on an agent's personal line (card #923, 2026-09-24).
   *  Optional — test-built threads may omit it. */
  lineSlugs?: string[];
  lines: { body: string; at: Date; direction?: string; speaker?: string | null; mediaPath?: string | null }[];
  lastActivityAt: Date;
}

// First plausible phone in a message body (9-15 digits once stripped) — the
// same reading import-telegram-groups.ts makes when it fills from_pn.
export function phoneFromBody(body: string | null | undefined): string | null {
  const m = /(?<!\d)\+?\d[\d\s().-]{7,18}\d(?!\d)/.exec((body ?? "").trim());
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= MIN_PHONE_MATCH_DIGITS && digits.length <= 15 ? digits : null;
}

/**
 * The thread key for one row: tail9 of COALESCE(from_pn, phone-in-body, from).
 * Three refusals, all honest-identity guards: a group JID (`@g.us`) names a
 * ROOM, not a person; a `tg:<userId>` is a Telegram account id, not a phone;
 * and an `@lid` JID is WhatsApp's opaque linked-device id, not a dialable
 * number (audit 2026-08-14 — a card keyed on it carries a broken wa link).
 * None may key a thread, so group/telegram/lid rows key off the participant
 * phone or the phone inside the body only, and rows without one are skipped
 * (they produce no card and no note). Since 2026-09-19 loadRows resolves
 * `@lid` senders through wa_identity into from_pn BEFORE keying — most lids
 * then land here as ordinary phone-keyed threads instead of being skipped.
 *
 * Meta rows (`from` = `ig:<scopedId>` / `fb:<scopedId>`, written by
 * /api/webhooks/meta) key on the WHOLE prefixed id — the scoped id is the
 * reachable identity there, and no digits exist to tail9. Jivo rows
 * (`jivo:<site_id>:<client>`, /api/webhooks/jivo) work the same way — except
 * when the visitor gave a phone: from_pn then outranks the prefix and the
 * thread stitches onto that customer's phone identity, exactly as if they had
 * written on WhatsApp.
 */
export function threadKeyFor(row: LeadRelayRow): { key: string; digits: string } | null {
  const from = (row.from ?? "").trim();
  // A real sender phone beats every opaque/pseudo id. For whatsapp rows this
  // is byte-identical to the old candidate order (fromPn was already first);
  // for jivo rows it is what stitches a phone-bearing visitor onto their tail9.
  const fromPnDigits = normalizePhone(row.fromPn);
  if (fromPnDigits.length >= MIN_PHONE_MATCH_DIGITS) {
    return { key: fromPnDigits.slice(-MIN_PHONE_MATCH_DIGITS), digits: fromPnDigits };
  }
  const meta = META_KEY_RE.exec(from);
  if (meta && meta[2]) return { key: from, digits: "" };
  const opaqueFrom = from.endsWith("@g.us") || from.startsWith("tg:") || from.endsWith("@lid");
  const candidate = phoneFromBody(row.body) || (opaqueFrom ? null : from);
  const digits = normalizePhone(candidate);
  if (digits.length < MIN_PHONE_MATCH_DIGITS) return null;
  return { key: digits.slice(-MIN_PHONE_MATCH_DIGITS), digits };
}

/**
 * Supplier/competitor broadcast lists. Other rental agencies mass-send their
 * daily "available cars" sheets to OUR lines, and the sheet reads exactly
 * like a rental request to the qualifier — car models, prices, "available
 * today" — so it sails over the deterministic bar (KINGS AUTO's broadcast
 * even reached CAR_WITH_CUSTOMER before anyone caught it, Ayham 2026-09-06).
 * These senders are advertising TO us; they are never customers. Extend at
 * runtime with WA_LEAD_BLOCKLIST="9715…,9715…" (tails or full numbers).
 */
const BROADCAST_BLOCKLIST: readonly string[] = [
  "971526068986", // KINGS AUTO CAR RENTAL — daily fleet broadcast
  "971508363335", // DREAMRIDES CAR RENTAL — daily fleet broadcast
];

function blockedTails(): ReadonlySet<string> {
  const tails = new Set<string>();
  const add = (raw: string) => {
    const d = normalizePhone(raw);
    if (d.length >= MIN_PHONE_MATCH_DIGITS) tails.add(d.slice(-MIN_PHONE_MATCH_DIGITS));
  };
  for (const n of BROADCAST_BLOCKLIST) add(n);
  for (const n of (process.env.WA_LEAD_BLOCKLIST ?? "").split(",")) add(n);
  return tails;
}

export function blockedBroadcastSender(tail9: string): boolean {
  return blockedTails().has(tail9);
}

/**
 * Which of OUR accounts a direct row arrived on: the observer line slug for
 * whatsapp (`to`), the Meta account slug parsed out of the extid namespace
 * (`igmsg:<accountSlug>:<mid>` / `fbmsg:<accountSlug>:<mid>`) for ig/fb.
 * Null for groups/telegram — owner routing needs a line, and a group has none.
 */
function directLineSlug(row: LeadRelayRow): string | null {
  if (row.channel === "whatsapp") return row.to?.trim() || null;
  if (row.channel === "instagram" || row.channel === "messenger") {
    return /^(?:igmsg|fbmsg):([^:]+):/.exec(row.externalId ?? "")?.[1] ?? null;
  }
  return null;
}

/** Batch rows into per-participant threads. `skippedNoKey` counts ROWS dropped
 *  by threadKeyFor (group JIDs, tg ids without a body phone). The context
 *  keeps its OWN channel (contextChannel): a tail9's thread merges channels,
 *  and `channel` tracks the NEWEST line — without the pair, a Yango-TG-group
 *  lead whose newest line is a WA direct was labeled "WhatsApp direct"
 *  (owner, live board, 2026-08-13). */
export function buildThreads(rows: LeadRelayRow[]): {
  threads: Map<string, LeadThread>;
  skippedNoKey: number;
} {
  const threads = new Map<string, LeadThread>();
  let skippedNoKey = 0;
  for (const row of rows) {
    const body = (row.body ?? "").trim();
    if (!body) continue;
    const k = threadKeyFor(row);
    if (!k) {
      skippedNoKey++;
      continue;
    }
    // Instagram/Messenger DMs are always DIRECT chats — Meta has no group
    // surface here, so they never carry a sourceContext.
    const isGroup = (row.from ?? "").endsWith("@g.us") || row.channel === "telegram";
    const context = isGroup ? (row.channel === "telegram" ? row.to : row.from) : null;
    const lineSlug = isGroup ? null : directLineSlug(row);
    const existing = threads.get(k.key);
    if (!existing) {
      threads.set(k.key, {
        key: k.key,
        digits: k.digits,
        channel: row.channel,
        participantName: row.customerName?.trim() || null,
        sourceContext: context,
        contextChannel: context ? row.channel : null,
        lineSlug,
        lineSlugs: lineSlug ? [lineSlug] : [],
        lines: [{ body, at: row.createdAt }],
        lastActivityAt: row.createdAt,
      });
      continue;
    }
    existing.lines.push({ body, at: row.createdAt });
    if (row.createdAt >= existing.lastActivityAt) {
      existing.lastActivityAt = row.createdAt;
      existing.channel = row.channel;
      if (lineSlug) existing.lineSlug = lineSlug;
    }
    // Every direct line this window saw, newest first — a customer who wrote
    // BOTH the main line and an agent's line keys on the agent line (above),
    // but the main-line visit must still be visible to the rental returning-
    // customer distribution (Ayham, 2026-09-24 — card #923).
    if (lineSlug) {
      const slugs = (existing.lineSlugs ??= []);
      const at = slugs.indexOf(lineSlug);
      if (at >= 0) slugs.splice(at, 1);
      slugs.unshift(lineSlug);
    }
    existing.lineSlug ??= lineSlug;
    existing.participantName ??= row.customerName?.trim() || null;
    // The context AND its channel move together or not at all.
    if (existing.sourceContext === null && context !== null) {
      existing.sourceContext = context;
      existing.contextChannel = row.channel;
    }
  }
  for (const t of threads.values()) {
    t.lines.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  return { threads, skippedNoKey };
}

// ─── Pure: qualification ────────────────────────────────────────────────────

/** Below this the model's own doubt is reason enough to stay quiet. */
export const MIN_LEAD_CONFIDENCE = 0.7;

export interface ThreadSignals {
  qualified: boolean;
  signals: ExtractedSignals;
  origin: LeadOrigin | null;
}

/**
 * The deterministic bar (lead-from-whatsapp.ts): a reachable phone AND at
 * least one of car / intent / term / budget — or a marketplace enquiry
 * against one of our listings, which clears the bar on its own
 * (detectLeadOrigin, lead-origin.ts). No AI call is made for threads that
 * clear it.
 */
/**
 * The strongest buying signal in this business carries no keywords at all:
 * the customer sends their IDENTITY DOCUMENT — an Emirates ID PDF
 * ("EID_784197922876145_….pdf") or a driving-licence photo the vision model
 * names. Nobody sends their ID to window-shop; they send it to close. The
 * keyword bar is blind to it — lead 155 (2026-09-03): licence photo + EID
 * PDF + location from a returning B2B partner filed NOISE twelve passes in a
 * row, deal saved only because Ali keyed it in by hand.
 *
 * Only a DOCUMENT row counts — "[image] Driving License…", "[document] …",
 * or a bare EID_ filename. The same words in prose ("my licence is at home")
 * are talk, not a signal, and stay with the keyword bar.
 */
const ID_DOCUMENT_RE =
  /(?:\bEID_\d{6,}|emirates id|driving licen[cs]e|driver'?s licen[cs]e|licen[cs]e no\b|passport|паспорт|водительск|удостоверен|رخصة|هوية|جواز)/i;

export function idDocumentSent(lines: { body: string }[]): boolean {
  for (const l of lines) {
    const t = (l.body ?? "").trim();
    if (!/^\[(image|document)\]/i.test(t) && !/^EID_\d/i.test(t)) continue;
    if (ID_DOCUMENT_RE.test(t)) return true;
  }
  return false;
}

export function qualifyThreadBySignals(thread: LeadThread): ThreadSignals {
  const signals = extractSignals(thread.lines.map((l) => l.body).join("\n"));
  let origin: LeadOrigin | null = null;
  for (const l of thread.lines) {
    origin = detectLeadOrigin(l.body);
    if (origin) break;
  }
  const demand = {
    car: signals.carText,
    intent: signals.intent,
    termMonths: signals.termMonths,
    priceAed: signals.priceAed,
    marketplaceListingUrl: origin?.listingUrl ?? null,
  };
  const qualified =
    // ig/fb threads have no phone: the scoped id IS the reachable identity,
    // so they are judged on the intent bar alone (see qualifiesAsLeadPhoneless).
    (metaKeyParts(thread.key) ? qualifiesAsLeadPhoneless(demand) : qualifiesAsLead(thread.digits, demand)) ||
    idDocumentSent(thread.lines);
  return { qualified, signals, origin };
}

export interface LeadVerdict {
  isRentRequest: boolean;
  confidence: number;
  /** Verbatim quotes from the conversation — the write gate. */
  evidence: string[];
}

export interface LeadPrompt {
  system: string;
  user: string;
  /** Every `evidence` string must be a verbatim substring of this. */
  sourceText: string;
}

const LEAD_SYSTEM =
  `You are a lead qualifier for a UAE car rental/sales company. Given the new ` +
  `inbound WhatsApp/Telegram messages of ONE phone number (they may come from ` +
  `inside a staff group chat), decide whether this person is asking to RENT, ` +
  `LEASE or BUY a car — a new request or the continuation of one. Ops chatter ` +
  `(deliveries, fines, Salik, fuel, invoices, coordination between staff), ` +
  `broadcasts and small talk are NOT rent requests.\n` +
  `Respond with ONLY a JSON object (no prose, no markdown) with exactly these fields:\n` +
  `- isRentRequest: boolean\n` +
  `- confidence: number 0..1\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character ` +
  `from the conversation below that justify the verdict. Never invent a quote.`;

const MAX_THREAD_MESSAGES = 30;
const MAX_THREAD_CHARS = 4000;

export function buildLeadPrompt(thread: LeadThread): LeadPrompt {
  const recent = thread.lines.slice(-MAX_THREAD_MESSAGES);
  const kept: string[] = [];
  let chars = 0;
  for (const line of [...recent].reverse()) {
    if (chars + line.body.length > MAX_THREAD_CHARS) break;
    chars += line.body.length;
    kept.unshift(`[${line.at.toISOString()}] ${line.body}`);
  }
  const sourceText = kept.join("\n");
  const user =
    `Newest messages from one customer (oldest first):\n${sourceText || "none"}`;
  return { system: LEAD_SYSTEM, user, sourceText };
}

/**
 * Parse + gate the model's verdict. Returns null — SKIP, treat as noise —
 * when the JSON is malformed, off-shape, `evidence` is empty, or any quote is
 * not a verbatim substring of `sourceText` (an invented quote proves the
 * whole reading untrustworthy — the stage-progression gate, applied here).
 */
/**
 * The local model corrupts JSON KEYS, never the values — mlx 4-bit emits
 * `".isRentRequest": true` (measured on live threads 2026-09-06: the verdicts
 * were judged CORRECTLY and every one was thrown away on the mangled key —
 * that is why qualifiedAI was 0 for the relay's whole life). Keys are matched
 * by their letters, not their exact bytes. A key that strips to nothing means
 * the field was genuinely lost — that response stays rejected.
 */
function fieldByLooseKey(parsed: Record<string, unknown>, want: string): unknown {
  if (want in parsed) return parsed[want];
  for (const k of Object.keys(parsed)) {
    const stripped = k.replace(/[^a-zA-Z]/g, "");
    if (stripped && stripped === want) return parsed[k];
  }
  return undefined;
}

export function parseLeadVerdict(content: string, sourceText: string): LeadVerdict | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    const trimmed = content.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    parsed = JSON.parse(start === -1 || end < start ? trimmed : trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const isRentRequest = fieldByLooseKey(parsed, "isRentRequest");
  const confidence = fieldByLooseKey(parsed, "confidence");
  const evidenceRaw = fieldByLooseKey(parsed, "evidence");
  if (typeof isRentRequest !== "boolean") return null;
  if (
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return null;
  }
  if (!Array.isArray(evidenceRaw) || evidenceRaw.length === 0) return null;
  const evidence: string[] = [];
  for (const quote of evidenceRaw) {
    if (typeof quote !== "string" || !quote.trim()) return null;
    if (!sourceText.includes(quote)) return null;
    evidence.push(quote);
  }
  return { isRentRequest, confidence, evidence };
}

/** The verdict gate, in one place: only a confident, evidenced YES qualifies. */
export function verdictQualifies(v: LeadVerdict | null): boolean {
  return Boolean(v && v.isRentRequest && v.confidence >= MIN_LEAD_CONFIDENCE && v.evidence.length > 0);
}

/**
 * Hybrid judgement (option B): local Qwen first, DeepSeek as second opinion.
 *
 * The local model is a 4-bit mlx checkpoint — it works, but on borderline
 * threads its verdict is mediocre and it sometimes mangles output. So the
 * three cases where a lead is otherwise lost are escalated to DeepSeek:
 *
 *   a. the local call THREW / timed out  (today: failed++, skip),
 *   b. parseLeadVerdict returned null    (unparseable),
 *   c. the local verdict said NOT qualified.
 *
 * On escalation the DeepSeek verdict is FINAL for that thread. DeepSeek
 * failing is the same as local failing: skip, never invent a lead.
 */
export interface AiEscalationOutcome {
  /** The final verdict for the thread (may be non-qualifying). */
  verdict: LeadVerdict | null;
  /** The engine that produced `verdict`, or null when no verdict was produced. */
  engine: "local" | "deepseek" | null;
  /** A DeepSeek second-opinion call was attempted (an escalation happened). */
  escalated: boolean;
  /** Both judges failed to produce a usable verdict — the thread must be skipped. */
  failed: boolean;
  /** First error message, for `failed` outcomes. */
  error?: string;
}

export async function judgeThreadWithEscalation(
  prompt: LeadPrompt,
  complete: (system: string, user: string) => Promise<string>,
  completeDeepseek: ((system: string, user: string) => Promise<string>) | null
): Promise<AiEscalationOutcome> {
  // Local judge runs first, exactly as before.
  let localContent: string | null = null;
  let localError: string | null = null;
  try {
    localContent = await complete(prompt.system, prompt.user);
  } catch (e) {
    localError = (e as Error).message;
  }

  let localVerdict: LeadVerdict | null = null;
  if (localContent !== null) {
    localVerdict = parseLeadVerdict(localContent, prompt.sourceText);
    // A confident, evidenced YES from the local model qualifies — no second
    // opinion is asked for.
    if (verdictQualifies(localVerdict)) {
      return { verdict: localVerdict, engine: "local", escalated: false, failed: false };
    }
  }

  if (!completeDeepseek) {
    // No second opinion configured: a local throw is the same skip as today,
    // and a parseable-but-negative verdict falls through to the caller.
    if (localContent === null) {
      return {
        verdict: null,
        engine: null,
        escalated: false,
        failed: true,
        error: localError ?? "local judge failed",
      };
    }
    return { verdict: localVerdict, engine: "local", escalated: false, failed: false };
  }

  // Escalate: local threw (a), returned null (b), or said NOT qualified (c).
  let deepseekContent: string;
  try {
    deepseekContent = await completeDeepseek(prompt.system, prompt.user);
  } catch (e) {
    // DeepSeek failing = local failing: skip, never invent a lead.
    return {
      verdict: null,
      engine: null,
      escalated: true,
      failed: true,
      error: (e as Error).message,
    };
  }
  const deepseekVerdict = parseLeadVerdict(deepseekContent, prompt.sourceText);
  return { verdict: deepseekVerdict, engine: "deepseek", escalated: true, failed: false };
}

/** One-line summary for the per-escalation log line. */
function deepseekSummary(outcome: AiEscalationOutcome): string {
  if (outcome.failed) return `failed${outcome.error ? `: ${outcome.error.slice(0, 80)}` : ""}`;
  if (outcome.verdict && verdictQualifies(outcome.verdict)) {
    return `qualified conf=${outcome.verdict.confidence.toFixed(2)}`;
  }
  return outcome.verdict
    ? `not-qualified conf=${outcome.verdict.confidence.toFixed(2)}`
    : "no-verdict";
}

/**
 * Owner 2026-08-13 (overrides the earlier spec): GROUPS DON'T CREATE CARDS —
 * group threads (sourceContext set) are market chatter; the CRM shows direct
 * customers and calls only. The ONE named exception is the Yango Telegram
 * group (its chat title is the sourceContext): those bookings are real leads.
 */
export function groupCardEligible(sourceContext: string | null): boolean {
  if (!sourceContext) return true; // direct chat — unchanged
  return /yango/i.test(sourceContext);
}

// ─── Pure: the projection plan ──────────────────────────────────────────────

/**
 * Opportunity externalId namespace — the idempotency key for one lead.
 *
 * `returningOn` is the day a customer who ALREADY has a closed card came back.
 * Without it every card a customer ever had shared one key, so the "fresh card
 * for a closed-only match" the pass below decides on was upserted straight onto
 * the closed card and the new enquiry vanished into a dead deal (Ayham,
 * 2026-08-31: four of twelve customers on Abdullah's line were writing into
 * cards stamped COMPLETED / UNSUCCESSFUL_DEAL / NOT_A_LEAD).
 *
 * The day — not the timestamp — keeps it idempotent: every retry inside the
 * pass, and every pass that day, resolves to the same card; a customer
 * returning next month gets a new one.
 */
export function waLeadOpportunityExternalId(
  tenantSlug: string,
  tail9: string,
  returningOn?: Date
): string {
  const base = `wa-lead:${tenantSlug}:${tail9}`;
  return returningOn ? `${base}:${dayKey(returningOn)}` : base;
}

/**
 * The phone-less equivalent — the idempotency key for one Meta DM or JivoChat
 * lead. The scoped id plays the role tail9 plays for WhatsApp:
 * `ig-lead:<tenant>:<scopedId>` (`fb-lead:` for Messenger,
 * `jivo-lead:<tenant>:<site_id>:<client>` for Jivo). Same returning-customer
 * day-suffix rule as waLeadOpportunityExternalId, and the OPEN-match lookup
 * keys on the root (there is no phoneTail9 to index by — see metaCardMatch).
 */
export function metaLeadOpportunityExternalId(
  tenantSlug: string,
  key: string,
  returningOn?: Date
): string {
  const meta = metaKeyParts(key);
  if (!meta) throw new Error(`metaLeadOpportunityExternalId: not a meta key: ${key}`);
  const base = `${meta.prefix}-lead:${tenantSlug}:${meta.id}`;
  return returningOn ? `${base}:${dayKey(returningOn)}` : base;
}

/**
 * The open-match lookup for a Meta thread. Phone threads get their match from
 * the batch phoneTail9 index; ig/fb cards carry no phoneTail9, so the match
 * is the ROOT card (`ig-lead:<tenant>:<scopedId>`, no day suffix) found by
 * externalId. Known limit (v1): an OPEN day-suffixed return card from an
 * earlier day is not seen here, so a return-within-a-return can mint one
 * extra card per day boundary — same "new day, new card" semantics the
 * day-suffix itself encodes.
 */
export async function metaCardMatch(
  twenty: RelayTwenty,
  tenantSlug: string,
  key: string
): Promise<OpportunityMatch | null> {
  const root = await twenty.findOpportunityByExternalId(metaLeadOpportunityExternalId(tenantSlug, key));
  if (!root || typeof root.id !== "string") return null;
  const stage = typeof root.stage === "string" ? root.stage : null;
  return {
    id: root.id,
    open: !stage || !CLOSED_STAGES.has(stage),
    updatedAt: Date.parse(typeof root.updatedAt === "string" ? root.updatedAt : "") || 0,
  };
}

/**
 * Is this a customer coming BACK, rather than a stranger to judge?
 *
 * The deterministic bar and the model both ask "does this read like a rental
 * request" — the right question for a first contact, the wrong one for someone
 * whose deal is already closed. Two real threads on Abdullah's line were filed
 * as noise on 2026-08-31 and never reached the manager: a COMPLETED customer
 * asking "Which car you will send" and a lost one asking to confirm a car's
 * details. Neither carries a rent keyword; both are obviously live business.
 *
 * So a CLOSED match plus a substantive message is itself the signal. Open
 * matches are excluded — those already attach to the live card. The
 * `substantiveLine` guard keeps a sticker or a bare "ok" from resurrecting a
 * finished deal.
 */
export function returningCustomerQualifies(
  thread: LeadThread,
  match: OpportunityMatch | null
): boolean {
  if (!match || match.open) return false;
  return substantiveLine(thread.lines.map((l) => l.body)) !== null;
}

/**
 * One line for the card's callSource (source) field — a human reads this, not
 * a join. The CONTEXT's own channel (contextChannel, tracked by buildThreads)
 * decides the group label: a thread merges channels, and the newest line's
 * channel must never relabel where the lead actually came from (a Yango-TG
 * lead whose newest line was a WA direct read "WhatsApp direct" — owner,
 * live board, 2026-08-13).
 */
export function leadSourceLabel(
  channel: string,
  sourceContext: string | null,
  origin: LeadOrigin | null,
  contextChannel?: string | null
): string {
  if (origin) return origin.label;
  if (sourceContext) {
    return contextChannel === "telegram"
      ? `Telegram: ${sourceContext}`
      : // groupDisplayName resolves the cached group subject; an unknown JID
        // stays raw (never a guess).
        `WhatsApp group: ${groupDisplayName(sourceContext)}`;
  }
  if (channel === "instagram") return "Instagram direct";
  if (channel === "messenger") return "Messenger direct";
  if (channel === "jivo") return "JivoChat";
  return channel === "telegram" ? "Telegram" : "WhatsApp direct";
}

/**
 * The first substantive customer line of a thread: the first body longer than
 * ~15 chars after dropping media-placeholder lines. A doc-OCR line
 * ("[image] <licence text>") is NOT a summary — it names a document, not a
 * request — so lines starting with a placeholder are skipped, and a real
 * caption that CARRIES a placeholder ("this one [image] …") is cut at it.
 */
export function substantiveLine(bodies: string[]): string | null {
  for (const raw of bodies) {
    const t = (raw ?? "").trim();
    if (/^\[(image|document|voice|audio|video|non-text)\]/i.test(t)) continue;
    const text = t.replace(/\[(image|document|voice|audio|video|non-text)\][\s\S]*$/i, "").trim();
    if (text.length > 15) return text.length > 180 ? `${text.slice(0, 179)}…` : text;
  }
  return null;
}

/**
 * The one-line AI-free summary written onto the card face (callSummary): the
 * first substantive customer line, truncated to ~180 chars. No substantive
 * line → the marketplace origin label ("Dubizzle enquiry · …") when the
 * thread is one, else null (the field is omitted, never fabricated).
 */
export function threadSummaryLine(thread: LeadThread): string | null {
  const line = substantiveLine(thread.lines.map((l) => l.body));
  if (line) return line;
  for (const l of thread.lines) {
    const origin = detectLeadOrigin(l.body);
    if (origin) return origin.label;
  }
  return null;
}

/** Split "First Last …" the same way the relay/mirror do for Twenty's FULL_NAME. */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

/** Fields a NEW opportunity must carry for the relay to be re-identifiable. */
const REQUIRED_OPPORTUNITY_FIELDS = ["name", "stage", "externalId", "externalSource"];

/**
 * Sales desk (2026-09 leasing restructure): every NEW card on the SALES board
 * enters the girls' queue at this primaryStage. The handover normalizer in
 * notify/sales-automations.ts clears it once the card moves to the guys'
 * pipeline. SALES ONLY — the rental workspace has no such field and the
 * rental flow must stay byte-identical, so the write below is gated on the
 * instance (and, like the brand chip, on the workspace having the field).
 */
export const SALES_PRIMARY_STAGE_NEW = "NEW_APPLICATION";

export interface LeadPlanInput {
  thread: LeadThread;
  /** How the thread qualified — logged, and carried into stageDetail context. */
  qualifiedBy: "bar" | "ai";
  /** tail9 index match; `open:false` means only CLOSED deals exist → NEW. */
  match: OpportunityMatch | null;
  /** Idempotency: a card with our wa-lead externalId already exists. */
  existingLeadCardId: string | null;
  /** The key this lead is created under — day-suffixed for a returning
   *  customer, so the return does not upsert onto their closed card. */
  leadExternalId?: string;
  existingPersonId: string | null;
  opportunityFields: ReadonlySet<string>;
  instance: TwentyInstanceKey;
  tenantSlug: string;
  brandLine: string | null;
  signals: ExtractedSignals;
  origin: LeadOrigin | null;
  now: Date;
  /** Twenty workspaceMember id for the line the lead arrived on — the card's
   *  owner from birth. Null = line unmapped/ambiguous → card stays unowned
   *  (never guess; see matchMemberForAgent). */
  ownerId?: string | null;
  /**
   * RENTAL main-line distribution only: the moment the distributor assigned
   *   the card (the acceptance clock the sweeper reads). Stamped as the
   *   `assignedAt` custom field when Ops has created it on the rental
   *   workspace — the gate below drops it silently where the field is absent,
   *   so the SALES create body is byte-identical (assignedAt is never passed
   *   for the default instance).
   */
  assignedAt?: Date;
}

export type LeadPlan =
  | { action: "attach"; opportunityId: string }
  | {
      action: "create";
      person: { kind: "reuse"; id: string } | { kind: "create"; payload: Record<string, unknown> };
      /** POST /rest/opportunities body, MINUS pointOfContactId. */
      opportunity: Record<string, unknown>;
      skippedFields: string[];
    }
  | { action: "workspace_broken"; missing: string[] };

/**
 * The ONLY routing decision this relay makes. An OPEN deal for the tail9 (or
 * our own card found by externalId on a retry) means CONTINUATION — a note,
 * never a second card. A closed-only or absent match means NEW.
 */
export function planLeadProjection(input: LeadPlanInput): LeadPlan {
  const { thread, opportunityFields } = input;

  if (input.match?.open) return { action: "attach", opportunityId: input.match.id };
  if (input.existingLeadCardId) return { action: "attach", opportunityId: input.existingLeadCardId };

  const missing = REQUIRED_OPPORTUNITY_FIELDS.filter((f) => !opportunityFields.has(f));
  if (!opportunityFields.has("pointOfContact") && !opportunityFields.has("pointOfContactId")) {
    missing.push("pointOfContact");
  }
  if (missing.length > 0) return { action: "workspace_broken", missing };

  const label = leadSourceLabel(thread.channel, thread.sourceContext, input.origin, thread.contextChannel);
  // ig/fb thread? Its key is `ig:<scopedId>` / `fb:<scopedId>` — every
  // phone-shaped write below is gated on this.
  const meta = metaKeyParts(thread.key);
  // The BRAND follows the line, not the tenant it is routed to: Ali's line sits
  // on `easyrent` for import-history reasons but is Cardiwan (owner
  // 2026-08-31). Falls back to the tenant's brand for every other line.
  const brand = brandLineForLine(thread.lineSlug, input.tenantSlug) ?? input.brandLine;
  const personPart: Extract<LeadPlan, { action: "create" }>["person"] = input.existingPersonId
    ? { kind: "reuse", id: input.existingPersonId }
    : {
        kind: "create",
        payload: meta
          ? {
              // A phone-less Meta DM sender: no phones composite, no phoneTail9
              // (the scoped id is NOT a number), and a name fallback that says
              // the channel instead of faking a +phone.
              name: thread.participantName
                ? splitName(thread.participantName)
                : { firstName: `${meta.prefix === "ig" ? "Instagram" : meta.prefix === "fb" ? "Messenger" : "JivoChat"} ${meta.id.slice(-6)}`, lastName: "" },
              externalId: `${meta.prefix}-lead-person:${input.tenantSlug}:${meta.id}`,
              externalSource: thread.channel,
              ...(brand ? { brandLine: brand } : {}),
            }
          : {
              name: thread.participantName
                ? splitName(thread.participantName)
                : // A nameless writer is labelled by its phone tail, NEVER "Unknown"
                  // (that placeholder cost a manual dedupe once — see mirror.ts).
                  { firstName: `+…${thread.key}`, lastName: "" },
              phones: { ...twentyPhoneFields(`+${thread.digits}`), additionalPhones: [] },
              externalId: `wa-lead-person:${input.tenantSlug}:${thread.key}`,
              externalSource: thread.channel,
              phoneTail9: thread.key,
              ...(brand ? { brandLine: brand } : {}),
            },
      };

  const wanted: Record<string, unknown> = {
    // Stamped with the CUSTOMER's first message — see threadStartedAt.
    name: meta
      ? // A named sender earns their name on the card face — "Instagram direct
        // · Pariza Faisal Attarwala …" reads like a lead, "… · 976386" reads
        // like a glitch (Moe's #2 requirement: the name visible WITHOUT
        // opening the card). Nameless senders keep the scoped tail.
        `${label} · ${thread.participantName?.trim() || meta.id.slice(-6)} ${callTimestamp(threadStartedAt(thread).toISOString())}`
      : `${label} +${thread.digits} ${callTimestamp(threadStartedAt(thread).toISOString())}`,
    // Top-of-funnel in the target workspace's own vocabulary: NEW on sales,
    // NEW_REQUEST on the rental pipeline (a bare "NEW" is a 400 there).
    stage: toInstanceStage(input.instance, "NEW"),
    externalId:
      input.leadExternalId ??
      (meta
        ? metaLeadOpportunityExternalId(input.tenantSlug, thread.key)
        : waLeadOpportunityExternalId(input.tenantSlug, thread.key)),
    externalSource: thread.channel,
    stageDetail:
      thread.channel === "telegram"
        ? "Telegram lead"
        : thread.channel === "instagram"
          ? "Instagram lead"
          : thread.channel === "messenger"
            ? "Messenger lead"
            : thread.channel === "jivo"
              ? "JivoChat lead"
              : "WhatsApp lead",
    // The customer's number ON the card — the stitch key everything else uses.
    // Meta threads have none: phoneTail9 stays NULL (never the scoped digits).
    ...(meta ? {} : { phoneTail9: thread.key }),
    // LINKS composite → a clickable "message this customer" straight off the
    // card. WhatsApp-only: a web.whatsapp.com link against a scoped id would
    // open a chat with a stranger's phone-shaped number, so ig/fb cards carry
    // no `whatsapp` link at all.
    ...(meta ? {} : waLinksField(thread.digits)),
    ...(brand ? { brandLine: brand } : {}),
    // The colored chip on the kanban card (Ayham 2026-09-02): a SELECT mirror
    // of brandLine — values are the option VALUES (CARDIWAN/EASYRENT/…), the
    // chip color comes from the field's option colors. Only written where the
    // workspace has the field (rental does; the gate below skips it on sales).
    ...(brand ? { brand: brand.toUpperCase() } : {}),
    // The girls' queue entry stage (see SALES_PRIMARY_STAGE_NEW). Gated on the
    // SALES instance so the rental create body stays byte-identical.
    ...(input.instance === "default" ? { primaryStage: SALES_PRIMARY_STAGE_NEW } : {}),
    // callSource is the source field that actually exists on both workspaces
    // (created for the CallGear cards); there is no `leadSource` field.
    callSource: label,
    // The card-face one-liner (owner: "there is no summary of the AI in the
    // card") — the first substantive customer line, no new AI call. Omitted
    // when the thread has nothing substantive, never fabricated.
    ...(threadSummaryLine(thread) ? { callSummary: threadSummaryLine(thread) } : {}),
    // What they asked about, when the deterministic pass could name it.
    ...(input.signals.carText ? { carModels: input.signals.carText } : {}),
    // Rental distributor stamp (see LeadPlanInput.assignedAt) — gated below.
    ...(input.assignedAt ? { assignedAt: input.assignedAt.toISOString() } : {}),
  };
  // Twenty CURRENCY composite; the deterministic price is integer AED.
  if (input.signals.priceAed !== null && input.signals.priceAed > 0) {
    wanted.amount = { amountMicros: input.signals.priceAed * 1_000_000, currencyCode: "AED" };
  }

  const opportunity: Record<string, unknown> = {};
  const skippedFields: string[] = [];
  for (const [key, value] of Object.entries(wanted)) {
    if (REQUIRED_OPPORTUNITY_FIELDS.includes(key) || opportunityFields.has(key)) {
      opportunity[key] = value;
    } else {
      skippedFields.push(key);
    }
  }
  // Relation field — not in the scalar-field metadata set, whitelisted past
  // the gate exactly like planCallRelay does for the CallGear cards.
  if (input.ownerId) opportunity.ownerId = input.ownerId;

  return { action: "create", person: personPart, opportunity, skippedFields };
}

/**
 * Fill-the-blanks enrich for a CONTINUATION (the planCallEnrich pattern,
 * twenty-relay.ts:284-318): a field already carrying a value is left alone —
 * a manager may have typed it. Returns {} when there is nothing to add.
 */
export function planWaLeadEnrich(input: {
  existing: Record<string, unknown>;
  thread: LeadThread;
  signals: ExtractedSignals;
  opportunityFields: ReadonlySet<string>;
  ownerId?: string | null;
}): Record<string, unknown> {
  const { existing, thread, signals, opportunityFields } = input;
  const patch: Record<string, unknown> = {};
  const blank = (key: string): boolean => {
    const v = existing[key];
    return v === null || v === undefined || v === "" || (typeof v === "number" && v === 0);
  };
  const put = (key: string, value: unknown): void => {
    if (opportunityFields.has(key)) patch[key] = value;
  };

  // Blank-fill ONLY (planCallEnrich pattern): a manager's manual reassignment
  // is never clobbered by line routing.
  if (input.ownerId && blank("ownerId")) patch.ownerId = input.ownerId;
  // Phone-shaped fills are whatsapp/telegram-only: a Meta scoped id is not a
  // number, so ig/fb cards keep phoneTail9 NULL and carry no whatsapp link.
  const meta = metaKeyParts(thread.key);
  if (!meta && blank("phoneTail9")) put("phoneTail9", thread.key);
  if (!meta && !(existing.whatsapp as { primaryLinkUrl?: string } | null)?.primaryLinkUrl) {
    const links = waLinksField(thread.digits);
    if (links.whatsapp) put("whatsapp", links.whatsapp);
  }
  if (signals.carText && blank("carModels")) put("carModels", signals.carText);
  const amount = existing.amount as { amountMicros?: number } | null;
  if (
    signals.priceAed !== null &&
    signals.priceAed > 0 &&
    (!amount || !Number(amount.amountMicros))
  ) {
    put("amount", { amountMicros: signals.priceAed * 1_000_000, currencyCode: "AED" });
  }
  if (blank("callSource")) {
    put("callSource", leadSourceLabel(thread.channel, thread.sourceContext, null, thread.contextChannel));
  }
  if (blank("callSummary")) {
    const summary = threadSummaryLine(thread);
    if (summary) put("callSummary", summary);
  }
  return patch;
}

// ─── Pure: the sales desk (SALES instance "default" ONLY) ───────────────────
//
// The 2026-09 leasing restructure: every NEW card on the sales board is owned
// by one of the two primary-processing girls, round-robin; when a client
// writes on a card a CLOSER owns, the closer gets a Telegram DM. None of this
// exists on the rental instance — every function here takes the instance (or
// is only called behind an instance gate in the pass) so the rental flow is
// byte-identical to before.

/** One ping per card per this window — a chatty client must not be a pager. */
export const ATTACH_PING_THROTTLE_MS = 45 * 60_000;
/** Throttle entries older than this are pruned on write (unbounded-map guard). */
export const ATTACH_PING_PRUNE_MS = 24 * 3600_000;

/**
 * Whose turn is it? `cursor` is the index of the NEXT assignee as persisted in
 * twenty_mirror_state (unbounded — taken mod the pool size, so a pool change
 * can never wedge it). The caller persists `nextCursor` ONLY after the card
 * was actually created: a failed create retries with the same girl on the
 * next pass instead of skipping her turn.
 */
export function nextGirlOwnerId(
  pool: readonly string[],
  cursor: number | null
): { ownerId: string | null; nextCursor: number } {
  if (pool.length === 0) return { ownerId: null, nextCursor: 0 };
  const idx = (((cursor ?? 0) % pool.length) + pool.length) % pool.length;
  return { ownerId: pool[idx] ?? null, nextCursor: idx + 1 };
}

export interface AttachPingDecision {
  ping: boolean;
  reason: string;
}

/**
 * Should the card's owner get a "client wrote" DM for this attach? All four
 * gates are business rules, in order: sales only, commit mode only, the note
 * must have actually gained lines (a no-op re-read pings nobody), and the
 * owner must be a CLOSER — the girls' cards never ping (their whole job is
 * the queue; new-card assignment notifies nobody either). Then the throttle.
 */
export function planOwnerAttachPing(input: {
  instance: TwentyInstanceKey;
  commit: boolean;
  wroteNewLines: boolean;
  ownerId: string | null;
  pingableOwnerIds: ReadonlySet<string>;
  lastPingAt: Date | null;
  now: Date;
  throttleMs?: number;
}): AttachPingDecision {
  if (input.instance !== "default") return { ping: false, reason: "not-sales" };
  if (!input.commit) return { ping: false, reason: "dry-run" };
  if (!input.wroteNewLines) return { ping: false, reason: "no-new-lines" };
  if (!input.ownerId) return { ping: false, reason: "no-owner" };
  if (!input.pingableOwnerIds.has(input.ownerId)) return { ping: false, reason: "owner-not-closer" };
  const throttle = input.throttleMs ?? ATTACH_PING_THROTTLE_MS;
  if (input.lastPingAt && input.now.getTime() - input.lastPingAt.getTime() < throttle) {
    return { ping: false, reason: "throttled" };
  }
  return { ping: true, reason: "due" };
}

/** Drop throttle entries older than maxAge (default 24h) — the map is persisted. */
export function pruneAttachPings(
  map: Record<string, string>,
  now: Date,
  maxAgeMs: number = ATTACH_PING_PRUNE_MS
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [cardId, iso] of Object.entries(map)) {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && now.getTime() - t < maxAgeMs) out[cardId] = iso;
  }
  return out;
}

/** The DM text: card label, the customer's own words (≤120 chars), deep link. */
export function buildAttachPingText(input: {
  leadNumber: string | null;
  name: string | null;
  customerLine: string | null;
  opportunityId: string;
  cardBaseUrl: string;
}): string {
  const label = input.leadNumber ? `#${input.leadNumber}` : (input.name ?? "card").slice(0, 60);
  const snippet = (input.customerLine ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const base = input.cardBaseUrl.replace(/\/$/, "");
  return `💬 Client wrote on your card ${label}: ${snippet}\n${base}/object/opportunity/${input.opportunityId}`;
}

/**
 * ONE growing note per thread — not per pass (2026-08-26, owner: "one
 * continuous note not hundreds"). The title used to carry `N msg` and the
 * last-activity timestamp, so every pass minted a brand-new note and a busy
 * card ended up buried under them. Both moving parts are gone from the key;
 * the lines still carry their own Dubai wall-clock stamps, so nothing is lost
 * from the reading order.
 */
export function buildThreadNote(
  thread: LeadThread,
  origin: LeadOrigin | null
): { title: string; body: string; lines: string[]; digits: string } {
  // A DIRECT WhatsApp chat folds into the customer's ONE continuous note —
  // the same title and the same `HH:MM ← text` line format the day-note pipe
  // (push-message.ts) writes. Owner 2026-08-27 (Ayham's #539 photo): the
  // relay's own "WhatsApp direct · …" note ran as a SECOND note per card and
  // duplicated every line the day note already had; the line-level dedupe
  // could not see it because the formats differed. Same title + same lines =
  // one note whichever producer lands first.
  //
  // 2026-08-29 (Ayham, card #593): MARKETPLACE-origin direct threads (the
  // Dubizzle/Meta enquiries) fold in too — the day-note pipe covers every
  // direct WhatsApp row both directions, so the relay's separate
  // "Dubizzle · <advertiser> · …<tail>" note was a THIRD writer duplicating
  // the same conversation. The origin still lands on the card (callSource),
  // only the note title stops carrying it. Groups and Telegram keep the
  // relay title below — the day-note pipe does not cover those streams.
  if (thread.channel === "whatsapp" && !thread.sourceContext) {
    const title = waNoteTitle(thread.digits);
    const lines: string[] = [];
    let lastDay = "";
    for (const l of thread.lines) {
      const dk = dayKey(l.at);
      if (dk !== lastDay) {
        lines.push(dayHeader(l.at));
        lastDay = dk;
      }
      // Render media through the SAME path push-message.ts uses, so the two
      // producers emit an identical line and the note's link-based dedupe
      // treats them as one message instead of filing the conversation twice.
      const rendered = l.mediaPath
        ? renderMediaLine(parseMediaText(l.body), mediaUrl(l.mediaPath), false)
        : l.body;
      if (rendered === null) continue; // "[no message]" artefact — drop the line
      lines.push(noteLine(l.direction ?? "inbound", l.at, rendered, l.speaker ?? thread.participantName));
    }
    const text = lines.join("\n");
    return { title, body: bodyWithWaLink(text.slice(0, 8000), thread.digits), lines, digits: thread.digits };
  }
  const label = leadSourceLabel(thread.channel, thread.sourceContext, origin, thread.contextChannel);
  // Meta threads: the key is `ig:<scopedId>` — the tail6 keeps the title
  // readable. Phone threads are byte-identical to before (full tail9).
  const meta = metaKeyParts(thread.key);
  const title = `${label} · …${meta ? meta.id.slice(-6) : thread.key}`;
  // Dubai wall time, same as the card title (owner 2026-08-19: UTC ISO
  // stamps read 4h behind the office clock — "times aren't accurate").
  const lines = thread.lines.map((l) => `[${callTimestamp(l.at.toISOString())}] ${l.body}`);
  const text = lines.join("\n");
  // digits is "" for Meta threads, so bodyWithWaLink prepends NO whatsapp link.
  return { title, body: bodyWithWaLink(text.slice(0, 8000), thread.digits), lines, digits: thread.digits };
}

/**
 * Write one note and target it at the opportunity (+ person when known) in
 * ONE batch call per object — the mechanics both the ATTACH branch and (since
 * the owner's bare-card review) the CREATE branch use.
 */
async function postThreadNote(
  client: TwentyClient,
  note: { title: string; body: string; lines: string[]; digits: string },
  opportunityId: string,
  personId: string | null
): Promise<DayNoteResult> {
  // Find-or-append against the thread's stable title. Lines already present
  // are skipped, so a re-run over the same window adds nothing — which is what
  // makes it safe to stop minting a note per pass. The RESULT matters beyond
  // the write: the sales-desk owner ping fires only when this actually added
  // lines (created || appended > 0), never on a no-op re-read.
  return ensureContinuousNote(client, {
    titleFor: (part) => (part <= 1 ? note.title : `${note.title} · #${part}`),
    digits: note.digits,
    lines: note.lines,
    personId,
    opportunityId,
    commit: true,
  });
}

// ─── Core pass (DB-agnostic, fully testable) ────────────────────────────────

export interface WaLeadRelaySource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  /** When the last catch-up sweep ran. Optional: a source without it never sweeps. */
  loadSweptAt?(): Promise<Date | null>;
  saveSweptAt?(at: Date): Promise<void>;
  /** Inbound whatsapp/telegram rows since `since`, oldest first. */
  loadRows(since: Date, limit: number): Promise<LeadRelayRow[]>;
  /**
   * BOTH-direction WhatsApp rows for one customer (full digits), oldest first
   * — pulled at note time so a card is born with the complete conversation,
   * not just the inbound half the checkpoint window saw. (Ayham 2026-08-29:
   * "the agent's replies are missing" — outbound rows arrived before the card
   * existed and the per-minute pipe had already consumed them as noDeal.)
   */
  loadRecentTwoWay?(digits: string, since: Date): Promise<LeadRelayRow[]>;
  /** tail9s of OUR people — tenant members' phones + NOTIFY_WA_PHONE_* env. */
  loadStaffTails(): Promise<Set<string>>;
}

export interface WaLeadRelayDeps {
  client: TwentyClient;
  twenty: RelayTwenty;
  instance: TwentyInstanceKey;
  tenantSlug: string;
  brandLine: string | null;
  opportunityFields: ReadonlySet<string>;
  source: WaLeadRelaySource;
  /**
   * One strict-JSON completion from the tenant's local model. Null = no
   * provider configured: the deterministic bar still runs, the threads it
   * rejects count as noise instead of getting a model verdict.
   */
  complete: ((system: string, user: string) => Promise<string>) | null;
  /**
   * The DeepSeek SECOND-OPINION completer. When set, threads the local judge
   * fails / returns-null / returns-negative on are escalated to DeepSeek, whose
   * verdict is final for that thread. Null = no second opinion (escalation
   * disabled; a local failure means skip, exactly as before).
   */
  completeDeepseek?: ((system: string, user: string) => Promise<string>) | null;
  /**
   * Serial allocator for NEW cards (platform sequence — race-safe across both
   * relays). Absent = cards are created unnumbered (tests, schema-poor
   * workspaces); present + the workspace has leadNumber → `#N` on the name.
   */
  nextLeadNumber?: LeadNumberSource;
  /**
   * WA line slug → Twenty workspaceMember id (the agent who runs that line).
   * Absent/null = cards stay unowned, exactly as before.
   */
  ownerIdForLine?: (lineSlug: string) => string | null;
  /**
   * MAIN LINES ONLY — every conversation a customer starts becomes a lead,
   * whatever they typed (Ayham 2026-09-28, relayed by the owner: "whatever
   * WhatsApp conversation was initiated regardless of the source or the
   * conversation content, it should create a card and distribute it").
   *
   * etm-website and cardiwan are the numbers on the websites and in the paid
   * ads, so nobody reaches them by accident — a bare "Hi" or an untouched
   * Instagram ad template is still a person who came looking to rent. The
   * qualifier reads both as containing no request and is RIGHT about the text;
   * this overrides it on those two lines only, and nowhere else.
   *
   * Costed before switching on: ~37 new conversations a day across both main
   * lines against ~31 leads already distributed — about 7 extra cards a day
   * over six agents. Kill-switch: MAINLINE_QUALIFY_ALL=off.
   */
  mainLineQualifyAll?: boolean;
  /**
   * SALES INSTANCE ("default") ONLY — the leasing desk (2026-09 restructure).
   * NEW cards go to the girls' round-robin; closers get a Telegram DM when a
   * client writes on their card. The runner wires this only for the default
   * instance and the pass ignores it anywhere else, so the rental flow is
   * byte-identical to before. All state lives behind load/save so the relay
   * (spawned --once every 2 min) survives process death.
   */
  salesDesk?: SalesDeskRouting;
  /**
   * RENTAL INSTANCE ("rental") ONLY — the main-line distributor (2026-09).
   * NEW cards on the main lines (etm-website / cardiwan) are dealt
   * round-robin over the AVAILABLE agents of the brand's rotation; the
   * customer gets one auto-reply and the agent + manager get WhatsApp
   * notifications. The runner wires this only for the rental instance and
   * the pass ignores it anywhere else, so the sales flow is byte-identical
   * to before. Absent (or RENTAL_DISTRIBUTOR=off) = today's fixed line-owner
   * behaviour.
   */
  rentalDesk?: RentalDeskRouting;
}

export interface SalesDeskRouting {
  /** Round-robin pool (workspaceMember ids) in rotation order. */
  girlPool: readonly string[];
  /** workspaceMember ids that receive "client wrote on your card" pings. */
  pingableOwnerIds: ReadonlySet<string>;
  /** Index of the next assignee (persisted); null = never assigned. */
  loadCursor(): Promise<number | null>;
  /** Persist the next-assignee index — MERGE into counts, never replace. */
  saveCursor(next: number): Promise<void>;
  /** cardId → last ping ISO (the 45-min throttle state). */
  loadPings(): Promise<Record<string, string>>;
  /** Persist the (already pruned) ping map — MERGE into counts, never replace. */
  savePings(map: Record<string, string>): Promise<void>;
  /**
   * Telegram DM to a workspaceMember. false = no resolvable chat (the caller
   * logs and skips — an unlinked owner is never an error).
   */
  sendOwnerPing(ownerId: string, text: string): Promise<boolean>;
  /** e.g. https://app.takeauto.tech — the deep link in the DM. */
  cardBaseUrl: string;
}

// ─── Rental main-line distribution (RENTAL instance "rental" ONLY) ──────────
//
// Ayham, 2026-09: the two rental MAIN lines (etm-website → ETM rotation,
// cardiwan → Cardiwan rotation — RENTAL_MAIN_LINES in modules/rental/rotation.ts)
// deal every NEW card round-robin to the next AVAILABLE agent of the brand's
// rotation. The customer gets ONE automatic WhatsApp reply from the same main
// line; the assigned agent gets a WhatsApp with the customer phone, the
// original message and the lead number; the manager is notified. The sweeper
// (platform/notify/rental-distributor.ts) enforces the acceptance window.
// All state lives behind load/save (the relay is spawned --once every 2 min)
// and every save MERGES into twenty_mirror_state.counts — never overwrite.

/** One tracked assignment — the sweeper's unit of work, keyed by opportunity id. */
export interface RentalAssignment {
  brand: RentalRotationKey;
  /** Main line the lead arrived on (the outbox brand_line for notifications). */
  line: string;
  tenantSlug: string;
  /** Current assignee (rotation agent, or the manager on an all-busy fallback). */
  agentName: string;
  memberId: string | null;
  phone: string | null;
  customerTail9: string;
  customerPhone: string;
  leadNumber: string | null;
  /** ISO — the acceptance clock starts at assignment. */
  assignedAt: string;
  /** ISO — set by the sweeper when the agent acted in time. */
  acceptedAt: string | null;
  /** Agents who let the window lapse on this card, oldest first. */
  ignoredNames: string[];
  /** true = terminal: accepted, card closed, or parked in the manager queue. */
  done: boolean;
  /** The card sits in the manager's queue (all agents busy/off) — no sweeping. */
  managerQueue?: boolean;
  /** true = recorded on the ATTACH path — a RETURNING customer writing again
   *  on a main line (Ayham, 2026-09-24), not a new lead. */
  returning?: boolean;
}

export interface RentalDeskRouting {
  /** Rotation roster for a brand, names already resolved to member ids. */
  rosterFor(brand: RentalRotationKey): readonly RotationAgent[];
  managerMemberIdFor(brand: RentalRotationKey): string | null;
  managerPhoneFor(brand: RentalRotationKey): string | null;
  managerNameFor(brand: RentalRotationKey): string | null;
  /** The one automatic customer reply (RENTAL_AUTOREPLY_TEXT). */
  autoReplyText: string;
  /** false = no customer greeting from the CRM (RENTAL_AUTOREPLY=off — the
   *  desk runs the native WhatsApp Business greeting instead). Absent = on. */
  autoReplyEnabled?: boolean;
  /** Single sender line for MANAGER notifications (RENTAL_NOTIFY_LINE).
   *  null/absent = notify from the lead's own main line. AGENT pings and the
   *  customer auto-reply never use this — they stay on the main line, so the
   *  agent sees the lead arrive from the number the customer wrote to. */
  notifyLine?: string | null;
  texts: DistributorTexts;
  /** Acceptance window (RENTAL_ACCEPT_TIMEOUT_MIN) — used in message text. */
  acceptWindowMs: number;
  /** Per-brand round-robin cursors (persisted; unbounded, mod roster size). */
  loadCursors(): Promise<Record<string, number>>;
  saveCursors(cursors: Record<string, number>): Promise<void>;
  /** name(lowercased) → toggle row; absent = available (see effectiveStatus). */
  loadAvailability(): Promise<Record<string, AgentAvailability>>;
  /** `<lineSlug>:<tail9>` → ISO of the auto-reply — the once-only mark. */
  loadAutoReplied(): Promise<Record<string, string>>;
  saveAutoReplied(map: Record<string, string>): Promise<void>;
  /** opportunity id → assignment (the sweeper's queue). */
  loadAssignments(): Promise<Record<string, RentalAssignment>>;
  saveAssignments(map: Record<string, RentalAssignment>): Promise<void>;
  /**
   * RETURNING customers (Ayham, 2026-09-24): the preferred agents per brand
   * (RENTAL_RETURNING_PREFERRED_*), already resolved against the roster.
   * Absent/empty = no preference — returning attaches use the plain rotation.
   */
  returningPreferredFor?(brand: RentalRotationKey): readonly RotationAgent[];
  /** Quiet time before the same card distributes again. Absent = 12h. */
  returningGapMs?: number;
  /** true = returning assignments also send the customer greeting.
   *  Absent = NO (RENTAL_RETURNING_AUTOREPLY, default off). */
  returningAutoReplyEnabled?: boolean;
  /** Per-brand preferred-list cursors (persisted beside rentalCursor). */
  loadReturningCursors?(): Promise<Record<string, number>>;
  saveReturningCursors?(cursors: Record<string, number>): Promise<void>;
  /**
   * Enqueue ONE wa_outbox row on a main line (the owning observer's bridge
   * drains it with its own ban-safety guards). false = could not enqueue
   * (e.g. the line's tenant is missing); the caller logs and moves on — a
   * notification must never fail a card create.
   */
  sendWhatsApp(input: {
    line: string;
    toDigits: string;
    text: string;
    dedupeKey: string;
  }): Promise<boolean>;
}

export interface WaLeadRelayPassOptions {
  /** false (default) = dry-run: ZERO Twenty writes, no checkpoint move. */
  commit?: boolean;
  since?: Date;
  /** Threads per pass. */
  batch?: number;
  /** Raw rows read per pass (before thread batching). */
  rowLimit?: number;
  /** First-ever run looks back this far. */
  sinceDays?: number;
  /** History every pass re-reads regardless of the checkpoint. */
  minLookbackMs?: number;
  /** How often a catch-up sweep runs. 0 disables sweeping. */
  sweepEveryMs?: number;
  /** How far back a sweep re-reads, ignoring the checkpoint. */
  sweepLookbackMs?: number;
  logger?: (line: string) => void;
}

export interface WaLeadRelayPassCounts {
  threads: number;
  /** Rows dropped because no honest phone keys them (group JIDs, tg ids). */
  skippedNoKey: number;
  skippedStaff: number;
  /** Supplier/competitor broadcast lists — see BROADCAST_BLOCKLIST. */
  skippedBlocked: number;
  qualifiedBar: number;
  qualifiedAI: number;
  /** Threads qualified by the DeepSeek second opinion (escalation overrode local). */
  qualifiedAIDeepseek: number;
  /** Threads escalated to DeepSeek for a second opinion (any outcome). */
  escalatedDeepseek: number;
  /** Failed both gates — ops chatter, broadcasts, small talk. */
  skippedNoise: number;
  /** Group threads (owner 2026-08-13: groups don't create cards; Yango excepted). */
  skippedGroup: number;
  /** Eligible threads left undecided because the batch cap bit. Holds the checkpoint. */
  droppedOverCap: number;
  created: number;
  attached: number;
  failed: number;
  firstError?: string;
  /** This pass was a catch-up sweep over the look-back window. */
  swept?: boolean;
  /** NEW sales cards assigned to a primary-processing girl (sales desk only). */
  girlAssigned: number;
  /** Closers pinged because a client wrote on their card (sales desk only). */
  ownerPings: number;
  /** Pings skipped — the owner has no resolvable Telegram chat. */
  ownerPingsSkipped: number;
  /** NEW rental main-line cards dealt to a rotation agent (rental desk only). */
  rentalAssigned: number;
  /** RETURNING customers on a main line dealt to an agent (rental desk only). */
  rentalReturningAssigned: number;
  /** Customer auto-replies sent from a main line (once per line+customer). */
  rentalAutoReplies: number;
  /** Main-line cards parked in the manager's queue — every agent busy/off. */
  rentalAllBusy: number;
}

const DEFAULT_BATCH = 50;
const DEFAULT_ROW_LIMIT = 500;
/** Every pass re-reads at least this much history — see `passSince`.
 *  Owner's number, 2026-08-31. Five minutes covers the transcript lag (~60s at
 *  worst) with room to spare; anything longer is the SWEEP's job, not the
 *  floor's. */
const DEFAULT_MIN_LOOKBACK_MS = 5 * 60_000;
const DEFAULT_SWEEP_EVERY_MS = 10 * 60_000;
const DEFAULT_SWEEP_LOOKBACK_MS = 6 * 3600_000;
/** A sweep reads a window many times wider than a 2-minute pass, so it is
 *  allowed many more rows — truncating a sweep would defeat its whole point. */
const SWEEP_ROW_LIMIT = 3000;

/**
 * Where the checkpoint may move after a pass — or null to HOLD it.
 *
 * A pass reads at most `rowLimit` rows and keeps at most `batch` threads. When
 * either cap bites, the surplus threads were never decided; advancing the
 * checkpoint past them loses those customers until they happen to message
 * again (owner 2026-08-30: "no batches … why keep them not posted"). Failures
 * already held the checkpoint for the same reason (audit 2026-08-14) — a
 * truncated pass is the same class of silent loss, so it holds too and the
 * next pass, five minutes later, drains the rest.
 */
export function checkpointAdvance(
  passStart: Date,
  pass: { failed: number; truncated: boolean }
): Date | null {
  if (pass.failed > 0 || pass.truncated) return null;
  return passStart;
}

/**
 * Is a catch-up SWEEP due?
 *
 * The checkpoint is how the relay KEEPS UP; it is not how it CATCHES UP. Every
 * fault found on 2026-08-31 ended the same way — something was skipped, the
 * checkpoint moved past it, and the lead stayed lost until a human re-ran the
 * pass by hand. The owner's answer to that: "the system shall do it
 * automatically … I thought it was a live system".
 *
 * So on a slow cadence a pass ignores the checkpoint and re-reads a whole
 * look-back window. It cannot duplicate anything — cards are keyed by
 * externalId and note lines dedupe — so all a sweep can do is surface what a
 * normal pass missed, whatever the reason.
 *
 * The relay is spawned with `--once` every two minutes, so this cannot be a
 * counter in memory: the decision comes from a timestamp stored beside the
 * checkpoint. A clock that jumped forward (or a restored backup) must not wedge
 * it shut, hence the future-timestamp arm.
 */
export function shouldSweep(lastSweptAt: Date | null, now: Date, everyMs: number): boolean {
  if (!lastSweptAt) return true;
  const elapsed = now.getTime() - lastSweptAt.getTime();
  if (elapsed < 0) return true;
  return elapsed >= everyMs;
}

/**
 * How far back a normal (non-sweep) pass reads.
 *
 * NOT simply the checkpoint. A checkpoint window only ever shows rows newer
 * than the previous pass, so anything skipped once — a placeholder judged
 * before its transcript landed, a thread dropped by a cap, a Twenty blip — is
 * not looked at again until the next SWEEP. That made the sweep interval the
 * real lead latency, and half an hour is not a CRM (owner, 2026-08-31: "that's
 * too slow, it's a CRM for a business").
 *
 * So every pass re-reads a FLOOR of recent history. Anything that goes wrong
 * inside the floor is retried on the very next pass, two minutes later, not in
 * half an hour. It is nearly free: `ensureContinuousNote` returns without
 * writing when a thread has no new lines, and the qualifier only runs for
 * threads with no open card.
 *
 * The checkpoint still governs the opposite case: after an outage it is OLDER
 * than the floor, and that gap must not be skipped — so take whichever reaches
 * further back.
 */
export function passSince(
  passStart: Date,
  checkpoint: Date | null,
  opts: { minLookbackMs: number; bootstrapMs: number }
): Date {
  if (!checkpoint) return new Date(passStart.getTime() - opts.bootstrapMs);
  const floor = new Date(passStart.getTime() - opts.minLookbackMs);
  return checkpoint < floor ? checkpoint : floor;
}

/**
 * Rows a pass may read. A sweep covers a window ~180x wider than a normal pass,
 * so it RAISES the runner's limit instead of obeying it.
 *
 * Written as `opts.rowLimit ?? SWEEP_ROW_LIMIT` first, which was dead code —
 * the runner always passes a rowLimit. Production showed it within minutes:
 * only the busiest tenant swept on every single pass, because its sweep read
 * past 500 rows, counted itself truncated, and a truncated sweep does not mark
 * itself done. Quiet tenants swept once and looked perfectly healthy.
 */
export function rowLimitFor(sweeping: boolean, requested: number | undefined): number {
  const asked = requested ?? DEFAULT_ROW_LIMIT;
  return sweeping ? Math.max(asked, SWEEP_ROW_LIMIT) : asked;
}

/**
 * The customer's half of a conversation.
 *
 * Judging has to hear the whole conversation — a lead that opens "Hi good
 * morning" and asks the price hours later is invisible in any single window —
 * but the conversation is TWO-WAY, and our own half is price lists ("Available
 * today: Mercedes CLE 450 …"). Score those and every thread qualifies, so the
 * board fills with our own broadcasts. The note keeps both sides; the verdict
 * hears only the customer.
 *
 * A line with no direction counts as the customer's: window rows are inbound by
 * construction and only the two-way history labels the other side.
 */
export function customerLinesOnly<T extends { lines: { direction?: string }[] }>(
  thread: T
): T {
  return { ...thread, lines: thread.lines.filter((l) => l.direction !== "outbound") };
}

/**
 * When the LEAD arrived — the customer's first word, not our pass.
 *
 * The card used to be stamped `input.now`, i.e. the moment the relay happened
 * to create it. For a conversation that opens with "Hi good morning" and only
 * says what it wants hours later, that is a lie of exactly that many hours:
 * card #23's customer wrote at 11:26 and the card reads 15:05 (Ayham,
 * 2026-09-01, "the lead came at 1, you write at 3"). A board stamped with our
 * own timings is a log of when the machinery looked, not of when business
 * happened.
 */
export function threadStartedAt(thread: {
  lines: { at: Date }[];
  lastActivityAt: Date;
}): Date {
  let earliest: Date | null = null;
  for (const l of thread.lines) {
    if (!earliest || l.at < earliest) earliest = l.at;
  }
  return earliest ?? thread.lastActivityAt;
}

function emptyCounts(): WaLeadRelayPassCounts {
  return {
    threads: 0,
    skippedNoKey: 0,
    skippedStaff: 0,
    skippedBlocked: 0,
    qualifiedBar: 0,
    qualifiedAI: 0,
    qualifiedAIDeepseek: 0,
    escalatedDeepseek: 0,
    skippedNoise: 0,
    skippedGroup: 0,
    droppedOverCap: 0,
    created: 0,
    attached: 0,
    failed: 0,
    girlAssigned: 0,
    ownerPings: 0,
    ownerPingsSkipped: 0,
    rentalAssigned: 0,
    rentalReturningAssigned: 0,
    rentalAutoReplies: 0,
    rentalAllBusy: 0,
  };
}

/** Auto-reply marks older than this are pruned on write (bounded-map guard). */
export const AUTOREPLY_MARK_PRUNE_MS = 180 * 86_400_000;
/** Done assignments older than this are pruned on write (the sweeper prunes). */
export const ASSIGNMENT_PRUNE_MS = 14 * 86_400_000;

/** Drop auto-reply marks older than maxAge (default 180d) — the map is persisted. */
export function pruneAutoReplied(
  map: Record<string, string>,
  now: Date,
  maxAgeMs: number = AUTOREPLY_MARK_PRUNE_MS
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, iso] of Object.entries(map)) {
    const t = new Date(iso).getTime();
    if (Number.isFinite(t) && now.getTime() - t < maxAgeMs) out[key] = iso;
  }
  return out;
}

/** Drop DONE assignments whose clock started more than maxAge ago (default 14d). */
export function pruneRentalAssignments(
  map: Record<string, RentalAssignment>,
  now: Date,
  maxAgeMs: number = ASSIGNMENT_PRUNE_MS
): Record<string, RentalAssignment> {
  const out: Record<string, RentalAssignment> = {};
  for (const [oppId, a] of Object.entries(map)) {
    const t = new Date(a.assignedAt).getTime();
    if (a.done && Number.isFinite(t) && now.getTime() - t >= maxAgeMs) continue;
    out[oppId] = a;
  }
  return out;
}

/**
 * May an ATTACH on a main line distribute this card to an agent? (Ayham,
 * 2026-09-24 — a returning customer is dealt like a new lead, but a chatty
 * one must not re-ping on every message.)
 *
 *   "ok"   — no assignment exists, or the last one finished ≥ gapMs ago
 *            (a customer who went quiet and writes again = a new visit);
 *   "live" — an assignment is still being enforced by the sweeper: never
 *            re-distribute over it;
 *   "gap"  — the last assignment finished < gapMs ago: the agent is already
 *            on this customer, another ping is spam.
 *
 * The decision reads only the PERSISTED assignment record (acceptedAt, else
 * the last assignedAt = the last time we pinged anyone about this card), so
 * it survives process death — the relay is spawned --once per beat.
 */
export function returningAssignGate(
  assignment: RentalAssignment | undefined,
  now: Date,
  gapMs: number
): "ok" | "live" | "gap" {
  if (!assignment) return "ok";
  if (!assignment.done) return "live";
  const last = Date.parse(assignment.acceptedAt ?? assignment.assignedAt);
  if (!Number.isFinite(last)) return "ok";
  return now.getTime() - last >= gapMs ? "ok" : "gap";
}

/**
 * The distributor's commit-side fan-out for one freshly CREATED main-line
 * card: persist the assignment (the sweeper's unit of work), persist the
 * rotation cursor, send the ONE customer auto-reply (marked per line+customer
 * so it never fires twice), and notify the agent + manager on WhatsApp from
 * the same main line. A failure in any notification is logged and swallowed —
 * the card is the lead; the messages are a courtesy around it.
 */
async function commitRentalAssignment(args: {
  desk: RentalDeskRouting;
  brand: RentalRotationKey;
  thread: LeadThread;
  heard: LeadThread;
  opportunityId: string;
  leadNumber: string | null;
  pick: { agent: RotationAgent; nextCursor: number } | null;
  allBusy: boolean;
  managerMemberId: string | null;
  tenantSlug: string;
  passStart: Date;
  cursors: Record<string, number>;
  autoReplied: Record<string, string>;
  assignments: Record<string, RentalAssignment>;
  counts: WaLeadRelayPassCounts;
  log: (line: string) => void;
  /** true = ATTACH-path distribution of a RETURNING customer (Ayham,
   *  2026-09-24): the "returning" texts, per-agent dedupe keys (the create
   *  ping's `assign:<oppId>` already fired), and NO customer auto-reply
   *  unless the desk opts in (returningAutoReplyEnabled). */
  returning?: boolean;
  /** Sender line override — a returning assignment sends from the MAIN LINE
   *  the window saw, which may differ from thread.lineSlug when the newest
   *  row arrived on an agent's personal line (card #923). */
  line?: string;
}): Promise<void> {
  const { desk, brand, thread, opportunityId } = args;
  const line = args.line ?? thread.lineSlug!;
  const leadLabel = args.leadNumber ? `#${args.leadNumber}` : "—";
  const minutes = Math.round(desk.acceptWindowMs / 60_000);
  const managerName = desk.managerNameFor(brand) ?? "manager";
  const assigneeName = args.pick?.agent.name ?? managerName;
  const assigneeMemberId = args.pick?.agent.memberId ?? args.managerMemberId;
  const assigneePhone = args.pick?.agent.phone ?? desk.managerPhoneFor(brand);

  args.assignments[opportunityId] = {
    brand,
    line,
    tenantSlug: args.tenantSlug,
    agentName: assigneeName,
    memberId: assigneeMemberId,
    phone: assigneePhone,
    customerTail9: thread.key,
    customerPhone: thread.digits,
    leadNumber: args.leadNumber,
    assignedAt: args.passStart.toISOString(),
    acceptedAt: null,
    ignoredNames: [],
    // A manager-queue card is terminal for the sweeper — a human assigns it.
    done: args.allBusy,
    managerQueue: args.allBusy || undefined,
    returning: args.returning || undefined,
  };
  try {
    await desk.saveAssignments(args.assignments);
    if (args.pick) await desk.saveCursors(args.cursors);
  } catch (e) {
    args.log(`[wa-lead-relay] rental distributor state save failed: ${(e as Error).message.slice(0, 120)}`);
  }

  // The ONE automatic customer reply. The mark (`<line>:<tail9>`) is written
  // ONLY after a successful enqueue: a DB blip loses the reply, loudly, rather
  // than risking a duplicate to the customer. The outbox's own pending-dedupe
  // index (board_item_id + content_hash) is the second layer. A RETURNING
  // customer gets NO greeting by default — he is mid-relationship, not a new
  // lead (RENTAL_RETURNING_AUTOREPLY=on opts back in).
  const replyKey = `${line}:${thread.key}`;
  const wantAutoReply = args.returning
    ? desk.returningAutoReplyEnabled === true
    : desk.autoReplyEnabled !== false;
  if (wantAutoReply && !args.autoReplied[replyKey] && !metaKeyParts(thread.key)) {
    try {
      const sent = await desk.sendWhatsApp({
        line,
        toDigits: thread.digits,
        text: desk.autoReplyText,
        dedupeKey: `autoreply:${replyKey}`,
      });
      if (sent) {
        args.autoReplied[replyKey] = args.passStart.toISOString();
        await desk.saveAutoReplied(pruneAutoReplied(args.autoReplied, args.passStart));
        args.counts.rentalAutoReplies++;
        args.log(`[wa-lead-relay] auto-reply queued on ${line} for …${thread.key}`);
      } else {
        args.log(`[wa-lead-relay] auto-reply NOT queued on ${line} for …${thread.key} — outbox unavailable`);
      }
    } catch (e) {
      args.log(`[wa-lead-relay] auto-reply failed on ${line}: ${(e as Error).message.slice(0, 120)}`);
    }
  }

  const vars = {
    lead: leadLabel,
    phone: `+${thread.digits}`,
    agent: assigneeName,
    brand,
    minutes,
    message: substantiveLine(args.heard.lines.map((l) => l.body)) ?? "",
  };
  const notify = async (
    toDigits: string | null,
    text: string,
    dedupeKey: string,
    what: string,
    audience: "agent" | "manager"
  ) => {
    if (!toDigits) {
      args.log(`[wa-lead-relay] ${what} skipped — no WhatsApp number configured`);
      return;
    }
    // Agents hear from the MAIN LINE the customer wrote to (owner, 2026-09-17:
    // "agents receive the leads from the main line numbers itself"); the
    // manager hears from the ONE bot line (Ayham, same day).
    const fromLine = audience === "manager" ? (desk.notifyLine ?? line) : line;
    try {
      const sent = await desk.sendWhatsApp({ line: fromLine, toDigits, text, dedupeKey });
      if (!sent) args.log(`[wa-lead-relay] ${what} NOT queued — outbox unavailable`);
    } catch (e) {
      args.log(`[wa-lead-relay] ${what} failed: ${(e as Error).message.slice(0, 120)}`);
    }
  };

  if (args.pick) {
    // The assigned agent: customer phone, their original message, the lead
    // number, and the acceptance window (Ayham's spec, verbatim). The reply
    // hint is appended in code (not the env text) so a RENTAL_TEXT_* override
    // can't drop the accept/decline commands (Ayham, 2026-09-19).
    // A RETURNING assignment uses its own text (it must read "this customer
    // came BACK", not "new lead") and the per-agent dedupe key — the create
    // ping's bare `assign:<oppId>` already fired for this card. That key
    // shape is also what the sweeper's 👍-acceptance probe joins on.
    await notify(
      args.pick.agent.phone,
      renderText(args.returning ? desk.texts.agentReturning : desk.texts.agentAssigned, vars) + AGENT_REPLY_HINT,
      args.returning ? `assign:${opportunityId}:${args.pick.agent.name}` : `assign:${opportunityId}`,
      `agent assignment ping (${args.pick.agent.name})`,
      "agent"
    );
    await notify(
      desk.managerPhoneFor(brand),
      renderText(args.returning ? desk.texts.managerReturning : desk.texts.managerAssigned, vars),
      args.returning ? `mgr-returning:${opportunityId}:${args.pick.agent.name}` : `mgr-assigned:${opportunityId}`,
      "manager assigned notice",
      "manager"
    );
  } else {
    // ALL agents busy/off: the card is in the manager's queue — say so, with
    // the steering commands ("#n <name>" reactivates a queued card).
    args.counts.rentalAllBusy++;
    await notify(
      desk.managerPhoneFor(brand),
      renderText(desk.texts.managerAllBusy, vars) + renderText(MANAGER_STEER_HINT, vars),
      `mgr-allbusy:${opportunityId}`,
      "manager all-busy notice",
      "manager"
    );
  }
}

export async function runWaLeadRelayPass(
  deps: WaLeadRelayDeps,
  opts: WaLeadRelayPassOptions = {}
): Promise<WaLeadRelayPassCounts> {
  const { client, twenty, source } = deps;
  const commit = opts.commit ?? false;
  const log = opts.logger ?? (() => {});
  const counts = emptyCounts();

  // The pass start, captured BEFORE any read: on commit the checkpoint moves
  // here (not to now) so rows created mid-pass are seen by the next one.
  const passStart = new Date();
  const checkpoint = await source.loadCheckpoint();

  // Sales desk state (2026-09 leasing restructure). Undefined on ANY other
  // instance than "default" — even if a misconfigured runner passes one — so
  // the rental flow below is byte-identical to before. The cursor and the ping
  // throttle are read once per pass and written back only on a successful
  // commit (merge pattern in the store — see createSalesDeskRoutingStore).
  const salesDesk = deps.instance === "default" ? deps.salesDesk : undefined;
  let girlCursor = salesDesk ? ((await salesDesk.loadCursor()) ?? 0) : 0;
  let attachPings: Record<string, string> = salesDesk ? await salesDesk.loadPings() : {};

  // Rental main-line distribution (2026-09). Undefined on ANY other instance
  // than "rental" — even if a misconfigured runner passes one — so the sales
  // flow below is byte-identical to before. All four state slices are read
  // once per pass and persisted only after a successful commit, MERGED into
  // the shared twenty_mirror_state row (see createRentalDistributionStore).
  const rentalDesk = deps.instance === "rental" ? deps.rentalDesk : undefined;
  let rentalCursors: Record<string, number> = {};
  let rentalAvailability: Record<string, AgentAvailability> = {};
  let autoReplied: Record<string, string> = {};
  let rentalAssignments: Record<string, RentalAssignment> = {};
  let rentalReturningCursors: Record<string, number> = {};
  if (rentalDesk) {
    rentalCursors = await rentalDesk.loadCursors();
    rentalAvailability = await rentalDesk.loadAvailability();
    autoReplied = await rentalDesk.loadAutoReplied();
    rentalAssignments = await rentalDesk.loadAssignments();
    rentalReturningCursors = (await rentalDesk.loadReturningCursors?.()) ?? {};
  }
  // One loud log per pass per brand when a main line has no usable rotation.
  const rentalRosterWarned = new Set<string>();

  // An explicit --since is a human asking for one specific window; never turn
  // that into a sweep.
  const sweepEvery = opts.sweepEveryMs ?? DEFAULT_SWEEP_EVERY_MS;
  const sweeping =
    !opts.since &&
    sweepEvery > 0 &&
    source.loadSweptAt != null &&
    shouldSweep(await source.loadSweptAt(), passStart, sweepEvery);
  const sweepSince = new Date(passStart.getTime() - (opts.sweepLookbackMs ?? DEFAULT_SWEEP_LOOKBACK_MS));

  const since =
    opts.since ??
    (sweeping
      ? sweepSince
      : passSince(passStart, checkpoint, {
          minLookbackMs: opts.minLookbackMs ?? DEFAULT_MIN_LOOKBACK_MS,
          bootstrapMs: (opts.sinceDays ?? 3) * 86_400_000,
        }));
  counts.swept = sweeping;

  const rowLimit = rowLimitFor(sweeping, opts.rowLimit);
  const rows = await source.loadRows(since, rowLimit);
  // A full read means there were probably more rows behind the limit.
  const rowsTruncated = rows.length >= rowLimit;
  const { threads, skippedNoKey } = buildThreads(rows);
  counts.skippedNoKey = skippedNoKey;

  const staff = await source.loadStaffTails();
  const eligible = [...threads.values()]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .filter((t) => {
      // Groups first (owner 2026-08-13): no card, no note, no AI spend.
      if (!groupCardEligible(t.sourceContext)) {
        counts.skippedGroup++;
        return false;
      }
      if (staff.has(t.key)) {
        counts.skippedStaff++;
        return false;
      }
      if (blockedBroadcastSender(t.key)) {
        counts.skippedBlocked++;
        return false;
      }
      return true;
    });
  const batch = opts.batch ?? DEFAULT_BATCH;
  const dropped = Math.max(0, eligible.length - batch);
  const merged = eligible.slice(0, batch);
  counts.threads = merged.length;
  counts.droppedOverCap = dropped;
  const truncated = dropped > 0 || rowsTruncated;
  if (truncated) {
    log(
      `[wa-lead-relay] TRUNCATED pass — ${dropped} thread(s) over the ${batch} cap` +
        `${rowsTruncated ? `, rows hit the ${rowLimit} limit` : ""}; checkpoint held so they are not lost`
    );
  }

  if (merged.length > 0) {
    // tail9 → opportunity, server-side filtered (NEVER a full crawl — the
    // sales book is ~79k deals, see deal-link.ts). Brand-scoped: Cardiwan and
    // EasyRent share the rental workspace AND share customers. Meta threads
    // (`ig:`/`fb:` keys) are excluded — they carry no tail9, and their match
    // is found by externalId per-thread below instead.
    const phoneKeys = merged.map((t) => t.key).filter((k) => !metaKeyParts(k));
    const phoneIndex =
      phoneKeys.length > 0 ? await fetchOpportunitiesForTails(client, phoneKeys, deps.brandLine) : new Map<string, OpportunityMatch>();

    for (const thread of merged) {
      try {
        // ── The CONVERSATION is the unit of judgement, not the window.
        //    A customer who opens "Hi good morning" and asks the price three
        //    hours later is invisible in any single pass; both halves were
        //    filed NOISE and the lead never existed (Ayham, 2026-09-01). The
        //    customer's recent history is pulled in FIRST, and the verdict
        //    hears only their side — our own replies are price lists and would
        //    qualify everything (see customerLinesOnly).
        const full = await withTwoWayLines(thread, deps.source);
        const heard = customerLinesOnly(full);

        // ── The match, BEFORE the verdict: the returning-customer rule needs
        //    it. Phone threads read the batch index; a Meta thread's card is
        //    found by its externalId root (`ig-lead:<tenant>:<scopedId>`) —
        //    open or closed, that lookup IS the whole identity.
        const meta = metaKeyParts(thread.key);
        const match = meta
          ? await metaCardMatch(twenty, deps.tenantSlug, thread.key)
          : (phoneIndex.get(thread.key) ?? null);

        // ── Qualify: deterministic bar first, then the local model, then
        //    (option B) a DeepSeek second opinion for the threads the local
        //    judge failed / returned-null / said NOT qualified on.
        const det = qualifyThreadBySignals(heard);
        let qualifiedBy: "bar" | "ai" | null = det.qualified ? "bar" : null;
        let verdict: LeadVerdict | null = null;
        let verdictEngine: "local" | "deepseek" | null = null;
        if (!qualifiedBy && deps.complete) {
          const prompt = buildLeadPrompt(heard);
          const outcome = await judgeThreadWithEscalation(
            prompt,
            deps.complete,
            deps.completeDeepseek ?? null
          );
          if (outcome.escalated) {
            counts.escalatedDeepseek++;
            log(`[wa-lead-relay] DEEPSEEK …${thread.key} ${deepseekSummary(outcome)}`);
          }
          if (outcome.failed) {
            // DeepSeek failing = local failing: skip, never invent a lead.
            counts.failed++;
            counts.firstError ??= `model/${thread.key}: ${(outcome.error ?? "judge failed").slice(0, 160)}`;
            continue;
          }
          verdict = outcome.verdict;
          verdictEngine = outcome.engine;
          if (verdictQualifies(verdict)) qualifiedBy = "ai";
        }
        // A closed-deal customer writing again is a lead by that fact alone.
        if (!qualifiedBy && returningCustomerQualifies(heard, match)) {
          qualifiedBy = "bar";
        }
        // A conversation opened on a PUBLIC main line is a lead by that fact
        // alone — see WaLeadRelayDeps.mainLineQualifyAll.
        if (!qualifiedBy && deps.mainLineQualifyAll && mainLineRotation(thread.lineSlug)) {
          qualifiedBy = "bar";
          log(`[wa-lead-relay] MAINLINE …${thread.key} ${thread.lineSlug} — opened a conversation, qualifying`);
        }
        if (!qualifiedBy) {
          counts.skippedNoise++;
          log(`[wa-lead-relay] NOISE …${thread.key} ${thread.channel} (${heard.lines.length} lines heard)`);
          continue;
        }
        if (qualifiedBy === "bar") counts.qualifiedBar++;
        else if (verdictEngine === "deepseek") counts.qualifiedAIDeepseek++;
        else counts.qualifiedAI++;

        // ── New vs continuation. Idempotency FIRST: a retried pass must find
        //    its own card by externalId before any create happens.
        // A customer whose ONLY cards are closed is coming back, and a return
        // is a new lead — so their key carries the day. Without this the
        // "fresh card" below was upserted onto the closed card by its own
        // externalId and the enquiry disappeared into a finished deal (Ayham,
        // 2026-08-31). rental-automations then stages it RETURNING_LEAD and
        // attaches the prior history, which only ever fires on a NEW card.
        const returningOn = match && !match.open ? thread.lastActivityAt : undefined;
        const leadExternalId = meta
          ? metaLeadOpportunityExternalId(deps.tenantSlug, thread.key, returningOn)
          : waLeadOpportunityExternalId(deps.tenantSlug, thread.key, returningOn);
        const existingLeadCard =
          match?.open
            ? null
            : await twenty.findOpportunityByExternalId(
                leadExternalId
              );
        // Meta threads have no phone: no tail9 person lookup (there is nothing
        // to look up BY), the person is created fresh with the ig/fb key.
        const existingPerson = meta ? null : await twenty.findPersonByTail9(thread.key);
        const lineOwnerId =
          thread.lineSlug && deps.ownerIdForLine ? deps.ownerIdForLine(thread.lineSlug) : null;
        // Sales desk (2026-09): a NEW card on the sales board goes to the
        // girls' round-robin, whoever the line belongs to — they ARE the
        // queue, and a returning customer's fresh card (closed-only match) is
        // a NEW card here, so it rotates too. An ATTACH leaves the owner
        // alone; the enrich below still blank-fills from the line, exactly as
        // before — a girl-created card is owned from birth, and a legacy
        // unowned card picking up its line owner on attach is pre-existing
        // behaviour this change deliberately does not touch.
        const willAttach = Boolean(match?.open) || Boolean(existingLeadCard);
        const girlPick =
          salesDesk && !willAttach ? nextGirlOwnerId(salesDesk.girlPool, girlCursor) : null;
        // Rental main-line distribution (Ayham, 2026-09): a NEW card born on a
        // main line (etm-website / cardiwan) is dealt round-robin to the next
        // AVAILABLE agent of that brand's rotation — Busy/Off-duty agents are
        // skipped. An ATTACH never redistributes (same rule as the girls).
        // Empty rotation → the card keeps the line owner, logged loud once per
        // pass; every agent unavailable → the brand manager's queue.
        const rentalBrand =
          rentalDesk && !willAttach ? mainLineRotation(thread.lineSlug) : null;
        let rentalPick: { agent: RotationAgent; nextCursor: number } | null = null;
        let rentalAllBusy = false;
        if (rentalDesk && rentalBrand) {
          const roster = rentalDesk.rosterFor(rentalBrand);
          if (roster.length === 0) {
            if (!rentalRosterWarned.has(rentalBrand)) {
              rentalRosterWarned.add(rentalBrand);
              log(
                `[wa-lead-relay] RENTAL rotation '${rentalBrand}' is EMPTY — ` +
                  `main-line leads keep line owners (set RENTAL_ROTATION_${rentalBrand.toUpperCase()})`
              );
            }
          } else {
            rentalPick = nextAvailableAgent(
              roster,
              rentalAvailability,
              rentalCursors[rentalBrand] ?? 0,
              passStart
            );
            rentalAllBusy = !rentalPick;
          }
        }
        const rentalManagerId =
          rentalAllBusy && rentalBrand && rentalDesk
            ? rentalDesk.managerMemberIdFor(rentalBrand)
            : null;
        const ownerId =
          girlPick?.ownerId ?? rentalPick?.agent.memberId ?? rentalManagerId ?? lineOwnerId;
        const plan = planLeadProjection({
          // The customer's own lines: the card is stamped with when THEY
          // arrived (threadStartedAt), which is the whole point of widening.
          thread: heard,
          qualifiedBy,
          match,
          existingLeadCardId: existingLeadCard?.id ?? null,
          leadExternalId,
          existingPersonId: existingPerson?.id ?? null,
          opportunityFields: deps.opportunityFields,
          instance: deps.instance,
          tenantSlug: deps.tenantSlug,
          brandLine: deps.brandLine,
          signals: det.signals,
          origin: det.origin,
          now: passStart,
          ownerId,
          // The acceptance clock stamp — distributor-decided cards only
          // (assigned or parked in the manager queue). The field gate in
          // planLeadProjection drops it where Ops has not created assignedAt.
          assignedAt: rentalBrand && (rentalPick || rentalAllBusy) ? passStart : undefined,
        });

        if (plan.action === "workspace_broken") {
          counts.failed++;
          counts.firstError ??= `metadata missing: ${plan.missing.join(", ")}`;
          continue;
        }

        const via =
          qualifiedBy === "bar"
            ? "signals"
            : verdictEngine === "deepseek"
              ? `ai(deepseek) conf=${verdict?.confidence.toFixed(2)}`
              : `ai conf=${verdict?.confidence.toFixed(2)}`;

        // A card's note must carry BOTH directions, not just the inbound rows
        // the checkpoint window saw (Ayham 2026-08-29: "the agent's replies
        // are missing"). The day-pipe dedupes by exact line, so overlapping
        // rows cost nothing; the replies it already wrote stay untouched.
        const noteThread = full;   // already loaded above — one fetch, not two

        if (plan.action === "attach") {
          // The index carries no field values — read the card as it is NOW so
          // the enrich only fills blanks (1 request, bounded by batch).
          // `null` = the read FAILED: post the note only. Patching from an
          // assumed-empty card would clobber manager-entered fields (amount,
          // carModels, callSummary…) with lead guesses (audit 2026-08-14).
          let existing: Record<string, unknown> | null = null;
          try {
            const res = await client.get<Record<string, Record<string, unknown>>>(
              `opportunities/${plan.opportunityId}`
            );
            existing = (res?.data?.opportunity ?? {}) as Record<string, unknown>;
          } catch {
            /* note still lands below */
          }
          const patch =
            existing === null
              ? {}
              : planWaLeadEnrich({
                  existing,
                  thread,
                  signals: det.signals,
                  opportunityFields: deps.opportunityFields,
                  ownerId,
                });
          const note = buildThreadNote(noteThread, det.origin);

          // ── Rental main-line RETURNING-customer distribution (Ayham,
          //    2026-09-24). An attach whose window saw a MAIN-LINE inbound and
          //    whose card has NO live assignment is dealt like a NEW lead: the
          //    brand's preferred agent(s) first (RENTAL_RETURNING_PREFERRED_*,
          //    a comma list is a round-robin), the plain rotation as the
          //    fallback, the manager queue when nobody is available. The line
          //    is the newest MAIN-LINE row of the window — NOT thread.lineSlug,
          //    which keys on the newest row overall (a customer who wrote the
          //    main line and then an agent's personal line is still a main-line
          //    visit — card #923). The gap throttle (persisted assignment
          //    record, not memory) keeps a chatty customer from re-pinging an
          //    agent on every message. Decided BEFORE the commit check,
          //    exactly like the CREATE-path pick, so a dry-run logs the same
          //    decision.
          const returningLine =
            rentalDesk
              ? ([thread.lineSlug, ...(thread.lineSlugs ?? [])]
                  .filter((s): s is string => !!s)
                  .find((s) => mainLineRotation(s)) ?? null)
              : null;
          const returningBrand = returningLine ? mainLineRotation(returningLine) : null;
          let returningPick: { agent: RotationAgent; via: "preferred" | "rotation" } | null = null;
          let returningAllBusy = false;
          // CREATE-then-ATTACH race guard (Ayham, 2026-10-02: #1770 was pinged
          // TWICE — 🆕 by the create pass, 🔁 by the attach pass two minutes
          // later). Concurrent --once passes load the assignment map BEFORE
          // the create pass saves its record, so the local record alone cannot
          // see a just-assigned card. The fresh card read above can: created
          // inside the gap window AND already owned = the create path assigned
          // it — skip. An old reopened card (created long ago) is unaffected.
          const justCreatedAndOwned = Boolean(
            existing &&
              typeof existing.ownerId === "string" &&
              existing.ownerId &&
              typeof existing.createdAt === "string" &&
              Number.isFinite(Date.parse(existing.createdAt as string)) &&
              passStart.getTime() - Date.parse(existing.createdAt as string) <
                (rentalDesk?.returningGapMs ?? DEFAULT_RETURNING_GAP_MS)
          );
          if (rentalDesk && returningBrand && justCreatedAndOwned) {
            log(
              `[wa-lead-relay] …${thread.key} attach on ${returningLine} — returning distribution SKIPPED ` +
                `(just created by the create pass, already owned)`
            );
          }
          if (rentalDesk && returningBrand && !justCreatedAndOwned) {
            const gate = returningAssignGate(
              rentalAssignments[plan.opportunityId],
              passStart,
              rentalDesk.returningGapMs ?? DEFAULT_RETURNING_GAP_MS
            );
            if (gate !== "ok") {
              log(
                `[wa-lead-relay] …${thread.key} attach on ${returningLine} — returning distribution SKIPPED ` +
                  `(assignment ${gate === "live" ? "is live" : "inside the gap"})`
              );
            } else {
              const roster = rentalDesk.rosterFor(returningBrand);
              if (roster.length === 0) {
                if (!rentalRosterWarned.has(returningBrand)) {
                  rentalRosterWarned.add(returningBrand);
                  log(
                    `[wa-lead-relay] RENTAL rotation '${returningBrand}' is EMPTY — ` +
                      `returning customers keep the card's owner (set RENTAL_ROTATION_${returningBrand.toUpperCase()})`
                  );
                }
              } else {                const pick = planReturningPick({
                  preferred: rentalDesk.returningPreferredFor?.(returningBrand) ?? [],
                  preferredCursor: rentalReturningCursors[returningBrand] ?? 0,
                  roster,
                  rosterCursor: rentalCursors[returningBrand] ?? 0,
                  availability: rentalAvailability,
                  now: passStart,
                });
                if (pick) {
                  returningPick = { agent: pick.agent, via: pick.via };
                  // Advance-on-decision / persist-on-commit, same rule as the
                  // CREATE path — and ONLY the cursor that was used moves.
                  if (pick.via === "preferred") rentalReturningCursors[returningBrand] = pick.nextCursor;
                  else rentalCursors[returningBrand] = pick.nextCursor;
                } else {
                  returningAllBusy = true;
                }
              }
            }
          }

          log(
            `[wa-lead-relay] ${commit ? "ATTACH" : "DRY   "} …${thread.key} ${via} → opp ${plan.opportunityId}` +
              (returningPick ? ` returning→${returningPick.agent.name}(${returningPick.via})` : "") +
              (returningAllBusy ? ` returning→manager-queue(${returningBrand})` : "") +
              (verdict ? ` evidence="${verdict.evidence[0]?.slice(0, 80)}"` : "")
          );
          if (commit) {
            const noteResult = await postThreadNote(client, note, plan.opportunityId, existingPerson?.id ?? null);
            if (Object.keys(patch).length > 0) {
              await twenty.patchOpportunity(plan.opportunityId, patch);
            }
            // Sales desk: the client wrote on an OPEN card — tell the closer.
            // Only when the note actually gained lines (a re-read of the
            // lookback floor pings nobody), throttled per card, and never for
            // the girls (their whole job is the queue).
            if (salesDesk) {
              const cardOwner = typeof existing?.ownerId === "string" ? existing.ownerId : null;
              const lastPing = attachPings[plan.opportunityId];
              const decision = planOwnerAttachPing({
                instance: deps.instance,
                commit: true,
                wroteNewLines: noteResult.created || noteResult.appended > 0,
                ownerId: cardOwner,
                pingableOwnerIds: salesDesk.pingableOwnerIds,
                lastPingAt: lastPing ? new Date(lastPing) : null,
                now: passStart,
              });
              if (decision.ping && cardOwner) {
                // The customer's newest line is what the owner needs to see.
                const lastCustomerLine =
                  [...heard.lines].reverse().map((l) => l.body.trim()).find((b) => b.length > 0) ?? null;
                const text = buildAttachPingText({
                  leadNumber: typeof existing?.leadNumber === "string" && existing.leadNumber.trim() ? existing.leadNumber.trim() : null,
                  name: typeof existing?.name === "string" ? existing.name : null,
                  customerLine: lastCustomerLine,
                  opportunityId: plan.opportunityId,
                  cardBaseUrl: salesDesk.cardBaseUrl,
                });
                try {
                  const sent = await salesDesk.sendOwnerPing(cardOwner, text);
                  if (sent) {
                    attachPings[plan.opportunityId] = passStart.toISOString();
                    attachPings = pruneAttachPings(attachPings, passStart);
                    await salesDesk.savePings(attachPings);
                    counts.ownerPings++;
                    log(`[wa-lead-relay] pinged owner of ${plan.opportunityId} — client wrote`);
                  } else {
                    // Unlinked Telegram (only Azat is linked today): skip,
                    // never an error.
                    counts.ownerPingsSkipped++;
                    log(`[wa-lead-relay] owner of ${plan.opportunityId} has no telegram chat — ping skipped`);
                  }
                } catch (e) {
                  // A ping failure must not fail the attach — the note and the
                  // card are the lead; the DM is a courtesy.
                  log(`[wa-lead-relay] owner ping failed for ${plan.opportunityId}: ${(e as Error).message.slice(0, 120)}`);
                }
              }
            }
            // Rental returning-customer distribution: the note is on the card —
            // now the owner patch, the assignment record (the sweeper enforces
            // the same acceptance window as for a NEW lead), and the pings.
            // Every step wrapped: a notification failure must NEVER fail an
            // attach (same rule as commitRentalAssignment on the CREATE path).
            if (rentalDesk && returningBrand && (returningPick || returningAllBusy)) {
              try {
                const assigneeMemberId =
                  returningPick?.agent.memberId ?? rentalDesk.managerMemberIdFor(returningBrand);
                const retPatch: Record<string, unknown> = {};
                if (assigneeMemberId) retPatch.ownerId = assigneeMemberId;
                // The acceptance-clock stamp — the field gate drops it where
                // Ops has not created assignedAt (same rule as the CREATE path).
                if (deps.opportunityFields.has("assignedAt")) retPatch.assignedAt = passStart.toISOString();
                if (Object.keys(retPatch).length > 0) {
                  await twenty.patchOpportunity(plan.opportunityId, retPatch);
                }
                await commitRentalAssignment({
                  desk: rentalDesk,
                  brand: returningBrand,
                  thread,
                  heard,
                  opportunityId: plan.opportunityId,
                  line: returningLine ?? undefined,
                  leadNumber:
                    typeof existing?.leadNumber === "string" && existing.leadNumber.trim()
                      ? existing.leadNumber.trim()
                      : null,
                  pick: returningPick
                    ? { agent: returningPick.agent, nextCursor: 0 }
                    : null,
                  allBusy: returningAllBusy,
                  managerMemberId: rentalDesk.managerMemberIdFor(returningBrand),
                  tenantSlug: deps.tenantSlug,
                  passStart,
                  cursors: rentalCursors,
                  autoReplied,
                  assignments: rentalAssignments,
                  counts,
                  log,
                  returning: true,
                });
                if (returningPick?.via === "preferred" && rentalDesk.saveReturningCursors) {
                  await rentalDesk.saveReturningCursors(rentalReturningCursors);
                }
                if (returningPick) counts.rentalReturningAssigned++;
              } catch (e) {
                log(`[wa-lead-relay] returning assignment failed for ${plan.opportunityId}: ${(e as Error).message.slice(0, 120)}`);
              }
            }
          }
          counts.attached++;
          continue;
        }

        for (const f of plan.skippedFields) {
          log(`[wa-lead-relay] opportunity field not in workspace metadata, skipped: ${f}`);
        }
        log(
          `[wa-lead-relay] ${commit ? "CREATE" : "DRY   "} …${thread.key} ${via} → NEW card ` +
            `"${String(plan.opportunity.name).slice(0, 80)}"` +
            (girlPick?.ownerId ? ` owner=girl:${girlPick.ownerId.slice(0, 8)}` : "") +
            (rentalPick ? ` owner=rotation:${rentalPick.agent.name}` : "") +
            (rentalAllBusy ? ` owner=manager-queue(${rentalBrand})` : "") +
            (verdict ? ` evidence="${verdict.evidence[0]?.slice(0, 80)}"` : "")
        );
        // The rotation advances when the create is DECIDED (so several creates
        // in one pass alternate, dry-run included) but is PERSISTED only after
        // the card actually exists — a failed create retries with the same
        // girl next pass instead of skipping her turn.
        if (girlPick?.ownerId) {
          girlCursor = girlPick.nextCursor;
          counts.girlAssigned++;
        }
        // Same advance-on-decision / persist-on-create rule for the rental
        // rotation cursor.
        if (rentalPick && rentalBrand) {
          rentalCursors[rentalBrand] = rentalPick.nextCursor;
          counts.rentalAssigned++;
        }
        if (commit) {
          const personId =
            plan.person.kind === "reuse"
              ? plan.person.id
              : (await twenty.createPerson(plan.person.payload)).id;
          const payload: Record<string, unknown> = { ...plan.opportunity, pointOfContactId: personId };
          // Serial number: `#N` on the name + leadNumber field, from the
          // platform sequence (race-safe against the CallGear relay).
          if (deps.nextLeadNumber && deps.opportunityFields.has("leadNumber")) {
            const n = await deps.nextLeadNumber();
            payload.leadNumber = String(n);
            payload.name = `#${n} ${payload.name}`;
          }
          const opp = await twenty.createOpportunity(payload);
          // The bare-card fix: a NEW card carries the original conversation
          // too — the same thread note the ATTACH branch writes, targeted at
          // the new opportunity and person.
          await postThreadNote(client, buildThreadNote(noteThread, det.origin), opp.id, personId);
          if (girlPick?.ownerId && salesDesk) await salesDesk.saveCursor(girlCursor);
          // Rental distributor: the card exists — now the auto-reply, the
          // agent + manager WhatsApp notifications, and the assignment record
          // the sweeper enforces. Every step is wrapped: a notification
          // failure must NEVER fail a created card.
          if (rentalDesk && rentalBrand && (rentalPick || rentalAllBusy)) {
            await commitRentalAssignment({
              desk: rentalDesk,
              brand: rentalBrand,
              thread,
              heard,
              opportunityId: opp.id,
              leadNumber: typeof payload.leadNumber === "string" ? payload.leadNumber : null,
              pick: rentalPick,
              allBusy: rentalAllBusy,
              managerMemberId: rentalManagerId,
              tenantSlug: deps.tenantSlug,
              passStart,
              cursors: rentalCursors,
              autoReplied,
              assignments: rentalAssignments,
              counts,
              log,
            });
          }
        }
        counts.created++;
      } catch (e) {
        // Per-thread failure counts and the pass proceeds (the note/create
        // idempotency keys are the retry mechanism).
        counts.failed++;
        counts.firstError ??= `thread/${thread.key}: ${(e as Error).message.slice(0, 160)}`;
      }
    }
  }

  // Checkpoint advances past a CLEAN pass — created, attached and noise alike
  // (re-qualifying the same silence every poll is just spend; new activity is
  // what re-enters a thread). But a pass with FAILURES holds the checkpoint:
  // a failed thread's create/note never happened and the idempotency keys are
  // the only retry mechanism — moving past it would lose the lead silently
  // (audit 2026-08-14). Dry-run never moves it.
  const advanceTo = checkpointAdvance(passStart, { failed: counts.failed, truncated });
  if (commit && advanceTo) {
    await source.saveCheckpoint(advanceTo);
    // The sweep is marked done only if it actually FINISHED. A truncated or
    // failed sweep leaves the mark alone so the next pass sweeps again and
    // drains the rest, rather than waiting out the whole interval on a window
    // it never read to the end.
    if (sweeping) await source.saveSweptAt?.(passStart);
  } else if (commit) {
    log(
      `[wa-lead-relay] checkpoint held at ${checkpoint?.toISOString() ?? "bootstrap"} — ` +
        `${counts.failed} failed thread(s), ${counts.droppedOverCap} dropped over the cap; ` +
        `both retry next pass`
    );
  }

  return counts;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "wa_lead_relay";

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

export function createDrizzleWaLeadSource(db: PlatformDb, tenantId: string): WaLeadRelaySource {
  return {
    async loadCheckpoint() {
      const [row] = await db
        .select({ counts: twentyMirrorState.counts })
        .from(twentyMirrorState)
        .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, CHECKPOINT_ENTITY)))
        .limit(1);
      const ts = (row?.counts as { checkpoint?: string } | undefined)?.checkpoint;
      return ts ? new Date(ts) : null;
    },

    async saveCheckpoint(at) {
      // MERGE (`||`), never replace: sweptAt shares this row and an overwrite
      // would erase it every pass — the sweep would then run every two
      // minutes forever.
      await db.execute(sql`
        INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
        VALUES (${tenantId}, ${CHECKPOINT_ENTITY}, '', ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, 'running', now())
        ON CONFLICT (tenant_id, entity)
        DO UPDATE SET counts = coalesce(twenty_mirror_state.counts, '{}'::jsonb) || ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb,
                      updated_at = now()
      `);
    },

    async loadSweptAt() {
      const [row] = await db
        .select({ counts: twentyMirrorState.counts })
        .from(twentyMirrorState)
        .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, CHECKPOINT_ENTITY)))
        .limit(1);
      const ts = (row?.counts as { sweptAt?: string } | undefined)?.sweptAt;
      return ts ? new Date(ts) : null;
    },

    async saveSweptAt(at) {
      await db.execute(sql`
        INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
        VALUES (${tenantId}, ${CHECKPOINT_ENTITY}, '', ${JSON.stringify({ sweptAt: at.toISOString() })}::jsonb, 'running', now())
        ON CONFLICT (tenant_id, entity)
        DO UPDATE SET counts = coalesce(twenty_mirror_state.counts, '{}'::jsonb) || ${JSON.stringify({ sweptAt: at.toISOString() })}::jsonb,
                      updated_at = now()
      `);
    },

    async loadRows(since, limit) {
      // GROUPS INCLUDED on purpose (no @g.us filter): Dubizzle/Meta leads and
      // Yango bookings land in group chats. The participant keying happens in
      // buildThreads — pure, and unit-tested.
      const res = await db.execute(sql`
        SELECT id, channel, "from", from_pn, "to", customer_name, body, media_path, external_message_id, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND direction = 'inbound'
           AND channel IN ('whatsapp', 'telegram', 'instagram', 'messenger', 'jivo')
           AND body IS NOT NULL
           AND body <> '[no message]'
           -- updated_at too, NOT just created_at: a voice note or photo lands
           -- as a bare "[voice/audio]" placeholder and its transcript is
           -- attached seconds later (37s for the message that exposed this;
           -- 308 of 369 media rows on 2026-08-31 were upgraded >20s after
           -- arrival). A pass landing inside that gap judged an empty
           -- placeholder, found no intent, filed it as NOISE — and since the
           -- checkpoint then moved past its created_at, the real words were
           -- never looked at again. Reprocessing is free: create and attach
           -- are keyed, and note lines dedupe.
           AND (created_at > ${since} OR updated_at > ${since})
         ORDER BY created_at ASC
         LIMIT ${limit}
      `);
      interface Row {
        id: string;
        channel: string;
        from: string | null;
        from_pn: string | null;
        to: string | null;
        customer_name: string | null;
        body: string | null;
        media_path: string | null;
        external_message_id: string | null;
        created_at: string;
      }
      const rows = sqlRows<Row>(res).map((r) => ({
        id: r.id,
        channel: r.channel,
        from: r.from,
        fromPn: r.from_pn,
        to: r.to,
        customerName: r.customer_name,
        body: r.body,
        mediaPath: r.media_path,
        externalId: r.external_message_id,
        createdAt: new Date(r.created_at),
      }));
      // LID RESOLUTION (2026-09-19, Saud Alsharari wrote the cardiwan main
      // line from a NEW Saudi number and WhatsApp showed only his @lid — the
      // thread had no tail9, keyed nothing, and the lead never reached the
      // board). wa_identity (observer-maintained) knows the phone behind most
      // lids; fill from_pn from it — in memory AND persisted, so the two-way
      // note pipe (loadRecentTwoWay keys on from_pn) sees the same identity.
      // fromPn outranks every opaque id in threadKeyFor. Explicit IN list,
      // never ANY($array) — that binds as ONE text param (2026-08-25 bug).
      const lids = [
        ...new Set(
          rows
            .filter((r) => !(r.fromPn ?? "").trim() && (r.from ?? "").endsWith("@lid"))
            .map((r) => r.from!.trim())
        ),
      ];
      if (lids.length > 0) {
        const found = await db.execute(sql`
          SELECT lid, phone FROM wa_identity
           WHERE lid IN (${sql.join(lids.map((l) => sql`${l}`), sql`, `)})
             AND phone IS NOT NULL
        `);
        const byLid = new Map<string, string>();
        for (const r of sqlRows<{ lid: string; phone: string }>(found)) {
          const digits = normalizePhone(r.phone);
          if (digits.length >= MIN_PHONE_MATCH_DIGITS) byLid.set(r.lid, digits);
        }
        for (const row of rows) {
          const digits = byLid.get((row.from ?? "").trim());
          if (!digits) continue;
          row.fromPn = digits;
          await db.execute(sql`
            UPDATE message SET from_pn = ${digits}, updated_at = now()
             WHERE id = ${row.id} AND (from_pn IS NULL OR from_pn = '')
          `);
        }
      }
      return rows;
    },

    async loadRecentTwoWay(digits, since) {
      // Both directions for ONE customer, matched on the 9-digit tail across
      // from_pn / from-JID / to-digits — the same identity rule as
      // waCustomerTail, so the note sees exactly the rows the day-pipe sees.
      const tail = digits.slice(-MIN_PHONE_MATCH_DIGITS);
      const res = await db.execute(sql`
        SELECT id, channel, "from", from_pn, "to", customer_name, body, media_path, direction, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND channel = 'whatsapp'
           AND body IS NOT NULL
           AND body <> '[no message]'
           AND created_at >= ${since}
           AND (
             right(coalesce(from_pn, ''), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}
             OR right(regexp_replace(coalesce("from", ''), '[^0-9]', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}
             OR right(regexp_replace(coalesce("to", ''), '[^0-9]', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}
           )
         ORDER BY created_at ASC
         LIMIT 300
      `);
      interface Row2 {
        id: string;
        channel: string;
        from: string | null;
        from_pn: string | null;
        to: string | null;
        customer_name: string | null;
        body: string | null;
        media_path: string | null;
        direction: string | null;
        created_at: string;
      }
      return sqlRows<Row2>(res).map((r) => ({
        id: r.id,
        channel: r.channel,
        from: r.from,
        fromPn: r.from_pn,
        to: r.to,
        customerName: r.customer_name,
        body: r.body,
        mediaPath: r.media_path,
        direction: r.direction ?? undefined,
        createdAt: new Date(r.created_at),
      }));
    },

    async loadStaffTails() {
      // "Ours" = the tenant's own people. Two honest sources: the staff
      // roster (tenant_member → user.phone) and the NOTIFY_WA_PHONE_* env
      // lines the notify layer pings (modules/notify/registry.ts). Ops
      // chatter from numbers in NEITHER still has to pass the qualify gate —
      // this list is only about never keying a card to our own handset.
      // Both tables are tenancy roots (no RLS) — safe from the global pool.
      const res = await db.execute(sql`
        SELECT u.phone AS phone
          FROM "user" u
          JOIN tenant_member tm ON tm.user_id = u.id
         WHERE tm.tenant_id = ${tenantId}
           AND u.phone IS NOT NULL
      `);
      const tails = new Set<string>();
      const add = (raw: string | null | undefined) => {
        const d = normalizePhone(raw);
        if (d.length >= MIN_PHONE_MATCH_DIGITS) tails.add(d.slice(-MIN_PHONE_MATCH_DIGITS));
      };
      for (const r of sqlRows<{ phone: string | null }>(res)) add(r.phone);
      for (const [k, v] of Object.entries(process.env)) {
        if (k.startsWith("NOTIFY_WA_PHONE_")) add(v);
      }
      // The rental rotation rosters (RENTAL_ROTATION_* = Name:9715...,...), the
      // MANAGER_WA_* lines and the manager-set phone overrides in
      // agent_availability are ours too: an agent replying 1 to accept a lead
      // must never be carded as a returning customer (Ayham, 2026-10-01:
      // tail 542445832 became lead #1032 and was assigned to Ayham).
      for (const [k, v] of Object.entries(process.env)) {
        if (v && (k.startsWith("RENTAL_ROTATION_") || k.startsWith("MANAGER_WA_"))) {
          for (const m of v.matchAll(/\d{9,}/g)) add(m[0]);
        }
      }
      // Escape hatch for own numbers that live in no roster — the brand
      // MAINLINE numbers themselves (ETM website line 971564048816 was the
      // missing one): comma/space separated, anything with 9+ digits counts.
      for (const m of (process.env.STAFF_WA_EXTRA ?? "").matchAll(/\d{9,}/g)) add(m[0]);
      try {
        const av = await db.execute(sql`SELECT phone FROM agent_availability WHERE phone IS NOT NULL`);
        for (const r of sqlRows<{ phone: string | null }>(av)) add(r.phone);
      } catch {
        // agent_availability predates this relay on some envs; the env
        // rosters above still cover the roster.
      }
      return tails;
    },
  };
}

// ─── Sales desk state (twenty_mirror_state) ─────────────────────────────────

const SALES_DESK_ENTITY = "sales_desk_routing";

/**
 * The sales desk's cross-tenant state: the girls' round-robin cursor
 * (`counts.girlCursor`) and the attach-ping throttle (`counts.salesPing`,
 * cardId → ISO). ONE row for the whole sales deployment — every sales-bound
 * tenant shares the same rotation, so the runner binds this to the canonical
 * sales tenant (the alternative, a cursor per tenant, would hand the same
 * girl two leads in a row whenever two lines create in the same minute).
 *
 * Same MERGE (`||`) rule as saveCheckpoint/saveSweptAt above — an overwriting
 * write would erase the sibling key, and an unknown key must never throw:
 * both patches are plain JSON merged by Postgres itself.
 */
export function createSalesDeskRoutingStore(
  db: PlatformDb,
  tenantId: string
): Pick<SalesDeskRouting, "loadCursor" | "saveCursor" | "loadPings" | "savePings"> {
  const mergeCounts = async (patch: Record<string, unknown>): Promise<void> => {
    await db.execute(sql`
      INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
      VALUES (${tenantId}, ${SALES_DESK_ENTITY}, '', ${JSON.stringify(patch)}::jsonb, 'running', now())
      ON CONFLICT (tenant_id, entity)
      DO UPDATE SET counts = coalesce(twenty_mirror_state.counts, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb,
                    updated_at = now()
    `);
  };
  const loadCounts = async (): Promise<Record<string, unknown>> => {
    const [row] = await db
      .select({ counts: twentyMirrorState.counts })
      .from(twentyMirrorState)
      .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, SALES_DESK_ENTITY)))
      .limit(1);
    return (row?.counts as Record<string, unknown> | undefined) ?? {};
  };
  return {
    async loadCursor() {
      const n = (await loadCounts()).girlCursor;
      return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    },
    async saveCursor(next) {
      await mergeCounts({ girlCursor: next });
    },
    async loadPings() {
      const m = (await loadCounts()).salesPing;
      if (!m || typeof m !== "object") return {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    },
    async savePings(map) {
      await mergeCounts({ salesPing: map });
    },
  };
}

// ─── Rental distribution state (twenty_mirror_state) ────────────────────────

const RENTAL_DISTRIBUTION_ENTITY = "rental_distribution";

/**
 * The rental distributor's cross-tenant state on ONE twenty_mirror_state row
 * bound to the canonical rental tenant — every rental-bound tenant shares the
 * rotations, exactly like the sales desk (a cursor per tenant would hand the
 * same agent two leads in a row whenever two lines create in the same minute):
 *
 *   counts.rentalCursor       { etm: n, cardiwan: n } — round-robin cursors
 *   counts.rentalReturningCursor { etm: n, cardiwan: n } — the preferred-list
 *                             round-robin for RETURNING customers (2026-09-24)
 *   counts.autoReplied        { "<line>:<tail9>": ISO } — the once-only marks
 *   counts.rentalAssignments  { "<oppId>": RentalAssignment } — the sweeper queue
 *   counts.botRepliesCursor   ISO — high-water mark of the bot-inbox reply
 *                             reader (agent accept/decline + manager steering,
 *                             2026-09-19)
 *
 * Same MERGE (`||`) rule as every other writer to this table — an overwriting
 * write would erase the sibling keys, and BOTH the relay and the distributor
 * sweeper share this row.
 */
export function createRentalDistributionStore(
  db: PlatformDb,
  tenantId: string
): Pick<
  RentalDeskRouting,
  | "loadCursors"
  | "saveCursors"
  | "loadAutoReplied"
  | "saveAutoReplied"
  | "loadAssignments"
  | "saveAssignments"
  | "loadReturningCursors"
  | "saveReturningCursors"
> & {
  loadReplyCursor(): Promise<string | null>;
  saveReplyCursor(iso: string): Promise<void>;
} {
  const mergeCounts = async (patch: Record<string, unknown>): Promise<void> => {
    await db.execute(sql`
      INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
      VALUES (${tenantId}, ${RENTAL_DISTRIBUTION_ENTITY}, '', ${JSON.stringify(patch)}::jsonb, 'running', now())
      ON CONFLICT (tenant_id, entity)
      DO UPDATE SET counts = coalesce(twenty_mirror_state.counts, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb,
                    updated_at = now()
    `);
  };
  const loadCounts = async (): Promise<Record<string, unknown>> => {
    const [row] = await db
      .select({ counts: twentyMirrorState.counts })
      .from(twentyMirrorState)
      .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, RENTAL_DISTRIBUTION_ENTITY)))
      .limit(1);
    return (row?.counts as Record<string, unknown> | undefined) ?? {};
  };
  return {
    async loadCursors() {
      const m = (await loadCounts()).rentalCursor;
      if (!m || typeof m !== "object") return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = Math.floor(v);
      }
      return out;
    },
    async saveCursors(cursors) {
      await mergeCounts({ rentalCursor: cursors });
    },
    async loadAutoReplied() {
      const m = (await loadCounts()).autoReplied;
      if (!m || typeof m !== "object") return {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (typeof v === "string") out[k] = v;
      }
      return out;
    },
    async saveAutoReplied(map) {
      await mergeCounts({ autoReplied: map });
    },
    async loadAssignments() {
      const m = (await loadCounts()).rentalAssignments;
      if (!m || typeof m !== "object") return {};
      const out: Record<string, RentalAssignment> = {};
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (v && typeof v === "object" && typeof (v as RentalAssignment).assignedAt === "string") {
          out[k] = v as RentalAssignment;
        }
      }
      return out;
    },
    async saveAssignments(map) {
      await mergeCounts({ rentalAssignments: map });
    },
    async loadReturningCursors() {
      const m = (await loadCounts()).rentalReturningCursor;
      if (!m || typeof m !== "object") return {};
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(m as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = Math.floor(v);
      }
      return out;
    },
    async saveReturningCursors(cursors) {
      await mergeCounts({ rentalReturningCursor: cursors });
    },
    async loadReplyCursor() {
      const v = (await loadCounts()).botRepliesCursor;
      return typeof v === "string" && v ? v : null;
    },
    async saveReplyCursor(iso: string) {
      await mergeCounts({ botRepliesCursor: iso });
    },
  };
}
