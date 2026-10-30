-- ============================================================================
-- funnel_and_ledger.sql
-- ----------------------------------------------------------------------------
-- SCAFFOLDING FOR HUMAN REVIEW — ANALYZE-ONLY STAGE.
--
-- Reproduces Mohammed's daily sales-funnel KPI board (PLAN vs FACT vs %) and a
-- monthly closed-sales ledger, entirely inside the platform. Bitrix is a
-- peripheral engine; the platform is the source of truth. Nothing here reads
-- Bitrix — FACT is computed from platform tables that a projection worker fills
-- from `integration_event`.
--
-- WHAT THIS FILE DEFINES
--   1. Source-table SHIMS (CREATE TABLE IF NOT EXISTS) for the four tables the
--      funnel needs but that are NOT yet in the Drizzle schema:
--          deal_stage_history, call_activity, activity, kpi_plan
--      These are written so a human reviewer can (a) see the exact shape the
--      view depends on and (b) promote them into `src/platform/db/schema.ts`
--      via `tenantTable()`. They mirror the tenant-isolation contract used by
--      every other tenant table (see tenant-table.ts). Delete the shim block
--      once the columns exist in the real schema.
--   2. funnel_daily         — MATERIALIZED VIEW: per manager, per day, per
--                             source: PLAN / FACT / DIF for every funnel metric,
--                             plus the six stage-to-stage conversion ratios.
--   3. sales_ledger_monthly — MATERIALIZED VIEW: per manager, per source, per
--                             car, per closed deal, per month: prepayment,
--                             contract value, with deal_id drill-through.
--   4. Refresh helpers + tenant-safe wrapper views (matviews cannot carry RLS,
--      so a security_barrier view re-applies the tenant predicate).
--
-- MULTI-TENANCY
--   Every base table carries tenant_id. Materialized views in Postgres 16 do
--   NOT honour RLS on their base tables (the matview is owned by the migration
--   role and its contents are frozen at REFRESH time). Therefore:
--     * Both matviews keep tenant_id in the grain and in every unique index.
--     * Read access for the app goes THROUGH the `*_secure` wrapper views,
--       which are `security_barrier` and filter
--           tenant_id = current_setting('app.tenant_id', true)::uuid
--       — the exact predicate from platform/db/tenant-table.ts (TENANT_PREDICATE).
--     * The app_runtime role is granted SELECT on the wrappers only, never on
--       the raw matviews. This preserves tenant isolation for a NOBYPASSRLS
--       role that does `SET LOCAL app.tenant_id` per transaction.
--
-- MANAGERS
--   The board tracks five named managers: Mohammad, Nikita, Movladi, Azat,
--   Firuz. We DO NOT hard-code them into the view logic (that would break the
--   moment a manager joins/leaves and violates multi-tenancy — other tenants
--   have other managers). Instead the manager is resolved from the deal/activity
--   owner via the `user` table, and the KPI PLAN is matched per (tenant, manager,
--   day, metric, source) from `kpi_plan`. A human reviewer can add a tenant-level
--   allow-list later if a fixed board ordering is required for TAKE Auto only.
--
-- REFRESH
--   REFRESH MATERIALIZED VIEW CONCURRENTLY <name>;  (unique index required —
--   provided below). Schedule via pg_cron on Hetzner or a recurring pg-boss job
--   on Neon, matching drizzle/0013_materialized_views.sql. FACT for "today" is
--   only as fresh as the last refresh — document this to the dashboard owner.
--
-- IDEMPOTENCY
--   All DDL is guarded (IF NOT EXISTS / OR REPLACE / DROP … IF EXISTS) so this
--   file can be re-applied. Matviews are dropped-and-recreated because Postgres
--   cannot ALTER a matview's SELECT in place.
-- ============================================================================


-- ############################################################################
-- SECTION 0 — SOURCE-TABLE SHIMS  (REVIEW: promote into Drizzle schema)
-- ----------------------------------------------------------------------------
-- These four tables are consumed by the funnel but are not yet in schema.ts.
-- They are declared here so this file is self-contained and executable against
-- a fresh database for review/prototyping. Each one:
--   * carries tenant_id uuid NOT NULL,
--   * enables + forces RLS with the canonical tenant-isolation policy,
--   * indexes the columns the view joins/filters on.
-- Once the real Drizzle migrations add them via tenantTable(), DELETE Section 0.
-- ############################################################################

