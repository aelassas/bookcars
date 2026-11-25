-- 0074: agent schedule + HR fields on agent_availability (Ayham, 2026-09-18).
-- Weekly day off is AUTO-enforced by the rotation (effectiveStatus treats the
-- agent as off for the whole Dubai day); shift hours and the leave balance are
-- INFORMATIONAL — after-hours lead acceptance stays a manual toggle, per
-- Ayham: "sometimes agents still accept leads after duty, I control that".
-- Edited from the /availability page by managers (canPickAny). Idempotent.
ALTER TABLE agent_availability ADD COLUMN IF NOT EXISTS day_off smallint;       -- JS weekday: 0=Sun..6=Sat, NULL = no day off
ALTER TABLE agent_availability ADD COLUMN IF NOT EXISTS shift_start text;       -- "10:00" Dubai, display only
ALTER TABLE agent_availability ADD COLUMN IF NOT EXISTS shift_end text;         -- "20:00" Dubai, display only
ALTER TABLE agent_availability ADD COLUMN IF NOT EXISTS leave_days_remaining int; -- HR balance, display only
DO $$ BEGIN
  ALTER TABLE agent_availability ADD CONSTRAINT agent_availability_day_off_check
    CHECK (day_off IS NULL OR (day_off >= 0 AND day_off <= 6));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
