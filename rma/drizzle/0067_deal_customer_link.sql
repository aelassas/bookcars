-- 0067: deal.customer_id — the Bitrix CONTACT_ID link.
-- EasyRent deals (237/237 measured 2026-08-08) have lead_id NULL: the Bitrix
-- deal carries a CONTACT_ID, not a lead link, and the platform never stored
-- it. Without it the AI resolver cannot find the customer's phone (it read
-- deal→lead only) and every case fell through the evidence gate. Nullable;
-- populated by the deals sync when the contact is already synced, healed by
-- the nightly reconcile otherwise.
ALTER TABLE deal ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customer(id);
