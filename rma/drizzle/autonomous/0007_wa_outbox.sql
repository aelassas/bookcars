-- ============================================================================
-- 0007_wa_outbox.sql — WhatsApp outbox for Board "Approve & Send" path
-- ============================================================================
--
-- STAGED MIGRATION — apply manually:
--   psql -U takeauto -d mycrm -f drizzle/autonomous/0007_wa_outbox.sql
--
-- status values:
--   pending  — queued; drain loop will pick it up (if WA_SEND_ENABLED=true)
--   sent     — delivered by bridge.js; sent_at populated
--   failed   — bridge.js caught an error; error column has detail
--   skipped  — drain ran but the send was rejected (e.g. group JID); audit trail
--
-- Idempotent: safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "wa_outbox" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "board_item_id" uuid NOT NULL,
  "to_jid"        text NOT NULL,
  "brand_line"    text NOT NULL,
  "body"          text NOT NULL,
  "status"        text NOT NULL DEFAULT 'pending'
                    CHECK ("status" IN ('pending','sent','failed','skipped')),
  "approved_by"   text NOT NULL,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "sent_at"       timestamptz,
  "error"         text,
  "content_hash"  text
);

-- Prevent double-queueing the same body for the same board item
-- (idempotency: re-approving an already-pending card is a no-op at the DB level)
CREATE UNIQUE INDEX IF NOT EXISTS "wa_outbox_item_hash_pending_uidx"
  ON "wa_outbox" ("board_item_id", "content_hash")
  WHERE "status" = 'pending';

-- Drain loop primary access pattern: brand_line + pending rows ordered by created_at
CREATE INDEX IF NOT EXISTS "wa_outbox_brand_pending_idx"
  ON "wa_outbox" ("brand_line", "created_at")
  WHERE "status" = 'pending';

-- Tenant isolation for board queries
CREATE INDEX IF NOT EXISTS "wa_outbox_tenant_idx"
  ON "wa_outbox" ("tenant_id", "created_at" DESC);

-- RLS: only allow access to rows whose tenant_id matches the GUC
ALTER TABLE "wa_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wa_outbox" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_outbox_tenant_isolation" ON "wa_outbox";
CREATE POLICY "wa_outbox_tenant_isolation" ON "wa_outbox"
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Grants to app_runtime (mirrors pattern from 0003_board_item.sql).
-- NOTE: single-quoted DO body on purpose — never use dollar-quoting ($$) here.
DO 'BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''app_runtime'') THEN
    EXECUTE ''GRANT SELECT, INSERT, UPDATE ON wa_outbox TO app_runtime'';
  END IF;
END';

COMMENT ON TABLE  "wa_outbox"                IS 'Pending WhatsApp replies queued by the Board approve action. Drain loop in wa-observer/bridge.js delivers them when WA_SEND_ENABLED=true.';
COMMENT ON COLUMN "wa_outbox"."brand_line"   IS 'waobs session slug (azat-takeauto, babek-rent, etc.). Drain loop only processes rows matching its own BRAND.';
COMMENT ON COLUMN "wa_outbox"."to_jid"       IS 'WhatsApp JID to send to (e.g. 971501234567@s.whatsapp.net). Group JIDs (@g.us) are rejected by the drain loop.';
COMMENT ON COLUMN "wa_outbox"."content_hash" IS 'MD5 of body — used by the pending-unique-index to prevent double-queueing the same draft for the same card.';
COMMENT ON COLUMN "wa_outbox"."status"       IS 'pending|sent|failed|skipped. skipped means the send was rejected at drain time (e.g. group JID) — preserved for audit.';
