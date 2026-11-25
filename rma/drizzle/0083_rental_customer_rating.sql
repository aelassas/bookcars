ALTER TABLE rental ADD COLUMN IF NOT EXISTS customer_rating integer;

COMMENT ON COLUMN rental.customer_rating IS 'Optional customer rating from 1 to 5 recorded during return inspection.';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_customer_rating_check' AND conrelid = 'rental'::regclass) THEN
    ALTER TABLE rental ADD CONSTRAINT rental_customer_rating_check CHECK (customer_rating IS NULL OR customer_rating BETWEEN 1 AND 5);
  END IF;
END $$;
