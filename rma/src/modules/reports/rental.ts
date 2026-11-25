/**
 * rental.ts — data assembly for the rental manager's REPORTS dashboard
 * (/reports/rental, opened from the Twenty rental sidebar).
 *
 * Sources:
 *   - Twenty RENTAL workspace (http://localhost:3002) via the REST client:
 *     opportunities (leads/deals), workspaceMembers (agents), tasks
 *     (follow-ups).
 *   - Platform DB (mycrm): `message` (WhatsApp traffic, per rental tenant,
 *     RLS-scoped through withTenant) and `call_transcript` (CallGear calls).
 *
 * Honesty rules (Ayham meeting 2026-08-25): a metric that cannot be derived
 * from real data is returned as null and rendered as "—" by the UI — never
 * invented. Methodology footnotes travel in `notes` so the page can show
 * exactly what each number means.
 */
import { pool } from "@/platform/db/client";
import { withTenant } from "@/platform/tenancy/rls";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

// ─── Periods (Asia/Dubai — GST, fixed UTC+4, no DST) ─────────────────────────

export type ReportPeriod = "today" | "week" | "month";

export const REPORT_PERIODS: ReportPeriod[] = ["today", "week", "month"];

const DUBAI_TZ = "Asia/Dubai";
const DUBAI_OFFSET_MS = 4 * 3600 * 1000;

/** 00:00 Asia/Dubai of `dubaiDate` (a Date whose UTC fields mirror Dubai wall time). */
function dubaiMidnightUtc(dubaiDate: Date): Date {
  return new Date(
    Date.UTC(dubaiDate.getUTCFullYear(), dubaiDate.getUTCMonth(), dubaiDate.getUTCDate()) -
      DUBAI_OFFSET_MS
  );
}

/** [start, end) UTC instants for the period; end = now. */
export function periodRange(period: ReportPeriod, now = new Date()): { start: Date; end: Date } {
  // Dubai wall clock as a UTC-shifted Date.
  const dubaiNow = new Date(now.getTime() + DUBAI_OFFSET_MS);
  let start: Date;
  if (period === "today") {
    start = dubaiMidnightUtc(dubaiNow);
  } else if (period === "week") {
    // Week starts Monday (getUTCDay on the shifted date = Dubai weekday).
    const mondayOffset = (dubaiNow.getUTCDay() + 6) % 7;
    start = new Date(dubaiMidnightUtc(dubaiNow).getTime() - mondayOffset * 24 * 3600 * 1000);
  } else {
    start = new Date(
      Date.UTC(dubaiNow.getUTCFullYear(), dubaiNow.getUTCMonth(), 1) - DUBAI_OFFSET_MS
    );
  }
  return { start, end: now };
}

// ─── Twenty record shapes (only the fields we read) ──────────────────────────

type TwentyOpp = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  stage: string | null;
  ownerId: string | null;
  externalSource: string | null;
  lossReason: string | null;
  lostReason: string | null;
  phoneTail9: string | null;
  callAgentName: string | null;
  /** Tenant-derived brand recorded on the card ("cardiwan" | "easyrent"). */
  brandLine: string | null;
  /** Free-text origin ("Dubizzle · …", "Telegram: Yango …", "Отдел продаж"). */
  callSource: string | null;
};

type TwentyMember = {
  id: string;
  deletedAt: string | null;
  name?: { firstName?: string; lastName?: string };
};

type TwentyTask = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dueAt: string | null;
  status: string | null;
  assigneeId: string | null;
};

// Stage values (live options on the rental workspace, discovered 2026-08-29).
const STAGE_SUCCESS = "COMPLETED"; // "Successful Deal"
const STAGE_LOST = "UNSUCCESSFUL_DEAL"; // "Lost/Unsuccessful"
const STAGE_NEW = "NEW_REQUEST"; // "New Lead"

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  call: "Phone call",
  callgear: "Phone call",
  telegram: "Telegram",
  dubizzle: "Dubizzle",
  yango: "Yango",
  walk_in: "Walk-in",
  unknown: "Unknown / not tracked",
};

