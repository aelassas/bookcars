-- 0041_vehicle_timeline.sql
-- Per-vehicle calendar / live archive.
--
-- Every car gets its own timeline: rentals, handover, return, maintenance,
-- service, damage, fines and documents all land in one table keyed by
-- vehicle_id, so opening a car shows its whole life (and later feeds RAG).
--
-- Hand-written (not drizzle-kit generate) because of the GiST exclusion
-- constraint below, which drizzle-kit cannot express. Idempotent throughout so
-- it is safe to re-run against a box where part of it already landed.

CREATE TABLE IF NOT EXISTS vehicle_timeline_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  vehicle_id  uuid NOT NULL REFERENCES vehicle(id),
  type        text NOT NULL,
  starts_at   timestamptz NOT NULL,
  -- NULL = open-ended (still running); read as +infinity by the constraint below.
  ends_at     timestamptz,
  status      text NOT NULL DEFAULT 'planned',
  title       text,
  rental_id   uuid REFERENCES rental(id),
  document_id uuid REFERENCES document(id),
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Row-level security. MANDATORY: verifyRlsAtBoot() crashes the app on startup
-- if any table with a tenant_id column is missing RLS. Must match the
-- predicate emitted by tenantTable() (platform/src/platform/db/tenant-table.ts)
-- exactly, or the app and the migration disagree about visibility.
ALTER TABLE vehicle_timeline_event ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY vehicle_timeline_event_tenant_isolation ON vehicle_timeline_event
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS vehicle_timeline_event_tenant_id_idx
  ON vehicle_timeline_event (tenant_id);
CREATE INDEX IF NOT EXISTS vehicle_timeline_tenant_vehicle_starts_idx
  ON vehicle_timeline_event (tenant_id, vehicle_id, starts_at);
CREATE INDEX IF NOT EXISTS vehicle_timeline_rental_idx
  ON vehicle_timeline_event (rental_id);

-- Range index backing the overlap constraint and the calendar's window scans
-- (every calendar read is "events of this car intersecting [from, to]").
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS vehicle_timeline_range_idx
  ON vehicle_timeline_event
  USING gist (vehicle_id, tstzrange(starts_at, COALESCE(ends_at, 'infinity'::timestamptz)));

-- ── Double-booking prevention, enforced by the DATABASE ────────────────────
-- WHY not a check in the UI or the server action: two agents booking the same
-- car at the same moment both SELECT "free", both see no conflict, and both
-- INSERT. An application-level check cannot close that race — the two
-- transactions never see each other's uncommitted row. Only a constraint
-- evaluated at commit time can, so the second INSERT fails with SQLSTATE 23P01
-- and timeline-actions.ts turns it into a human message.
--
-- Scope: real rentals only. Cancelled events free the slot again, and service /
-- fine / document events are allowed to overlap a rental (a fine arrives while
-- the car is out — that is normal, not a conflict).
DO $$
BEGIN
  ALTER TABLE vehicle_timeline_event
    ADD CONSTRAINT vehicle_rental_no_overlap
    EXCLUDE USING gist (
      vehicle_id WITH =,
      tstzrange(starts_at, COALESCE(ends_at, 'infinity'::timestamptz)) WITH &&
    ) WHERE (type = 'rental' AND status <> 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
