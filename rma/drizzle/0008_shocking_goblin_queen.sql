CREATE TABLE "integration_connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "deal" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "migration_status" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "integration_connection" ADD CONSTRAINT "integration_connection_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connection_tenant_provider_idx" ON "integration_connection" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "customer_tenant_external_idx" ON "customer" USING btree ("tenant_id","external_source","external_id");--> statement-breakpoint
CREATE INDEX "deal_tenant_external_idx" ON "deal" USING btree ("tenant_id","external_source","external_id");--> statement-breakpoint
CREATE INDEX "lead_tenant_external_idx" ON "lead" USING btree ("tenant_id","external_source","external_id");--> statement-breakpoint
CREATE INDEX "vehicle_tenant_external_idx" ON "vehicle" USING btree ("tenant_id","external_source","external_id");