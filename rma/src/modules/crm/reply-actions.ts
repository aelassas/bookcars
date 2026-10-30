"use server";

import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lead, customer, message, auditEvent } from "@/platform/db/schema";
import { waOutbox } from "@/platform/outbox/schema";
import { enqueueOutbox } from "@/platform/outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireAuth } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageCRMForTenant } from "./policies";
import { resolveReplyContext } from "./chat-shared";

/**
 * Queue an outbound WhatsApp reply for a lead.
 *
 * The ONLY outbound path in this app is wa_outbox, drained by
 * wa-observer/bridge.js when WA_SEND_ENABLED=true — this function NEVER
 * calls a sender / the mock provider / Baileys directly. Two writes happen
 * inside one withDrizzleTenant transaction:
 *   1. an outbound `message` row (status='queued') so the thread shows the
 *      reply immediately without waiting on the drain loop or a realtime
 *      channel (SSE/live updates are a later increment — this page's
 *      composer just re-fetches after sending).
 *   2. enqueueOutbox(tx, ...) — applies the stop-word guardrail
 *      (send-safety.ts screenOutbound) and requires approvedBy. Never
 *      bypassed, never reimplemented here.
 */
export async function queueLeadReply(slug: string, leadId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageCRMForTenant(t.id);
  const actorId = await requireAuth();

  await withDrizzleTenant(t.id, async (tx) => {
    const [leadRow] = await tx.select({ id: lead.id }).from(lead).where(eq(lead.id, leadId)).limit(1);
    if (!leadRow) throw new Error("Lead not found");

    const ctx = await resolveReplyContext(tx, t.id, "lead", leadId);
    if (!ctx) {
      throw new Error(
        "No WhatsApp line linked — link the chat by phone number first."
      );
    }

    const insertedRows = await tx
      .insert(message)
      .values({
        tenantId: t.id,
        channel: "whatsapp",
        direction: "outbound",
        // Observer convention (see resolveReplyContext / my-queries.queryWaiting):
        // to = line slug, coalesce(from_pn, from) = contact. Stamp the reply the
        // same way the inbound arrived so it clears the «Ждут ответа» card and
        // counts in answeredToday. (enqueueOutbox below still targets ctx.toJid —
        // that is the real WhatsApp send address, a different thing.)
        to: ctx.brandLine,
        from: ctx.contactFrom,
        fromPn: ctx.contactPn,
        body: trimmed,
        status: "queued",
        relatedEntityType: "lead",
        relatedEntityId: leadId,
        assignedTo: actorId,
      })
      .returning({ id: message.id });
    const insertedMessage = insertedRows[0];

    // wa_outbox.board_item_id is NOT NULL (drizzle/autonomous/0007_wa_outbox.sql)
    // but carries no FK constraint. This increment doesn't create a real
    // board_item per lead-reply-thread, so the lead's own id is reused as a
    // stable placeholder board_item_id — per the task brief, flagged here
    // rather than adding a schema migration for it.
    await enqueueOutbox(tx, {
      tenantId: t.id,
      boardItemId: leadId,
      toJid: ctx.toJid,
      brandLine: ctx.brandLine,
      body: trimmed,
      approvedBy: actorId,
    });

    // Best-effort correlate the message row -> its wa_outbox row so the UI
    // can show an honest per-bubble delivery status (see
    // chat-queries.ts#getLeadThread) without a schema change. Reuses
    // `externalMessageId` — an existing free-text column normally holding a
    // provider message id, which a composer-created row doesn't have one of
    // yet. Matched via the same (boardItemId, contentHash) pair enqueueOutbox
    // just computed internally; if enqueueOutbox no-opped (identical body
    // already pending for this lead — onConflictDoNothing), this correctly
    // finds that EXISTING pending row instead of missing the link.
    if (insertedMessage) {
      const contentHash = createHash("md5").update(trimmed).digest("hex");
      const [outboxRow] = await tx
        .select({ id: waOutbox.id })
        .from(waOutbox)
        .where(
          and(
            eq(waOutbox.tenantId, t.id),
            eq(waOutbox.boardItemId, leadId),
            eq(waOutbox.contentHash, contentHash)
          )
        )
        .orderBy(desc(waOutbox.createdAt))
        .limit(1);
      if (outboxRow) {
        await tx
          .update(message)
          .set({ externalMessageId: outboxRow.id })
          .where(eq(message.id, insertedMessage.id));
      }
    }

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "lead.chat_reply_queued",
      entityType: "lead",
      entityId: leadId,
      intent: `Queued WhatsApp reply to ${ctx.toJid}`,
    });
  });

  revalidatePath(`/${slug}/crm/leads/${leadId}`);
}

