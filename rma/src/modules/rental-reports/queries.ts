/**
 * queries.ts — read-only metric queries + assembly for the RENTAL reports page.
 *
 * Time model (documented in docs/twenty-rental-reports-2026-08-28.md):
 *  - Dubai is UTC+4 with no DST; all window bounds are computed as absolute
 *    UTC instants of Dubai midnight.
 *  - "Cohort" metrics (leads / contacted / successful / follow-up / lost /
 *    funnel / source / lost-reason / per-agent) filter on
 *    `opportunity.createdAt` and read the CURRENT stage — a lead-cohort
 *    snapshot. Twenty has no populated close timestamp (closeDate is empty and
 *    the _stageEvent object mixes enum + label values), so "successful this
 *    week" is defined as "a lead created this week that is now Successful".
 *  - "Activity" metrics (calls, WhatsApp-contacted people, response time,
 *    unanswered) filter on the activity's OWN timestamp, independent of when
 *    the lead was created.
 */
import {
  CONTACTED_STAGES,
  FOLLOWUP_DELAYED_DAYS,
  FOLLOWUP_MISSED_DAYS,
  LOSS_REASON_LABELS,
  LINE_TO_AGENT,
  OTHER_AGENT_LABEL,
  RENTAL_SCHEMA,
  RENTAL_TENANT_SLUGS,
  SOURCE_BUCKETS,
  SOURCE_LABELS,
  STAGE,
  classifyCallSource,
  type SourceBucket,
} from "./constants";
import { queryPlatform, queryRental } from "./sql";

// ─── Window resolution ──────────────────────────────────────────────────────

export type WindowKind = "today" | "week" | "month" | "range";

export interface ReportWindow {
  from: Date; // inclusive
  to: Date; // exclusive
  label: string;
  kind: WindowKind;
}

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000; // UTC+4, no DST

/** UTC instant of Dubai-midnight for a given Dubai calendar date. */
function dubaiMidnight(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - DUBAI_OFFSET_MS);
}

/** The box runs on +04, so local date components ARE the Dubai date. */
function dubaiToday(): { y: number; m: number; d: number } {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}

function parseDateOnly(s: string | undefined): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const probe = new Date(Date.UTC(y, mo, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo || probe.getUTCDate() !== d) {
    return null; // invalid calendar date (e.g. 2026-02-31)
  }
  return { y, m: mo, d };
}

export function resolveWindow(params: {
  window?: string;
  from?: string;
  to?: string;
}): ReportWindow {
  const t = dubaiToday();
  if (params.window === "week") {
    const from = dubaiMidnight(t.y, t.m, t.d - 6);
    return { from, to: dubaiMidnight(t.y, t.m, t.d + 1), label: "Last 7 days", kind: "week" };
  }
  if (params.window === "month") {
    const from = dubaiMidnight(t.y, t.m, t.d - 29);
    return { from, to: dubaiMidnight(t.y, t.m, t.d + 1), label: "Last 30 days", kind: "month" };
  }
  const fromD = parseDateOnly(params.from);
  const toD = parseDateOnly(params.to);
  if (fromD && toD) {
    const from = dubaiMidnight(fromD.y, fromD.m, fromD.d);
    const to = dubaiMidnight(toD.y, toD.m, toD.d + 1); // inclusive end
    const label = `${params.from} → ${params.to}`;
    return { from, to, label, kind: "range" };
  }
  // default: today
  const from = dubaiMidnight(t.y, t.m, t.d);
  return { from, to: dubaiMidnight(t.y, t.m, t.d + 1), label: "Today", kind: "today" };
}

const lit = (d: Date) => `'${d.toISOString()}'`;

// ─── SQL row shapes ─────────────────────────────────────────────────────────

interface OppRow {
  id: string;
  created_at: string;
  updated_at: string;
  stage: string;
  owner_id: string | null;
  owner_first: string;
  owner_last: string;
  owner_email: string | null;
  call_started_at: string | null;
  call_agent_name: string | null;
  call_source: string | null;
  loss_reason: string | null;
  amount_aed: number;
}

interface AgentRow {
  id: string;
  first: string;
  last: string;
  email: string | null;
}

interface StageEventRow {
  opp_id: string | null;
  from_stage: string | null;
  to_stage: string | null;
  changed_at: string | null;
}

interface RespRow {
  line: string;
  responded: number;
  avg_seconds: number;
}

