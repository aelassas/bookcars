ALTER TABLE "lease_payment" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD COLUMN "confirmed_by" uuid;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD CONSTRAINT "lease_payment_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;