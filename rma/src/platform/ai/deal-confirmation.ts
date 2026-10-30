// DEAL CONFIRMATION → BROADCAST + PROTOCOL (rental board only).
//
// When a rental deal is CONFIRMED in the conversation AND the documents
// validate, this pass:
//   1. posts the deal card to the team's Telegram "Deliveries Control Group"
//      in their exact accustomed format (composeDealCard — the template is
//      verbatim, typo included);
//   2. protocols it in Twenty: a note with the posted text + doc-validation
//      summary, a fill-the-blanks fact patch (rentalDays / neededFrom /
//      carModels / amount — never an overwrite), and ONE stageEvents audit
//      row keyed `broadcast:<opportunityId>`. NO STAGE MOVE (owner
//      2026-08-13): cards never move automatically — the manager drags the
//      deal to Preparation of the Car himself once he acts on the broadcast.
//   3. appends the booking to Babek's Google Sheet (gated on SA creds — the
//      sheet never gates the broadcast).
//
// IDEMPOTENCY: the stageEvents externalId `broadcast:<opportunityId>` is
// queried BEFORE anything is sent — a deal that already has it is never
// broadcast twice. The row is written only after the Telegram post and the
// Twenty note both landed, so a crash mid-deal retries safely.
//
// Same architecture as stage-progression.ts / wa-lead-relay.ts: PURE decision
// logic (buildDealThreads / parseDealAnalysis / namesMatch / planDealBroadcast
// / composeDealCard — no IO, unit-tested) separated from the adapters that
// talk to the platform DB (DealBroadcastSource), to Twenty (the rate-limited
// client), to Telegram (send) and to the sheet (append).
//
// THE RAILS (planDealBroadcast — ALL required, else skip with a "missing"
// list; dry-run prints it and NOBODY is messaged):
//   - `confirmed` with verbatim evidence (the customer explicitly agreed to
//     car/price/terms);
//   - car + priceAed + durationDays + from/to dates all present;
//   - docs.license.present AND docs.id.present — document photos arrive as
//     "[image] <OCR text>" message lines (media-processor OCR already names
//     "Emirates ID / driving licence"); those lines ARE the documents;
//   - nameOnDoc fuzzy-matches the customer/person name (namesMatch);
//   - expiry, when readable, not in the past.
//
// DRY-RUN BY DEFAULT — zero writes anywhere (no Telegram, no Twenty, no
// sheet, no checkpoint) until the runner passes --commit. The checkpoint
// moves to the pass START on commit only.

