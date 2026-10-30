-- 0054_message_extid_unique.sql
--
-- Dedupe spine for the observer importer. The old importer deduped by
-- DELETE-all-waobs + full re-INSERT every 15 minutes — which also WIPED every
-- extracted_* / stitched customer_id / related_entity_* we wrote in between
-- (the fundamental bug found 2026-07-23). The rewritten importer is
-- incremental: INSERT … ON CONFLICT DO NOTHING against this unique index, so
-- existing rows (and everything computed on them) survive.
--
-- Hand-written and idempotent (this box applies migrations manually).

CREATE UNIQUE INDEX IF NOT EXISTS message_tenant_extid_uidx
  ON message (tenant_id, external_message_id)
  WHERE external_message_id IS NOT NULL;
