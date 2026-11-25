-- Stop-word guardrail for wa_outbox (idempotent, staged — apply manually like 0007).
-- A flagged row (sensitive financial language detected by screenOutbound) is HELD:
-- the observer drain only sends `status='pending' AND flagged=false`. A senior
-- releases it via clearOutboxFlag (sets flagged=false + records who/when).
ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS flagged            boolean NOT NULL DEFAULT false;
ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS flagged_words      text;
ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS flagged_cleared_by text;
ALTER TABLE wa_outbox ADD COLUMN IF NOT EXISTS flagged_cleared_at timestamptz;

-- Speed up the drain's held-row exclusion.
CREATE INDEX IF NOT EXISTS wa_outbox_send_ready_idx
  ON wa_outbox (brand_line, status)
  WHERE status = 'pending' AND flagged = false;
