/**
 * escalation.ts — SLA-breach escalation for The Board.
 *
 * escalateBreachedBoardCards(tenantId) finds breached, unactioned cards
 * (open + awaiting_reply + past sla_due_at), routes each to its owning manager
 * (assigned_to, else BRAND_OWNERS by WhatsApp line) and sends the manager a
 * Telegram nudge with the card summary + a deep link to the card on the Board.
 *
 * IDEMPOTENT: a card is never nudged twice within the cooldown window —
 * last_escalated_at is set after a successful send and checked in the query.
 * On top of that, delivery goes through modules/notify/send.ts, which adds the
 * ledger dedupe (one ping per card per Dubai day), quiet hours, the daily
 * rate cap and the NOTIFY_ENABLED/NOTIFY_ALLOWLIST gates — this is push-first
 * rule 1 ("клиент ждёт"), re-exported by modules/notify/rules.ts.
 *
 * Scheduled from scripts/run-board-escalate.ts (board heartbeat) and from
 * scripts/run-notify.ts (notify heartbeat) — double-running is safe: the
 * cooldown and the ledger make the second run a no-op.
 *
 * Env:
 *   BOARD_ESCALATION_COOLDOWN_HOURS  re-nudge window, default 4
 *   APP_BASE_URL | NEXTAUTH_URL      base for the deep link, default http://localhost:3000
 *   NOTIFY_* / BOARD_TG_CHAT_<KEY>   delivery gates + chat resolution — see
 *                                    modules/notify/{send,registry}.ts
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { boardItem } from "@/platform/db/board-schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { sendNotification } from "@/modules/notify/send";
import { resolveChat, resolveWaPhone } from "@/modules/notify/registry";
import { waitKey } from "@/modules/notify/policy";
import { getBreachedCards, boardSourceLineExpr, type BoardCard } from "./queries";
import { resolveOwnerForLine, resolveOwnerByKey, type BrandOwner } from "./owners";
import { overdueMinutes, formatDurationMins } from "./sla";

const COOLDOWN_HOURS = Math.max(
  1,
  Number(process.env.BOARD_ESCALATION_COOLDOWN_HOURS ?? "4") || 4,
);

export type EscalationSummary = {
  tenantId: string;
  scanned: number;
  notified: number;
  skippedCooldown: number;
  skippedNoOwner: number;
  skippedNoChatId: number;
  /** Held back by delivery policy: flag off, allowlist, quiet hours, rate cap, ledger dedupe. */
  skippedPolicy: number;
  failed: number;
  dryRun: boolean;
};

function baseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function buildNudge(card: BoardCard, owner: BrandOwner, tenantSlug: string): string {
  const overdue = formatDurationMins(overdueMinutes(card.slaDueAt));
  const who = card.customerName ? `${card.customerName} (${card.customerRef})` : card.customerRef;
  const line = card.sourceLine ?? "unknown line";
  const link = `${baseUrl()}/${tenantSlug}/board#card-${card.id}`;
  return [
    `SLA BREACH — Board card overdue ${overdue}`,
    ``,
    `Owner: ${owner.name}`,
    `Line: ${line}  |  Channel: ${card.channel}  |  ${card.intent} / ${card.urgency}`,
    `Customer: ${who}`,
    `Summary: ${card.summary || "(no summary)"}`,
    ``,
    `Open the card: ${link}`,
  ].join("\n");
}

/**
 * Find breached, unactioned cards past the escalation cooldown and nudge the
 * owning manager on Telegram. Persists routing (source_line / assigned_to) and
 * last_escalated_at on each successfully-nudged card.
 *
 * `dryRun: true` computes and logs everything but sends nothing and writes nothing.
 */
