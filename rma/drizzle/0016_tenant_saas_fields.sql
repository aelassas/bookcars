ALTER TABLE "tenant" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "tier" text DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "suspended_reason" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "billing_email" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;