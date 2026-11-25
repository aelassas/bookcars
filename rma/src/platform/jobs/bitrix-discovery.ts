import { boss, ensureQueues } from "./boss";
import { BITRIX_DISCOVERY_QUEUE } from "./queues";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { setSentryTenant } from "@/platform/observability/tenant-scope";
import { bitrixDiscoveryRun, integrationEvent } from "@/platform/db/schema";
import { createBitrix24Client } from "@/platform/integrations/bitrix24/client";
import type { BitrixCrmRecord } from "@/platform/integrations/bitrix24/mappings";
import { log } from "@/platform/log";
import { and, eq, sql, type Column, type SQL } from "drizzle-orm";

// Re-exported for back-compat; the canonical name lives in ./queues.
export { BITRIX_DISCOVERY_QUEUE };

const ENTITY_METHODS: Record<string, string> = {
  contacts: "crm.contact.list",
  leads: "crm.lead.list",
  deals: "crm.deal.list",
  activities: "crm.activity.list",
  companies: "crm.company.list",
  tasks: "tasks.task.list",
};

const ENTITY_SINGULAR: Record<string, string> = {
  contacts: "contact",
  leads: "lead",
  deals: "deal",
  activities: "activity",
  companies: "company",
  tasks: "task",
};

const ENTITY_KEYS = Object.keys(ENTITY_METHODS);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bitrix page size handed to listAll — also our rate-limit accounting unit:
// one HTTP request per PAGE_SIZE records.
const PAGE_SIZE = 50;

// How many crawled records we buffer before committing. The crawl runs for
// hours; committing in chunks means a failure at record 9,900 keeps the first
// 9,500 instead of rolling the whole thing back, and no pool connection is
// pinned idle-in-transaction for the duration.
const CHUNK_SIZE = 500;

// ─── Token-bucket rate limiter (1.5 req/s, burst 3) ─────────────────────────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private rate: number, private capacity: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  async consume(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) * (1000 / this.rate));
    await sleep(waitMs);
    return this.consume();
  }
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }
}

const globalBucket = new TokenBucket(1.5, 3);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run-state helpers (persisted, tenant-scoped) ───────────────────────────

type RunStatus = "queued" | "running" | "done" | "error";

/** The tenant-scoped Drizzle handle `withDrizzleTenant` hands to its callback. */
type TenantTx = Parameters<Parameters<typeof withDrizzleTenant>[1]>[0];

/**
 * `jsonb_set(col, ARRAY['<entity>'], <value>, true)` — merge ONE key into a
 * jsonb map without reading it first, so the six entity workers updating
 * different keys of the same run row never clobber each other.
 * `value` must arrive already cast (to_jsonb of a bare parameter cannot resolve
 * its polymorphic type).
 */
function jsonbPatch(column: Column, key: string, value: SQL) {
  return sql`jsonb_set(${column}, ARRAY[${key}::text], ${value}, true)`;
}

/** Record how far one entity has got. Runs on the caller's tenant connection. */
async function writeCount(
  tx: TenantTx,
  runId: string,
  tenantId: string,
  entity: string,
  count: number
) {
  await tx
    .update(bitrixDiscoveryRun)
    .set({
      counts: jsonbPatch(bitrixDiscoveryRun.counts, entity, sql`to_jsonb(${count}::int)`),
      updatedAt: new Date(),
    })
    .where(and(eq(bitrixDiscoveryRun.id, runId), eq(bitrixDiscoveryRun.tenantId, tenantId)));
}

/**
 * Move one entity to a new status (and optionally record its error). When the
 * last entity reaches a terminal status the run is stamped finished.
 */
