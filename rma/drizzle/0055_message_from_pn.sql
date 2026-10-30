-- 0055_message_from_pn.sql
--
-- LID WALL BREAKER. 50% of inbound WhatsApp arrives as privacy JIDs
-- (`<n>@lid`) and 48% from groups — `message.from` carries no phone number,
-- so phone-based chat↔CRM stitching starved (~0 links). The observer already
-- captures the REAL number (Baileys key.senderPn / participantPn → JSONL
-- `senderPhone` + the wa_identity lid→phone table). This column stores it per
-- message; stitching matches on coalesce(from_pn, from). `from` stays the
-- thread key (the JID) — from_pn is identity, not addressing.
--
-- Hand-written and idempotent (this box applies migrations manually).

ALTER TABLE message ADD COLUMN IF NOT EXISTS from_pn text;
