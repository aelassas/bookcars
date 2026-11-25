/**
 * send.ts — THE single point every staff Telegram ping goes through.
 *
 * Rules (modules/notify/rules.ts, board escalation, lead routing) never call
 * the Bot API themselves; they describe a ping and this function decides
 * whether it may go out:
 *
 *   gate      NOTIFY_ENABLED (off by default) + NOTIFY_ALLOWLIST (pilot)
 *   resolve   registry cascade → Telegram chat id (no chat = silent skip)
 *   quiet     nothing 21:00–08:59 Dubai
 *   cap       max NOTIFY_MAX_PER_USER_PER_DAY sent pings per person per day
 *   dedupe    ledger claim — INSERT .. ON CONFLICT DO NOTHING on
 *             (tenant_id, dedupe_key). The database decides "already pinged",
 *             so two concurrent rule runs can't double-send. Failed rows are
 *             reclaimed so a Telegram outage doesn't permanently eat a ping.
 *   send      notifyTelegram with the OTP bot's token — staff telegram_link
 *             chats belong to @zamtek_otp_bot, and a chat id only works with
 *             the bot the person actually talked to.
 *
 * `dryRun` computes and logs the full decision but writes and sends nothing.
 * `backfill` records the ledger row without sending — used on first live run
 * so pre-existing signals don't blast the team.
 * `force` skips the enable/allowlist/quiet/cap gates (NOT dedupe) — reserved
 * for pre-existing live paths like lead routing that must keep working with
 * the flag off.
 */

import { and, eq, gte, or, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { notification } from "@/platform/db/schema";
import { notifyTelegram } from "@/platform/notify/telegram";
import { enqueueOutbox } from "@/platform/outbox";
import { resolveChat, resolveWaPhone, type NotifyTarget } from "./registry";
import {
  allowlistPermits,
  dubaiDayStartUtc,
  isQuietHours,
  notifyEnabled,
  parseAllowlist,
  underRateCap,
} from "./policy";

export type SendRequest = {
  kind: string; // wait | hot_deal | hot_lead | digest | ceo_digest | …
  target: NotifyTarget;
  text: string;
  dedupeKey: string;
  entityType?: string;
  entityId?: string;
  dryRun?: boolean;
  backfill?: boolean;
  force?: boolean;
  /** Injectable clock for tests/canaries. */
  now?: Date;
};

export type SendOutcome =
  | "sent"
  | "dry_run"
  | "backfill"
  | "skipped_disabled"
  | "skipped_allowlist"
  | "skipped_no_chat"
  | "skipped_quiet_hours"
  | "skipped_rate_cap"
  | "skipped_dedupe"
  | "failed";

export type SendResult = { outcome: SendOutcome; error?: string };

function notifyBotToken(): string | undefined {
  return (
    process.env.NOTIFY_TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_OTP_BOT_TOKEN?.trim() ||
    undefined
  );
}

async function sentTodayCount(
  tenantId: string,
  target: { userId: string | null; ownerKey?: string | null },
  now: Date,
): Promise<number> {
  const dayStart = dubaiDayStartUtc(now);
  const idConds = [
    target.userId ? eq(notification.targetUserId, target.userId) : undefined,
    target.ownerKey ? eq(notification.targetKey, target.ownerKey) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[];
  if (idConds.length === 0) return 0;

  return withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(notification)
      .where(
        and(
          eq(notification.status, "sent"),
          gte(notification.createdAt, dayStart),
          or(...idConds),
        ),
      );
    return row?.n ?? 0;
  });
}

/**
 * Claim the dedupe key: insert a pending row, or reclaim a previously-failed
 * one. Returns the claimed row id, or null when the key is already taken by a
 * sent/backfill/pending row (= someone else pinged or is pinging right now).
 */
async function claimDedupe(
  tenantId: string,
  req: SendRequest,
  resolved: { chatId: string | null; userId: string | null },
  status: "pending" | "backfill",
): Promise<string | null> {
  return withDrizzleTenant(tenantId, async (tx) => {
    const inserted = await tx
      .insert(notification)
      .values({
        tenantId,
        kind: req.kind,
        targetUserId: resolved.userId,
        targetKey: req.target.ownerKey ?? null,
        chatId: resolved.chatId,
        entityType: req.entityType ?? null,
        entityId: req.entityId ?? null,
        dedupeKey: req.dedupeKey,
        status,
        preview: req.text.split("\n")[0]?.slice(0, 200) ?? null,
      })
      .onConflictDoNothing({ target: [notification.tenantId, notification.dedupeKey] })
      .returning({ id: notification.id });
    const insertedRow = Array.isArray(inserted) ? inserted[0] : undefined;
    if (insertedRow) return insertedRow.id;

    // Key exists — reclaim it only if the previous attempt FAILED.
    const reclaimed = await tx
      .update(notification)
      .set({ status, error: null, chatId: resolved.chatId })
      .where(
        and(
          eq(notification.tenantId, tenantId),
          eq(notification.dedupeKey, req.dedupeKey),
          eq(notification.status, "failed"),
        ),
      )
      .returning({ id: notification.id });
    const reclaimedRow = Array.isArray(reclaimed) ? reclaimed[0] : undefined;
    return reclaimedRow?.id ?? null;
  });
}