interface LineActivityRow {
  line: string;
  outbound_threads: number;
  outbound_msgs: number;
}

// ─── SQL builders ───────────────────────────────────────────────────────────

const S = RENTAL_SCHEMA;
const slugs = RENTAL_TENANT_SLUGS.map((s) => `'${s}'`).join(",");

function opportunitiesSql(from: Date, to: Date): string {
  return `
    SELECT o.id,
           o."createdAt" AS created_at,
           o."updatedAt" AS updated_at,
           o.stage,
           o."ownerId" AS owner_id,
           COALESCE(wm."nameFirstName", '') AS owner_first,
           COALESCE(wm."nameLastName", '') AS owner_last,
           wm."userEmail" AS owner_email,
           o."callStartedAt" AS call_started_at,
           o."callAgentName" AS call_agent_name,
           o."callSource" AS call_source,
           o."lossReason" AS loss_reason,
           ROUND(COALESCE(o."amountAmountMicros", 0)::numeric / 1000000.0, 2) AS amount_aed
    FROM ${S}.opportunity o
    LEFT JOIN ${S}."workspaceMember" wm ON wm.id = o."ownerId"
    WHERE o."deletedAt" IS NULL
      AND o."createdAt" >= ${lit(from)} AND o."createdAt" < ${lit(to)}
    ORDER BY o."createdAt"
  `;
}

function agentsSql(): string {
  return `
    SELECT wm.id,
           COALESCE(wm."nameFirstName", '') AS first,
           COALESCE(wm."nameLastName", '') AS last,
           wm."userEmail" AS email
    FROM ${S}."workspaceMember" wm
    WHERE wm."deletedAt" IS NULL
    ORDER BY wm."nameFirstName"
  `;
}

function stageEventsSql(): string {
  return `
    SELECT se."opportunityId" AS opp_id,
           se."fromStage" AS from_stage,
           se."toStage" AS to_stage,
           se."changedAt" AS changed_at
    FROM ${S}."_stageEvent" se
    ORDER BY se."changedAt"
  `;
}

function callsSql(from: Date, to: Date): string {
  return `
    SELECT COALESCE("callAgentName", '') AS agent, count(*) AS calls
    FROM ${S}.opportunity
    WHERE "deletedAt" IS NULL
      AND "callStartedAt" >= ${lit(from)} AND "callStartedAt" < ${lit(to)}
    GROUP BY "callAgentName"
  `;
}

function responseTimeSql(from: Date, to: Date): string {
  return `
    WITH msgs AS (
      SELECT m."from" AS thread,
             m.direction,
             m.created_at,
             CASE WHEN m.direction = 'inbound' THEN m."to" END AS line
      FROM message m
      JOIN tenant t ON t.id = m.tenant_id
      WHERE t.slug IN (${slugs})
        AND m.channel = 'whatsapp'
        AND m.created_at >= ${lit(from)} AND m.created_at < ${lit(to)}
    ),
    fi AS (
      SELECT thread, min(created_at) AS first_in, min(line) AS line
      FROM msgs WHERE direction = 'inbound' GROUP BY thread
    ),
    fo AS (
      SELECT fi.thread, fi.line, fi.first_in, min(m.created_at) AS first_out
      FROM fi
      JOIN msgs m ON m.thread = fi.thread
        AND m.direction = 'outbound' AND m.created_at > fi.first_in
      GROUP BY fi.thread, fi.line, fi.first_in
    )
    SELECT COALESCE(line, '') AS line,
           count(*) AS responded,
           round(avg(EXTRACT(EPOCH FROM (first_out - first_in))), 1) AS avg_seconds
    FROM fo
    GROUP BY line
    ORDER BY responded DESC
  `;
}

function lineActivitySql(from: Date, to: Date): string {
  return `
    WITH msgs AS (
      SELECT m."from" AS thread,
             m.direction,
             m.created_at,
             CASE WHEN m.direction = 'inbound' THEN m."to" END AS line
      FROM message m
      JOIN tenant t ON t.id = m.tenant_id
      WHERE t.slug IN (${slugs})
        AND m.channel = 'whatsapp'
        AND m.created_at >= ${lit(from)} AND m.created_at < ${lit(to)}
    ),
    thread_line AS (
      SELECT thread, min(line) AS line
      FROM msgs WHERE direction = 'inbound' GROUP BY thread
    )
    SELECT COALESCE(tl.line, '') AS line,
           count(DISTINCT m.thread) FILTER (
             WHERE m.direction = 'outbound' AND m.thread NOT LIKE '%@g.us'
           ) AS outbound_threads,
           count(*) FILTER (WHERE m.direction = 'outbound') AS outbound_msgs
    FROM thread_line tl
    JOIN msgs m ON m.thread = tl.thread
    GROUP BY tl.line
  `;
}

