-- 0069_b2b_offer.sql
--
-- B2B OFFER INDEX — operator supply/demand mined from the group streams.
--
-- The WhatsApp/Telegram groups we already ingest carry two kinds of traffic:
-- customers asking for cars (the wa-lead-relay owns those) and OPERATORS —
-- other rental companies offering cars (supply) and people seeking them
-- (demand). platform/src/platform/ai/b2b-matcher.ts classifies group threads
-- and files the B2B half here; when our own fleet is short for a deal, the
-- matcher checks this index for a FRESH supply offer and DMs the manager.
--
-- 24h freshness is a hard rail: expires_at = spotted_at + 24h, the matcher
-- never suggests an expired offer, and the pass DELETES expired rows — this
-- table is an index of what is fresh NOW; the source `message` rows keep the
-- history.
--
-- NEW tenant-scoped table → full RLS treatment matching exactly what
-- tenantTable() emits (ENABLE + <table>_tenant_isolation policy + tenant_id
-- index); FORCE ROW LEVEL SECURITY is also applied post-migration by
-- scripts/tighten-rls.sql and verified by the boot guard.
--
-- Written by hand and idempotent (IF NOT EXISTS throughout), same convention
-- as 0068_call_transcript.sql.

CREATE TABLE IF NOT EXISTS "b2b_offer" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"       uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "kind"            text NOT NULL,                 -- supply | demand
  "car_text"        text,
  "price_aed"       integer,
  "contact_text"    text,                          -- phone/handle as written
  "source_label"    text,                          -- "WhatsApp group: <jid>" / "Telegram: <title>"
  "message_ext_id"  text,                          -- dedupe key (unique per tenant)
  "body_excerpt"    text,
  "spotted_at"      timestamptz NOT NULL,
  "expires_at"      timestamptz NOT NULL,          -- spotted_at + 24h
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "b2b_offer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "b2b_offer_tenant_isolation" ON "b2b_offer"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "b2b_offer" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "b2b_offer_tenant_id_idx"
  ON "b2b_offer" ("tenant_id");--> statement-breakpoint

-- Dedupe: one offer row per source message per tenant — the pass inserts
-- ON CONFLICT DO NOTHING against this.
CREATE UNIQUE INDEX IF NOT EXISTS "b2b_offer_tenant_extid_uidx"
  ON "b2b_offer" ("tenant_id", "message_ext_id");--> statement-breakpoint

-- The matcher's scan: fresh offers of one kind per tenant.
CREATE INDEX IF NOT EXISTS "b2b_offer_tenant_kind_expires_idx"
  ON "b2b_offer" ("tenant_id", "kind", "expires_at");