async function finishLedger(
  tenantId: string,
  rowId: string,
  patch: { status: "sent" | "failed"; error?: string },
): Promise<void> {
  await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .update(notification)
      .set({
        status: patch.status,
        error: patch.error ?? null,
        sentAt: patch.status === "sent" ? new Date() : null,
      })
      .where(eq(notification.id, rowId)),
  );
}

export async function sendNotification(tenantId: string, req: SendRequest): Promise<SendResult> {
  const now = req.now ?? new Date();
  const tag = `[notify] kind=${req.kind} dedupe=${req.dedupeKey}`;

  if (!req.force && !req.backfill) {
    if (!notifyEnabled()) return { outcome: "skipped_disabled" };
    if (!allowlistPermits(parseAllowlist(process.env.NOTIFY_ALLOWLIST), req.target)) {
      return { outcome: "skipped_allowlist" };
    }
  }

  const resolved = await resolveChat(req.target);
  const userId = resolved?.userId ?? req.target.userId ?? null;

  // WhatsApp fallback (go-live 2026-07-24): no Telegram link yet → ride our
  // own wa_outbox/Baileys drain. The ping goes FROM the system's sender line
  // (NOTIFY_WA_SENDER_LINE) TO the manager's own number. enqueueOutbox keeps
  // its stop-word screen; actual delivery honors the drain's WA_SEND_ENABLED
  // flag on the sender line's observer, ≥20s apart.
  const waSenderLine = process.env.NOTIFY_WA_SENDER_LINE?.trim() || null;
  const waPhone = !resolved && waSenderLine ? resolveWaPhone(req.target) : null;

  if (!resolved && !waPhone && !req.backfill) {
    console.warn(
      `${tag} no Telegram chat for user=${req.target.userId ?? "-"} key=${req.target.ownerKey ?? "-"} — ` +
        `have them /start @zamtek_otp_bot, set NOTIFY_TG_CHAT_<KEY>, or set NOTIFY_WA_PHONE_<KEY>`,
    );
    return { outcome: "skipped_no_chat" };
  }

  if (!req.force && !req.backfill && isQuietHours(now)) {
    return { outcome: "skipped_quiet_hours" };
  }

  if (!req.force && !req.backfill) {
    const sentToday = await sentTodayCount(
      tenantId,
      { userId, ownerKey: req.target.ownerKey },
      now,
    );
    if (!underRateCap(sentToday)) {
      console.warn(`${tag} rate cap hit for user=${userId ?? req.target.ownerKey}`);
      return { outcome: "skipped_rate_cap" };
    }
  }

  if (req.dryRun) {
    const via = resolved ? `tg:${resolved.chatId} (${resolved.via})` : `wa:${waPhone}`;
    console.log(`${tag} DRY RUN → ${via}:\n${req.text}`);
    return { outcome: "dry_run" };
  }

  const rowId = await claimDedupe(
    tenantId,
    req,
    { chatId: resolved?.chatId ?? (waPhone ? `wa:${waPhone}` : null), userId },
    req.backfill ? "backfill" : "pending",
  );
  if (!rowId) return { outcome: "skipped_dedupe" };
  if (req.backfill) return { outcome: "backfill" };

  if (!resolved && waPhone) {
    // WhatsApp path: hand the ping to wa_outbox; the sender line's drain does
    // the actual Baileys send. Ledger 'sent' = handed off (drain-side failures
    // stay visible in wa_outbox.status/error).
    try {
      await withDrizzleTenant(tenantId, (tx) =>
        enqueueOutbox(tx, {
          tenantId,
          boardItemId: rowId, // stable placeholder, same pattern as queueLeadReply
          toJid: `${waPhone}@s.whatsapp.net`,
          brandLine: waSenderLine!,
          body: req.text,
          approvedBy: "notify-system",
        }),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await finishLedger(tenantId, rowId, { status: "failed", error: msg });
      console.error(`${tag} wa enqueue failed: ${msg}`);
      return { outcome: "failed", error: msg };
    }
    await finishLedger(tenantId, rowId, { status: "sent" });
    return { outcome: "sent" };
  }

  const sent = await notifyTelegram(resolved!.chatId, req.text, { token: notifyBotToken() });
  if (!sent.ok) {
    await finishLedger(tenantId, rowId, { status: "failed", error: sent.error });
    console.error(`${tag} send failed: ${sent.error}`);
    return { outcome: "failed", error: sent.error };
  }

  await finishLedger(tenantId, rowId, { status: "sent" });
  return { outcome: "sent" };
}
