-- Custom SQL migration file, put your code below! --
-- Telegram OTP login — additional identity factor alongside password +
-- magic-link (email is dead in this deployment). All three tables are
-- GLOBAL (no tenant_id), same as "user"/"session"/"device_login", so they
-- are exempt from the tenant RLS boot-guard and need no RLS policy here.
-- See platform/src/platform/auth/index.ts (telegram-otp Credentials
-- provider) and platform/src/modules/auth-otp/actions.ts.

CREATE TABLE IF NOT EXISTS "telegram_link" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "chat_id" text NOT NULL,
  "username" text,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "login_code" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "consumed_at" timestamp with time zone
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "login_code_user_idx" ON "login_code" USING btree ("user_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "telegram_link_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" text NOT NULL UNIQUE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone
);
