-- 0047_onboarding_application.sql
--
-- The waiting room for the Telegram Mini App.
--
-- Someone taps the login bot and opens the mini app before they have anything
-- on the platform: no user row, no tenant, no membership. Every other identity
-- table here hangs off user.id, and every business table hangs off tenant_id —
-- neither exists yet at this point in the funnel. So this is a global table,
-- same class as telegram_link_pending: no tenant_id, deliberately exempt from
-- the RLS boot-guard (which only inspects tables that HAVE a tenant_id).
--
-- Written by hand rather than shipped as drizzle-kit generated it. The
-- snapshot chain in drizzle/meta stops at 0037 while migrations run to 0046,
-- so `drizzle-kit generate` diffs against a four-year-stale picture and emits
-- CREATE TABLE for a dozen tables that already exist in prod. Only the
-- onboarding_application statements below are real; the rest of that output
-- was discarded. (The 0047 snapshot IS kept, so the next generate diffs
-- against an accurate state instead of repeating this.)
--
-- Idempotent throughout: this box has had migrations applied by hand before.

CREATE TABLE IF NOT EXISTS onboarding_application (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  -- The `user.id` from Telegram WebApp initData — the only identity we can
  -- cryptographically verify before the person has an account. Text, not
  -- bigint: Telegram ids are 64-bit and every other telegram column here
  -- (telegram_link.chat_id, telegram_link_pending.chat_id) is already text.
  telegram_user_id   text NOT NULL,
  telegram_username  text,
  full_name          text NOT NULL,
  phone              text NOT NULL,
  company_name       text NOT NULL,
  note               text,
  status             text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  telegram_chat_id   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  decided_at         timestamptz,
  -- ON DELETE SET NULL: losing the admin who decided must not erase the
  -- decision itself.
  decided_by         uuid REFERENCES "user"(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS onboarding_application_tg_user_idx
  ON onboarding_application (telegram_user_id);

-- Queue view for the reviewing admin: "everything still pending, oldest first".
CREATE INDEX IF NOT EXISTS onboarding_application_status_idx
  ON onboarding_application (status, created_at);

-- One PENDING application per Telegram user, enforced in the database rather
-- than by a read-then-insert in the route: two taps on "submit" race, and the
-- check-then-write would let both through. Partial by design — approved and
-- rejected rows stay for history and must not block someone re-applying after
-- a rejection.
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_application_one_pending_idx
  ON onboarding_application (telegram_user_id)
  WHERE status = 'pending';
