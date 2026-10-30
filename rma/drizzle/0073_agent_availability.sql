-- 0073: agent_availability — the rental distributor's availability toggles
-- (Ayham, 2026-09): rotation agents set Available / Busy (auto-expires, see
-- busy_until) / Off duty on the hub's /availability page; the wa-lead relay and
-- the rental-distributor sweeper skip busy/off agents when dealing main-line
-- leads. Modules: src/modules/availability/store.ts, src/modules/rental/rotation.ts.
--
-- GLOBAL table (no tenant_id) — the rotations are holding-level config
-- (RENTAL_ROTATION_* env), not tenant rows, so the RLS boot guard correctly
-- leaves it alone (same class as wa_line_name / platform_admin). Idempotent.
CREATE TABLE IF NOT EXISTS agent_availability (
  agent_key text PRIMARY KEY,        -- lowercased trimmed roster name ("ali")
  display_name text NOT NULL,        -- roster spelling ("Ali")
  brand text NOT NULL DEFAULT '',    -- etm | cardiwan (the rotation they belong to)
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','busy','off')),
  busy_until timestamptz,            -- busy auto-expiry, evaluated at READ time
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text                    -- hub user id / name of whoever toggled
);
