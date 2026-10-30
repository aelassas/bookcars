// STAGE PROGRESSION — slice 1 (rails only).
//
// A local-AI pass that reads a lead's RECENT conversation (WhatsApp lines from
// our own `message` table + call summaries from `call_transcript`) and moves
// the lead's Twenty opportunity FORWARD, and only forward. Per candidate the
// pass gathers the bounded conversation since the last checkpoint, asks the
// tenant's LOCAL model for ONE compact strict-JSON stage decision, and writes
// only two things into the tenant's Twenty workspace:
//
//   1. opportunity.stage — patched to the justified stage;
//   2. ONE stageEvents audit row, idempotent-shaped by externalId
//      (`stage:<opportunityId>:<changedAtISO>`), changedBy "stage-ai".
//
// THE RAILS (never crossed):
//   - FORWARD ONLY, capped at MEETING (canonical). PROPOSAL/CUSTOMER are a
//     human's call; LOST/CANCELLED are never a target.
//   - A deal in a MANUAL stage (isManualStage) or a CLOSED stage is never
//     touched — the mirror's guard, applied here for the same reason.
//   - EVIDENCE — every `evidence` string must be a verbatim substring of the
//     conversation text handed to the model. No evidence (or invented
//     evidence) means the case is skipped and NOTHING is written.
//   - DRY-RUN BY DEFAULT — zero Twenty writes, no checkpoint move, until the
//     runner passes --commit.
//
// The core (`runStageProgressionPass`) is DB-agnostic and fully testable; the
// drizzle plumbing at the bottom mirrors how resolver.ts wires its own.

