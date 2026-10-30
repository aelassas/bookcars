-- 0064_twenty_mirror.sql — resume state for the Bitrix24 → Twenty CRM mirror
-- (platform/src/platform/integrations/twenty/mirror.ts). Applied manually on
-- the box with a backup, like 0058–0063. Idempotent.
--
-- Boot-guard (platform/db/startup-check.ts) requires the full RLS triad on
-- every table with a tenant_id column: ENABLE + FORCE + a
-- <table>_tenant_isolation policy — all three are created here.

CREATE TABLE IF NOT EXISTS twenty_mirror_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  entity text NOT NULL,                    -- contacts | leads | deals
  cursor text,                             -- last mirrored external id (resume token)
  status text NOT NULL DEFAULT 'running',  -- running | done
  counts jsonb NOT NULL DEFAULT '{}'::jsonb, -- {read,admitted,created,updated,dropped,verdicts}
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One state row per (tenant, entity) — the mirror upserts on this pair.
CREATE UNIQUE INDEX IF NOT EXISTS twenty_mirror_state_tenant_entity_uniq
  ON twenty_mirror_state(tenant_id, entity);
CREATE INDEX IF NOT EXISTS twenty_mirror_state_tenant_id_idx
  ON twenty_mirror_state(tenant_id);

ALTER TABLE twenty_mirror_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE twenty_mirror_state FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'twenty_mirror_state_tenant_isolation') THEN
    CREATE POLICY "twenty_mirror_state_tenant_isolation" ON twenty_mirror_state
      AS PERMISSIVE FOR ALL TO public
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;
