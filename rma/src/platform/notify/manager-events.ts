// MANAGER EVENT NOTIFIER — one-line Telegram updates to the rental manager
// (Ayham, +971581417020) about everything happening on the rental pipeline.
//
// RENTAL ONLY (cardiwan/easyrent/etm) — no sales notifications in v1.
//
// This is a CENTRAL TAILER: it reads what the other pipelines already write
// (integration_event, call_transcript, Twenty opportunities/stageEvents,
// message OCR lines, the rental table) and never intrudes into the producers.
// Per-tenant checkpoint in twenty_mirror_state (entity "manager_notify"),
// same mechanics as stage-progression / wa-lead-relay / deal-confirmation.
//
// Delivery rules (owner, locked):
//   - Recipient's chatId comes from telegram_link by phone tail9. No row →
//     he hasn't /start'ed the bot yet: events go to a local JSONL SPOOL and
//     flush (consolidated) the first pass he is linked. Never dropped.
//   - QUIET HOURS 23:00–08:00 Dubai: events spool; ONE consolidated morning
//     message flushes at 08:00. No exceptions.
//   - Dedupe: every event carries a key (kind + entity + Dubai day where
//     sensible); handled keys persist in a local JSON sidecar (14-day prune)
//     so --since backfills and daily recurrences never double-fire.
//   - DRY-RUN BY DEFAULT: prints the lines, ZERO writes (no sends, no spool,
//     no keys, no checkpoint).
//
// Same architecture as the other passes: PURE builders and gates (the line
// formats, detectDoc, isQuietHours, dedupe keys) separated from the adapters
// (ManagerNotifySource over drizzle, Twenty reads over the rate-limited
// client, Telegram send + file spool injected by the runner).

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { and, eq, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { twentyMirrorState } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import { fetchOpportunitiesForTails } from "@/platform/integrations/twenty/deal-link";
import type { TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { stageVocabulary } from "@/platform/integrations/twenty/stages";
import { displayAgentName } from "@/platform/integrations/callgear/agent-name";
import { groupSubject } from "@/platform/integrations/twenty/group-names";
import { threadKeyFor } from "@/platform/integrations/twenty/wa-lead-relay";
import { parseDocDate } from "@/platform/ai/deal-confirmation";
import { writeStageEventLink } from "@/platform/ai/stage-progression";

type PlatformDb = typeof platformDb;

// ─── Dubai clock helpers (the box sits in Dubai) ────────────────────────────

const TZ = "Asia/Dubai";

/** "15:32" box-local — the time the manager actually experienced. */
export function fmtTimeDubai(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(at);
}

/** "2026-08-13" box-local — the day grain the daily dedupe keys on. */
export function dayKeyDubai(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(at);
}

/** Quiet hours 23:00–08:00 Dubai: events spool, the morning message flushes. */
export function isQuietHours(now: Date): boolean {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now)
  );
  return h >= 23 || h < 8;
}

