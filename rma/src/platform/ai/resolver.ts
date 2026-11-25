// AI RESOLVER — slice 1 (rails only).
//
// A local-AI enrichment pass over new/newly-active CRM cases. Per case the
// pass gathers the bounded conversation context (WhatsApp messages with the
// person, recent CallGear call metadata for the same phone tail9, the deal's
// own fields), asks the tenant's LOCAL model for ONE compact strict-JSON
// resolution, and writes only three things into the tenant's Twenty
// workspace:
//
//   1. a note on the opportunity, idempotent by title (`AI Resolver ·
//      deal:<externalId>` — same note mechanics as the mirror's BitrixGPT
//      summary notes; an existing title means SKIP, v1 never updates);
//   2. person.languageSegment — ONLY when language resolved with confidence
//      AND the person has no value yet (a hand-set value is never touched);
//   3. opportunity.carModels — only when carInterest is non-null AND the
//      field is currently empty.
//
// NEVER: stage moves, owner changes, deletes, money fields, new metadata.
//
// Two hard guards keep the model honest:
//   - STRICT schema validation — anything off-shape is rejected;
//   - EVIDENCE — every `evidence` string must be a verbatim substring of the
//     conversation text handed to the model. No evidence (or invented
//     evidence) means the case is skipped and NOTHING is written.
//
// The core (`runResolverPass`) is DB-agnostic and fully testable; the drizzle
// plumbing at the bottom mirrors how mirror.ts / push-message.ts wire theirs.

import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { customer, deal, lead, twentyMirrorState } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, PG_NON_DIGIT_RE, normalizePhone } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import {
  buildNoteTitleIndex,
  buildTwentyIndex,
  brandLineForTenantSlug,
} from "@/platform/integrations/twenty/mirror";
import { loadAIConfig } from "./index";
import { LocalProvider } from "./providers/local";
import { DeepseekProvider } from "./providers/deepseek";

type PlatformDb = typeof platformDb;

// ─── Output contract ────────────────────────────────────────────────────────

export type ResolverLanguage = "english" | "russian" | "arabic" | "unknown";
export type ResolverUrgency = "hot" | "warm" | "cold";

export interface ResolverResult {
  language: ResolverLanguage;
  intent: string;
  carInterest: string | null;
  budgetAed: number | null;
  urgency: ResolverUrgency;
  nextAction: string;
  /** Verbatim quotes from the conversation — the write gate. */
  evidence: string[];
}

const LANGUAGES: ResolverLanguage[] = ["english", "russian", "arabic", "unknown"];
const URGENCIES: ResolverUrgency[] = ["hot", "warm", "cold"];

/** person.languageSegment SELECT codes (the Twenty metadata already exists). */
export const LANGUAGE_SEGMENT_CODE: Partial<Record<ResolverLanguage, string>> = {
  english: "ENGLISH_SPEAKING",
  russian: "RUSSIAN_SPEAKING",
  arabic: "ARABIC_SPEAKING",
};

/** Note title = the note's idempotency key (notes have no externalId field). */
export function aiResolverNoteTitle(scopedDealExternalId: string): string {
  return `AI Resolver · ${scopedDealExternalId}`;
}

/**
 * The deal's key in Twenty — the same scoped shape the mirror upserts by
 * (`deal:<bitrixId>`, brand-prefixed where the tenant has a brand line).
 */
export function scopedDealExternalId(externalId: string, brandLine?: string | null): string {
  return brandLine ? `${brandLine}/deal:${externalId}` : `deal:${externalId}`;
}

// ─── Case + context shapes ──────────────────────────────────────────────────

export interface ResolverCase {
  dealId: string;
  /** Twenty-side key; null for platform-native deals the mirror never pushed. */
  scopedExternalId: string | null;
  /** tail9 of the lead's phone — the platform's standard matching key. */
  phoneTail: string | null;
  stage: string | null;
  /** What the customer actually named (vouched) else the Bitrix carModels. */
  car: string | null;
  valueAed: number | null;
  /** coalesce(source_modified_at, last_activity_at, updated_at). */
  touchedAt: Date;
}

