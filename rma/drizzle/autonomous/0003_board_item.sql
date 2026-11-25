-- ============================================================================
-- 0003_board_item.sql — Missed-lead triage queue ("The Board")
-- ============================================================================
--
-- STAGE: ANALYZE-ONLY / SUGGEST. This table is the human-in-the-loop chokepoint
-- for inbound customer demand that has not been handled yet. It is filled by the
-- `classify-inbox` pg-boss job, which reads inbound messages from the `message`
-- table, asks the local Qwen model for a summary + intent + draft reply, and
-- upserts a card here. NOTHING in this table is ever sent to a customer.
--
-- MULTI-TENANCY: tenant-scoped via tenant_id FK, RLS enabled + forced, with the
-- canonical tenant-isolation policy used by every tenant table in the platform.
--
-- LIFECYCLE:
--   open       -> human reviews the card
--   approved   -> human clicked Approve (Phase 1 only copies the draft to clipboard)
--   dismissed  -> human rejected the suggestion / spam
--   done       -> the underlying thread was handled elsewhere (e.g. Bitrix deal moved)
--
-- ONE ACTIVE CARD PER CUSTOMER: the partial unique index on
-- (tenant_id, customer_ref) WHERE status = 'open' prevents duplicate open cards
-- for the same customer thread. When a card is closed, a new inbound message can
-- create a new open card.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_channel') THEN
    CREATE TYPE "board_channel" AS ENUM ('whatsapp', 'instagram', 'telegram', 'call');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_intent') THEN
    CREATE TYPE "board_intent" AS ENUM ('booking', 'price', 'complaint', 'handover', 'payment', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_urgency') THEN
    CREATE TYPE "board_urgency" AS ENUM ('low', 'med', 'high');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_status') THEN
    CREATE TYPE "board_status" AS ENUM ('open', 'approved', 'dismissed', 'done');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "board_item" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"        uuid NOT NULL,
  "channel"          "board_channel" NOT NULL,
  "customer_ref"     text NOT NULL,        -- phone/E.164, IG handle, etc.
  "customer_name"    text,                 -- display name from the channel
  "summary"          text NOT NULL DEFAULT '',
  "intent"           "board_intent" NOT NULL DEFAULT 'other',
  "urgency"          "board_urgency" NOT NULL DEFAULT 'med',
  "awaiting_reply"   boolean NOT NULL DEFAULT true,
  "suggested_draft"  text,                 -- AI-drafted reply, human-approved later
  "status"           "board_status" NOT NULL DEFAULT 'open',
  "first_seen_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "sla_due_at"       timestamp with time zone NOT NULL DEFAULT now() + interval '4 hours',
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'board_item_tenant_id_tenant_id_fk' AND conrelid = 'board_item'::regclass
  ) THEN
    ALTER TABLE "board_item"
      ADD CONSTRAINT "board_item_tenant_id_tenant_id_fk"
      FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "board_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "board_item" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board_item_tenant_isolation" ON "board_item";

CREATE POLICY "board_item_tenant_isolation" ON "board_item"
  AS PERMISSIVE
  FOR ALL
  TO public
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- The main queue index used by The Board UI: awaiting reply first, then
-- urgency, then closest-to-breach SLA.
CREATE INDEX IF NOT EXISTS "board_item_tenant_queue_idx"
  ON "board_item" ("tenant_id", "awaiting_reply" DESC, "urgency" DESC, "sla_due_at" ASC)
  WHERE "status" = 'open';

-- Only one open card per customer thread.
CREATE UNIQUE INDEX IF NOT EXISTS "board_item_open_customer_uq"
  ON "board_item" ("tenant_id", "customer_ref")
  WHERE "status" = 'open';

-- Look-ups by status / channel / SLA.
CREATE INDEX IF NOT EXISTS "board_item_tenant_status_idx"
  ON "board_item" ("tenant_id", "status", "updated_at" DESC);

CREATE INDEX IF NOT EXISTS "board_item_tenant_channel_idx"
  ON "board_item" ("tenant_id", "channel");

CREATE INDEX IF NOT EXISTS "board_item_tenant_sla_due_idx"
  ON "board_item" ("tenant_id", "sla_due_at")
  WHERE "status" = 'open';

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
COMMENT ON TABLE "board_item" IS 'Human-in-the-loop triage queue for inbound customer demand. Filled by classify-inbox; never sends anything to a customer.';
COMMENT ON COLUMN "board_item"."customer_ref" IS 'Channel-native customer identifier (E.164 phone, Instagram handle, Telegram id, etc.).';
COMMENT ON COLUMN "board_item"."awaiting_reply" IS 'TRUE when the last inbound message still needs a human response.';
COMMENT ON COLUMN "board_item"."suggested_draft" IS 'AI-drafted reply. Phase 1 only copies to clipboard on human approval.';
COMMENT ON COLUMN "board_item"."sla_due_at" IS 'Target response time derived from urgency (high=1h, med=4h, low=24h from first_seen_at).';
