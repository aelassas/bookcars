-- platform/drizzle/autonomous/0008_rental_lifecycle.sql
-- Rental lifecycle: link driver assignments to the triggering rental.
-- Safe on live data: additive only, column is nullable.
-- Apply with: psql -U takeauto -d mycrm -f drizzle/autonomous/0008_rental_lifecycle.sql

ALTER TABLE driver_assignment
  ADD COLUMN IF NOT EXISTS rental_id uuid REFERENCES rental(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS driver_assignment_rental_idx
  ON driver_assignment (tenant_id, rental_id)
  WHERE rental_id IS NOT NULL;
