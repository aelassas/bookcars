// CallGear recording transcriber — the analysis pipeline behind
// scripts/run-call-transcriber.ts.
//
// Picks up callgear integration_events the relay already projected into
// Twenty (processing_status='done') that carry params.recordingUrl, then per
// call:
//
//   1. DOWNLOAD the recording into a local cache
//      (recordings/<tenantSlug>/<callId>.<ext> — existing file = skip);
//   2. TRANSCRIBE it with local mlx_whisper (whisper-large-v3-turbo,
//      auto-detects the EN/RU/AR mix UAE calls come in);
//   3. ANALYSE the transcript with the tenant's LOCAL model — one strict-JSON
//      call, same guards as the AI resolver: schema validation + an evidence
//      gate (every `evidence` quote must be a verbatim substring of the
//      transcript the model saw; no evidence → nothing is written to Twenty);
//   4. NOTE the Twenty opportunity `Call transcript · callgear:<callId>`
//      (idempotent by title, noteTargets to opportunity + linked person);
//   5. FILE the recording itself as a Twenty ATTACHMENT on the same
//      opportunity + person + note (owner 2026-08-26: "the calls saved as
//      files" — the CallGear URL on the card expires, the uploaded file does
//      not). Deduped by name + opportunity so re-runs never file it twice.
//
// The full transcript and the analysis JSON live in the call_transcript
// table (0068) — Twenty gets the note, the card summary and the audio file.
//
// Lifecycle of one call (call_transcript.status):
//   (no row) ──claim──▶ processing ──ok──▶ done
//      ▲                   │  └─ any step error ─▶ error (retried after 1h, max 3 attempts)
//      └──── stale 'processing' (crashed run, 15 min) is reclaimed
// An analysis rejected by the evidence gate is stamped done with the reason
// in `error` — the transcript is kept, the model is not re-spent on a call
// it cannot quote every poll.
//
// Rails: NEVER stage moves, owner changes, deletes. Per-instance Twenty
// routing is resolved by the runner (default = sales, rental = Cardiwan /
// EasyRent) — a call's note always lands in its own brand's workspace.
//
// Architecture mirrors twenty-relay.ts: PURE decision logic (prompt builder,
// output validation, note body) separated from the adapters (TranscriberStore
// for the platform DB, RecordingDownloader, WhisperRunner, TranscriberTwenty),
// all faked in tests — no live whisper/ollama in unit tests.

