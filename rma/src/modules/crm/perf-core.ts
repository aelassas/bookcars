// Plain server module (NO "use server") — the shared computation behind the
// guarded page action (perf-queries.ts) and the session-less CEO digest
// (notify/rules.ts). Guarded entry points live in perf-queries.ts.

import { and, eq, gte, sql } from "drizzle-orm";
import { deal, lead, message, tenantMember, user } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canonicalName } from "@/modules/monitor/people";
import { linesForOwnerKey } from "@/modules/board/owners";

// Performance board (P4): one row per CURRENT sales-team member — "who
// performs, who doesn't answer". Grouped by canonical name so duplicate
// accounts collapse (Moe = login + Mohammad Imad), message/line metrics ride
// the member's WhatsApp lines via BRAND_OWNERS.

export type PerfRow = {
  name: string;
  userIds: string[];
  ownerKey: string | null;
  leads: number;
  dealsWon: number;
  wonAed: number;
  openDeals: number;
  inbound: number;
  answered: number;
  callsOut: number;
  callsIn: number;
  callsMissed: number;
};

const CANON_TO_OWNER: Record<string, string> = {
  Azat: "azat",
  Firuz: "firuz",
  Moe: "mohammed",
  Babek: "babek",
  Ali: "ali",
  Abdullah: "abdullah",
};

async function baseRows(tenantId: string): Promise<Map<string, PerfRow>> {
  const members = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ id: user.id, name: user.name })
      .from(user)
      .innerJoin(
        tenantMember,
        and(eq(tenantMember.userId, user.id), eq(tenantMember.tenantId, tenantId))
      )
      .where(sql`${tenantMember.roles} && ARRAY['sales','sales_manager','general_manager']::text[]`)
  );
  const map = new Map<string, PerfRow>();
  for (const m of members) {
    const canon = canonicalName(m.name);
    if (!canon) continue;
    const row = map.get(canon) ?? {
      name: canon,
      userIds: [],
      ownerKey: CANON_TO_OWNER[canon] ?? null,
      leads: 0, dealsWon: 0, wonAed: 0, openDeals: 0,
      inbound: 0, answered: 0, callsOut: 0, callsIn: 0, callsMissed: 0,
    };
    row.userIds.push(m.id);
    map.set(canon, row);
  }
  return map;
}

export async function computePerformanceBoard(tenantId: string, days: number): Promise<PerfRow[]> {
  const rows = await baseRows(tenantId);
  if (rows.size === 0) return [];
  const since = sql`now() - make_interval(days => ${days})`;

  await withDrizzleTenant(tenantId, async (tx) => {
    // Leads created in the window, by assignee.
    const leadRows = ((await tx.execute(sql`
      SELECT l.assigned_to AS uid, count(*)::int AS n FROM lead l
      WHERE l.created_at >= ${since} AND l.assigned_to IS NOT NULL GROUP BY 1
    `)) as unknown as { rows: { uid: string; n: number }[] }).rows;
    for (const r of leadRows) {
      for (const row of rows.values()) if (row.userIds.includes(r.uid)) row.leads += r.n;
    }

    // Won deals in the window (status flipped to won recently) + open deals.
    const dealRows = ((await tx.execute(sql`
      SELECT d.owner_id AS uid,
             count(*) FILTER (WHERE d.status = 'won' AND d.updated_at >= ${since})::int AS won,
             coalesce(sum(d.value) FILTER (WHERE d.status = 'won' AND d.updated_at >= ${since}), 0)::bigint AS won_aed,
             count(*) FILTER (WHERE d.status = 'open')::int AS open
      FROM deal d WHERE d.owner_id IS NOT NULL GROUP BY 1
    `)) as unknown as { rows: { uid: string; won: number; won_aed: number; open: number }[] }).rows;
    for (const r of dealRows) {
      for (const row of rows.values()) if (row.userIds.includes(r.uid)) {
        row.dealsWon += r.won;
        row.wonAed += Number(r.won_aed);
        row.openDeals += r.open;
      }
    }

    // Message responsiveness on each member's WhatsApp lines: inbound contacts
    // in the window and how many got an outbound reply the same day.
    for (const row of rows.values()) {
      if (!row.ownerKey) continue;
      const lines = linesForOwnerKey(row.ownerKey);
      if (lines.length === 0) continue;
      const stats = ((await tx.execute(sql`
        WITH inc AS (
          -- One row per (line, contact). raw_from must be AGGREGATED, not bare:
          -- it is not in the GROUP BY, so Postgres rejected the whole query with
          -- 'column "m.from" must appear in the GROUP BY clause'. That threw on
          -- every call — swallowed by the CEO digest's try/catch (so "Team,
          -- yesterday" silently never rendered) and fatal on /analytics, which
          -- has no catch and returned 500 to the very managers it is for.
          -- min() rather than adding it to GROUP BY on purpose: grouping by it
          -- would split one contact into several rows whenever the same person
          -- arrives as both @lid and a phone, inflating the inbound count.
          SELECT m."to" AS line, coalesce(m.from_pn, m."from") AS contact, min(m."from") AS raw_from, min(m.created_at) AS first_in
          FROM message m
          WHERE m.direction = 'inbound' AND m.channel = 'whatsapp'
            AND m.created_at >= ${since}
            AND m."to" IN (${sql.join(lines.map((l) => sql`${l}`), sql`, `)})
            AND m."from" NOT LIKE '%@g.us'
          GROUP BY 1, 2
        )
        SELECT count(*)::int AS inbound,
               count(*) FILTER (WHERE EXISTS (
                 SELECT 1 FROM message o
                 WHERE o.direction = 'outbound' AND o."to" = inc.line
                   AND (o."from" = inc.raw_from OR (inc.contact <> '' AND o.from_pn = inc.contact))
                   AND o.created_at >= inc.first_in AND o.created_at <= inc.first_in + interval '2 hours'
               ))::int AS answered
        FROM inc
      `)) as unknown as { rows: { inbound: number; answered: number }[] }).rows;
      row.inbound += stats[0]?.inbound ?? 0;
      row.answered += stats[0]?.answered ?? 0;
    }

    // Calls (populated once telephony is live — zeros before).
    const callRows = ((await tx.execute(sql`
      SELECT c.manager_id AS uid,
             count(*) FILTER (WHERE c.direction = 'outbound')::int AS out,
             count(*) FILTER (WHERE c.direction = 'inbound')::int AS inc,
             count(*) FILTER (WHERE c.status = 'missed')::int AS missed
      FROM "call" c WHERE c.created_at >= ${since} GROUP BY 1
    `)) as unknown as { rows: { uid: string; out: number; inc: number; missed: number }[] }).rows;
    for (const r of callRows) {
      for (const row of rows.values()) if (row.userIds.includes(r.uid)) {
        row.callsOut += r.out;
        row.callsIn += r.inc;
        row.callsMissed += r.missed;
      }
    }
  });

  return [...rows.values()].sort((a, b) => b.wonAed - a.wonAed || b.leads - a.leads);
}


