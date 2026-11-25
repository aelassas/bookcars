-- 0061_booking_integrity.sql — DB-level backstops for the booking write-path
-- (audit 2026-07-28 follow-up). Applied manually on the box, like 0058–0060.
-- Idempotent. Run the pre-checks at the bottom FIRST: if either returns rows,
-- resolve the duplicates/overlaps before applying the constraint/index.

-- 1) Customer phone-tail index (last 9 digits) per tenant — backs the
--    rent-brand customer mirror's match query. NON-unique on purpose: the
--    live customer table already contains duplicate tails (repeat imports),
--    so a unique index cannot be built until that data is deduped (tracked
--    as a data-cleanup task). Mirror-write races are instead serialized by a
--    transaction-scoped advisory lock on (tenant|phone) in app code
--    (mirrorCustomerIntoHome, modules/rental/actions.ts). Once the table is
--    deduped, this can be redone as UNIQUE ... WHERE tail <> ''.
--    Partial: rows without a usable phone are excluded (junk tails like
--    000000000 would otherwise dominate the index).
CREATE INDEX IF NOT EXISTS customer_tenant_phone_tail9_idx
  ON customer (tenant_id, (right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9)))
  WHERE right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 9) <> '';

-- 2) Exclusion constraint: a vehicle can have only ONE reserved/active rental
--    per time range. Check-then-insert in app code is not enough under
--    concurrency (two drags on the fleet board / drag + New Booking could both
--    pass the overlap check). This makes double-booking impossible at the DB
--    level regardless of which code path writes.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_no_overlap_active') THEN
    ALTER TABLE rental ADD CONSTRAINT rental_no_overlap_active
      EXCLUDE USING gist (
        vehicle_id WITH =,
        tstzrange(start_date, return_date, '[)') WITH &&
      ) WHERE (status IN ('reserved', 'active'));
  END IF;
END $$;

-- ── Pre-checks (run before applying; both must return 0 rows) ────────────────
-- Duplicate phone tails per tenant (blocks the unique index):
--   SELECT tenant_id, right(regexp_replace(coalesce(phone,''),'\D','','g'),9) AS tail, count(*)
--   FROM customer
--   WHERE right(regexp_replace(coalesce(phone,''),'\D','','g'),9) <> ''
--   GROUP BY 1, 2 HAVING count(*) > 1;
-- Overlapping reserved/active rentals on the same vehicle (blocks the constraint):
--   SELECT a.id, b.id, a.vehicle_id
--   FROM rental a JOIN rental b
--     ON a.vehicle_id = b.vehicle_id AND a.id < b.id
--   WHERE a.status IN ('reserved','active') AND b.status IN ('reserved','active')
--     AND tstzrange(a.start_date, a.return_date, '[)') && tstzrange(b.start_date, b.return_date, '[)');
