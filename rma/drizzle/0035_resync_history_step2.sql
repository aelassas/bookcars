-- Custom SQL migration file, put your code below! --
-- Re-sync *_history with base tables after 0034 added Deposit-contract +
-- sales-agent columns to rental (sales_agent_id, contract_type, deposit_status,
-- deposit_refunded, deposit_withheld_reason, deposit_resolved_at,
-- deposit_resolved_by). The write_history() trigger does a positional
-- `INSERT INTO <t>_history SELECT OLD.*, now(), op`, so a base table that gains
-- columns overflows its (now narrower) *_history table ("more expressions than
-- target columns"). This rebuilds each *_history to mirror its base table —
-- the same generic, idempotent, drift-proof rebuild as 0027/0030.
DO $$
DECLARE
  base text;
  hist text;
BEGIN
  FOREACH base IN ARRAY ARRAY['customer','deal','lead','rental','task','vehicle','message'] LOOP
    hist := base || '_history';
    EXECUTE format('DROP TABLE IF EXISTS %I', hist);
    EXECUTE format('CREATE TABLE %I (LIKE %I INCLUDING DEFAULTS)', hist, base);
    EXECUTE format('ALTER TABLE %I ADD COLUMN valid_until timestamptz', hist);
    EXECUTE format('ALTER TABLE %I ADD COLUMN op text', hist);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', hist);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', hist);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      hist || '_tenant_isolation', hist
    );
    EXECUTE format('CREATE INDEX %I ON %I (tenant_id)', hist || '_tenant_id_idx', hist);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO app_runtime', hist);
    END IF;
  END LOOP;
END $$;