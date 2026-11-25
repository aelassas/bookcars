-- 0056_notification.sql
--
-- PUSH-FIRST — the notification ledger.
--
-- The platform's value was all pull (web pages) while the team lives in
-- Telegram/WhatsApp. modules/notify delivers signals to each person's personal
-- Telegram; this table is the ledger every ping goes through BEFORE the Bot
-- API is called (insert-or-skip on dedupe_key), so nobody is ever pinged twice
-- about the same thing. It also serves as the per-person daily rate-cap
-- counter and the first-run backfill guard (pre-existing signals are recorded
-- as status='backfill' without sending).
--
-- NEW tenant-scoped table → full RLS treatment matching exactly what
-- tenantTable() emits (ENABLE + <table>_tenant_isolation policy + tenant_id
-- index); FORCE ROW LEVEL SECURITY is also applied post-migration by
-- scripts/tighten-rls.sql and verified by the boot guard.
--
-- Written by hand and idempotent (IF NOT EXISTS throughout): this box has had
-- migrations applied manually before (see 0047's note on the snapshot chain).

CREATE TABLE IF NOT EXISTS "notification" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"      uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"           text NOT NULL,                    -- wait | hot_deal | hot_lead | digest | ceo_digest
  -- Who was pinged: a platform user when known, else the owner key from
  -- modules/board/owners.ts ('azat', 'babek', …). At least one is set.
  "target_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "target_key"     text,
  "chat_id"        text,                             -- resolved Telegram chat id actually used (audit)
  "entity_type"    text,                             -- board_item | deal | lead | …
  "entity_id"      text,
  "dedupe_key"     text NOT NULL,
  -- pending (claimed, send in flight) | sent | failed | backfill.
  -- Failed rows are reclaimable — a later run may retry the same dedupe_key.
  "status"         text NOT NULL DEFAULT 'pending',
  "error"          text,
  "preview"        text,                             -- first line of what was sent
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "sent_at"        timestamptz
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "notification_tenant_isolation" ON "notification"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "notification_tenant_id_idx"
  ON "notification" ("tenant_id");--> statement-breakpoint

-- The never-ping-twice guarantee lives in the database, not in read-then-write
-- application code: two concurrent rule runs race, and only one insert wins.
CREATE UNIQUE INDEX IF NOT EXISTS "notification_dedupe_idx"
  ON "notification" ("tenant_id", "dedupe_key");--> statement-breakpoint

-- Rate-cap scan: today's sent pings for one person.
CREATE INDEX IF NOT EXISTS "notification_target_created_idx"
  ON "notification" ("tenant_id", "target_user_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_key_created_idx"
  ON "notification" ("tenant_id", "target_key", "created_at" DESC);
