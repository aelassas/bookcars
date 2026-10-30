-- 0065_bitrix_semantic_fields.sql
--
-- THE FIELDS THE ORIGINAL IMPORT DROPPED. The Bitrix deal carries the real
-- sales content — the BitrixGPT summary of client needs (COMMENTS), the loss
-- reason / language / car-model enumerations (UF_*), the social profile
-- (SOURCE_DESCRIPTION / contact WEB), the return-customer flag, and the
-- MOVED_* stage-movement audit — but the mapping kept ~10 admin fields and
-- threw the rest away. These columns store it, in Bitrix's own words; the
-- Twenty mirror projects them onwards (opportunity fields, a summary note,
-- person traits, stageEvent audit rows).
--
-- The UF ids differ per portal, so nothing portal-specific is stored: the
-- sync resolves the fields BY MEANING from crm.deal.userfield.list
-- (mappings.ts createDealUserFieldCatalog) and writes the enumeration LABELS.
-- Populated on every incremental/full pass — the first nightly reconcile
-- after deploy backfills the existing rows (same path as 0053).
--
-- Hand-written and idempotent (this box applies migrations manually).

ALTER TABLE deal ADD COLUMN IF NOT EXISTS source_comments text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS source_description text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS loss_reason text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS car_models text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS language_segment text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS return_customer boolean;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS source_moved_at timestamptz;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS source_moved_by_id text;--> statement-breakpoint
ALTER TABLE deal ADD COLUMN IF NOT EXISTS previous_stage_detail text;--> statement-breakpoint

ALTER TABLE lead ADD COLUMN IF NOT EXISTS source_description text;--> statement-breakpoint

ALTER TABLE customer ADD COLUMN IF NOT EXISTS social_url text;
