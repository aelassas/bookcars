-- ============================================================================
-- Sales-funnel KPI: daily FACT from CRM + monthly PLAN from kpi_target
-- Multi-tenant. App must SET LOCAL app.tenant_id = '<uuid>' (or set_config).
--
-- Metrics (canonical keys):
--   new_leads      — lead.created_at that day, by lead.assigned_to
--   deals_opened   — deal.created_at that day, by deal.owner_id
--   deals_won      — deal moved/closed to won that day (see stage sets)
--   deals_lost     — deal closed to lost that day
--   contract_value — sum(deal.value) for deals won that day
--   win_rate       — deals_won / (deals_won + deals_lost); NULL if no closed
--   chat_volume    — outbound messages that day, attributed via message."from"
--
-- PLAN: monthly kpi_target. On the daily grain, plan is pro-rated:
--   daily_plan = target / days_in_month  (win_rate is NOT pro-rated)
-- On the monthly grain, plan is the full monthly target.
-- dif = fact - plan when plan IS NOT NULL, else NULL.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) PLAN table + RLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kpi_target (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  manager_id  uuid NOT NULL,              -- "user".id  (= deal.owner_id / lead.assigned_to)
  month       date NOT NULL,              -- first day of month, e.g. 2026-07-01
  metric      text NOT NULL,              -- see metric keys above
  target      numeric(18,4) NOT NULL,     -- absolute count/value, or 0–1 for win_rate
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kpi_target_month_is_first CHECK (month = date_trunc('month', month)::date),
  CONSTRAINT kpi_target_metric_ok CHECK (metric = ANY (ARRAY[
    'new_leads','deals_opened','deals_won','deals_lost',
    'contract_value','win_rate','chat_volume'
  ]))
);

CREATE UNIQUE INDEX IF NOT EXISTS kpi_target_uq
  ON kpi_target (tenant_id, manager_id, month, metric);

CREATE INDEX IF NOT EXISTS kpi_target_tenant_month_idx
  ON kpi_target (tenant_id, month);

ALTER TABLE kpi_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_target FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_target_tenant_isolation ON kpi_target;
CREATE POLICY kpi_target_tenant_isolation ON kpi_target
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

