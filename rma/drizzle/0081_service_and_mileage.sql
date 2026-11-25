ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS oil_change_interval_km integer NOT NULL DEFAULT 8000;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS daily_mileage_limit_km integer;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS start_odometer integer;

COMMENT ON COLUMN vehicle.oil_change_interval_km IS 'Per-vehicle oil-change interval in km. Used to propose the next service odometer after an oil change.';
COMMENT ON COLUMN rental.daily_mileage_limit_km IS 'Contractual mileage allowance per rental day. NULL = unlimited.';
COMMENT ON COLUMN rental.start_odometer IS 'Actual vehicle odometer captured when the rental starts; used with final_odometer to calculate mileage overage.';
