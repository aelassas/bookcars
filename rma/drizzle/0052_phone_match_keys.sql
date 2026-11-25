-- 0052_phone_match_keys.sql
--
-- STITCHING SPINE — expression indexes so the WhatsApp `from` JID can be
-- matched to customer/lead phones on the LAST 9 DIGITS (see
-- modules/messaging/phone.ts — the TS twin of this expression; they MUST
-- stay in lockstep). No new columns: the key is computed, additive, cheap.
--
-- Hand-written and idempotent (this box applies migrations manually).

CREATE INDEX IF NOT EXISTS "customer_phone_key_idx"
  ON "customer" ("tenant_id", right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 9))
  WHERE "phone" IS NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "lead_phone_key_idx"
  ON "lead" ("tenant_id", right(regexp_replace(coalesce("phone", ''), '\D', '', 'g'), 9))
  WHERE "phone" IS NOT NULL;