import { and, eq, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { twentyMirrorState } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import { fetchOpportunitiesForTails } from "@/platform/integrations/twenty/deal-link";
import type { TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import {
  CLOSED_STAGES,
  isManualStage,
  stageVocabulary,
  toInstanceStage,
} from "@/platform/integrations/twenty/stages";

type PlatformDb = typeof platformDb;

// ─── Canonical vocabulary ───────────────────────────────────────────────────

/**
 * The furthest stage this pass may ever assert. Everything past MEETING is a
 * human decision (a proposal is a document, a customer is a payment).
 */
export const MAX_AUTO_STAGE = "MEETING";

/**
 * The FORWARD path, in order. LOST/CANCELLED are deliberately absent: terminal
 * is never a target and never a readable position on this ladder.
 */
const CANONICAL_ORDER = ["NEW", "SCREENING", "MEETING", "PROPOSAL", "CUSTOMER"] as const;

/** Below this the model's own doubt is reason enough to stay put. */
export const MIN_CONFIDENCE = 0.7;

/**
 * Instance stage → canonical. stages.ts only carries the forward maps; the
 * reverse is built from them here (both vocabularies are injective, so this is
 * total over the stages the mirror could have written). Unmappable stages
 * (the rental desk's manual columns) return null — the isManualStage guard
 * has already excluded them by the time this matters.
 */
export function fromInstanceStage(instance: TwentyInstanceKey, stage: string | null): string | null {
  if (!stage) return null;
  const forward = stageVocabulary(instance).fromCanonical;
  for (const [canonical, instanceStage] of Object.entries(forward)) {
    if (instanceStage === stage) return canonical;
  }
  return null;
}

// ─── Output contract ────────────────────────────────────────────────────────

export interface StageAnalysis {
  /** Canonical target the model believes is justified (may equal current). */
  targetStage: string;
  /** 0..1 — below MIN_CONFIDENCE the pass stays put. */
  confidence: number;
  reason: string;
  /** Verbatim quotes from the conversation — the write gate. */
  evidence: string[];
  /** The conversation clearly shows the deal died (Ayham 2026-08-17: "see the
   *  reason in case the deal was unsuccessful"). NEVER moves the stage —
   *  closing a deal stays a human's call; this only fills the lossReason
   *  field so the human sees WHY when they do close it. */
  lost: boolean;
  lostReason: string | null;
}

// ─── Conversation shapes ────────────────────────────────────────────────────

export interface StageMessageLine {
  direction: string;
  body: string;
  at: Date;
}

export interface StageCallLine {
  summary: string;
  outcomeHint: string | null;
  urgency: string | null;
  at: Date;
}

/** One phone number's merged conversation since the checkpoint. */
export interface StageThread {
  phoneTail: string;
  customerName: string | null;
  messages: StageMessageLine[];
  calls: StageCallLine[];
  /** Newest activity across both sources — drives the checkpoint. */
  lastActivityAt: Date;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

export interface StagePrompt {
  system: string;
  user: string;
  /**
   * The exact conversation text the model saw. Every `evidence` string in the
   * output must be a verbatim substring of this — the anti-hallucination gate.
   */
  sourceText: string;
}

const STAGE_SYSTEM =
  `You are a funnel qualifier for a UAE car sales/rental company. Given a ` +
  `deal's CURRENT stage and its recent conversation (WhatsApp lines and call ` +
  `summaries), decide the FURTHEST stage the conversation honestly justifies. ` +
  `Respond with ONLY a JSON object (no prose, no markdown) with exactly these fields:\n` +
  `- targetStage: one of "NEW" | "SCREENING" | "MEETING" — the current stage ` +
  `if no move is justified, otherwise the furthest justified one. Never ` +
  `anything else; later stages are decided by humans.\n` +
  `- confidence: number 0..1 that the target is justified\n` +
  `- reason: one short sentence\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character ` +
  `from the conversation below that justify the target. Never invent a quote.\n` +
  `- lost: boolean — true ONLY when the conversation clearly shows the deal ` +
  `died: the customer declined, went with another company, said it is too ` +
  `expensive and stopped, failed document/deposit requirements, or explicitly ` +
  `cancelled. Mere silence is NOT lost.\n` +
  `- lostReason: when lost is true, one short plain sentence naming the ` +
  `reason (e.g. "Price too high — went with a cheaper offer"); otherwise null.\n` +
  `Stage semantics:\n` +
  `- SCREENING = the customer engaged with real intent: they responded and ` +
  `named what they want — a car, a budget, timing, or concrete requirements.\n` +
  `- MEETING = a meeting, showroom visit, or call appointment was agreed, or ` +
  `a concrete next step with a time was proposed AND accepted.\n` +
  `Silence, one-word replies, and our own unanswered messages justify nothing.`;

/** Per-thread prompt bounds — the whole point of the window is small prompts. */
const MAX_THREAD_MESSAGES = 30;
const MAX_THREAD_CHARS = 4000;
const MAX_CALL_LINES = 5;

function capMessages(messages: StageMessageLine[]): StageMessageLine[] {
  const recent = messages.slice(-MAX_THREAD_MESSAGES);
  const out: StageMessageLine[] = [];
  let chars = 0;
  // Newest-first fill keeps the tail of a long thread, which is where the
  // stage signal lives; reversed back to chronological at the end.
  for (const line of [...recent].reverse()) {
    if (chars + line.body.length > MAX_THREAD_CHARS) break;
    chars += line.body.length;
    out.push(line);
  }
  return out.reverse();
}

export function buildStagePrompt(
  thread: StageThread,
  currentCanonical: string,
  currentInstanceStage: string
): StagePrompt {
  const lines = capMessages(thread.messages).map((m) => {
    const who = m.direction === "outbound" ? "Sales" : "Customer";
    const arrow = m.direction === "outbound" ? "→" : "←";
    return `[${m.at.toISOString()}] ${arrow} ${who}: ${m.body}`;
  });

  const callLines = thread.calls.slice(-MAX_CALL_LINES).map((c) =>
    `[${c.at.toISOString()}] ☎ call summary: ${c.summary}` +
    (c.outcomeHint ? ` (outcome: ${c.outcomeHint})` : "") +
    (c.urgency ? ` (urgency: ${c.urgency})` : "")
  );

  const sourceText = [...lines, ...callLines].join("\n");

  const user =
    `Current stage: ${currentCanonical} (workspace column "${currentInstanceStage}")\n` +
    `Allowed targets: ${currentCanonical} (no move), or forward up to MEETING.\n\n` +
    `Conversation (oldest first):\n${sourceText || "none"}`;

  return { system: STAGE_SYSTEM, user, sourceText };
}

// ─── Output validation ──────────────────────────────────────────────────────

/**
 * Parse + validate the model's answer. Returns null — meaning SKIP, never
 * write — when the JSON is malformed, any field is off-shape, the target is
 * not on the ladder, `evidence` is empty, or any evidence string is not a
 * verbatim substring of `sourceText` (a quote the model invented proves the
 * whole reading is untrustworthy).
 */
export function parseStageAnalysis(content: string, sourceText: string): StageAnalysis | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  if (typeof parsed.targetStage !== "string") return null;
  if (!(CANONICAL_ORDER as readonly string[]).includes(parsed.targetStage)) return null;
  if (
    typeof parsed.confidence !== "number" ||
    !Number.isFinite(parsed.confidence) ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    return null;
  }
  if (typeof parsed.reason !== "string" || !parsed.reason.trim()) return null;
  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) return null;
  const evidence: string[] = [];
  for (const quote of parsed.evidence) {
    if (typeof quote !== "string" || !quote.trim()) return null;
    if (!sourceText.includes(quote)) return null;
    evidence.push(quote);
  }

  // Tolerant on the loss verdict: absent/off-shape means simply "not lost" —
  // an older model output shape must not invalidate the stage reading.
  const lost = parsed.lost === true && typeof parsed.lostReason === "string" && !!parsed.lostReason.trim();

  return {
    targetStage: parsed.targetStage,
    confidence: parsed.confidence,
    reason: parsed.reason.trim(),
    evidence,
    lost,
    lostReason: lost ? (parsed.lostReason as string).trim() : null,
  };
}

/** Same tolerance as LocalProvider: models wrap JSON in ```json fences. */
function extractJson(s: string): string {
  const trimmed = s.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}

// ─── Pure planner ───────────────────────────────────────────────────────────

/**
 * The ONLY stage decision this module can make. Returns the canonical target
 * to write, or null — stay put — unless EVERY rail holds:
 *   - the analysis is usable at all (gate-passed, confident, evidenced);
 *   - both stages sit on the forward ladder (LOST/CANCELLED never do);
 *   - the target is at or below MAX_AUTO_STAGE;
 *   - the target is strictly AHEAD of the current stage.
 * Backward moves, sideways moves, moves past MEETING: null.
 */
export function planStageTransition(
  currentCanonicalStage: string,
  analysis: StageAnalysis | null
): string | null {
  if (!analysis) return null;
  if (analysis.confidence < MIN_CONFIDENCE) return null;
  if (analysis.evidence.length === 0) return null;
  const current = CANONICAL_ORDER.indexOf(currentCanonicalStage as (typeof CANONICAL_ORDER)[number]);
  const target = CANONICAL_ORDER.indexOf(analysis.targetStage as (typeof CANONICAL_ORDER)[number]);
  if (current === -1 || target === -1) return null;
  if (target > CANONICAL_ORDER.indexOf(MAX_AUTO_STAGE)) return null;
  if (target <= current) return null;
  return analysis.targetStage;
}

// ─── Core pass (DB-agnostic, fully testable) ────────────────────────────────

export interface StageProgressionSource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  /** WhatsApp activity since `since`, grouped by phone tail9, newest threads first. */
  loadWhatsAppThreads(since: Date, limit: number): Promise<StageThread[]>;
  /** Call summaries since `since`, grouped by phone tail9. */
  loadCallThreads(since: Date, limit: number): Promise<StageThread[]>;
}

