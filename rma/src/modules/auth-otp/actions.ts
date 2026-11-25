"use server";

import { randomInt, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, and, desc, isNull, isNotNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/platform/db/client";
import {
  user,
  telegramLink,
  telegramLinkToken,
  loginCode,
  loginRequest,
  telegramLinkPending,
  tenantMember,
} from "@/platform/db/schema";
import { canEmailSignIn } from "@/platform/auth";
import { isPlatformAdmin, requirePlatformAdmin } from "@/platform/auth/authorization";
import { rateLimit } from "@/platform/security/rate-limit";
import { log } from "@/platform/log";
import { normalizePhone, phonesMatch, MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";

// Telegram OTP login — additional identity factor alongside password +
// magic-link (email is dead in this deployment). Every path here is gated
// by canEmailSignIn() (the private allow-list) and reuses the existing
// rate limiter (platform/security/rate-limit.ts) — no new limiter.

export type RequestLoginCodeResult =
  | { ok: true; mode: "code_sent" }
  | { ok: true; mode: "need_link"; deepLink: string }
  | { ok: false; error: "rate_limited" };

const CODE_TTL_MS = 5 * 60 * 1000;
const LINK_TOKEN_TTL_MS = 10 * 60 * 1000;
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;

// Best-effort client IP from proxy headers — same extraction logic as
// platform/security/rate-limit.ts#clientIp, adapted for next/headers()
// (a server action has no Request object to hand that function directly).
function getClientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

// Both Telegram sends below sit on the INTERACTIVE login path — the user is
// staring at a spinner while the server action awaits them. Node's fetch
// (undici) has no total-response timeout, so a wedged api.telegram.org would
// hang the sign-in request forever and nobody could log in.
//
// 5s: Telegram's sendMessage normally answers in well under half a second, so
// this is ~10x headroom while still keeping the worst-case login latency in
// human range. On timeout both helpers fall through to their existing
// `return false` path, so the caller still returns its normal result — the
// login_request / login_code row is already committed and simply expires on
// its own TTL rather than leaving the flow wedged.
const TELEGRAM_SEND_TIMEOUT_MS = 5_000;

function isTelegramTimeout(err: unknown): boolean {
  // AbortSignal.timeout() rejects with a DOMException named "TimeoutError".
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function telegramDeepLink(token: string): string {
  const botUsername = process.env.TELEGRAM_OTP_BOT_USERNAME ?? "zamtek_otp_bot";
  return `https://t.me/${botUsername}?start=${token}`;
}

async function sendTelegramCode(chatId: string, code: string): Promise<boolean> {
  const token = process.env.TELEGRAM_OTP_BOT_TOKEN;
  if (!token) {
    console.warn("[auth-otp] TELEGRAM_OTP_BOT_TOKEN not set — code not delivered");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Your MyCRM login code: ${code}\nValid for 5 minutes. Do not share it with anyone.`,
      }),
      signal: AbortSignal.timeout(TELEGRAM_SEND_TIMEOUT_MS),
    });
    return res.ok;
  } catch (err) {
    if (isTelegramTimeout(err)) {
      log.error("auth-otp: Telegram sendMessage (login code) timed out", {
        timeoutMs: TELEGRAM_SEND_TIMEOUT_MS,
        err,
      });
      return false;
    }
    console.error("[auth-otp] Telegram send failed:", err);
    return false;
  }
}

// Push a one-tap "confirm login" prompt to an already-linked chat. Used by the
// phone-number login flow: we know who the caller is (matched by phone) and
// that their Telegram is linked, so instead of making them open the bot we
// deliver a deep link back into it. Tapping it re-enters the bot's existing
// premium `/start login_<token>` handshake from their linked chat, which flips
// the login_request to "authenticated" — exactly like the one-tap button.
async function sendTelegramLoginPush(chatId: string, deepLink: string): Promise<boolean> {
  const token = process.env.TELEGRAM_OTP_BOT_TOKEN;
  if (!token) {
    console.warn("[auth-otp] TELEGRAM_OTP_BOT_TOKEN not set — login push not delivered");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🔐 Sign-in request to MyCRM by phone number.\nTap the button below to confirm the sign-in. If this wasn't you, just ignore this message.",
        reply_markup: { inline_keyboard: [[{ text: "Confirm sign-in", url: deepLink }]] },
      }),
      signal: AbortSignal.timeout(TELEGRAM_SEND_TIMEOUT_MS),
    });
    return res.ok;
  } catch (err) {
    if (isTelegramTimeout(err)) {
      log.error("auth-otp: Telegram sendMessage (login push) timed out", {
        timeoutMs: TELEGRAM_SEND_TIMEOUT_MS,
        err,
      });
      return false;
    }
    console.error("[auth-otp] Telegram login push failed:", err);
    return false;
  }
}

/**
 * Request a login code (or a Telegram-link deep link if not yet linked).
 *
 * Enumeration-safe by construction: an email that fails canEmailSignIn()
 * (unknown, or known but not an active/trial member) gets back the exact
 * same shape as a real allow-listed-but-unlinked user — `mode:"need_link"`
 * with a deep link — except the token in that link is a random string that
 * was NEVER written to telegram_link_token. The bot's `/start <token>`
 * lookup then rejects it exactly like an expired/unknown token, so the two
 * cases are indistinguishable from the outside.
 */
export async function requestLoginCode(rawEmail: string): Promise<RequestLoginCodeResult> {
  const email = rawEmail.toLowerCase().trim();
  const h = await headers();
  const ip = getClientIp(h);

  // Rate-limit BEFORE the allow-list check and unconditionally, so a probe
  // against an unknown email is throttled identically to a real one.
  const limited = rateLimit({
    key: `otp-request:${ip}:${email}`,
    limit: REQUEST_LIMIT,
    windowMs: REQUEST_WINDOW_MS,
  });
  if (!limited.ok) {
    return { ok: false, error: "rate_limited" };
  }

  const allowed = email ? await canEmailSignIn(email) : false;
  if (!allowed) {
    return { ok: true, mode: "need_link", deepLink: telegramDeepLink(randomBytes(24).toString("hex")) };
  }

  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  if (!u) {
    // canEmailSignIn() already requires an existing user row, so this is
    // unreachable in practice — defensive fallback keeps the response shape
    // identical to the disallowed-email branch above.
    return { ok: true, mode: "need_link", deepLink: telegramDeepLink(randomBytes(24).toString("hex")) };
  }

  const [link] = await db
    .select({ chatId: telegramLink.chatId })
    .from(telegramLink)
    .where(eq(telegramLink.userId, u.id))
    .limit(1);

  if (link) {
    // CSPRNG 6-digit code, zero-padded — never Math.random().
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    await db.insert(loginCode).values({
      userId: u.id,
      codeHash,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });

    const sent = await sendTelegramCode(link.chatId, code);
    if (!sent) {
      // Delivery failure (bot down / user blocked the bot) is logged but the
      // response shape doesn't change — otherwise a failed-delivery signal
      // would itself leak account state to the caller.
      console.error(`[auth-otp] failed to deliver login code to user ${u.id}`);
    }
    return { ok: true, mode: "code_sent" };
  }

  // Allow-listed but not linked yet — issue a real, DB-backed link token.
  const token = randomBytes(24).toString("hex");
  await db.insert(telegramLinkToken).values({
    token,
    userId: u.id,
    expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
  });
  return { ok: true, mode: "need_link", deepLink: telegramDeepLink(token) };
}

// ─── Telegram PREMIUM login — one-tap, no code typing ──────────────────────
//
// Flow: startTelegramLogin() creates a `login_request` row (no user attached
// yet — we don't know who this is until Telegram tells us) and hands back a
// deep link of the form `https://t.me/<bot>?start=login_<token>`. The login
// page opens it and polls pollTelegramLogin(token) every couple seconds.
//
// otp-bot/bot.js does the actual identity work: on `/start login_<token>` it
// either recognizes an already-linked chat (instant auth) or asks the user
// to share their phone number as a Telegram "contact", which it matches
// against user.phone. Either way it flips this row to status:"authenticated"
// with user_id set. Only then does the client call
// signIn("telegram-session", { token }) — the NextAuth provider re-validates
// this exact row server-side and consumes it (status:"consumed") so a token
// can never be replayed.

const LOGIN_REQUEST_TTL_MS = 5 * 60 * 1000;
const START_LIMIT = 10;
const START_WINDOW_MS = 5 * 60 * 1000;

export type StartTelegramLoginResult =
  | { ok: true; token: string; deepLink: string }
  | { ok: false; error: "rate_limited" };

export type PollTelegramLoginStatus = "pending" | "authenticated" | "consumed" | "expired";
export type PollTelegramLoginResult = { status: PollTelegramLoginStatus };

/**
 * Start a premium (one-tap) Telegram login: creates a fresh `login_request`
 * and returns the token + the t.me deep link to open. Rate-limited per IP
 * only (there's no email/identity yet at this point in the flow — that's
 * the whole point of the premium flow).
 */
export async function startTelegramLogin(): Promise<StartTelegramLoginResult> {
  const h = await headers();
  const ip = getClientIp(h);

  const limited = rateLimit({
    key: `telegram-login-start:${ip}`,
    limit: START_LIMIT,
    windowMs: START_WINDOW_MS,
  });
  if (!limited.ok) {
    return { ok: false, error: "rate_limited" };
  }

  const token = randomBytes(24).toString("hex");
  await db.insert(loginRequest).values({
    token,
    status: "pending",
    expiresAt: new Date(Date.now() + LOGIN_REQUEST_TTL_MS),
  });

  const botUsername = process.env.TELEGRAM_OTP_BOT_USERNAME ?? "zamtek_otp_bot";
  return {
    ok: true,
    token,
    deepLink: `https://t.me/${botUsername}?start=login_${token}`,
  };
}

/**
 * Read-only poll for the login page. Never leaks the user id/email — just
 * enough for the client to know when to call signIn("telegram-session").
 * "expired" is computed from expiresAt rather than stored, since the bot
 * only ever writes "authenticated" and the provider only ever writes
 * "consumed" — nothing sweeps stale rows to "expired" on a timer.
 */
export async function pollTelegramLogin(token: string): Promise<PollTelegramLoginResult> {
  const t = token?.trim();
  if (!t) return { status: "expired" };

  const [row] = await db
    .select({ status: loginRequest.status, expiresAt: loginRequest.expiresAt })
    .from(loginRequest)
    .where(eq(loginRequest.token, t))
    .limit(1);

  if (!row) return { status: "expired" };
  if (row.status === "pending" && row.expiresAt.getTime() <= Date.now()) {
    return { status: "expired" };
  }
  return { status: row.status as PollTelegramLoginStatus };
}

// ─── Phone-number login — reuses the one-tap poll machinery ────────────────
//
// The user types a phone number instead of tapping the Telegram button. If it
// maps to a user WITH a linked Telegram, we create the same `login_request` the
// premium flow uses and push a "confirm login" deep link to that chat; the
// client then polls pollTelegramLogin() identically. If there's no user or no
// link, we return one generic result — no account-existence signal beyond the
// friendly "register via the bot" message the client shows.
//
// Rate-limited per IP AND per phone (in-memory, best-effort — same limiter the
// mini-app endpoints use).

export type RequestOtpByPhoneResult =
  | { ok: true; token: string }
  | { ok: false; error: "rate_limited" | "not_found" };

const PHONE_OTP_IP_LIMIT = 10;
const PHONE_OTP_PHONE_LIMIT = 5;
const PHONE_OTP_WINDOW_MS = 15 * 60 * 1000;

export async function requestOtpByPhone(rawPhone: string): Promise<RequestOtpByPhoneResult> {
  const h = await headers();
  const ip = getClientIp(h);
  const digits = normalizePhone(rawPhone);

  // Throttle unconditionally BEFORE any lookup, per IP and per phone, so a
  // probe is limited the same whether or not the number resolves.
  const ipLimited = rateLimit({ key: `otp-phone:ip:${ip}`, limit: PHONE_OTP_IP_LIMIT, windowMs: PHONE_OTP_WINDOW_MS });
  const phoneLimited = rateLimit({
    key: `otp-phone:num:${digits || "empty"}`,
    limit: PHONE_OTP_PHONE_LIMIT,
    windowMs: PHONE_OTP_WINDOW_MS,
  });
  if (!ipLimited.ok || !phoneLimited.ok) return { ok: false, error: "rate_limited" };

  // Too short to be a real local+area run — never trust a match below the
  // shared minimum (see MIN_PHONE_MATCH_DIGITS).
  if (digits.length < MIN_PHONE_MATCH_DIGITS) return { ok: false, error: "not_found" };

  // `user` is a global (non-tenant) table; staff-sized, so pulling the phoned
  // rows and matching in JS reuses the exact normalize/suffix semantics the
  // rest of the app uses for phone linking.
  const users = await db
    .select({ id: user.id, phone: user.phone })
    .from(user)
    .where(isNotNull(user.phone));

  const exact = users.filter((u) => normalizePhone(u.phone) === digits);
  const suffix = users.filter((u) => phonesMatch(u.phone, rawPhone));
  const seen = new Set<string>();
  const candidates = [...exact, ...suffix].filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));

  for (const c of candidates) {
    const [link] = await db
      .select({ chatId: telegramLink.chatId })
      .from(telegramLink)
      .where(eq(telegramLink.userId, c.id))
      .limit(1);
    if (!link) continue;

    const token = randomBytes(24).toString("hex");
    await db.insert(loginRequest).values({
      token,
      status: "pending",
      expiresAt: new Date(Date.now() + LOGIN_REQUEST_TTL_MS),
    });
    const botUsername = process.env.TELEGRAM_OTP_BOT_USERNAME ?? "zamtek_otp_bot";
    const deepLink = `https://t.me/${botUsername}?start=login_${token}`;
    // Delivery failure is logged but not surfaced — the response shape must not
    // change based on whether the chat is reachable.
    await sendTelegramLoginPush(link.chatId, deepLink);
    return { ok: true, token };
  }

  return { ok: false, error: "not_found" };
}

// ─── Admin-approved first-link fallback ────────────────────────────────────
//
// The phones we can pre-populate on user.phone are shared BUSINESS-line
// WhatsApp numbers, not staff's personal Telegram numbers — so the bot's
// automatic phone match (handleContact in otp-bot/bot.js) is expected to
// miss most of the time. When it does, the bot queues the chat in
// `telegram_link_pending` instead of rejecting the person. These two
// actions back /admin/telegram-links, where an admin manually links that
// chat to the right user — after which telegram_link exists and every
// future login for that chat is instant (bot's /start login_<token>
// handler finds it directly, no contact-share needed).

// SECURITY: these two actions are platform-admin only. telegram_link IS the
// login credential (otp-bot resolves a login purely by chat id), so
// approveTelegramLink binds an arbitrary Telegram chat to an arbitrary user
// account — i.e. it mints a credential for that account. The earlier gate
// (platform_admin OR tenant_admin of any tenant) let a tenant_admin of one
// tenant bind their OWN chat to a platform_admin's userId and take over the
// whole platform. The /admin/telegram-links page that drives these actions is
// already behind requirePlatformAdmin() (app/admin/layout.tsx), so tightening
// to requirePlatformAdmin() here changes nothing for the legitimate UI path.

export type PendingTelegramLink = {
  id: string;
  chatId: string;
  phone: string | null;
  tgFirstName: string | null;
  tgUsername: string | null;
  requestedAt: Date;
};

/** Unresolved telegram_link_pending rows, newest first. Platform-admin only. */
export async function listPendingTelegramLinks(): Promise<PendingTelegramLink[]> {
  await requirePlatformAdmin();
  return db
    .select({
      id: telegramLinkPending.id,
      chatId: telegramLinkPending.chatId,
      phone: telegramLinkPending.phone,
      tgFirstName: telegramLinkPending.tgFirstName,
      tgUsername: telegramLinkPending.tgUsername,
      requestedAt: telegramLinkPending.requestedAt,
    })
    .from(telegramLinkPending)
    .where(isNull(telegramLinkPending.resolvedAt))
    .orderBy(desc(telegramLinkPending.requestedAt))
    .limit(200);
}

/**
 * Resolve a pending Telegram chat by linking it to `userId`. Bound as
 * `approveTelegramLink.bind(null, pendingId)` for use as a <form action=…>
 * so the second parameter arrives as FormData (userId comes from a <select>
 * in the admin page) — the standard Next.js server-action pattern for
 * per-row forms, same shape as confirmDevice/revokeUser in
 * app/admin/access/actions.ts.
 */
export async function approveTelegramLink(pendingId: string, formData: FormData): Promise<void> {
  const approverId = await requirePlatformAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!pendingId || !userId) return;

  // Defense in depth: today requirePlatformAdmin() above makes these checks a
  // no-op (a platform admin may link anyone), but if the gate is ever weakened
  // back to tenant_admin, a non-platform-admin approver must still never mint
  // a credential for a platform admin's account or for a user outside their
  // own tenant(s) — either would re-open full account takeover.
  if (!(await isPlatformAdmin(approverId))) {
    if (await isPlatformAdmin(userId)) {
      throw new Error("Forbidden: cannot link a platform admin account");
    }
    const [approverTenants, targetTenants] = await Promise.all([
      db
        .select({ tenantId: tenantMember.tenantId })
        .from(tenantMember)
        .where(eq(tenantMember.userId, approverId)),
      db
        .select({ tenantId: tenantMember.tenantId })
        .from(tenantMember)
        .where(eq(tenantMember.userId, userId)),
    ]);
    const approverTenantIds = new Set(approverTenants.map((t) => t.tenantId));
    if (!targetTenants.some((t) => approverTenantIds.has(t.tenantId))) {
      throw new Error("Forbidden: user is outside your tenant");
    }
  }

  const [pending] = await db
    .select()
    .from(telegramLinkPending)
    .where(and(eq(telegramLinkPending.id, pendingId), isNull(telegramLinkPending.resolvedAt)))
    .limit(1);
  if (!pending) return;

  await db
    .insert(telegramLink)
    .values({
      userId,
      chatId: pending.chatId,
      username: pending.tgUsername,
      phone: pending.phone,
    })
    .onConflictDoUpdate({
      target: telegramLink.userId,
      set: { chatId: pending.chatId, username: pending.tgUsername, phone: pending.phone, linkedAt: new Date() },
    });

  await db
    .update(telegramLinkPending)
    .set({ resolvedAt: new Date(), resolvedUserId: userId })
    .where(eq(telegramLinkPending.id, pendingId));

  revalidatePath("/admin/telegram-links");
}
