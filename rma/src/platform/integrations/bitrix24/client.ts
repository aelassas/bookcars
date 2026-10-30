// Bitrix24 REST API client via incoming webhook.
// https://training.bitrix24.com/rest_help/js_library/rest/callMethod.php
import { assertReadOnlyMethod } from "../readonly";
import { BITRIX_DISCOVERY_QUEUE, BITRIX_SYNC_QUEUE, QUEUE_DEFINITIONS } from "../../jobs/queues";

// Node's fetch (undici) has NO total-response timeout: a portal that accepts
// the socket and then never answers pins the caller forever. This client runs
// inside pg-boss workers, so "forever" means the job outlives its
// `expireInSeconds`, pg-boss re-queues it, and a SECOND crawler starts against
// the same portal. Every request is therefore bounded.
//
// 60s: Bitrix trips its own OPERATION_TIME_LIMIT well before this, and a
// 50-row ID-cursor page normally answers in a few seconds. 60s reads as
// "portal degraded but alive"; past it the socket is wedged.
const REQUEST_TIMEOUT_MS = 60_000;

// Wall-clock ceiling for ONE call() including its retries. pg-boss fails an
// active job at `started_on + expire_seconds` (plans.failJobsByTimeout) —
// heartbeats do NOT extend that, they only kill sooner — so a retry budget
// above the queue expiry guarantees duplicate crawlers. Derived from the queue
// registry so the two can never drift apart.
const BITRIX_QUEUE_NAMES: readonly string[] = [BITRIX_SYNC_QUEUE, BITRIX_DISCOVERY_QUEUE];
const QUEUE_EXPIRIES_MS = QUEUE_DEFINITIONS.filter((q) => BITRIX_QUEUE_NAMES.includes(q.name)).map(
  (q) => (q.expireInSeconds ?? 900) * 1000
);
const TIGHTEST_EXPIRY_MS = QUEUE_EXPIRIES_MS.length ? Math.min(...QUEUE_EXPIRIES_MS) : 1_800_000;
// How long a single listAll crawl may spend before it stops waiting out
// throttling and fails instead. Ten minutes of the tightest (30 min) job
// expiry is left over for the DB writes that follow the last page.
//
// Past this point a throttled page throws rather than backing off again.
// pg-boss then retries the whole job on its own schedule, which is the safe
// outcome: overrunning `expireInSeconds` would have pg-boss start a second
// crawler against the same portal while this one is still writing.
const RETRY_BUDGET_MS = TIGHTEST_EXPIRY_MS - 600_000;

// AbortSignal.timeout() rejects with a DOMException named "TimeoutError";
// a caller-supplied abort surfaces as "AbortError".
function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

export interface Bitrix24Client {
  call<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }>;
  /**
   * Sanctioned WRITE call — bypasses the SOURCE_READ_ONLY guard that `call`
   * enforces. This is the single deliberate write path back to Bitrix (used by
   * the two-way kanban stage move). Every other outbound call must go through
   * `call`, which stays read-only. Callers gate this on their own feature flag.
   */
  callWrite<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }>;
  listAll<T>(method: string, params?: Record<string, unknown>, pageSize?: number): AsyncGenerator<T, void, unknown>;
  countRecords(method: string, params?: Record<string, unknown>): Promise<number>;
}

function buildUrl(webhookBase: string, method: string): string {
  const base = webhookBase.replace(/\/$/, "");
  return `${base}/${method}.json`;
}

