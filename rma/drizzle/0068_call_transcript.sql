-- 0068_call_transcript.sql
--
-- CALL TRANSCRIPTS — the callgear recording-analysis ledger.
--
-- One row per transcribed (or attempted) callgear call.finished event: the
-- relay (scripts/run-callgear-twenty-relay.ts) projects the event into Twenty
-- and stamps it done; the call transcriber (scripts/run-call-transcriber.ts)
-- then downloads params.recordingUrl, transcribes it with local mlx_whisper,
-- analyses it with the tenant's local model, and posts a note onto the Twenty
-- opportunity. The full transcript and the analysis JSON live HERE (not in
-- Twenty) so analytics can query them without crawling notes.
--
-- Why a dedicated table and not a nullable column on integration_event: the
-- transcript is large text plus a retry/state machine (status/attempts) that
-- has nothing to do with event ingestion, and later analytics query
-- transcripts directly — a wide integration_event would pay for both.
--
-- Status lifecycle: processing (claimed) → done | error. Error rows are
-- retryable after 1h up to 3 attempts (expired recording URLs); a
-- 'processing' row untouched for 15 min was abandoned by a crashed run and
-- is reclaimable. An analysis rejected by the evidence gate is stamped
-- status='done' with the reason in `error` — the transcript is kept, the
-- model is not re-spent on it every poll.
--
-- NEW tenant-scoped table → full RLS treatment matching exactly what
-- tenantTable() emits (ENABLE + <table>_tenant_isolation policy + tenant_id
-- index); FORCE ROW LEVEL SECURITY is also applied post-migration by
-- scripts/tighten-rls.sql and verified by the boot guard.
--
-- Written by hand and idempotent (IF NOT EXISTS throughout): this box has had
-- migrations applied manually before (see 0047's note on the snapshot chain).

CREATE TABLE IF NOT EXISTS "call_transcript" (
  "id"                   uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id"            uuid NOT NULL REFERENCES "tenant"("id") ON DELETE CASCADE,
  -- The integration_event this transcript belongs to (1:1 — the dedupe key).
  "integration_event_id" uuid NOT NULL REFERENCES "integration_event"("id") ON DELETE CASCADE,
  "call_id"              text NOT NULL,              -- callgear callId (provider_event_id)
  "recording_path"       text,                       -- local file the recording was cached to
  "transcript_text"      text,                       -- full whisper transcript
  "summary_json"         jsonb,                      -- analysis + whisper-detected language
  -- processing | done | error (see header for the lifecycle)
  "status"               text NOT NULL DEFAULT 'processing',
  "attempts"             integer NOT NULL DEFAULT 0, -- one claim = one attempt
  "error"                text,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "updated_at"           timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

-- RLS. MANDATORY: verifyRlsAtBoot() crashes the app on startup if any table
-- with a tenant_id column is missing RLS. Predicate matches tenantTable()
-- (platform/src/platform/db/tenant-table.ts) exactly.
ALTER TABLE "call_transcript" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  CREATE POLICY "call_transcript_tenant_isolation" ON "call_transcript"
    AS PERMISSIVE FOR ALL
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

-- Belt-and-braces FORCE (tighten-rls.sql also does this post-migrate; the boot
-- guard requires it). Idempotent.
ALTER TABLE "call_transcript" FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "call_transcript_tenant_id_idx"
  ON "call_transcript" ("tenant_id");--> statement-breakpoint

-- 1:1 with the source event — the claim's INSERT ... ON CONFLICT DO NOTHING
-- races on this, so two transcriber instances can never double-process a call.
CREATE UNIQUE INDEX IF NOT EXISTS "call_transcript_event_idx"
  ON "call_transcript" ("integration_event_id");--> statement-breakpoint

-- Retry scan: error rows past their backoff, per tenant.
CREATE INDEX IF NOT EXISTS "call_transcript_status_updated_idx"
  ON "call_transcript" ("tenant_id", "status", "updated_at");