import { and, eq, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { twentyMirrorState } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import { formatDateTime } from "@/lib/format";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import {
  fetchOpportunitiesForTails,
  type OpportunityMatch,
} from "@/platform/integrations/twenty/deal-link";
import type { TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { writeStageEventLink } from "./stage-progression";
import { phoneFromBody } from "@/platform/integrations/twenty/wa-lead-relay";
import { dayKeyDubai, type SentKeys } from "@/platform/notify/manager-events";

type PlatformDb = typeof platformDb;

/** Idempotency key — also the stageEvents audit externalId. */
export function broadcastExternalId(opportunityId: string): string {
  return `broadcast:${opportunityId}`;
}

// ─── Threads (both directions — a confirmation needs our offers too) ────────

export interface DealRelayRow {
  id: string;
  channel: string;
  direction: string;
  from: string | null;
  fromPn: string | null;
  to: string | null;
  customerName: string | null;
  body: string | null;
  createdAt: Date;
}

export interface DealThreadLine {
  direction: string;
  body: string;
  at: Date;
}

export interface DealCallLine {
  summary: string;
  at: Date;
}

/** One phone number's merged conversation (messages + call summaries). */
export interface DealThread {
  key: string;
  digits: string;
  channel: string;
  participantName: string | null;
  sourceContext: string | null;
  lines: DealThreadLine[];
  calls: DealCallLine[];
  lastActivityAt: Date;
}

/**
 * Same honest-identity rule as wa-lead-relay's threadKeyFor, extended with
 * direction: outbound rows key on the RECIPIENT (`to`), inbound on the
 * participant (from_pn → phone-in-body → from). A group JID or a tg: id is
 * never a key — outbound INTO a group names the room and keys nothing.
 */
export function dealThreadKeyFor(row: DealRelayRow): { key: string; digits: string } | null {
  const opaque = (v: string) => v.endsWith("@g.us") || v.startsWith("tg:");
  let raw: string | null;
  if (row.direction === "outbound") {
    const to = (row.to ?? "").trim();
    raw = opaque(to) ? null : to;
  } else {
    const from = (row.from ?? "").trim();
    raw = row.fromPn?.trim() || phoneFromBody(row.body) || (opaque(from) ? null : from);
  }
  const digits = normalizePhone(raw);
  if (digits.length < MIN_PHONE_MATCH_DIGITS) return null;
  return { key: digits.slice(-MIN_PHONE_MATCH_DIGITS), digits };
}

export function buildDealThreads(rows: DealRelayRow[]): Map<string, DealThread> {
  const threads = new Map<string, DealThread>();
  for (const row of rows) {
    const body = (row.body ?? "").trim();
    if (!body) continue;
    const k = dealThreadKeyFor(row);
    if (!k) continue;
    const existing = threads.get(k.key);
    const line: DealThreadLine = { direction: row.direction, body, at: row.createdAt };
    if (!existing) {
      threads.set(k.key, {
        key: k.key,
        digits: k.digits,
        channel: row.channel,
        participantName: row.customerName?.trim() || null,
        sourceContext: (row.from ?? "").endsWith("@g.us") ? row.from : null,
        lines: [line],
        calls: [],
        lastActivityAt: row.createdAt,
      });
      continue;
    }
    existing.lines.push(line);
    existing.participantName ??= row.customerName?.trim() || null;
    if (row.createdAt > existing.lastActivityAt) existing.lastActivityAt = row.createdAt;
  }
  for (const t of threads.values()) {
    t.lines.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  return threads;
}

// ─── The model contract ─────────────────────────────────────────────────────

export interface DealFacts {
  customerName: string | null;
  car: string | null;
  /** TOTAL agreed rent in AED for the whole period. */
  priceAed: number | null;
  durationDays: number | null;
  /** ISO yyyy-mm-dd. */
  from: string | null;
  to: string | null;
  depositAed: number | null;
  paymentMethod: string | null;
  deliveryLocation: string | null;
  deliveryTime: string | null;
}

export interface DocCheck {
  present: boolean;
  nameOnDoc: string | null;
  expiry: string | null;
}

export interface DealAnalysis {
  facts: DealFacts;
  docs: { license: DocCheck; id: DocCheck };
  /** The customer explicitly agreed to the car/price/terms. */
  confirmed: boolean;
  /** Verbatim quotes from the conversation — the write gate. */
  evidence: string[];
}

const DEAL_SYSTEM =
  `You are reading the WhatsApp/Telegram conversation of a UAE car-rental deal ` +
  `(lines marked "Customer" wrote to us, "Sales" is our side; "[image] ..." ` +
  `lines are OCR text of photos the customer sent — the OCR names the document ` +
  `type, e.g. "Emirates ID" or "driving licence", its holder and dates). ` +
  `Extract the state of the deal and respond with ONLY a JSON object (no ` +
  `prose, no markdown) with exactly these fields:\n` +
  `- dealFacts: {customerName, car, priceAed (TOTAL rent in AED for the whole ` +
  `period, number), durationDays (number), from, to (ISO yyyy-mm-dd), ` +
  `depositAed (number or null), paymentMethod, deliveryLocation, deliveryTime} ` +
  `— null for anything the conversation does not state.\n` +
  `- docs: {license: {present, nameOnDoc, expiry}, id: {present, nameOnDoc, ` +
  `expiry}} — present=true ONLY when an "[image]" line's OCR shows that ` +
  `document (driving licence / Emirates ID or passport); nameOnDoc/expiry as ` +
  `read, null when unreadable.\n` +
  `- confirmed: true ONLY when the customer explicitly agreed to take a car at ` +
  `a stated price/terms ("ok", "confirmed", "book it", agreement to a quote). ` +
  `Questions, negotiations and silence are NOT confirmation.\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character ` +
  `from the conversation below that prove the confirmation. Never invent a quote.`;

const MAX_THREAD_MESSAGES = 40;
const MAX_THREAD_CHARS = 6000;
const MAX_CALL_LINES = 5;

export interface DealPrompt {
  system: string;
  user: string;
  /** Every `evidence` string must be a verbatim substring of this. */
  sourceText: string;
}

export function buildDealPrompt(thread: DealThread, cardName: string | null): DealPrompt {
  const recent = thread.lines.slice(-MAX_THREAD_MESSAGES);
  const kept: string[] = [];
  let chars = 0;
  for (const line of [...recent].reverse()) {
    if (chars + line.body.length > MAX_THREAD_CHARS) break;
    chars += line.body.length;
    const who = line.direction === "outbound" ? "Sales" : "Customer";
    kept.unshift(`[${line.at.toISOString()}] ${who}: ${line.body}`);
  }
  const callLines = thread.calls
    .slice(-MAX_CALL_LINES)
    .map((c) => `[${c.at.toISOString()}] ☎ call summary: ${c.summary}`);
  const sourceText = [...kept, ...callLines].join("\n");
  const user =
    `Deal card: ${cardName ?? "unknown"}\n\nConversation (oldest first):\n${sourceText || "none"}`;
  return { system: DEAL_SYSTEM, user, sourceText };
}

// ─── Output validation (the stage-progression evidence gate) ────────────────

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;
const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

function parseDoc(v: unknown): DocCheck | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  if (typeof d.present !== "boolean") return null;
  return { present: d.present, nameOnDoc: strOrNull(d.nameOnDoc), expiry: strOrNull(d.expiry) };
}

/**
 * Parse + gate the model's answer. Returns null — SKIP — when the JSON is
 * malformed, off-shape, `evidence` is empty, or any quote is not a verbatim
 * substring of `sourceText` (an invented quote proves the whole reading is
 * untrustworthy). Document lines are part of sourceText, so OCR quotes gate
 * exactly like conversation quotes.
 */
export function parseDealAnalysis(content: string, sourceText: string): DealAnalysis | null {
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
  const f = parsed.dealFacts;
  if (!f || typeof f !== "object") return null;
  const license = parseDoc(parsed.docs?.license);
  const id = parseDoc(parsed.docs?.id);
  if (!license || !id) return null;
  if (typeof parsed.confirmed !== "boolean") return null;
  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) return null;
  const evidence: string[] = [];
  for (const quote of parsed.evidence) {
    if (typeof quote !== "string" || !quote.trim()) return null;
    if (!sourceText.includes(quote)) return null;
    evidence.push(quote);
  }
  return {
    facts: {
      customerName: strOrNull(f.customerName),
      car: strOrNull(f.car),
      priceAed: numOrNull(f.priceAed),
      durationDays: numOrNull(f.durationDays),
      from: strOrNull(f.from),
      to: strOrNull(f.to),
      depositAed: numOrNull(f.depositAed),
      paymentMethod: strOrNull(f.paymentMethod),
      deliveryLocation: strOrNull(f.deliveryLocation),
      deliveryTime: strOrNull(f.deliveryTime),
    },
    docs: { license, id },
    confirmed: parsed.confirmed,
    evidence,
  };
}

// ─── Name matching (the doc rail) ───────────────────────────────────────────

/**
 * Minimal Cyrillic→Latin transliteration (passport style) so "Иван Петров"
 * on a licence matches "Ivan Petrov" on the card. Deliberately approximate —
 * it exists to stop a broadcast when the doc names a DIFFERENT person, not to
 * win spelling bees.
 */
const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function nameTokens(name: string | null | undefined): string[] {
  const lower = (name ?? "").toLowerCase();
  const translit = [...lower].map((ch) => CYR_TO_LAT[ch] ?? ch).join("");
  return translit
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort();
}

/**
 * Case/space/order-insensitive, Cyrillic/Latin-tolerant name match. Token
 * sets are compared with SUBSET tolerance: the doc's full legal name
 * ("ivan petrov sidorov") matches the card's "ivan petrov" because every card
 * token appears on the doc. Empty either side never matches.
 */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return shorter.every((t) => longer.includes(t));
}

