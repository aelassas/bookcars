-- Custom SQL migration file, put your code below! --
-- Telegram PREMIUM login (one-tap, no code typing) — adds a `phone` column
-- used to match a Telegram contact-share to a user, and a `login_request`
-- table that drives the poll-based sign-in handshake. See
-- platform/src/modules/auth-otp/actions.ts (startTelegramLogin/
-- pollTelegramLogin), platform/src/platform/auth/index.ts (the
-- "telegram-session" Credentials provider) and otp-bot/bot.js. All objects
-- here are GLOBAL (no tenant_id), same as user/session/telegram_link above —
-- exempt from the tenant RLS boot-guard, no RLS policy needed.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_phone_idx" ON "user" USING btree ("phone");--> statement-breakpoint

ALTER TABLE "telegram_link" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "login_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token" text NOT NULL UNIQUE,
  "chat_id" text,
  "user_id" uuid REFERENCES "user"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "login_request_token_idx" ON "login_request" USING btree ("token");--> statement-breakpoint

-- Admin-approved first-link fallback. The phones we can pre-populate on
-- `user.phone` are shared BUSINESS-line WhatsApp numbers, not staff's
-- personal Telegram numbers, so an auto phone-match at contact-share time
-- is the exception, not the rule. When no user.phone matches, the bot
-- queues the chat here instead of rejecting it; an admin then links it to
-- the right user from /admin/telegram-links (approveTelegramLink), after
-- which that chat's next login is instant (telegram_link lookup by
-- chat_id). "chat_id" is UNIQUE so the bot can upsert idempotently as the
-- same person retries sharing their contact.
CREATE TABLE IF NOT EXISTS "telegram_link_pending" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" text NOT NULL UNIQUE,
  "phone" text,
  "tg_first_name" text,
  "tg_username" text,
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL
);
