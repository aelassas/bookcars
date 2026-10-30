-- Custom SQL migration file, put your code below! --
-- Auth Wave 1 (P0-2/P0-3) — force-password-change flag. `user` is a GLOBAL
-- table (no tenant_id), so the RLS boot-guard does not apply here.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false;
