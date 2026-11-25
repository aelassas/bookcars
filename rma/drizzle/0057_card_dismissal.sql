-- 0057_card_dismissal.sql
--
-- DISMISS-TO-LEARN — the «Мой день» card close ledger.
--
-- «Ждут ответа» / «Горячее» are a SHARED team queue: a card someone already
-- handled (replied in WhatsApp directly, dead lead, duplicate) keeps nagging
-- everyone. Closing a card records WHY here so we both (a) drop it from the
-- /my waiting+hot queries for 14 days and (b) learn what the team is closing
-- and for what reason. Keyed by (line, contact) — the same conversation key
-- «Мой день» groups on: to = the LINE slug, coalesce(from_pn, from) = the
-- CONTACT — so a dismissal hides exactly one conversation, not a whole line.
--
-- NEW tenant-scoped table → full RLS treatment matching exactly what
-- tenantTable() emits (ENABLE + <table>_tenant_isolation policy + tenant_id
-- index); FORCE ROW LEVEL SECURITY is also applied post-migration by
-- scripts/tighten-rls.sql and verified by the boot guard.
--
-- Written by hand and idempotent (IF NOT EXISTS throughout): this box has had
-- migrations applied manually before (see 0047's note on the snapshot chain).

CREATE TABLE IF NOT EXISTS "card_dismissal" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"    uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"         text NOT NULL,                    -- waiting | hot
  "contact"      text NOT NULL,                    -- coalesce(from_pn, from) — the person
  "line"         text NOT NULL,                    -- the WA line slug (message.to)
  "dismissed_by" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "reason"       text,                             -- nullable free/quick reason ("learn what we close")
  "created_at"   timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "card_dismissal" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "card_dismissal_tenant_isolation" ON "card_dismissal"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "card_dismissal" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "card_dismissal_tenant_id_idx"
  ON "card_dismissal" ("tenant_id");--> statement-breakpoint

-- The /my waiting+hot exclusion scan: recent dismissals for one (line, contact).
CREATE INDEX IF NOT EXISTS "card_dismissal_lookup_idx"
  ON "card_dismissal" ("tenant_id", "line", "contact", "created_at" DESC);
