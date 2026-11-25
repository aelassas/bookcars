import { boss, ensureQueues } from "./boss";
import { createTenantJob } from "./withTenant";
import { startDlqWorker } from "./dlq";
import { BITRIX_SYNC_QUEUE, DLQ_QUEUE, KAITEN_SYNC_QUEUE, TWENTY_SYNC_QUEUE } from "./queues";
import { tenant, integrationConnection } from "@/platform/db/schema";
import { eq, and } from "drizzle-orm";
import { syncBitrix24 } from "@/platform/integrations/bitrix24/sync";
import { syncKaitenBoard } from "@/platform/integrations/kaiten/sync";
import { mirrorBitrixToTwenty } from "@/platform/integrations/twenty/mirror";
import { log } from "@/platform/log";

// Re-exported for back-compat; the canonical names live in ./queues.
export { BITRIX_SYNC_QUEUE, KAITEN_SYNC_QUEUE };

// ─── Workers ────────────────────────────────────────────────────────────────

// Registration has to be idempotent PER QUEUE, not per batch.
//
// pg-boss v12 keys its worker registry by a random id minted inside work()
// (`this.workers.set(worker.id, worker)` in dist/manager.js), not by queue name,
// so a second work() call for the same queue in the same process is accepted and
// gives that queue two independent pollers — every dead letter would be logged
// twice and page Sentry twice. instrumentation.ts only flips
// `syncWorkersStarted` after ALL of the registrations below resolve, so if one
// rejects the boot retry re-runs this whole function; without this map the
// registrations that had already succeeded would be repeated.
const startedWorkers = new Map<string, Promise<string>>();

/**
 * Register `queue`'s worker once per process. A rejected registration is NOT
 * memoized, so the boot retry re-attempts exactly the queues that failed.
 */
function registerWorker(queue: string, start: () => Promise<string>): Promise<string> {
  const existing = startedWorkers.get(queue);
  if (existing) return existing;

  const started = Promise.resolve()
    .then(start)
    .catch((err) => {
      startedWorkers.delete(queue);
      throw err;
    });

  startedWorkers.set(queue, started);
  return started;
}

export async function startSyncWorkers() {
  // pg-boss v10+ refuses to send to or poll a queue that does not exist in
  // `pgboss.queue`, so every queue in the repo is created here — this is the
  // first thing instrumentation.ts runs after `boss.start()`, before any other
  // worker registers.
  await ensureQueues();

  const workers: Promise<unknown>[] = [];

  // Surface anything that exhausted its retries.
  workers.push(registerWorker(DLQ_QUEUE, () => startDlqWorker()));

  // Bitrix24: sync all entities (contacts, leads, deals)
  workers.push(
    registerWorker(BITRIX_SYNC_QUEUE, () =>
      createTenantJob<{ tenantId: string }>(BITRIX_SYNC_QUEUE, async ({ data, tx }) => {
        // All DB work runs on `tx` — the connection where the job's
        // `SET LOCAL app.tenant_id` was set — so RLS is actually enforced.
        // Only sync if tenant is in preview mode
        const [t] = await tx
          .select({ migrationStatus: tenant.migrationStatus })
          .from(tenant)
          .where(eq(tenant.id, data.tenantId));

        if (t?.migrationStatus !== "preview") {
          log.info("sync skipped: tenant not in preview mode", {
            queue: BITRIX_SYNC_QUEUE,
            tenantId: data.tenantId,
          });
          return;
        }

        const [conn] = await tx
          .select()
          .from(integrationConnection)
          .where(
            and(
              eq(integrationConnection.tenantId, data.tenantId),
              eq(integrationConnection.provider, "bitrix24")
            )
          )
          .limit(1);

        if (!conn) {
          log.warn("no Bitrix24 connection", { queue: BITRIX_SYNC_QUEUE, tenantId: data.tenantId });
          return;
        }

        const config = conn.config as { webhookUrl?: string };
        if (!config.webhookUrl) {
          log.warn("missing Bitrix24 webhook URL", {
            queue: BITRIX_SYNC_QUEUE,
            tenantId: data.tenantId,
          });
          return;
        }

        log.info("bitrix sync starting", { queue: BITRIX_SYNC_QUEUE, tenantId: data.tenantId });
        const result = await syncBitrix24(tx, data.tenantId, config.webhookUrl);

        await tx
          .update(integrationConnection)
          .set({ lastSyncAt: new Date() })
          .where(eq(integrationConnection.id, conn.id));

        log.info("bitrix sync completed", {
          queue: BITRIX_SYNC_QUEUE,
          tenantId: data.tenantId,
          result,
        });
      })
    )
  );

  // Kaiten: sync board cards
  workers.push(
    registerWorker(KAITEN_SYNC_QUEUE, () =>
      createTenantJob<{ tenantId: string }>(KAITEN_SYNC_QUEUE, async ({ data, tx }) => {
        // All DB work runs on `tx` — the connection where the job's
        // `SET LOCAL app.tenant_id` was set — so RLS is actually enforced.
        const [t] = await tx
          .select({ migrationStatus: tenant.migrationStatus })
          .from(tenant)
          .where(eq(tenant.id, data.tenantId));

        if (t?.migrationStatus !== "preview") {
          log.info("sync skipped: tenant not in preview mode", {
            queue: KAITEN_SYNC_QUEUE,
            tenantId: data.tenantId,
          });
          return;
        }

        const [conn] = await tx
          .select()
          .from(integrationConnection)
          .where(
            and(
              eq(integrationConnection.tenantId, data.tenantId),
              eq(integrationConnection.provider, "kaiten")
            )
          )
          .limit(1);

        if (!conn) {
          log.warn("no Kaiten connection", { queue: KAITEN_SYNC_QUEUE, tenantId: data.tenantId });
          return;
        }

        const config = conn.config as { apiKey?: string };
        if (!config.apiKey) {
          log.warn("missing Kaiten API key", { queue: KAITEN_SYNC_QUEUE, tenantId: data.tenantId });
          return;
        }

        log.info("kaiten sync starting", { queue: KAITEN_SYNC_QUEUE, tenantId: data.tenantId });
        const result = await syncKaitenBoard(tx, data.tenantId, config.apiKey);

        await tx
          .update(integrationConnection)
          .set({ lastSyncAt: new Date() })
          .where(eq(integrationConnection.id, conn.id));

        log.info("kaiten sync completed", {
          queue: KAITEN_SYNC_QUEUE,
          tenantId: data.tenantId,
          result,
        });
      })
    )
  );

  // Twenty CRM mirror — RETIRED 2026-08-10 (owner decision). The Bitrix→Twenty
  // mirror re-pushed empty Bitrix "husk" deals into Twenty every 6h, fighting
  // the clean MyCRM→Twenty router (Kimi's routing + CallGear/WA feeders) and
  // making cards flicker in and then vanish. Twenty is now fed ONLY by that
  // clean path; Bitrix stays a source for MyCRM but never reaches Twenty again.
  //
  // The worker is kept registered but inert: pg-boss still has leftover
  // schedules and queued jobs for this queue, and an undeclared/unworked queue
  // would let them pile up — so we drain them into a loud no-op instead of
  // resurrecting mirrorBitrixToTwenty. Also unscheduled at runtime by
  // scheduleRecurringSync (see below). To ever run the mirror again, use the
  // guarded scripts/run-twenty-mirror.ts.
  void mirrorBitrixToTwenty; // retained import; intentionally not invoked here
  workers.push(
    registerWorker(TWENTY_SYNC_QUEUE, () =>
      createTenantJob<{ tenantId: string }>(TWENTY_SYNC_QUEUE, async ({ data }) => {
        log.info("twenty mirror retired — no-op (Bitrix no longer feeds Twenty)", {
          queue: TWENTY_SYNC_QUEUE,
          tenantId: data.tenantId,
        });
      })
    )
  );

  return Promise.all(workers);
}

