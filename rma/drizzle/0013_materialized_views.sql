-- ADR-001 §17: materialized views + summary tables for dashboard KPIs.
-- Refresh via pg_cron (Hetzner) or recurring pg-boss job (Neon CI).

CREATE MATERIALIZED VIEW IF NOT EXISTS fleet_status_summary AS
SELECT tenant_id, status, count(*) AS count
FROM vehicle
GROUP BY tenant_id, status;

CREATE UNIQUE INDEX IF NOT EXISTS fleet_status_summary_tenant_status_idx
  ON fleet_status_summary (tenant_id, status);

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_kpis AS
SELECT
  tenant_id,
  date_trunc('day', created_at) AS day,
  count(*) FILTER (WHERE created_at >= date_trunc('day', now())) AS leads_today,
  count(*) AS total_leads
FROM lead
GROUP BY tenant_id, date_trunc('day', created_at);

CREATE UNIQUE INDEX IF NOT EXISTS daily_kpis_tenant_day_idx
  ON daily_kpis (tenant_id, day);