import { spawn } from "child_process";
import { existsSync } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { eq, sql } from "drizzle-orm";
import { db as platformDb } from "@/platform/db/client";
import { callTranscript, tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { log } from "@/platform/log";
import { loadAIConfig } from "@/platform/ai";
import { LocalProvider } from "@/platform/ai/providers/local";
import type { TwentyClient, TwentyListPage } from "../twenty/client";
import { filterSafe } from "../twenty/day-note";
import { callOpportunityExternalId } from "./twenty-relay";
import type { CallGearCallFinishedParams, CallGearCallFinishedRequest } from "./types";

// ─── Output contract ────────────────────────────────────────────────────────

export type CallLanguage = "english" | "russian" | "arabic" | "mixed" | "unknown";
export type CallUrgency = "hot" | "warm" | "cold";

export interface CallAnalysis {
  summary: string;
  callerIntent: string;
  budgetAed: number | null;
  carOfInterest: string | null;
  // ── The booking facts. Owner, 2026-08-10: «the parser needs to distribute
  // the information well — time, date, car, amount, rent duration, and the
  // name; he said his name and confirmed WhatsApp on this number». A summary
  // that BURIES these makes the manager re-read a paragraph to answer "how
  // many days?"; as fields they can be sorted, filtered and acted on.
  /** The name the caller gave on the call — usually the only one we ever get. */
  customerName: string | null;
  /** Model year(s) named: "2022", "2022 or 2024". Free text — callers speak ranges. */
  carYear: string | null;
  /** How long they want the car, in days (a week → 7, a month → 30). */
  rentalDays: number | null;
  /** When they need it, in the caller's own words: "tomorrow", "15 August". */
  neededFrom: string | null;
  /** What OUR agent quoted, in AED — distinct from what the caller can pay. */
  quotedPriceAed: number | null;
  /** The caller confirmed this number is on WhatsApp — where the follow-up goes. */
  whatsappConfirmed: boolean | null;
  /** The caller's main language as judged by the model. */
  language: CallLanguage;
  urgency: CallUrgency;
  /** Estimated fraction of the call the agent spoke, 0..1. */
  agentTalkRatioEstimate: number | null;
  outcomeHint: string;
  /** Verbatim transcript quotes — the write gate. */
  evidence: string[];
}

/** What call_transcript.summary_json stores: the analysis plus whisper's
 *  own auto-detected language (kept per the pipeline spec). */
export interface StoredCallSummary extends CallAnalysis {
  whisperLanguage: string | null;
}

const LANGUAGES: CallLanguage[] = ["english", "russian", "arabic", "mixed", "unknown"];
const URGENCIES: CallUrgency[] = ["hot", "warm", "cold"];

/** Note title = the note's idempotency key (notes have no externalId field). */
export function transcriptNoteTitle(callExternalId: string): string {
  return `Call transcript · ${callExternalId}`;
}

/** Transcript chars shown in the Twenty note; the full text stays in the DB. */
const NOTE_TRANSCRIPT_CHARS = 4000;
/** Note body hard cap — same as the mirror's summary notes. */
const NOTE_BODY_CHARS = 8000;
/** Transcript chars handed to the model (the evidence gate checks against
 *  exactly this text — see ResolverPrompt.sourceText for the precedent). */
const PROMPT_TRANSCRIPT_CHARS = 12_000;
/** Recordings are phone calls, not films — same ceiling as the WA media
 *  attachments (25 MB). Twenty's own maxDirectUploadFileSize applies on top. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** ".mp3" from the URL path, default mp3 when the URL carries no extension. */
export function recordingExtension(url: string): string {
  const m = url.split("?")[0].match(/\.([A-Za-z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : "mp3";
}

/** callIds are provider strings — strip anything that could break a path. */
export function safeCallIdStem(callId: string): string {
  const stem = callId.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "");
  return stem || "call";
}

export function recordingDestPath(
  baseDir: string,
  tenantSlug: string,
  callId: string,
  recordingUrl: string
): string {
  return join(baseDir, tenantSlug, `${safeCallIdStem(callId)}.${recordingExtension(recordingUrl)}`);
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

export interface AnalysisPrompt {
  system: string;
  user: string;
  /**
   * The exact transcript text the model saw. Every `evidence` string in the
   * output must be a verbatim substring of this — the anti-hallucination gate.
   */
  sourceText: string;
}

const ANALYSIS_SYSTEM =
  `You are an analyst for a UAE car rental/sales company. Given the transcript ` +
  `of one phone call between a sales agent and a customer (the languages may ` +
  `mix English, Russian and Arabic), respond with ONLY a JSON object (no ` +
  `prose, no markdown) with exactly these fields:\n` +
  `- summary: 2-4 sentence summary of the call\n` +
  `- callerIntent: short label of what the caller wants\n` +
  `- budgetAed: the budget the CALLER said they can pay, in AED (number), or null\n` +
  `- carOfInterest: the car make/model the caller named, or null\n` +
  `- customerName: the name the caller gave for themselves, or null. Never guess it from the agent's words.\n` +
  `- carYear: the model year(s) discussed, exactly as said ("2022", "2022 or 2024"), or null\n` +
  `- rentalDays: how many DAYS the caller wants the car (a week = 7, a month = 30), or null\n` +
  `- neededFrom: when they want it, in the caller's own words ("today", "tomorrow", "15 August"), or null\n` +
  `- quotedPriceAed: the price OUR AGENT quoted in AED (number). If several were quoted, give the LOWEST. null if none.\n` +
  `- whatsappConfirmed: true only if the caller confirmed this same number is on WhatsApp, else null\n` +
  `- language: the caller's main language, one of "english" | "russian" | "arabic" | "mixed" | "unknown"\n` +
  `- urgency: one of "hot" | "warm" | "cold"\n` +
  `- agentTalkRatioEstimate: estimated fraction of the call the AGENT spoke (0-1 number), or null\n` +
  `- outcomeHint: one line on how the call ended or the agreed next step\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character ` +
  `from the transcript that justify your reading. Never invent a quote.`;

export function buildAnalysisPrompt(
  params: CallGearCallFinishedParams | null,
  transcript: string
): AnalysisPrompt {
  const sourceText = transcript.slice(0, PROMPT_TRANSCRIPT_CHARS);
  const meta = params
    ? `Call metadata: direction=${params.direction ?? "unknown"}, ` +
      `duration=${Number.isFinite(params.duration) ? params.duration : 0}s` +
      (params.agent?.name?.trim() ? `, agent=${params.agent.name.trim()}` : "")
    : "Call metadata: unavailable";
  const user = `${meta}\n\nTranscript:\n${sourceText}`;
  return { system: ANALYSIS_SYSTEM, user, sourceText };
}

// ─── Output validation ──────────────────────────────────────────────────────

/**
 * Parse + validate the model's answer. Returns null — meaning REJECT, never
 * write to Twenty — when the JSON is malformed, any field is off-shape,
 * `evidence` is empty, or any evidence string is not a verbatim substring of
 * `sourceText` (an invented quote proves the whole reading is untrustworthy).
 * Same gate as the AI resolver's parseResolverResult.
 */
export function parseCallAnalysis(content: string, sourceText: string): CallAnalysis | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  if (!LANGUAGES.includes(parsed.language)) return null;
  if (!URGENCIES.includes(parsed.urgency)) return null;
  if (typeof parsed.summary !== "string" || !parsed.summary.trim()) return null;
  if (typeof parsed.callerIntent !== "string" || !parsed.callerIntent.trim()) return null;
  if (typeof parsed.outcomeHint !== "string" || !parsed.outcomeHint.trim()) return null;
  // != null ON PURPOSE (loose): the model increasingly OMITS optional keys
  // instead of nulling them, and `undefined !== null` read an omitted key as
  // "present but invalid" — every analysis without agentTalkRatioEstimate was
  // thrown away while the transcript proved the read was perfect (2026-09-06:
  // Camry call, 3200 AED quoted, 2/3 evidence verbatim → rejected).
  if (parsed.carOfInterest != null && typeof parsed.carOfInterest !== "string") return null;
  if (typeof parsed.carOfInterest === "string" && !parsed.carOfInterest.trim()) return null;
  if (
    parsed.budgetAed != null &&
    (typeof parsed.budgetAed !== "number" || !Number.isFinite(parsed.budgetAed) || parsed.budgetAed < 0)
  ) {
    return null;
  }
  if (
    parsed.agentTalkRatioEstimate != null &&
    (typeof parsed.agentTalkRatioEstimate !== "number" ||
      !Number.isFinite(parsed.agentTalkRatioEstimate) ||
      parsed.agentTalkRatioEstimate < 0 ||
      parsed.agentTalkRatioEstimate > 1)
  ) {
    return null;
  }
  // The booking facts are OPTIONAL and forgiving: a model that omits one, or
  // answers "" / a nonsense number, loses that fact — it must never cost the
  // whole analysis, which is the summary the manager reads. Off-shape values
  // are dropped to null rather than rejecting the call.
  const text = (v: unknown, max = 200): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const positive = (v: unknown, max: number): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : null;
  };

  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) return null;
  // The gate keeps its teeth — nothing unquotable is ever shown, and a
  // reading with NO real anchor is still refused — but it no longer throws
  // away a whole analysis over one stylistically joined quote.
  //
  // Live case, 2026-08-10 (call 207561251): the model read the call perfectly
  // — name "Abby", G63, 2022 and 2024, two days, 1,400 quoted, WhatsApp
  // confirmed — and four of its five quotes were verbatim. The fifth stitched
  // two lines together with "…". Under the old all-or-nothing rule that one
  // ellipsis discarded every extracted fact, and the manager got a wall of
  // raw transcript instead. Unverifiable quotes are dropped; the facts they
  // came with survive as long as at least one real quote remains.
  const evidence: string[] = [];
  for (const quote of parsed.evidence) {
    if (typeof quote !== "string" || !quote.trim()) continue;
    if (isVerbatim(quote, sourceText)) evidence.push(quote.trim());
  }
  if (evidence.length === 0) return null;

  return {
    summary: parsed.summary.trim(),
    callerIntent: parsed.callerIntent.trim(),
    budgetAed: parsed.budgetAed ?? null,
    carOfInterest: typeof parsed.carOfInterest === "string" ? parsed.carOfInterest.trim() : null,
    customerName: text(parsed.customerName, 120),
    carYear: text(parsed.carYear, 40),
    // A year misread as a duration ("2022 days") is the obvious failure here.
    rentalDays: positive(parsed.rentalDays, 365),
    neededFrom: text(parsed.neededFrom, 60),
    quotedPriceAed: positive(parsed.quotedPriceAed, 10_000_000),
    whatsappConfirmed: parsed.whatsappConfirmed === true ? true : null,
    language: parsed.language,
    urgency: parsed.urgency,
    agentTalkRatioEstimate: parsed.agentTalkRatioEstimate ?? null,
    outcomeHint: parsed.outcomeHint.trim(),
    evidence,
  };
}

/**
 * Is this quote really in the transcript? Whitespace is collapsed on both
 * sides — a model re-wrapping lines is not inventing words — and a quote
 * joined with an ellipsis counts only when EVERY part is itself verbatim.
 * Anything else fails: paraphrase must never pass as a quotation.
 */
function isVerbatim(quote: string, sourceText: string): boolean {
  const flat = (s: string) => s.replace(/\s+/g, " ").trim();
  const haystack = flat(sourceText);
  const parts = quote.split(/\s*(?:\.\.\.|…)\s*/).map(flat).filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((p) => haystack.includes(p));
}

/** Same tolerance as LocalProvider: models wrap JSON in ```json fences. */
function extractJson(s: string): string {
  const trimmed = s.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}

// ─── Note body ──────────────────────────────────────────────────────────────

/**
 * The Twenty note: the analysis' key fields up top, then the transcript
 * truncated to NOTE_TRANSCRIPT_CHARS (the full text lives in call_transcript).
 */
export function buildTranscriptNoteBody(analysis: CallAnalysis, transcript: string): string {
  const body =
    `Summary: ${analysis.summary}\n` +
    `Intent: ${analysis.callerIntent} · Urgency: ${analysis.urgency} · Language: ${analysis.language}\n` +
    (analysis.customerName ? `Name given: ${analysis.customerName}\n` : "") +
    (analysis.budgetAed !== null ? `Budget: ${analysis.budgetAed} AED\n` : "") +
    (analysis.quotedPriceAed !== null ? `Quoted by us: ${analysis.quotedPriceAed} AED\n` : "") +
    (analysis.carOfInterest
      ? `Car of interest: ${[analysis.carOfInterest, analysis.carYear].filter(Boolean).join(" ")}\n`
      : "") +
    (analysis.rentalDays !== null ? `Rent duration: ${analysis.rentalDays} day(s)\n` : "") +
    (analysis.neededFrom ? `Needed from: ${analysis.neededFrom}\n` : "") +
    (analysis.whatsappConfirmed ? `WhatsApp: caller confirmed this number\n` : "") +
    `Outcome: ${analysis.outcomeHint}\n` +
    (analysis.agentTalkRatioEstimate !== null
      ? `Agent talk ratio: ~${Math.round(analysis.agentTalkRatioEstimate * 100)}%\n`
      : "") +
    `\nEvidence:\n${analysis.evidence.map((q) => `> ${q}`).join("\n")}\n\n` +
    `Transcript:\n${transcript.slice(0, NOTE_TRANSCRIPT_CHARS)}`;
  return body.slice(0, NOTE_BODY_CHARS);
}

/**
 * The same read, squeezed to what fits ON the card. The Timeline note keeps
 * the evidence and the full transcript; the card field has to answer "what
 * did this person want?" while the manager is still scrolling the board —
 * that is the whole complaint behind it (owner, 2026-08-10: «we need to dig
 * in order to find, makes no sense»).
 */
export function buildCardSummary(analysis: CallAnalysis): string {
  const car = [analysis.carOfInterest, analysis.carYear].filter(Boolean).join(" ");
  const facts = [
    analysis.customerName ? `Name: ${analysis.customerName}` : null,
    car ? `Car: ${car}` : null,
    analysis.rentalDays !== null ? `Duration: ${analysis.rentalDays} day${analysis.rentalDays === 1 ? "" : "s"}` : null,
    analysis.neededFrom ? `From: ${analysis.neededFrom}` : null,
    analysis.quotedPriceAed !== null ? `Quoted: ${analysis.quotedPriceAed} AED` : null,
    analysis.budgetAed !== null ? `Budget: ${analysis.budgetAed} AED` : null,
    analysis.whatsappConfirmed ? `WhatsApp: confirmed on this number` : null,
    `Intent: ${analysis.callerIntent}`,
    `Urgency: ${analysis.urgency}`,
    `Language: ${analysis.language}`,
    `Outcome: ${analysis.outcomeHint}`,
  ].filter((f): f is string => !!f);
  return `${analysis.summary}\n\n${facts.join(" · ")}`.slice(0, CARD_SUMMARY_CHARS);
}

/** Twenty TEXT fields hold more, but a card is read at a glance, not paged. */
const CARD_SUMMARY_CHARS = 1200;

/**
 * Is this "name" actually a label nobody chose? Three kinds live in the data:
 * the relay's own phone-tail placeholder ("+…586833004"), an empty name, and
 * — the one that fooled the first version of this — Bitrix's notification
 * text imported as a person: «Пропущенный лид по звонку с 971586833004 из
 * Callgear». A caller who introduces himself should replace all three, and
 * never a name a human typed.
 */
export function isPlaceholderName(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (n.startsWith("+")) return true;
  if (/\d{9,}/.test(n.replace(/[\s()-]/g, ""))) return true; // a phone wearing a name's clothes
  return /(лид по звонку|пропущенн|новый лид|inbound call|missed call|unknown|callgear)/i.test(n);
}

/** The booking facts as the card stores them (see cardFactsFrom). */
export type CallCardFacts = {
  car?: string | null;
  rentalDays?: number | null;
  neededFrom?: string | null;
  /** What goes in `amount`: what we quoted, else what the caller said they'd pay. */
  amountAed?: number | null;
  whatsappConfirmed?: boolean | null;
};

/**
 * Which numbers land on the card. `amount` is the money the deal is about:
 * our quote when we made one (that is the live negotiation), otherwise the
 * caller's stated budget. Both stay visible in the summary either way, so
 * nothing is hidden by the choice.
 */
export function cardFactsFrom(analysis: CallAnalysis): CallCardFacts {
  return {
    car: [analysis.carOfInterest, analysis.carYear].filter(Boolean).join(" ") || null,
    rentalDays: analysis.rentalDays,
    neededFrom: analysis.neededFrom,
    amountAed: analysis.quotedPriceAed ?? analysis.budgetAed,
    whatsappConfirmed: analysis.whatsappConfirmed,
  };
}

/**
 * What the card says when the AI read was rejected (internal chatter, a call
 * too short to have content, a transcript the model could not quote). The
 * manager gets the actual words and is told plainly that no analysis stands
 * behind them — an empty card would just look broken.
 */
export function buildFallbackSummary(transcript: string): string {
  return `No AI read for this call — showing what was said.\n\n${transcript}`.slice(0, CARD_SUMMARY_CHARS);
}

// ─── Adapter interfaces (faked in tests) ────────────────────────────────────

export interface EligibleCall {
  eventId: string;
  tenantId: string;
  callId: string;
  recordingUrl: string;
  /** Parsed call.finished params; null when rawPayload is malformed. */
  params: CallGearCallFinishedParams | null;
  /** Existing call_transcript row state (null fields = no row yet). */
  transcriptRowId: string | null;
  recordingPath: string | null;
  transcriptText: string | null;
  summaryJson: StoredCallSummary | null;
}

export interface TranscriptProgressPatch {
  recordingPath?: string;
  transcriptText?: string;
  summaryJson?: StoredCallSummary;
}

export interface TranscriberStore {
  /**
   * Read-only selection of up to `batchSize` done callgear events with a
   * recordingUrl whose transcript work is due (no row, error past the retry
   * backoff, or an abandoned 'processing' claim). Dry-run uses this too.
   */
  findEligible(tenantIds: string[], batchSize: number): Promise<EligibleCall[]>;
  /**
   * Commit-only: insert/refresh the call_transcript row as 'processing' and
   * count the attempt. Returns the row id, or null when a concurrent worker
   * took the event (the unique index on integration_event_id decides).
   */
  beginJob(tenantId: string, event: EligibleCall): Promise<string | null>;
  /** Persist one pipeline step's output so a crash resumes where it died. */
  saveProgress(tenantId: string, rowId: string, patch: TranscriptProgressPatch): Promise<void>;
  /** Terminal stamp; `note` records a skip reason (evidence gate, no target). */
  markDone(tenantId: string, rowId: string, note?: string): Promise<void>;
  /** Retryable failure — eligible again after the backoff until attempts run out. */
  markError(tenantId: string, rowId: string, error: string): Promise<void>;
}

export interface RecordingDownloader {
  /** Fetch url into destPath; an existing destPath file is a cache hit. */
  download(url: string, destPath: string): Promise<void>;
}

export interface WhisperResult {
  text: string;
  /** whisper's auto-detected language code ("en", "ru", "ar", …), when known. */
  language: string | null;
}

export interface WhisperRunner {
  transcribe(audioPath: string): Promise<WhisperResult>;
}

export interface TranscriberTwenty {
  findOpportunityByExternalId(
    externalId: string
  ): Promise<{ id: string; pointOfContactId: string | null } | null>;
  /** Creates the note and returns its id (needed to file the recording ON it). */
  createNoteWithTargets(input: {
    title: string;
    body: string;
    opportunityId: string;
    personId: string | null;
  }): Promise<string>;
  /**
   * File the downloaded recording as a Twenty attachment on the card (+
   * person + transcript note when known). Idempotent by name + opportunity;
   * "skipped" means the cache file was unreadable — never throws for that.
   */
  attachRecording(input: {
    opportunityId: string;
    personId: string | null;
    noteId: string | null;
    filePath: string;
    name: string;
  }): Promise<"attached" | "duplicate" | "skipped">;
  /**
   * Put the AI read on the card itself (callSummary), plus the two facts a
   * board is sorted by when they were actually said: the car and the budget.
   * Older workspaces have no such fields — the adapter reports `skipped` and
   * the note still stands, so a workspace that predates them keeps working.
   */
  patchOpportunitySummary(
    opportunityId: string,
    summary: string,
    facts?: CallCardFacts
  ): Promise<"written" | "skipped">;
  /**
   * Name a caller who introduced themselves. Only when the person is still
   * labelled by their phone tail — a name typed by a human, or one Bitrix
   * already knew, outranks anything a transcript suggests.
   */
  namePersonIfUnnamed(personId: string, name: string): Promise<"named" | "kept">;
}

// ─── Orchestration ──────────────────────────────────────────────────────────

/**
 * One tenant's resolved routing for a pass — the runner builds these (Twenty
 * instance + note-title index + the tenant's local-model completer). A tenant
 * without a configured instance or local model never reaches the pass.
 */
export interface RoutedTenant {
  tenantId: string;
  /** Used for the recording cache directory; falls back to the tenant id. */
  slug: string | null;
  twenty: TranscriberTwenty;
  /** Live note titles in this tenant's workspace — the idempotency index. */
  noteTitles: Set<string>;
  complete: (system: string, user: string) => Promise<string>;
}

export interface TranscriberDeps {
  store: TranscriberStore;
  downloader: RecordingDownloader;
  whisper: WhisperRunner;
  tenants: RoutedTenant[];
  /** Base of the recording cache — <baseDir>/<tenantSlug>/<callId>.<ext>. */
  recordingsDir: string;
  /** Dry-run (the default): full read path, NO DB writes and NO Twenty writes. */
  dryRun: boolean;
  /**
   * Optional second opinion for the ANALYSIS step only (DeepSeek, env-keyed —
   * the runner wires createDeepseekCompleter). The box's 9B 4-bit checkpoint
   * increasingly answers the strict-schema prompt with `{}` or drops required
   * keys (regression vs the old 30B, first seen 2026-09-04); without this every
   * such call lost its summary and its note. Local first, fallback only on a
   * rejected parse — never the other way round (cost + privacy).
   */
  fallbackComplete?: (system: string, user: string) => Promise<string>;
  /**
   * Optional manager ping fired once the card carries its summary — the AI
   * read or the verbatim fallback alike. Wired by the runner (CALL_PING_MAP);
   * a ping failure is logged and never fails the call's pipeline.
   */
  onCardStamped?: (input: CardStampedPing) => Promise<void>;
}

/** What the manager ping learns about one stamped card. */
export interface CardStampedPing {
  tenantId: string;
  tenantSlug: string | null;
  callId: string;
  params: CallGearCallFinishedParams | null;
  /** The exact text the Twenty card now carries. */
  summary: string;
}

export interface TranscriberPassCounts {
  claimed: number;
  /** Note written (or would be, in dry-run). */
  notesWritten: number;
  /** Note with this title already exists — v1 does not update. */
  skippedExistingNote: number;
  /** No Twenty opportunity for this call (e.g. an outbound call the relay
   *  never projected) — transcript still stored. */
  skippedNoOpportunity: number;
  /** Rejected by the schema/evidence gate — transcript kept, never written. */
  skippedNoEvidence: number;
  /** Analyses rescued by the fallback model after the local parse was rejected. */
  analysedByFallback: number;
  failed: number;
  firstError?: string;
}

function emptyPassCounts(): TranscriberPassCounts {
  return {
    claimed: 0,
    notesWritten: 0,
    skippedExistingNote: 0,
    skippedNoOpportunity: 0,
    skippedNoEvidence: 0,
    analysedByFallback: 0,
    failed: 0,
  };
}

/** Type-guard a stored summary_json back into a usable analysis. */
function storedAnalysis(raw: StoredCallSummary | null): { analysis: CallAnalysis; whisperLanguage: string | null } | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.summary !== "string" || !Array.isArray(raw.evidence)) return null;
  const { whisperLanguage = null, ...analysis } = raw;
  return { analysis: analysis as CallAnalysis, whisperLanguage };
}

