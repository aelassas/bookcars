-- Real Bitrix lead-status NAME per lead, so the rent board can render each
-- portal's OWN funnel (cardiwan's 10 stages, easyrent's 5) instead of the
-- coarse `status` bucket that flattened everything to 'new'. Idempotent.
ALTER TABLE lead ADD COLUMN IF NOT EXISTS stage_detail text;
