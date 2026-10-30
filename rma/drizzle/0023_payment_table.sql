CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rental_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"method" text DEFAULT 'cash' NOT NULL,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_rental_id_rental_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rental"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_tenant_id_idx" ON "payment" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payment_rental_idx" ON "payment" USING btree ("tenant_id","rental_id");--> statement-breakpoint
CREATE INDEX "payment_created_idx" ON "payment" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "payment_tenant_isolation" ON "payment" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);