// ─── Scheduling ─────────────────────────────────────────────────────────────

// In pg-boss v12 the first argument to schedule()/unschedule() IS the queue
// name — `pgboss.schedule.name` is a foreign key onto `pgboss.queue.name`, and
// the timekeeper sends the job straight to that queue. A per-tenant name like
// `bitrix.sync.all:<uuid>` is not a queue, so the insert died on the FK
// ("Queue ... not found") and no tenant ever got a recurring sync.
//
// Per-tenant identity belongs in `options.key`: the schedule table's primary
// key is (name, key), so one row per tenant per queue, and the timekeeper
// dedupes each firing under the singleton key `<name>__<key>`.
export async function scheduleRecurringSync(tenantId: string) {
  // Called from a server action, which may reach a process whose boot path has
  // not created the queues yet. Memoized, so this is a no-op after the first.
  await ensureQueues();

  // Every 6 hours
  const cron = "0 */6 * * *";

  await boss.schedule(BITRIX_SYNC_QUEUE, cron, { tenantId }, { key: tenantId });
  await boss.schedule(KAITEN_SYNC_QUEUE, cron, { tenantId }, { key: tenantId });
  // TWENTY_SYNC_QUEUE (Bitrix→Twenty mirror) is RETIRED — never re-schedule it.
  // Actively unschedule any row an earlier deploy created, so the every-6h
  // firing stops for tenants already scheduled, not just new ones.
  await boss.unschedule(TWENTY_SYNC_QUEUE, tenantId);

  log.info("scheduled recurring sync", {
    tenantId,
    cron,
    queues: [BITRIX_SYNC_QUEUE, KAITEN_SYNC_QUEUE],
  });
}

export async function unscheduleRecurringSync(tenantId: string) {
  await boss.unschedule(BITRIX_SYNC_QUEUE, tenantId);
  await boss.unschedule(KAITEN_SYNC_QUEUE, tenantId);
  await boss.unschedule(TWENTY_SYNC_QUEUE, tenantId);

  log.info("unscheduled recurring sync", {
    tenantId,
    queues: [BITRIX_SYNC_QUEUE, KAITEN_SYNC_QUEUE, TWENTY_SYNC_QUEUE],
  });
}