// ─── Expiry (the doc rail) ──────────────────────────────────────────────────

/**
 * Parse a document expiry as written on UAE docs: dd/mm/yyyy, dd/mm/yy,
 * yyyy-mm-dd, mm/yyyy. Returns null when unreadable — the rail only fails on
 * a READABLE date in the past (an unreadable expiry is the model's problem,
 * not a forged document).
 */
export function parseDocDate(raw: string | null | undefined): Date | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // dd/mm/yyyy
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})$/); // dd/mm/yy
  if (m) return new Date(Date.UTC(2000 + +m[3], +m[2] - 1, +m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); // ISO
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{4})$/); // mm/yyyy — valid to month's end
  if (m) return new Date(Date.UTC(+m[2], +m[1], 0));
  return null;
}

/** true = readable AND in the past (rail fails). null = unreadable (rail passes). */
export function expiryInPast(expiry: string | null | undefined, now: Date): boolean | null {
  const d = parseDocDate(expiry);
  if (!d) return null;
  return d.getTime() < now.getTime();
}

// ─── The composer (THEIR template — verbatim, typo included) ────────────────

/** d/m/yy — the card's date format ("5/8/26"). */
function fmtCardDate(iso: string): string {
  const d = parseDocDate(iso) ?? new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(2)}`;
}

/** d/m/yyyy — the sheet's date format (matches import-babek-fleet.ts toDate). */
function fmtSheetDate(iso: string): string {
  const d = parseDocDate(iso) ?? new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`;
}

export interface DealCardContext {
  /** Display name ("Cardiwan" / "EasyRent"). */
  brand: string;
  /** Sheet brand key ("C" / "E" — the E/C column convention). */
  brandKey: string;
  /** "+"-prefixed customer digits. */
  phone: string;
  /** Fleet plate from the fuzzy vehicle match, null → blank like their cards. */
  plate: string | null;
  /** "Manager:" line — the brand until a manager is attributable. */
  manager: string;
}

/**
 * The Deliveries-Control card, character-for-character in their format:
 * section order, emoji, blank-line spacing, and their "Warninigs" typo all
 * preserved. Unknown fields stay blank exactly like their real cards do.
 */
export function composeDealCard(facts: DealFacts, ctx: DealCardContext): string {
  const from = facts.from ? fmtCardDate(facts.from) : "";
  const to = facts.to ? fmtCardDate(facts.to) : "";
  const total = (facts.priceAed ?? 0) + (facts.depositAed ?? 0);
  return [
    "▶️ #выдача / #opencontract ",
    "",
    `🧑‍💻 Manager: ${ctx.manager}`,
    "",
    `🧍 Client Name: ${facts.customerName ?? ""}`,
    "",
    `📞 Phone Number: ${ctx.phone}`,
    "",
    `📍 Location: ${facts.deliveryLocation ?? ""}`,
    "",
    `⏱️ Time: ${facts.deliveryTime ?? ""}`,
    "",
    "📱 CRM: ",
    "",
    `Car model: ${facts.car ?? ""}`,
    `Company: ${ctx.brand}`,
    `Plate number: ${ctx.plate ?? ""}`,
    `Limit: 250/${facts.durationDays ?? ""}`,
    "",
    `Delivery date: ${from}`,
    `Pickup date: ${to}`,
    "",
    `Rent: ${facts.priceAed ?? ""}`,
    `Deposit / Cardoo: ${facts.depositAed ?? ""}`,
    "Delivery: ",
    "Additional services: ",
    "——————",
    "Mileage: ",
    "Fuel: ",
    "Washer fluid: ✅",
    "Coolant: ✅",
    "Engine oil: ✅",
    "Warninigs: ✅",
    "Tire pressure: ✅",
    "",
    `💰 Total Amount: ${total || ""}`,
    `Payment method: ${facts.paymentMethod ?? ""}`,
    "",
    "📝 Notes: ",
  ].join("\n");
}

