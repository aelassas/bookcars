-- 0059_user_roster_visible.sql — staff name+PIN login roster flag.
-- Controls who appears on the /login tap-your-name roster. Off by default so
-- demo / admin / second-number accounts stay off the door; provisioning turns
-- it on for the real staff. `user` is a global (non-tenant) table — no RLS.
-- Idempotent.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS roster_visible boolean NOT NULL DEFAULT false;
