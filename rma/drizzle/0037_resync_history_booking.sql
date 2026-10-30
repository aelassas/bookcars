-- Custom SQL migration file, put your code below! --
-- Re-sync *_history after 0036 added rental.booking_basis. The positional
-- write_history() trigger (`INSERT INTO <t>_history SELECT OLD.*, now(), op`)
-- overflows rental_history unless it mirrors the widened base table. Same
-- idempotent, drift-proof rebuild as 0027/0030/0035.
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