/** One line per document for the Twenty note's validation summary. */
export function docsSummary(docs: DealAnalysis["docs"], now: Date): string {
  const line = (label: string, d: DocCheck): string => {
    if (!d.present) return `${label}: NOT seen`;
    const bits = [d.nameOnDoc ?? "name unreadable"];
    const expired = expiryInPast(d.expiry, now);
    bits.push(d.expiry ? `expires ${d.expiry}${expired ? " (EXPIRED)" : ""}` : "expiry unreadable");
    return `${label}: ${bits.join(", ")}`;
  };
  return [line("Driving licence", docs.license), line("Emirates ID", docs.id)].join("\n");
}

/** The salesperson-nudge DM for a deal that failed the rails (Core Job 1):
 *  `⏳ <name> · <car> · missing: license photo, return date`. */
export function nudgeLine(name: string, car: string | null, missing: string[]): string {
  return `⏳ ${name} · ${car ?? "?"} · missing: ${missing.join(", ")}`;
}

// ─── The pure planner ───────────────────────────────────────────────────────

export interface DealBroadcastInput {
  thread: DealThread;
  /** The Twenty person behind the card (name fallback for the doc rail). */
  personName: string | null;
  analysis: DealAnalysis | null;
  brand: string;
  brandKey: string;
  plate: string | null;
  /**
   * The fleet-availability rail (Core Job 1): computed by the pass when the
   * facts name a car AND both dates — freeCount must be >= 1 to broadcast.
   * null = not evaluated (car/dates missing → those rails fire instead).
   * assignedPlate: the single free car's plate when exactly one is free —
   * it beats the fuzzy `plate` on the card.
   */
  availability?: { checked: boolean; freeCount: number; assignedPlate: string | null } | null;
  now: Date;
}

export type DealBroadcastPlan =
  | {
      action: "broadcast";
      cardText: string;
      sheetRow: string[];
      facts: DealFacts;
      docs: string;
    }
  | { action: "skip"; missing: string[] };

/**
 * The ONLY broadcast decision this module makes. Every rail is a real failure
 * seen in this traffic; the "missing" list is what the dry-run prints so the
 * desk can see WHY a deal did not go out.
 */
export function planDealBroadcast(input: DealBroadcastInput): DealBroadcastPlan {
  const { analysis } = input;
  if (!analysis) return { action: "skip", missing: ["model output missing or failed the evidence gate"] };

  const missing: string[] = [];
  const f = analysis.facts;
  if (!analysis.confirmed) missing.push("customer confirmation (explicit yes to car/price/terms)");
  if (!f.car) missing.push("car");
  if (!f.priceAed) missing.push("price (AED)");
  if (!f.durationDays) missing.push("duration (days)");
  const fromOk = f.from && !Number.isNaN((parseDocDate(f.from) ?? new Date(f.from)).getTime());
  const toOk = f.to && !Number.isNaN((parseDocDate(f.to) ?? new Date(f.to)).getTime());
  if (!fromOk || !toOk) missing.push("from/to dates");
  if (!analysis.docs.license.present) missing.push("driving licence photo");
  if (!analysis.docs.id.present) missing.push("Emirates ID photo");

  // The doc must name THE customer — card name, then conversation name, then
  // the WhatsApp push name, in that trust order.
  const customer = f.customerName ?? input.personName ?? input.thread.participantName;
  if (!customer) {
    missing.push("customer name");
  } else {
    if (analysis.docs.license.present && !namesMatch(analysis.docs.license.nameOnDoc, customer)) {
      missing.push(`licence name "${analysis.docs.license.nameOnDoc ?? "?"}" ≠ customer "${customer}"`);
    }
    if (analysis.docs.id.present && !namesMatch(analysis.docs.id.nameOnDoc, customer)) {
      missing.push(`ID name "${analysis.docs.id.nameOnDoc ?? "?"}" ≠ customer "${customer}"`);
    }
  }
  if (expiryInPast(analysis.docs.license.expiry, input.now) === true) missing.push("licence expired");
  if (expiryInPast(analysis.docs.id.expiry, input.now) === true) missing.push("ID expired");

  // Fleet-availability rail: the named car must have a FREE vehicle for the
  // exact from/to period — a confirmed deal we cannot put a car under is not
  // a delivery, it is a broken promise posted to the team.
  if (input.availability?.checked && input.availability.freeCount < 1) {
    missing.push(`car availability (0 free ${f.car ?? "car"} for those dates)`);
  }

  if (missing.length > 0) return { action: "skip", missing };

  const ctx: DealCardContext = {
    brand: input.brand,
    brandKey: input.brandKey,
    phone: `+${input.thread.digits}`,
    // The free car the availability check singled out beats the fuzzy match.
    plate: input.availability?.assignedPlate ?? input.plate,
    manager: input.brand,
  };
  return {
    action: "broadcast",
    cardText: composeDealCard(f, ctx),
    // Their exact columns (see import-babek-fleet.ts): car, model+colour,
    // E/C, plate, status, client, start, end, manager.
    sheetRow: [
      f.car ?? "",
      "",
      input.brandKey,
      input.plate ?? "",
      "Booked",
      customer ?? "",
      f.from ? fmtSheetDate(f.from) : "",
      f.to ? fmtSheetDate(f.to) : "",
      input.brand,
    ],
    facts: f,
    docs: docsSummary(analysis.docs, input.now),
  };
}

