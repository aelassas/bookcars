-- History tables inherit tenant_id from source tables; RLS must apply to them too.
-- ADR-001 §16: "_history rows inherit tenant_id from the original row, so RLS
-- policies apply naturally if we add them."

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE '%_history'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid)',
      t || '_tenant_isolation', t
    );
  END LOOP;
END $$;
