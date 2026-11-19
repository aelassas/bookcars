ALTER TABLE rental ADD COLUMN IF NOT EXISTS customer_type text;

COMMENT ON COLUMN rental.customer_type IS 'Renter deposit profile: tourist or resident. NULL on historic rentals.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_customer_type_check' AND conrelid = 'rental'::regclass) THEN
    ALTER TABLE rental ADD CONSTRAINT rental_customer_type_check CHECK (customer_type IS NULL OR customer_type IN ('tourist', 'resident'));
  END IF;
END $$;
