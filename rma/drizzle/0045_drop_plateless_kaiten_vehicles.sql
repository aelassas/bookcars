-- 0045_drop_plateless_kaiten_vehicles.sql
--
-- Remove the plate-less "vehicles" the Kaiten sync materialised from board
-- cards.
--
-- The Kaiten sync used to create one `vehicle` row per board card with
-- `plate = ''`, because a Kaiten card is titled "Tesla Model Y 2023" and
-- carries no plate anywhere — not in the title, not in the description, not in
-- the card properties (verified against all 163 live cards). The result was 162
-- rows that have no plate, no company, no price tiers, no rentals, no timeline
-- events and no documents: Kaiten cards wearing a vehicle costume. They doubled
-- the apparent fleet on the Fleet page and in onboarding, next to the 99 real
-- plated cars that come from Babek's sheet.
--
-- The sync no longer creates them (see integrations/kaiten/sync.ts: a card
-- without a usable plate is recorded as an integration_event and nothing else),
-- so this cleanup will not be undone by the next sync run — which is what
-- happened when the rows were deleted on their own earlier.
--
-- Safety: every foreign key into vehicle(id) was checked against exactly these
-- rows in production and all are empty — rental 0, lease 0, price_tier 0,
-- booking 0, driver_assignment 0, vehicle_timeline_event 0, and document rows
-- with entity_type='vehicle' 0. Nothing references them, so this deletes only
-- the ghosts. The vehicle_history audit trigger fires on DELETE, so each row is
-- copied to vehicle_history before it goes.
--
-- Scoped by `plate = ''` rather than by external_source alone: a Kaiten card
-- that does name a real plate is a legitimate car and must survive this and any
-- future re-run. Deletion is naturally idempotent.

DELETE FROM vehicle
 WHERE external_source = 'kaiten'
   AND coalesce(btrim(plate), '') = '';
