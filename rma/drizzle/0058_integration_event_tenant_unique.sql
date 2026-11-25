-- 0058_integration_event_tenant_unique.sql
--
-- P0 — MULTI-TENANT DATA LOSS ON integration_event.
--
-- 0000 created the spine's dedupe key as UNIQUE(provider, provider_event_id)
-- with NO tenant_id. Every provider we mirror hands out ids that are only
-- unique inside ONE account: Bitrix ids are per-portal sequential integers,
-- Kaiten card ids are per-board. We now run three tenants off three separate
-- Bitrix portals (take-auto, cardiwan, easyrent), so cardiwan's contact 42
-- collides with take-auto's contact 42 — and every writer uses
-- onConflictDoNothing, so the second tenant's row is SILENTLY DROPPED. The
-- import looks like it succeeded and the data is simply missing.
--
-- Fix: the dedupe key is (tenant_id, provider, provider_event_id).
--
-- Order matters: create the new unique index BEFORE dropping the old one so
-- the table is never briefly unconstrained. The new index cannot fail on
-- duplicate data — the old index enforced a STRICTER key (a superset of rows
-- collided), so no duplicate triple can already exist.
--
-- CALLERS: `ON CONFLICT (provider, provider_event_id)` no longer matches any
-- index (Postgres arbiter inference needs the listed columns to match the
-- index exactly), so every insert into integration_event must list tenant_id
-- in its conflict target. All five call sites were updated with this change.
--
-- Hand-written and idempotent (IF EXISTS / IF NOT EXISTS throughout): this box
-- has had migrations applied manually, and scripts/migrate-sql.ts journals by
-- filename, so this file must be safe whether or not the old index is present.

CREATE UNIQUE INDEX IF NOT EXISTS "integration_event_tenant_provider_event_id_idx"
  ON "integration_event" ("tenant_id", "provider", "provider_event_id");--> statement-breakpoint

DROP INDEX IF EXISTS "integration_event_provider_event_id_idx";--> statement-breakpoint

-- ─────────────────────────────────────────────────────────────────────────────
-- bitrix_discovery_run — persisted state for the Bitrix24 dry-run crawl.
--
-- Run state used to live in a module-level Map: it leaked forever (never
-- deleted), it was per-process (a pm2 restart or a second instance made
-- «0 expected records» appear out of nowhere mid-migration-demo), and the
-- progress query read the GLOBAL db connection — no app.tenant_id, so RLS did
-- not apply and anyone holding a run id could read another tenant's counts.
--
-- Now: one tenant-scoped row per run. Progress is a single indexed row read
-- instead of a `raw_payload->>'_takeAutoRunId'` seq scan over integration_event
-- every 3 seconds.
--   totals   entity -> expected record count from the count probe
--   counts   entity -> records crawled so far (updated per chunk commit)
--   errors   entity -> the error that killed the probe or the crawl
--   statuses entity -> queued | running | done | error
CREATE TABLE IF NOT EXISTS "bitrix_discovery_run" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,  -- = the runId handed to the UI
  "tenant_id"   uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  "started_at"  timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz,                       -- set once every entity is terminal
  "totals"      jsonb NOT NULL DEFAULT '{}'::jsonb,
  "counts"      jsonb NOT NULL DEFAULT '{}'::jsonb,
  "errors"      jsonb NOT NULL DEFAULT '{}'::jsonb,
  "statuses"    jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "bitrix_discovery_run" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "bitrix_discovery_run_tenant_isolation" ON "bitrix_discovery_run"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "bitrix_discovery_run" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "bitrix_discovery_run_tenant_id_idx"
  ON "bitrix_discovery_run" ("tenant_id");--> statement-breakpoint

-- «what did this tenant last import» — the settings/migration history read.
CREATE INDEX IF NOT EXISTS "bitrix_discovery_run_tenant_started_idx"
  ON "bitrix_discovery_run" ("tenant_id", "started_at" DESC);