async function setEntityStatus(
  tenantId: string,
  runId: string,
  entity: string,
  status: RunStatus,
  errorMessage?: string
): Promise<void> {
  await withDrizzleTenant(tenantId, async (tx) => {
    const scope = and(eq(bitrixDiscoveryRun.id, runId), eq(bitrixDiscoveryRun.tenantId, tenantId));

    await tx
      .update(bitrixDiscoveryRun)
      .set({
        statuses: jsonbPatch(bitrixDiscoveryRun.statuses, entity, sql`to_jsonb(${status}::text)`),
        ...(errorMessage
          ? {
              errors: jsonbPatch(
                bitrixDiscoveryRun.errors,
                entity,
                sql`to_jsonb(${errorMessage}::text)`
              ),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(scope);

    if (status !== "done" && status !== "error") return;

    const [row] = await tx
      .select({ statuses: bitrixDiscoveryRun.statuses, finishedAt: bitrixDiscoveryRun.finishedAt })
      .from(bitrixDiscoveryRun)
      .where(scope)
      .limit(1);
    if (!row || row.finishedAt) return;

    const terminal = ENTITY_KEYS.filter(
      (e) => row.statuses?.[e] === "done" || row.statuses?.[e] === "error"
    ).length;
    if (terminal < ENTITY_KEYS.length) return;

    await tx
      .update(bitrixDiscoveryRun)
      .set({ finishedAt: new Date(), updatedAt: new Date() })
      .where(scope);
  });
}

/** Best-effort status write — never mask the original crawl failure. */
async function trySetEntityStatus(
  tenantId: string,
  runId: string,
  entity: string,
  status: RunStatus,
  errorMessage?: string
): Promise<void> {
  try {
    await setEntityStatus(tenantId, runId, entity, status, errorMessage);
  } catch (e) {
    log.warn("bitrix discovery: could not persist run status", {
      queue: BITRIX_DISCOVERY_QUEUE,
      tenantId,
      runId,
      entity,
      status,
      err: e,
    });
  }
}

// ─── Worker ─────────────────────────────────────────────────────────────────

interface BitrixDiscoveryJob {
  tenantId: string;
  webhookUrl: string;
  entity: string;
  runId: string;
}

type IntegrationEventInsert = typeof integrationEvent.$inferInsert;

/**
 * Commit one chunk. Deliberately NOT wrapped in the job-wide transaction
 * `createTenantJob` would open: this crawl runs for hours, and holding a pooled
 * connection idle-in-transaction that long starves the pool, blocks VACUUM and
 * throws away every row if the last page fails. Each chunk is its own short
 * transaction — and still runs inside `withDrizzleTenant`, so `app.tenant_id`
 * is set and RLS applies to the insert.
 */
async function flushChunk(
  tenantId: string,
  runId: string,
  entity: string,
  rows: IntegrationEventInsert[],
  crawled: number
): Promise<void> {
  await withDrizzleTenant(tenantId, async (tx) => {
    if (rows.length > 0) {
      await tx
        .insert(integrationEvent)
        .values(rows)
        // onConflictDoNothing made a re-run a permanent no-op: the row kept the
        // OLD run id, so progress for the new run sat at 0/N forever. Refresh
        // the payload (which carries `_takeAutoRunId`) instead. Target must be
        // the full (tenant_id, provider, provider_event_id) tuple — see 0058.
        .onConflictDoUpdate({
          target: [
            integrationEvent.tenantId,
            integrationEvent.provider,
            integrationEvent.providerEventId,
          ],
          set: {
            rawPayload: sql`excluded.raw_payload`,
            normalizedType: sql`excluded.normalized_type`,
            receivedAt: sql`excluded.received_at`,
            processingStatus: sql`excluded.processing_status`,
          },
        });
    }
    await writeCount(tx, runId, tenantId, entity, crawled);
  });
}

async function crawlEntity(job: { id: string; data: BitrixDiscoveryJob }): Promise<void> {
  const { tenantId, webhookUrl, entity, runId } = job.data;

  if (!tenantId || !UUID_RE.test(tenantId)) {
    throw new Error(`[${BITRIX_DISCOVERY_QUEUE}] Invalid tenantId in job ${job.id}`);
  }
  const method = ENTITY_METHODS[entity];
  if (!method) throw new Error(`Unknown entity: ${entity}`);

  // Attribute anything captured while this job runs to the tenant.
  setSentryTenant(tenantId);
  await trySetEntityStatus(tenantId, runId, entity, "running");

  const client = createBitrix24Client(webhookUrl);
  const normalizedType = ENTITY_SINGULAR[entity];
  let crawled = 0;
  let pending: IntegrationEventInsert[] = [];
  const seenIds = new Set<string>();

  try {
    for await (const item of client.listAll<BitrixCrmRecord>(
      method,
      { select: ["*", "UF_*"] },
      PAGE_SIZE
    )) {
      // Rate-limit REQUESTS, not records. The bucket used to be consumed once
      // per record, which throttled the crawl to ~1.5 records/s — ~111 minutes
      // for 10k contacts. `listAll` fetches PAGE_SIZE records per HTTP call, so
      // spending one token per page is one token per request (~2 min for 10k).
      if (crawled % PAGE_SIZE === 0) await globalBucket.consume();

      // Namespace the id by entity: within provider "bitrix" a contact and a
      // deal both numbered 42 would otherwise be the SAME dedupe key and the
      // parallel entity jobs would overwrite each other.
      const providerEventId = `${normalizedType}:${String(item.ID)}`;
      crawled++;

      // A portal that repeats an id inside one chunk would make ON CONFLICT DO
      // UPDATE fail ("cannot affect row a second time") and lose the chunk.
      if (seenIds.has(providerEventId)) continue;
      seenIds.add(providerEventId);

      pending.push({
        tenantId,
        provider: "bitrix",
        providerEventId,
        signatureValid: true,
        rawPayload: { ...item, _takeAutoRunId: runId },
        normalizedType,
        processingStatus: "queued",
      });

      if (pending.length >= CHUNK_SIZE) {
        await flushChunk(tenantId, runId, entity, pending, crawled);
        pending = [];
        seenIds.clear();
      }
    }

    await flushChunk(tenantId, runId, entity, pending, crawled);
    await setEntityStatus(tenantId, runId, entity, "done");

    log.info("bitrix discovery entity crawled", {
      queue: BITRIX_DISCOVERY_QUEUE,
      tenantId,
      runId,
      entity,
      records: crawled,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Keep whatever we already committed and make the failure visible in the
    // UI instead of leaving the entity stuck at N/total forever.
    await trySetEntityStatus(tenantId, runId, entity, "error", message);
    log.error("bitrix discovery entity failed", {
      queue: BITRIX_DISCOVERY_QUEUE,
      tenantId,
      runId,
      entity,
      records: crawled,
      err: e,
    });
    throw e; // re-throw so pg-boss marks it failed/retry
  }
}

export function startBitrixDiscoveryWorkers() {
  // pg-boss v12 hands the handler an ARRAY of jobs.
  return boss.work<BitrixDiscoveryJob>(BITRIX_DISCOVERY_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await crawlEntity(job);
    }
  });
}

// ─── Enqueue ────────────────────────────────────────────────────────────────

/**
 * Expected record count for one entity.
 *
 * Not `client.countRecords()`: Bitrix answers an expired/insufficient-rights
 * token with HTTP 200 and `{ "error": "...", "total": undefined }`, which
 * countRecords turns into `0`. That is exactly the failure this probe must NOT
 * hide, so we make the call ourselves and throw on a body-level error.
 */
async function probeCount(
  client: ReturnType<typeof createBitrix24Client>,
  method: string
): Promise<number> {
  const res = await client.call<unknown[]>(method, { limit: 1 });
  if (res.error) {
    throw new Error(`${res.error}${res.error_description ? `: ${res.error_description}` : ""}`);
  }
  return res.total ?? 0;
}

export async function enqueueBitrixDryRun(
  tenantId: string,
  webhookUrl: string,
  runId: string
) {
  if (!UUID_RE.test(runId)) throw new Error("Invalid runId format");

  // Called from a server action, which may reach a process whose boot path has
  // not created the queues yet — `boss.send()` below would throw
  // `Queue bitrix-discovery does not exist`. Memoized, so this is a no-op after
  // the first call (same guard as scheduleRecurringSync in sync-jobs.ts).
  await ensureQueues();

  const client = createBitrix24Client(webhookUrl);

  // Quick count probe.
  const totals: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const [entity, method] of Object.entries(ENTITY_METHODS)) {
    await globalBucket.consume(); // pay for the request BEFORE making it
    try {
      totals[entity] = await probeCount(client, method);
    } catch (e) {
      // A failed probe used to be written as `totals[entity] = 0`, which is
      // indistinguishable from an empty CRM — a bad token reported "0 expected
      // records" mid-demo. Record the reason and leave the entity out of
      // totals so nothing claims it is complete.
      const message = e instanceof Error ? e.message : String(e);
      errors[entity] = message;
      log.warn("bitrix discovery: count probe failed", {
        tenantId,
        runId,
        entity,
        err: message,
      });
    }
  }

  // Every probe failed → this is a broken connection, not an empty portal.
  if (Object.keys(totals).length === 0) {
    const detail = Object.entries(errors)
      .map(([entity, message]) => `${entity}: ${message}`)
      .join("; ");
    throw new Error(
      `Bitrix24 count probe failed for every entity — check the webhook URL/token. ${detail}`
    );
  }

  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.insert(bitrixDiscoveryRun).values({
      id: runId,
      tenantId,
      totals,
      counts: {},
      errors,
      statuses: Object.fromEntries(ENTITY_KEYS.map((entity) => [entity, "queued"])),
    });
  });

  // Enqueue one job per entity (including entities whose probe failed — the
  // probe uses a different call and may have failed transiently).
  for (const entity of ENTITY_KEYS) {
    await boss.send({
      name: BITRIX_DISCOVERY_QUEUE,
      data: { tenantId, webhookUrl, entity, runId },
    });
  }

  return { runId, totals, errors };
}

// ─── Progress ───────────────────────────────────────────────────────────────

export interface BitrixDryRunProgress {
  runId: string;
  tenantId: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  /** entity -> expected record count. Keyed by the PLURAL entity name. */
  totals: Record<string, number>;
  /** entity -> records crawled. Same keys as `totals`, so callers compare key-for-key. */
  counts: Record<string, number>;
  /** entity -> probe/crawl error. */
  errors: Record<string, string>;
  /** entity -> queued | running | done | error. */
  statuses: Record<string, string>;
}

/**
 * Read one run's progress. Tenant-scoped on purpose: the read runs inside
 * `withDrizzleTenant` so RLS applies and a leaked run id cannot be used to read
 * another tenant's import. An unknown (or other-tenant) run id reads as empty.
 */
export async function getBitrixDryRunProgress(
  tenantId: string,
  runId: string
): Promise<BitrixDryRunProgress> {
  const empty: BitrixDryRunProgress = {
    runId,
    tenantId: null,
    startedAt: null,
    finishedAt: null,
    totals: {},
    counts: {},
    errors: {},
    statuses: {},
  };
  if (!UUID_RE.test(runId)) return empty;

  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const [found] = await tx
      .select()
      .from(bitrixDiscoveryRun)
      .where(and(eq(bitrixDiscoveryRun.id, runId), eq(bitrixDiscoveryRun.tenantId, tenantId)))
      .limit(1);
    return found ?? null;
  });

  if (!row) return empty;

  return {
    runId,
    tenantId: row.tenantId,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    totals: row.totals ?? {},
    counts: row.counts ?? {},
    errors: row.errors ?? {},
    statuses: row.statuses ?? {},
  };
}
