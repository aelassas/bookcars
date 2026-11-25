-- @lid → phone resolution (idempotent, staged — apply manually).
-- WhatsApp hides a DM sender's number behind a privacy JID ("<n>@lid"); Baileys
-- 6.7.x still exposes the real number on the message key (key.senderPn for DMs,
-- key.participantPn for group members). The observer (wa-observer/bridge.js)
-- upserts a lid→phone row here on every inbound. Chat↔lead linking then
-- resolves a `message.from` that ends in "@lid" via this table to a real phone,
-- and matches that phone to a CRM lead/customer. Global (no tenant_id) — it is
-- a WhatsApp-account-level lookup, no RLS.
CREATE TABLE IF NOT EXISTS wa_identity (
  lid        text PRIMARY KEY,
  phone      text,
  push_name  text,
  brand_line text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_identity_phone_idx ON wa_identity (phone);
