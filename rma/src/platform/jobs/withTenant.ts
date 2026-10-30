import { boss } from "./boss";
import { sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { setSentryTenant } from "@/platform/observability/tenant-scope";
import { log } from "@/platform/log";

// Same as src/platform/tenancy/rls.ts: switch to the non-bypass role so RLS is
// actually enforced for background jobs (without this, workers run as the owner
// role and bypass tenant isolation).
const APP_ROLE = process.env.DB_APP_ROLE?.trim() || null;
if (APP_ROLE && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(APP_ROLE)) {
  throw new Error(`Invalid DB_APP_ROLE: ${APP_ROLE}`);
}

/**
 * Wrap a pg-boss job handler with automatic tenant context.
 * The job data must include `tenantId: string`.
 * If tenantId is missing or invalid, the job fails before the handler runs.
 *
 * pg-boss v12 delivers jobs as an array to the worker callback.
 */
export function createTenantJob<T extends { tenantId: string }>(
  queueName: string,
  handler: (job: { id: string; data: T; tx: typeof db }) => Promise<void>
) {
  return boss.work<T>(queueName, async (jobs) => {
    for (const job of jobs) {
      const { tenantId } = job.data;

      if (!tenantId) {
        throw new Error(`[${queueName}] Missing tenantId in job ${job.id}`);
      }

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)) {
        throw new Error(`[${queueName}] Invalid tenantId format in job ${job.id}`);
      }

      // Attribute any error captured while this job runs to the tenant.
      setSentryTenant(tenantId);

      try {
        // Run the handler's DB work on the SAME connection where the GUC is
        // set. `SET LOCAL` only applies to the current transaction, so the
        // scoped `tx` must be threaded into the handler — querying the global
        // `db` would land on a different pool connection with no tenant
        // context and RLS would silently not apply.
        await db.transaction(async (tx) => {
          if (APP_ROLE) await tx.execute(sql.raw(`SET LOCAL ROLE "${APP_ROLE}"`));
          await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${tenantId}'`));
          await handler({ id: job.id, data: job.data, tx: tx as unknown as typeof db });
        });
      } catch (e) {
        log.error("job failed", { queue: queueName, jobId: job.id, tenantId, err: e });
        throw e; // re-throw so pg-boss marks it failed/retry
      }
    }
  });
}
