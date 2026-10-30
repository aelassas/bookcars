"use server";

import { createHash } from "crypto";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { message, auditEvent } from "@/platform/db/schema";
import { boardItem } from "@/platform/db/board-schema";
import { enqueueOutbox } from "@/platform/outbox";
import { resolveMediaToken, type MediaKind } from "@/platform/outbox/media-store";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireAuth } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageMessagingForTenant } from "./policies";

/**
 * Shape a stable UUID from a JID so a thread without a linked customer still
 * has a deterministic (dedupe-friendly) wa_outbox.board_item_id — that column
 * is `uuid NOT NULL` with no FK, so any well-formed UUID is valid as the
 * placeholder the existing reply paths already use (see crm/reply-actions.ts).
 */
function jidToUuid(jid: string): string {
  const h = createHash("md5").update(jid).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * Queue an outbound WhatsApp reply to a conversation thread, keyed by the
 * sender JID rather than a lead/customer record.
 *
 * Unlike crm/reply-actions.ts (which REQUIRES a board_item.source_line for the
 * exact JID and otherwise refuses to send), this resolves the WhatsApp line
 * with a fallback so a reply works inside a thread that never had its own
 * board card:
 *   1. the board_item.source_line for this JID, if one exists; else
 *   2. the tenant's most-recently-used board_item.source_line (a real line the
 *      tenant already sends from); else
 *   3. refuse — the tenant genuinely has no WhatsApp line configured.
 *
 * Outbound path is wa_outbox via enqueueOutbox (drained by wa-observer when
 * WA_SEND_ENABLED=true) — never the mock provider / Baileys directly.
 */
/**
 * The client passes only the OPAQUE token returned by /api/wa/attachment —
 * never a filesystem path. The server resolves it to a real path (inside the
 * media dir, type re-derived from disk) via resolveMediaToken, so a forged
 * token cannot make the sender read an arbitrary file.
 */
export type OutboundMediaRef = { token: string };

/** Marker parseChatBody understands, so a media-only reply renders as a chip. */
function mediaMarker(kind: MediaKind): string {
  return kind === "audio" ? "[audio]" : `[${kind}]`;
}

export async function queueThreadReply(
  slug: string,
  jid: string,
  body: string,
  mediaRef?: OutboundMediaRef,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed && !mediaRef) throw new Error("Message cannot be empty");
  if (!jid) throw new Error("Missing conversation");

  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageMessagingForTenant(t.id);
  const actorId = await requireAuth();

  // Resolve + validate the attachment token AFTER authz, BEFORE any DB work.
  // Throws on a bad/forged token (path traversal, missing file); type comes
  // from disk, never from the client.
  const media = mediaRef ? await resolveMediaToken(mediaRef.token) : undefined;
  // The message-row body shows the caption, or a media chip when caption-less.
  const displayBody = trimmed || mediaMarker(media!.kind);

  await withDrizzleTenant(t.id, async (tx) => {
    // Resolve the WhatsApp line for this JID, then fall back to the tenant's
    // most recent line so a board_item is not required for the reply.
    const [jidBoard] = await tx
      .select({ sourceLine: boardItem.sourceLine })
      .from(boardItem)
      .where(and(eq(boardItem.tenantId, t.id), eq(boardItem.customerRef, jid)))
      .orderBy(desc(boardItem.updatedAt))
      .limit(1);

    // PRIMARY source: the line the conversation actually came in on lives on
    // the message row's `to` (populated for 100% of inbound), NOT
    // board_item.source_line — which is EMPTY for cardiwan/easyrent, so chat
    // send threw "no line configured" for Babek's whole desk. Resolve from the
    // message first, board_item only as fallback.
    const [msgLine] = await tx
      .select({ line: message.to })
      .from(message)
      .where(and(eq(message.from, jid), isNotNull(message.to)))
      .orderBy(desc(message.createdAt))
      .limit(1);
    let brandLine = msgLine?.line ?? jidBoard?.sourceLine ?? null;
    if (!brandLine) {
      const [anyBoard] = await tx
        .select({ sourceLine: boardItem.sourceLine })
        .from(boardItem)
        .where(eq(boardItem.tenantId, t.id))
        .orderBy(desc(boardItem.updatedAt))
        .limit(1);
      brandLine = anyBoard?.sourceLine ?? null;
    }
    if (!brandLine) {
      throw new Error(
        "No WhatsApp line is configured for this workspace yet — connect the WhatsApp observer before replying."
      );
    }

    // Link the outbound row to a customer when this JID resolves to one, so it
    // also shows on the customer's chat pane; otherwise leave it thread-only.
    const [linkedMsg] = await tx
      .select({ customerId: message.customerId })
      .from(message)
      .where(and(eq(message.from, jid), sql`${message.customerId} IS NOT NULL`))
      .orderBy(desc(message.createdAt))
      .limit(1);
    const linkedCustomerId = linkedMsg?.customerId ?? null;
    const boardItemId = linkedCustomerId ?? jidToUuid(jid);

    // The contact's resolved phone (from_pn) on the newest inbound of this
    // thread, so the outbound row groups under the SAME (line, contact) key
    // queryWaiting uses: coalesce(from_pn, from). Without it the reply keys on
    // the raw @lid `from` while the inbound keyed on the phone → two buckets,
    // and the «Ждут ответа» card never clears.
    const [pnRow] = await tx
      .select({ fromPn: message.fromPn })
      .from(message)
      .where(
        and(
          eq(message.from, jid),
          eq(message.direction, "inbound"),
          sql`${message.fromPn} IS NOT NULL`,
        ),
      )
      .orderBy(desc(message.createdAt))
      .limit(1);
    const contactPn = pnRow?.fromPn ?? null;

    await tx.insert(message).values({
      tenantId: t.id,
      channel: "whatsapp",
      direction: "outbound",
      // Observer convention: to = line slug, coalesce(from_pn, from) = contact.
      to: brandLine,
      from: jid,
      fromPn: contactPn,
      body: displayBody,
      status: "queued",
      relatedEntityType: linkedCustomerId ? "customer" : null,
      relatedEntityId: linkedCustomerId,
      assignedTo: actorId,
    });

    await enqueueOutbox(tx, {
      tenantId: t.id,
      boardItemId,
      toJid: jid,
      brandLine,
      body: trimmed, // caption only — the observer sends the file with this text
      approvedBy: actorId,
      media,
    });

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "message.thread_reply_queued",
      entityType: linkedCustomerId ? "customer" : "message",
      entityId: boardItemId,
      intent: `Queued WhatsApp reply to ${jid}`,
    });
  });

  revalidatePath(`/${slug}/messages/${encodeURIComponent(jid)}`);
}
