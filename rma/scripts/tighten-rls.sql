-- ADR-002 ancillary script.
-- Applies FORCE ROW LEVEL SECURITY to every table that has RLS enabled
-- but is not yet FORCEd. Drizzle's pgPolicy API (as of 0.45) does not
-- emit FORCE in generated migrations; this script closes the gap and
-- is idempotent.
--
-- Run after every `drizzle-kit migrate`. Verified by the boot guard
-- (platform/src/platform/db/startup-check.ts).

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM   pg_class     c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relkind            = 'r'
      AND  n.nspname            = 'public'
      AND  c.relrowsecurity     = true
      AND  c.relforcerowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', r.relname);
  END LOOP;
END $$;