export interface ResolverMessage {
  direction: string;
  customerName: string | null;
  body: string;
  createdAt: Date;
}

export interface ResolverCallMeta {
  direction: string | null;
  durationSeconds: number | null;
  agentName: string | null;
  recordingUrl: string | null;
  at: Date;
}

// ─── Prompt ─────────────────────────────────────────────────────────────────

export interface ResolverPrompt {
  system: string;
  user: string;
  /**
   * The exact conversation text the model saw. Every `evidence` string in the
   * output must be a verbatim substring of this — the anti-hallucination gate.
   */
  sourceText: string;
}

const RESOLVER_SYSTEM =
  `You are an analyst for a UAE car rental/sales company. Given one CRM case ` +
  `(deal fields, WhatsApp conversation, call metadata), respond with ONLY a ` +
  `JSON object (no prose, no markdown) with exactly these fields:\n` +
  `- language: the CUSTOMER's language, one of "english" | "russian" | "arabic" | "unknown"\n` +
  `- intent: short label of what the customer wants\n` +
  `- carInterest: the car make/model the customer named, or null\n` +
  `- budgetAed: the budget/price the customer named in AED (number), or null\n` +
  `- urgency: one of "hot" | "warm" | "cold"\n` +
  `- nextAction: one concrete next step for the salesperson\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character from ` +
  `the conversation below that justify your reading. Never invent a quote.`;

export function buildResolverPrompt(
  kase: ResolverCase,
  messages: ResolverMessage[],
  calls: ResolverCallMeta[]
): ResolverPrompt {
  const transcript = messages
    .map((m) => {
      const who = m.direction === "outbound" ? "Sales" : (m.customerName ?? "Customer");
      return `${who}: ${m.body}`;
    })
    .join("\n");

  const callLines =
    calls.length > 0
      ? calls
          .map(
            (c) =>
              `- ${c.at.toISOString()} ${c.direction ?? "unknown"} call, ` +
              `${c.durationSeconds ?? 0}s` +
              (c.agentName ? `, agent ${c.agentName}` : "") +
              (c.recordingUrl ? ", has recording" : "")
          )
          .join("\n")
      : "none";

  const user =
    `Deal: stage=${kase.stage ?? "unknown"}, car=${kase.car ?? "unknown"}, ` +
    `value=${kase.valueAed ?? "unknown"} AED\n\n` +
    `WhatsApp conversation (oldest first):\n${transcript}\n\n` +
    `Recent calls:\n${callLines}`;

  return { system: RESOLVER_SYSTEM, user, sourceText: transcript };
}

// ─── Output validation ──────────────────────────────────────────────────────

/**
 * Parse + validate the model's answer. Returns null — meaning SKIP, never
 * write — when the JSON is malformed, any field is off-shape, `evidence` is
 * empty, or any evidence string is not a verbatim substring of `sourceText`
 * (a quote the model invented proves the whole reading is untrustworthy).
 */
export function parseResolverResult(content: string, sourceText: string): ResolverResult | null {
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
  if (typeof parsed.intent !== "string" || !parsed.intent.trim()) return null;
  if (typeof parsed.nextAction !== "string" || !parsed.nextAction.trim()) return null;
  if (parsed.carInterest !== null && typeof parsed.carInterest !== "string") return null;
  if (typeof parsed.carInterest === "string" && !parsed.carInterest.trim()) return null;
  if (
    parsed.budgetAed !== null &&
    (typeof parsed.budgetAed !== "number" || !Number.isFinite(parsed.budgetAed) || parsed.budgetAed < 0)
  ) {
    return null;
  }
  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) return null;
  const evidence: string[] = [];
  for (const quote of parsed.evidence) {
    if (typeof quote !== "string" || !quote.trim()) return null;
    if (!sourceText.includes(quote)) return null;
    evidence.push(quote);
  }

  return {
    language: parsed.language,
    intent: parsed.intent.trim(),
    carInterest: typeof parsed.carInterest === "string" ? parsed.carInterest.trim() : null,
    budgetAed: parsed.budgetAed ?? null,
    urgency: parsed.urgency,
    nextAction: parsed.nextAction.trim(),
    evidence,
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

// ─── Core pass (DB-agnostic, fully testable) ────────────────────────────────

export interface ResolverSource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  /** Open deals touched since `since`, oldest first, capped at `limit`. */
  scanCases(since: Date, limit: number): Promise<ResolverCase[]>;
  /** Last `limit` WhatsApp lines with this phone tail9, oldest first. */
  loadMessages(phoneTail: string, limit: number): Promise<ResolverMessage[]>;
  /** Last `limit` CallGear call events for this phone tail9, newest first. */
  loadCallEvents(phoneTail: string, limit: number): Promise<ResolverCallMeta[]>;
}

