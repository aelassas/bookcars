-- 0050_intel_extraction.sql
--
-- INTELLIGENCE LAYER — "Bitrix sums are BS; truth lives in conversations."
--
-- Three additive changes, all idempotent, none touching existing data:
--
--   1. message.extracted_*   — the six deal-driving facts mined from every
--      inbound line by modules/messaging/extract.ts (car, price, dates, term,
--      intent, language, manager mention) + extracted_at (backfill cursor).
--
--   2. deal / lead .vouched_* — the car / value / term the CUSTOMER actually
--      named in chat, rolled up from message extraction (modules/messaging/
--      vouch.ts). Distinct from the Bitrix value/type the owner calls "BS".
--
--   3. competitor_offer       — rows shredded from rival shops' daily "available
--      cars" broadcasts (TOP CAR RENT A CAR, ZORWAH, …) that land in the same
--      WhatsApp chats, for a later one-screen market view.
--
-- `message`, `deal`, `lead` all already carry tenant_id + their RLS triad, so
-- the new nullable columns need no policy and don't affect the boot guard.
-- `competitor_offer` is a NEW tenant-scoped table, so it gets the full RLS
-- treatment below, matching exactly what tenantTable() emits (ENABLE + the
-- <table>_tenant_isolation policy + a tenant_id index); FORCE ROW LEVEL
-- SECURITY is applied post-migration by scripts/tighten-rls.sql and verified by
-- the boot guard (platform/src/platform/db/startup-check.ts).
--
-- Written by hand and idempotent (IF NOT EXISTS throughout): this box has had
-- migrations applied manually before. The drizzle snapshot chain is only
-- refreshed for generate-time diffing (see 0047's note); safe to re-run.

-- ── 1. message.extracted_* ──────────────────────────────────────────────────
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_car_text" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_price_aed" integer;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_date_from" date;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_date_to" date;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_term_months" integer;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_intent" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_language" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_manager_mention" text;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "extracted_at" timestamptz;--> statement-breakpoint

-- Hot-car demand scan: recent inbound lines that named a car.
CREATE INDEX IF NOT EXISTS "message_extracted_car_idx"
  ON "message" ("tenant_id", "direction", "created_at" DESC);--> statement-breakpoint

-- ── 2. deal / lead .vouched_* ───────────────────────────────────────────────
ALTER TABLE "deal" ADD COLUMN IF NOT EXISTS "vouched_car" text;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN IF NOT EXISTS "vouched_value" integer;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN IF NOT EXISTS "vouched_term" integer;--> statement-breakpoint

ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "vouched_car" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "vouched_value" integer;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN IF NOT EXISTS "vouched_term" integer;--> statement-breakpoint

-- ── 3. competitor_offer (NEW tenant-scoped table) ───────────────────────────
CREATE TABLE IF NOT EXISTS "competitor_offer" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"         uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  -- The broadcast this row was shredded from (dedupe / provenance). SET NULL so
  -- deleting a message keeps the parsed market row.
  "source_message_id" uuid REFERENCES "message"("id") ON DELETE SET NULL,
  "competitor"        text,          -- shop name from the post header
  "source_line"       text NOT NULL, -- verbatim line the row came from
  "car_text"          text,          -- best-effort parsed car (make model year)
  "year"              integer,
  "price_aed"         integer,       -- quoted price when the list stated one
  "posted_at"         timestamptz,   -- the broadcast's timestamp
  "created_at"        timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "competitor_offer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "competitor_offer_tenant_isolation" ON "competitor_offer"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "competitor_offer" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "competitor_offer_tenant_id_idx"
  ON "competitor_offer" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_tenant_posted_idx"
  ON "competitor_offer" ("tenant_id", "posted_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_tenant_car_idx"
  ON "competitor_offer" ("tenant_id", "car_text");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitor_offer_source_msg_idx"
  ON "competitor_offer" ("source_message_id");
