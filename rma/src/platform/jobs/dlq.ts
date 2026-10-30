// Dead-letter queue worker.
//
// When a job exhausts its retries pg-boss copies its `data` and `output` (the
// serialized error) into the queue named by `queue.dead_letter` — `dlq` here.
// Nothing reads that queue by default, so failures pile up invisibly. This
// worker is the alarm: one structured error line per dead letter, plus a Sentry
// event when Sentry is available.
//
// It deliberately never throws: the dlq queue has `retryLimit: 0`, and a
// throwing alarm handler would only turn one lost job into two.

import { boss } from "./boss";
import { DLQ_QUEUE } from "./queues";
import { log } from "@/platform/log";

/**
 * `output` as written by pg-boss when a job fails. It is whatever
 * `serialize-error` produced from the thrown value, so treat every field as
 * optional.
 */
type DeadLetterOutput = {
  name?: string;
  message?: string;
  stack?: string;
  value?: { message?: string };
};

/**
 * Report to Sentry if it is wired up, and never let telemetry break the worker.
 *
 * The import is lazy and guarded on purpose: Sentry is optional (no DSN in dev,
 * and the package may not be installed at all in a slim build). `captureException`
 * is itself a no-op when the SDK was never initialized.
 */
async function reportToSentry(error: Error, context: Record<string, unknown>): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException?.(error, {
      tags: { queue: DLQ_QUEUE, source: "pg-boss-dlq" },
      extra: context,
    });
  } catch {
    // Sentry absent or not initialized — the log line above is the record.
  }
}

function describe(output: unknown): { message: string; stack?: string; name?: string } {
  if (!output || typeof output !== "object") {
    return { message: typeof output === "string" ? output : "job failed (no output recorded)" };
  }
  const o = output as DeadLetterOutput;
  const message = o.message ?? o.value?.message ?? "job failed (no message recorded)";
  return { message, stack: o.stack, name: o.name };
}

/**
 * Start the worker that drains `dlq`. Call once at boot, after `ensureQueues()`.
 */
export function startDlqWorker(): Promise<string> {
  // `includeMetadata` is what carries `output` (the failure) and `data`
  // (the original payload) — without it we would only see an opaque job id.
  return boss.work<Record<string, unknown>>(
    DLQ_QUEUE,
    { includeMetadata: true, batchSize: 20 },
    async (jobs) => {
      for (const job of jobs) {
        const { message, stack, name } = describe(job.output);

        // The original job's payload is preserved verbatim, so tenantId (every
        // queue in this repo carries one) still attributes the failure.
        const tenantId =
          typeof job.data?.tenantId === "string" ? job.data.tenantId : undefined;

        const context = {
          deadLetterJobId: job.id,
          tenantId,
          retryCount: job.retryCount,
          createdOn: job.createdOn,
          data: job.data,
          error: { name, message, stack },
        };

        log.error("job dead-lettered", { queue: DLQ_QUEUE, ...context });

        const error = new Error(`pg-boss dead letter: ${message}`);
        error.name = name ?? "DeadLetteredJob";
        if (stack) error.stack = stack;

        await reportToSentry(error, context);
      }
    }
  );
}
