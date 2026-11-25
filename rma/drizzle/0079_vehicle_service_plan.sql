-- 0079: planned-service fields on vehicle.
-- There was no way to record WHEN a car next needs service — managers kept it
-- in their heads or in Kaiten card text. The vehicle profile now has a Service
-- panel (planned date + odometer, due/overdue highlight, service history from
-- vehicle_timeline_event) and the Edit vehicle form writes these two columns.
-- Both NULL = no service planned, no highlight. Tenant table (RLS via
-- tenantTable in 0003) — a plain column add, no policy work needed. Idempotent.
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS next_service_date date; -- planned next service day; NULL = not planned
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS next_service_odometer integer; -- planned next service odometer (km); NULL = not planned

COMMENT ON COLUMN vehicle.next_service_date IS 'Planned date of the next service. The profile Service panel highlights the car when this is today or within 7 days. Written by the Edit vehicle form and the "Log service" flow.';
COMMENT ON COLUMN vehicle.next_service_odometer IS 'Planned odometer (km) of the next service. Highlighted once vehicle.odometer reaches it. Written by the Edit vehicle form and the "Log service" flow.';