function whatsappPeopleSql(from: Date, to: Date): string {
  return `
    SELECT count(DISTINCT m."to") AS contacted
    FROM message m
    JOIN tenant t ON t.id = m.tenant_id
    WHERE t.slug IN (${slugs})
      AND m.channel = 'whatsapp'
      AND m.direction = 'outbound'
      AND m."to" ~ '^[0-9]{7,15}$'
      AND m.created_at >= ${lit(from)} AND m.created_at < ${lit(to)}
  `;
}

function unansweredSql(from: Date): string {
  return `
    WITH msgs AS (
      SELECT m."from" AS thread, m.direction, m.created_at
      FROM message m
      JOIN tenant t ON t.id = m.tenant_id
      WHERE t.slug IN (${slugs})
        AND m.channel = 'whatsapp'
        AND m.created_at >= ${lit(from)}
    ),
    inbound AS (
      SELECT thread, max(created_at) AS last_in
      FROM msgs WHERE direction = 'inbound' GROUP BY thread
    ),
    answered AS (
      SELECT DISTINCT i.thread
      FROM inbound i
      JOIN msgs m ON m.thread = i.thread
        AND m.direction = 'outbound' AND m.created_at > i.last_in
    )
    SELECT (SELECT count(*) FROM inbound) AS inbound_threads,
           (SELECT count(*) FROM answered) AS answered_threads
  `;
}

// ─── Report types ───────────────────────────────────────────────────────────

export interface SourceBreakdown {
  source: SourceBucket;
  label: string;
  leads: number;
  deals: number;
  conversion: number | null;
  revenueAed: number;
}

export interface AgentMetric {
  name: string;
  email: string | null;
  leads: number;
  contacted: number;
  followUps: number;
  successful: number;
  lost: number;
  conversion: number | null;
  calls: number;
  whatsappPeople: number;
  avgResponseMinutes: number | null;
  followUpOnTime: number;
  followUpDelayed: number;
  followUpMissed: number;
}

export interface LostReasonRow {
  reason: string;
  label: string;
  count: number;
}

export interface RentalReport {
  window: ReportWindow;
  generatedAt: string;
  digest: {
    leadsToday: number;
    unansweredToday: number;
    answeredToday: number;
  };
  totals: {
    leads: number;
    calls: number;
    whatsappPeople: number;
    contacted: number;
    successful: number;
    followUps: number;
    lost: number;
  };
  funnel: {
    leads: number;
    contacted: number;
    lost: number;
    successful: number;
    conversion: number | null;
  };
  sources: SourceBreakdown[];
  agents: AgentMetric[];
  lostReasons: LostReasonRow[];
  lostReasonsByAgent: { agent: string; reason: string; label: string; count: number }[];
}

// ─── Aggregation helpers ────────────────────────────────────────────────────

function agentDisplayName(row: AgentRow): string {
  const first = row.first.trim();
  const last = row.last.trim();
  if (first && last) return `${first} ${last}`;
  return first || last || (row.email ?? "Unassigned");
}

function callAgentFirstName(full: string | null): string {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
}

