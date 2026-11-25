-- ============================================================================
-- TAKE Auto — Driver Telegram Bot (Contract Module 5)
-- Schema: driver + driver_assignment
-- ----------------------------------------------------------------------------
-- Multi-tenant with Row Level Security (RLS), matching the platform convention:
--   USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
-- Tenant context is set per-transaction by the app with:
--   SELECT set_config('app.tenant_id', '<uuid>', true);
--
-- NOTE: This file is provided as a reference migration. DO NOT auto-apply it.
--       Review and run it manually against the `mycrm` database when ready:
--         psql "$DATABASE_URL" -f schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- driver: a person (driver/staff) who operates the bot via Telegram.
--   telegram_user_id maps a Telegram account to a driver within a tenant.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "driver" (
    "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id"        uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
    "telegram_user_id" bigint NOT NULL,
    "name"             text NOT NULL,
    "phone"            text,
    "created_at"       timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at"       timestamp with time zone DEFAULT now() NOT NULL
);

-- A Telegram account maps to exactly one driver globally (identity lookup is
-- done by telegram_user_id before the tenant context is known).
CREATE UNIQUE INDEX IF NOT EXISTS "driver_telegram_user_id_key"
    ON "driver" ("telegram_user_id");

CREATE INDEX IF NOT EXISTS "driver_tenant_id_idx"
    ON "driver" ("tenant_id");

-- ---------------------------------------------------------------------------
-- driver_assignment: which driver is responsible for which vehicle, and when.
--   to_ts NULL means the assignment is currently open/active.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "driver_assignment" (
    "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id"  uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
    "driver_id"  uuid NOT NULL REFERENCES "driver"("id") ON DELETE CASCADE,
    "vehicle_id" uuid NOT NULL REFERENCES "vehicle"("id") ON DELETE CASCADE,
    "from_ts"    timestamp with time zone DEFAULT now() NOT NULL,
    "to_ts"      timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "driver_assignment_tenant_id_idx"
    ON "driver_assignment" ("tenant_id");

CREATE INDEX IF NOT EXISTS "driver_assignment_driver_idx"
    ON "driver_assignment" ("tenant_id", "driver_id");

CREATE INDEX IF NOT EXISTS "driver_assignment_vehicle_idx"
    ON "driver_assignment" ("tenant_id", "vehicle_id");

-- Active (open) assignments per driver+vehicle.
CREATE INDEX IF NOT EXISTS "driver_assignment_active_idx"
    ON "driver_assignment" ("tenant_id", "driver_id", "vehicle_id")
    WHERE "to_ts" IS NULL;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE "driver" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver" FORCE ROW LEVEL SECURITY;

CREATE POLICY "driver_tenant_isolation"
    ON "driver"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE "driver_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_assignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY "driver_assignment_tenant_isolation"
    ON "driver_assignment"
    AS PERMISSIVE
    FOR ALL
    TO public
    USING ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);