// ─── Core pass (DB-agnostic, fully testable) ────────────────────────────────

export interface DealBroadcastSource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  /** whatsapp/telegram rows (BOTH directions, groups included) since `since`. */
  loadRows(since: Date, limit: number): Promise<DealRelayRow[]>;
  /** Call summaries since `since`, keyed by caller tail9. */
  loadCallLines(since: Date, limit: number): Promise<Map<string, DealCallLine[]>>;
  /** Fleet plate for a car the customer named; null = no confident match. */
  findPlate(carText: string): Promise<string | null>;
  /** The fleet-availability rail: cars of the named model minus any with an
   *  active/reserved rental overlapping [from, to). */
  checkAvailability(
    carText: string,
    from: Date,
    to: Date
  ): Promise<{ checked: boolean; freeCount: number; assignedPlate: string | null }>;
}

export interface DealBroadcastDeps {
  client: TwentyClient;
  instance: TwentyInstanceKey;
  tenantSlug: string;
  brandLine: string | null;
  brandDisplay: string;
  brandKey: string;
  opportunityFields: ReadonlySet<string>;
  source: DealBroadcastSource;
  /** One strict-JSON completion from the tenant's model; null = no analysis. */
  complete: ((system: string, user: string) => Promise<string>) | null;
  /** Post the card to the Deliveries Control Group; resolves message_id. */
  telegram: { send(text: string): Promise<string> };
  /** Append the booking row; "skipped" when no SA creds — never throws null. */
  sheet: { append(row: string[]): Promise<"ok" | "skipped"> };
  /**
   * The manager DM for rail-failure nudges (Core Job 1) — the shared sender
   * from notify/manager-events.ts (§3), wired by the runner. Absent = no
   * nudges (the dry-run missing-list print remains).
   */
  managerDm?: { resolveChatId(): Promise<string | null>; send(chatId: string, text: string): Promise<void> };
  /** Nudge dedupe sidecar: one nudge per deal per Dubai-day per missing-set. */
  nudgeKeys?: SentKeys;
}

export interface DealBroadcastPassOptions {
  commit?: boolean;
  since?: Date;
  /** Deals per pass. */
  batch?: number;
  rowLimit?: number;
  sinceDays?: number;
  logger?: (line: string) => void;
}

export interface DealBroadcastPassCounts {
  threads: number;
  candidates: number;
  skippedNoOpenDeal: number;
  /** Already broadcast (stageEvents marker found) — never twice. */
  skippedAlready: number;
  analyzed: number;
  skippedNoEvidence: number;
  broadcast: number;
  skippedMissing: number;
  /** Rail-failure nudges actually DM'ed to the manager (commit only). */
  nudged: number;
  sheetWritten: number;
  sheetSkipped: number;
  failed: number;
  firstError?: string;
}

const DEFAULT_BATCH = 25;
const DEFAULT_ROW_LIMIT = 500;

function emptyCounts(): DealBroadcastPassCounts {
  return {
    threads: 0,
    candidates: 0,
    skippedNoOpenDeal: 0,
    skippedAlready: 0,
    analyzed: 0,
    skippedNoEvidence: 0,
    broadcast: 0,
    skippedMissing: 0,
    nudged: 0,
    sheetWritten: 0,
    sheetSkipped: 0,
    failed: 0,
  };
}

/** Twenty list pages key their rows by the object path. */
function firstRowOf(page: unknown, objectPath: string): Record<string, unknown> | null {
  const data = (page as { data?: Record<string, unknown> })?.data ?? {};
  const rows = (data[objectPath] ?? Object.values(data).find(Array.isArray)) as
    | Record<string, unknown>[]
    | undefined;
  return rows?.[0] ?? null;
}

