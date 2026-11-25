/**
 * classify-inbox.ts
 *
 * pg-boss worker that turns recent inbound customer messages into `board_item`
 * cards for human triage. It is READ-ONLY from the customer's point of view:
 * it only writes internal platform state; no message is ever sent to a customer.
 *
 * Wiring:
 *   - Assumes a `message` table with at least:
 *       tenant_id, channel, customer_ref, customer_name, body, direction, created_at
 *   - Assumes a `tenant` table with an `id` column.
 *   - Calls the local MLX server over its OpenAI-compatible surface
 *     (default: http://127.0.0.1:8081/v1 — Qwen3.5-9B on the Studio).
 *   - Uses RLS via `SET LOCAL app.tenant_id = ...` in a per-tenant transaction.
 *
 * Env:
 *   DATABASE_URL
 *   LOCAL_AI_BASE_URL    default http://127.0.0.1:8081/v1  (MLX, OpenAI-compatible)
 *   LOCAL_AI_MODEL       default mlx-community/Qwen3.5-9B-4bit
 *   QWEN_BASE_URL        legacy FULL-URL override — set to
 *                        http://localhost:11434/api/chat (+ QWEN_MODEL) to roll
 *                        back to ollama; the /api/chat suffix selects the old
 *                        ollama-native request shape automatically.
 *   QWEN_MODEL           model override (wins over LOCAL_AI_MODEL)
 *   QWEN_API_KEY         optional
 *   QWEN_TIMEOUT_MS      default 120000 (local models are slow — be generous)
 *   CLASSIFY_MAX_TOKENS  default 4096 (MLX dialect: headroom for a thinking
 *                        model's reasoning pass) / 1024 on the ollama dialect
 *   BOARD_LOOKBACK_HOURS default 24
 *   DB_APP_ROLE          non-BYPASSRLS role to SET LOCAL ROLE to (see rls.ts)
 */

import { Pool } from "pg";
import type { PoolClient } from "pg";
import type { Job } from "pg-boss";
import { log } from "@/platform/log";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// This worker keeps its own pool, which shares the Postgres connection cap with
// the app pool (db/client.ts) and pg-boss — hence a small, explicit `max`.
const POOL = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Local/known network only. Remove or tighten for production.
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? true : false,
  max: Math.max(1, Number(process.env.BOARD_POOL_MAX ?? "4")),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// CRITICAL: pg emits 'error' on IDLE clients (network blip, failover, server
// closing the connection). An EventEmitter 'error' with no listener is an
// UNCAUGHT EXCEPTION — it would kill the worker process and every in-flight
// job. pg has already discarded the broken client by the time this fires.
POOL.on("error", (err) => {
  log.error("postgres idle client error", { pool: "classify-inbox", err });
});

// ─── Local-model endpoint (2026-08-22: ollama 9B → MLX 30B) ────────────────
// The Studio swapped its local tier from ollama (qwen3.5:9b-mlx on :11434) to
// mlx-lm serving Qwen3.5-9B-4bit at http://127.0.0.1:8081/v1. Every call
// the old code made lazily reloaded the 9B (~7-10 GB) on a box that needs the
// headroom. The endpoint is described by a DIALECT, derived from the URL:
//   ".../api/chat"  → ollama native (think:false body, message.content reply)
//   anything else   → OpenAI-compatible ({base}/chat/completions)
// so a rollback is exactly "set QWEN_BASE_URL + QWEN_MODEL to the old values".
export interface ClassifyEndpoint {
  url: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  dialect: "openai" | "ollama";
  maxTokens: number;
}

export const DEFAULT_LOCAL_AI_BASE_URL = "http://127.0.0.1:8081/v1";
export const DEFAULT_LOCAL_AI_MODEL = "mlx-community/Qwen3.5-9B-4bit";

