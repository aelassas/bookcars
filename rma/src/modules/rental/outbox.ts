/**
 * outbox.ts — the rental distributor's WhatsApp sender.
 *
 * ONE outbound path exists in this house: a row in wa_outbox, drained by the
 * owning line's wa-observer bridge (bridge.js) — never Baileys directly. The
 * bridge's guards do the rest: it only sends rows whose brand_line is ITS
 * slug, only when WA_SEND_ENABLED=true (and the per-line flag is not false),
 * ≥20s between sends, group JIDs rejected, stop-word-flagged rows held.
 *
 * This module is the enqueue side for the rental distributor (auto-reply,
 * agent assignment ping, manager events). It respects every guard by
 * construction:
 *   - brandLine is the MAIN LINE's slug — the message goes out from the same
 *     number the customer wrote to, and only that line's observer can drain it;
 *   - board_item_id is a deterministic UUID minted from the caller's dedupe
 *     key (the jidToUuid pattern from modules/messaging/thread-actions.ts —
 *     the column is uuid NOT NULL with no FK), so the outbox's pending-unique
 *     index (board_item_id, content_hash) collapses a re-queued identical
 *     message while one is still pending;
 *   - the stop-word screen runs inside enqueueOutbox, unchanged.
 *
 * buildDistributorOutboxRow is PURE and unit-tested; the IO wrapper is one
 * withDrizzleTenant + enqueueOutbox call, the same shape run-rental-automations
 * uses for its reassignment pings.
 */
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { enqueueOutbox, type EnqueuePayload } from "@/platform/outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";

/** Deterministic UUID for wa_outbox.board_item_id — same md5→uuid shaping the
 *  thread-reply path uses (thread-actions.ts jidToUuid). */
export function dedupeUuid(key: string): string {
  const h = createHash("md5").update(key).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Build the enqueue payload for one distributor message, or null when there is
 * no honest recipient (fewer than 9 digits — never send to a guess). `line` is
 * the observer slug the row belongs to; the bridge rejects anything not its
 * own, so a wrong slug parks the row forever — callers pass the main line the
 * lead arrived on.
 */
export function buildDistributorOutboxRow(input: {
  tenantId: string;
  line: string;
  toDigits: string;
  text: string;
  dedupeKey: string;
}): EnqueuePayload | null {
  const digits = (input.toDigits ?? "").replace(/\D/g, "");
  if (digits.length < 9 || !input.text.trim()) return null;
  return {
    tenantId: input.tenantId,
    boardItemId: dedupeUuid(input.dedupeKey),
    toJid: `${digits}@s.whatsapp.net`,
    brandLine: input.line,
    body: input.text,
    approvedBy: "rental-distributor",
  };
}

/**
 * Enqueue one distributor WhatsApp message. Returns false — never throws for
 * routing reasons — when the line's tenant does not exist (the notification is
 * dropped loudly by the caller, the lead is unaffected).
 */
export async function enqueueDistributorWhatsApp(input: {
  line: string;
  toDigits: string;
  text: string;
  dedupeKey: string;
  /** tenant id of the LINE's tenant (outbox rows are tenant-scoped by RLS). */
  tenantId: string;
}): Promise<boolean> {
  const payload = buildDistributorOutboxRow({
    tenantId: input.tenantId,
    line: input.line,
    toDigits: input.toDigits,
    text: input.text,
    dedupeKey: input.dedupeKey,
  });
  if (!payload) return false;
  await withDrizzleTenant(input.tenantId, (tx) => enqueueOutbox(tx, payload));
  return true;
}

/** tenant slug → id lookup for the runners (null when the slug is unknown). */
export async function tenantIdForSlug(
  slug: string,
  database: typeof db = db
): Promise<string | null> {
  const [t] = await database
    .select({ id: tenant.id })
    .from(tenant)
    .where(eq(tenant.slug, slug))
    .limit(1);
  return t?.id ?? null;
}