/**
 * Where a lead really came from.
 *
 * `externalSource` names the PIPE that carried the card (whatsapp / callgear /
 * telegram) — classifying on it alone buried every Dubizzle enquiry inside
 * "WhatsApp" and every Yango booking inside "Telegram", which is exactly what
 * Ayham asked to separate on 25.08 ("how many leads came from Dubizzle",
 * "Yango leads"). The ORIGIN is written on `callSource`, so that is read first.
 *
 * Order matters: the Yango partnership arrives through a Telegram group, so
 * Yango is checked before Telegram — the partner is the source, Telegram is
 * only the transport. Яндекс.Директ is deliberately NOT Yango: it is a paid ad
 * campaign whose leads arrive as phone calls.
 */
export function classifyLeadSource(
  externalSource: string | null,
  callSource: string | null
): string {
  const s = (callSource ?? "").toLowerCase();
  if (s.includes("dubizzle")) return "dubizzle";
  if (s.includes("yango")) return "yango";
  if (s.includes("telegram")) return "telegram";
  if (/посетител|visitor|walk[- ]?in/.test(s)) return "walk_in";

  switch (externalSource) {
    case "callgear":
      return "call";
    case "whatsapp":
      return "whatsapp";
    case "telegram":
      return "telegram";
    default:
      return externalSource ?? "unknown";
  }
}

// ─── Brands (owner ask 2026-08-30: "which brand performs better") ────────────
//
// Every WhatsApp line except Azat's and Firuz's is a RENT line; those two plus
// the leasing-dept line are the leasing department and are out of scope here.
//
// Base brand = the tenant the line is routed to, because that is what a human
// configured in creds.json and what `opportunity.brandLine` already records —
// deriving it from anything else would make this report and the CRM disagree.
// The pm2 slug is NOT authoritative: `babek-rent-4` is named for Babek
// (EasyRent) but is routed to the `cardiwan` tenant, and the line literally
// named `easyrent` is routed to `cardiwan` too.
//
// The one case a tenant cannot express: ETM shares the `easyrent` tenant, so
// its lines are carved out by name (owner decision — ETM is its own brand for
// comparison, not a part of EasyRent).

export const BRANDS = ["CARDIWAN", "EASYRENT", "ETM"] as const;
export type Brand = (typeof BRANDS)[number];

const BRAND_LABELS: Record<Brand, string> = {
  CARDIWAN: "CarDiwan",
  EASYRENT: "EasyRent",
  ETM: "ETM",
};

const TENANT_TO_BRAND: Record<string, Brand> = {
  cardiwan: "CARDIWAN",
  easyrent: "EASYRENT",
  etm: "ETM",
};

const ETM_LINES = new Set(["mohamed-etm", "Yango & ETM Car Rental"]);

/**
 * Lines whose brand differs from the tenant they are routed to. Owner,
 * 2026-08-31: "Ali is CARDIWAN, he is not easyrent" — his line keeps the
 * `babek-rent-2` slug and the `easyrent` tenant because moving the tenant
 * would make the importer duplicate 8063 archived messages rather than move
 * them (see integrations/twenty/mirror.ts, which carries the same override for
 * the card's own Brand Line field).
 */
const LINE_BRAND_OVERRIDE: Record<string, Brand> = {
  "babek-rent-2": "CARDIWAN", // Ali
};

/** Leasing department — never counted as rent. */
const LEASING_LINES = new Set(["azat-takeauto", "firuz-takeauto", "takeauto-leasing-dept"]);

function brandFor(line: string | null, tenantSlug: string): Brand | null {
  if (line && LEASING_LINES.has(line)) return null;
  if (line && ETM_LINES.has(line)) return "ETM";
  if (line && LINE_BRAND_OVERRIDE[line]) return LINE_BRAND_OVERRIDE[line];
  return TENANT_TO_BRAND[tenantSlug] ?? null;
}

/** Exported for the tests — the brand rule is the thing worth pinning. */
export const brandForLineTest = brandFor;

/** SALES_AGENT_LACK_OF_COMMUNICATION → "Sales agent lack of communication". */
function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// ─── Report shape (consumed by the client component + CSV export) ────────────

