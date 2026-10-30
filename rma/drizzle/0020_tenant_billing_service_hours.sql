CREATE TABLE "service_hours_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"minutes" integer NOT NULL,
	"note" text,
	"logged_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_hours_entry" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "custom_monthly_price" integer;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "paid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "service_hours_per_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_hours_entry" ADD CONSTRAINT "service_hours_entry_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_hours_entry" ADD CONSTRAINT "service_hours_entry_logged_by_user_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_hours_entry_tenant_id_idx" ON "service_hours_entry" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_hours_entry_tenant_created_idx" ON "service_hours_entry" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "service_hours_entry_tenant_isolation" ON "service_hours_entry" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);