// Next.js instrumentation hook — the ONE boot path of the server process.
//
// There must be exactly one instrumentation file in this project. Verified on
// next@16.2.6 + Turbopack: when both `instrumentation.ts` and
// `src/instrumentation.ts` exist, the PROJECT-ROOT file wins and this one is
// never compiled at all (`.next/server/instrumentation.js` resolved to the root
// copy). A second copy at the root therefore silently disables everything
// below — do not add one back.
//
// Boot order matters:
//   1. Sentry init            — so any failure in 2-4 is actually reported.
//   2. RLS guard (ADR-002 §3) — FATAL. A tenant-scoped table without RLS is a
//      cross-tenant data-leak risk, so we fail closed: throwing out of
//      register() rejects Next's `app.prepare()` (see
//      next/dist/server/lib/router-utils/instrumentation-globals.external.js),
//      which server.cjs does not catch, so the process dies.
//   3. Platform-admin seed    — best effort, never blocks boot (SPEC §3.1).
//   4. pg-boss + job workers  — best effort with backoff. A dead queue must
//      not take the CRM offline; see the note in register().

import * as Sentry from "@sentry/nextjs";
import type { PgBoss } from "pg-boss";
import { log } from "@/platform/log";

// Report server-side errors Next hands us (RSC render, route handlers, actions).
// @sentry/nextjs v10 API: captureRequestError(error, request, errorContext),
// exported from both the node and edge entry points. No DSN => no-op.
export const onRequestError = Sentry.captureRequestError;

/** Backoff before job-startup attempts 2..N. The last value repeats. */
const JOB_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];
const JOB_MAX_ATTEMPTS = 5;

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * How long in-flight jobs get to finish on SIGTERM/SIGINT. Keep this BELOW
 * pm2's `kill_timeout` or pm2 SIGKILLs us mid-drain — pm2's default is 1600ms,
 * so the ecosystem file needs a matching `kill_timeout` for this to be honoured.
 */
const SHUTDOWN_TIMEOUT_MS = envPositiveInt("JOBS_SHUTDOWN_TIMEOUT_MS", 10_000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Tracked per step, not as one flag: if the run dies halfway, the retry must not
// call boss.work() a second time for a queue that already has a worker — that
// would give the queue two consumers in one process.
let jobsRunning = false;
let bossStarted = false;
/** Sticky: pg-boss cannot be started again in this process once start() throws. */
let bossStartFailed = false;
let syncWorkersStarted = false;
let discoveryWorkersStarted = false;
let shutdownHooked = false;

/** Bring pg-boss and every worker up. Resumable, and a no-op once complete. */
async function startJobs(): Promise<void> {
  if (jobsRunning) return;

  // Probe the DB before touching pg-boss. pg-boss v12's start() sets a private
  // `starting` flag that it never clears when the call throws (dist/index.js has
  // no try/finally), so a failed start() poisons the singleton for the rest of
  // the process lifetime: every later start() returns early having started
  // nothing. Checking connectivity separately keeps the common failure — the
  // database not being up yet — genuinely retryable.
  const { db } = await import("@/platform/db/client");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`select 1`);

  const { boss } = await import("@/platform/jobs/boss");

  if (!bossStarted) {
    // If start() has already thrown once, the singleton is poisoned: pg-boss
    // sets its internal `#starting` flag without a try/finally, so a second
    // start() returns instantly having started neither the supervisor nor the
    // cron timekeeper. Retrying would look like success and log "recovered"
    // while scheduled syncs stay dead — so refuse, loudly and honestly.
    if (bossStartFailed) {
      throw new Error(
        "pg-boss start() already failed once in this process; its client cannot " +
          "be restarted in place — restart the process to recover the job queue",
      );
    }
    try {
      await boss.start();
    } catch (err) {
      bossStartFailed = true;
      throw err;
    }
    bossStarted = true;
  }

  if (!syncWorkersStarted) {
    const { startSyncWorkers } = await import("@/platform/jobs/sync-jobs");
    await startSyncWorkers();
    syncWorkersStarted = true;
  }

  if (!discoveryWorkersStarted) {
    const { startBitrixDiscoveryWorkers } = await import("@/platform/jobs/bitrix-discovery");
    await startBitrixDiscoveryWorkers();
    discoveryWorkersStarted = true;
  }

  jobsRunning = true;
  hookJobShutdown(boss);
  log.info("[instrumentation] pg-boss and job workers started");
}