export interface ResolverDeps {
  /** The tenant's OWN Twenty deployment — routing happens in the runner. */
  client: TwentyClient;
  source: ResolverSource;
  /** One strict-JSON completion from the tenant's local model. */
  complete: (system: string, user: string) => Promise<string>;
  brandLine?: string | null;
}

export interface ResolverPassOptions {
  batch?: number;
  dryRun?: boolean;
  /** First-ever run looks back this far. */
  sinceDays?: number;
  /** Conversation/call context bounds. */
  messageLimit?: number;
  callLimit?: number;
}

export interface ResolverPassCounts {
  scanned: number;
  resolved: number;
  notesWritten: number;
  personsEnriched: number;
  opportunitiesEnriched: number;
  /** Rejected by the evidence/schema gate — never written. */
  skippedNoEvidence: number;
  /** A note with this title already exists — v1 does not update. */
  skippedExisting: number;
  /** No Twenty opportunity/person to attach to (unmirrored/platform-native). */
  skippedNoTarget: number;
  failed: number;
  firstError?: string;
}

const DEFAULT_BATCH = 25;
const DEFAULT_MESSAGE_LIMIT = 30;
const DEFAULT_CALL_LIMIT = 5;

function emptyPassCounts(): ResolverPassCounts {
  return {
    scanned: 0,
    resolved: 0,
    notesWritten: 0,
    personsEnriched: 0,
    opportunitiesEnriched: 0,
    skippedNoEvidence: 0,
    skippedExisting: 0,
    skippedNoTarget: 0,
    failed: 0,
  };
}

