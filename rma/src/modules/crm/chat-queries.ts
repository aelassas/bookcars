"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { message, lead } from "@/platform/db/schema";
import { waOutbox, type WaOutboxStatus } from "@/platform/outbox/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { isBrandSendEnabled } from "@/platform/outbox/send-status";
import { normalizePhone, MIN_PHONE_MATCH_DIGITS, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import { canManageCRMForTenant } from "./policies";
import { canReadCRMForTenant } from "@/platform/auth/authorization";
import { resolveReplyContext, resolveReplyToJid, type ChatEntityType } from "./chat-shared";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LeadThreadOutboxLink = {
  status: WaOutboxStatus;
  flagged: boolean;
  sentAt: string | null;
  error: string | null;
};

export type LeadThreadMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  from: string | null;
  to: string | null;
  createdAt: string;
  status: string;
  /**
   * Honest outbound delivery status, joined from wa_outbox. See
   * reply-actions.ts for how `message.externalMessageId` is stamped with the
   * wa_outbox row's id at enqueue time — a best-effort correlation reusing an
   * existing free-text column (NOT a real foreign key). Null for inbound
   * messages, and for any outbound row that predates this feature / has no
   * matching wa_outbox row.
   */
  outbox: LeadThreadOutboxLink | null;
};

/**
 * Shared implementation behind getLeadThread / getCustomerThread — the
 * thread lookup + wa_outbox status join doesn't care which entity kind it's
 * reading for, only relatedEntityType/relatedEntityId. Not exported: a
 * "use server" file's exports must all be RPC-callable server actions, and
 * this one takes a live `tx`, which isn't serializable — same reasoning as
 * resolveReplyContext living in chat-shared.ts (a plain module, no "use
 * server"). Kept here instead since it's only needed by the two exported
 * wrappers directly below.
 */
/** A message row in thread order, before the wa_outbox delivery-status join.
 *  `createdAt` may arrive as a Date (drizzle select) or a string/Date from a
 *  raw execute — attachOutbox normalises it. */
type RawThreadRow = {
  id: string;
  direction: string;
  body: string;
  from: string | null;
  to: string | null;
  createdAt: Date | string;
  status: string;
  externalMessageId: string | null;
};

/** Join wa_outbox delivery status onto raw thread rows (shared by the
 *  stitch-based and phone-based fetches). */