export interface StageProgressionDeps {
  /** The tenant's OWN Twenty deployment — routing happens in the runner. */
  client: TwentyClient;
  /** Which deployment vocabulary the stages live in. */
  instance: TwentyInstanceKey;
  source: StageProgressionSource;
  /** One strict-JSON completion from the tenant's local model. */
  complete: (system: string, user: string) => Promise<string>;
  /** Brand scoping for the shared rental workspace (see deal-link.ts). */
  brandLine?: string | null;
}

export interface StageProgressionPassOptions {
  /** false (default) = dry-run: ZERO Twenty writes, no checkpoint move. */
  commit?: boolean;
  /** Overrides the stored checkpoint for THIS pass (backfill). */
  since?: Date;
  /** Threads per pass. */
  batch?: number;
  /** First-ever run looks back this far. */
  sinceDays?: number;
  logger?: (line: string) => void;
}

export interface StageProgressionPassCounts {
  /** Threads with conversation since the checkpoint. */
  threads: number;
  /** Threads that resolved to an open, writable opportunity. */
  candidates: number;
  /** Model calls that survived the evidence/schema gate. */
  classified: number;
  /** Opportunities actually moved (or that would move, in dry-run). */
  moved: number;
  skippedNoOpportunity: number;
  skippedClosed: number;
  skippedManual: number;
  /** Already at or past MEETING — nothing this pass may add. */
  skippedAtCap: number;
  /** lossReason written (deal judged dead by the model; stage untouched). */
  lostMarked: number;
  /** Gate-passed but no justified forward move. */
  skippedNoMove: number;
  /** Rejected by the evidence/schema gate — never written. */
  skippedNoEvidence: number;
  failed: number;
  firstError?: string;
}

