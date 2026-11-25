CREATE TABLE "lease" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"deal_id" uuid,
	"contract_ref" text NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"term_months" integer NOT NULL,
	"down_payment" integer DEFAULT 0 NOT NULL,
	"monthly_payment" integer NOT NULL,
	"residual_value" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"balance_due" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lease" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lease_installment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lease_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"lease_payment_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lease_installment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lease_payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lease_id" uuid NOT NULL,
	"installment_id" uuid,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lease_payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease" ADD CONSTRAINT "lease_deal_id_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_installment" ADD CONSTRAINT "lease_installment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_installment" ADD CONSTRAINT "lease_installment_lease_id_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."lease"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_installment" ADD CONSTRAINT "lease_installment_lease_payment_id_lease_payment_id_fk" FOREIGN KEY ("lease_payment_id") REFERENCES "public"."lease_payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD CONSTRAINT "lease_payment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD CONSTRAINT "lease_payment_lease_id_lease_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."lease"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD CONSTRAINT "lease_payment_installment_id_lease_installment_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."lease_installment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lease_payment" ADD CONSTRAINT "lease_payment_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lease_tenant_id_idx" ON "lease" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lease_tenant_ref_idx" ON "lease" USING btree ("tenant_id","contract_ref");--> statement-breakpoint
CREATE INDEX "lease_tenant_status_idx" ON "lease" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "lease_tenant_dates_idx" ON "lease" USING btree ("tenant_id","start_date","end_date");--> statement-breakpoint
CREATE INDEX "lease_customer_idx" ON "lease" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "lease_vehicle_idx" ON "lease" USING btree ("vehicle_id");--> statement-breakpoint
CREATE INDEX "lease_installment_tenant_id_idx" ON "lease_installment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lease_installment_lease_idx" ON "lease_installment" USING btree ("tenant_id","lease_id","due_date");--> statement-breakpoint
CREATE INDEX "lease_installment_status_idx" ON "lease_installment" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "lease_payment_tenant_id_idx" ON "lease_payment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "lease_payment_lease_idx" ON "lease_payment" USING btree ("tenant_id","lease_id");--> statement-breakpoint
CREATE INDEX "lease_payment_created_idx" ON "lease_payment" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "lease_tenant_isolation" ON "lease" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "lease_installment_tenant_isolation" ON "lease_installment" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "lease_payment_tenant_isolation" ON "lease_payment" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);