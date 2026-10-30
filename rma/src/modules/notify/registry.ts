/**
 * registry.ts — "who is this person on Telegram?" for staff pings.
 *
 * Resolution cascade (first hit wins):
 *   1. telegram_link.chat_id by user_id — the canonical source. Populated by
 *      self-service: the person messages @zamtek_otp_bot /start once (the
 *      otp-bot onboarding interview auto-matches their phone, or an admin
 *      approves at /admin/telegram-links). Global table, queried without a
 *      tenant scope — same class as the auth tables.
 *   2. env override per owner key: NOTIFY_TG_CHAT_<KEY> then BOARD_TG_CHAT_<KEY>
 *      (key uppercased, '-' → '_') — lets ops point a key at a chat without a
 *      deploy or a user row.
 *   3. the hardcoded telegramChatId in modules/board/owners.ts (legacy).
 *
 * Owner keys ('azat', 'babek', … — see BRAND_OWNERS) can be bridged to user
 * rows via NOTIFY_OWNER_USER_<KEY>=<user uuid>, so a key-addressed ping still
 * reaches the person's canonical telegram_link once they've linked.
 */

import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { telegramLink } from "@/platform/db/schema";
import { resolveOwnerByKey, ownerTelegramChatId } from "@/modules/board/owners";

export type NotifyTarget = {
  userId?: string | null;
  ownerKey?: string | null;
};

export type ResolvedChat = {
  chatId: string;
  /** Which rung of the cascade answered — kept on the ledger for audit. */
  via: "telegram_link" | "env" | "owners_config";
  /** The user the chat belongs to, when known (feeds the ledger's target_user_id). */
  userId: string | null;
};

/** Env bridge owner key → platform user id (NOTIFY_OWNER_USER_<KEY>). */
export function ownerUserId(
  ownerKey: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const v = env[`NOTIFY_OWNER_USER_${ownerKey.toUpperCase().replace(/-/g, "_")}`]?.trim();
  return v || null;
}

/** Reverse of ownerUserId: find the owner key an env bridge points at a user. */
export function ownerKeyForUser(
  userId: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const prefix = "NOTIFY_OWNER_USER_";
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith(prefix) && v?.trim().toLowerCase() === userId.toLowerCase()) {
      return k.slice(prefix.length).toLowerCase().replace(/_/g, "-");
    }
  }
  return null;
}

async function chatIdForUser(userId: string): Promise<string | null> {
  const [link] = await db
    .select({ chatId: telegramLink.chatId })
    .from(telegramLink)
    .where(eq(telegramLink.userId, userId))
    .limit(1);
  return link?.chatId ?? null;
}

/**
 * Resolve a ping target to a Telegram chat id, or null when the person has
 * neither linked Telegram nor been given an env/config chat id — the caller
 * counts that as skippedNoChatId, never an error.
 */
export async function resolveChat(target: NotifyTarget): Promise<ResolvedChat | null> {
  const userId = target.userId ?? (target.ownerKey ? ownerUserId(target.ownerKey) : null);

  // 1. Canonical: the person's own linked chat.
  if (userId) {
    const chatId = await chatIdForUser(userId);
    if (chatId) return { chatId, via: "telegram_link", userId };
  }

  // 2–3. Owner-key fallbacks (env override wins inside ownerTelegramChatId).
  if (target.ownerKey) {
    const notifyEnvKey = `NOTIFY_TG_CHAT_${target.ownerKey.toUpperCase().replace(/-/g, "_")}`;
    const fromNotifyEnv = process.env[notifyEnvKey]?.trim();
    if (fromNotifyEnv) return { chatId: fromNotifyEnv, via: "env", userId };

    const owner = resolveOwnerByKey(target.ownerKey);
    if (owner) {
      const chatId = ownerTelegramChatId(owner);
      if (chatId) {
        const viaEnv = Boolean(
          process.env[`BOARD_TG_CHAT_${owner.key.toUpperCase().replace(/-/g, "_")}`]?.trim(),
        );
        return { chatId, via: viaEnv ? "env" : "owners_config", userId };
      }
    }
  }

  return null;
}

/**
 * WhatsApp fallback number for a target (go-live 2026-07-24: nobody has
 * linked Telegram yet, but every manager IS a paired WhatsApp line — so the
 * system's pings ride our own wa_outbox/Baileys drain until Telegram adoption
 * happens). Resolution: NOTIFY_WA_PHONE_<OWNER_KEY> env (digits), values
 * taken from the line numbers in wa-observer session creds.
 */
export function resolveWaPhone(
  target: NotifyTarget,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const key =
    target.ownerKey ?? (target.userId ? ownerKeyForUser(target.userId, env) : null);
  if (!key) return null;
  const raw = env[`NOTIFY_WA_PHONE_${key.toUpperCase().replace(/-/g, "_")}`]?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