export type AgentRow = {
  id: string;
  name: string;
  leads: number;
  contacted: number;
  calls: number;
  successful: number;
  lost: number;
  conversionPct: number | null;
  avgFirstResponseMin: number | null;
  firstResponseCount: number;
  followUpsDone: number;
  followUpsMissed: number;
};

export type SourceRow = {
  source: string;
  label: string;
  leads: number;
  successful: number;
  lost: number;
  successPct: number | null;
};

export type LostReasonRow = { reason: string; label: string; count: number };

export type BrandRow = {
  brand: Brand;
  label: string;
  /** Cards created in the period, attributed to this brand. */
  leads: number;
  successful: number;
  lost: number;
  successPct: number | null;
  /** WhatsApp conversations that STARTED on this brand's lines in the period. */
  conversations: number;
  answered: number;
  answerPct: number | null;
  replies: number;
  avgFirstResponseMin: number | null;
};

export type RentalReport = {
  period: ReportPeriod;
  range: { start: string; end: string };
  generatedAt: string;
  warning: string | null;
  kpis: {
    newLeads: number;
    calls: number;
    whatsappPeople: number;
    successful: number;
    lost: number;
    followUpsDue: number;
    followUpsDone: number;
    avgFirstResponseMin: number | null;
  };
  agents: AgentRow[];
  brands: BrandRow[];
  /**
   * Rent lines seen in the period that no brand rule covers. Surfaced instead
   * of dropped — a silently unmapped line is exactly how activity went missing.
   */
  unmappedLines: { line: string; conversations: number }[];
  sources: SourceRow[];
  lostReasons: LostReasonRow[];
  notes: string[];
};

// ─── Platform DB helpers (RLS: one withTenant transaction per rental tenant) ─

async function rentalTenantIds(): Promise<{ id: string; slug: string }[]> {
  // Root lookup across tenants intentionally runs on the owner connection
  // (same pattern as auth/scope lookups; see platform/tenancy/rls.ts).
  const slugs = (process.env.TWENTY_RENTAL_TENANTS ?? "cardiwan,easyrent,etm")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!slugs.length) return [];
  const res = await pool.query<{ id: string; slug: string }>(
    `select id, slug from tenant where slug = any($1::text[])`,
    [slugs]
  );
  return res.rows;
}

// Digits-only counterparty of a message row: inbound → from_pn (phone), else
// the raw `from` (may be a @lid — still one stable id per person); outbound →
// `to`. Returns NULL when no counterparty is identifiable.
const COUNTERPARTY_SQL = `nullif(right(regexp_replace(
  case
    when direction = 'inbound' then coalesce(nullif(from_pn, ''), "from", '')
    else coalesce(nullif("to", ''), '')
  end, '[^0-9]', '', 'g'), 9), '')`;

/**
 * Group chats are not customers. A `@g.us` JID still yields 9 digits, so
 * without this every marketplace/ops group counted as a person AND as an
 * unanswered conversation — that is what made ETM read 143 "conversations"
 * with an 8% answer rate when 113 of them were groups nobody replies in.
 */
const NOT_A_GROUP = `("from" not like '%@g.us' and coalesce("to", '') not like '%@g.us')`;

type ConvStat = { firstIn: Date; firstOut: Date | null; line: string | null };

type DbStats = {
  calls: number;
  whatsappPeople: number;
  // tail9 → conversation stats for conversations STARTED in the period.
  responses: Map<string, ConvStat>;
  /** line → outbound WhatsApp messages sent on it in the period. */
  repliesByLine: Map<string, number>;
};