/**
 * Queue an outbound WhatsApp reply for a customer. Exact mirror of
 * queueLeadReply above, targeting `customer` instead of `lead` — same single
 * outbound path (wa_outbox via enqueueOutbox, drained by
 * wa-observer/bridge.js when WA_SEND_ENABLED=true), same stop-word
 * guardrail, same message+outbox correlation via (board_item_id,
 * content_hash), never Baileys/mock directly.
 */
export async function queueCustomerReply(slug: string, customerId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message cannot be empty");

  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageCRMForTenant(t.id);
  const actorId = await requireAuth();

  await withDrizzleTenant(t.id, async (tx) => {
    const [customerRow] = await tx
      .select({ id: customer.id })
      .from(customer)
      .where(eq(customer.id, customerId))
      .limit(1);
    if (!customerRow) throw new Error("Customer not found");

    const ctx = await resolveReplyContext(tx, t.id, "customer", customerId);
    if (!ctx) {
      throw new Error(
        "No WhatsApp line linked — link the chat by phone number first."
      );
    }

    const insertedRows = await tx
      .insert(message)
      .values({
        tenantId: t.id,
        channel: "whatsapp",
        direction: "outbound",
        // Observer convention (see resolveReplyContext / my-queries.queryWaiting):
        // to = line slug, coalesce(from_pn, from) = contact. Stamp the reply the
        // same way the inbound arrived so it clears the «Ждут ответа» card and
        // counts in answeredToday. (enqueueOutbox below still targets ctx.toJid —
        // that is the real WhatsApp send address, a different thing.)
        to: ctx.brandLine,
        from: ctx.contactFrom,
        fromPn: ctx.contactPn,
        body: trimmed,
        status: "queued",
        relatedEntityType: "customer",
        relatedEntityId: customerId,
        assignedTo: actorId,
      })
      .returning({ id: message.id });
    const insertedMessage = insertedRows[0];

    // wa_outbox.board_item_id is NOT NULL (drizzle/autonomous/0007_wa_outbox.sql)
    // but carries no FK constraint. This increment doesn't create a real
    // board_item per customer-reply-thread, so the customer's own id is
    // reused as a stable placeholder board_item_id — same rationale as
    // queueLeadReply above.
    await enqueueOutbox(tx, {
      tenantId: t.id,
      boardItemId: customerId,
      toJid: ctx.toJid,
      brandLine: ctx.brandLine,
      body: trimmed,
      approvedBy: actorId,
    });

    // Best-effort correlate the message row -> its wa_outbox row, same
    // (boardItemId, contentHash) matching as queueLeadReply — see
    // chat-queries.ts#getCustomerThread for how this is read back.
    if (insertedMessage) {
      const contentHash = createHash("md5").update(trimmed).digest("hex");
      const [outboxRow] = await tx
        .select({ id: waOutbox.id })
        .from(waOutbox)
        .where(
          and(
            eq(waOutbox.tenantId, t.id),
            eq(waOutbox.boardItemId, customerId),
            eq(waOutbox.contentHash, contentHash)
          )
        )
        .orderBy(desc(waOutbox.createdAt))
        .limit(1);
      if (outboxRow) {
        await tx
          .update(message)
          .set({ externalMessageId: outboxRow.id })
          .where(eq(message.id, insertedMessage.id));
      }
    }

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "customer.chat_reply_queued",
      entityType: "customer",
      entityId: customerId,
      intent: `Queued WhatsApp reply to ${ctx.toJid}`,
    });
  });

  revalidatePath(`/${slug}/customers/${customerId}`);
}