/** [start, end) of the Dubai day containing `now`, as UTC Dates. */
export function dubaiDayBounds(now: Date): { start: Date; end: Date } {
  const key = dayKeyDubai(now);
  // Dubai is UTC+4 year-round (no DST) — the bounds are fixed-offset math.
  const start = new Date(Date.parse(`${key}T00:00:00+04:00`));
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

// ─── Line builders (ONE line per event, English, compact) ───────────────────

/** "+971503453458" — the FULL number (owner, 2026-08-13): the manager must
 *  recognise and copy who called; "+9715…" masking made every line useless.
 *  A bare tail9 (all a Twenty join sometimes has) displays as "…501234567" —
 *  inventing a "+971" prefix for it would be a lie. */
export function fullPhone(digits: string | null | undefined): string {
  const d = normalizePhone(digits);
  if (d.length > MIN_PHONE_MATCH_DIGITS) return `+${d}`;
  if (d.length === MIN_PHONE_MATCH_DIGITS) return `…${d}`;
  return "+?";
}

/** Tap-to-chat URL for the manager's message — only with FULL digits; a
 *  9-digit tail has no country code, so there is no honest link for it. */
function waChatLink(digits: string | null | undefined): string | null {
  const d = normalizePhone(digits);
  return d.length > MIN_PHONE_MATCH_DIGITS ? `https://web.whatsapp.com/send?phone=${d}` : null;
}

/** The full customer digits off a Twenty card's whatsapp LINKS composite
 *  (both relays write it), falling back to the card's phoneTail9. Accepts
 *  both URL generations: web.whatsapp.com/send?phone= (current) and wa.me. */
function digitsFromOpp(opp: Record<string, unknown> | null | undefined): string | null {
  const url = (opp?.whatsapp as { primaryLinkUrl?: unknown } | null | undefined)?.primaryLinkUrl;
  const m = typeof url === "string" ? /(?:wa\.me\/|[?&]phone=)(\d+)/.exec(url) : null;
  if (m) return m[1];
  return typeof opp?.phoneTail9 === "string" ? opp.phoneTail9 : null;
}

export function missedCallLine(
  fromPhone: string,
  toLine: string | null,
  at: Date,
  agentName?: string | null
): string {
  // Ayham 2026-08-17: "bot messages aren't clear" — every part now says what
  // it is instead of relying on `·`/`→` position.
  let line = `📞 Missed call from ${fullPhone(fromPhone)} at ${fmtTimeDubai(at)}`;
  if (agentName) line += ` — rang ${agentName}, not answered`;
  else line += ` — nobody answered`;
  if (toLine) line += ` (our number ${fullPhone(toLine)})`;
  return line;
}

/** The agent's own copy of a missed call — second person, with the action. */
export function agentMissedLine(fromPhone: string, at: Date): string {
  return `📞 You missed a call from ${fullPhone(fromPhone)} at ${fmtTimeDubai(at)} — please call back.`;
}

/**
 * `💬 Call · Babek · +971503453458 → line 97148236203 · G-Wagen · 3 days · 1000 AED`
 * + a tap-to-chat link on the second line when the number is complete. Parts
 * drop out when the summary didn't capture them.
 */
export function callSummaryLine(input: {
  agentName: string | null;
  fromPhone: string;
  toLine?: string | null;
  car: string | null;
  days: number | null;
  priceAed: number | null;
}): string {
  const parts = ["💬 Answered call"];
  if (input.agentName) parts.push(`agent ${input.agentName}`);
  parts.push(`client ${fullPhone(input.fromPhone)}`);
  if (input.car) parts.push(input.car);
  if (input.days) parts.push(`${input.days} days`);
  if (input.priceAed) parts.push(`${input.priceAed} AED`);
  const link = waChatLink(input.fromPhone);
  return link ? `${parts.join(" · ")}\n${link}` : parts.join(" · ");
}

/** "WhatsApp group: 1203…@g.us" → "WA group: <cached subject>" when the
 *  observers have named the group (a bare JID is useless to a human), else
 *  the short form; callgear card → "Call". */
export function leadSourceShort(leadSource: unknown, externalId: string | null): string {
  const s = typeof leadSource === "string" ? leadSource : "";
  if (s.startsWith("WhatsApp group")) {
    const m = /WhatsApp group:\s*(\S+@g\.us)/.exec(s);
    const subject = m ? groupSubject(m[1]) : null;
    return subject ? `WA group: ${subject}` : "WhatsApp group";
  }
  if (s.startsWith("WhatsApp")) return "WhatsApp direct";
  if (s.startsWith("Telegram")) return "Telegram";
  if (s.startsWith("Dubizzle")) return "Dubizzle";
  if (externalId?.startsWith("callgear:")) return "Call";
  return s || "WhatsApp";
}

/** The card's serial ("73"), from the leadNumber field or the `#73 ` name prefix. */
function leadNo(opp: Record<string, unknown> | null | undefined): string | null {
  const v = opp?.leadNumber;
  if (typeof v === "string" && v.trim()) return v.trim();
  const name = typeof opp?.name === "string" ? opp.name : "";
  const m = /^#(\d+)\s/.exec(name);
  return m ? m[1] : null;
}

/** Direct link to the card in Twenty (RecordShowPage = /object/:singular/:id). */
function cardUrl(deps: ManagerNotifyDeps, oppId: string | null): string | null {
  if (!deps.cardBaseUrl || !oppId) return null;
  return `${deps.cardBaseUrl.replace(/\/$/, "")}/object/opportunity/${oppId}`;
}

/** Link tail shared by the progress lines: WA chat first, card second. */
function linkTail(deps: ManagerNotifyDeps, phone: string | null, oppId: string | null): string {
  const links = [waChatLink(phone), cardUrl(deps, oppId)].filter((x): x is string => !!x);
  return links.length ? `\n${links.join(" · ")}` : "";
}

/** `🙋 #73 · +971503453458 · picked up by Babek` + links — the moment a card
 *  gets an owner. This (not raw intake) is what the manager watches. */
export function pickedUpLine(lead: string | null, phone: string | null, ownerName: string | null): string {
  const who = lead ? `Lead #${lead}` : "Lead";
  return `🙋 ${who} (client ${fullPhone(phone)}) taken by ${ownerName ?? "someone"}`;
}

/** `📈 #74 · +971503453458 · New Lead → In Progress · by Babek Sadygov` + links. */
export function progressLine(input: {
  lead: string | null;
  phone: string | null;
  fromLabel: string;
  toLabel: string;
  by: string;
}): string {
  const who = input.lead ? `Lead #${input.lead}` : "Lead";
  return `📈 ${who} (client ${fullPhone(input.phone)}) moved from "${input.fromLabel}" to "${input.toLabel}" by ${input.by}`;
}

/** `✅ Deal confirmed · +971503453458 · Escalade · 2 days · 1980 AED → posted to the team` */
export function dealBroadcastLine(input: {
  phone: string | null;
  car: unknown;
  days: unknown;
  priceAed: number | null;
}): string {
  const parts = [`✅ Deal confirmed · client ${fullPhone(input.phone)}`];
  if (typeof input.car === "string" && input.car.trim()) parts.push(input.car.trim());
  if (typeof input.days === "number" && input.days > 0) parts.push(`${input.days} days`);
  if (input.priceAed) parts.push(`${input.priceAed} AED`);
  return `${parts.join(" · ")} — announced to the team`;
}

export function returnTodayLine(plate: string, car: string): string {
  return `🔁 Car return due today · ${car} · plate ${plate}`;
}

export function overdueLine(plate: string, car: string, days: number): string {
  return `🚨 Car return OVERDUE by ${days} day${days === 1 ? "" : "s"} · ${car} · plate ${plate}`;
}

export function finesLine(plate: string, totalAed: number, count: number | null): string {
  const n = count !== null ? `${count} fine${count === 1 ? "" : "s"}, ` : "";
  return `💸 Traffic fines on plate ${plate} · ${n}total ${totalAed} AED`;
}

// ─── Document OCR detector (small, pure) ────────────────────────────────────

export type DocKind = "license" | "id";

export interface DocHit {
  kind: DocKind;
  /** true = a readable expiry in the past; null = no readable expiry. */
  expired: boolean | null;
}

const LICENSE_RE = /driving\s*licen|driver'?s\s*licen/i;
const ID_RE = /emirates\s*id|\beid\b|passport|identity\s*card/i;
const EXPIRY_RE = /expir\w*[^\d]{0,12}(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{4})/i;

/**
 * Read one OCR'd photo line ("[image] <OCR text>") for a document. ONLY
 * media-OCR lines count — the words "driving licence" in chat chatter are a
 * request, not a document. Returns null when no doc marker is found.
 */
export function detectDoc(body: string | null | undefined, now: Date): DocHit | null {
  const t = (body ?? "").trim();
  if (!/^\[(image|document)\]/i.test(t)) return null;
  const kind: DocKind | null = LICENSE_RE.test(t) ? "license" : ID_RE.test(t) ? "id" : null;
  if (!kind) return null;
  const m = EXPIRY_RE.exec(t);
  const expiry = m ? parseDocDate(m[1]) : null;
  return { kind, expired: expiry ? expiry.getTime() < now.getTime() : null };
}

/** `📄 Docs · +971503453458 · license ✓ ID ✓` / `⚠️ Docs · +971503453458 · license expired` */
export function docsLine(phone: string, hits: DocHit[]): string {
  const byKind = new Map<DocKind, DocHit>();
  for (const h of hits) if (!byKind.has(h.kind) || h.expired) byKind.set(h.kind, h);
  const expired = [...byKind.values()].filter((h) => h.expired === true);
  if (expired.length > 0) {
    return `⚠️ Client ${fullPhone(phone)} sent documents — ${expired.map((h) => `${h.kind === "id" ? "ID" : h.kind} EXPIRED`).join(", ")}`;
  }
  const parts = [...byKind.keys()].map((k) => `${k === "id" ? "ID" : k} ✓`);
  return `📄 Client ${fullPhone(phone)} sent documents · ${parts.join(" ")}`;
}

// ─── Events, dedupe, spool ──────────────────────────────────────────────────

export type ManagerEventKind =
  | "missed_call" | "call_summary" | "picked_up" | "stage_move" | "deal_broadcast"
  | "docs" | "return_today" | "overdue" | "fines" | "agent_missed";

export interface ManagerEvent {
  /** Dedupe key: kind + entity (+ Dubai day where the event recurs daily). */
  key: string;
  kind: ManagerEventKind;
  line: string;
  at: Date;
  /**
   * Set = this event goes to a STAFF member (his telegram_link phone tail9),
   * not to the manager. Agent alerts (owner 2026-08-14: missed call → HIS
   * agent) send immediately — they are "call back NOW" actions, so quiet
   * hours do not park them.
   */
  toPhoneTail?: string;
}

export interface SpoolEntry {
  key: string;
  line: string;
  at: string;
  /** true when quiet hours parked it (morning message), false when the
   *  unlinked manager did (flush-on-link message). */
  quiet: boolean;
}

export interface ManagerSpool {
  load(): Promise<SpoolEntry[]>;
  append(entries: SpoolEntry[]): Promise<void>;
  /** Replace the spool with what remains after a flush (usually empty). */
  replace(entries: SpoolEntry[]): Promise<void>;
}

export interface SentKeys {
  has(key: string): boolean;
  add(key: string): void;
  persist(): Promise<void>;
}

/** JSONL spool — one line per parked event, rewritten on flush. */
export function createFileSpool(path: string): ManagerSpool {
  return {
    async load() {
      if (!existsSync(path)) return [];
      const out: SpoolEntry[] = [];
      for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { out.push(JSON.parse(line)); } catch { /* skip malformed line */ }
      }
      return out;
    },
    async append(entries) {
      if (entries.length === 0) return;
      appendFileSync(path, entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
    },
    async replace(entries) {
      writeFileSync(path, entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : ""));
    },
  };
}