// The 30B is a thinking model. mlx-lm (verified in 0.31.3 server source)
// honours per-request chat_template_kwargs {"enable_thinking": false} and
// reports reasoning in a SEPARATE `reasoning` field on the message — but a
// server that ignores the kwarg spends part of the budget on reasoning before
// content, so the openai dialect carries 4x the old num_predict headroom.
const MAX_TOKENS_BY_DIALECT = { openai: 4096, ollama: 1024 } as const;

export function resolveClassifyEndpoint(
  env: Record<string, string | undefined> = process.env
): ClassifyEndpoint {
  const base = (env.LOCAL_AI_BASE_URL?.trim() || DEFAULT_LOCAL_AI_BASE_URL).replace(/\/+$/, "");
  const url = env.QWEN_BASE_URL?.trim() || `${base}/chat/completions`;
  const model =
    env.QWEN_MODEL?.trim() || env.LOCAL_AI_MODEL?.trim() || DEFAULT_LOCAL_AI_MODEL;
  const dialect = url.endsWith("/api/chat") ? "ollama" : "openai";
  const maxTokens = Math.max(256, Number(env.CLASSIFY_MAX_TOKENS ?? MAX_TOKENS_BY_DIALECT[dialect]));
  // undici (node fetch) has NO total-response timeout by default: a wedged
  // local model would hold this worker forever while pg-boss expires the job
  // and starts a second copy. Generous by design — a cold model can take a
  // while.
  const timeoutMs = Math.max(1_000, Number(env.QWEN_TIMEOUT_MS ?? "120000"));
  return { url, model, apiKey: env.QWEN_API_KEY, timeoutMs, dialect, maxTokens };
}

const ENDPOINT = resolveClassifyEndpoint();

const LOOKBACK_HOURS = Math.max(1, Number(process.env.BOARD_LOOKBACK_HOURS ?? "24"));
const MAX_THREADS = Math.max(1, Number(process.env.BOARD_MAX_THREADS ?? "500"));