async function pingCardStamped(
  deps: TranscriberDeps,
  routed: RoutedTenant,
  event: EligibleCall,
  summary: string
): Promise<void> {
  if (!deps.onCardStamped) return;
  try {
    await deps.onCardStamped({
      tenantId: event.tenantId,
      tenantSlug: routed.slug,
      callId: event.callId,
      params: event.params,
      summary,
    });
  } catch (err) {
    // The ping is a courtesy on top of a card that is already correct — it
    // must never fail the call's pipeline.
    log.warn("callgear transcriber: card-stamped ping failed", {
      callId: event.callId,
      error: (err instanceof Error ? err.message : String(err)).slice(0, 200),
    });
  }
}

async function transcribeOne(
  deps: TranscriberDeps,
  routed: RoutedTenant,
  event: EligibleCall,
  counts: TranscriberPassCounts
): Promise<void> {
  const { store, dryRun } = deps;
  // Hoisted so the catch can stamp the claimed row on failure.
  let rowId: string | null = null;
  try {
    // Claim the row (commit only). A null id means a concurrent worker won
    // the INSERT race — the event is theirs, leave it alone.
    rowId = dryRun ? null : await store.beginJob(event.tenantId, event);
    if (!dryRun && !rowId) return;
    // Everything below carries the row id only in commit mode; the helpers
    // no-op in dry-run so the read path stays identical.
    const save = async (patch: TranscriptProgressPatch) => {
      if (!dryRun && rowId) await store.saveProgress(event.tenantId, rowId, patch);
    };
    const done = async (note?: string) => {
      if (!dryRun && rowId) await store.markDone(event.tenantId, rowId, note);
    };

    const externalId = callOpportunityExternalId(event.callId);
    const title = transcriptNoteTitle(externalId);
    const noteExists = routed.noteTitles.has(title);
    // Where the recording lives in the local cache — needed both for the
    // download below and for the Twenty attachment upload at the end.
    const destPath = recordingDestPath(
      deps.recordingsDir,
      routed.slug ?? event.tenantId,
      event.callId,
      event.recordingUrl
    );

    // File the recording on the card (best-effort): the CallGear link expires,
    // the uploaded file does not (owner 2026-08-26). A failure here must NEVER
    // fail the call's pipeline — the transcript note and card summary are the
    // product; the audio file is a courtesy on top, retried by the next pass
    // (attachRecording dedupes by name + opportunity).
    const attachRecording = async (
      opportunity: { id: string; pointOfContactId: string | null },
      noteId: string | null
    ) => {
      if (dryRun) return;
      try {
        const filePath = event.recordingPath ?? destPath;
        const result = await routed.twenty.attachRecording({
          opportunityId: opportunity.id,
          personId: opportunity.pointOfContactId,
          noteId,
          filePath,
          name: basename(filePath),
        });
        if (result === "attached") {
          log.info("callgear transcriber: recording filed as Twenty attachment", {
            callId: event.callId,
          });
        }
      } catch (err) {
        log.warn("callgear transcriber: recording attach failed (note/card unaffected)", {
          callId: event.callId,
          error: (err instanceof Error ? err.message : String(err)).slice(0, 200),
        });
      }
    };
    // ── Steps 1+2: download + transcribe (skipped when a previous pass
    //    already persisted the transcript — crash resume).
    let transcript = event.transcriptText;
    let whisperLanguage: string | null = storedAnalysis(event.summaryJson)?.whisperLanguage ?? null;
    if (!transcript) {
      await deps.downloader.download(event.recordingUrl, destPath);
      await save({ recordingPath: destPath });
      const result = await deps.whisper.transcribe(destPath);
      transcript = result.text.trim();
      // An empty transcript can never pass the evidence gate — retrying the
      // model is spend, but the DOWNLOAD may have caught a still-uploading
      // file, so this stays a retryable error (attempts cap parks it).
      if (!transcript) throw new Error("whisper returned an empty transcript");
      whisperLanguage = result.language;
      await save({ transcriptText: transcript });
    }

    // ── Step 3: analyse (skipped when a stored summary already validated).
    let analysis = storedAnalysis(event.summaryJson)?.analysis ?? null;
    if (!analysis) {
      const prompt = buildAnalysisPrompt(event.params, transcript);
      const content = await routed.complete(prompt.system, prompt.user);
      analysis = parseCallAnalysis(content, prompt.sourceText);
      if (!analysis && deps.fallbackComplete) {
        // The local 9B rejects are model weakness, not call weakness — the
        // same transcript reads fine by a stronger model. One retry via the
        // fallback, final answer either way.
        try {
          const fallbackContent = await deps.fallbackComplete(prompt.system, prompt.user);
          analysis = parseCallAnalysis(fallbackContent, prompt.sourceText);
          if (analysis) {
            counts.analysedByFallback++;
            console.log(`[call-transcriber] FALLBACK analysed call ${event.callId} after local rejection`);
          }
        } catch (e) {
          console.log(
            `[call-transcriber] fallback model failed for call ${event.callId}: ${(e as Error).message.slice(0, 160)}`
          );
        }
      }
      if (!analysis) {
        // Evidence gate / schema rejection: the transcript is KEPT but the
        // model is not re-spent on this call — stamp done with the reason.
        //
        // The card still gets the WORDS. A rejected analysis is a reason to
        // withhold our interpretation, never a reason to show the manager an
        // empty card: the transcript is verbatim, so nothing can be
        // hallucinated by putting it there.
        const opp = await routed.twenty.findOpportunityByExternalId(externalId);
        if (opp && !dryRun) {
          const summary = buildFallbackSummary(transcript);
          await routed.twenty.patchOpportunitySummary(opp.id, summary);
          // No AI read, but the audio itself is still worth filing.
          await attachRecording(opp, null);
          await pingCardStamped(deps, routed, event, summary);
        }
        await done("analysis rejected: schema or evidence gate");
        counts.skippedNoEvidence++;
        return;
      }
      await save({ summaryJson: { ...analysis, whisperLanguage } });
    }

    // ── Step 4: the card, then the Twenty note (idempotent by title).
    const opportunity = await routed.twenty.findOpportunityByExternalId(externalId);
    // The CARD is written even when the note already exists. The note is
    // append-only history, the card is current state: re-running the analysis
    // (a better prompt, a repaired transcript) has to reach the fields, or
    // improvements would only ever show up on calls that arrive afterwards.
    if (opportunity && !dryRun) {
      const summary = buildCardSummary(analysis);
      await routed.twenty.patchOpportunitySummary(
        opportunity.id,
        summary,
        cardFactsFrom(analysis)
      );
      // He said his name — stop calling him by his phone number.
      if (analysis.customerName && opportunity.pointOfContactId) {
        await routed.twenty.namePersonIfUnnamed(opportunity.pointOfContactId, analysis.customerName);
      }
      await pingCardStamped(deps, routed, event, summary);
    }
    if (noteExists) {
      // A previous pass wrote the note but may have died before filing the
      // recording — heal it here (dedupe by name + opportunity makes the
      // repeat cheap, one filtered GET).
      if (opportunity) await attachRecording(opportunity, null);
      await done();
      counts.skippedExistingNote++;
      return;
    }
    if (!opportunity) {
      // The relay only projects INBOUND calls — outbound/missed ones have no
      // card to attach to. The transcript is stored either way.
      await done("no Twenty opportunity for this call");
      counts.skippedNoOpportunity++;
      return;
    }
    const body = buildTranscriptNoteBody(analysis, transcript);
    if (!dryRun) {
      const noteId = await routed.twenty.createNoteWithTargets({
        title,
        body,
        opportunityId: opportunity.id,
        personId: opportunity.pointOfContactId,
      });
      routed.noteTitles.add(title); // same-run dedupe; rebuilt per pass
      // Step 5: the audio file itself, on the card + person + this note.
      await attachRecording(opportunity, noteId);
      await done();
    }
    counts.notesWritten++;
  } catch (err) {
    const message = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    // Stamp the claimed row retryable; without a row id (dry-run, or the
    // INSERT race was lost) the next poll simply re-finds the event eligible.
    if (!dryRun && rowId) {
      try {
        await store.markError(event.tenantId, rowId, message);
      } catch {
        // The error stamp itself failing must not mask the original failure.
      }
    }
    counts.failed++;
    counts.firstError ??= `${event.callId}: ${message.slice(0, 160)}`;
  }
}

