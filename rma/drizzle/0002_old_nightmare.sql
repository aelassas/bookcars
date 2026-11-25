CREATE TABLE "deal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_id" uuid,
	"ref" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"stage" text DEFAULT 'inquiry' NOT NULL,
	"value" integer,
	"balance_due" integer DEFAULT 0 NOT NULL,
	"owner_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "status" text DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal" ADD CONSTRAINT "deal_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deal_tenant_status_idx" ON "deal" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "deal_tenant_stage_idx" ON "deal" USING btree ("tenant_id","stage");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
-- RLS for deal (ADR §6.2)
ALTER TABLE "deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deal" FORCE ROW LEVEL SECURITY;
CREATE POLICY deal_tenant_isolation ON "deal"
  USING      (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