/** Handled event keys in a JSON sidecar; keys older than 14 days are pruned
 *  on every persist so the file stays small. */
export function createFileSentKeys(path: string): SentKeys {
  let map: Record<string, string> = {};
  try {
    map = JSON.parse(readFileSync(path, "utf8"));
  } catch { /* first run or a hand-edited file */ }
  const keys = new Set(Object.keys(map));
  return {
    has: (key) => keys.has(key),
    add: (key) => {
      keys.add(key);
      map[key] = new Date().toISOString();
    },
    async persist() {
      const cutoff = Date.now() - 14 * 86_400_000;
      const pruned: Record<string, string> = {};
      for (const [k, iso] of Object.entries(map)) {
        if (Date.parse(iso) >= cutoff) pruned[k] = iso;
      }
      writeFileSync(path, JSON.stringify(pruned) + "\n");
    },
  };
}

/** Telegram's message limit is 4096 chars — consolidated flushes chunk. */
const TG_CHUNK = 3800;

/** Spool entries → one-or-more consolidated messages (morning vs on-link). */
export function consolidatedMessages(entries: SpoolEntry[]): string[] {
  if (entries.length === 0) return [];
  const quiet = entries.some((e) => e.quiet);
  const header = quiet
    ? `🌅 Overnight roundup (${entries.length}):`
    : `📬 Earlier updates (${entries.length}):`;
  const messages: string[] = [];
  let current = header;
  for (const e of entries) {
    const line = `\n${e.line}`;
    if (current.length + line.length > TG_CHUNK) {
      messages.push(current);
      current = e.line;
    } else {
      current += line;
    }
  }
  messages.push(current);
  return messages;
}

// ─── Raw source shapes ──────────────────────────────────────────────────────

export interface RawCallEvent {
  id: string;
  callId: string;
  direction: string | null;
  from: string | null;
  /** Our virtual line that received the call (params.to) — "what number received it". */
  to: string | null;
  /** Raw agent name from the payload (Bitrix-flavored) — run through
   *  displayAgentName before use. Missed calls DO name the agent whose
   *  extension rang; only truly unrouted calls leave it empty. */
  agentName: string | null;
  duration: number;
  startTime: string | null;
}