async function attachOutbox(
  tx: typeof db,
  tenantId: string,
  rows: RawThreadRow[]
): Promise<LeadThreadMessage[]> {
  const outboxIds = Array.from(
    new Set(rows.map((r) => r.externalMessageId).filter((id): id is string => !!id && UUID_RE.test(id)))
  );

  const outboxById = new Map<string, LeadThreadOutboxLink>();
  if (outboxIds.length > 0) {
    const obRows = await tx
      .select({
        id: waOutbox.id,
        status: waOutbox.status,
        flagged: waOutbox.flagged,
        sentAt: waOutbox.sentAt,
        error: waOutbox.error,
      })
      .from(waOutbox)
      .where(and(eq(waOutbox.tenantId, tenantId), inArray(waOutbox.id, outboxIds)));
    for (const o of obRows) {
      outboxById.set(o.id, {
        status: o.status,
        flagged: o.flagged,
        sentAt: o.sentAt ? o.sentAt.toISOString() : null,
        error: o.error ?? null,
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    direction: r.direction as "inbound" | "outbound",
    body: r.body,
    from: r.from,
    to: r.to,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    status: r.status,
    outbox: r.externalMessageId ? (outboxById.get(r.externalMessageId) ?? null) : null,
  }));
}

async function fetchThread(
  tx: typeof db,
  tenantId: string,
  entityType: ChatEntityType,
  entityId: string
): Promise<LeadThreadMessage[]> {
  const rows = await tx
    .select({
      id: message.id,
      direction: message.direction,
      body: message.body,
      from: message.from,
      to: message.to,
      createdAt: message.createdAt,
      status: message.status,
      externalMessageId: message.externalMessageId,
    })
    .from(message)
    .where(
      and(
        eq(message.tenantId, tenantId),
        eq(message.relatedEntityType, entityType),
        eq(message.relatedEntityId, entityId)
      )
    )
    .orderBy(asc(message.createdAt));

  return attachOutbox(tx, tenantId, rows);
}

/**
 * The lead's WhatsApp thread by PHONE — every message to/from this lead's
 * number, plus anything explicitly stitched to the lead id. This is what
 * "open the lead, see its chat" actually means: one person can generate many
 * leads over time (same phone), and the fragile one-phone→one-lead stitch
 * skips those as "ambiguous", leaving cards blank. Matching on the number
 * shows the real conversation on every one of that person's leads — the
 * process flow the owner asked for (lead → client → chat), without depending
 * on the stitch having run.
 *
 * `from` carries the contact for BOTH directions (the brand line is always in
 * `to`), so a single COALESCE(wa_identity.phone, from_pn, from) → last-N-digit
 * match captures the whole two-way thread, resolving @lid senders via
 * wa_identity exactly like backfillLeadLinks does.
 */
async function fetchThreadByPhone(
  tx: typeof db,
  tenantId: string,
  leadId: string,
  suffix: string
): Promise<LeadThreadMessage[]> {
  const res = (await tx.execute(sql`
    SELECT m.id, m.direction, m.body, m."from" AS "from", m."to" AS "to",
           m.created_at AS "createdAt", m.status,
           m.external_message_id AS "externalMessageId"
    FROM message m
    WHERE m.tenant_id = ${tenantId}
      AND m.channel = 'whatsapp'
      AND (
        (m.related_entity_type = 'lead' AND m.related_entity_id = ${leadId})
        OR RIGHT(
             regexp_replace(
               COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"), m.from_pn, m."from", ''),
               ${PG_NON_DIGIT_RE}, '', 'g'
             ),
             ${MIN_PHONE_MATCH_DIGITS}
           ) = ${suffix}
      )
    ORDER BY m.created_at ASC
  `)) as unknown as { rows: RawThreadRow[] };

  return attachOutbox(tx, tenantId, res.rows);
}

/**
 * The lead's WhatsApp thread, oldest -> newest (bubbles render top to
 * bottom). Only messages ALREADY linked to this lead
 * (relatedEntityType='lead', relatedEntityId=leadId) — linking itself
 * happens via linkLeadByPhone / backfillLeadLinks / backfillChatLinks
 * (chat-actions.ts), never implicitly here.
 */
export async function getLeadThread(tenantId: string, leadId: string): Promise<LeadThreadMessage[]> {
  // Quiet boundary (owner 2026-07-29): a non-member sees nothing, no error.
  if (!(await canReadCRMForTenant(tenantId))) return [];
  return withDrizzleTenant(tenantId, async (tx) => {
    // Prefer matching by the lead's phone number (whole conversation, robust to
    // one-person-many-leads); fall back to the explicit stitch only when the
    // lead has no usable phone.
    const [l] = await tx
      .select({ phone: lead.phone })
      .from(lead)
      .where(and(eq(lead.tenantId, tenantId), eq(lead.id, leadId)))
      .limit(1);
    const norm = normalizePhone(l?.phone);
    if (norm.length >= MIN_PHONE_MATCH_DIGITS) {
      return fetchThreadByPhone(tx, tenantId, leadId, norm.slice(-MIN_PHONE_MATCH_DIGITS));
    }
    return fetchThread(tx, tenantId, "lead", leadId);
  });
}

/**
 * The customer's WhatsApp thread — exact mirror of getLeadThread, filtering
 * on relatedEntityType='customer' instead. Linking happens via
 * linkCustomerByPhone / backfillChatLinks (chat-actions.ts).
 */
export async function getCustomerThread(tenantId: string, customerId: string): Promise<LeadThreadMessage[]> {
  if (!(await canReadCRMForTenant(tenantId))) return [];
  return withDrizzleTenant(tenantId, (tx) => fetchThread(tx, tenantId, "customer", customerId));
}

export type LeadReplyComposerContext = {
  toJid: string;
  brandLine: string;
  /** Would wa-observer/bridge.js actually drain-send this right now? See
   * platform/outbox/send-status.ts — mirrors WA_SEND_ENABLED[_<BRAND>]. */
  sendEnabled: boolean;
} | null;

/**
 * Where a reply to this lead would go, plus whether sending is actually live
 * for that brand line right now — drives the composer's enabled/disabled
 * state and its honest status copy. Null means "no known WhatsApp line for
 * this lead yet" (composer must be disabled — see chat-shared.ts).
 */
export async function getLeadReplyContext(tenantId: string, leadId: string): Promise<LeadReplyComposerContext | null> {
  if (!(await canReadCRMForTenant(tenantId))) return null;
  return withDrizzleTenant(tenantId, async (tx) => {
    const ctx = await resolveReplyContext(tx, tenantId, "lead", leadId);
    if (ctx) return { ...ctx, sendEnabled: isBrandSendEnabled(ctx.brandLine) };

    // Fallback for phone-matched threads that were never stitched (see
    // fetchThreadByPhone): derive the reply target from the newest inbound
    // WhatsApp message on this lead's NUMBER, so the composer works wherever
    // the conversation is visible — same 1:1-not-group rule via resolveReplyToJid.
    const [l] = await tx
      .select({ phone: lead.phone })
      .from(lead)
      .where(and(eq(lead.tenantId, tenantId), eq(lead.id, leadId)))
      .limit(1);
    const norm = normalizePhone(l?.phone);
    if (norm.length < MIN_PHONE_MATCH_DIGITS) return null;
    const suffix = norm.slice(-MIN_PHONE_MATCH_DIGITS);

    const res = (await tx.execute(sql`
      SELECT m."from" AS "from", m.from_pn AS "fromPn", m."to" AS line
      FROM message m
      WHERE m.tenant_id = ${tenantId}
        AND m.channel = 'whatsapp'
        AND m.direction = 'inbound'
        AND RIGHT(
              regexp_replace(
                COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"), m.from_pn, m."from", ''),
                ${PG_NON_DIGIT_RE}, '', 'g'
              ),
              ${MIN_PHONE_MATCH_DIGITS}
            ) = ${suffix}
      ORDER BY (m.from_pn IS NOT NULL) DESC, m.created_at DESC
      LIMIT 1
    `)) as unknown as { rows: { from: string | null; fromPn: string | null; line: string | null }[] };

    const row = res.rows[0];
    if (!row) return null;
    const toJid = resolveReplyToJid(row.from, row.fromPn);
    if (!toJid || !row.line) return null;
    return {
      toJid,
      brandLine: row.line,
      contactFrom: row.from ?? toJid,
      contactPn: row.fromPn ?? null,
      sendEnabled: isBrandSendEnabled(row.line),
    };
  });
}

/**
 * Where a reply to this customer would go — exact mirror of
 * getLeadReplyContext, resolving against relatedEntityType='customer'.
 */
export async function getCustomerReplyContext(
  tenantId: string,
  customerId: string
): Promise<LeadReplyComposerContext> {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const ctx = await resolveReplyContext(tx, tenantId, "customer", customerId);
    if (!ctx) return null;
    return { ...ctx, sendEnabled: isBrandSendEnabled(ctx.brandLine) };
  });
}