export async function runResolverPass(
  deps: ResolverDeps,
  opts: ResolverPassOptions = {}
): Promise<ResolverPassCounts> {
  const { client, source, complete } = deps;
  const dryRun = opts.dryRun ?? true;
  const batch = opts.batch ?? DEFAULT_BATCH;
  const counts = emptyPassCounts();

  const checkpoint = await source.loadCheckpoint();
  const since = checkpoint ?? new Date(Date.now() - (opts.sinceDays ?? 3) * 86_400_000);

  // Indexes ONCE per pass (mirror shape): note titles for idempotency, people
  // by phoneTail9 for the person target, opportunities by externalId for the
  // note target. Brand-scoped — Cardiwan and EasyRent share the rental
  // workspace AND share customers.
  const [noteTitles, peopleIndex, opportunityIndex] = await Promise.all([
    buildNoteTitleIndex(client),
    buildTwentyIndex(client, "people", deps.brandLine),
    buildTwentyIndex(client, "opportunities", deps.brandLine),
  ]);

  const cases = await source.scanCases(since, batch);

  for (const kase of cases) {
    counts.scanned++;

    // No Twenty key → the mirror never pushed this deal; there is no
    // opportunity to attach a note to. Not an error, just out of scope.
    if (!kase.scopedExternalId) {
      counts.skippedNoTarget++;
      continue;
    }
    const opportunityId = opportunityIndex.byExternalId.get(kase.scopedExternalId);
    if (!opportunityId) {
      counts.skippedNoTarget++;
      continue;
    }

    // Idempotency: the note title is the key. An existing note means this
    // case was resolved before — v1 does not update, so skip the model call
    // (and the person/car writes) entirely.
    const title = aiResolverNoteTitle(kase.scopedExternalId);
    if (noteTitles.has(title)) {
      counts.skippedExisting++;
      continue;
    }

    const tail = kase.phoneTail;
    const messages = tail
      ? await source.loadMessages(tail, opts.messageLimit ?? DEFAULT_MESSAGE_LIMIT)
      : [];
    // No conversation → nothing to quote → the evidence gate could never
    // pass. Skip without spending a model call.
    if (messages.length === 0) {
      counts.skippedNoEvidence++;
      continue;
    }
    const calls = tail ? await source.loadCallEvents(tail, opts.callLimit ?? DEFAULT_CALL_LIMIT) : [];

    const prompt = buildResolverPrompt(kase, messages, calls);

    // A model failure (timeout, endpoint down, garbage JSON connection) must
    // never kill the pass — this case counts failed, the next one proceeds.
    let content: string;
    try {
      content = await complete(prompt.system, prompt.user);
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `${kase.scopedExternalId}: ${(e as Error).message.slice(0, 160)}`;
      continue;
    }

    const result = parseResolverResult(content, prompt.sourceText);
    if (!result) {
      counts.skippedNoEvidence++;
      continue;
    }
    counts.resolved++;

    const personId = tail ? peopleIndex.byPhoneTail9.get(tail) : undefined;

    // ── Write 1: the resolution note on the opportunity (+ person when
    //    known). Same mechanics as the mirror's summary notes.
    const noteBody =
      `Intent: ${result.intent}\n` +
      `Language: ${result.language} · Urgency: ${result.urgency}\n` +
      (result.carInterest ? `Car interest: ${result.carInterest}\n` : "") +
      (result.budgetAed !== null ? `Budget: ${result.budgetAed} AED\n` : "") +
      `Next action: ${result.nextAction}\n\n` +
      `Evidence:\n${result.evidence.map((q) => `> ${q}`).join("\n")}`;
    try {
      if (!dryRun) {
        const created = await client.batchCreate("notes", [
          { title, bodyV2: { markdown: noteBody.slice(0, 8000), blocknote: null } },
        ]);
        const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
        if (typeof noteId !== "string") {
          throw new Error("note created without id in response");
        }
        await client.batchCreate("noteTargets", [
          { noteId, targetOpportunityId: opportunityId },
          ...(personId ? [{ noteId, targetPersonId: personId }] : []),
        ]);
      }
      noteTitles.add(title); // same-run dedupe; the set is rebuilt per pass
      counts.notesWritten++;
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `note/${kase.scopedExternalId}: ${(e as Error).message.slice(0, 160)}`;
      continue; // the enrichments below attach to the same case — skip together
    }

    // ── Write 2: person.languageSegment — ONLY a confident language onto an
    //    EMPTY field. A hand-set value is never overwritten, so the person's
    //    current record is read before patching (a GET is read-only — dry-run
    //    does it too so its counts match a real run).
    const segmentCode = LANGUAGE_SEGMENT_CODE[result.language];
    if (segmentCode && personId) {
      try {
        const person = await client.get<Record<string, Record<string, unknown>>>(`people/${personId}`);
        const current = (person?.data?.person ?? {}) as Record<string, unknown>;
        if (!current.languageSegment) {
          if (!dryRun) await client.patch(`people/${personId}`, { languageSegment: segmentCode });
          counts.personsEnriched++;
        }
      } catch (e) {
        counts.failed++;
        counts.firstError ??= `person/${kase.scopedExternalId}: ${(e as Error).message.slice(0, 160)}`;
      }
    }

    // ── Write 3: opportunity.carModels — only onto an EMPTY field.
    if (result.carInterest) {
      try {
        const opp = await client.get<Record<string, Record<string, unknown>>>(
          `opportunities/${opportunityId}`
        );
        const current = (opp?.data?.opportunity ?? {}) as Record<string, unknown>;
        if (!current.carModels) {
          if (!dryRun) await client.patch(`opportunities/${opportunityId}`, { carModels: result.carInterest });
          counts.opportunitiesEnriched++;
        }
      } catch (e) {
        counts.failed++;
        counts.firstError ??= `opp/${kase.scopedExternalId}: ${(e as Error).message.slice(0, 160)}`;
      }
    }
  }

  // Checkpoint advances past everything scanned — resolved, skipped AND
  // failed alike (the note-title idempotency is the retry mechanism for the
  // cases worth retrying; re-calling the model on a garbage case every poll
  // is just spend). Dry-run never moves it.
  const last = cases[cases.length - 1];
  if (!dryRun && last) await source.saveCheckpoint(last.touchedAt);

  return counts;
}

