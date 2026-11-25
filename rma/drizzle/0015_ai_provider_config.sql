CREATE TABLE "ai_provider_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'claude' NOT NULL,
	"local_endpoint" text,
	"local_model" text,
	"fallback_provider" text,
	"last_healthy_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"last_error_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_provider_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_provider_config" ADD CONSTRAINT "ai_provider_config_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_provider_config_tenant_id_idx" ON "ai_provider_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_provider_config_tenant_idx" ON "ai_provider_config" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "ai_provider_config_tenant_isolation" ON "ai_provider_config" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);