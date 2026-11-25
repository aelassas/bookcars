-- Long-term rentals stay active until the manager confirms a return date.
-- A NULL upper range bound is unbounded in PostgreSQL.
ALTER TABLE rental DROP CONSTRAINT IF EXISTS rental_no_overlap_active;
ALTER TABLE rental ADD CONSTRAINT rental_no_overlap_active
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(
      start_date,
      CASE WHEN extension_status = 'long_term' THEN NULL ELSE return_date END,
      '[)'
    ) WITH &&
  ) WHERE (status IN ('reserved', 'active'));
