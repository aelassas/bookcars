-- Custom migration: idempotent so it can run on DBs that already have the task table
-- (from the manually-written 0011_task_table.sql that predated this generated migration).

CREATE TABLE IF NOT EXISTS "task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"external_id" text,
	"board" text,
	"column" text,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" uuid,
	"due_date" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "integration_connection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN IF NOT EXISTS "point" geography(Point, 4326);--> statement-breakpoint
-- FK constraints already exist from inline REFERENCES in the original CREATE TABLE;
-- Drizzle generated names differ from the auto-created ones, so we skip re-adding them.
CREATE INDEX IF NOT EXISTS "task_tenant_id_idx" ON "task" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_tenant_external_idx" ON "task" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_tenant_status_idx" ON "task" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_connection_tenant_id_idx" ON "integration_connection" USING btree ("tenant_id");--> statement-breakpoint
DO $$
BEGIN
  CREATE POLICY "integration_connection_tenant_isolation" ON "integration_connection" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  CREATE POLICY "task_tenant_isolation" ON "task" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
