ALTER TABLE "rental" ADD COLUMN "final_odometer" integer;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "fuel_level" integer;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "damage_notes" text;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "extra_charge_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "extra_charge_reason" text;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "returned_by" uuid;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_returned_by_user_id_fk" FOREIGN KEY ("returned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;