-- 0.1 deal_stage_history — one row per stage transition of a deal.
--     Source of every "moved into stage X on day D" FACT (leads qualified,
--     meeting scheduled, meeting held, security-service check, sold).
--     A projection worker appends a row whenever deal.stage changes; the
--     existing deal_history trigger (drizzle/0012) captures column-level diffs,
--     but the funnel needs an explicit, queryable stage timeline, hence a
--     first-class table rather than parsing deal_history.
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  deal_id      uuid NOT NULL,               -- FK -> deal.id
  from_stage   text,                        -- NULL on the first (creation) row
  to_stage     text NOT NULL,               -- canonical stage key (see mapping below)
  moved_by     uuid,                        -- FK -> "user".id (manager who moved it)
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deal_stage_history_tenant_isolation ON deal_stage_history;
CREATE POLICY deal_stage_history_tenant_isolation ON deal_stage_history
  AS PERMISSIVE FOR ALL
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS deal_stage_history_tenant_deal_idx
  ON deal_stage_history (tenant_id, deal_id, occurred_at);
CREATE INDEX IF NOT EXISTS deal_stage_history_tenant_stage_day_idx
  ON deal_stage_history (tenant_id, to_stage, occurred_at);


-- 0.2 call_activity — one row per outbound/inbound call (CallGear projection).
--     Source of the "Number of calls" FACT.
CREATE TABLE IF NOT EXISTS call_activity (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  deal_id      uuid,                         -- FK -> deal.id (nullable: cold call)
  agent_id     uuid,                         -- FK -> "user".id (manager on the call)
  direction    text NOT NULL DEFAULT 'out',  -- out | in
  status       text,                         -- answered | missed | busy | ...
  duration_sec integer NOT NULL DEFAULT 0,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  external_id  text,                         -- CallGear call id
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE call_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_activity FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS call_activity_tenant_isolation ON call_activity;
CREATE POLICY call_activity_tenant_isolation ON call_activity
  AS PERMISSIVE FOR ALL
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS call_activity_tenant_agent_day_idx
  ON call_activity (tenant_id, agent_id, occurred_at);
CREATE INDEX IF NOT EXISTS call_activity_tenant_deal_idx
  ON call_activity (tenant_id, deal_id);


-- 0.3 activity — generic CRM activity (meetings, security-service checks, etc.).
--     Named `activity` (singular) to match Bitrix crm.activity.list projection
--     wording used in src/platform/jobs/bitrix-discovery.ts. Source of
--     "Meetings scheduled", "Meetings held" and "Security-Service checks" FACT.
CREATE TABLE IF NOT EXISTS activity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  deal_id       uuid,                        -- FK -> deal.id
  owner_id      uuid,                        -- FK -> "user".id (manager)
  kind          text NOT NULL,              -- meeting | security_service | note | ...
  status        text NOT NULL DEFAULT 'planned', -- planned | done | cancelled
  scheduled_at  timestamptz,                 -- when the activity is/was planned for
  completed_at  timestamptz,                 -- when it was actually held/done
  outcome       text,                        -- pass | fail | ... (for security_service)
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_tenant_isolation ON activity;
CREATE POLICY activity_tenant_isolation ON activity
  AS PERMISSIVE FOR ALL
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE INDEX IF NOT EXISTS activity_tenant_owner_kind_idx
  ON activity (tenant_id, owner_id, kind);
CREATE INDEX IF NOT EXISTS activity_tenant_kind_sched_idx
  ON activity (tenant_id, kind, scheduled_at);
CREATE INDEX IF NOT EXISTS activity_tenant_kind_done_idx
  ON activity (tenant_id, kind, completed_at);


-- 0.4 kpi_plan — the PLAN side of the board. One row per
--     (tenant, manager, day, metric [, source]) with a numeric target.
--     `metric` is a canonical key (see METRIC KEYS below). `source` is optional:
--     NULL means the plan is for all sources combined; a value pins the plan to
--     one lead source. Mohammed edits these; the platform stores them.
CREATE TABLE IF NOT EXISTS kpi_plan (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  manager_id   uuid NOT NULL,               -- FK -> "user".id
  plan_day     date NOT NULL,
  metric       text NOT NULL,               -- see METRIC KEYS
  source       text,                        -- NULL = all sources
  target_value numeric(14,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kpi_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_plan FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS kpi_plan_tenant_isolation ON kpi_plan;
CREATE POLICY kpi_plan_tenant_isolation ON kpi_plan
  AS PERMISSIVE FOR ALL
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- One target per (tenant, manager, day, metric, source). COALESCE(source,'') so
-- the "all sources" (NULL) row is uniquely constrained alongside per-source rows.
CREATE UNIQUE INDEX IF NOT EXISTS kpi_plan_unique_target_idx
  ON kpi_plan (tenant_id, manager_id, plan_day, metric, COALESCE(source, ''));


-- ############################################################################
-- METRIC KEYS  (shared vocabulary between kpi_plan.metric and the FACT CTEs)
-- ----------------------------------------------------------------------------
--   leads              — LEADS created
--   leads_qualified    — Leads qualified
--   calls              — Number of calls
--   meetings_scheduled — Meetings scheduled
--   meetings_held      — Meetings held
--   ss_checks          — Security-Service checks
--   sales              — Sold cars
--   prepayment_sum     — Prepayment Sum (AED)
--   contract_value     — Contract Value (AED)
--
-- STAGE MAPPING (deal_stage_history.to_stage -> funnel milestone)
--   The platform deal.stage vocabulary (schema.ts) is:
--     inquiry | quote | contract | handover | closed
--   Bitrix stages are richer. The funnel maps them to milestones below. This
--   mapping is the ONE place a reviewer tunes to Mohammed's actual pipeline.
--   Adjust the string sets in fn_stage_is_* below to match production stages.
-- ############################################################################

-- Helper: immutable stage-classification predicates. Centralised so the two
-- matviews agree and a reviewer edits stage names in exactly one place.
CREATE OR REPLACE FUNCTION funnel_stage_is_qualified(stage text)
  RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT lower(stage) = ANY (ARRAY['qualified','quote','contract','handover','closed','won']) $$;

CREATE OR REPLACE FUNCTION funnel_stage_is_sold(stage text)
  RETURNS boolean LANGUAGE sql IMMUTABLE AS
$$ SELECT lower(stage) = ANY (ARRAY['closed','won','handover']) $$;


-- ############################################################################
-- SECTION 1 — funnel_daily  (PLAN vs FACT vs DIF, per manager/day/source)
-- ----------------------------------------------------------------------------
-- Grain: (tenant_id, day, manager_id, source). One row per manager per day per
-- lead source. A "Total" (source-agnostic) row can be derived by the app with a
-- ROLLUP query on the wrapper, or added here later if the board needs it.
--
-- Construction:
--   * fact_leads / fact_leads_qual — from lead (created that day) and its
--     qualification, resolved to the assigned manager (lead.assigned_to).
--   * fact_calls                   — from call_activity, by agent + day.
--   * fact_meet_sched/held, fact_ss— from activity, by owner + day.
--   * fact_sales / money           — from deal closed that day (deal.status='won'
--     or stage sold), by owner, with prepayment (deal.value - balance_due) and
--     contract value (deal.value).
--   * plan_*                       — pivot of kpi_plan.
-- All facts are keyed by (tenant, day, manager, source) and full-outer-joined on
-- a spine of every (manager, day, source) that appears in EITHER plan or fact,
-- so a manager with a PLAN but no FACT (and vice-versa) still shows a row.
-- ############################################################################

DROP MATERIALIZED VIEW IF EXISTS funnel_daily CASCADE;

CREATE MATERIALIZED VIEW funnel_daily AS
WITH
-- ── source normaliser ────────────────────────────────────────────────────
-- Deals inherit source from their originating lead; leads carry it directly.
-- COALESCE to 'unknown' so NULL sources still bucket deterministically and can
-- join to kpi_plan rows keyed on COALESCE(source,'').
deal_src AS (
  SELECT d.id            AS deal_id,
         d.tenant_id,
         d.owner_id      AS manager_id,
         COALESCE(l.source, d.external_source, 'unknown') AS source,
         d.value,
         d.balance_due,
         d.status,
         d.stage,
         d.ref,
         d.updated_at
  FROM deal d
  LEFT JOIN lead l ON l.id = d.lead_id AND l.tenant_id = d.tenant_id
),

-- ── FACT: LEADS created that day, by assigned manager + source ───────────
fact_leads AS (
  SELECT l.tenant_id,
         date_trunc('day', l.created_at)::date AS day,
         l.assigned_to                          AS manager_id,
         COALESCE(l.source, 'unknown')          AS source,
         count(*)                               AS leads,
         count(*) FILTER (WHERE l.status = 'qualified') AS leads_qualified_by_lead
  FROM lead l
  WHERE l.assigned_to IS NOT NULL
  GROUP BY 1, 2, 3, 4
),

-- ── FACT: Leads qualified — prefer the explicit stage-history event so a
-- qualification is counted on the DAY it happened (not the lead's create day).
fact_qualified AS (
  SELECT h.tenant_id,
         date_trunc('day', h.occurred_at)::date AS day,
         COALESCE(h.moved_by, ds.manager_id)     AS manager_id,
         ds.source,
         count(DISTINCT h.deal_id)               AS leads_qualified
  FROM deal_stage_history h
  JOIN deal_src ds ON ds.deal_id = h.deal_id AND ds.tenant_id = h.tenant_id
  WHERE funnel_stage_is_qualified(h.to_stage)
    AND NOT funnel_stage_is_qualified(COALESCE(h.from_stage, ''))  -- first entry only
  GROUP BY 1, 2, 3, 4
),

-- ── FACT: Number of calls, by agent + day + (deal's) source ──────────────
fact_calls AS (
  SELECT c.tenant_id,
         date_trunc('day', c.occurred_at)::date AS day,
         c.agent_id                              AS manager_id,
         COALESCE(ds.source, 'unknown')          AS source,
         count(*)                                AS calls
  FROM call_activity c
  LEFT JOIN deal_src ds ON ds.deal_id = c.deal_id AND ds.tenant_id = c.tenant_id
  WHERE c.agent_id IS NOT NULL
  GROUP BY 1, 2, 3, 4
),

-- ── FACT: Meetings scheduled (by scheduled_at) and held (by completed_at) ─
fact_meetings AS (
  SELECT a.tenant_id,
         a.owner_id                               AS manager_id,
         COALESCE(ds.source, 'unknown')           AS source,
         date_trunc('day', a.scheduled_at)::date  AS sched_day,
         date_trunc('day', a.completed_at)::date  AS held_day,
         a.status,
         a.kind,
         a.outcome
  FROM activity a
  LEFT JOIN deal_src ds ON ds.deal_id = a.deal_id AND ds.tenant_id = a.tenant_id
  WHERE a.owner_id IS NOT NULL
),
fact_meet_sched AS (
  SELECT tenant_id, sched_day AS day, manager_id, source,
         count(*) AS meetings_scheduled
  FROM fact_meetings
  WHERE kind = 'meeting' AND sched_day IS NOT NULL
  GROUP BY 1, 2, 3, 4
),
fact_meet_held AS (
  SELECT tenant_id, held_day AS day, manager_id, source,
         count(*) AS meetings_held
  FROM fact_meetings
  WHERE kind = 'meeting' AND status = 'done' AND held_day IS NOT NULL
  GROUP BY 1, 2, 3, 4
),
-- ── FACT: Security-Service checks (activity.kind = 'security_service') ────
fact_ss AS (
  SELECT tenant_id, COALESCE(held_day, sched_day) AS day, manager_id, source,
         count(*) AS ss_checks
  FROM fact_meetings
  WHERE kind = 'security_service'
    AND COALESCE(held_day, sched_day) IS NOT NULL
  GROUP BY 1, 2, 3, 4
),

-- ── FACT: Sold cars + money, by close day, owner, source ─────────────────
-- Close day comes from the stage-history "entered sold stage" event; falls back
-- to deal.updated_at when history is absent. Prepayment = value - balance_due
-- (what has been collected); contract value = value.
fact_sold_days AS (
  SELECT h.tenant_id,
         h.deal_id,
         min(date_trunc('day', h.occurred_at)::date) AS sold_day
  FROM deal_stage_history h
  WHERE funnel_stage_is_sold(h.to_stage)
  GROUP BY 1, 2
),
fact_sales AS (
  SELECT ds.tenant_id,
         COALESCE(fsd.sold_day, date_trunc('day', ds.updated_at)::date) AS day,
         ds.manager_id,
         ds.source,
         count(*)                                       AS sales,
         sum(GREATEST(COALESCE(ds.value,0) - COALESCE(ds.balance_due,0), 0))::numeric AS prepayment_sum,
         sum(COALESCE(ds.value,0))::numeric             AS contract_value
  FROM deal_src ds
  LEFT JOIN fact_sold_days fsd
    ON fsd.deal_id = ds.deal_id AND fsd.tenant_id = ds.tenant_id
  WHERE ds.status = 'won' OR funnel_stage_is_sold(ds.stage)
  GROUP BY 1, 2, 3, 4
),

-- ── PLAN: pivot kpi_plan to one row per (tenant, manager, day, source) ────
plan AS (
  SELECT tenant_id,
         manager_id,
         plan_day AS day,
         COALESCE(source, 'unknown') AS source,
         sum(target_value) FILTER (WHERE metric = 'leads')              AS plan_leads,
         sum(target_value) FILTER (WHERE metric = 'leads_qualified')    AS plan_leads_qualified,
         sum(target_value) FILTER (WHERE metric = 'calls')              AS plan_calls,
         sum(target_value) FILTER (WHERE metric = 'meetings_scheduled') AS plan_meetings_scheduled,
         sum(target_value) FILTER (WHERE metric = 'meetings_held')      AS plan_meetings_held,
         sum(target_value) FILTER (WHERE metric = 'ss_checks')          AS plan_ss_checks,
         sum(target_value) FILTER (WHERE metric = 'sales')              AS plan_sales,
         sum(target_value) FILTER (WHERE metric = 'prepayment_sum')     AS plan_prepayment_sum,
         sum(target_value) FILTER (WHERE metric = 'contract_value')     AS plan_contract_value
  FROM kpi_plan
  GROUP BY 1, 2, 3, 4
),

-- ── SPINE: every (tenant, day, manager, source) present in plan OR any fact ─
spine AS (
  SELECT tenant_id, day, manager_id, source FROM plan
  UNION SELECT tenant_id, day, manager_id, source FROM fact_leads
  UNION SELECT tenant_id, day, manager_id, source FROM fact_qualified
  UNION SELECT tenant_id, day, manager_id, source FROM fact_calls
  UNION SELECT tenant_id, day, manager_id, source FROM fact_meet_sched
  UNION SELECT tenant_id, day, manager_id, source FROM fact_meet_held
  UNION SELECT tenant_id, day, manager_id, source FROM fact_ss
  UNION SELECT tenant_id, day, manager_id, source FROM fact_sales
)

SELECT
  s.tenant_id,
  s.day,
  s.manager_id,
  u.name                              AS manager_name,
  s.source,

  -- ── FACT values (0 where absent) ───────────────────────────────────────
  COALESCE(fl.leads, 0)                                        AS fact_leads,
  COALESCE(fq.leads_qualified, fl.leads_qualified_by_lead, 0)  AS fact_leads_qualified,
  COALESCE(fc.calls, 0)                                        AS fact_calls,
  COALESCE(fms.meetings_scheduled, 0)                          AS fact_meetings_scheduled,
  COALESCE(fmh.meetings_held, 0)                               AS fact_meetings_held,
  COALESCE(fss.ss_checks, 0)                                   AS fact_ss_checks,
  COALESCE(fsa.sales, 0)                                       AS fact_sales,
  COALESCE(fsa.prepayment_sum, 0)                              AS fact_prepayment_sum,
  COALESCE(fsa.contract_value, 0)                              AS fact_contract_value,

  -- ── PLAN values (0 where absent) ───────────────────────────────────────
  COALESCE(p.plan_leads, 0)                 AS plan_leads,
  COALESCE(p.plan_leads_qualified, 0)       AS plan_leads_qualified,
  COALESCE(p.plan_calls, 0)                 AS plan_calls,
  COALESCE(p.plan_meetings_scheduled, 0)    AS plan_meetings_scheduled,
  COALESCE(p.plan_meetings_held, 0)         AS plan_meetings_held,
  COALESCE(p.plan_ss_checks, 0)             AS plan_ss_checks,
  COALESCE(p.plan_sales, 0)                 AS plan_sales,
  COALESCE(p.plan_prepayment_sum, 0)        AS plan_prepayment_sum,
  COALESCE(p.plan_contract_value, 0)        AS plan_contract_value,

  -- ── DIF = FACT − PLAN (positive = ahead of plan) ───────────────────────
  COALESCE(fl.leads,0)                 - COALESCE(p.plan_leads,0)                 AS dif_leads,
  COALESCE(fq.leads_qualified, fl.leads_qualified_by_lead, 0)
                                       - COALESCE(p.plan_leads_qualified,0)       AS dif_leads_qualified,
  COALESCE(fc.calls,0)                 - COALESCE(p.plan_calls,0)                 AS dif_calls,
  COALESCE(fms.meetings_scheduled,0)   - COALESCE(p.plan_meetings_scheduled,0)    AS dif_meetings_scheduled,
  COALESCE(fmh.meetings_held,0)        - COALESCE(p.plan_meetings_held,0)         AS dif_meetings_held,
  COALESCE(fss.ss_checks,0)            - COALESCE(p.plan_ss_checks,0)             AS dif_ss_checks,
  COALESCE(fsa.sales,0)                - COALESCE(p.plan_sales,0)                 AS dif_sales,
  COALESCE(fsa.prepayment_sum,0)       - COALESCE(p.plan_prepayment_sum,0)        AS dif_prepayment_sum,
  COALESCE(fsa.contract_value,0)       - COALESCE(p.plan_contract_value,0)        AS dif_contract_value,

  -- ── % attainment = FACT / PLAN (NULL when no plan, to avoid /0) ─────────
  round(COALESCE(fl.leads,0)::numeric              / NULLIF(p.plan_leads,0),              4) AS pct_leads,
  round(COALESCE(fq.leads_qualified, fl.leads_qualified_by_lead, 0)::numeric
                                                   / NULLIF(p.plan_leads_qualified,0),    4) AS pct_leads_qualified,
  round(COALESCE(fc.calls,0)::numeric              / NULLIF(p.plan_calls,0),              4) AS pct_calls,
  round(COALESCE(fms.meetings_scheduled,0)::numeric/ NULLIF(p.plan_meetings_scheduled,0), 4) AS pct_meetings_scheduled,
  round(COALESCE(fmh.meetings_held,0)::numeric     / NULLIF(p.plan_meetings_held,0),      4) AS pct_meetings_held,
  round(COALESCE(fss.ss_checks,0)::numeric         / NULLIF(p.plan_ss_checks,0),          4) AS pct_ss_checks,
  round(COALESCE(fsa.sales,0)::numeric             / NULLIF(p.plan_sales,0),              4) AS pct_sales,
  round(COALESCE(fsa.prepayment_sum,0)             / NULLIF(p.plan_prepayment_sum,0),     4) AS pct_prepayment_sum,
  round(COALESCE(fsa.contract_value,0)             / NULLIF(p.plan_contract_value,0),     4) AS pct_contract_value,

  -- ── CONVERSION ratios (FACT-based; NULL denominators guarded) ──────────
  -- leads_qualified / leads
  round(COALESCE(fq.leads_qualified, fl.leads_qualified_by_lead, 0)::numeric
                                                 / NULLIF(COALESCE(fl.leads,0),0), 4) AS conv_qual_per_lead,
  -- meetings_held / meetings_scheduled
  round(COALESCE(fmh.meetings_held,0)::numeric
                                                 / NULLIF(COALESCE(fms.meetings_scheduled,0),0), 4) AS conv_held_per_scheduled,
  -- calls / meetings_held  (how many calls it took to hold one meeting)
  round(COALESCE(fc.calls,0)::numeric
                                                 / NULLIF(COALESCE(fmh.meetings_held,0),0), 4) AS conv_calls_per_meeting_held,
  -- security_service / meetings  (checks per meeting held)
  round(COALESCE(fss.ss_checks,0)::numeric
                                                 / NULLIF(COALESCE(fmh.meetings_held,0),0), 4) AS conv_ss_per_meeting,
  -- sales / security_service
  round(COALESCE(fsa.sales,0)::numeric
                                                 / NULLIF(COALESCE(fss.ss_checks,0),0), 4) AS conv_sale_per_ss,
  -- sales / leads  (end-to-end funnel conversion)
  round(COALESCE(fsa.sales,0)::numeric
                                                 / NULLIF(COALESCE(fl.leads,0),0), 4) AS conv_sale_per_lead

FROM spine s
LEFT JOIN "user"        u   ON u.id = s.manager_id
LEFT JOIN plan          p   ON (p.tenant_id, p.day, p.manager_id, p.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_leads    fl  ON (fl.tenant_id, fl.day, fl.manager_id, fl.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_qualified fq ON (fq.tenant_id, fq.day, fq.manager_id, fq.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_calls    fc  ON (fc.tenant_id, fc.day, fc.manager_id, fc.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_meet_sched fms ON (fms.tenant_id, fms.day, fms.manager_id, fms.source) = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_meet_held  fmh ON (fmh.tenant_id, fmh.day, fmh.manager_id, fmh.source) = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_ss       fss ON (fss.tenant_id, fss.day, fss.manager_id, fss.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
LEFT JOIN fact_sales    fsa ON (fsa.tenant_id, fsa.day, fsa.manager_id, fsa.source)   = (s.tenant_id, s.day, s.manager_id, s.source)
WITH DATA;

-- Unique index required for REFRESH … CONCURRENTLY. The grain is the full key.
CREATE UNIQUE INDEX IF NOT EXISTS funnel_daily_grain_uidx
  ON funnel_daily (tenant_id, day, manager_id, source);
-- Common dashboard access path: one tenant, a date range.
CREATE INDEX IF NOT EXISTS funnel_daily_tenant_day_idx
  ON funnel_daily (tenant_id, day);


-- ############################################################################
-- SECTION 2 — sales_ledger_monthly  (closed-sales ledger with drill-through)
-- ----------------------------------------------------------------------------
-- One row per closed deal (the drill-through grain), tagged with its close
-- month, manager, source, and car. The dashboard aggregates client-side, or via
-- the ROLLUP wrapper, but keeping the deal grain gives Mohammed the "click the
-- number, see the deals" drill-through he expects. deal_id is the drill key.
--
-- "Closed" = deal.status='won' OR stage in the sold set. Prepayment and contract
-- value mirror the funnel definitions. Car is resolved from the deal's vehicle
-- when a link exists; deal has no direct vehicle_id in the current schema, so we
-- LEFT JOIN vehicle via a best-effort path and expose whatever we can. A
-- reviewer should confirm the deal→vehicle relationship (see NOTES).
-- ############################################################################

DROP MATERIALIZED VIEW IF EXISTS sales_ledger_monthly CASCADE;

CREATE MATERIALIZED VIEW sales_ledger_monthly AS
WITH sold_day AS (
  SELECT h.tenant_id, h.deal_id,
         min(date_trunc('day', h.occurred_at)::date) AS sold_on
  FROM deal_stage_history h
  WHERE funnel_stage_is_sold(h.to_stage)
  GROUP BY 1, 2
),
closed AS (
  SELECT d.id            AS deal_id,
         d.tenant_id,
         d.ref           AS deal_ref,
         d.owner_id      AS manager_id,
         d.value,
         d.balance_due,
         d.lead_id,
         COALESCE(sd.sold_on, date_trunc('day', d.updated_at)::date) AS sold_on
  FROM deal d
  LEFT JOIN sold_day sd ON sd.deal_id = d.id AND sd.tenant_id = d.tenant_id
  WHERE d.status = 'won' OR funnel_stage_is_sold(d.stage)
)
SELECT
  c.tenant_id,
  date_trunc('month', c.sold_on)::date        AS sale_month,
  c.sold_on,
  c.manager_id,
  u.name                                       AS manager_name,
  COALESCE(l.source, 'unknown')                AS source,

  -- ── car identity (best-effort; confirm deal→vehicle link — see NOTES) ──
  v.id                                         AS vehicle_id,
  v.plate                                      AS car_plate,
  NULLIF(trim(concat_ws(' ', v.make, v.model, v.year::text)), '') AS car_label,

  -- ── money ──────────────────────────────────────────────────────────────
  GREATEST(COALESCE(c.value,0) - COALESCE(c.balance_due,0), 0)::numeric AS prepayment,
  COALESCE(c.value, 0)::numeric                AS deal_value,
  COALESCE(c.balance_due, 0)::numeric          AS balance_due,

  -- ── drill-through keys ─────────────────────────────────────────────────
  c.deal_id,
  c.deal_ref
FROM closed c
LEFT JOIN "user"  u ON u.id = c.manager_id
LEFT JOIN lead    l ON l.id = c.lead_id  AND l.tenant_id = c.tenant_id
-- Best-effort car link: match a vehicle whose external_id equals the deal ref,
-- OR (fallback) leave NULL. There is no deal.vehicle_id in the current schema,
-- so this join is intentionally conservative. REVIEW: replace with the real
-- rental/booking → vehicle link once that relationship exists.
LEFT JOIN vehicle v ON v.tenant_id = c.tenant_id AND v.external_id = c.deal_ref
WITH DATA;

-- Unique per closed deal (drill grain) → enables REFRESH … CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS sales_ledger_monthly_deal_uidx
  ON sales_ledger_monthly (tenant_id, deal_id);
-- Dashboard access path: one tenant, a month.
CREATE INDEX IF NOT EXISTS sales_ledger_monthly_tenant_month_idx
  ON sales_ledger_monthly (tenant_id, sale_month);
CREATE INDEX IF NOT EXISTS sales_ledger_monthly_tenant_mgr_idx
  ON sales_ledger_monthly (tenant_id, manager_id, sale_month);


-- ############################################################################
-- SECTION 3 — TENANT-SAFE WRAPPER VIEWS + GRANTS
-- ----------------------------------------------------------------------------
-- Matviews ignore RLS on their base tables. The app must NOT read them directly.
-- These security_barrier views re-apply the canonical tenant predicate so the
-- NOBYPASSRLS app_runtime role (which does SET LOCAL app.tenant_id per txn) can
-- only ever see its own tenant's rows. Grant SELECT on the wrappers, revoke on
-- the raw matviews.
-- ############################################################################

CREATE OR REPLACE VIEW funnel_daily_secure
  WITH (security_barrier = true) AS
  SELECT * FROM funnel_daily
  WHERE tenant_id = current_setting('app.tenant_id', true)::uuid;

CREATE OR REPLACE VIEW sales_ledger_monthly_secure
  WITH (security_barrier = true) AS
  SELECT * FROM sales_ledger_monthly
  WHERE tenant_id = current_setting('app.tenant_id', true)::uuid;

-- Grants. app_runtime is created by platform/db/app-role.ts (NOLOGIN,
-- NOBYPASSRLS). If the role is absent (e.g. Neon CI without DB_APP_ROLE) the
-- DO block is a no-op so this file still applies cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    -- Read only the tenant-safe wrappers.
    EXECUTE 'GRANT SELECT ON funnel_daily_secure          TO app_runtime';
    EXECUTE 'GRANT SELECT ON sales_ledger_monthly_secure  TO app_runtime';
    -- Explicitly deny direct matview access to the app role.
    EXECUTE 'REVOKE ALL ON funnel_daily          FROM app_runtime';
    EXECUTE 'REVOKE ALL ON sales_ledger_monthly  FROM app_runtime';
  END IF;
END $$;


-- ############################################################################
-- SECTION 4 — REFRESH HELPER
-- ----------------------------------------------------------------------------
-- Call from pg_cron (Hetzner) or a recurring pg-boss job (Neon), same cadence
-- as drizzle/0013_materialized_views.sql. CONCURRENTLY avoids blocking readers;
-- it requires the unique indexes defined above and cannot run in the same txn
-- that created the matview, so this is a separate callable.
-- ############################################################################

CREATE OR REPLACE FUNCTION refresh_funnel_views()
  RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY funnel_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY sales_ledger_monthly;
END;
$$;

-- ============================================================================
-- END funnel_and_ledger.sql
-- ============================================================================
