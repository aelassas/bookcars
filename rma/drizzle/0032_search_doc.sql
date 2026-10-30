-- ADR-001 §15: semantic + full-text search index ("make sense of the dumpster").
-- One row per indexed text source (customer/lead/deal/rental/lease/message/doc),
-- tenant + company scoped, with a local embedding (qwen3-embedding, 1024-dim) and
-- a tsvector for hybrid (FTS + vector) retrieval. Every search filters tenant_id
-- (RLS) and company_id (app layer) BEFORE ranking.

CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "search_doc" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "company_id" uuid,
  "source_type" text NOT NULL,
  "source_id" uuid NOT NULL,
  "title" text,
  "body" text NOT NULL,
  "embedding" vector(1024),
  "tsv" tsvector,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "search_doc" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "search_doc" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "search_doc_tenant_isolation" ON "search_doc";--> statement-breakpoint
CREATE POLICY "search_doc_tenant_isolation" ON "search_doc" AS PERMISSIVE FOR ALL TO public USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "search_doc_tenant_id_idx" ON "search_doc" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "search_doc_source_idx" ON "search_doc" ("tenant_id", "source_type", "source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_doc_tsv_idx" ON "search_doc" USING gin ("tsv");--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "search_doc" TO app_runtime;
  END IF;
END $$;