function ownerName(o: OppRow): string {
  const first = o.owner_first.trim();
  const last = o.owner_last.trim();
  if (first && last) return `${first} ${last}`;
  return first || last || "Unassigned";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Assembly ───────────────────────────────────────────────────────────────

export async function buildReport(params: {
  window?: string;
  from?: string;
  to?: string;
}): Promise<RentalReport> {
  const window = resolveWindow(params);

  const [opps, agents, events, callRows, respRows, lineRows, waPeopleRows, unansweredRows] =
    await Promise.all([
      queryRental<OppRow>(opportunitiesSql(window.from, window.to)),
      queryRental<AgentRow>(agentsSql()),
      queryRental<StageEventRow>(stageEventsSql()),
      queryRental<{ agent: string; calls: number }>(callsSql(window.from, window.to)),
      queryPlatform<RespRow>(responseTimeSql(window.from, window.to)),
      queryPlatform<LineActivityRow>(lineActivitySql(window.from, window.to)),
      queryPlatform<{ contacted: number }>(whatsappPeopleSql(window.from, window.to)),
      queryPlatform<{ inbound_threads: number; answered_threads: number }>(
        unansweredSql(window.from)
      ),
    ]);

  // Stage-event index: the last time each opportunity entered Follow-up, used
  // to compute follow-up age (on-time / delayed / missed). "Completed" is not
  // yet measurable — the canonical followUpCount/stageChangedAt automation
  // fields are unpopulated and _stageEvent predates the enum rename (its
  // fromStage never carries the current Follow-up value).
  const enteredFollowUp = new Map<string, number>();
  for (const ev of events) {
    if (!ev.opp_id) continue;
    const at = ev.changed_at ? Date.parse(ev.changed_at) : 0;
    if (ev.to_stage === STAGE.FOLLOW_UP && at) {
      if (at > (enteredFollowUp.get(ev.opp_id) ?? 0)) enteredFollowUp.set(ev.opp_id, at);
    }
  }
  const nowMs = Date.now();

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = {
    leads: opps.length,
    calls: callRows.reduce((sum, r) => sum + Number(r.calls ?? 0), 0),
    whatsappPeople: Number(waPeopleRows[0]?.contacted ?? 0),
    contacted: opps.filter((o) => CONTACTED_STAGES.includes(o.stage)).length,
    successful: opps.filter((o) => o.stage === STAGE.SUCCESSFUL).length,
    followUps: opps.filter((o) => o.stage === STAGE.FOLLOW_UP).length,
    lost: opps.filter((o) => o.stage === STAGE.LOST).length,
  };

  // ── Funnel ────────────────────────────────────────────────────────────────
  const funnel = {
    leads: totals.leads,
    contacted: totals.contacted,
    lost: totals.lost,
    successful: totals.successful,
    conversion: totals.leads > 0 ? (totals.successful / totals.leads) * 100 : null,
  };

  // ── Lead-source breakdown ─────────────────────────────────────────────────
  const sourceMap = new Map<SourceBucket, { leads: number; deals: number; revenue: number }>();
  for (const b of SOURCE_BUCKETS) sourceMap.set(b, { leads: 0, deals: 0, revenue: 0 });
  for (const o of opps) {
    const bucket = classifyCallSource(o.call_source);
    const cur = sourceMap.get(bucket)!;
    cur.leads += 1;
    if (o.stage === STAGE.SUCCESSFUL) {
      cur.deals += 1;
      cur.revenue += Number(o.amount_aed ?? 0);
    }
  }
  const sources: SourceBreakdown[] = SOURCE_BUCKETS.map((b) => {
    const cur = sourceMap.get(b)!;
    return {
      source: b,
      label: SOURCE_LABELS[b],
      leads: cur.leads,
      deals: cur.deals,
      conversion: cur.leads > 0 ? (cur.deals / cur.leads) * 100 : null,
      revenueAed: round2(cur.revenue),
    };
  });

  // ── Lost reasons ──────────────────────────────────────────────────────────
  const lostOpps = opps.filter((o) => o.stage === STAGE.LOST);
  const reasonCounts = new Map<string, number>();
  for (const o of lostOpps) {
    const r = o.loss_reason ?? "(none)";
    reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
  }
  const lostReasons: LostReasonRow[] = [...reasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: LOSS_REASON_LABELS[reason] ?? reason,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const lostByOwner = new Map<string, Map<string, number>>();
  for (const o of lostOpps) {
    const name = ownerName(o);
    let reasons = lostByOwner.get(name);
    if (!reasons) {
      reasons = new Map();
      lostByOwner.set(name, reasons);
    }
    const r = o.loss_reason ?? "(none)";
    reasons.set(r, (reasons.get(r) ?? 0) + 1);
  }
  const lostReasonsByAgent: RentalReport["lostReasonsByAgent"] = [];
  for (const [name, reasons] of [...lostByOwner.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    for (const [reason, count] of reasons) {
      lostReasonsByAgent.push({
        agent: name,
        reason,
        label: LOSS_REASON_LABELS[reason] ?? reason,
        count,
      });
    }
  }

  // ── Per-agent metrics ─────────────────────────────────────────────────────
  const callsByAgent = new Map<string, number>();
  for (const c of callRows) {
    const first = callAgentFirstName(c.agent);
    if (first) callsByAgent.set(first, (callsByAgent.get(first) ?? 0) + Number(c.calls ?? 0));
  }

  // Response time + WhatsApp attribution, both keyed by LINE, folded to agent
  // first name via LINE_TO_AGENT.
  const respByAgent = new Map<string, { n: number; sumSeconds: number }>();
  for (const r of respRows) {
    const agent = LINE_TO_AGENT[r.line] ?? OTHER_AGENT_LABEL;
    const n = Number(r.responded ?? 0);
    const avg = Number(r.avg_seconds ?? 0);
    if (!n) continue;
    const cur = respByAgent.get(agent) ?? { n: 0, sumSeconds: 0 };
    cur.n += n;
    cur.sumSeconds += avg * n;
    respByAgent.set(agent, cur);
  }
  const whatsappByAgent = new Map<string, number>();
  for (const r of lineRows) {
    const agent = LINE_TO_AGENT[r.line];
    if (!agent) continue;
    const threads = Number(r.outbound_threads ?? 0);
    whatsappByAgent.set(agent, (whatsappByAgent.get(agent) ?? 0) + threads);
  }

  const oppsByOwner = new Map<string, OppRow[]>();
  for (const o of opps) {
    const key = o.owner_id ?? "__none__";
    const arr = oppsByOwner.get(key);
    if (arr) arr.push(o);
    else oppsByOwner.set(key, [o]);
  }

  function metricsFor(owned: OppRow[], first: string): Omit<AgentMetric, "name" | "email"> {
    const leads = owned.length;
    const successful = owned.filter((o) => o.stage === STAGE.SUCCESSFUL).length;
    const lost = owned.filter((o) => o.stage === STAGE.LOST).length;
    const followUps = owned.filter((o) => o.stage === STAGE.FOLLOW_UP).length;

    let followUpDelayed = 0;
    let followUpMissed = 0;
    for (const o of owned) {
      if (o.stage !== STAGE.FOLLOW_UP) continue;
      const entered =
        enteredFollowUp.get(o.id) ?? (Date.parse(o.updated_at) || nowMs);
      const ageDays = (nowMs - entered) / (24 * 3600 * 1000);
      if (ageDays > FOLLOWUP_MISSED_DAYS) followUpMissed += 1;
      else if (ageDays > FOLLOWUP_DELAYED_DAYS) followUpDelayed += 1;
    }

    const resp = respByAgent.get(first);
    return {
      leads,
      contacted: owned.filter((o) => CONTACTED_STAGES.includes(o.stage)).length,
      followUps,
      successful,
      lost,
      conversion: leads > 0 ? (successful / leads) * 100 : null,
      calls: callsByAgent.get(first) ?? 0,
      whatsappPeople: whatsappByAgent.get(first) ?? 0,
      avgResponseMinutes: resp ? round1(resp.sumSeconds / resp.n / 60) : null,
      followUpOnTime: followUps - followUpDelayed - followUpMissed,
      followUpDelayed,
      followUpMissed,
    };
  }

  const agentMetrics: AgentMetric[] = agents.map((a) => ({
    name: agentDisplayName(a),
    email: a.email,
    ...metricsFor(oppsByOwner.get(a.id) ?? [], a.first.trim()),
  }));

  const unassigned = oppsByOwner.get("__none__") ?? [];
  if (unassigned.length) {
    agentMetrics.push({
      name: "Unassigned",
      email: null,
      ...metricsFor(unassigned, "Unassigned"),
    });
  }

  agentMetrics.sort((a, b) => b.leads - a.leads);

  // ── Manager digest (today) ────────────────────────────────────────────────
  const todayWindow = resolveWindow({});
  const todayOpps = await queryRental<{ id: string }>(
    opportunitiesSql(todayWindow.from, todayWindow.to)
  );
  const unans = unansweredRows[0];
  const digest = {
    leadsToday: todayOpps.length,
    unansweredToday: Number(unans?.inbound_threads ?? 0) - Number(unans?.answered_threads ?? 0),
    answeredToday: Number(unans?.answered_threads ?? 0),
  };

  return {
    window,
    generatedAt: new Date().toISOString(),
    digest,
    totals,
    funnel,
    sources,
    agents: agentMetrics,
    lostReasons,
    lostReasonsByAgent,
  };
}
