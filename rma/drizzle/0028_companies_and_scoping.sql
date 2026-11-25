CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"business_line" text NOT NULL,
	"brand_name" text,
	"logo_url" text,
	"accent_color" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "lease" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "rental" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "tenant_member" ADD COLUMN "company_ids" uuid[];--> statement-breakpoint
ALTER TABLE "tenant_member" ADD COLUMN "cross_branch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_tenant_id_idx" ON "company" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_tenant_slug_idx" ON "company" USING btree ("tenant_id","slug");--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rental" ADD CONSTRAINT "rental_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "company_tenant_isolation" ON "company" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);