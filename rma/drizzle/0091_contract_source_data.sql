ALTER TABLE customer ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS emirates_id_issue date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS passport_issue date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS passport_expiry date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS driver_license_issue date;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS colour text;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS start_fuel_level integer;