// ─── Local-model wiring ─────────────────────────────────────────────────────

/** The box default when the tenant row names no model (endpoint is never
 *  defaulted here — it always comes from ai_provider_config). */
const DEFAULT_RESOLVER_MODEL = "qwen3.5:9b-mlx";
/** One case may think for a while; the pass must not. */
const RESOLVER_MODEL_TIMEOUT_MS = 60_000;

/**
 * The per-tenant strict-JSON completer, resolved from ai_provider_config —
 * the same accessor the provider router uses. Returns null when the tenant
 * has no local provider configured (the runner skips such a tenant; it never
 * falls back to a hardcoded endpoint or another brand's model).
 */
export async function createLocalCompleter(
  tenantId: string
): Promise<((system: string, user: string) => Promise<string>) | null> {
  const cfg = await loadAIConfig(tenantId);
  if (!cfg || cfg.provider !== "local" || !cfg.localEndpoint) return null;
  const provider = new LocalProvider({
    baseURL: cfg.localEndpoint,
    model: cfg.localModel ?? DEFAULT_RESOLVER_MODEL,
    timeoutMs: RESOLVER_MODEL_TIMEOUT_MS,
  });
  return (system, user) => provider.completeJson(system, user);
}

/**
 * The DeepSeek SECOND-OPINION completer, keyed off the global DEEPSEEK_API_KEY
 * env (not per-tenant ai_provider_config — the second opinion is one shared
 * fallback, not a tenant's primary model). Returns null when the key is absent,
 * in which case the wa-lead-relay has no second opinion and the local judge's
 * own failure means skip, exactly as before.
 *
 * Unlike createLocalCompleter this is synchronous — it reads env only, no DB.
 */
export function createDeepseekCompleter(): ((system: string, user: string) => Promise<string>) | null {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!apiKey) return null;
  const provider = new DeepseekProvider({
    apiKey,
    timeoutMs: RESOLVER_MODEL_TIMEOUT_MS,
  });
  return (system, user) => provider.completeJson(system, user);
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "ai_resolver";

/**
 * The deal's "last actually touched" stamp. source_modified_at is Bitrix's
 * own DATE_MODIFY (a human touched it there); last_activity_at covers
 * imported rows; updated_at is the polluted fallback.
 */
const touchedAtExpr = sql`coalesce(${deal.sourceModifiedAt}, ${deal.lastActivityAt}, ${deal.updatedAt})`;

/** tail9 of a phone string, or null when it carries too few digits to trust. */
function tail9Of(phone: string | null | undefined): string | null {
  const digits = normalizePhone(phone);
  return digits.length >= MIN_PHONE_MATCH_DIGITS ? digits.slice(-MIN_PHONE_MATCH_DIGITS) : null;
}

/**
 * The case's matching key: the lead's phone tail9 when usable, else the
 * linked customer's (the easyrent deals' only path — deal.lead_id is NULL
 * there and deal.customer_id carries the Bitrix CONTACT link). Null when
 * neither side yields a trustworthy number.
 */
export function casePhoneTail(
  leadPhone: string | null | undefined,
  customerPhone: string | null | undefined
): string | null {
  return tail9Of(leadPhone) ?? tail9Of(customerPhone);
}