export async function runDealBroadcastPass(
  deps: DealBroadcastDeps,
  opts: DealBroadcastPassOptions = {}
): Promise<DealBroadcastPassCounts> {
  const { client, source } = deps;
  const commit = opts.commit ?? false;
  const log = opts.logger ?? (() => {});
  const counts = emptyCounts();

  // The pass start, captured BEFORE any read: on commit the checkpoint moves
  // here (not to now) so rows created mid-pass are seen by the next one.
  const passStart = new Date();
  const checkpoint = await source.loadCheckpoint();
  const since =
    opts.since ?? checkpoint ?? new Date(passStart.getTime() - (opts.sinceDays ?? 3) * 86_400_000);

  const [rows, callLines] = await Promise.all([
    source.loadRows(since, opts.rowLimit ?? DEFAULT_ROW_LIMIT),
    source.loadCallLines(since, opts.rowLimit ?? DEFAULT_ROW_LIMIT),
  ]);
  const threads = buildDealThreads(rows);
  for (const [tail, calls] of callLines) {
    const t = threads.get(tail);
    if (!t) continue;
    t.calls.push(...calls);
    t.calls.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  const merged = [...threads.values()]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, opts.batch ?? DEFAULT_BATCH);
  counts.threads = merged.length;

  if (merged.length > 0) {
    // tail9 → the open deal, server-side filtered, brand-scoped (Cardiwan and
    // EasyRent share the rental workspace AND customers — see deal-link.ts).
    const phoneIndex = await fetchOpportunitiesForTails(
      client,
      merged.map((t) => t.key),
      deps.brandLine
    );

    // The sheet-read-broken caveat is logged ONCE per pass, not per deal.
    let availabilityCaveatLogged = false;

    for (const thread of merged) {
      const match: OpportunityMatch | undefined = phoneIndex.get(thread.key);
      if (!match?.open) {
        counts.skippedNoOpenDeal++;
        continue;
      }
      counts.candidates++;
      try {
        // IDEMPOTENCY FIRST: a deal that already carries the broadcast marker
        // is never broadcast twice — not the group post, not the sheet row.
        const seen = firstRowOf(
          await client.get("stageEvents", {
            filter: `externalId[eq]:${broadcastExternalId(match.id)}`,
            limit: 1,
          }),
          "stageEvents"
        );
        if (seen) {
          counts.skippedAlready++;
          continue;
        }

        // The live card: stage for the guards, fact fields for the fill-the-
        // blanks patch, pointOfContact for the person name + note target.
        const res = await client.get<Record<string, Record<string, unknown>>>(
          `opportunities/${match.id}`
        );
        const opp = (res?.data?.opportunity ?? {}) as Record<string, unknown>;
        const stage = typeof opp.stage === "string" ? opp.stage : null;
        const cardName = typeof opp.name === "string" ? opp.name : null;
        let personName: string | null = null;
        let personId: string | null = null;
        const pocId =
          typeof opp.pointOfContactId === "string"
            ? opp.pointOfContactId
            : ((opp.pointOfContact as { id?: unknown } | null)?.id as string | undefined) ?? null;
        if (pocId) {
          try {
            const pr = await client.get<Record<string, Record<string, unknown>>>(`people/${pocId}`);
            const p = (pr?.data?.person ?? {}) as {
              id?: unknown;
              name?: { firstName?: unknown; lastName?: unknown };
            };
            personId = typeof p.id === "string" ? p.id : null;
            const full = [p.name?.firstName, p.name?.lastName]
              .filter((x): x is string => typeof x === "string" && !!x.trim())
              .join(" ");
            personName = full || null;
          } catch {
            /* the name only feeds a fuzzy rail — unreadable is survivable */
          }
        }

        if (!deps.complete) {
          counts.skippedNoEvidence++;
          continue;
        }
        const prompt = buildDealPrompt(thread, cardName);
        let content: string;
        try {
          content = await deps.complete(prompt.system, prompt.user);
        } catch (e) {
          counts.failed++;
          counts.firstError ??= `model/${thread.key}: ${(e as Error).message.slice(0, 160)}`;
          continue;
        }
        const analysis = parseDealAnalysis(content, prompt.sourceText);
        if (!analysis) {
          counts.skippedNoEvidence++;
          continue;
        }
        counts.analyzed++;

        const plate = analysis.facts.car ? await source.findPlate(analysis.facts.car) : null;

        // ── Fleet-availability rail (Core Job 1): when the facts name a car
        //    and both dates, count FREE fleet cars for the exact window.
        let availability: DealBroadcastInput["availability"] = null;
        const fromDate = analysis.facts.from ? (parseDocDate(analysis.facts.from) ?? new Date(analysis.facts.from)) : null;
        const toDate = analysis.facts.to ? (parseDocDate(analysis.facts.to) ?? new Date(analysis.facts.to)) : null;
        if (
          analysis.facts.car &&
          fromDate && !Number.isNaN(fromDate.getTime()) &&
          toDate && !Number.isNaN(toDate.getTime())
        ) {
          if (!availabilityCaveatLogged) {
            availabilityCaveatLogged = true;
            log("[deal-broadcast] availability checked against vehicle/rental tables — NOTE: the fleet sheet read has been failing (401), so this data may be stale");
          }
          availability = await source.checkAvailability(analysis.facts.car, fromDate, toDate);
        }

        const plan = planDealBroadcast({
          thread,
          personName,
          analysis,
          brand: deps.brandDisplay,
          brandKey: deps.brandKey,
          plate,
          availability,
          now: passStart,
        });

        if (plan.action === "skip") {
          counts.skippedMissing++;
          log(`[deal-broadcast] SKIP ${cardName ?? "?"} …${thread.key} — missing: ${plan.missing.join("; ")}`);
          // ── Salesperson nudge (Core Job 1): silence is how deals rot. One
          //    DM per deal per Dubai-day per missing-set; commit only.
          if (commit && deps.managerDm && deps.nudgeKeys) {
            const nudgeKey = `nudge:${match.id}:${dayKeyDubai(passStart)}:${plan.missing.join("|")}`;
            if (!deps.nudgeKeys.has(nudgeKey)) {
              try {
                const chatId = await deps.managerDm.resolveChatId();
                if (chatId) {
                  await deps.managerDm.send(
                    chatId,
                    nudgeLine(cardName ?? personName ?? `…${thread.key}`, analysis.facts.car, plan.missing)
                  );
                  deps.nudgeKeys.add(nudgeKey);
                  counts.nudged++;
                }
              } catch (e) {
                counts.failed++;
                counts.firstError ??= `nudge/${match.id}: ${(e as Error).message.slice(0, 160)}`;
              }
            }
          }
          continue;
        }

        log(
          `[deal-broadcast] ${commit ? "BROADCAST" : "DRY      "} ${cardName ?? "?"} …${thread.key}\n` +
            `${plan.cardText}\n` +
            `[deal-broadcast] sheet row: ${JSON.stringify(plan.sheetRow)}\n` +
            `[deal-broadcast] docs: ${plan.docs} · stage stays ${stage ?? "(unknown)"} (manual moves only)`
        );

        if (commit) {
          // 1. The group post — the thing the whole pipeline exists for.
          const messageId = await deps.telegram.send(plan.cardText);

          // 2. The protocol note (posted text + doc verdict + group link id).
          const noteBody =
            `${plan.cardText}\n\n— Documents —\n${plan.docs}\n` +
            `Telegram Deliveries Control: message_id ${messageId || "?"}\n` +
            `Evidence: ${analysis.evidence.map((q) => `"${q}"`).join("; ")}`;
          const created = await client.batchCreate("notes", [
            {
              title: `▶️ Deal confirmed — broadcast · ${formatDateTime(passStart)}`,
              bodyV2: { markdown: noteBody, blocknote: null },
            },
          ]);
          const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
          if (typeof noteId !== "string") throw new Error("note created without id in response");
          await client.batchCreate("noteTargets", [
            { noteId, targetOpportunityId: match.id },
            ...(personId ? [{ noteId, targetPersonId: personId }] : []),
          ]);

          // 3. Fill-the-blanks facts — never overwrite a non-empty field.
          const patch: Record<string, unknown> = {};
          const blank = (k: string): boolean => {
            const v = opp[k];
            return v === null || v === undefined || v === "" || (typeof v === "number" && v === 0);
          };
          const put = (k: string, v: unknown): void => {
            if (deps.opportunityFields.has(k)) patch[k] = v;
          };
          if (analysis.facts.durationDays && blank("rentalDays")) put("rentalDays", analysis.facts.durationDays);
          if (analysis.facts.from && blank("neededFrom")) put("neededFrom", analysis.facts.from);
          if (analysis.facts.car && blank("carModels")) put("carModels", analysis.facts.car);
          const amount = opp.amount as { amountMicros?: number } | null;
          if (analysis.facts.priceAed && (!amount || !Number(amount.amountMicros))) {
            put("amount", { amountMicros: analysis.facts.priceAed * 1_000_000, currencyCode: "AED" });
          }
          if (Object.keys(patch).length > 0) {
            await client.patch(`opportunities/${match.id}`, patch);
          }

          // 4. The idempotency marker — written ALWAYS, last, so a deal is
          //    only marked after the broadcast actually happened. The hardened
          //    writer (stage-progression.ts): single post + read-back + patch
          //    if Twenty drops the relation. fromStage = toStage = the current
          //    stage: this is a broadcast receipt, NOT a move — cards only
          //    move when a manager drags them (owner, 2026-08-13).
          await writeStageEventLink(
            client,
            {
              externalId: broadcastExternalId(match.id),
              fromStage: stage,
              toStage: stage,
              changedBy: "deal-broadcast",
              changedAt: passStart.toISOString(),
              opportunityId: match.id,
            },
            log
          );

          // 6. The sheet — gated on SA creds, never a broadcast blocker.
          const sheetResult = await deps.sheet.append(plan.sheetRow);
          if (sheetResult === "ok") counts.sheetWritten++;
          else counts.sheetSkipped++;
        }
        counts.broadcast++;
      } catch (e) {
        // Per-deal failure counts and the pass proceeds; the missing marker
        // row means the deal is retried next pass.
        counts.failed++;
        counts.firstError ??= `deal/${match.id}: ${(e as Error).message.slice(0, 160)}`;
      }
    }
  }

  // Checkpoint advances past the whole pass on commit only (stage-progression
  // semantics); dry-run never moves it.
  if (commit) {
    await deps.nudgeKeys?.persist();
    // A failed deal has no marker row — but it only retries if the checkpoint
    // still covers its thread. Hold the checkpoint on ANY failure so a
    // transient error can't silently drop a confirmed deal (audit 2026-08-14).
    if (counts.failed === 0) await source.saveCheckpoint(passStart);
  }

  return counts;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "deal_broadcast";

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

// Rental fleet rows live under the take-auto tenant, split by company
// (import-babek-fleet.ts): cardiwan → company "cardiwan", easyrent/etm →
// company "etm". The plate lookup checks the deal's OWN tenant first and the
// brand's company bucket in the shared fleet second.
const BRAND_COMPANY: Record<string, string> = { cardiwan: "cardiwan", easyrent: "etm", etm: "etm" };

/**
 * Every fleet car whose make+model covers the named car's tokens. The
 * token-subset rule is shared by the plate lookup and the availability/match
 * checks, so all three agree about what "a G63" means in this fleet.
 */
export function matchFleetVehicles<T extends { make: string; model: string }>(
  carText: string,
  fleet: T[]
): T[] {
  const tokens = carText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return fleet.filter((v) => {
    const hay = `${v.make} ${v.model}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}

/**
 * Confident = every token of the named car appears in make+model of EXACTLY
 * ONE fleet car (one distinct plate). Several candidates or none → null, and
 * the card's plate line stays blank like their real cards do.
 */
export function matchFleetPlate(
  carText: string,
  fleet: { make: string; model: string; plate: string }[]
): string | null {
  const plates = new Set(matchFleetVehicles(carText, fleet).map((v) => v.plate));
  return plates.size === 1 ? [...plates][0] : null;
}

export function createDrizzleDealBroadcastSource(
  db: PlatformDb,
  tenantId: string,
  brandLine: string | null
): DealBroadcastSource {
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

    async loadRows(since, limit) {
      // BOTH directions and GROUPS INCLUDED: a confirmation is the customer
      // saying yes to OUR offer, and rental deals are struck in group chats.
      const res = await db.execute(sql`
        SELECT id, channel, direction, "from", from_pn, "to", customer_name, body, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND channel IN ('whatsapp', 'telegram')
           AND body IS NOT NULL
           AND created_at > ${since}
         ORDER BY created_at ASC
         LIMIT ${limit}
      `);
      interface Row {
        id: string;
        channel: string;
        direction: string;
        from: string | null;
        from_pn: string | null;
        to: string | null;
        customer_name: string | null;
        body: string | null;
        created_at: string;
      }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id,
        channel: r.channel,
        direction: r.direction,
        from: r.from,
        fromPn: r.from_pn,
        to: r.to,
        customerName: r.customer_name,
        body: r.body,
        createdAt: new Date(r.created_at),
      }));
    },

    async loadCallLines(since, limit) {
      // Same join as stage-progression's loadCallThreads: the summary lives
      // on call_transcript, the caller's number on the source event.
      const res = await db.execute(sql`
        SELECT
          right(regexp_replace(coalesce(
            CASE WHEN e.raw_payload #>> '{params,direction}' = 'outbound'
                 THEN e.raw_payload #>> '{params,to}'
                 ELSE e.raw_payload #>> '{params,from}'
            END, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS tail9,
          ct.summary_json,
          ct.updated_at
        FROM call_transcript ct
        JOIN integration_event e ON e.id = ct.integration_event_id
        WHERE ct.tenant_id = ${tenantId}
          AND ct.status IN ('done', 'completed')
          AND ct.summary_json IS NOT NULL
          AND ct.updated_at > ${since}
        ORDER BY ct.updated_at DESC
        LIMIT ${limit}
      `);
      interface Row {
        tail9: string;
        summary_json: { summary?: unknown } | null;
        updated_at: string;
      }
      const byTail = new Map<string, DealCallLine[]>();
      for (const r of sqlRows<Row>(res)) {
        if (!r.tail9 || r.tail9.length < MIN_PHONE_MATCH_DIGITS) continue;
        const summary = typeof r.summary_json?.summary === "string" ? r.summary_json.summary : null;
        if (!summary) continue;
        const list = byTail.get(r.tail9) ?? [];
        list.push({ summary, at: new Date(r.updated_at) });
        byTail.set(r.tail9, list);
      }
      return byTail;
    },

    async findPlate(carText) {
      // The deal's OWN tenant first; the shared rental fleet (take-auto
      // tenant, this brand's company bucket — see BRAND_COMPANY) alongside
      // it, because import-babek-fleet.ts files every rental car there.
      const companySlug = brandLine ? (BRAND_COMPANY[brandLine] ?? null) : null;
      const res = await db.execute(sql`
        SELECT v.make, v.model, v.plate
          FROM vehicle v
          JOIN tenant t ON t.id = v.tenant_id
          LEFT JOIN company c ON c.id = v.company_id
         WHERE v.tenant_id = ${tenantId}
            OR (t.slug = 'take-auto' AND (${companySlug}::text IS NULL OR c.slug = ${companySlug}))
      `);
      return matchFleetPlate(carText, sqlRows<{ make: string; model: string; plate: string }>(res));
    },

    async checkAvailability(carText, from, to) {
      // The availability rail (Core Job 1): cars of the named model (same
      // fleet scope as findPlate) minus any with an active/reserved rental
      // overlapping the exact [from, to) window. assignedPlate only when
      // EXACTLY ONE car is free — picking among several is a human's call,
      // and a wrong plate on the team card is worse than a blank.
      const companySlug = brandLine ? (BRAND_COMPANY[brandLine] ?? null) : null;
      const vres = await db.execute(sql`
        SELECT v.id, v.make, v.model, v.plate
          FROM vehicle v
          JOIN tenant t ON t.id = v.tenant_id
          LEFT JOIN company c ON c.id = v.company_id
         WHERE v.tenant_id = ${tenantId}
            OR (t.slug = 'take-auto' AND (${companySlug}::text IS NULL OR c.slug = ${companySlug}))
      `);
      const matching = matchFleetVehicles(
        carText,
        sqlRows<{ id: string; make: string; model: string; plate: string }>(vres)
      );
      if (matching.length === 0) return { checked: true, freeCount: 0, assignedPlate: null };
      const ids = matching.map((v) => v.id);
      const busy = await db.execute(sql`
        SELECT r.vehicle_id
          FROM rental r
         WHERE r.vehicle_id = ANY(${ids}::uuid[])
           AND r.status IN ('active', 'reserved')
           AND r.start_date < ${to.toISOString()}
           AND r.return_date > ${from.toISOString()}
      `);
      const busyIds = new Set(sqlRows<{ vehicle_id: string }>(busy).map((r) => r.vehicle_id));
      const free = matching.filter((v) => !busyIds.has(v.id));
      return {
        checked: true,
        freeCount: free.length,
        assignedPlate: free.length === 1 ? free[0].plate : null,
      };
    },
  };
}