// Same as src/platform/tenancy/rls.ts: without switching to the non-bypass role
// the worker runs as the table owner, which on managed Postgres has BYPASSRLS —
// setting app.tenant_id alone would NOT enforce tenant isolation.
const APP_ROLE = process.env.DB_APP_ROLE?.trim() || null;
if (APP_ROLE && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(APP_ROLE)) {
  throw new Error(`Invalid DB_APP_ROLE: ${APP_ROLE}`);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BoardIntent = "booking" | "price" | "complaint" | "handover" | "payment" | "other";
export type BoardUrgency = "low" | "med" | "high";
export type BoardChannel = "whatsapp" | "instagram" | "telegram" | "call";

export type ClassifyResult = {
  summary: string;
  intent: BoardIntent;
  urgency: BoardUrgency;
  awaiting_reply: boolean;
  suggested_draft: string;
};

export type MessageThread = {
  tenant_id: string;
  channel: BoardChannel;
  customer_ref: string;
  customer_name: string | null;
  bodies: string[];
  last_seen: Date;
};

const INTENT_VALUES: BoardIntent[] = ["booking", "price", "complaint", "handover", "payment", "other"];
const URGENCY_VALUES: BoardUrgency[] = ["low", "med", "high"];
const CHANNEL_VALUES: BoardChannel[] = ["whatsapp", "instagram", "telegram", "call"];

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a triage assistant for a UAE car-rental CRM.
Read the inbound customer conversation below and return ONE JSON object with exactly these keys and no other text:

{
  "summary": "One-line English summary of what the customer wants.",
  "intent": "booking|price|complaint|handover|payment|other",
  "urgency": "low|med|high",
  "awaiting_reply": true or false,
  "suggested_draft": "A polite, concise reply draft in the SAME LANGUAGE as the customer; empty string if no reply is needed."
}

Rules:
- Respond ONLY with the JSON object. No markdown fences, no explanation, no apology.
- "intent" = booking if the customer asks to reserve/rent a specific car or dates.
- "intent" = price if they only ask for a price/quote.
- "intent" = complaint if they are unhappy, report a problem, or demand escalation.
- "intent" = handover if they ask about car delivery, pickup, or return.
- "intent" = payment if they ask how to pay, send a receipt, or discuss deposit.
- "urgency" = high for complaints, payment issues, or a customer ready to book TODAY.
- "urgency" = med for booking/price requests without a firm deadline.
- "urgency" = low for general info, thanks, or follow-ups that can wait.
- "awaiting_reply" = true unless the last message is clearly a closing statement that needs nothing back.
- Preserve exact car models, dates, prices, and phone numbers from the conversation.
- If you do not know availability or exact price, write "I will check and confirm" in the draft.
- Do not make promises the business cannot keep.`;

// ---------------------------------------------------------------------------
// Main worker
// ---------------------------------------------------------------------------
export default async function classifyInbox(job: Job<Record<string, unknown>>): Promise<void> {
  const jobId = job.id;
  log.info("classify-inbox starting", { jobId, lookbackHours: LOOKBACK_HOURS });

  const tenants = await getActiveTenants();
  if (tenants.length === 0) {
    log.warn("classify-inbox found no tenants", { jobId });
    return;
  }

  for (const tenantId of tenants) {
    const threads = await getThreadsNeedingClassification(tenantId);
    if (threads.length === 0) continue;

    // The LIMIT bound: threads beyond the cap are silently skipped this run, so
    // a permanent backlog would look like "the board just stops updating".
    if (threads.length >= MAX_THREADS) {
      log.warn("classify-inbox hit MAX_THREADS cap — older threads deferred to the next run", {
        jobId,
        tenantId,
        maxThreads: MAX_THREADS,
        hint: "raise BOARD_MAX_THREADS or shorten BOARD_LOOKBACK_HOURS",
      });
    }

    log.info("classify-inbox tenant batch", { jobId, tenantId, threads: threads.length });

    for (const thread of threads) {
      try {
        const { result, fallback } = await classifyThread(thread);
        await upsertBoardItem(tenantId, thread, result, fallback);
      } catch (err) {
        // Log per-thread and keep going. A single bad message/model response must
        // not block the rest of the queue.
        log.error("classify-inbox thread failed", {
          jobId,
          tenantId,
          customerRef: thread.customer_ref,
          err,
        });
      }
    }
  }

  log.info("classify-inbox done", { jobId });
}

// pg-boss registration helpers (use whichever shape your worker loader expects)
// Schedule example: boss.schedule("classify-inbox", "*/2 * * * *")
export const classifyInboxOptions = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
};

// ---------------------------------------------------------------------------
// Tenant-scoped reads
// ---------------------------------------------------------------------------
async function getActiveTenants(): Promise<string[]> {
  const client = await POOL.connect();
  try {
    // Cross-tenant lookup by design (which tenants exist) — like the auth/admin
    // lookups in rls.ts it intentionally stays on the owner connection. The
    // `tenant` table is not RLS-protected and has no tenant_id to scope by.
    // Adapt if your tenant table has a soft-delete / active flag.
    const res = await client.query<{ id: string }>(`SELECT id FROM tenant ORDER BY id`);
    return res.rows.map((r) => r.id);
  } finally {
    client.release();
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Open a transaction with the tenant RLS context applied, exactly like
 * `withTenant` in src/platform/tenancy/rls.ts: role FIRST (so RLS is actually
 * enforced), then the tenant GUC. `SET LOCAL` cannot be parameterized, hence
 * the strict UUID / identifier validation.
 */
async function beginTenantTx(client: PoolClient, tenantId: string): Promise<void> {
  if (!UUID_RE.test(tenantId)) throw new Error("Invalid tenantId format");
  await client.query("BEGIN");
  if (APP_ROLE) await client.query(`SET LOCAL ROLE "${APP_ROLE}"`);
  await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
}

async function getThreadsNeedingClassification(tenantId: string): Promise<MessageThread[]> {
  const client = await POOL.connect();
  try {
    await beginTenantTx(client, tenantId);

    // Only reclassify a thread if its newest inbound message is newer than the
    // existing open board_item. This protects human edits from being overwritten
    // until new customer activity arrives.
    const res = await client.query<MessageThread>(
      `
      WITH threads AS (
        SELECT
          m.tenant_id,
          m.channel,
          m."from" AS customer_ref,
          MAX(m.customer_name) AS customer_name,
          ARRAY_AGG(m.body ORDER BY m.created_at)
            FILTER (WHERE m.body IS NOT NULL) AS bodies,
          MAX(m.created_at) AS last_seen
        FROM message m
        WHERE m.direction = 'inbound'
          AND m.created_at > now() - make_interval(hours => $1)
          AND m.channel IN ('whatsapp', 'instagram', 'telegram', 'call')
          AND m.tenant_id = current_setting('app.tenant_id', true)::uuid
          AND m."from" NOT LIKE '%@g.us'
        GROUP BY m.tenant_id, m.channel, m."from"
      )
      SELECT
        t.tenant_id,
        t.channel,
        t.customer_ref,
        t.customer_name,
        t.bodies,
        t.last_seen
      FROM threads t
      LEFT JOIN board_item b
        ON b.tenant_id = t.tenant_id
        AND b.customer_ref = t.customer_ref
        AND b.status = 'open'
      WHERE b.id IS NULL
         OR t.last_seen > b.updated_at
      ORDER BY t.last_seen DESC
      LIMIT $2
      `,
      [LOOKBACK_HOURS, MAX_THREADS]
    );

    await client.query("COMMIT");

    return res.rows.map((r) => ({
      ...r,
      channel: normalizeChannel(r.channel),
      bodies: r.bodies ?? [],
    }));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function normalizeChannel(raw: string): BoardChannel {
  if (CHANNEL_VALUES.includes(raw as BoardChannel)) return raw as BoardChannel;
  return "whatsapp";
}

// ---------------------------------------------------------------------------
// Qwen classification
// ---------------------------------------------------------------------------

type ChatMessage = { role: "system" | "user"; content: string };

/** Request body in the endpoint's dialect (exported for tests). */
export function buildChatRequestBody(
  endpoint: ClassifyEndpoint,
  messages: ChatMessage[]
): Record<string, unknown> {
  if (endpoint.dialect === "ollama") {
    return {
      model: endpoint.model,
      messages,
      stream: false,
      think: false, // ollama-native flag — disables qwen3.5's endless reasoning so we get the JSON
      options: { temperature: 0, num_predict: endpoint.maxTokens },
    };
  }
  return {
    model: endpoint.model,
    messages,
    stream: false,
    temperature: 0,
    max_tokens: endpoint.maxTokens,
    response_format: { type: "json_object" }, // mlx-lm ignores it; the prompt + parser carry the contract
    // Verified against mlx-lm 0.31.3 server source: chat_template_kwargs is
    // read from the body and passed to apply_chat_template — its own CLI help
    // cites '{"enable_thinking":false}'. A server that ignores the field is
    // still safe: the parser tolerates the separate `reasoning` field and
    // maxTokens has 4x headroom.
    chat_template_kwargs: { enable_thinking: false },
  };
}

/**
 * Pull the assistant text out of a response in the endpoint's dialect
 * (exported for tests). A thinking model may emit a long `reasoning` (or
 * `reasoning_content`) field BEFORE `content` — the JSON answer is always in
 * `content` alone, and any inline <think>…</think> remnant is stripped.
 */
export function extractChatContent(endpoint: ClassifyEndpoint, data: unknown): string {
  const d = data as {
    message?: { content?: string };
    choices?: { message?: { content?: string | null; reasoning?: string; reasoning_content?: string } }[];
    error?: string;
  };
  let raw: string;
  if (endpoint.dialect === "ollama") {
    raw = d.message?.content ?? "";
  } else {
    const msg = d.choices?.[0]?.message;
    raw = typeof msg?.content === "string" ? msg.content : "";
    if (!raw && (msg?.reasoning || msg?.reasoning_content)) {
      // The model spent the WHOLE budget reasoning and never produced an
      // answer — name it precisely so ops raises CLASSIFY_MAX_TOKENS instead
      // of chasing a "broken JSON" ghost.
      throw new Error("model returned only reasoning, no content (raise CLASSIFY_MAX_TOKENS)");
    }
  }
  return raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, "").trim();
}

/** Exported for unit tests — the worker calls it with the env-resolved default. */
export async function classifyThread(
  thread: MessageThread,
  endpoint: ClassifyEndpoint = ENDPOINT
): Promise<{ result: ClassifyResult; fallback: boolean }> {
  const conversation = thread.bodies
    .slice(-15) // cap to the last 15 messages so prompts stay small + fast
    .map((b, i) => `${i + 1}. ${b.trim()}`)
    .join("\n");

  const userContent = `Customer: ${thread.customer_name ?? thread.customer_ref}\nChannel: ${thread.channel}\n\nConversation:\n${conversation}\n\nReturn JSON only.`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (endpoint.apiKey) headers["Authorization"] = `Bearer ${endpoint.apiKey}`;

  const attempt = async (): Promise<Response> => {
    try {
      return await fetch(endpoint.url, {
        method: "POST",
        headers,
        body: JSON.stringify(
          buildChatRequestBody(endpoint, [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ])
        ),
        // Bound the whole request/response: without this a wedged model pins the
        // worker until pg-boss expires the job and runs a duplicate copy.
        signal: AbortSignal.timeout(endpoint.timeoutMs),
      });
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error(`Qwen timed out after ${endpoint.timeoutMs}ms`, { cause: err });
      }
      throw err;
    }
  };

  // One immediate retry absorbs a brief MLX outage (watchdog kickstart or the
  // nightly prophylactic bounce): the server is usually back within seconds,
  // while failing straight through defers the thread to the next beat for no
  // reason (owner 2026-08-24: "reduce the abrupt ones"). HTTP errors are NOT
  // retried — a 4xx/5xx will not heal in five seconds.
  let res: Response;
  try {
    res = await attempt();
  } catch {
    await new Promise((r) => setTimeout(r, 5_000));
    res = await attempt();
  }

  if (!res.ok) {
    throw new Error(`Qwen HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const rawText = extractChatContent(endpoint, data);
  if (!rawText) {
    throw new Error("Qwen returned empty content");
  }

  try {
    return { result: parseClassifyResult(rawText), fallback: false };
  } catch (err) {
    // Two different problems, same safe outcome (preserve the existing card) —
    // but ops needs to tell them apart: unparseable output usually means the
    // model ignored the format rules, a degenerate reply usually means the
    // model/context is broken (empty JSON is "valid" and would otherwise be
    // written to the board as a real classification).
    const degenerate = err instanceof DegenerateReplyError;
    log.warn(
      degenerate
        ? "classify-inbox: model returned semantically empty JSON, using fallback"
        : "classify-inbox: model returned non-JSON, using fallback",
      {
        tenantId: thread.tenant_id,
        customerRef: thread.customer_ref,
        cause: degenerate ? "degenerate-json" : "unparseable",
        reason: degenerate ? err.reason : undefined,
        rawPreview: rawText.slice(0, 200),
        err,
      }
    );
    return { result: fallbackResult(), fallback: true };
  }
}

