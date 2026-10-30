CREATE TABLE "support_access_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"granted_by" uuid NOT NULL,
	"granted_to" uuid NOT NULL,
	"reason" text NOT NULL,
	"scope" text DEFAULT 'read' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_access_grant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "support_ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "support_ticket" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "support_ticket_reply" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_kind" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_ticket_reply" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_event" ADD COLUMN "impersonator_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_event" ADD COLUMN "support_grant_id" uuid;--> statement-breakpoint
ALTER TABLE "support_access_grant" ADD CONSTRAINT "support_access_grant_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grant" ADD CONSTRAINT "support_access_grant_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grant" ADD CONSTRAINT "support_access_grant_granted_to_user_id_fk" FOREIGN KEY ("granted_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_opened_by_user_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_reply" ADD CONSTRAINT "support_ticket_reply_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_reply" ADD CONSTRAINT "support_ticket_reply_ticket_id_support_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_ticket"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_reply" ADD CONSTRAINT "support_ticket_reply_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_access_grant_tenant_id_idx" ON "support_access_grant" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "support_access_grant_tenant_idx" ON "support_access_grant" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_access_grant_granted_to_idx" ON "support_access_grant" USING btree ("granted_to");--> statement-breakpoint
CREATE INDEX "support_ticket_tenant_id_idx" ON "support_ticket" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "support_ticket_tenant_status_idx" ON "support_ticket" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "support_ticket_tenant_created_idx" ON "support_ticket" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_ticket_reply_tenant_id_idx" ON "support_ticket_reply" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "support_ticket_reply_ticket_idx" ON "support_ticket_reply" USING btree ("tenant_id","ticket_id","created_at");--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_impersonator_id_user_id_fk" FOREIGN KEY ("impersonator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_support_grant_id_support_access_grant_id_fk" FOREIGN KEY ("support_grant_id") REFERENCES "public"."support_access_grant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "support_access_grant_tenant_isolation" ON "support_access_grant" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "support_ticket_tenant_isolation" ON "support_ticket" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "support_ticket_reply_tenant_isolation" ON "support_ticket_reply" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);