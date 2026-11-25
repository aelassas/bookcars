-- 0062_customer_dedup.sql — RECORD of the manual customer dedup + partial
-- unique index applied on the box 2026-07-28 (backup mycrm-pre-dedup-*.sql.gz).
-- The dedup itself was a one-off data operation (not replayable); what remains
-- as schema is the partial unique index below. Applied manually like 0058–0061.
--
-- What was done (one transaction):
--   * Dup groups = (tenant_id, right(regexp_replace(coalesce(phone,''),'\D','','g'),9))
--     among rows with >= 9 phone digits. Canonical = oldest created_at;
--     tie -> most FK links (rental+lease+message); then id ASC.
--   * FK re-point: rental/lease/message customer_id -> canonical (turned out
--     0 rows referenced dup rows), DELETE 7,651 dup rows
--     (take-auto 6,712 · easyrent 907 · cardiwan 32).
--   * Verified: 0 dup groups left; rental/lease/message counters unchanged;
--     customer 83,992 -> 76,341 (= before - 7,651).
--
-- Backstop that replaced the plain index from 0061 (plain was non-unique
-- because these dups existed; mirror-write races are now handled by
-- ON CONFLICT upsert in mirrorCustomerIntoHome, modules/rental/actions.ts):

CREATE UNIQUE INDEX IF NOT EXISTS customer_tenant_phone_tail9_uidx
  ON customer (tenant_id, (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)))
  WHERE length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) >= 9;

DROP INDEX IF EXISTS customer_tenant_phone_tail9_idx;

-- Walk-in customers with short/empty phones are intentionally OUTSIDE this
-- index (legitimately non-unique); the brand-id mirror link dedupes those.
