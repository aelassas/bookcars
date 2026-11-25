-- 0076: message.source_meta — provider extras that have no column of their
-- own, written by the JivoChat ingest (integrations/jivo/webhook.ts): real
-- channel type (widget/facebook/instagram), visitor email, agent name, chat
-- id. NULL for every other channel. Idempotent.
ALTER TABLE message ADD COLUMN IF NOT EXISTS source_meta jsonb;
