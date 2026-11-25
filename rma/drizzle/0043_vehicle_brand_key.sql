-- 0043_vehicle_brand_key.sql
--
-- Keep the sheet's brand marker instead of throwing it away.
--
-- Babek's sheet column "E/C" is compound: the letter before the slash is the
-- owning company (E=ETM, C=Cardiwan) and the suffix after it says where the car
-- went. The importer read only the first letter, so 22 cars carried a marker
-- that never reached the database:
--
--   C/T (10) + E/T (2)  — handed to TAKE Auto to sell. These cars keep being
--                         rented meanwhile (5 rented, 2 booked at last import),
--                         so this is a flag on the car, not a status change.
--   C/R (9)             — meaning not yet confirmed; stored raw, not guessed.
--   E/A (1)             — meaning not yet confirmed; stored raw, not guessed.
--
-- Storing the raw value means an unknown suffix is preserved rather than
-- silently mapped to something wrong, and the meaning can be applied later
-- without re-importing.

ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS sheet_brand_key text;

COMMENT ON COLUMN vehicle.sheet_brand_key IS
  'Raw "E/C" value from Babek''s sheet, e.g. C, E, C/T, C/R, E/A. Owner = first letter; suffix = where the car was handed. /T = with TAKE Auto for sale.';
