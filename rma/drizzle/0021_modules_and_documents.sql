CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant" ADD COLUMN "modules" text[] DEFAULT '{"dashboard","crm","customers","messages","fleet","rentals","returns","collections","tasks"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_tenant_id_idx" ON "document" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "document_entity_idx" ON "document" USING btree ("tenant_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "document_category_idx" ON "document" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE POLICY "document_tenant_isolation" ON "document" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);