const DEFAULT_BATCH = 25;

function emptyPassCounts(): StageProgressionPassCounts {
  return {
    threads: 0,
    candidates: 0,
    classified: 0,
    moved: 0,
    skippedNoOpportunity: 0,
    skippedClosed: 0,
    skippedManual: 0,
    skippedAtCap: 0,
    lostMarked: 0,
    skippedNoMove: 0,
    skippedNoEvidence: 0,
    failed: 0,
  };
}

/** Idempotency-shaped audit key — same mechanics as the mirror's stageEvents. */
export function stageProgressionEventExternalId(opportunityId: string, changedAt: Date): string {
  return `stage:${opportunityId}:${changedAt.toISOString()}`;
}

/**
 * Write ONE stageEvents audit row with its opportunity relation INTACT.
 * Live forensics (2026-08-13): 39 of 68 stage-ai rows in the rental workspace
 * had NULL opportunityId while one-shot probes of both write paths linked
 * correctly — i.e. the relation is dropped INTERMITTENTLY, server-side, and
 * the batch path never told us. Hardening, in layers:
 *   1. no opportunityId → throw BEFORE any write (a relation-less audit row
 *      is worse than none — it can never be re-identified);
 *   2. single POST (the proven path), not batchCreate;
 *   3. READ BACK the created row: if the relation didn't stick, PATCH it on
 *      and log a WARN — if Twenty ever drops it again, the log says so.
 * deal-confirmation's broadcast marker uses the same helper.
 */
export async function writeStageEventLink(
  client: TwentyClient,
  row: {
    externalId: string;
    fromStage: string | null;
    toStage: string | null;
    changedBy: string;
    changedAt: string;
    opportunityId: string;
  },
  logger?: (line: string) => void
): Promise<void> {
  if (typeof row.opportunityId !== "string" || !row.opportunityId) {
    throw new Error(`stageEvent ${row.externalId}: no opportunityId — refusing a relation-less audit row`);
  }
  const res = await client.post("stageEvents", row);
  // Create echoes differ between versions — read the id off whatever single
  // record came back (same tolerance as the relay's createdId).
  const data = (res as { data?: Record<string, unknown> } | undefined)?.data ?? {};
  const rec = Object.values(data)[0] as { id?: unknown } | undefined;
  const createdId = rec && typeof rec.id === "string" ? rec.id : null;
  if (!createdId) return; // no id to read back with — the post carried the relation
  const back = await client.get<Record<string, Record<string, unknown>>>(`stageEvents/${createdId}`);
  const stored = (back?.data?.stageEvent ?? {}) as Record<string, unknown>;
  const linked =
    (typeof stored.opportunityId === "string" && stored.opportunityId) ||
    ((stored.opportunity as { id?: unknown } | null)?.id as string | undefined) ||
    null;
  if (linked !== row.opportunityId) {
    logger?.(
      `[stage-events] WARN opportunityId did not stick on stageEvent ${createdId} ` +
        `(wanted ${row.opportunityId}, read ${linked ?? "NULL"}) — patching`
    );
    await client.patch(`stageEvents/${createdId}`, { opportunityId: row.opportunityId });
  }
}

