// Reconciliation report for the Bitrix24 → Twenty cutover (Task C).
//
// This is the SWITCH-OVER CONTRACT: before anyone works in Twenty, a manager
// must be able to answer "where is client X?" — either the counts line up and
// the client is found in Twenty, or this report says exactly why the row did
// not migrate (before the cutoff, junk phone, …). Per entity it reports:
//   sourceRows      — rows in OUR DB carrying a bitrix24 external id
//   admitted        — of those, accepted by the normalizer after the cutoff
//   dropped         — refused rows, by reason (before_cutoff)
//   verdicts        — normalize verdicts on admitted rows (phone:<reason>, empty_name)
//   inTwenty        — Twenty records carrying our externalId/externalSource marker
//   alreadyMirrored — admitted rows whose externalId exists in Twenty
//   pending         — admitted but not yet in Twenty (the mirror's backlog)

import type { db as platformDb } from "@/platform/db/client";
import { and, eq, gt, isNotNull } from "drizzle-orm";
import { customer, deal, lead, tenant } from "@/platform/db/schema";
import { getTwentyClientForTenantSlug, type TwentyClient } from "./client";
import {
  DEFAULT_MIRROR_CUTOFF,
  MIRROR_ENTITIES,
  planMirrorRecord,
  type MirrorEntity,
  type MirrorSourceRow,
} from "./mirror";

export interface ReconcileLine {
  entity: MirrorEntity;
  sourceRows: number;
  admitted: number;
  dropped: Record<string, number>;
  verdicts: Record<string, number>;
  inTwenty: number;
  alreadyMirrored: number;
  pending: number;
}

export interface ReconcileOptions {
  /** Same cutoff the mirror used — mismatched cutoffs make the report lie. */
  since?: Date;
  client?: TwentyClient;
}

type PlatformDb = typeof platformDb;

function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

export interface TwentySideCounts {
  /** externalIds present in Twenty for this entity's marker. */
  externalIds: Set<string>;
  /** Twenty records carrying our marker (duplicates collapse in the set; this count does not). */
  count: number;
}

/**
 * Fold source rows into a reconcile line. Rows can be streamed in pages
 * (add) so a reconcile over 84k rows never holds them all in memory.
 */
export function createReconcileCounter(entity: MirrorEntity, since: Date) {
  const line: ReconcileLine = {
    entity,
    sourceRows: 0,
    admitted: 0,
    dropped: {},
    verdicts: {},
    inTwenty: 0,
    alreadyMirrored: 0,
    pending: 0,
  };
  const admittedIds: string[] = [];
  return {
    add(row: MirrorSourceRow): void {
      line.sourceRows++;
      const planned = planMirrorRecord(entity, row, since);
      if (!planned.admitted) {
        bump(line.dropped, planned.dropReason ?? "rejected");
        return;
      }
      line.admitted++;
      for (const key of planned.verdictKeys) bump(line.verdicts, key);
      admittedIds.push(planned.externalId);
    },
    finish(twenty: TwentySideCounts): ReconcileLine {
      line.inTwenty = twenty.count;
      let matched = 0;
      for (const id of admittedIds) {
        if (twenty.externalIds.has(id)) matched++;
      }
      line.alreadyMirrored = matched;
      line.pending = line.admitted - matched;
      return line;
    },
  };
}

/** Convenience wrapper for tests and small datasets. */
export function reconcileEntityRows(
  entity: MirrorEntity,
  rows: MirrorSourceRow[],
  twenty: TwentySideCounts,
  since: Date = DEFAULT_MIRROR_CUTOFF
): ReconcileLine {
  const counter = createReconcileCounter(entity, since);
  for (const row of rows) counter.add(row);
  return counter.finish(twenty);
}

// ─── Live scan (platform DB + Twenty) ───────────────────────────────────────

const SCAN_PAGE = 1000;

