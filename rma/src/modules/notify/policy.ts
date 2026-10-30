/**
 * policy.ts — pure delivery-policy helpers for staff Telegram pings.
 * Client-safe (no db/env side effects at import time; env is always passed in
 * or read lazily), fully unit-testable — see policy.test.ts.
 *
 * The policy in one line: pings reach a person only during Dubai working hours
 * (09:00–21:00), never twice about the same thing (dedupe keys, enforced by a
 * UNIQUE index on the notification ledger), and never more than
 * NOTIFY_MAX_PER_USER_PER_DAY times a day per person.
 */

/** Dubai is UTC+4 year-round (no DST) — a fixed offset is exact, not a shortcut. */
export const DUBAI_UTC_OFFSET_HOURS = 4;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Hour-of-day (0–23) on the Dubai wall clock. */
export function dubaiHour(now: Date): number {
  return new Date(now.getTime() + DUBAI_UTC_OFFSET_HOURS * HOUR_MS).getUTCHours();
}

/** 'YYYY-MM-DD' of the Dubai calendar day — the unit of daily dedupe keys. */
export function dubaiDateKey(now: Date): string {
  return new Date(now.getTime() + DUBAI_UTC_OFFSET_HOURS * HOUR_MS)
    .toISOString()
    .slice(0, 10);
}

/** UTC instant when the current Dubai calendar day started (rate-cap window). */
export function dubaiDayStartUtc(now: Date): Date {
  const shifted = now.getTime() + DUBAI_UTC_OFFSET_HOURS * HOUR_MS;
  const dayStartShifted = Math.floor(shifted / DAY_MS) * DAY_MS;
  return new Date(dayStartShifted - DUBAI_UTC_OFFSET_HOURS * HOUR_MS);
}

/**
 * Quiet hours: 21:00–08:59 Dubai. 09:00 sharp is allowed — that is exactly
 * when the morning digests fire, so they need no special-casing here.
 */
export function isQuietHours(now: Date): boolean {
  const h = dubaiHour(now);
  return h >= 21 || h < 9;
}

// ─── Dedupe keys ────────────────────────────────────────────────────────────
// The key IS the "about the same thing" definition, so build them in one place:
//   wait      — one ping per waiting conversation per Dubai day (plus the
//               escalation cooldown on top for same-day re-breach).
//   hot deal / hot lead — once ever per entity: "this deal is yours" doesn't
//               repeat.
//   digests   — one per recipient per Dubai day.

export function waitKey(cardId: string, now: Date): string {
  return `wait:${cardId}:${dubaiDateKey(now)}`;
}

export function hotDealKey(dealId: string): string {
  return `hot:deal:${dealId}`;
}

export function hotLeadKey(leadId: string): string {
  return `hot:lead:${leadId}`;
}

export function digestKey(target: string, now: Date): string {
  return `digest:${target}:${dubaiDateKey(now)}`;
}

/**
 * Shared per-contact dedupe key. Every per-contact "someone's shopping" rule
 * (hot_inbound + the hunters) builds its key HERE so they collapse: one client
 * is at most ONE ping to a given manager per Dubai day, no matter how many
 * rules it trips (Firuz: «зачем повторять одно и то же два раза?»). Keyed on the
 * TARGET manager, so the same client can still reach two DIFFERENT managers.
 * The last-9-digits normalisation matches contacts across @lid / @s.whatsapp.net.
 */
export function perContactKey(ownerKey: string, contact: string, now: Date): string {
  return `pc:${ownerKey}:${contact.replace(/\D/g, "").slice(-9)}:${dubaiDateKey(now)}`;
}

export function ceoDigestKey(now: Date): string {
  return `ceo:${dubaiDateKey(now)}`;
}

// ─── Feature gates ──────────────────────────────────────────────────────────

export type NotifyEnv = Record<string, string | undefined>;

/** Master switch. Off by default — flipping NOTIFY_ENABLED=true is the launch. */
export function notifyEnabled(env: NotifyEnv = process.env): boolean {
  return env.NOTIFY_ENABLED === "true";
}

/**
 * Pilot allowlist: comma-separated user ids and/or owner keys
 * (NOTIFY_ALLOWLIST=azat,babek or =<uuid>,<uuid>). '*' or unset-while-enabled
 * means everyone. Matching is case-insensitive on owner keys.
 */
export function parseAllowlist(raw: string | undefined): Set<string> | "all" {
  const t = (raw ?? "").trim();
  if (t === "" || t === "*") return "all";
  return new Set(
    t
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function allowlistPermits(
  list: Set<string> | "all",
  target: { userId?: string | null; ownerKey?: string | null },
): boolean {
  if (list === "all") return true;
  const userId = target.userId?.toLowerCase();
  const key = target.ownerKey?.toLowerCase();
  return Boolean((userId && list.has(userId)) || (key && list.has(key)));
}

/** Daily per-person ping budget. Digests count too — they are pings. */
export function maxPerUserPerDay(env: NotifyEnv = process.env): number {
  const n = Number(env.NOTIFY_MAX_PER_USER_PER_DAY ?? "10");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
}

export function underRateCap(sentToday: number, env: NotifyEnv = process.env): boolean {
  return sentToday < maxPerUserPerDay(env);
}