/** One transcriber pass: find due calls, run each through the pipeline. */
export async function runTranscriberPass(
  deps: TranscriberDeps,
  batchSize: number
): Promise<TranscriberPassCounts> {
  const counts = emptyPassCounts();
  const byTenant = new Map(deps.tenants.map((t) => [t.tenantId, t]));
  const events = await deps.store.findEligible([...byTenant.keys()], batchSize);
  counts.claimed = events.length;
  for (const event of events) {
    const routed = byTenant.get(event.tenantId);
    // Tenant lost eligibility between resolution and claim — next poll.
    if (!routed) continue;
    await transcribeOne(deps, routed, event, counts);
  }
  return counts;
}

// ─── Local-model wiring ─────────────────────────────────────────────────────

/** Box default when the tenant row names no model (same as the resolver's). */
const DEFAULT_TRANSCRIBER_MODEL = "qwen3.5:9b-mlx";
/** Transcripts are longer than resolver cases — allow a slower answer. */
const TRANSCRIBER_MODEL_TIMEOUT_MS = 120_000;
/** Long summaries + quotes need more headroom than completeJson's 1024. */
const TRANSCRIBER_MAX_TOKENS = 2048;

/**
 * The per-tenant strict-JSON completer, resolved from ai_provider_config —
 * the same accessor the resolver uses. Returns null when the tenant has no
 * local provider configured (the runner skips such a tenant; it never falls
 * back to a hardcoded endpoint or another brand's model).
 */
