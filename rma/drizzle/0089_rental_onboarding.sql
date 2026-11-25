ALTER TABLE "rental" ADD COLUMN IF NOT EXISTS "onboarding_stage" text DEFAULT 'new_lead' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN IF NOT EXISTS "taqeeq_submission_id" text;
--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN IF NOT EXISTS "taqeeq_signed_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "rental" SET "onboarding_stage" = CASE WHEN "tars_document_number" IS NOT NULL THEN 'tars' ELSE 'signed' END;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rental_tenant_onboarding_stage_idx" ON "rental" USING btree ("tenant_id", "onboarding_stage");
