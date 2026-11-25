CREATE TABLE "rental" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"lead_id" uuid,
	"deal_id" uuid,
	"start_date" timestamp with time zone NOT NULL,
	"return_date" timestamp with time zone NOT NULL,
	"actual_return_date" timestamp with time zone,
	"daily_rate" integer NOT NULL,
	"total_days" integer NOT NULL,
	"deposit" integer DEFAULT 0 NOT NULL,
	"total" integer NOT NULL,
	"balance_due" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rental" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rental_tenant_id_idx" ON "rental" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "rental_tenant_status_idx" ON "rental" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "rental_tenant_dates_idx" ON "rental" USING btree ("tenant_id","start_date","return_date");--> statement-breakpoint
CREATE INDEX "rental_customer_idx" ON "rental" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "rental_vehicle_idx" ON "rental" USING btree ("vehicle_id");--> statement-breakpoint
CREATE POLICY "rental_tenant_isolation" ON "rental" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);