export async function escalateBreachedBoardCards(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<EscalationSummary> {
  const dryRun = opts.dryRun ?? false;
  const summary: EscalationSummary = {
    tenantId,
    scanned: 0,
    notified: 0,
    skippedCooldown: 0,
    skippedNoOwner: 0,
    skippedNoChatId: 0,
    skippedPolicy: 0,
    failed: 0,
    dryRun,
  };

  // Tenant slug for the deep link. The tenant table is not tenant-scoped.
  const [t] = await db
    .select({ slug: tenant.slug })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  const tenantSlug = t?.slug ?? tenantId;

  const breached = await getBreachedCards(tenantId);
  summary.scanned = breached.length;

  // FRESHNESS FIRST (2026-07-24, the Artur lesson): the daily per-person cap
  // must be spent on TODAY's misses, not archaeology. Cards overdue beyond
  // MAX_AGE_DAYS are the zombie-digest's job, not a nudge; and among the
  // rest, the FRESHEST breach pings first — go-live day burned all caps on
  // 14-day-old backlog while a same-morning Rolls-Royce ask went unpinged.
  const MAX_AGE_DAYS = Math.max(
    1,
    Number(process.env.BOARD_ESCALATION_MAX_AGE_DAYS ?? "3") || 3,
  );
  const fresh = breached
    .filter((c) => overdueMinutes(c.slaDueAt) <= MAX_AGE_DAYS * 1440)
    .sort((a, b) => overdueMinutes(a.slaDueAt) - overdueMinutes(b.slaDueAt));

  for (const card of fresh) {
    // Idempotency: skip cards nudged within the cooldown window.
    if (
      card.lastEscalatedAt &&
      Date.now() - card.lastEscalatedAt.getTime() < COOLDOWN_HOURS * 3_600_000
    ) {
      summary.skippedCooldown++;
      continue;
    }

    // Route: explicit assignee first (if it is a known owner key), else the
    // brand owner of the card's WhatsApp line.
    const owner = resolveOwnerByKey(card.assignedTo) ?? resolveOwnerForLine(card.sourceLine);
    if (!owner) {
      summary.skippedNoOwner++;
      console.warn(
        `[board-escalation] no owner for card=${card.id} line=${card.sourceLine ?? "?"} assigned_to=${card.assignedTo ?? "-"} — fill BRAND_OWNERS in src/modules/board/owners.ts`,
      );
      continue;
    }

    // Resolution cascade (telegram_link → env → owners.ts) — checked up front
    // so the "have them /start the bot" warning still fires in dry runs.
    // A reachable owner = Telegram chat OR WhatsApp fallback number (go-live
    // 2026-07-24: pings ride wa_outbox until Telegram adoption). send.ts
    // makes the same decision authoritatively — this precheck only keeps the
    // "unreachable owner" warning visible in dry runs.
    const resolved = await resolveChat({ ownerKey: owner.key });
    if (!resolved && !resolveWaPhone({ ownerKey: owner.key })) {
      summary.skippedNoChatId++;
      console.warn(
        `[board-escalation] owner "${owner.key}" unreachable — /start @zamtek_otp_bot, NOTIFY_TG_CHAT_${owner.key.toUpperCase().replace(/-/g, "_")}, or NOTIFY_WA_PHONE_${owner.key.toUpperCase().replace(/-/g, "_")}`,
      );
      continue;
    }

    const text = buildNudge(card, owner, tenantSlug);

    const res = await sendNotification(tenantId, {
      kind: "wait",
      target: { userId: resolved?.userId ?? null, ownerKey: owner.key },
      text,
      dedupeKey: waitKey(card.id, new Date()),
      entityType: "board_item",
      entityId: card.id,
      dryRun,
    });

    if (res.outcome === "dry_run") {
      summary.notified++;
      continue;
    }
    if (res.outcome === "failed") {
      summary.failed++;
      continue;
    }
    if (res.outcome !== "sent") {
      summary.skippedPolicy++;
      continue;
    }

    // Persist routing + the idempotency marker. Guard on status='open' so a
    // card actioned mid-run is left alone.
    await withDrizzleTenant(tenantId, async (tx) =>
      tx
        .update(boardItem)
        .set({
          sourceLine: sql`coalesce(${boardItem.sourceLine}, ${card.sourceLine})`,
          assignedTo: sql`coalesce(${boardItem.assignedTo}, ${owner.key})`,
          assignedAt: sql`coalesce(${boardItem.assignedAt}, now())`,
          lastEscalatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(boardItem.id, card.id), eq(boardItem.status, "open"))),
    );

    summary.notified++;
  }

  console.log(
    `[board-escalation] tenant=${tenantId} scanned=${summary.scanned} notified=${summary.notified} cooldown=${summary.skippedCooldown} noOwner=${summary.skippedNoOwner} noChat=${summary.skippedNoChatId} policy=${summary.skippedPolicy} failed=${summary.failed}${dryRun ? " (dry run)" : ""}`,
  );
  return summary;
}

/**
 * Route open, unassigned cards to their brand owner WITHOUT sending anything.
 * Persists source_line + assigned_to. Safe to run any time; used to keep new
 * cards (created by classify-inbox, which knows nothing about routing) owned.
 */
export async function routeUnassignedBoardCards(tenantId: string): Promise<number> {
  let routed = 0;
  const open = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select({
        id: boardItem.id,
        assignedTo: boardItem.assignedTo,
        sourceLine: boardSourceLineExpr,
      })
      .from(boardItem)
      .where(and(eq(boardItem.status, "open"), sql`${boardItem.assignedTo} IS NULL`)),
  );

  for (const card of open) {
    const owner = resolveOwnerForLine(card.sourceLine);
    if (!owner) continue;
    await withDrizzleTenant(tenantId, async (tx) =>
      tx
        .update(boardItem)
        .set({
          sourceLine: sql`coalesce(${boardItem.sourceLine}, ${card.sourceLine})`,
          assignedTo: owner.key,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(boardItem.id, card.id), sql`${boardItem.assignedTo} IS NULL`)),
    );
    routed++;
  }
  return routed;
}
