-- Booking + pricing data model — wires the Booking Calendar (contract Module 3)
-- and the Pricing engine (4-tier + deposit + Cardoo) to Babek's real fleet.
-- Additive only. RLS matches the tenantTable() pattern; grants to app_runtime.

-- ── price_tier: per-car tiered daily rates (B2C/B2B) + per-car deposit & Cardoo ──
CREATE TABLE IF NOT EXISTS price_tier (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vehicle_id  uuid NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
  channel     text NOT NULL DEFAULT 'b2c',        -- b2c | b2b
  min_days    integer NOT NULL,                    -- tier lower bound (days)
  max_days    integer,                             -- upper bound; null = open-ended (30+)
  daily_rate  integer NOT NULL,                    -- AED/day for this tier+channel
  deposit     integer,                             -- per-car deposit (UNVERIFIED — confirm w/ Babek)
  cardoo      integer,                             -- per-car Cardoo base (UNVERIFIED — confirm w/ Babek)
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_tier_vehicle_idx ON price_tier(tenant_id, vehicle_id, channel);
ALTER TABLE price_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tier FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS price_tier_tenant_isolation ON price_tier;
CREATE POLICY price_tier_tenant_isolation ON price_tier FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── booking: the calendar's real booking records ──
CREATE TABLE IF NOT EXISTS booking (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  vehicle_id    uuid NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
  customer_name text,
  channel       text NOT NULL DEFAULT 'b2c',       -- b2c | b2b | deposit
  date_from     date,
  date_to       date,
  status        text NOT NULL DEFAULT 'booked',     -- booked | active | returned | cancelled
  deposit       integer,
  cardoo        integer,
  manager       text,                               -- owning manager (Babek/Abdulla/Ali/…)
  source        text NOT NULL DEFAULT 'babek-sheet',
  external_id   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_vehicle_dates_idx ON booking(tenant_id, vehicle_id, date_from, date_to);
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS booking_tenant_isolation ON booking;
CREATE POLICY booking_tenant_isolation ON booking FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- grant runtime access to the app role (matches tenantTable helper)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON price_tier, booking TO app_runtime;
  END IF;
END $$;