export function createDrizzleResolverSource(db: PlatformDb, tenantId: string): ResolverSource {
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

    async scanCases(since, limit) {
      const rows = await db
        .select({
          dealId: deal.id,
          externalId: deal.externalId,
          externalSource: deal.externalSource,
          stage: sql<string | null>`coalesce(${deal.stageDetail}, ${deal.stage})`,
          car: sql<string | null>`coalesce(${deal.vouchedCar}, ${deal.carModels})`,
          valueAed: deal.value,
          leadPhone: lead.phone,
          customerPhone: customer.phone,
          touchedAt: sql<Date>`${touchedAtExpr}`,
          tenantSlug: sql<string | null>`(select slug from tenant where id = ${deal.tenantId})`,
        })
        .from(deal)
        .leftJoin(lead, eq(deal.leadId, lead.id))
        // The easyrent/cardiwan deals link a Bitrix CONTACT, not a lead —
        // lead_id is NULL for nearly all of them (0067), so the customer
        // phone is the fallback path to a tail9.
        .leftJoin(customer, eq(deal.customerId, customer.id))
        .where(and(eq(deal.tenantId, tenantId), eq(deal.status, "open"), gt(touchedAtExpr, since)))
        .orderBy(asc(touchedAtExpr))
        .limit(limit);

      return rows.map((r) => {
        const line = brandLineForTenantSlug(r.tenantSlug);
        return {
          dealId: r.dealId,
          scopedExternalId:
            r.externalSource === "bitrix24" && r.externalId
              ? scopedDealExternalId(r.externalId, line)
              : null,
          phoneTail: casePhoneTail(r.leadPhone, r.customerPhone),
          stage: r.stage ?? null,
          car: r.car ?? null,
          valueAed: r.valueAed ?? null,
          touchedAt: new Date(r.touchedAt),
        };
      });
    },

    async loadMessages(phoneTail, limit) {
      // The customer number behind each message: inbound → the sender
      // (fromPn behind a @lid JID), outbound → the recipient. Same tail9
      // rule the WA→Twenty projector matches persons by.
      const res = await db.execute(sql`
        SELECT direction, customer_name, body, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND channel = 'whatsapp'
           AND body IS NOT NULL
           AND "from" NOT LIKE '%@g.us'
           AND right(
                 regexp_replace(
                   coalesce(
                     CASE WHEN direction = 'outbound' THEN "to" ELSE coalesce(from_pn, "from") END,
                     ''
                   ),
                   ${PG_NON_DIGIT_RE}, '', 'g'
                 ),
                 ${MIN_PHONE_MATCH_DIGITS}
               ) = ${phoneTail}
         ORDER BY created_at DESC
         LIMIT ${limit}
      `);
      const rows = (res as { rows?: Record<string, unknown>[] }).rows ?? [];
      // Newest-first out of SQL for the LIMIT, chronological for the prompt.
      return rows.reverse().map((r) => ({
        direction: String(r.direction ?? "inbound"),
        customerName: (r.customer_name as string | null) ?? null,
        body: String(r.body ?? ""),
        createdAt: new Date(r.created_at as string),
      }));
    },

    async loadCallEvents(phoneTail, limit) {
      const res = await db.execute(sql`
        SELECT raw_payload, received_at
          FROM integration_event
         WHERE tenant_id = ${tenantId}
           AND provider = 'callgear'
           AND (
             right(regexp_replace(coalesce(raw_payload #>> '{params,from}', ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${phoneTail}
             OR right(regexp_replace(coalesce(raw_payload #>> '{params,to}', ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${phoneTail}
           )
         ORDER BY received_at DESC
         LIMIT ${limit}
      `);
      const rows = (res as { rows?: Record<string, unknown>[] }).rows ?? [];
      return rows.map((r) => {
        const params = ((r.raw_payload as { params?: Record<string, unknown> } | null)?.params ??
          {}) as Record<string, unknown>;
        const agent = (params.agent as { name?: string } | null) ?? null;
        return {
          direction: typeof params.direction === "string" ? params.direction : null,
          durationSeconds: typeof params.duration === "number" ? params.duration : null,
          agentName: agent?.name ?? null,
          recordingUrl: typeof params.recordingUrl === "string" ? params.recordingUrl : null,
          at: new Date(r.received_at as string),
        };
      });
    },
  };
}
