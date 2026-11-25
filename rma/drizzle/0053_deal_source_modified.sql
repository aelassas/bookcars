-- 0053_deal_source_modified.sql
--
-- HONEST FRESHNESS, part 2. The nightly Bitrix full reconcile rewrites rows
-- wholesale and bumps our updated_at en masse (measured 2026-07-23: 61,672
-- deals "updated" in 24h vs 66 actually modified in Bitrix) — so updated_at
-- says "recently synced", not "recently touched by a human". This column
-- stores Bitrix's OWN DATE_MODIFY per deal; the Watchers board sorts/colors
-- by greatest(coalesce(source_modified_at, updated_at), newest linked WA
-- message). Populated by mapBitrixDealToDeal on every incremental/full pass —
-- the first nightly reconcile after deploy backfills all rows.
--
-- Hand-written and idempotent (this box applies migrations manually).

ALTER TABLE deal ADD COLUMN IF NOT EXISTS source_modified_at timestamptz;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS deal_tenant_source_modified_idx
  ON deal (tenant_id, source_modified_at DESC) WHERE source_modified_at IS NOT NULL;
