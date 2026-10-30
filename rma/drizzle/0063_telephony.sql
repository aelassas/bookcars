-- 0063_telephony.sql — the platform's own call contour (provider-agnostic;
-- first adapter: Twilio). Applied manually on the box with a backup, like
-- 0058–0062. Idempotent.

CREATE TABLE IF NOT EXISTS "call" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  lead_id uuid REFERENCES lead(id),
  customer_id uuid REFERENCES customer(id),
  manager_id uuid NOT NULL REFERENCES "user"(id),
  direction text NOT NULL,              -- outbound | inbound
  phone text NOT NULL,                  -- counterparty digits
  provider text NOT NULL DEFAULT 'twilio',
  provider_call_id text,                -- Twilio SID / provider id
  status text NOT NULL DEFAULT 'initiated', -- initiated | ringing | in-progress | completed | no-answer | busy | failed | missed
  duration_sec integer,
  recording_url text,
  transcript text,
  qa jsonb,                             -- {score: 1-10, flags: string[], summary: string} — filled by the QA pass
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_tenant_id_idx ON "call"(tenant_id);
CREATE INDEX IF NOT EXISTS call_tenant_lead_idx ON "call"(tenant_id, lead_id);
CREATE INDEX IF NOT EXISTS call_tenant_manager_idx ON "call"(tenant_id, manager_id);
CREATE INDEX IF NOT EXISTS call_provider_id_idx ON "call"(provider_call_id);
CREATE INDEX IF NOT EXISTS call_tenant_created_idx ON "call"(tenant_id, created_at DESC);

ALTER TABLE "call" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "call" FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'call_tenant_isolation') THEN
    CREATE POLICY "call_tenant_isolation" ON "call" AS PERMISSIVE FOR ALL TO public
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END IF;
END $$;

-- Per-tenant unguessable token binding inbound telephony webhooks to a
-- tenant (same threat model as callgear_webhook_token).
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS telephony_webhook_token text;