async function tenantDbStats(tenantId: string, start: Date, end: Date): Promise<DbStats> {
  return withTenant(tenantId, async (client) => {
    const callsRes = await client.query<{ n: string }>(
      `select count(*)::text as n from call_transcript where created_at >= $1 and created_at < $2`,
      [start.toISOString(), end.toISOString()]
    );
    const peopleRes = await client.query<{ n: string }>(
      `select count(distinct tail9)::text as n from (
         select ${COUNTERPARTY_SQL} as tail9 from message
         where channel = 'whatsapp' and ${NOT_A_GROUP}
           and created_at >= $1 and created_at < $2
       ) t where tail9 is not null`,
      [start.toISOString(), end.toISOString()]
    );
    // First response per conversation: first inbound EVER on this tail9, then
    // the first outbound after it. Only conversations whose first inbound
    // falls inside the period are reported (new conversations of the period).
    // `line` is the receiving line of the conversation's FIRST inbound message
    // (`message."to"` on inbound rows). Outbound rows carry the customer in
    // `to` and no line at all, so the line can only come from the inbound side
    // — that is why it is resolved per conversation and not per message.
    const respRes = await client.query<{
      tail9: string;
      first_in: string;
      first_out: string | null;
      line: string | null;
    }>(
      // Set-based on purpose: the previous shape ran two CORRELATED subqueries
      // per conversation over a materialised CTE of the whole WhatsApp history.
      `with msgs as (
         select ${COUNTERPARTY_SQL} as tail9, direction, created_at,
                case when direction = 'inbound' then nullif("to", '') end as line
         from message where channel = 'whatsapp' and ${NOT_A_GROUP}
       ),
       conv as (
         select tail9, min(created_at) filter (where direction = 'inbound') as first_in
         from msgs where tail9 is not null group by tail9
       ),
       sel as (select tail9, first_in from conv where first_in >= $1 and first_in < $2),
       outs as (
         select s.tail9, min(m.created_at) as first_out
         from sel s
         join msgs m on m.tail9 = s.tail9
           and m.direction = 'outbound' and m.created_at > s.first_in
         group by s.tail9
       ),
       lines as (
         select distinct on (m.tail9) m.tail9, m.line
         from msgs m join sel s on s.tail9 = m.tail9
         where m.line is not null
         order by m.tail9, m.created_at
       )
       select s.tail9, s.first_in, o.first_out, l.line
       from sel s
       left join outs o on o.tail9 = s.tail9
       left join lines l on l.tail9 = s.tail9`,
      [start.toISOString(), end.toISOString()]
    );
    // Replies sent in the period, attributed to the line of the conversation
    // they belong to.
    const repliesRes = await client.query<{ line: string | null; n: string }>(
      // Only conversations that actually got a reply in the window need a line,
      // so the line lookup is restricted to those tails via `distinct on`
      // instead of building an ordered array for every tail9 in history.
      `with msgs as (
         select ${COUNTERPARTY_SQL} as tail9, direction, created_at,
                case when direction = 'inbound' then nullif("to", '') end as line
         from message where channel = 'whatsapp' and ${NOT_A_GROUP}
       ),
       replied as (
         select tail9, count(*) as n
         from msgs
         where direction = 'outbound' and tail9 is not null
           and created_at >= $1 and created_at < $2
         group by tail9
       ),
       conv_line as (
         select distinct on (m.tail9) m.tail9, m.line
         from msgs m join replied r on r.tail9 = m.tail9
         where m.line is not null
         order by m.tail9, m.created_at
       )
       select cl.line, sum(r.n)::text as n
       from replied r join conv_line cl on cl.tail9 = r.tail9
       group by cl.line`,
      [start.toISOString(), end.toISOString()]
    );
    return {
      calls: Number(callsRes.rows[0]?.n ?? 0),
      whatsappPeople: Number(peopleRes.rows[0]?.n ?? 0),
      responses: new Map(
        respRes.rows.map((r) => [
          r.tail9,
          {
            firstIn: new Date(r.first_in),
            firstOut: r.first_out ? new Date(r.first_out) : null,
            line: r.line,
          },
        ])
      ),
      repliesByLine: new Map(
        repliesRes.rows.filter((r) => r.line).map((r) => [r.line!, Number(r.n)])
      ),
    };
  });
}

/**
 * Phone tails whose WhatsApp conversation ever arrived on an ETM line. ETM
 * shares the `easyrent` tenant, so a card's `brandLine` says "easyrent" for
 * both — this set is what separates them.
 */
