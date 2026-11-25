-- 0009: resync rental_history to mirror rental (fixes write_history positional trigger; adds channel, contract_url)
CREATE TABLE IF NOT EXISTS rental_history_pre0009 AS SELECT * FROM rental_history;
DROP TABLE rental_history;
CREATE TABLE rental_history (LIKE rental INCLUDING DEFAULTS);
ALTER TABLE rental_history ADD COLUMN valid_until timestamptz DEFAULT now();
ALTER TABLE rental_history ADD COLUMN op text;
ALTER TABLE rental_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_history FORCE ROW LEVEL SECURITY;
CREATE POLICY rental_history_tenant_isolation ON rental_history USING (tenant_id = (current_setting('app.tenant_id', true))::uuid);
-- Guarded like every other GRANT in this repo (see drizzle/0032_search_doc.sql):
-- the app role is created by `npm run db:app-role`, which runs AFTER migrations,
-- so on a database built from scratch this role does not exist yet and a bare
-- GRANT aborts the whole migration. Skipping is safe — create-app-role grants
-- SELECT/INSERT/UPDATE/DELETE on ALL TABLES in the schema, so this table is
-- covered either way.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT INSERT, SELECT, UPDATE, DELETE ON rental_history TO app_runtime;
  END IF;
END $$;