export function createBitrix24Client(webhookUrl: string): Bitrix24Client {
  if (!webhookUrl) {
    throw new Error(
      "Bitrix24 webhook URL is required. " +
        "Format: https://portal.bitrix24.com/rest/USER_ID/WEBHOOK_TOKEN/"
    );
  }

  async function rawCall<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }> {
    const url = buildUrl(webhookUrl, method);
    const body = params ? JSON.stringify(params) : undefined;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
        // Bounds headers AND body read — undici aborts the whole exchange.
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(`Bitrix24 ${method} HTTP ${res.status}: ${await res.text()}`);
      }

      return await res.json();
    } catch (err) {
      if (isAbort(err)) {
        // Deliberately no URL in the message — the webhook path IS the secret.
        throw new Error(`Bitrix24 ${method} timed out after ${REQUEST_TIMEOUT_MS}ms`, { cause: err });
      }
      throw err;
    }
  }

  async function call<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }> {
    assertReadOnlyMethod(method); // SOURCE_READ_ONLY: block any Bitrix write
    return rawCall<T>(method, params);
  }

  // Sanctioned write path — intentionally does NOT run assertReadOnlyMethod.
  async function callWrite<T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ): Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }> {
    return rawCall<T>(method, params);
  }

  // ID-cursor pagination (filter[>ID] + order[ID]=ASC + start=-1) instead of offset paging.
  // start=-1 tells Bitrix NOT to compute the total row count — the expensive count-and-skip on
  // large offsets is what trips OPERATION_TIME_LIMIT. Each page is now constant-cost. We also
  // pace ~2 req/s and back off if Bitrix still throttles. Read-only; safe to resume.
  async function* listAll<T>(
    method: string,
    params?: Record<string, unknown>,
    pageSize = 50
  ): AsyncGenerator<T, void, unknown> {
    const baseFilter = (params?.filter as Record<string, unknown> | undefined) ?? {};
    let lastId = 0;

    // One deadline for the WHOLE crawl, not per page. pg-boss fails an active
    // job at `started_on + expire_seconds` regardless of heartbeats, so a
    // budget that reset each page would let a long crawl that starts throttling
    // late overrun the job expiry — and pg-boss would then re-queue it while
    // this handler is still running, which is precisely the duplicate crawler
    // this budget exists to prevent.
    const deadline = Date.now() + RETRY_BUDGET_MS;

    while (true) {
      let res: Awaited<ReturnType<typeof call>> | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          res = await call<{ items?: T[] } & T[]>(method, {
            ...params,
            filter: { ...baseFilter, ">ID": lastId },
            order: { ID: "ASC" },
            start: -1,
          });
          if (res.error) throw new Error(`${res.error}: ${res.error_description ?? ""}`);
          break;
        } catch (e) {
          const msg = String(e);
          const throttled =
            msg.includes("OPERATION_TIME_LIMIT") ||
            msg.includes("QUERY_LIMIT") ||
            msg.includes("HTTP 429") ||
            msg.includes("HTTP 503");
          // A per-request timeout means the portal hung, not that the call is
          // invalid — same class of failure as a 429/503, so it gets the same
          // backoff instead of failing the whole crawl on one wedged socket.
          const timedOut = msg.includes("timed out after");
          const backoffMs = 30_000 * (attempt + 1); // 30s,60s,90s… backoff
          if (
            (throttled || timedOut) &&
            attempt < 6 &&
            Date.now() + backoffMs + REQUEST_TIMEOUT_MS <= deadline
          ) {
            await new Promise((r) => setTimeout(r, backoffMs));
            continue;
          }
          throw e;
        }
      }

      const items: T[] = Array.isArray(res!.result)
        ? (res!.result as T[])
        : ((res!.result as unknown as { items?: T[] })?.items ?? []);

      if (items.length === 0) break;
      for (const item of items) {
        yield item;
      }

      const last = items[items.length - 1] as unknown as { ID?: string | number };
      const nextId = Number(last?.ID ?? 0);
      if (!Number.isFinite(nextId) || nextId <= lastId) break; // safety: cursor must advance
      lastId = nextId;

      if (items.length < pageSize) break;
      await new Promise((r) => setTimeout(r, 500)); // pace ~2 req/s
    }
  }

  async function countRecords(method: string, params?: Record<string, unknown>): Promise<number> {
    const res = await call<unknown[]>(method, { ...params, limit: 1 });
    return res.total ?? 0;
  }

  return { call, callWrite, listAll, countRecords };
}

// ─── Legacy global-env client (for standalone scripts) ───────────────────────

const WEBHOOK_BASE = process.env.BITRIX24_WEBHOOK_URL ?? "";
let _globalClient: Bitrix24Client | undefined;

function getGlobalClient(): Bitrix24Client {
  if (!_globalClient) {
    if (!WEBHOOK_BASE) {
      throw new Error("BITRIX24_WEBHOOK_URL is not set.");
    }
    _globalClient = createBitrix24Client(WEBHOOK_BASE);
  }
  return _globalClient;
}

export const callBitrix24: Bitrix24Client["call"] = (...args) => getGlobalClient().call(...args);
export const listAll: Bitrix24Client["listAll"] = (...args) => getGlobalClient().listAll(...args);
export const countRecords: Bitrix24Client["countRecords"] = (...args) =>
  getGlobalClient().countRecords(...args);
