-- 0080: TARS (tars.rta.ae — RTA Transport Activities Rental System) sync fields.
--
-- The TARS integration (src/platform/integrations/tars/) pulls the agency's
-- legal fleet registry and rental contracts into the CRM. It needs three
-- identity anchors the schema did not have:
--
--   vehicle.vin                  — the chassis number, TARS sourceKey / the
--                                  "did:rta:{VIN}" suffix. Plate-first matching
--                                  is primary (a UAE plate can move cars), VIN
--                                  is the fallback that never lies.
--   vehicle.registration_expiry  — mulkiya expiry, the compliance date managers
--                                  actually watch.
--   customer.emirates_id         — 784-YYYY-XXXXXXX-X, the strongest customer
--                                  dedupe key TARS gives us (ahead of phone).
--   rental.tars_document_number  — the contract's TARS identity ("55606-3350");
--                                  the sync upserts on it. Unique per tenant so
--                                  a retried sync can never duplicate a
--                                  contract (same reasoning as 0042).
--
-- All four tables are tenantTable() tables — plain column adds, no policy work
-- needed (same as 0079). NULLs stay distinct in the unique index, so CRM-born
-- rentals without a TARS number are unconstrained. Idempotent.
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS vin text;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS registration_expiry date;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS emirates_id text;
ALTER TABLE rental ADD COLUMN IF NOT EXISTS tars_document_number text;

CREATE INDEX IF NOT EXISTS vehicle_tenant_vin_idx ON vehicle (tenant_id, vin);
CREATE UNIQUE INDEX IF NOT EXISTS rental_tenant_tars_doc_uniq ON rental (tenant_id, tars_document_number);

COMMENT ON COLUMN vehicle.vin IS 'Chassis number. Written by the TARS fleet sync (external_source=tars, external_id=VIN) — the fallback match key after plate.';
COMMENT ON COLUMN vehicle.registration_expiry IS 'Registration (mulkiya) expiry from the TARS vehicle record details.registration.expiryDate.';
COMMENT ON COLUMN customer.emirates_id IS 'Emirates ID (784-YYYY-XXXXXXX-X) from TARS contract drivers — primary TARS customer dedupe key, ahead of phone.';
COMMENT ON COLUMN rental.tars_document_number IS 'TARS contract documentNumber (e.g. "55606-3350"). Upsert key for the TARS rental sync; unique per tenant.';