export interface RawCallSummary {
  id: string;
  agentName: string | null;
  fromPhone: string | null;
  /** Our virtual line the call came in on (params.to), inbound only. */
  toPhone: string | null;
  car: string | null;
  days: number | null;
  priceAed: number | null;
  at: Date;
}

export interface RawDocMessage {
  id: string;
  from: string | null;
  fromPn: string | null;
  body: string | null;
  at: Date;
}

export interface RawRental {
  id: string;
  status: string;
  returnDate: Date;
  updatedAt: Date;
  plate: string;
  car: string;
  fines: { checked?: boolean; amount?: number | null; note?: string | null } | null;
}

// ─── Core pass ──────────────────────────────────────────────────────────────

export interface ManagerNotifySource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  loadCallEvents(since: Date, limit: number): Promise<RawCallEvent[]>;
  loadCallSummaries(since: Date, limit: number): Promise<RawCallSummary[]>;
  loadDocMessages(since: Date, limit: number): Promise<RawDocMessage[]>;
  /** Active rentals due by end of today + any rental whose fines checklist
   *  entry changed since `since`. */
  loadRentals(since: Date, dayStart: Date, dayEnd: Date): Promise<RawRental[]>;
  /** The manager's telegram_link chat_id by phone tail9; null = not linked. */
  resolveManagerChatId(phoneTail9: string): Promise<string | null>;
}

export interface ManagerNotifyDeps {
  client: TwentyClient;
  instance: TwentyInstanceKey;
  tenantSlug: string;
  brandLine: string | null;
  source: ManagerNotifySource;
  /** sendMessage to a resolved chat_id; per-line best-effort is the pass's. */
  send: (chatId: string, text: string) => Promise<void>;
  managerPhoneTail: string;
  spool: ManagerSpool;
  sentKeys: SentKeys;
  /** Public base URL of the workspace (e.g. https://rent.takeauto.tech) —
   *  progress lines link straight to the card. Absent = no card link. */
  cardBaseUrl?: string;
  /**
   * Staff directory for agent alerts (owner 2026-08-14: missed call → HIS
   * agent): display agent name (agent-name.ts form) → telegram_link phone
   * tail9. Agents absent here are simply not DM'd — Babek until he links.
   */
  staffPhones?: Record<string, string>;
}

export interface ManagerNotifyPassOptions {
  commit?: boolean;
  since?: Date;
  /** Injectable clock — quiet-hours/day-grain tests. */
  now?: Date;
  sinceDays?: number;
  rowLimit?: number;
  logger?: (line: string) => void;
}

export interface ManagerNotifyPassCounts {
  events: number;
  sent: number;
  /** Parked: quiet hours or manager not linked yet. */
  spooled: number;
  /** Spool entries delivered by a consolidated flush this pass. */
  flushed: number;
  /** Already handled (dedupe key seen). */
  deduped: number;
  failed: number;
  managerLinked: boolean;
  quietHours: boolean;
  firstError?: string;
}

const DEFAULT_ROW_LIMIT = 200;

function emptyCounts(): ManagerNotifyPassCounts {
  return {
    events: 0, sent: 0, spooled: 0, flushed: 0, deduped: 0, failed: 0,
    managerLinked: false, quietHours: false,
  };
}

/** Stage value → the board label the manager reads ("SECOND_TOUCH" → "Second Touch"). */
export function stageLabel(instance: TwentyInstanceKey, stage: string): string {
  return stageVocabulary(instance).options.find((o) => o.value === stage)?.label ?? stage;
}

