ALTER TABLE rental_history_pre0009 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_history_pre0009 FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rental_history_pre0009_tenant_isolation ON rental_history_pre0009;
CREATE POLICY rental_history_pre0009_tenant_isolation ON rental_history_pre0009
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DO 'BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''app_runtime'') THEN
    EXECUTE ''GRANT SELECT ON rental_history_pre0009 TO app_runtime'';
  END IF;
END';