async function etmPhoneTails(tenantIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const lines = [...ETM_LINES];
  for (const tenantId of tenantIds) {
    const rows = await withTenant(tenantId, async (client) => {
      const res = await client.query<{ tail9: string }>(
        `select distinct ${COUNTERPARTY_SQL} as tail9 from message
          where channel = 'whatsapp' and ${NOT_A_GROUP}
            and direction = 'inbound' and "to" = any($1::text[])`,
        [lines]
      );
      return res.rows;
    });
    for (const r of rows) if (r.tail9) out.add(r.tail9);
  }
  return out;
}

// ─── Main assembly ───────────────────────────────────────────────────────────

export async function buildRentalReport(period: ReportPeriod): Promise<RentalReport> {
  const { start, end } = periodRange(period);

  // ── Twenty rental workspace ──
  const twenty = getTwentyClientForInstance("rental");
  const warning =
    twenty.mode === "mock"
      ? "Twenty rental instance is not configured (TWENTY_RENTAL_API_KEY missing) — CRM metrics show zero."
      : null;

  const [opps, members, tasks, fields] = await Promise.all([
    (async () => {
      const out: TwentyOpp[] = [];
      for await (const o of twenty.listAll<TwentyOpp>("opportunities")) out.push(o);
      return out;
    })(),
    (async () => {
      const out: TwentyMember[] = [];
      for await (const m of twenty.listAll<TwentyMember>("workspaceMembers")) out.push(m);
      return out;
    })(),
    (async () => {
      const out: TwentyTask[] = [];
      for await (const t of twenty.listAll<TwentyTask>("tasks")) out.push(t);
      return out;
    })(),
    twenty.metadata.listFields().catch(() => []),
  ]);

  const liveOpps = opps.filter((o) => !o.deletedAt);
  const cohort = liveOpps.filter((o) => {
    const c = new Date(o.createdAt);
    return c >= start && c < end;
  });
  const liveTasks = tasks.filter((t) => !t.deletedAt);

  const memberName = new Map<string, string>();
  for (const m of members) {
    if (m.deletedAt) continue;
    const name = [m.name?.firstName, m.name?.lastName].filter(Boolean).join(" ").trim();
    memberName.set(m.id, name || "Unknown");
  }
  const agentLabel = (ownerId: string | null): { id: string; name: string } =>
    ownerId && memberName.has(ownerId)
      ? { id: ownerId, name: memberName.get(ownerId)! }
      : { id: "__unassigned", name: "Unassigned" };

  // lossReason labels from live field metadata (fallback: humanized value).
  const lossReasonLabels = new Map<string, string>();
  for (const f of fields) {
    if (f.name !== "lossReason") continue;
    const options = (f as { options?: { value: string; label: string }[] }).options ?? [];
    for (const o of options) lossReasonLabels.set(o.value, o.label);
  }

  // ── Platform DB (per rental tenant, RLS-scoped) ──
  const tenants = await rentalTenantIds();
  const dbStats: DbStats = {
    calls: 0,
    whatsappPeople: 0,
    responses: new Map(),
    repliesByLine: new Map(),
  };
  const tail9Set = new Map<string, ConvStat>();
  // Per (line, tenant) so the brand fold can tell ETM from EasyRent.
  const convsByLine = new Map<string, { tenantSlug: string; convs: ConvStat[] }>();
  const repliesByLine = new Map<string, number>();
  for (const t of tenants) {
    const s = await tenantDbStats(t.id, start, end);
    dbStats.calls += s.calls;
    dbStats.whatsappPeople += s.whatsappPeople; // per-line people; a person on two lines counts twice (noted in UI)
    for (const [tail9, r] of s.responses) {
      tail9Set.set(tail9, r);
      const key = r.line ?? "";
      let bucket = convsByLine.get(key);
      if (!bucket) {
        bucket = { tenantSlug: t.slug, convs: [] };
        convsByLine.set(key, bucket);
      }
      bucket.convs.push(r);
    }
    for (const [line, n] of s.repliesByLine) {
      repliesByLine.set(line, (repliesByLine.get(line) ?? 0) + n);
    }
  }
  dbStats.responses = tail9Set;
  dbStats.repliesByLine = repliesByLine;

  // tail9 → opp owner (from ALL live opps: a conversation in the period may
  // belong to a card opened earlier). Latest card wins.
  const tail9Owner = new Map<string, string | null>();
  for (const o of liveOpps
    .filter((o) => o.phoneTail9)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    tail9Owner.set(o.phoneTail9!, o.ownerId);
  }

  // ── Per-agent aggregation ──
  const agentRows = new Map<string, AgentRow>();
  const responseMinutes = new Map<string, number[]>(); // agentId → response deltas
  const ensureAgent = (key: { id: string; name: string }): AgentRow => {
    let row = agentRows.get(key.id);
    if (!row) {
      row = {
        id: key.id,
        name: key.name,
        leads: 0,
        contacted: 0,
        calls: 0,
        successful: 0,
        lost: 0,
        conversionPct: null,
        avgFirstResponseMin: null,
        firstResponseCount: 0,
        followUpsDone: 0,
        followUpsMissed: 0,
      };
      agentRows.set(key.id, row);
    }
    return row;
  };

  // The roster is every active workspace member (Ayham asked for the whole
  // team — Abdullah, Babek, Ali, himself — plus anyone holding cards), plus a
  // synthetic "Unassigned" row when data lacks an owner. Numbers are
  // per-period; members with no activity show zeros.
  for (const [id, name] of memberName) ensureAgent({ id, name });
  for (const o of liveOpps) ensureAgent(agentLabel(o.ownerId));

  for (const o of cohort) {
    const row = ensureAgent(agentLabel(o.ownerId));
    if (o.externalSource === "callgear") {
      // Call cards: the answering agent is callAgentName (first-name match),
      // falling back to the card owner.
      const first = (o.callAgentName ?? "").trim().split(/\s+/)[0]?.toLowerCase();
      const byName = first
        ? [...memberName.entries()].find(([, n]) => n.split(/\s+/)[0]?.toLowerCase() === first)
        : undefined;
      ensureAgent(byName ? { id: byName[0], name: byName[1] } : agentLabel(o.ownerId)).calls += 1;
      continue; // call cards are not "leads" — counted under Calls only
    }
    row.leads += 1;
    if (o.stage && o.stage !== STAGE_NEW) row.contacted += 1;
    if (o.stage === STAGE_SUCCESS) row.successful += 1;
    if (o.stage === STAGE_LOST) row.lost += 1;
  }

  // First-response times, attributed to the card owner when known.
  const allDeltas: number[] = [];
  for (const [tail9, r] of dbStats.responses) {
    if (!r.firstOut) continue;
    const delta = (r.firstOut.getTime() - r.firstIn.getTime()) / 60000;
    allDeltas.push(delta);
    const owner = tail9Owner.get(tail9);
    const key = agentLabel(owner ?? null);
    const list = responseMinutes.get(key.id) ?? [];
    list.push(delta);
    responseMinutes.set(key.id, list);
    ensureAgent(key);
  }

  // Follow-ups = Twenty tasks (the workspace barely uses them — zeros are real).
  for (const t of liveTasks) {
    const key = agentLabel(t.assigneeId);
    const done = t.status === "DONE";
    if (done && new Date(t.updatedAt) >= start && new Date(t.updatedAt) < end) {
      ensureAgent(key).followUpsDone += 1;
    }
    if (!done && t.dueAt && new Date(t.dueAt) < end) {
      ensureAgent(key).followUpsMissed += 1;
    }
  }

  const agents = [...agentRows.values()]
    .map((row) => {
      const deltas = responseMinutes.get(row.id) ?? [];
      row.firstResponseCount = deltas.length;
      row.avgFirstResponseMin = deltas.length
        ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
        : null;
      row.conversionPct = row.leads > 0 ? Math.round((row.successful / row.leads) * 100) : null;
      return row;
    })
    .sort((a, b) => b.leads - a.leads || b.calls - a.calls || a.name.localeCompare(b.name));

  // ── KPIs ──
  const kpis: RentalReport["kpis"] = {
    newLeads: cohort.filter((o) => o.externalSource !== "callgear").length,
    calls: dbStats.calls,
    whatsappPeople: dbStats.whatsappPeople,
    successful: cohort.filter((o) => o.stage === STAGE_SUCCESS).length,
    lost: cohort.filter((o) => o.stage === STAGE_LOST).length,
    followUpsDue: liveTasks.filter(
      (t) => t.dueAt && new Date(t.dueAt) >= start && new Date(t.dueAt) < end
    ).length,
    followUpsDone: liveTasks.filter(
      (t) => t.status === "DONE" && new Date(t.updatedAt) >= start && new Date(t.updatedAt) < end
    ).length,
    avgFirstResponseMin: allDeltas.length
      ? Math.round(allDeltas.reduce((a, b) => a + b, 0) / allDeltas.length)
      : null,
  };

  // ── Brand breakdown (CarDiwan / EasyRent / ETM) ──
  //
  // Deal side: cards created in the period, attributed by `brandLine`, with ETM
  // carved out of `easyrent` by the customer's phone tail.
  // Activity side: WhatsApp conversations, attributed by the receiving LINE.
  // Leasing lines (Azat, Firuz, leasing-dept) fall out via brandFor → null.
  const etmTails = await etmPhoneTails(tenants.map((t) => t.id));

  const brandAcc = new Map<
    Brand,
    {
      leads: number;
      successful: number;
      lost: number;
      conversations: number;
      answered: number;
      replies: number;
      deltas: number[];
    }
  >();
  for (const b of BRANDS) {
    brandAcc.set(b, {
      leads: 0,
      successful: 0,
      lost: 0,
      conversations: 0,
      answered: 0,
      replies: 0,
      deltas: [],
    });
  }

  for (const o of cohort) {
    if (o.externalSource === "callgear") continue; // call cards are not leads
    const brand =
      o.phoneTail9 && etmTails.has(o.phoneTail9)
        ? "ETM"
        : (TENANT_TO_BRAND[o.brandLine ?? ""] ?? null);
    if (!brand) continue;
    const acc = brandAcc.get(brand)!;
    acc.leads += 1;
    if (o.stage === STAGE_SUCCESS) acc.successful += 1;
    if (o.stage === STAGE_LOST) acc.lost += 1;
  }

  const unmappedLines: RentalReport["unmappedLines"] = [];
  for (const [line, bucket] of convsByLine) {
    const brand = brandFor(line || null, bucket.tenantSlug);
    if (!brand) {
      if (line && !LEASING_LINES.has(line)) {
        unmappedLines.push({ line, conversations: bucket.convs.length });
      }
      continue;
    }
    const acc = brandAcc.get(brand)!;
    acc.conversations += bucket.convs.length;
    for (const c of bucket.convs) {
      if (!c.firstOut) continue;
      acc.answered += 1;
      acc.deltas.push((c.firstOut.getTime() - c.firstIn.getTime()) / 60000);
    }
    acc.replies += dbStats.repliesByLine.get(line) ?? 0;
  }
  unmappedLines.sort((a, b) => b.conversations - a.conversations);

  const brands: BrandRow[] = BRANDS.map((b) => {
    const acc = brandAcc.get(b)!;
    return {
      brand: b,
      label: BRAND_LABELS[b],
      leads: acc.leads,
      successful: acc.successful,
      lost: acc.lost,
      successPct: acc.leads > 0 ? Math.round((acc.successful / acc.leads) * 100) : null,
      conversations: acc.conversations,
      answered: acc.answered,
      answerPct:
        acc.conversations > 0 ? Math.round((acc.answered / acc.conversations) * 100) : null,
      replies: acc.replies,
      avgFirstResponseMin: acc.deltas.length
        ? Math.round(acc.deltas.reduce((x, y) => x + y, 0) / acc.deltas.length)
        : null,
    };
  });

  // ── Lead sources (cohort; call cards are reported under "Phone call") ──
  const sourceRows = new Map<string, SourceRow>();
  for (const o of cohort) {
    const source = classifyLeadSource(o.externalSource, o.callSource);
    let row = sourceRows.get(source);
    if (!row) {
      row = {
        source,
        label: SOURCE_LABELS[source] ?? humanizeEnum(source),
        leads: 0,
        successful: 0,
        lost: 0,
        successPct: null,
      };
      sourceRows.set(source, row);
    }
    row.leads += 1;
    if (o.stage === STAGE_SUCCESS) row.successful += 1;
    if (o.stage === STAGE_LOST) row.lost += 1;
  }
  const sources = [...sourceRows.values()]
    .map((r) => ({ ...r, successPct: r.leads > 0 ? Math.round((r.successful / r.leads) * 100) : null }))
    .sort((a, b) => b.leads - a.leads);

  // ── Lost deals by reason (cohort, current stage Lost) ──
  const reasonRows = new Map<string, LostReasonRow>();
  for (const o of cohort) {
    if (o.stage !== STAGE_LOST) continue;
    const reason = o.lossReason ?? o.lostReason ?? "UNKNOWN";
    let row = reasonRows.get(reason);
    if (!row) {
      row = {
        reason,
        label:
          reason === "UNKNOWN"
            ? "No reason recorded"
            : (lossReasonLabels.get(reason) ?? humanizeEnum(reason)),
        count: 0,
      };
      reasonRows.set(reason, row);
    }
    row.count += 1;
  }
  const lostReasons = [...reasonRows.values()].sort((a, b) => b.count - a.count);

  return {
    period,
    range: { start: start.toISOString(), end: end.toISOString() },
    generatedAt: new Date().toISOString(),
    warning,
    kpis,
    agents,
    brands,
    unmappedLines,
    sources,
    lostReasons,
    notes: [
      "Brand = the WhatsApp line the conversation arrived on. ETM shares the EasyRent tenant, so ETM's lines (mohamed-etm, Yango & ETM) are split out by name. Azat's and Firuz's lines are the leasing department and are excluded.",
      "Brand conversations = customer conversations that STARTED in the period on that brand's lines; replies = outbound messages sent in those conversations.",
      "All times Asia/Dubai. New leads / successful / lost are the CURRENT stage of cards created in the period (Twenty has no reliable stage-change timestamps).",
      "Contacted = card moved past “New Lead” (current stage).",
      "Calls = CallGear calls transcribed into the platform DB; per-agent calls = call cards in Twenty, attributed by the answering agent's name.",
      "WhatsApp people = distinct customer phone numbers with any message in the period (a person messaging two brand lines counts once per line). Group chats are excluded — they are ops/marketplace groups, not customers.",
      "First response = first reply of any kind (agent or automation) after a new customer's first WhatsApp message; only conversations started in the period.",
      "Follow-ups = Twenty tasks (due / done / overdue). The workspace barely uses tasks — zeros are real, not missing data.",
      "Lead source = where the enquiry actually came from, read off the card's origin text: Dubizzle and Yango are separated from plain WhatsApp/Telegram (Telegram only carries the Yango group — the partner is the source). Яндекс.Директ is an ad campaign whose leads arrive as calls, so it counts under Phone call.",
    ],
  };
}