export async function runManagerNotifyPass(
  deps: ManagerNotifyDeps,
  opts: ManagerNotifyPassOptions = {}
): Promise<ManagerNotifyPassCounts> {
  const { client, source, sentKeys, spool } = deps;
  const commit = opts.commit ?? false;
  const log = opts.logger ?? (() => {});
  const counts = emptyCounts();
  const now = opts.now ?? new Date();
  const limit = opts.rowLimit ?? DEFAULT_ROW_LIMIT;

  const passStart = now;
  const checkpoint = await source.loadCheckpoint();
  const since =
    opts.since ?? checkpoint ?? new Date(passStart.getTime() - (opts.sinceDays ?? 3) * 86_400_000);

  const chatId = await source.resolveManagerChatId(deps.managerPhoneTail);
  counts.managerLinked = chatId !== null;
  counts.quietHours = isQuietHours(now);

  // The spool as the pass STARTS — only these entries are flushable below.
  // Events parked by THIS pass (quiet hours, or a send that just failed) wait
  // for the next pass: re-sending a line the same minute a 429 rejected it is
  // how a hiccup becomes a spam burst.
  const preParked = commit ? await spool.load() : [];

  // ── Gather + build events (pure builders; the sources only read). ────────
  const events: ManagerEvent[] = [];
  const day = dayKeyDubai(now);
  const scope = deps.tenantSlug;

  const [callEvents, callSummaries, docMessages, rentals] = await Promise.all([
    source.loadCallEvents(since, limit),
    source.loadCallSummaries(since, limit),
    source.loadDocMessages(since, limit),
    source.loadRentals(since, dubaiDayBounds(now).start, dubaiDayBounds(now).end),
  ]);

  // 1. Missed inbound calls (answered ones surface as the summary line below
  //    — never double-fire). Two CallGear notifications per call → dedupe by
  //    callId.
  for (const e of callEvents) {
    if (e.direction !== "inbound" || e.duration > 0) continue;
    const at = e.startTime && !Number.isNaN(Date.parse(e.startTime)) ? new Date(e.startTime) : now;
    const agent = displayAgentName(e.agentName);
    events.push({
      key: `${scope}:missed_call:${e.callId}`,
      kind: "missed_call",
      line: missedCallLine(e.from ?? "", e.to, at, agent),
      at,
    });
    // Owner 2026-08-14: a missed call also goes straight to the agent whose
    // extension rang — HE calls back, Ayham shouldn't have to chase him.
    const tail = agent ? deps.staffPhones?.[agent] : undefined;
    if (agent && tail) {
      const link = waChatLink(e.from);
      events.push({
        key: `${scope}:agent_missed:${e.callId}`,
        kind: "agent_missed",
        line: agentMissedLine(e.from ?? "", at) + (link ? `\n${link}` : ""),
        at,
        toPhoneTail: tail,
      });
    } else if (agent) {
      log(`[manager-notify] agent '${agent}' has no linked phone — missed-call DM skipped`);
    }
  }

  // 2. Call summaries (the answered half of source 1).
  for (const s of callSummaries) {
    events.push({
      key: `${scope}:call_summary:${s.id}`,
      kind: "call_summary",
      line: callSummaryLine({
        agentName: s.agentName, fromPhone: s.fromPhone ?? "", toLine: s.toPhone,
        car: s.car, days: s.days, priceAed: s.priceAed,
      }),
      at: s.at,
    });
  }

  // 3. Lead PICKUP (owner 2026-08-13: the manager watches who took which lead
  // — raw "new lead" intake noise was dropped from this feed). A card counts
  // as picked up the first time we see an ownerId on it; the sentKeys dedupe
  // makes it fire exactly once, whenever the assignment happened.
  const sinceIso = since.toISOString();
  const memberName = new Map<string, string>();
  try {
    for await (const m of client.listAll<Record<string, unknown>>("workspaceMembers")) {
      const id = typeof m.id === "string" ? m.id : null;
      const first = (m.name as { firstName?: unknown } | undefined)?.firstName;
      const last = (m.name as { lastName?: unknown } | undefined)?.lastName;
      const full = [first, last].filter((x): x is string => typeof x === "string" && !!x.trim()).join(" ");
      if (id && full) memberName.set(id, full);
    }
  } catch { /* owner names are a nice-to-have — the line still fires */ }

  const leadCards: Record<string, unknown>[] = [];
  for await (const rec of client.listAll<Record<string, unknown>>("opportunities", {
    filter: `updatedAt[gte]:${sinceIso}`,
  })) {
    const ext = typeof rec.externalId === "string" ? rec.externalId : "";
    if (!ext.startsWith("wa-lead:") && !ext.startsWith("callgear:")) continue;
    if (deps.brandLine !== null && rec.brandLine !== deps.brandLine) continue;
    leadCards.push(rec);
  }
  for (const rec of leadCards) {
    const ownerId = typeof rec.ownerId === "string" && rec.ownerId ? rec.ownerId : null;
    if (!ownerId) continue;
    const phone = digitsFromOpp(rec);
    const id = String(rec.id);
    events.push({
      key: `${scope}:picked_up:${id}`,
      kind: "picked_up",
      line:
        pickedUpLine(leadNo(rec), phone, memberName.get(ownerId) ?? null) +
        linkTail(deps, phone, id),
      at: new Date(typeof rec.updatedAt === "string" ? rec.updatedAt : now),
    });
  }

  // 3b. Human stage moves (owner 2026-08-13: cards only move when a manager
  // drags them). Twenty writes NO stageEvents row for a kanban drag — so this
  // pass observes the drift itself: diff each updated lead card's stage
  // against the latest stageEvent and write the audit row. Section 4 then
  // reads it back like any other event and the manager sees
  // "from → to · by <name>".
  if (leadCards.length > 0) {
    const latestByOpp = new Map<string, Record<string, unknown>>();
    try {
      const ids = leadCards.map((r) => String(r.id));
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100).join(",");
        for await (const ev of client.listAll<Record<string, unknown>>("stageEvents", {
          filter: `opportunityId[in]:[${chunk}]`,
        })) {
          const oid = typeof ev.opportunityId === "string" ? ev.opportunityId : null;
          if (!oid) continue;
          const prev = latestByOpp.get(oid);
          const at = typeof ev.changedAt === "string" ? ev.changedAt : "";
          const prevAt = prev && typeof prev.changedAt === "string" ? prev.changedAt : "";
          if (!prev || at > prevAt) latestByOpp.set(oid, ev);
        }
      }
    } catch { /* diff skipped — section 4 still reports what Twenty already has */ }

    const initialStage = stageVocabulary(deps.instance).options[0]?.value ?? "";
    for (const rec of leadCards) {
      const stage = typeof rec.stage === "string" && rec.stage ? rec.stage : null;
      if (!stage) continue;
      const id = String(rec.id);
      const latest = latestByOpp.get(id);
      const known =
        latest && typeof latest.toStage === "string" && latest.toStage
          ? latest.toStage
          : initialStage;
      if (stage === known) continue;
      const ub = rec.updatedBy as { workspaceMemberId?: unknown; name?: unknown } | null | undefined;
      const byId = typeof ub?.workspaceMemberId === "string" ? ub.workspaceMemberId : null;
      const by =
        (byId ? memberName.get(byId) : null) ??
        (typeof ub?.name === "string" && ub.name.trim() ? ub.name.trim() : null) ??
        "a manager";
      const changedAt = new Date(typeof rec.updatedAt === "string" ? rec.updatedAt : now).toISOString();
      log(`[manager-notify] ${commit ? "STAGE " : "DRY   "} drift opp ${id}: ${known} → ${stage} by ${by}`);
      if (commit) {
        try {
          await writeStageEventLink(
            client,
            {
              externalId: `stage-watch:${id}:${stage}:${changedAt}`,
              fromStage: known,
              toStage: stage,
              changedBy: by,
              changedAt,
              opportunityId: id,
            },
            log
          );
          latestByOpp.set(id, { opportunityId: id, toStage: stage, changedAt });
        } catch (e) {
          counts.failed++;
          counts.firstError ??= `stage-watch/${id}: ${(e as Error).message.slice(0, 160)}`;
        }
      }
    }
  }

  // 4. Stage events. Human moves (section 3b writes them with the workspace
  // workspace member's name) ARE the feed; stage-ai is retired (no auto
  // moves — owner 2026-08-13), deal-broadcast stays as the ops receipt, and
  // bare numeric changedBy are Bitrix legacy ids — not a person, not shown.
  const stageEvents: Record<string, unknown>[] = [];
  for await (const rec of client.listAll<Record<string, unknown>>("stageEvents", {
    filter: `changedAt[gte]:${sinceIso}`,
  })) {
    const by = typeof rec.changedBy === "string" ? rec.changedBy : "";
    if (by === "stage-ai" || /^\d+$/.test(by)) continue;
    stageEvents.push(rec);
  }
  // Join the opportunity for the phone/car/days/price the lines carry.
  const oppCache = new Map<string, Record<string, unknown> | null>();
  const oppFor = async (id: string): Promise<Record<string, unknown> | null> => {
    if (oppCache.has(id)) return oppCache.get(id) ?? null;
    let rec: Record<string, unknown> | null = null;
    try {
      const res = await client.get<Record<string, Record<string, unknown>>>(`opportunities/${id}`);
      rec = (res?.data?.opportunity ?? null) as Record<string, unknown> | null;
    } catch { /* the line just goes out with less context */ }
    oppCache.set(id, rec);
    return rec;
  };
  for (const rec of stageEvents) {
    const oppId = typeof rec.opportunityId === "string" ? rec.opportunityId : null;
    const opp = oppId ? await oppFor(oppId) : null;
    const phone = digitsFromOpp(opp);
    const by = rec.changedBy as string;
    const at = new Date(typeof rec.changedAt === "string" ? rec.changedAt : now);
    if (by === "deal-broadcast") {
      const amount = opp?.amount as { amountMicros?: number } | null;
      events.push({
        key: `${scope}:deal_broadcast:${String(rec.id)}`,
        kind: "deal_broadcast",
        line: dealBroadcastLine({
          phone,
          car: opp?.carModels,
          days: opp?.rentalDays,
          priceAed: amount && Number(amount.amountMicros) ? Math.round(Number(amount.amountMicros) / 1_000_000) : null,
        }),
        at,
      });
    } else {
      events.push({
        key: `${scope}:stage_move:${String(rec.id)}`,
        kind: "stage_move",
        line:
          progressLine({
            lead: leadNo(opp),
            phone,
            fromLabel: stageLabel(deps.instance, typeof rec.fromStage === "string" ? rec.fromStage : ""),
            toLabel: stageLabel(deps.instance, typeof rec.toStage === "string" ? rec.toStage : ""),
            by,
          }) + linkTail(deps, phone, oppId),
        at,
      });
    }
  }

  // 6. Docs — OCR lines whose tail9 maps to an OPEN opportunity.
  const docTails = new Map<string, { digits: string; hits: DocHit[] }>();
  for (const m of docMessages) {
    const hit = detectDoc(m.body, now);
    if (!hit) continue;
    const k = threadKeyFor({
      id: m.id, channel: "whatsapp", from: m.from, fromPn: m.fromPn,
      to: null, customerName: null, body: m.body, createdAt: m.at,
    });
    if (!k) continue;
    const entry = docTails.get(k.key) ?? { digits: k.digits, hits: [] };
    entry.hits.push(hit);
    docTails.set(k.key, entry);
  }
  if (docTails.size > 0) {
    const openDeals = await fetchOpportunitiesForTails(client, [...docTails.keys()], deps.brandLine);
    for (const [tail, { digits, hits }] of docTails) {
      if (!openDeals.get(tail)?.open) continue;
      events.push({
        key: `${scope}:docs:${tail}:${day}`,
        kind: "docs",
        line: docsLine(digits, hits),
        at: now,
      });
    }
  }

  // 7. Returns, overdue, fines.
  const { start: dayStart, end: dayEnd } = dubaiDayBounds(now);
  for (const r of rentals) {
    if (r.status === "active" && r.returnDate >= dayStart && r.returnDate < dayEnd) {
      events.push({
        key: `${scope}:return_today:${r.id}:${day}`,
        kind: "return_today",
        line: returnTodayLine(r.plate, r.car),
        at: now,
      });
    } else if (r.status === "active" && r.returnDate < dayStart) {
      const days = Math.max(1, Math.round((dayStart.getTime() - r.returnDate.getTime()) / 86_400_000));
      events.push({
        key: `${scope}:overdue:${r.id}:${day}`,
        kind: "overdue",
        line: overdueLine(r.plate, r.car, days),
        at: now,
      });
    }
    if (r.fines && r.fines.checked && typeof r.fines.amount === "number" && r.fines.amount > 0 && r.updatedAt > since) {
      const note = r.fines.note ?? "";
      const count = note && !/no fines/i.test(note) ? note.split("\n").filter((l) => l.trim()).length : null;
      events.push({
        key: `${scope}:fines:${r.id}:${dayKeyDubai(r.updatedAt)}`,
        kind: "fines",
        line: finesLine(r.plate, r.fines.amount, count),
        at: r.updatedAt,
      });
    }
  }

  // ── Dedupe, then deliver / park. ─────────────────────────────────────────
  const fresh = events.filter((e) => {
    if (sentKeys.has(e.key)) {
      counts.deduped++;
      return false;
    }
    return true;
  });
  counts.events = fresh.length;

  const park: SpoolEntry[] = [];
  const deliverNow = !counts.quietHours && chatId !== null;
  // Staff chat cache for this pass (agent alerts resolve a tail → chat once).
  const staffChat = new Map<string, string | null>();
  const chatForTail = async (tail: string): Promise<string | null> => {
    if (!staffChat.has(tail)) staffChat.set(tail, await source.resolveManagerChatId(tail));
    return staffChat.get(tail) ?? null;
  };
  for (const e of fresh) {
    // Agent alerts: immediate DM to the staff member, quiet hours do NOT
    // park them (a missed call is a call-back-now action). Unlinked agent =
    // skip with a log; the manager's own missed_call line is the backstop.
    if (e.toPhoneTail) {
      const target = await chatForTail(e.toPhoneTail);
      if (!target) {
        log(`[manager-notify] SKIP (agent …${e.toPhoneTail} not linked) ${e.line.split("\n")[0]}`);
        sentKeys.add(e.key);
        continue;
      }
      log(`[manager-notify] ${commit ? "SEND " : "DRY  "} →agent…${e.toPhoneTail} ${e.line.split("\n")[0]}`);
      if (commit) {
        try {
          await deps.send(target, e.line);
          counts.sent++;
        } catch (err) {
          // No park: the spool flushes to the MANAGER, an agent line would
          // land with the wrong person. The manager's own line is the copy.
          counts.failed++;
          counts.firstError ??= (err as Error).message.slice(0, 160);
        }
      }
      sentKeys.add(e.key);
      continue;
    }
    log(`[manager-notify] ${deliverNow ? (commit ? "SEND " : "DRY  ") : "SPOOL"} ${e.line}`);
    if (!deliverNow) {
      park.push({ key: e.key, line: e.line, at: e.at.toISOString(), quiet: counts.quietHours });
      counts.spooled++;
      continue;
    }
    if (commit && chatId) {
      try {
        await deps.send(chatId, e.line);
        counts.sent++;
      } catch (err) {
        // Best-effort per line: a failed send is PARKED (never dropped) and
        // the pass proceeds.
        counts.failed++;
        counts.firstError ??= (err as Error).message.slice(0, 160);
        park.push({ key: e.key, line: e.line, at: e.at.toISOString(), quiet: false });
        continue;
      }
    }
    sentKeys.add(e.key);
  }

  if (commit) {
    // Parked events are handled (the spool owns their delivery now) — mark
    // their keys so a --since backfill doesn't emit them twice.
    for (const p of park) sentKeys.add(p.key);
    await spool.append(park);

    // ── Flush: linked manager, outside quiet hours, and the spool held
    //    entries when the pass STARTED → ONE consolidated message (morning
    //    roundup / earlier updates). On success only the freshly-parked
    //    entries stay behind.
    if (preParked.length > 0 && chatId && !counts.quietHours) {
      const messages = consolidatedMessages(preParked);
      let failedFlush = false;
      for (const text of messages) {
        try {
          await deps.send(chatId, text);
        } catch (err) {
          failedFlush = true;
          counts.failed++;
          counts.firstError ??= `flush: ${(err as Error).message.slice(0, 160)}`;
          break;
        }
      }
      if (!failedFlush) {
        counts.flushed = preParked.length;
        log(`[manager-notify] FLUSH ${preParked.length} parked event(s) → consolidated message`);
        await spool.replace(park);
      }
    }

    await sentKeys.persist();
    // The checkpoint moves past the whole pass — sent, spooled AND failed
    // alike: failures are parked in the spool, so nothing is lost by moving on.
    await source.saveCheckpoint(passStart);
  }

  return counts;
}

