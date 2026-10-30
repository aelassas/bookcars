-- Repair the WhatsApp hunter leads created before 2026-08-10.
--
-- Two faults, both visible to the desk as "the system knows nothing about
-- this lead":
--   1. No external_id / external_source, so the Twenty mirror skipped the row
--      entirely — the lead existed in the platform DB and nowhere the sales
--      desk actually looks.
--   2. Notes held a message UUID instead of what the client wrote. The words
--      are still in `message`, keyed by that very id, so they are recoverable.
--
-- Idempotent: only fills rows that are still missing the key, and only
-- rewrites notes that still carry the old "Auto-created by hunter" wording.
BEGIN;

-- 1. The mirror key. Phone-keyed (last 9 digits), exactly like every other
--    WhatsApp lead, so one client on two lines stays one lead. Rows whose key
--    would collide with an existing lead are left alone.
UPDATE lead l
   SET external_id = 'wa:' || right(regexp_replace(l.phone, '\D', '', 'g'), 9),
       external_source = 'whatsapp'
 WHERE l.source LIKE 'hunter:%'
   AND l.external_id IS NULL
   AND length(regexp_replace(l.phone, '\D', '', 'g')) >= 9
   AND NOT EXISTS (
     SELECT 1 FROM lead o
      WHERE o.tenant_id = l.tenant_id
        AND o.external_id = 'wa:' || right(regexp_replace(l.phone, '\D', '', 'g'), 9)
        AND o.id <> l.id
   );

-- 2. The origin, in the field built for it.
UPDATE lead
   SET source_description = 'WhatsApp · hunter ' || split_part(source, ':', 2)
 WHERE source LIKE 'hunter:%'
   AND (source_description IS NULL OR source_description = '');

-- 3. What the client actually wrote, pulled back from the origin message the
--    old note only pointed at.
UPDATE lead l
   SET notes = 'WhatsApp lead — hunter ' || split_part(l.source, ':', 2) || E'\n' ||
               'Client: ' || coalesce(l.customer_name, l.phone) || ' (' || l.phone || ')' || E'\n\n' ||
               'What they wrote:' || E'\n"' || left(m.body, 500) || '"' || E'\n\n' ||
               'Line: ' || coalesce(m."to", m.channel, '?') || ' · ' || to_char(m.created_at, 'YYYY-MM-DD') || E'\n' ||
               'Origin message ' || m.id,
       -- The ask the classifier already extracted from that same message.
       vouched_car = coalesce(l.vouched_car, left(m.extracted_car_text, 200)),
       vouched_value = coalesce(l.vouched_value, m.extracted_price_aed),
       vouched_term = coalesce(l.vouched_term, m.extracted_term_months)
  FROM message m
 WHERE l.source LIKE 'hunter:%'
   AND l.notes LIKE 'Auto-created by hunter%'
   AND m.id = substring(l.notes from 'origin message ([0-9a-f-]{36})')::uuid
   AND coalesce(m.body, '') <> '';

COMMIT;

SELECT source,
       count(*) AS leads,
       count(*) FILTER (WHERE external_id IS NOT NULL) AS mirrored,
       count(*) FILTER (WHERE notes LIKE 'WhatsApp lead%') AS with_the_words
  FROM lead
 WHERE source LIKE 'hunter:%'
 GROUP BY 1;
