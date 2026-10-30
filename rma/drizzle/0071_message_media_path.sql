-- 0071: message.media_path — relative media locator ("wa/<line>/<file>") for
-- inbound WhatsApp media, written by import-observer-messages.ts. Lets the QC
-- transcript notes link the playable voice note / image via /api/media/<token>
-- (Mohamd 2026-08-18). Idempotent.
ALTER TABLE message ADD COLUMN IF NOT EXISTS media_path text;
