// Canonical pg-boss queue registry.
//
// pg-boss v10+ requires every queue to exist in `pgboss.queue` BEFORE it can be
// used: `send()`, `schedule()` and the `work()` fetch loop all resolve the queue
// through `manager.getQueueCache(name)`, which throws
// `Queue <name> does not exist`. A worker registered against a missing queue
// looks healthy in the logs and silently errors on every poll.
//
// So: one place lists every queue this repo touches, and `ensureQueues()`
// (src/platform/jobs/boss.ts) creates them at boot.
//
// This module deliberately imports nothing — boss.ts imports it, and the job
// modules import their names from here, so there is no import cycle.

import type { Queue } from "pg-boss";

/** Dead-letter queue. Every other queue drains its exhausted jobs here. */
export const DLQ_QUEUE = "dlq";

/** Bitrix24 full sync (contacts / leads / deals) — see sync-jobs.ts. */
export const BITRIX_SYNC_QUEUE = "bitrix.sync.all";

/** Kaiten board card sync — see sync-jobs.ts. */
export const KAITEN_SYNC_QUEUE = "kaiten.sync.cards";

/** Bitrix24 dry-run crawl, one job per entity — see bitrix-discovery.ts. */
export const BITRIX_DISCOVERY_QUEUE = "bitrix-discovery";

/** Twenty CRM sync (schema bootstrap / record push) — see integrations/twenty/. */
export const TWENTY_SYNC_QUEUE = "twenty.sync.all";

/** Smoke-test queue — see hello-job.ts / scripts/test-pg-boss.ts. */
export const HELLO_QUEUE = "hello-tenant-job";

export type QueueDefinition = Omit<Queue, "name"> & { name: string };

// Common retention: keep the job row around long enough to debug a failure.
const KEEP_COMPLETED_7D = 7 * 24 * 60 * 60;
const KEEP_COMPLETED_30D = 30 * 24 * 60 * 60;

/**
 * Every queue used in this repo, in creation order.
 *
 * `dlq` MUST come first: `queue.dead_letter` is a foreign key onto
 * `queue.name`, and `createQueue()` resolves `options.deadLetter` through the
 * queue cache before inserting.
 */
export const QUEUE_DEFINITIONS: readonly QueueDefinition[] = [
  {
    // The dead letter queue itself. No `deadLetter` (a queue may not reference
    // itself) and no retries — the dlq worker only logs/reports, so a retry
    // would just duplicate the alert.
    name: DLQ_QUEUE,
    retryLimit: 0,
    expireInSeconds: 120,
    // Dead letters are the forensic record of what broke; keep them a month.
    deleteAfterSeconds: KEEP_COMPLETED_30D,
  },
  {
    // Bitrix24 sync: paged HTTP crawl + writes. Slow but bounded; the remote
    // API is the usual failure, so back off aggressively between retries.
    name: BITRIX_SYNC_QUEUE,
    retryLimit: 4,
    retryDelay: 60,
    retryBackoff: true,
    retryDelayMax: 3600,
    expireInSeconds: 1800, // 30 min
    heartbeatSeconds: 120,
    deleteAfterSeconds: KEEP_COMPLETED_7D,
    deadLetter: DLQ_QUEUE,
  },
  {
    // Kaiten sync: same shape as Bitrix, smaller payloads.
    name: KAITEN_SYNC_QUEUE,
    retryLimit: 4,
    retryDelay: 60,
    retryBackoff: true,
    retryDelayMax: 3600,
    expireInSeconds: 1800, // 30 min
    heartbeatSeconds: 120,
    deleteAfterSeconds: KEEP_COMPLETED_7D,
    deadLetter: DLQ_QUEUE,
  },
  {
    // Bitrix discovery (dry run): a full-tenant crawl rate-limited to ~1.5
    // req/s, so it routinely runs far past pg-boss' 900s default. If it
    // expires mid-crawl pg-boss retries it while the original handler is still
    // running — two crawlers writing the same integration_event rows.
    //
    // Give it 2h, and pair that with a heartbeat so a genuinely dead worker is
    // still detected in ~2 min instead of ~2 h. `heartbeatSeconds` is refreshed
    // automatically by pg-boss' worker loop (manager.#processJobs touches the
    // job every heartbeatSeconds/2) — handlers need no change.
    name: BITRIX_DISCOVERY_QUEUE,
    retryLimit: 3,
    retryDelay: 120,
    retryBackoff: true,
    retryDelayMax: 1800,
    expireInSeconds: 7200, // 2 h (pg-boss caps expiry at <24 h)
    heartbeatSeconds: 120,
    deleteAfterSeconds: KEEP_COMPLETED_7D,
    deadLetter: DLQ_QUEUE,
  },
  {
    // Twenty CRM sync: same shape as Kaiten — HTTP crawl + writes against a
    // LAN-local self-hosted instance, the remote API is the usual failure.
    name: TWENTY_SYNC_QUEUE,
    retryLimit: 4,
    retryDelay: 60,
    retryBackoff: true,
    retryDelayMax: 3600,
    expireInSeconds: 1800, // 30 min
    heartbeatSeconds: 120,
    deleteAfterSeconds: KEEP_COMPLETED_7D,
    deadLetter: DLQ_QUEUE,
  },
  {
    // Smoke test: counts leads. Should never take more than a moment.
    name: HELLO_QUEUE,
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 120,
    deleteAfterSeconds: KEEP_COMPLETED_7D,
    deadLetter: DLQ_QUEUE,
  },
];