// ─── Shared staff-DM sender + chat resolution ───────────────────────────────
//
// §3 of the manager-notify spec: EVERY staff DM (manager events, deal
// nudges, B2B hints) goes through these two helpers — never a forked copy.
// sendMessage ONLY, never getUpdates: otp-bot owns polling on this token.

/**
 * One Telegram DM to a resolved chat_id. Plain Bot API, bounded; throws on
 * failure — the caller decides whether that is loud (boot check) or logged
 * (per-line best-effort).
 */
export async function sendTelegramDm(
  chatId: string,
  text: string,
  opts: { token?: string } = {}
): Promise<void> {
  const token = opts.token?.trim() || process.env.TELEGRAM_OTP_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_OTP_BOT_TOKEN is not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}: ${body.slice(0, 300)}`);
  const data = JSON.parse(body) as { ok?: boolean; description?: string };
  if (!data.ok) throw new Error(`Telegram ok=false: ${data.description ?? "unknown"}`);
}

/**
 * telegram_link chat_id for a phone tail9 (last 9 digits) — how the manager's
 * DM target is found (he /start'ed @zamtek_otp_bot and linked his number).
 * Null = not linked yet; callers spool or skip, never guess a chat.
 * telegram_link is a GLOBAL table (no tenant_id — schema.ts §1.5).
 */
export async function resolveTelegramChatIdByPhoneTail(
  db: PlatformDb,
  phoneTail9: string
): Promise<string | null> {
  const res = await db.execute(sql`
    SELECT chat_id
      FROM telegram_link
     WHERE length(regexp_replace(coalesce(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
       AND right(regexp_replace(coalesce(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${phoneTail9}
     ORDER BY linked_at DESC
     LIMIT 1
  `);
  const row = sqlRows<{ chat_id: string }>(res)[0];
  return row?.chat_id ?? null;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "manager_notify";

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

export function createDrizzleManagerNotifySource(db: PlatformDb, tenantId: string): ManagerNotifySource {
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
      await db.execute(sql`
        INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
        VALUES (${tenantId}, ${CHECKPOINT_ENTITY}, '', ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, 'running', now())
        ON CONFLICT (tenant_id, entity)
        DO UPDATE SET counts = ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, updated_at = now()
      `);
    },

    async loadCallEvents(since, limit) {
      const res = await db.execute(sql`
        SELECT id, provider_event_id, raw_payload, received_at
          FROM integration_event
         WHERE tenant_id = ${tenantId}
           AND provider = 'callgear'
           AND received_at > ${since}
         ORDER BY received_at ASC
         LIMIT ${limit}
      `);
      interface Row { id: string; provider_event_id: string; raw_payload: unknown; received_at: string }
      return sqlRows<Row>(res).map((r) => {
        const p = (r.raw_payload as { params?: Record<string, unknown> } | null)?.params ?? {};
        return {
          id: r.id,
          callId: typeof p.callId === "string" ? p.callId : r.provider_event_id,
          direction: typeof p.direction === "string" ? p.direction : null,
          from: typeof p.from === "string" ? p.from : null,
          to: typeof p.to === "string" ? p.to : null,
          agentName:
            typeof (p.agent as { name?: unknown } | undefined)?.name === "string"
              ? ((p.agent as { name: string }).name)
              : null,
          // Same answered rule as the relay: no talk time = never picked up.
          duration: Number.isFinite(Number(p.duration)) ? Number(p.duration) : 0,
          startTime: typeof p.startTime === "string" ? p.startTime : null,
        };
      });
    },

    async loadCallSummaries(since, limit) {
      const res = await db.execute(sql`
        SELECT ct.id, ct.summary_json, ct.updated_at,
               e.raw_payload #>> '{params,direction}' AS direction,
               e.raw_payload #>> '{params,from}'     AS from_phone,
               e.raw_payload #>> '{params,to}'       AS to_phone,
               e.raw_payload #>> '{params,agent,name}' AS agent_name
          FROM call_transcript ct
          JOIN integration_event e ON e.id = ct.integration_event_id
         WHERE ct.tenant_id = ${tenantId}
           AND ct.status IN ('done', 'completed')
           AND ct.summary_json IS NOT NULL
           AND ct.updated_at > ${since}
         ORDER BY ct.updated_at ASC
         LIMIT ${limit}
      `);
      interface Row {
        id: string;
        summary_json: {
          carOfInterest?: unknown; rentalDays?: unknown; quotedPriceAed?: unknown;
        } | null;
        updated_at: string;
        direction: string | null;
        from_phone: string | null;
        to_phone: string | null;
        agent_name: string | null;
      }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id,
        agentName: displayAgentName(r.agent_name),
        fromPhone: r.direction === "outbound" ? r.to_phone : r.from_phone,
        toPhone: r.direction === "outbound" ? r.from_phone : r.to_phone,
        car: typeof r.summary_json?.carOfInterest === "string" ? r.summary_json.carOfInterest : null,
        days: typeof r.summary_json?.rentalDays === "number" ? r.summary_json.rentalDays : null,
        priceAed: typeof r.summary_json?.quotedPriceAed === "number" ? r.summary_json.quotedPriceAed : null,
        at: new Date(r.updated_at),
      }));
    },

    async loadDocMessages(since, limit) {
      // The SQL narrows to plausible doc lines; detectDoc (pure) makes the
      // real call — media-OCR lines only.
      const res = await db.execute(sql`
        SELECT id, "from", from_pn, body, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND direction = 'inbound'
           AND channel IN ('whatsapp', 'telegram')
           AND body IS NOT NULL
           AND created_at > ${since}
           AND (body ILIKE '%driving licen%' OR body ILIKE '%driver''s licen%'
                OR body ILIKE '%emirates id%' OR body ILIKE '%eid%'
                OR body ILIKE '%passport%' OR body ILIKE '%identity card%')
         ORDER BY created_at ASC
         LIMIT ${limit}
      `);
      interface Row { id: string; from: string | null; from_pn: string | null; body: string | null; created_at: string }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id, from: r.from, fromPn: r.from_pn, body: r.body, at: new Date(r.created_at),
      }));
    },

    async loadRentals(since, dayStart, dayEnd) {
      const res = await db.execute(sql`
        SELECT r.id, r.status, r.return_date, r.updated_at,
               v.plate, v.make, v.model, r.return_checklist
          FROM rental r
          JOIN vehicle v ON v.id = r.vehicle_id
         WHERE r.tenant_id = ${tenantId}
           AND (
             (r.status = 'active' AND r.return_date < ${dayEnd})
             OR (r.updated_at > ${since} AND r.return_checklist -> 'fines' IS NOT NULL)
           )
         ORDER BY r.updated_at ASC
         LIMIT 200
      `);
      interface Row {
        id: string; status: string; return_date: string; updated_at: string;
        plate: string; make: string; model: string;
        return_checklist: { fines?: RawRental["fines"] } | null;
      }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id,
        status: r.status,
        returnDate: new Date(r.return_date),
        updatedAt: new Date(r.updated_at),
        plate: r.plate,
        car: `${r.make} ${r.model}`.trim(),
        fines: r.return_checklist?.fines ?? null,
      }));
    },

    async resolveManagerChatId(phoneTail9) {
      return resolveTelegramChatIdByPhoneTail(db, phoneTail9);
    },
  };
}
