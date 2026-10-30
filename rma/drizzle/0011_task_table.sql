-- Task table for Kaiten cards and general task tracking.
--
-- This file shares its 0011 number with 0011_mature_sphinx.sql, which creates
-- the same table: this hand-written one came first, the generated one was
-- written later to be idempotent over it. Filename order puts mature_sphinx
-- first, so on a fresh database that file creates the table and policy and
-- this one runs second — hence every statement here must tolerate the objects
-- already existing. The CREATE POLICY below did not, which broke `npm run
-- migrate` on any from-scratch database (CI never caught it, because the old
-- drizzle-kit runner skipped hand-written files entirely).
CREATE TABLE IF NOT EXISTS "task" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id") ON DELETE cascade,
  "external_id" text,
  "board" text,
  "column" text,
  "title" text NOT NULL,
  "description" text,
  "assigned_to" uuid REFERENCES "user"("id"),
  "due_date" timestamp with time zone,
  "status" text NOT NULL DEFAULT 'open',
  "raw" jsonb DEFAULT '{}',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "task_tenant_external_idx" ON "task" ("tenant_id", "external_id");
CREATE INDEX IF NOT EXISTS "task_tenant_status_idx" ON "task" ("tenant_id", "status");

ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "task_tenant_isolation"
    ON "task"
    AS PERMISSIVE
    FOR ALL
    USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "task" FORCE ROW LEVEL SECURITY;