async function* streamSourceRows(
  db: PlatformDb,
  tenantId: string,
  entity: MirrorEntity
): AsyncGenerator<MirrorSourceRow, void, unknown> {
  let cursor: string | null = null;
  for (;;) {
    let rows: MirrorSourceRow[];
    if (entity === "contacts") {
      const r = await db
        .select({
          externalId: customer.externalId,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          source: customer.source,
          notes: customer.notes,
          modifiedAt: customer.updatedAt,
        })
        .from(customer)
        .where(
          and(
            eq(customer.tenantId, tenantId),
            eq(customer.externalSource, "bitrix24"),
            isNotNull(customer.externalId),
            cursor ? gt(customer.externalId, cursor) : undefined
          )
        )
        .orderBy(customer.externalId)
        .limit(SCAN_PAGE);
      rows = r
        .filter((x): x is typeof x & { externalId: string } => x.externalId !== null)
        .map((x) => ({ ...x, externalId: x.externalId }));
    } else if (entity === "leads") {
      const r = await db
        .select({
          externalId: lead.externalId,
          name: lead.customerName,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          notes: lead.notes,
          status: lead.status,
          stageDetail: lead.stageDetail,
          modifiedAt: lead.updatedAt,
        })
        .from(lead)
        .where(
          and(
            eq(lead.tenantId, tenantId),
            eq(lead.externalSource, "bitrix24"),
            isNotNull(lead.externalId),
            cursor ? gt(lead.externalId, cursor) : undefined
          )
        )
        .orderBy(lead.externalId)
        .limit(SCAN_PAGE);
      rows = r
        .filter((x): x is typeof x & { externalId: string } => x.externalId !== null)
        .map((x) => ({ ...x, externalId: x.externalId }));
    } else {
      const r = await db
        .select({
          externalId: deal.externalId,
          name: deal.ref,
          status: deal.status,
          stage: deal.stage,
          stageDetail: deal.stageDetail,
          value: deal.value,
          sourceModifiedAt: deal.sourceModifiedAt,
          lastActivityAt: deal.lastActivityAt,
          updatedAt: deal.updatedAt,
        })
        .from(deal)
        .where(
          and(
            eq(deal.tenantId, tenantId),
            eq(deal.externalSource, "bitrix24"),
            isNotNull(deal.externalId),
            cursor ? gt(deal.externalId, cursor) : undefined
          )
        )
        .orderBy(deal.externalId)
        .limit(SCAN_PAGE);
      rows = r
        .filter((x): x is typeof x & { externalId: string } => x.externalId !== null)
        .map((x) => ({
          externalId: x.externalId,
          name: x.name,
          status: x.status,
          stage: x.stage,
          stageDetail: x.stageDetail,
          value: x.value,
          modifiedAt: x.sourceModifiedAt ?? x.lastActivityAt ?? x.updatedAt,
        }));
    }
    if (rows.length === 0) return;
    for (const row of rows) yield row;
    cursor = rows[rows.length - 1].externalId;
    if (rows.length < SCAN_PAGE) return;
  }
}

/**
 * Count Twenty records per entity marker. People mixes contacts and leads —
 * separated by the externalSource tag the mirror writes ("bitrix24" vs
 * "lead:bitrix24"), which is exactly why that tag exists.
 */
export async function scanTwentySide(
  client: TwentyClient
): Promise<Record<MirrorEntity, TwentySideCounts>> {
  const result: Record<MirrorEntity, TwentySideCounts> = {
    contacts: { externalIds: new Set(), count: 0 },
    leads: { externalIds: new Set(), count: 0 },
    deals: { externalIds: new Set(), count: 0 },
  };
  for await (const rec of client.listAll<Record<string, unknown>>("people")) {
    const ext = typeof rec.externalId === "string" && rec.externalId ? rec.externalId : null;
    if (!ext) continue; // not one of ours (hand-created in Twenty)
    if (rec.externalSource === "lead:bitrix24") {
      result.leads.externalIds.add(ext);
      result.leads.count++;
    } else if (rec.externalSource === "bitrix24") {
      result.contacts.externalIds.add(ext);
      result.contacts.count++;
    }
    // Anything else (pilot-test, hand-created) is not our migration — skip.
  }
  for await (const rec of client.listAll<Record<string, unknown>>("opportunities")) {
    const ext = typeof rec.externalId === "string" && rec.externalId ? rec.externalId : null;
    if (!ext || rec.externalSource !== "bitrix24") continue;
    result.deals.externalIds.add(ext);
    result.deals.count++;
  }
  return result;
}

/**
 * Per-entity reconciliation between our DB and Twenty.
 *
 * NOTE on the signature: the task sketch was `reconcileCounts(tenantId)`, but
 * the function cannot count without the two stores — `db` and (optionally)
 * the Twenty client are explicit parameters, same convention as
 * mirrorBitrixToTwenty. The env-singleton client is the default.
 */
export async function reconcileCounts(
  db: PlatformDb,
  tenantId: string,
  opts: ReconcileOptions = {}
): Promise<ReconcileLine[]> {
  const since = opts.since ?? DEFAULT_MIRROR_CUTOFF;
  // Count against the deployment this tenant actually lives in, or a rental
  // reconcile reports the SALES workspace back as if it were rental.
  const [t] = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  const client = opts.client ?? getTwentyClientForTenantSlug(t?.slug);
  const twentySide = await scanTwentySide(client);

  const lines: ReconcileLine[] = [];
  for (const entity of MIRROR_ENTITIES) {
    const counter = createReconcileCounter(entity, since);
    for await (const row of streamSourceRows(db, tenantId, entity)) {
      counter.add(row);
    }
    lines.push(counter.finish(twentySide[entity]));
  }
  return lines;
}