export async function createTranscriberCompleter(
  tenantId: string
): Promise<((system: string, user: string) => Promise<string>) | null> {
  const cfg = await loadAIConfig(tenantId);
  if (!cfg || cfg.provider !== "local" || !cfg.localEndpoint) return null;
  const provider = new LocalProvider({
    baseURL: cfg.localEndpoint,
    model: cfg.localModel ?? DEFAULT_TRANSCRIBER_MODEL,
    timeoutMs: TRANSCRIBER_MODEL_TIMEOUT_MS,
  });
  return (system, user) => provider.completeJson(system, user, TRANSCRIBER_MAX_TOKENS);
}

// ─── Download adapter ───────────────────────────────────────────────────────

const DOWNLOAD_TIMEOUT_MS = 60_000;

export function createFetchDownloader(timeoutMs: number = DOWNLOAD_TIMEOUT_MS): RecordingDownloader {
  return {
    async download(url, destPath) {
      // Cache hit — a previous pass already pulled this recording.
      if (existsSync(destPath)) return;
      await mkdir(dirname(destPath), { recursive: true });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
        // 404/expired links land here and become retryable row errors.
        if (!res.ok) throw new Error(`recording download HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) throw new Error("recording download returned 0 bytes");
        await writeFile(destPath, buf);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// ─── Whisper adapter (mlx_whisper on the box, same as wa-observer's
//     media-processor.py) ────────────────────────────────────────────────────

const WHISPER_PYTHON = [
  "import json, sys",
  "import mlx_whisper",
  'r = mlx_whisper.transcribe(sys.argv[1], path_or_hf_repo="mlx-community/whisper-large-v3-turbo")',
  'print(json.dumps({"text": (r.get("text") or "").strip(), "language": r.get("language")}))',
].join("\n");

/** Long calls on a 9B-class whisper can take minutes; the pass is patient. */
const WHISPER_TIMEOUT_MS = 15 * 60_000;

export function createMlxWhisperRunner(opts: { pythonBin?: string; timeoutMs?: number } = {}): WhisperRunner {
  const pythonBin = opts.pythonBin ?? "python3";
  const timeoutMs = opts.timeoutMs ?? WHISPER_TIMEOUT_MS;
  return {
    transcribe(audioPath) {
      return new Promise((resolve, reject) => {
        const child = spawn(pythonBin, ["-c", WHISPER_PYTHON, audioPath], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const fail = (err: Error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(err);
          }
        };
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          fail(new Error(`whisper timed out after ${Math.round(timeoutMs / 1000)}s`));
        }, timeoutMs);
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", (e) => fail(e));
        child.on("close", (code) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (code !== 0) {
            reject(new Error(`whisper exited ${code}: ${stderr.trim().slice(-300)}`));
            return;
          }
          try {
            // Model load warnings can precede the JSON — take the last line.
            const line = stdout.trim().split("\n").pop() ?? "";
            const parsed = JSON.parse(line) as { text?: unknown; language?: unknown };
            resolve({
              text: typeof parsed.text === "string" ? parsed.text : "",
              language: typeof parsed.language === "string" ? parsed.language : null,
            });
          } catch {
            reject(new Error(`whisper output not JSON: ${stdout.trim().slice(-200)}`));
          }
        });
      });
    },
  };
}

// ─── Twenty adapter (over the existing client) ──────────────────────────────

/** Twenty list pages key their rows by the object path ("opportunities", …). */
function firstRow<T>(page: TwentyListPage<T>, objectPath: string): T | null {
  const rows = page.data?.[objectPath] ?? Object.values(page.data ?? {}).find(Array.isArray) ?? [];
  return rows[0] ?? null;
}

export function createTwentyTranscriber(client: TwentyClient): TranscriberTwenty {
  return {
    async findOpportunityByExternalId(externalId) {
      const page = await client.get<TwentyListPage<Record<string, unknown>>>("opportunities", {
        filter: `externalId[eq]:${externalId}`,
        limit: 1,
      });
      const row = firstRow(page, "opportunities");
      if (!row || typeof row.id !== "string") return null;
      const poc = row.pointOfContactId;
      return { id: row.id, pointOfContactId: typeof poc === "string" ? poc : null };
    },
    async createNoteWithTargets({ title, body, opportunityId, personId }) {
      // Same note mechanics as the mirror's summary notes / the resolver.
      const created = await client.batchCreate("notes", [
        { title, bodyV2: { markdown: body.slice(0, NOTE_BODY_CHARS), blocknote: null } },
      ]);
      const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
      if (typeof noteId !== "string") {
        throw new Error("note created without id in response");
      }
      await client.batchCreate("noteTargets", [
        { noteId, targetOpportunityId: opportunityId },
        ...(personId ? [{ noteId, targetPersonId: personId }] : []),
      ]);
      return noteId;
    },
    async attachRecording({ opportunityId, personId, noteId, filePath, name }) {
      let bytes: Buffer;
      try {
        const st = await stat(filePath);
        if (!st.isFile() || st.size === 0 || st.size > MAX_ATTACHMENT_BYTES) return "skipped";
        bytes = await readFile(filePath);
      } catch {
        return "skipped"; // cache file gone/unreadable — the card link still works
      }
      // Same dedupe style as media-attachment.ts: the server filter narrows
      // the page, the row-level re-check makes it exact (and keeps in-memory
      // mocks honest — they ignore filters).
      const page = await client.get("attachments", {
        filter: `name[eq]:"${filterSafe(name)}",targetOpportunityId[eq]:"${opportunityId}"`,
        limit: 5,
      });
      const pageData = (page as { data?: Record<string, unknown> })?.data ?? {};
      const dupe = Object.values(pageData)
        .flatMap((v) => (Array.isArray(v) ? v : []))
        .some((r) => {
          const row = r as Record<string, unknown>;
          return row.name === name && row.targetOpportunityId === opportunityId;
        });
      if (dupe) return "duplicate";
      const uploaded = await client.uploadFile({ filename: name, bytes });
      await client.post("attachments", {
        name,
        file: [{ fileId: uploaded.fileId, label: name }],
        ...(personId ? { targetPersonId: personId } : {}),
        targetOpportunityId: opportunityId,
        ...(noteId ? { targetNoteId: noteId } : {}),
      });
      return "attached";
    },
    async patchOpportunitySummary(opportunityId, summary, facts) {
      try {
        const car = facts?.car?.trim();
        const amount = Number(facts?.amountAed);
        await client.patch(`opportunities/${opportunityId}`, {
          callSummary: summary,
          // The facts a desk sorts and filters by, as fields rather than
          // buried in prose — "G63 2022/2024, two days, from tomorrow, 1000
          // AED" IS the lead, not a note about one. amount is a CURRENCY
          // composite in Twenty.
          ...(car ? { carModels: car.slice(0, 200) } : {}),
          ...(Number.isFinite(amount) && amount > 0
            ? { amount: { amountMicros: Math.round(amount * 1_000_000), currencyCode: "AED" } }
            : {}),
          ...(facts?.rentalDays ? { rentalDays: facts.rentalDays } : {}),
          ...(facts?.neededFrom ? { neededFrom: facts.neededFrom.slice(0, 60) } : {}),
          ...(facts?.whatsappConfirmed ? { whatsappConfirmed: true } : {}),
        });
        return "written";
      } catch (err) {
        // A workspace without the field answers 400 "field callSummary does
        // not exist". That is a schema gap, not a lost analysis — the note is
        // already written; log and move on rather than failing the call.
        const msg = err instanceof Error ? err.message : String(err);
        if (/HTTP 4\d\d/.test(msg) && /(callSummary|rentalDays|neededFrom|whatsappConfirmed)/i.test(msg)) {
          log.warn("callgear transcriber: workspace lacks a call field, card not stamped", {
            opportunityId,
            error: msg.slice(0, 200),
          });
          return "skipped";
        }
        throw err;
      }
    },
    async namePersonIfUnnamed(personId, name) {
      const person = await client.get<Record<string, unknown>>(`people/${personId}`);
      const rec = ((person?.data as Record<string, unknown> | undefined)?.person ??
        (person?.data as Record<string, unknown> | undefined) ??
        person) as { name?: { firstName?: string; lastName?: string } } | undefined;
      const current = `${rec?.name?.firstName ?? ""} ${rec?.name?.lastName ?? ""}`.trim();
      if (!isPlaceholderName(current)) return "kept";
      const parts = name.trim().split(/\s+/);
      await client.patch(`people/${personId}`, {
        name: { firstName: parts[0].slice(0, 60), lastName: parts.slice(1).join(" ").slice(0, 60) },
      });
      return "named";
    },
  };
}

// ─── Drizzle store (platform DB) ────────────────────────────────────────────

/** Error rows become eligible again after this backoff… */
const ERROR_RETRY_INTERVAL = "1 hour";
/** …up to this many attempts (expired recording URLs park themselves). */
const MAX_ATTEMPTS = 3;
/** A live claim finishes in minutes; anything older was abandoned by a crash. */
const STALE_PROCESSING_INTERVAL = "15 minutes";

function paramsFromRawPayload(raw: unknown): CallGearCallFinishedParams | null {
  const params = (raw as Partial<CallGearCallFinishedRequest> | null)?.params;
  if (!params || typeof params !== "object") return null;
  const p = params as Partial<CallGearCallFinishedParams>;
  if (typeof p.callId !== "string") return null;
  return p as CallGearCallFinishedParams;
}

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

interface EligibleRow {
  event_id: string;
  tenant_id: string;
  provider_event_id: string;
  raw_payload: unknown;
  transcript_row_id: string | null;
  recording_path: string | null;
  transcript_text: string | null;
  summary_json: StoredCallSummary | null;
}

export function createDrizzleTranscriberStore(): TranscriberStore {
  return {
    async findEligible(tenantIds, batchSize) {
      const out: EligibleCall[] = [];
      for (const tenantId of tenantIds) {
        const remaining = batchSize - out.length;
        if (remaining <= 0) break;
        const rows = await withDrizzleTenant(tenantId, async (tx) => {
          const res = await tx.execute(sql`
            SELECT e.id AS event_id,
                   e.tenant_id,
                   e.provider_event_id,
                   e.raw_payload,
                   ct.id AS transcript_row_id,
                   ct.recording_path,
                   ct.transcript_text,
                   ct.summary_json
              FROM integration_event e
              LEFT JOIN call_transcript ct ON ct.integration_event_id = e.id
             WHERE e.provider = 'callgear'
               AND e.processing_status = 'done'
               AND coalesce(e.raw_payload #>> '{params,recordingUrl}', '') <> ''
               AND (
                     ct.id IS NULL
                     OR (ct.status = 'error'
                           AND ct.attempts < ${MAX_ATTEMPTS}
                           AND ct.updated_at < now() - ${ERROR_RETRY_INTERVAL}::interval)
                     OR (ct.status = 'processing'
                           AND ct.updated_at < now() - ${STALE_PROCESSING_INTERVAL}::interval)
                   )
             ORDER BY e.received_at
             LIMIT ${remaining}
          `);
          return sqlRows<EligibleRow>(res);
        });
        for (const row of rows) {
          const params = paramsFromRawPayload(row.raw_payload);
          const recordingUrl = params?.recordingUrl;
          if (typeof recordingUrl !== "string" || !recordingUrl) continue;
          out.push({
            eventId: row.event_id,
            tenantId: row.tenant_id,
            callId: params?.callId ?? row.provider_event_id,
            recordingUrl,
            params,
            transcriptRowId: row.transcript_row_id,
            recordingPath: row.recording_path,
            transcriptText: row.transcript_text,
            summaryJson: row.summary_json,
          });
        }
      }
      return out;
    },

    async beginJob(tenantId, event) {
      return withDrizzleTenant(tenantId, async (tx) => {
        if (event.transcriptRowId) {
          // Retry of an error row / reclaim of an abandoned claim.
          const res = await tx.execute(sql`
            UPDATE call_transcript
               SET status = 'processing', attempts = attempts + 1, error = null, updated_at = now()
             WHERE id = ${event.transcriptRowId}
            RETURNING id
          `);
          return sqlRows<{ id: string }>(res)[0]?.id ?? null;
        }
        // First attempt — the unique index on integration_event_id makes the
        // race between two transcriber instances safe: the loser inserts
        // nothing and skips the event.
        const res = await tx.execute(sql`
          INSERT INTO call_transcript (tenant_id, integration_event_id, call_id, status, attempts)
          VALUES (${tenantId}, ${event.eventId}, ${event.callId}, 'processing', 1)
          ON CONFLICT (integration_event_id) DO NOTHING
          RETURNING id
        `);
        return sqlRows<{ id: string }>(res)[0]?.id ?? null;
      });
    },

    async saveProgress(tenantId, rowId, patch) {
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx
          .update(callTranscript)
          .set({
            ...(patch.recordingPath !== undefined ? { recordingPath: patch.recordingPath } : {}),
            ...(patch.transcriptText !== undefined ? { transcriptText: patch.transcriptText } : {}),
            ...(patch.summaryJson !== undefined ? { summaryJson: patch.summaryJson } : {}),
            updatedAt: new Date(),
          })
          .where(eq(callTranscript.id, rowId));
      });
    },

    async markDone(tenantId, rowId, note) {
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx
          .update(callTranscript)
          .set({ status: "done", error: note ?? null, updatedAt: new Date() })
          .where(eq(callTranscript.id, rowId));
      });
    },

    async markError(tenantId, rowId, error) {
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx
          .update(callTranscript)
          .set({ status: "error", error: error.slice(0, 500), updatedAt: new Date() })
          .where(eq(callTranscript.id, rowId));
      });
    },
  };
}

/** Tenant slug lookup (the recording cache directory names use it). */
export async function tenantSlugForId(tenantId: string): Promise<string | null> {
  const rows = await platformDb
    .select({ slug: tenant.slug })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  return rows[0]?.slug ?? null;
}
