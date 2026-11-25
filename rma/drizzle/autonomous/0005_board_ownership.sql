-- ============================================================================
-- 0005_board_ownership.sql — Board ownership, routing & SLA escalation state
-- ============================================================================
--
-- STAGED MIGRATION — apply manually in a controlled window:
--   psql -U takeauto -d mycrm -f drizzle/autonomous/0005_board_ownership.sql
--
-- Turns the AI Board from a passive list into a workplace:
--   * source_line        — which WhatsApp line (waobs session slug) the card's
--                          thread came in on (azat-takeauto, cardiwan, easyrent,
--                          babek-rent, ...). Backfilled from message.external_message_id
--                          which is formatted `waobs:<line>:<iso-ts>:<jid>`.
--   * assigned_to        — owner of the card. Either a BRAND_OWNERS key routed
--                          from the line (e.g. 'azat', 'babek', 'cardiwan-manager')
--                          or the email/id of the human who actioned the card.
--                          Kept as text on purpose: managers are not all platform
--                          users yet. See src/modules/board/owners.ts.
--   * assigned_at        — when ownership was set.
--   * last_escalated_at  — idempotency guard for the Telegram escalation job
--                          (escalateBreachedBoardCards): a card is never nudged
--                          twice within the cooldown window.
--
-- SLA NOTE: sla_due_at already exists (0003) and is derived by classify-inbox as
-- first_seen_at + (high=1h, med=4h, low=24h). "Breached" is a COMPUTED state —
-- status = 'open' AND awaiting_reply AND sla_due_at < now() — not a column, so
-- it can never go stale. See src/modules/board/sla.ts + getBreachedCards().
--
-- Idempotent: safe to re-run (IF NOT EXISTS + null-guarded backfills).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE "board_item"
  ADD COLUMN IF NOT EXISTS "source_line"       text,
  ADD COLUMN IF NOT EXISTS "assigned_to"       text,
  ADD COLUMN IF NOT EXISTS "assigned_at"       timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "last_escalated_at" timestamp with time zone;

-- ---------------------------------------------------------------------------
-- 2. Backfill source_line from the newest inbound message of each card's thread
--    (external_message_id = 'waobs:<line>:<iso-ts>:<jid>')
-- ---------------------------------------------------------------------------
UPDATE "board_item" b
SET "source_line" = sub.line
FROM (
  SELECT DISTINCT ON (m.tenant_id, m."from")
         m.tenant_id,
         m."from"                                   AS customer_ref,
         split_part(m.external_message_id, ':', 2)  AS line
  FROM "message" m
  WHERE m.direction = 'inbound'
    AND m.external_message_id LIKE 'waobs:%'
  ORDER BY m.tenant_id, m."from", m.created_at DESC
) sub
WHERE b."source_line" IS NULL
  AND b."tenant_id"    = sub.tenant_id
  AND b."customer_ref" = sub.customer_ref;

-- ---------------------------------------------------------------------------
-- 3. Route unassigned cards to the brand/line owner.
--    KEEP THIS CASE IN SYNC with BRAND_OWNERS in src/modules/board/owners.ts.
-- ---------------------------------------------------------------------------
UPDATE "board_item"
SET "assigned_to" = CASE "source_line"
      WHEN 'azat-takeauto'         THEN 'azat'
      WHEN 'mohammed-takeauto'     THEN 'mohammed'
      WHEN 'babek-rent'            THEN 'babek'
      WHEN 'babek-rent-2'          THEN 'babek'
      WHEN 'cardiwan'              THEN 'cardiwan-manager'
      WHEN 'easyrent'              THEN 'easyrent-manager'
      WHEN 'takeauto-leasing-dept' THEN 'leasing-manager'
    END,
    "assigned_at" = now()
WHERE "assigned_to" IS NULL
  AND "source_line" IN (
    'azat-takeauto', 'mohammed-takeauto', 'babek-rent', 'babek-rent-2',
    'cardiwan', 'easyrent', 'takeauto-leasing-dept'
  );

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
-- "My cards" / per-owner queue lookups.
CREATE INDEX IF NOT EXISTS "board_item_tenant_assignee_idx"
  ON "board_item" ("tenant_id", "assigned_to")
  WHERE "status" = 'open';

-- Escalation sweep: breached + cooldown check. (Breach itself is covered by the
-- existing board_item_tenant_sla_due_idx partial index from 0003.)
CREATE INDEX IF NOT EXISTS "board_item_tenant_escalation_idx"
  ON "board_item" ("tenant_id", "last_escalated_at")
  WHERE "status" = 'open';

-- ---------------------------------------------------------------------------
-- 5. Comments
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN "board_item"."source_line"       IS 'WhatsApp line (waobs session slug) the thread arrived on; drives BRAND_OWNERS routing.';
COMMENT ON COLUMN "board_item"."assigned_to"       IS 'Card owner: a BRAND_OWNERS key (azat, babek, cardiwan-manager, ...) or the email of the human who actioned it.';
COMMENT ON COLUMN "board_item"."assigned_at"       IS 'When assigned_to was last set.';
COMMENT ON COLUMN "board_item"."last_escalated_at" IS 'Last Telegram SLA-breach nudge for this card; escalation job skips cards nudged within the cooldown window.';
