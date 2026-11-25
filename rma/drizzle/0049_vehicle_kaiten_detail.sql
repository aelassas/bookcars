-- 0049_vehicle_kaiten_detail.sql
--
-- CAR FINDER ("Подбор авто") — let the Kaiten fleet cards carry their sales
-- story into the platform. A Kaiten card is the source of truth for what a
-- salesperson actually tells a customer: the verbatim spec (mileage, GCC/
-- European, warranty, insurance, calculation price) and the showroom photos.
-- The sync used to keep only make/model/year/status and drop the rest; these
-- columns land it so the vehicle profile and the deal-side finder can show the
-- real car.
--
--   vehicle.kaiten_notes   — verbatim Kaiten card description (the sales spec)
--   vehicle.photos         — jsonb [{ url, name }] of the card's image files
--                            (public files.kaiten.ru URLs, no auth to load)
--   vehicle.kaiten_column  — the board column the card sits in (provenance for
--                            the derived status + the lux / for-sale flag)
--
-- And on the deal side:
--   deal.vehicle_id        — the actual fleet car a salesperson attached to
--                            this deal from the finder (nullable; drives the
--                            booking step).
--
-- `vehicle` and `deal` both already carry tenant_id + their RLS triad (created
-- earlier, tightened by the FORCE-RLS pass), so these nullable columns need no
-- new policy and do not affect the boot guard. Written idempotent (IF NOT
-- EXISTS): this box has had migrations applied by hand before, so it is safe to
-- run more than once. (drizzle-kit generate additionally refreshed the snapshot
-- chain in meta/0049_snapshot.json for future diffing. The unrelated
-- onboarding_application partial index that generate emitted from pre-existing
-- snapshot drift is intentionally left out of this migration.)

ALTER TABLE "vehicle" ADD COLUMN IF NOT EXISTS "kaiten_notes" text;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN IF NOT EXISTS "photos" jsonb;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN IF NOT EXISTS "kaiten_column" text;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN IF NOT EXISTS "vehicle_id" uuid;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deal_vehicle_id_vehicle_id_fk'
  ) THEN
    ALTER TABLE "deal"
      ADD CONSTRAINT "deal_vehicle_id_vehicle_id_fk"
      FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
