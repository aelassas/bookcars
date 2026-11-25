-- 0060_rental_return_checklist.sql — return checklist on the rental.
-- Filled on the car's return before the rental is closed: fines / Salik /
-- parking / defects (manual today; Salik/fines live in iTransport). Idempotent.
ALTER TABLE rental ADD COLUMN IF NOT EXISTS return_checklist jsonb;
