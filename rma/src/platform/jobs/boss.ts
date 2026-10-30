import { config } from "dotenv";
config({ path: ".env.local" });

import { PgBoss } from "pg-boss";
import { log } from "@/platform/log";
import { QUEUE_DEFINITIONS } from "./queues";

// pg-boss needs a direct Postgres connection (no PgBouncer) for its own DDL
const directUrl =
  process.env.DATABASE_URL_DIRECT ||
  process.env.DATABASE_URL?.replace("-pooler", "") ||
  process.env.DATABASE_URL!;

export const boss = new PgBoss({
  connectionString: directUrl,
  schema: "pgboss", // NOT "pg_boss" — Postgres reserves pg_* prefixes
});

boss.on("error", (error) => {
  log.error("pg-boss error", { err: error });
});

let ensureQueuesPromise: Promise<void> | null = null;

/**
 * Create every queue this repo uses. MUST run after `boss.start()` and before
 * any `send()` / `work()` / `schedule()` call.
 *
 * pg-boss v10+ dropped implicit queue creation: `pgboss.queue` rows are real
 * and FK-referenced by `job.name`, `job.dead_letter` and `schedule.name`.
 * Without this, every `send()` throws `Queue <name> does not exist` and every
 * worker's fetch loop errors on each poll while the logs still say "started".
 *
 * `createQueue()` is idempotent (`ON CONFLICT DO NOTHING`) but, for that same
 * reason, it will NOT apply changed options to a queue that already exists —
 * so each queue is created and then updated, which is how edits to
 * `QUEUE_DEFINITIONS` reach an already-deployed database.
 *
 * Safe to call more than once: a SUCCESSFUL run is memoized per process.
 *
 * A failed one deliberately is not. Caching a rejected promise would make the
 * first transient failure permanent — every boot retry would get the same
 * rejection back instantly without touching the database, and
 * `enqueueBitrixDryRun` / `scheduleRecurringSync`, which also await this,
 * would stay broken until someone restarted the process by hand.
 */
export function ensureQueues(): Promise<void> {
  ensureQueuesPromise ??= createQueues().catch((err) => {
    ensureQueuesPromise = null;
    throw err;
  });
  return ensureQueuesPromise;
}

async function createQueues(): Promise<void> {
  // Order matters: `dlq` is first in QUEUE_DEFINITIONS because
  // `queue.dead_letter` is a foreign key onto `queue.name`.
  for (const { name, ...options } of QUEUE_DEFINITIONS) {
    try {
      await boss.createQueue(name, options);

      // `policy` and `partition` are immutable after creation and neither is
      // set here — everything else is reconciled on every boot.
      await boss.updateQueue(name, options);
    } catch (e) {
      // A queue we cannot create is a queue whose jobs silently vanish. Fail
      // loudly at boot rather than at 3am.
      log.error("failed to ensure pg-boss queue", { queue: name, err: e });
      throw e;
    }
  }

  log.info("pg-boss queues ensured", {
    queues: QUEUE_DEFINITIONS.map((q) => q.name),
  });
}