/**
 * Valid JSON that carries no triage information — `{}`, or every field blank.
 * `parseClassifyResult` COERCES missing fields to defaults, so without this a
 * degenerate reply would look like a successful classification and the full
 * DO UPDATE arm would overwrite a real (possibly human-edited) card with
 * "(no summary)" / other / med / empty draft, and drop it out of the
 * "needs reply" queue via awaiting_reply=false. Thrown so it takes the SAME
 * preserve-the-existing-card path as a parse failure; distinct type so the
 * caller can log it as the different problem it is.
 */
class DegenerateReplyError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Model returned semantically empty JSON (${reason})`);
    this.name = "DegenerateReplyError";
    this.reason = reason;
  }
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

/**
 * Informativeness check (not parseability): a card is only worth writing if the
 * model said what the customer wants. Returns a short reason for the log, or
 * null when the reply carries real information.
 */
function degenerateReason(parsed: Record<string, unknown>): string | null {
  // The summary IS the card: without it there is nothing for a human to act
  // on, and the coerced placeholder ("(no summary)") is worse than leaving the
  // previous card alone.
  //
  // A summary with no intent/urgency is NOT degenerate. Those two coerce to
  // sensible defaults (other/med) and are a sorting aid; throwing away a real
  // summary and a ready-to-send draft because the model omitted two enum
  // fields discards far more than it protects.
  if (isBlank(parsed.summary)) return "blank summary";
  return null;
}

/** Exported for unit tests only — not part of the worker's public surface. */
export function parseClassifyResult(raw: string): ClassifyResult {
  const cleaned = raw.replace(/^\uFEFF/, "").trim();

  // Strip markdown fences if the model ignored the "no markdown" rule.
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  const payload = fenced ? fenced[1].trim() : cleaned;

  const firstBrace = payload.indexOf("{");
  const lastBrace = payload.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object found in model output");
  }

  const parsed = JSON.parse(payload.slice(firstBrace, lastBrace + 1));

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model output is not an object");
  }

  const degenerate = degenerateReason(parsed as Record<string, unknown>);
  if (degenerate) throw new DegenerateReplyError(degenerate);

  const intent = String(parsed.intent ?? "").toLowerCase();
  const urgency = String(parsed.urgency ?? "").toLowerCase();

  return {
    summary: String(parsed.summary ?? "").trim() || "(no summary)",
    intent: INTENT_VALUES.includes(intent as BoardIntent)
      ? (intent as BoardIntent)
      : "other",
    urgency: URGENCY_VALUES.includes(urgency as BoardUrgency)
      ? (urgency as BoardUrgency)
      : "med",
    // Absent key means the model didn't say, which is not the same as "no
    // reply needed". Defaulting to false there would silently drop a customer
    // out of the needs-reply queue; a card wrongly left in it costs a glance.
    awaiting_reply:
      parsed.awaiting_reply === undefined ? true : parseBool(parsed.awaiting_reply),
    suggested_draft: String(parsed.suggested_draft ?? "").trim(),
  };
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(t)) return true;
    if (["false", "no", "0"].includes(t)) return false;
  }
  return false;
}

/**
 * Placeholder used ONLY when there is no existing card to protect — see
 * `upsertBoardItem`, which refuses to overwrite good triage data with this.
 */
function fallbackResult(): ClassifyResult {
  return {
    summary: "AI could not parse the conversation — please review manually.",
    intent: "other",
    urgency: "med",
    awaiting_reply: true,
    suggested_draft: "",
  };
}

// ---------------------------------------------------------------------------
// Upsert board_item under RLS
// ---------------------------------------------------------------------------
async function upsertBoardItem(
  tenantId: string,
  thread: MessageThread,
  result: ClassifyResult,
  fallback = false
): Promise<void> {
  // A fallback result carries no information — it is the "AI could not parse"
  // placeholder, used both for unparseable output and for JSON with nothing in
  // it. Writing it over an existing open card would destroy a good summary /
  // intent / urgency / draft (possibly human-edited) because of one bad model
  // response. So on fallback we only refresh the factual columns.
  //
  // RETRY, DON'T FREEZE: the fallback arm deliberately does NOT bump updated_at
  // (and a fallback INSERT backdates it, see `insertUpdatedAt`). Both keep
  // `t.last_seen > b.updated_at` true, so the NEXT run retries the thread —
  // previously a single transient model glitch froze that card's triage on the
  // placeholder until fresh inbound activity happened to arrive, which for a
  // freshly inserted card meant it never got a real summary or draft at all.
  // The retry loop is self-limiting: a successful classification, or any human
  // touch (approve / dismiss / assign / edit draft — all bump updated_at), ends
  // it, as does the thread ageing out of BOARD_LOOKBACK_HOURS. Cost: a
  // permanently unclassifiable thread is re-sent to the model once per run,
  // logged at warn each time.
  const updateSet = fallback
    ? `
        channel          = EXCLUDED.channel,
        customer_name    = COALESCE(EXCLUDED.customer_name, board_item.customer_name),
        -- The thread only got here because new inbound activity arrived, so it
        -- needs a human either way; urgency/SLA are left as previously judged.
        awaiting_reply   = true`
    : `
        channel          = EXCLUDED.channel,
        customer_name    = COALESCE(EXCLUDED.customer_name, board_item.customer_name),
        summary          = EXCLUDED.summary,
        intent           = EXCLUDED.intent,
        urgency          = EXCLUDED.urgency,
        awaiting_reply   = EXCLUDED.awaiting_reply,
        suggested_draft  = EXCLUDED.suggested_draft,
        sla_due_at       = CASE EXCLUDED.urgency::text
          WHEN 'high' THEN board_item.first_seen_at + interval '1 hour'
          WHEN 'low'  THEN board_item.first_seen_at + interval '24 hours'
          ELSE board_item.first_seen_at + interval '4 hours'
        END,
        updated_at       = now()`;

  // A fallback INSERT creates a card made only of placeholder text, so there is
  // nothing to protect and everything to gain from retrying it: backdate
  // updated_at to just before the thread's newest inbound message so the next
  // run picks it up again (COALESCE guards the NOT NULL column if last_seen is
  // ever missing). A real classification stamps now() as usual.
  const insertUpdatedAt = fallback
    ? `COALESCE($10::timestamptz, now()) - interval '1 second'`
    : `now()`;

  const baseParams = [
    tenantId,
    thread.channel,
    thread.customer_ref,
    thread.customer_name,
    result.summary,
    result.intent,
    result.urgency,
    result.awaiting_reply,
    result.suggested_draft,
  ];

  const client = await POOL.connect();
  try {
    await beginTenantTx(client, tenantId);

    const upsert = await client.query<{ id: string; inserted: boolean }>(
      `
      INSERT INTO board_item (
        tenant_id, channel, customer_ref, customer_name,
        summary, intent, urgency, awaiting_reply, suggested_draft,
        status, first_seen_at, sla_due_at, created_at, updated_at
      ) VALUES (
        $1, $2::board_channel, $3, $4,
        $5, $6::board_intent, $7::board_urgency, $8, $9,
        'open', now(),
        now() + CASE $7::text
          WHEN 'high' THEN interval '1 hour'
          WHEN 'low'  THEN interval '24 hours'
          ELSE interval '4 hours'
        END,
        now(), ${insertUpdatedAt}
      )
      ON CONFLICT (tenant_id, customer_ref) WHERE status = 'open'
      DO UPDATE SET${updateSet}
      -- Defence in depth: never let the UPDATE arm touch another tenant's row,
      -- even if RLS is not enforced (owner role / DB_APP_ROLE unset).
      WHERE board_item.tenant_id = $1::uuid
      RETURNING id, (xmax = 0) AS inserted
      `,
      // $10 is only referenced by the fallback INSERT — sending it otherwise
      // would be a bind-parameter count mismatch.
      fallback ? [...baseParams, thread.last_seen] : baseParams
    );

    await client.query("COMMIT");

    const row = upsert.rows[0];
    log.info("classify-inbox board_item upserted", {
      tenantId,
      action: row?.inserted ? "inserted" : "updated",
      boardItemId: row?.id,
      customerRef: thread.customer_ref,
      fallback,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
