CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"division" text DEFAULT 'rent' NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"direction" text DEFAULT 'inbound' NOT NULL,
	"from" text NOT NULL,
	"customer_id" uuid,
	"customer_name" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"classification" jsonb,
	"ai_reply" text,
	"ai_reply_approved_at" timestamp with time zone,
	"ai_reply_sent_at" timestamp with time zone,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vehicle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"plate" text NOT NULL,
	"division" text DEFAULT 'rent' NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"location" text,
	"odometer" integer DEFAULT 0 NOT NULL,
	"daily_rate" integer DEFAULT 0 NOT NULL,
	"gps_blocked" boolean DEFAULT false NOT NULL,
	"imei" text,
	"pilot_device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_tenant_id_idx" ON "customer" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_tenant_phone_idx" ON "customer" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "customer_tenant_name_idx" ON "customer" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "message_tenant_id_idx" ON "message" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "message_tenant_status_idx" ON "message" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "message_tenant_channel_idx" ON "message" USING btree ("tenant_id","channel","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "message_customer_idx" ON "message" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "vehicle_tenant_id_idx" ON "vehicle" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "vehicle_tenant_status_idx" ON "vehicle" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "vehicle_tenant_plate_idx" ON "vehicle" USING btree ("tenant_id","plate");--> statement-breakpoint
CREATE INDEX "vehicle_imei_idx" ON "vehicle" USING btree ("imei");--> statement-breakpoint
CREATE POLICY "customer_tenant_isolation" ON "customer" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "message_tenant_isolation" ON "message" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "vehicle_tenant_isolation" ON "vehicle" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);