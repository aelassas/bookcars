-- Fix the row-history feature (write_history() trigger + *_history tables).
--
-- Bug 1 (systemic): every *_history table had PRIMARY KEY (id). The trigger
-- does `INSERT INTO <t>_history SELECT OLD.*, now(), op`, re-inserting OLD.id.
-- A SECOND update to any row collided on <t>_history_pkey — breaking every
-- multi-step flow (rental reserved→active→returned, deal stage moves, message
-- new→classified→drafted→sent, any 2nd edit).
--
-- Bug 2 (drift): base tables gained columns over time (e.g. message gained
-- to/error_message/..., rental gained final_odometer/fuel_level/... in
-- 0024_return_inspection) but their *_history tables were never updated, so the
-- positional trigger INSERT overflowed ("more expressions than target columns").
--
-- Fix generically: rebuild each *_history table to mirror its base table
-- (LIKE base) + the (valid_until, op) history meta columns, with forced RLS,
-- and NO unique PK (a history log versions a row many times). Idempotent and
-- drift-proof: re-running re-aligns history to the current base schema.

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