function reportJobFailure(err: unknown, attempt: number): void {
  const willRetry = attempt < JOB_MAX_ATTEMPTS;
  log.error("[instrumentation] job queue failed to start", {
    attempt,
    maxAttempts: JOB_MAX_ATTEMPTS,
    willRetry,
    err,
  });
  Sentry.captureException(err, {
    level: willRetry ? "warning" : "fatal",
    tags: { boot_stage: "jobs" },
    extra: { attempt, maxAttempts: JOB_MAX_ATTEMPTS },
  });
}

/**
 * Detached retry loop. Deliberately NOT awaited by register(): a database blip
 * at boot must not hold HTTP hostage, and must not kill the process either
 * (see the note in register()).
 */
async function retryJobs(): Promise<void> {
  for (let attempt = 2; attempt <= JOB_MAX_ATTEMPTS; attempt++) {
    const idx = Math.min(attempt - 2, JOB_RETRY_DELAYS_MS.length - 1);
    await sleep(JOB_RETRY_DELAYS_MS[idx]);
    try {
      await startJobs();
      log.info("[instrumentation] job queue recovered", { attempt });
      return;
    } catch (err) {
      reportJobFailure(err, attempt);
      // Retrying a poisoned pg-boss client only produces a convincing lie.
      if (bossStartFailed) break;
    }
  }
  log.error(
    "[instrumentation] giving up on the job queue — HTTP stays up but ALL background sync is dead until this process is restarted",
    { maxAttempts: JOB_MAX_ATTEMPTS },
  );
}

/**
 * Drain the queue on SIGTERM/SIGINT. Without this, every redeploy kills workers
 * mid-job and those jobs sit `active` until pg-boss expires them.
 *
 * pg-boss v12 signature is `stop({ close, graceful, timeout })` — there is no
 * `wait` option (that was v9/v10). stop() awaits the drain itself and then calls
 * failWip(), so interrupted jobs are marked failed (and become retryable)
 * instead of hanging in `active`.
 */
function hookJobShutdown(boss: PgBoss): void {
  if (shutdownHooked) return;
  shutdownHooked = true;

  let stopping = false;
  const stop = (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    log.info("[instrumentation] draining job queue before exit", {
      signal,
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    });

    void (async () => {
      try {
        await boss.stop({ graceful: true, timeout: SHUTDOWN_TIMEOUT_MS, close: true });
        log.info("[instrumentation] job queue drained", { signal });
      } catch (err) {
        log.error("[instrumentation] job queue shutdown failed", { signal, err });
        Sentry.captureException(err, { tags: { boot_stage: "shutdown" } });
      } finally {
        // Registering a signal handler replaces Node's default terminate
        // behaviour, so we have to exit ourselves or pm2 waits out its
        // kill_timeout and SIGKILLs us.
        await Sentry.flush(2_000).catch(() => false);
        process.exit(0);
      }
    })();
  };

  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

export async function register(): Promise<void> {
  // @sentry/nextjs v10 no longer auto-loads the sentry.*.config files; the
  // instrumentation hook has to import them (see `warnAboutDeprecatedConfigFiles`
  // in node_modules/@sentry/nextjs/build/cjs/config/webpack.js). Both configs
  // no-op when their DSN env var is unset, so dev boots silently.
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
    return;
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  await import("../sentry.server.config");

  // ADR-002 §3 — refuse to serve a schema that can leak across tenants.
  // Intentionally NOT wrapped: this must abort the boot.
  const { verifyRlsAtBoot } = await import("@/platform/db/startup-check");
  await verifyRlsAtBoot();

  // SPEC §3.1 — promote PLATFORM_ADMIN_EMAILS on boot. Never blocks start.
  try {
    const { ensurePlatformAdmins } = await import("@/platform/auth/platform-admin-seed");
    const { promoted } = await ensurePlatformAdmins();
    if (promoted > 0) log.info("[platform-admin] promoted admins", { promoted });
  } catch (err) {
    log.error("[platform-admin] seed failed", { err });
    Sentry.captureException(err, { tags: { boot_stage: "admin-seed" } });
  }

  // Jobs are the one boot step we degrade on rather than die on: this box runs a
  // single pm2 process, and pm2 gives up after `max_restarts`, so crash-looping
  // on a transient DB outage would take the whole CRM offline to protect
  // background sync. Serve HTTP, retry the queue in the background, page Sentry.
  try {
    await startJobs();
  } catch (err) {
    reportJobFailure(err, 1);
    void retryJobs();
  }
}
