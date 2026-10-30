-- 0006_rental_money_flow.sql
-- Money-flow bridge: rentals created in-platform from live price_tier quotes
-- (createRentalFromQuote). Canonical business table = `rental`; the legacy
-- `booking` table stays read-only (Babek sheet import, shown on the calendar).
--
-- Adds to `rental`:
--   * channel      — pricing channel the quote came from (b2c | b2b); matches
--                    price_tier.channel so a stored rental is traceable to its tier.
--   * contract_url — signed rental-agreement PDF. NOT generated yet: the create
--                    action leaves it NULL with a TODO hook so the driver-bot /
--                    contract step can fill it. (deposit_amount already exists
--                    as rental.deposit + the deposit_* lifecycle columns.)
--
-- Additive only — safe on live data (rental has 0 rows today). Idempotent.
-- MUST be applied before (or together with) deploying the code that inserts
-- the `channel` column.

ALTER TABLE rental ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'b2c';
ALTER TABLE rental ADD COLUMN IF NOT EXISTS contract_url text;
