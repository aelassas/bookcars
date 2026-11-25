-- 0075: a 👍 on the assignment ping ACCEPTS the lead (Ayham, 2026-09-19:
-- "if the agent reacts with a thumbs up to the assignment message, that
-- counts as accepting — do not reassign").
--
-- Two pieces, both filled by the observer bridge (wa-observer/bridge.js):
--
--   1. wa_outbox.wa_message_id — the WhatsApp message id Baileys returns from
--      sock.sendMessage, stored when the drain marks the row 'sent'. Without
--      it a reaction (which quotes the WA id of the message reacted to, and
--      nothing else) cannot be tied back to the outbox row — and through
--      board_item_id = dedupeUuid('assign:<oppId>[:<AgentName>]') to the lead
--      and the assignee.
--   2. wa_reaction — one row per inbound reaction that targets a message this
--      line sent FROM wa_outbox. The bridge inserts with tenant_id copied off
--      the matched outbox row (INSERT … SELECT), so reactions to hand-typed or
--      customer messages match no row and are silently skipped — this table is
--      for accepting assignments, not a general reaction archive. A removed
--      reaction arrives again with empty text and OVERWRITES the emoji (the
--      unique key is per (line, message, reactor)), so an un-👍 un-accepts a
--      card the sweeper has not processed yet.
--
-- The rental distributor sweeper (platform/notify/rental-distributor.ts)
-- counts a pinned-emoji reaction from the ASSIGNED agent's phone (tail9, with
-- a wa_identity fallback for @lid reactors) as "acted", alongside the
-- outbound-message probe.
--
-- RLS triad like wa_outbox (0007): enable + FORCE + tenant policy + grants.
-- The bridge writes through DATABASE_URL (bypass role), same as its wa_outbox
-- and wa_identity writes. Idempotent: safe to re-run.

ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS wa_message_id text;
CREATE INDEX IF NOT EXISTS wa_outbox_wa_message_id_idx
  ON wa_outbox (wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wa_reaction (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  line          text NOT NULL,          -- observer slug that saw the reaction (BRAND)
  message_id    text NOT NULL,          -- WA id of the REACTED-TO message (= wa_outbox.wa_message_id)
  reactor_jid   text NOT NULL,          -- remoteJid/participant of who reacted (may be an @lid)
  reactor_phone text,                   -- digits when known (senderPn / plain JID); NULL for a bare @lid
  emoji         text NOT NULL DEFAULT '', -- '' = the reaction was removed
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One row per (line, message, reactor): a re-reaction updates the emoji.
CREATE UNIQUE INDEX IF NOT EXISTS wa_reaction_msg_reactor_uidx
  ON wa_reaction (line, message_id, reactor_jid);
CREATE INDEX IF NOT EXISTS wa_reaction_tenant_idx
  ON wa_reaction (tenant_id, created_at DESC);

ALTER TABLE wa_reaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_reaction FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_reaction_tenant_isolation ON wa_reaction;
CREATE POLICY wa_reaction_tenant_isolation ON wa_reaction
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Grants to app_runtime (mirrors wa_outbox, 0007). Single-quoted DO body on
-- purpose — never dollar-quoting here.
DO 'BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ''app_runtime'') THEN
    EXECUTE ''GRANT SELECT, INSERT, UPDATE ON wa_reaction TO app_runtime'';
  END IF;
END';

COMMENT ON TABLE  wa_reaction                 IS 'Inbound WhatsApp reactions to wa_outbox-sent messages, recorded by wa-observer/bridge.js. A pinned-emoji reaction from the assigned agent accepts a rental lead (Ayham, 2026-09-19).';
COMMENT ON COLUMN wa_reaction.message_id      IS 'WhatsApp id of the reacted-to message — joins to wa_outbox.wa_message_id.';
COMMENT ON COLUMN wa_reaction.reactor_phone   IS 'Reactor digits when WhatsApp exposes them (senderPn / plain JID); NULL for a bare @lid — resolve via wa_identity.';
COMMENT ON COLUMN wa_outbox.wa_message_id     IS 'WhatsApp message id returned by Baileys at send time — the join key for wa_reaction. NULL for rows sent before 0075.';