-- ---------------------------------------------------------------------------
-- Stage vocabulary (edit in ONE place)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION funnel_stage_is_won(stage text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(coalesce(stage, '')) = ANY (ARRAY[
    'won', 'closed', 'closed_won', 'sold', 'handover'
  ]);
$$;

CREATE OR REPLACE FUNCTION funnel_stage_is_lost(stage text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(coalesce(stage, '')) = ANY (ARRAY[
    'lost', 'closed_lost', 'rejected', 'cancelled'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- 1) funnel_daily  — MATERIALIZED VIEW
--    Grain: (tenant_id, day, manager_id, metric)
--    Columns: plan, fact, dif
-- ---------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS funnel_daily CASCADE;

CREATE MATERIALIZED VIEW funnel_daily AS
WITH
-- Daily lead counts by assigned manager
lead_day AS (
  SELECT
    l.tenant_id,
    date_trunc('day', l.created_at)::date AS day,
    l.assigned_to                         AS manager_id,
    count(*)::numeric                     AS new_leads
  FROM lead l
  WHERE l.assigned_to IS NOT NULL
  GROUP BY 1, 2, 3
),

-- Daily deal events by owner
-- opened  → create day
-- won/lost → updated_at day when stage is terminal (best available without stage history)
deal_day AS (
  SELECT
    d.tenant_id,
    date_trunc('day', d.created_at)::date AS day,
    d.owner_id                            AS manager_id,
    count(*)::numeric                     AS deals_opened,
    0::numeric                            AS deals_won,
    0::numeric                            AS deals_lost,
    0::numeric                            AS contract_value
  FROM deal d
  WHERE d.owner_id IS NOT NULL
  GROUP BY 1, 2, 3

  UNION ALL

  SELECT
    d.tenant_id,
    date_trunc('day', d.updated_at)::date AS day,
    d.owner_id                            AS manager_id,
    0::numeric,
    count(*) FILTER (WHERE funnel_stage_is_won(d.stage))::numeric,
    count(*) FILTER (WHERE funnel_stage_is_lost(d.stage))::numeric,
    coalesce(
      sum(d.value) FILTER (WHERE funnel_stage_is_won(d.stage)),
      0
    )::numeric
  FROM deal d
  WHERE d.owner_id IS NOT NULL
    AND (funnel_stage_is_won(d.stage) OR funnel_stage_is_lost(d.stage))
  GROUP BY 1, 2, 3
),

deal_day_agg AS (
  SELECT
    tenant_id,
    day,
    manager_id,
    sum(deals_opened)::numeric   AS deals_opened,
    sum(deals_won)::numeric      AS deals_won,
    sum(deals_lost)::numeric     AS deals_lost,
    sum(contract_value)::numeric AS contract_value
  FROM deal_day
  GROUP BY 1, 2, 3
),

-- Outbound chat volume: message."from" treated as manager user id (text uuid)
chat_day AS (
  SELECT
    m.tenant_id,
    date_trunc('day', m.created_at)::date AS day,
    NULLIF(m."from", '')::uuid            AS manager_id,
    count(*)::numeric                     AS chat_volume
  FROM message m
  WHERE lower(coalesce(m.direction, '')) IN ('out', 'outbound', 'outgoing')
    AND m."from" IS NOT NULL
    AND m."from" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  GROUP BY 1, 2, 3
),

-- Spine of every (tenant, day, manager) that has any fact
spine AS (
  SELECT tenant_id, day, manager_id FROM lead_day
  UNION
  SELECT tenant_id, day, manager_id FROM deal_day_agg
  UNION
  SELECT tenant_id, day, manager_id FROM chat_day
  UNION
  -- also emit days covered by a plan month so empty-but-planned managers show
  SELECT
    t.tenant_id,
    gs::date AS day,
    t.manager_id
  FROM kpi_target t
  CROSS JOIN LATERAL generate_series(
    t.month,
    (t.month + INTERVAL '1 month - 1 day')::date,
    INTERVAL '1 day'
  ) AS gs
),

wide AS (
  SELECT
    s.tenant_id,
    s.day,
    s.manager_id,
    coalesce(l.new_leads, 0)        AS new_leads,
    coalesce(d.deals_opened, 0)     AS deals_opened,
    coalesce(d.deals_won, 0)        AS deals_won,
    coalesce(d.deals_lost, 0)       AS deals_lost,
    coalesce(d.contract_value, 0)   AS contract_value,
    CASE
      WHEN coalesce(d.deals_won, 0) + coalesce(d.deals_lost, 0) = 0 THEN NULL
      ELSE coalesce(d.deals_won, 0)
           / (coalesce(d.deals_won, 0) + coalesce(d.deals_lost, 0))
    END                             AS win_rate,
    coalesce(c.chat_volume, 0)      AS chat_volume
  FROM spine s
  LEFT JOIN lead_day     l ON l.tenant_id = s.tenant_id AND l.day = s.day AND l.manager_id = s.manager_id
  LEFT JOIN deal_day_agg d ON d.tenant_id = s.tenant_id AND d.day = s.day AND d.manager_id = s.manager_id
  LEFT JOIN chat_day     c ON c.tenant_id = s.tenant_id AND c.day = s.day AND c.manager_id = s.manager_id
),

-- Unpivot to long form (metric, fact)
facts AS (
  SELECT tenant_id, day, manager_id, m.metric, m.fact
  FROM wide w
  CROSS JOIN LATERAL (VALUES
    ('new_leads',      w.new_leads),
    ('deals_opened',   w.deals_opened),
    ('deals_won',      w.deals_won),
    ('deals_lost',     w.deals_lost),
    ('contract_value', w.contract_value),
    ('win_rate',       w.win_rate),
    ('chat_volume',    w.chat_volume)
  ) AS m(metric, fact)
),

-- Monthly plan → daily plan (pro-rate counts/values; win_rate stays as-is)
plans AS (
  SELECT
    t.tenant_id,
    gs::date AS day,
    t.manager_id,
    t.metric,
    CASE
      WHEN t.metric = 'win_rate' THEN t.target
      ELSE t.target
           / EXTRACT(DAY FROM (t.month + INTERVAL '1 month - 1 day'))::numeric
    END AS plan
  FROM kpi_target t
  CROSS JOIN LATERAL generate_series(
    t.month,
    (t.month + INTERVAL '1 month - 1 day')::date,
    INTERVAL '1 day'
  ) AS gs
)

SELECT
  coalesce(f.tenant_id, p.tenant_id)   AS tenant_id,
  coalesce(f.day, p.day)               AS day,
  coalesce(f.manager_id, p.manager_id) AS manager_id,
  coalesce(f.metric, p.metric)         AS metric,
  p.plan                               AS plan,
  coalesce(f.fact, 0)                  AS fact,
  CASE
    WHEN p.plan IS NULL THEN NULL
    ELSE coalesce(f.fact, 0) - p.plan
  END                                  AS dif
FROM facts f
FULL OUTER JOIN plans p
  ON  p.tenant_id  = f.tenant_id
  AND p.day        = f.day
  AND p.manager_id = f.manager_id
  AND p.metric     = f.metric
WITH NO DATA;  -- first populate via refresh_funnel()

-- Concurrent refresh requires a unique index covering the grain
CREATE UNIQUE INDEX funnel_daily_grain_uidx
  ON funnel_daily (tenant_id, day, manager_id, metric);

CREATE INDEX funnel_daily_tenant_day_idx
  ON funnel_daily (tenant_id, day);

CREATE INDEX funnel_daily_manager_idx
  ON funnel_daily (tenant_id, manager_id, day);

-- Matviews ignore RLS on base tables; tenant filter at read time:
CREATE OR REPLACE VIEW funnel_daily_secure
WITH (security_barrier = true) AS
SELECT *
FROM funnel_daily
WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid;

-- ---------------------------------------------------------------------------
-- 2) funnel_month — monthly rollup (VIEW over the matview)
--    Recompute win_rate from month totals (do not average daily rates).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW funnel_month AS
WITH
month_base AS (
  SELECT
    tenant_id,
    date_trunc('month', day)::date AS month,
    manager_id,
    metric,
    sum(fact) FILTER (WHERE metric <> 'win_rate') AS fact_sum,
    -- stash closed-deal components via separate metrics
    sum(fact) FILTER (WHERE metric = 'deals_won')  AS won,
    sum(fact) FILTER (WHERE metric = 'deals_lost') AS lost
  FROM funnel_daily
  GROUP BY 1, 2, 3, 4
),
-- rebuild win_rate from won/lost sums for the month
month_facts AS (
  SELECT
    tenant_id,
    month,
    manager_id,
    metric,
    CASE
      WHEN metric = 'win_rate' THEN NULL  -- replaced below
      ELSE fact_sum
    END AS fact
  FROM month_base
  WHERE metric <> 'win_rate'

  UNION ALL

  SELECT
    tenant_id,
    -- funnel_daily is keyed by `day`; there is no `month` column to select.
    -- This branch said plain `month`, so the whole file failed with
    -- 'column "month" does not exist' and had therefore never been applied
    -- anywhere — production has no funnel_daily, funnel_month or kpi_target.
    -- The GROUP BY below already had the correct expression.
    date_trunc('month', day)::date AS month,
    manager_id,
    'win_rate'::text AS metric,
    CASE
      WHEN coalesce(sum(fact) FILTER (WHERE metric = 'deals_won'), 0)
         + coalesce(sum(fact) FILTER (WHERE metric = 'deals_lost'), 0) = 0
      THEN NULL
      ELSE coalesce(sum(fact) FILTER (WHERE metric = 'deals_won'), 0)
           / (coalesce(sum(fact) FILTER (WHERE metric = 'deals_won'), 0)
            + coalesce(sum(fact) FILTER (WHERE metric = 'deals_lost'), 0))
    END AS fact
  FROM funnel_daily
  WHERE metric IN ('deals_won', 'deals_lost')
  GROUP BY tenant_id, date_trunc('month', day)::date, manager_id
),
month_plan AS (
  SELECT
    tenant_id,
    month,
    manager_id,
    metric,
    target AS plan
  FROM kpi_target
)
SELECT
  coalesce(f.tenant_id, p.tenant_id)   AS tenant_id,
  coalesce(f.month, p.month)           AS month,
  coalesce(f.manager_id, p.manager_id) AS manager_id,
  coalesce(f.metric, p.metric)         AS metric,
  p.plan,
  coalesce(f.fact, 0)                  AS fact,
  CASE
    WHEN p.plan IS NULL THEN NULL
    ELSE coalesce(f.fact, 0) - p.plan
  END                                  AS dif
FROM month_facts f
FULL OUTER JOIN month_plan p
  ON  p.tenant_id  = f.tenant_id
  AND p.month      = f.month
  AND p.manager_id = f.manager_id
  AND p.metric     = f.metric;

CREATE OR REPLACE VIEW funnel_month_secure
WITH (security_barrier = true) AS
SELECT *
FROM funnel_month
WHERE tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid;

-- Optional wide pivot for dashboards (one row per manager/day)
CREATE OR REPLACE VIEW funnel_daily_wide AS
SELECT
  tenant_id,
  day,
  manager_id,
  max(fact) FILTER (WHERE metric = 'new_leads')      AS new_leads,
  max(plan) FILTER (WHERE metric = 'new_leads')      AS new_leads_plan,
  max(fact) FILTER (WHERE metric = 'deals_opened')   AS deals_opened,
  max(plan) FILTER (WHERE metric = 'deals_opened')   AS deals_opened_plan,
  max(fact) FILTER (WHERE metric = 'deals_won')      AS deals_won,
  max(plan) FILTER (WHERE metric = 'deals_won')      AS deals_won_plan,
  max(fact) FILTER (WHERE metric = 'deals_lost')     AS deals_lost,
  max(plan) FILTER (WHERE metric = 'deals_lost')     AS deals_lost_plan,
  max(fact) FILTER (WHERE metric = 'contract_value') AS contract_value,
  max(plan) FILTER (WHERE metric = 'contract_value') AS contract_value_plan,
  max(fact) FILTER (WHERE metric = 'win_rate')       AS win_rate,
  max(plan) FILTER (WHERE metric = 'win_rate')       AS win_rate_plan,
  max(fact) FILTER (WHERE metric = 'chat_volume')    AS chat_volume,
  max(plan) FILTER (WHERE metric = 'chat_volume')    AS chat_volume_plan
FROM funnel_daily
GROUP BY tenant_id, day, manager_id;

-- ---------------------------------------------------------------------------
-- 3) refresh_funnel()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_funnel()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- CONCURRENTLY needs the unique index and does not block readers.
  -- First ever populate (the matview is created WITH NO DATA) must be
  -- non-concurrent.
  --
  -- The populated check reads pg_matviews ONLY. It used to lead with
  -- `SELECT 1 FROM funnel_daily`, but querying an unpopulated matview raises
  -- object_not_in_prerequisite_state immediately — so the guard written to
  -- handle the first populate was itself what made the first populate fail,
  -- and the one-shot `SELECT refresh_funnel()` at the end of this file could
  -- never succeed.
  IF NOT COALESCE(
       (SELECT ispopulated FROM pg_matviews
         WHERE schemaname = 'public' AND matviewname = 'funnel_daily'),
       false)
  THEN
    REFRESH MATERIALIZED VIEW funnel_daily;
  ELSE
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY funnel_daily;
    EXCEPTION
      WHEN feature_not_supported OR object_not_in_prerequisite_state THEN
        -- empty / not yet populated
        REFRESH MATERIALIZED VIEW funnel_daily;
    END;
  END IF;
END;
$$;

COMMENT ON FUNCTION refresh_funnel() IS
  'Refresh funnel_daily matview. Schedule every 15 minutes (pg_cron or pg-boss).';

-- One-shot populate after deploy
SELECT refresh_funnel();

-- ---------------------------------------------------------------------------
-- Scheduling notes (pick one)
-- ---------------------------------------------------------------------------
-- A) pg_cron (self-hosted Postgres / Hetzner):
--
--   CREATE EXTENSION IF NOT EXISTS pg_cron;
--   SELECT cron.schedule(
--     'refresh-funnel-15m',
--     '*/15 * * * *',
--     $$SELECT refresh_funnel()$$
--   );
--
-- B) pg-boss / app worker (Neon / serverless — no pg_cron):
--
--   // every 15 minutes
--   await boss.schedule('refresh-funnel', '*/15 * * * *', {});
--   boss.work('refresh-funnel', async () => {
--     await sql`SELECT refresh_funnel()`;
--   });
--
-- App query pattern (tenant isolation):
--
--   BEGIN;
--   SELECT set_config('app.tenant_id', :tenant_uuid, true);  -- true = local to txn
--   SELECT * FROM funnel_daily_secure
--    WHERE day >= current_date - 30
--    ORDER BY day, manager_id, metric;
--   COMMIT;
--
-- Prefer *_secure views from app_runtime. Do not GRANT SELECT on raw funnel_daily
-- to the app role if you care about multi-tenant isolation (matviews have no RLS).
-- ============================================================================


-- Example: seed a manager's monthly targets. Commented out because it is
-- documentation, not migration — :tenant/:mgr are psql variables and running
-- this file verbatim failed with a syntax error at ":".
--
--   INSERT INTO kpi_target (tenant_id, manager_id, month, metric, target)
--   VALUES
--     (:tenant, :mgr, date_trunc('month', current_date)::date, 'new_leads', 80),
--     (:tenant, :mgr, date_trunc('month', current_date)::date, 'deals_won', 12),
--     (:tenant, :mgr, date_trunc('month', current_date)::date, 'contract_value', 450000),
--     (:tenant, :mgr, date_trunc('month', current_date)::date, 'win_rate', 0.35);