// ─── Short-lived cache ───────────────────────────────────────────────────────
//
// The Twenty client holds a 100-req/min token bucket per workspace, and one
// report drains a large slice of it (opportunities paginate). Measured on the
// box 2026-08-30: the first weekly build took 1.6s, the second and third 7.1s
// each — the extra time was the limiter sleeping, not the database. Worse, the
// budget it burns is the SAME budget the staff's Twenty UI spends.
//
// A manager flipping Today / This week / This month re-fetches every time, so
// a minute of memory removes almost all of that. `generatedAt` already travels
// in the payload, so the page always shows how fresh the numbers are.
const REPORT_TTL_MS = 60_000;

const reportCache = new Map<ReportPeriod, { at: number; report: RentalReport }>();

/** Testable: the cache decision on its own. */
export function reportCacheIsFresh(cachedAt: number, now: number): boolean {
  return now - cachedAt < REPORT_TTL_MS;
}

/** What the API route should call — `buildRentalReport` behind the TTL. */
export async function getRentalReport(period: ReportPeriod): Promise<RentalReport> {
  const hit = reportCache.get(period);
  if (hit && reportCacheIsFresh(hit.at, Date.now())) return hit.report;
  const report = await buildRentalReport(period);
  reportCache.set(period, { at: Date.now(), report });
  return report;
}
