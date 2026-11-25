-- Serial lead numbers (owner, 2026-08-13): ONE sequence shared by both lead
-- relays (CallGear + WhatsApp/Telegram) so a number is never handed out twice
-- even when the relays run concurrently. Gaps are tolerated (a crashed pass
-- burns a number), duplicates are not. The runtime also creates it lazily
-- (lead-number.ts) — this file exists for migrate-first environments.
CREATE SEQUENCE IF NOT EXISTS twenty_lead_seq;