export async function runStageProgressionPass(
  deps: StageProgressionDeps,
  opts: StageProgressionPassOptions = {}
): Promise<StageProgressionPassCounts> {
  const { client, instance, source, complete } = deps;
  const commit = opts.commit ?? false;
  const log = opts.logger ?? (() => {});
  const counts = emptyPassCounts();

  // The pass start, captured BEFORE any read: on commit the checkpoint moves
  // here (not to now) so rows created mid-pass are seen by the next one.
  const passStart = new Date();
  const checkpoint = await source.loadCheckpoint();
  const since =
    opts.since ?? checkpoint ?? new Date(passStart.getTime() - (opts.sinceDays ?? 3) * 86_400_000);

  const batch = opts.batch ?? DEFAULT_BATCH;
  const [waThreads, callThreads] = await Promise.all([
    source.loadWhatsAppThreads(since, batch),
    source.loadCallThreads(since, batch),
  ]);

  // Merge both sources by tail9 — a lead that texted AND called is one thread.
  const threads = new Map<string, StageThread>();
  for (const t of [...waThreads, ...callThreads]) {
    const existing = threads.get(t.phoneTail);
    if (!existing) {
      threads.set(t.phoneTail, { ...t });
      continue;
    }
    existing.messages.push(...t.messages);
    existing.calls.push(...t.calls);
    existing.customerName ??= t.customerName;
    if (t.lastActivityAt > existing.lastActivityAt) existing.lastActivityAt = t.lastActivityAt;
  }
  for (const t of threads.values()) {
    t.messages.sort((a, b) => a.at.getTime() - b.at.getTime());
    t.calls.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  const merged = [...threads.values()]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, batch);
  counts.threads = merged.length;
  if (merged.length === 0) return counts;

  // tail9 → opportunity, fetched with a server-side filter (NEVER a full
  // crawl — the sales book is ~79k deals, see deal-link.ts). The helper
  // returns only the match winner, so the current stage + name are read per
  // candidate below; bounded by batch.
  const phoneIndex = await fetchOpportunitiesForTails(
    client,
    merged.map((t) => t.phoneTail),
    deps.brandLine
  );

  const vocabulary = stageVocabulary(instance);
  const validStages = new Set(vocabulary.options.map((o) => o.value));

  for (const thread of merged) {
    const match = phoneIndex.get(thread.phoneTail);
    if (!match) {
      counts.skippedNoOpportunity++;
      continue;
    }

    // The match carries no stage/name — read the record (1 request per
    // candidate). A live read also means the guards below judge the stage as
    // it is NOW, not as the index built it.
    let stage: string | null = null;
    let opportunityName: string | null = null;
    let existingLossReason: string | null = null;
    try {
      const res = await client.get<Record<string, Record<string, unknown>>>(
        `opportunities/${match.id}`
      );
      const opp = (res?.data?.opportunity ?? {}) as Record<string, unknown>;
      stage = typeof opp.stage === "string" ? opp.stage : null;
      opportunityName = typeof opp.name === "string" ? opp.name : null;
      existingLossReason =
        typeof opp.lossReason === "string" && opp.lossReason.trim() ? opp.lossReason : null;
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `opp/${match.id}: ${(e as Error).message.slice(0, 160)}`;
      continue;
    }

    // ── The guards, in order. Any one of them means: this deal is not ours
    //    to move. (mirror.ts:900 — the manual-stage guard — applied here.)
    if (!stage || CLOSED_STAGES.has(stage)) {
      counts.skippedClosed++;
      continue;
    }
    if (isManualStage(instance, stage)) {
      counts.skippedManual++;
      continue;
    }
    const currentCanonical = fromInstanceStage(instance, stage);
    if (!currentCanonical) {
      // Mirror-reachable stages always map; anything else is de facto manual.
      counts.skippedManual++;
      continue;
    }
    const currentIdx = CANONICAL_ORDER.indexOf(currentCanonical as (typeof CANONICAL_ORDER)[number]);
    if (currentIdx === -1 || currentIdx >= CANONICAL_ORDER.indexOf(MAX_AUTO_STAGE)) {
      counts.skippedAtCap++;
      continue;
    }
    counts.candidates++;

    if (thread.messages.length === 0 && thread.calls.length === 0) {
      counts.skippedNoEvidence++;
      continue;
    }

    const prompt = buildStagePrompt(thread, currentCanonical, stage);

    // A model failure (timeout, endpoint down) must never kill the pass.
    let content: string;
    try {
      content = await complete(prompt.system, prompt.user);
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `model/${thread.phoneTail}: ${(e as Error).message.slice(0, 160)}`;
      continue;
    }

    const analysis = parseStageAnalysis(content, prompt.sourceText);
    if (!analysis) {
      counts.skippedNoEvidence++;
      continue;
    }
    counts.classified++;

    // ── Loss reason (stage NEVER moves for this — closing is a human's call).
    //    Blank-fill only: a reason a manager typed is never overwritten. A 400
    //    (workspace without the lossReason field) is logged and skipped.
    if (analysis.lost && analysis.lostReason && analysis.confidence >= MIN_CONFIDENCE && !existingLossReason) {
      log(
        `[stage-progression] ${commit ? "LOST" : "DRY "} ${opportunityName ?? "?"} ` +
          `…${thread.phoneTail} reason="${analysis.lostReason.slice(0, 100)}" ` +
          `conf=${analysis.confidence.toFixed(2)} evidence="${analysis.evidence[0].slice(0, 80)}"`
      );
      if (commit) {
        try {
          await client.patch(`opportunities/${match.id}`, {
            lossReason: analysis.lostReason.slice(0, 300),
          });
          counts.lostMarked++;
        } catch (e) {
          log(
            `[stage-progression] lossReason write skipped for ${match.id}: ` +
              `${(e as Error).message.slice(0, 120)}`
          );
        }
      } else {
        counts.lostMarked++;
      }
    }

    const targetCanonical = planStageTransition(currentCanonical, analysis);
    if (!targetCanonical) {
      counts.skippedNoMove++;
      continue;
    }

    const targetInstanceStage = toInstanceStage(instance, targetCanonical);
    // Belt and braces: the translation table and the live vocabulary must
    // agree, or the board renders "Sorry, something went wrong" (stages.ts).
    if (!targetInstanceStage || !validStages.has(targetInstanceStage)) {
      counts.failed++;
      counts.firstError ??= `translate/${thread.phoneTail}: no instance stage for ${targetCanonical}`;
      continue;
    }

    const changedAt = new Date();
    log(
      `[stage-progression] ${commit ? "MOVE" : "DRY "} ${opportunityName ?? "?"} ` +
        `…${thread.phoneTail} ${stage} → ${targetInstanceStage} ` +
        `conf=${analysis.confidence.toFixed(2)} evidence="${analysis.evidence[0].slice(0, 80)}"`
    );

    // ── Write path (commit only). Per-lead try/catch: one failure counts and
    //    the pass proceeds.
    try {
      if (commit) {
        // The relation guard lives inside writeStageEventLink — but say WHICH
        // deal failed here, where the context is.
        if (typeof match.id !== "string" || !match.id) {
          throw new Error(`stageEvents write: index match for …${thread.phoneTail} carried no opportunity id`);
        }
        await client.patch(`opportunities/${match.id}`, { stage: targetInstanceStage });
        await writeStageEventLink(
          client,
          {
            externalId: stageProgressionEventExternalId(match.id, changedAt),
            fromStage: stage,
            toStage: targetInstanceStage,
            changedBy: "stage-ai",
            changedAt: changedAt.toISOString(),
            opportunityId: match.id,
          },
          log
        );
      }
      counts.moved++;
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `write/${match.id}: ${(e as Error).message.slice(0, 160)}`;
    }
  }

  // Checkpoint advances past the whole pass — moved, skipped AND failed
  // alike (re-calling the model on a thread with no new activity every poll
  // is just spend; new activity is what re-enters a lead). Dry-run never
  // moves it.
  if (commit) await source.saveCheckpoint(passStart);

  return counts;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "stage_progression";

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

export function createDrizzleStageProgressionSource(
  db: PlatformDb,
  tenantId: string
): StageProgressionSource {
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

    async loadWhatsAppThreads(since, limit) {
      // The customer number behind each line: inbound → the sender (the real
      // phone behind a @lid JID via wa_identity, else from_pn, else the JID),
      // outbound → the recipient. GROUP ROWS ARE INCLUDED: a @g.us JID names
      // the room, not the customer, so group lines key on the participant
      // phone (from_pn) alone — a group line without one keys to '' and the
      // length gate below drops it. Same tail9 rule as chat-queries.ts:173,
      // and the same thread-shape as classify-inbox.ts (group, ARRAY_AGG, cap).
      const res = await db.execute(sql`
        WITH numbered AS (
          SELECT
            right(regexp_replace(coalesce(
              CASE WHEN m.direction = 'outbound' THEN CASE WHEN m."to" LIKE '%@g.us' THEN NULL ELSE m."to" END
                   WHEN m."from" LIKE '%@g.us' THEN m.from_pn
                   ELSE coalesce(
                     (SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"),
                     m.from_pn, m."from")
              END, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS tail9,
            m.direction, m.body, m.customer_name, m.created_at,
            ROW_NUMBER() OVER (
              PARTITION BY right(regexp_replace(coalesce(
                CASE WHEN m.direction = 'outbound' THEN CASE WHEN m."to" LIKE '%@g.us' THEN NULL ELSE m."to" END
                     WHEN m."from" LIKE '%@g.us' THEN m.from_pn
                     ELSE coalesce(
                       (SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"),
                       m.from_pn, m."from")
                END, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS})
              ORDER BY m.created_at DESC
            ) AS rn
          FROM message m
          WHERE m.tenant_id = ${tenantId}
            AND m.channel = 'whatsapp'
            AND m.body IS NOT NULL
            AND m.created_at > ${since}
        )
        SELECT tail9,
               max(customer_name) AS customer_name,
               ARRAY_AGG(
                 jsonb_build_object('direction', direction, 'body', body, 'at', created_at)
                 ORDER BY created_at
               ) AS lines,
               MAX(created_at) AS last_seen
          FROM numbered
         WHERE rn <= ${MAX_THREAD_MESSAGES}
           AND length(tail9) >= ${MIN_PHONE_MATCH_DIGITS}
         GROUP BY tail9
         ORDER BY last_seen DESC
         LIMIT ${limit}
      `);
      interface Row {
        tail9: string;
        customer_name: string | null;
        lines: { direction: string; body: string; at: string }[] | null;
        last_seen: string;
      }
      return sqlRows<Row>(res).map((r) => ({
        phoneTail: r.tail9,
        customerName: r.customer_name ?? null,
        messages: (r.lines ?? []).map((l) => ({
          direction: String(l.direction ?? "inbound"),
          body: String(l.body ?? ""),
          at: new Date(l.at),
        })),
        calls: [],
        lastActivityAt: new Date(r.last_seen),
      }));
    },

    async loadCallThreads(since, limit) {
      // Structured call analysis lives in call_transcript.summary_json; the
      // caller's number lives on the source event (the transcriber's join,
      // transcriber.ts:948). Outbound calls reach the customer at params.to.
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
        summary_json: {
          summary?: unknown;
          outcomeHint?: unknown;
          urgency?: unknown;
        } | null;
        updated_at: string;
      }
      const byTail = new Map<string, StageThread>();
      for (const r of sqlRows<Row>(res)) {
        if (r.tail9.length < MIN_PHONE_MATCH_DIGITS) continue;
        const summary = typeof r.summary_json?.summary === "string" ? r.summary_json.summary : null;
        if (!summary) continue;
        const call: StageCallLine = {
          summary,
          outcomeHint: typeof r.summary_json?.outcomeHint === "string" ? r.summary_json.outcomeHint : null,
          urgency: typeof r.summary_json?.urgency === "string" ? r.summary_json.urgency : null,
          at: new Date(r.updated_at),
        };
        const existing = byTail.get(r.tail9);
        if (existing) {
          existing.calls.push(call);
          if (call.at > existing.lastActivityAt) existing.lastActivityAt = call.at;
        } else {
          byTail.set(r.tail9, {
            phoneTail: r.tail9,
            customerName: null,
            messages: [],
            calls: [call],
            lastActivityAt: call.at,
          });
        }
      }
      return [...byTail.values()];
    },
  };
}
