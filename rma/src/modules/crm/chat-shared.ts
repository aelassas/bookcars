// Shared, non-"use server" helpers for the lead/customer <-> WhatsApp chat
// feature. Deliberately NOT a server-action module (no "use server"
// directive) — it's imported by BOTH chat-queries.ts and reply-actions.ts
// and takes a live drizzle `tx` as an argument, which would be invalid on an
// exported server-action function (Next requires "use server" exports to be
// RPC-callable with serializable args). This mirrors the existing
// `policies.ts` re-export module, which the same two kinds of files
// (queries.ts "use server" + actions.ts "use server") both import from.
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { message } from "@/platform/db/schema";
import { boardItem } from "@/platform/db/board-schema";

/** The two record kinds a WhatsApp thread can be linked to (message.relatedEntityType). */
export type ChatEntityType = "lead" | "customer";

export type LeadReplyContext = {
  toJid: string;
  brandLine: string;
  /**
   * The inbound thread's own identity, so an app-sent reply can be stamped in
   * the OBSERVER's convention and land in the same board bucket:
   * queryWaiting keys a conversation by (to = line slug, coalesce(from_pn, from)
   * = contact). A reply row must therefore carry `to: brandLine`,
   * `from: contactFrom`, `fromPn: contactPn` — NOT `to: <contact jid>` — or the
   * «Ждут ответа» card never clears and answeredToday never counts it.
   */
  contactFrom: string;
  contactPn: string | null;
};

/**
 * Pure decision core: where a reply must be sent, given the newest inbound
 * message's `from` (thread key) and `from_pn` (the real number Baileys
 * captured behind an @lid/@g.us privacy jid — key.senderPn/participantPn).
 *
 * The iron rule (owner 2026-07-24): a reply goes 1-to-1 to the PERSON, never
 * to a group. Demand often arrives in a WhatsApp GROUP, whose `from` is the
 * group jid (`…@g.us`) — replying there would blast the whole group. WRONG.
 *  - `from_pn` present → target `<from_pn>@s.whatsapp.net` (the real person).
 *  - no `from_pn`, `from` is already a 1:1 jid → reply to `from` as-is.
 *  - no `from_pn`, `from` is a group jid → return null so the caller DISABLES
 *    the composer («Номер не определён — открой в WhatsApp»); we refuse to
 *    fall back to a group jid.
 *
 * Extracted (not inlined in resolveReplyContext) so the group-jid rejection is
 * unit-testable without a live tx — mirrors resolveStitch's pure core.
 */
export function resolveReplyToJid(from: string | null, fromPn: string | null): string | null {
  if (fromPn) return `${fromPn}@s.whatsapp.net`;
  if (from && !from.endsWith("@g.us")) return from;
  return null;
}

/**
 * Resolve where a reply to this lead/customer's WhatsApp thread should go:
 *  - `toJid`: the `from` of the newest INBOUND whatsapp message linked to
 *    this record (relatedEntityType=entityType, relatedEntityId=entityId).
 *  - `brandLine`: the WA "line" slug (waobs session, e.g. "azat-takeauto")
 *    that JID came in on. The `message` table has no per-row line column —
 *    the only place that's recorded today is `board_item.source_line`,
 *    keyed by `board_item.customer_ref` (see board-schema.ts + board/actions.ts).
 *    We look up the most recently updated board_item for this JID.
 *
 * Returns null when either half is unknown (no linked inbound message yet,
 * or no board_item ever recorded for that JID) — callers must treat that as
 * "composer disabled, no known WhatsApp line for this record".
 *
 * Must be called with a `tx` already inside withDrizzleTenant(tenantId, ...)
 * so RLS scoping is in effect; `tenantId` is also passed explicitly and
 * filtered on directly (board_item has no RLS policy defined — see
 * drizzle/autonomous/0003_board_item.sql / 0005_board_ownership.sql — so we
 * don't rely on RLS alone for tenant isolation here).
 *
 * `entityType`/`entityId` generalize what was originally a lead-only
 * (leadId) signature so the same resolver serves both the lead chat
 * (chat-actions.ts#queueLeadReply / getLeadReplyContext) and the customer
 * chat (queueCustomerReply / getCustomerReplyContext) — the lookup logic
 * itself doesn't care which entity kind it's resolving for.
 */
export async function resolveReplyContext(
  tx: typeof db,
  tenantId: string,
  entityType: ChatEntityType,
  entityId: string
): Promise<LeadReplyContext | null> {
  const [latestInbound] = await tx
    .select({ from: message.from, fromPn: message.fromPn, line: message.to })
    .from(message)
    .where(
      and(
        eq(message.tenantId, tenantId),
        eq(message.relatedEntityType, entityType),
        eq(message.relatedEntityId, entityId),
        eq(message.direction, "inbound"),
        eq(message.channel, "whatsapp")
      )
    )
    // Prefer a row that resolved the real phone (from_pn IS NOT NULL); among
    // those the newest. Falls through to the newest inbound overall when the
    // thread never captured a from_pn — its `from` then decides DM-vs-group.
    .orderBy(sql`(${message.fromPn} IS NOT NULL) DESC`, desc(message.createdAt))
    .limit(1);

  // The reply target: 1:1 to the person, never a group (see resolveReplyToJid).
  const toJid = resolveReplyToJid(latestInbound?.from ?? null, latestInbound?.fromPn ?? null);
  if (!toJid) return null;

  // Which line to answer FROM. The message's own `to` column is the line slug
  // the observer received on, stamped for every imported row — measured on
  // production it covers 100% of inbound WhatsApp (22,930 of 22,930).
  //
  // This used to read board_item.source_line alone, which silently disabled
  // the composer for most conversations: only 1,033 board rows exist against
  // ~23k inbound messages, and only 513 of those carry a line at all, because
  // classify-inbox's INSERT does not populate source_line — a later heartbeat
  // fills it in if it happens to run. So a thread the classifier had not
  // touched could be read but never answered, with no explanation on screen.
  //
  // board_item stays as the fallback for rows whose `to` was never stamped.
  // Its customer_ref is keyed by the raw thread `from` (classify-inbox writes
  // m."from" AS customer_ref), NOT by the resolved from_pn send jid, so it is
  // still keyed by the conversation `from`.
  let brandLine = latestInbound?.line ?? null;

  if (!brandLine) {
    const convRef = latestInbound?.from ?? toJid;
    const [board] = await tx
      .select({ sourceLine: boardItem.sourceLine })
      .from(boardItem)
      .where(and(eq(boardItem.tenantId, tenantId), eq(boardItem.customerRef, convRef)))
      .orderBy(desc(boardItem.updatedAt))
      .limit(1);
    brandLine = board?.sourceLine ?? null;
  }

  if (!brandLine) return null;

  // contactFrom/contactPn mirror the inbound row's own identity so the reply
  // groups under the same (line, contact) key queryWaiting uses. latestInbound
  // is guaranteed defined here — toJid was derived from it above.
  return {
    toJid,
    brandLine,
    contactFrom: latestInbound?.from ?? toJid,
    contactPn: latestInbound?.fromPn ?? null,
  };
}
