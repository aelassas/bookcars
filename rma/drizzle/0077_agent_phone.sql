-- 0077: phone override on agent_availability (Ayham, 2026-09-19).
-- Roster phones lived ONLY in the env roster strings ("Ali:9715…"), so a
-- number change meant an env edit + restart. Managers now edit the phone on
-- the /availability page; the distributor and the wa-lead relay prefer this
-- DB override over the env phone when sending assignment pings
-- (rotation.applyPhoneOverrides). NULL = no override, env phone rules.
-- Global table (no tenant_id), same class as the rest of 0073/0074. Idempotent.
ALTER TABLE agent_availability ADD COLUMN IF NOT EXISTS phone text; -- digits only, manager-set override

COMMENT ON COLUMN agent_availability.phone IS 'Manager-set WhatsApp digits override (/availability Edit). NULL = use the RENTAL_ROTATION_* env roster phone. Read by run-rental-distributor / run-wa-lead-relay via applyPhoneOverrides.';
