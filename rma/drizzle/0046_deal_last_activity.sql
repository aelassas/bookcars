-- 0046_deal_last_activity.sql
--
-- Make "open deals" mean the pipeline instead of the archive.
--
-- The dashboard showed 25,130 open deals worth AED 2,005,993,560. Both numbers
-- were true and both were useless: the Bitrix import brought four years of
-- history across, everything that was never explicitly won or lost arrived as
-- status='open', and 24,957 of them sit in the 'inquiry' stage. Half carry no
-- value at all. A manager opening the CRM saw a two-billion pipeline that does
-- not exist.
--
-- The real dates survived — every Bitrix record was archived whole in
-- integration_event.raw_payload, including LAST_ACTIVITY_TIME. Reading it back
-- separates the 1,087 deals someone has actually touched in the last 90 days
-- (AED ~129M) from the 24,042 nobody has looked at in years.
--
-- deal.created_at cannot serve here: it holds the import timestamp, so every
-- deal looks like it was created the day we pulled it.

ALTER TABLE deal ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- The backfill joins 95k JSONB rows; without this it is a sequential scan per
-- deal. Partial: only Bitrix records carry an 'ID' worth matching on.
CREATE INDEX IF NOT EXISTS integration_event_bitrix_id_idx
  ON integration_event ((raw_payload->>'ID'))
  WHERE provider = 'bitrix24';

UPDATE deal d
   SET last_activity_at = COALESCE(
         (ie.raw_payload->>'LAST_ACTIVITY_TIME')::timestamptz,
         (ie.raw_payload->>'DATE_MODIFY')::timestamptz,
         (ie.raw_payload->>'DATE_CREATE')::timestamptz)
  FROM integration_event ie
 WHERE ie.provider = 'bitrix24'
   AND ie.raw_payload->>'ID' = d.external_id
   AND d.last_activity_at IS NULL;

-- Deals created inside the platform have no Bitrix record; their own timestamps
-- are honest, so fall back to them rather than leaving a NULL that would read
-- as "never touched" and hide a live deal.
UPDATE deal
   SET last_activity_at = COALESCE(updated_at, created_at)
 WHERE last_activity_at IS NULL;

CREATE INDEX IF NOT EXISTS deal_tenant_status_activity_idx
  ON deal (tenant_id, status, last_activity_at DESC);
