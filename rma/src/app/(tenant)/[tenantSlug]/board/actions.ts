"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/platform/auth";
import { canManageMessagingForTenant } from "@/platform/auth/authorization";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { boardItem } from "@/platform/db/board-schema";
import { enqueueOutbox } from "@/platform/outbox";
import { waOutbox } from "@/platform/outbox/schema";
import { createHash } from "crypto";
import { eq, sql } from "drizzle-orm";

/** Identity persisted into assigned_to when a human actions a card. */
async function requireActor(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");
  return session?.user?.email ?? userId;
}

/**
 * True only for individual WhatsApp JIDs (…@s.whatsapp.net).
 * Group JIDs end with @g.us and are excluded here — a belt-and-suspenders guard
 * that mirrors the one in the bridge.js drain loop. Instagram handles / bare
 * phone numbers / other channels also fall through as ineligible.
 */
function isIndividualWhatsAppJid(jid: string | null | undefined): jid is string {
  if (!jid) return false;
  if (jid.endsWith("@g.us")) return false;
  return jid.endsWith("@s.whatsapp.net");
}

// Lines currently running a live wa-observer process.
// Set WA_ACTIVE_LINES=azat-takeauto,babek-rent (comma-separated) to activate.
// When non-empty, cards from lines NOT in this list go to wa_outbox as
// 'skipped_no_observer' so they are visible in audits but the drain loop
// will never block waiting for delivery that will never arrive.
const ACTIVE_LINES = new Set(
  (process.env.WA_ACTIVE_LINES ?? "").split(",").map((s) => s.trim()).filter(Boolean)
);

export async function approveItem(
  tenantId: string,
  id: string,
): Promise<{ suggestedDraft: string | null }> {
  await canManageMessagingForTenant(tenantId);
  const actor = await requireActor();

  const [updated] = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(boardItem)
      .set({
        status: "approved",
        // A human handled it: the breach state (open + awaiting + overdue) clears.
        awaitingReply: false,
        // Keep the routed owner if there is one; otherwise the actor takes ownership.
        assignedTo: sql`coalesce(${boardItem.assignedTo}, ${actor})`,
        assignedAt: sql`coalesce(${boardItem.assignedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(boardItem.id, id))
      .returning({
        suggestedDraft: boardItem.suggestedDraft,
        sourceLine:     boardItem.sourceLine,
        customerRef:    boardItem.customerRef,
      });

    const row = rows[0];

    // Queue for WhatsApp delivery only when we have all of:
    //   - a non-empty suggested draft
    //   - a known WhatsApp line (source_line) to route the send
    //   - an individual WhatsApp JID as the customer ref (not group, not Instagram)
    // Otherwise this is a no-op and approve behaves exactly as before (fallback).
    if (
      row?.suggestedDraft &&
      row.sourceLine &&
      isIndividualWhatsAppJid(row.customerRef)
    ) {
      if (ACTIVE_LINES.size > 0 && !ACTIVE_LINES.has(row.sourceLine)) {
        // Observer for this line is not in WA_ACTIVE_LINES — insert as skipped_no_observer
        // so the row is visible in audits but the drain loop won't block on it.
        await tx
          .insert(waOutbox)
          .values({
            tenantId,
            boardItemId: id,
            toJid:       row.customerRef,
            brandLine:   row.sourceLine,
            body:        row.suggestedDraft,
            approvedBy:  actor,
            contentHash: createHash("md5").update(row.suggestedDraft).digest("hex"),
            status:      "skipped_no_observer",
          })
          .onConflictDoNothing();
      } else {
        await enqueueOutbox(tx, {
          tenantId,
          boardItemId: id,
          toJid:       row.customerRef,
          brandLine:   row.sourceLine,
          body:        row.suggestedDraft,
          approvedBy:  actor,
        });
      }
    }

    return rows;
  });

  revalidatePath("/board");
  return { suggestedDraft: updated?.suggestedDraft ?? null };
}

export async function dismissItem(tenantId: string, id: string): Promise<void> {
  await canManageMessagingForTenant(tenantId);
  const actor = await requireActor();

  await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .update(boardItem)
      .set({
        status: "dismissed",
        awaitingReply: false,
        assignedTo: sql`coalesce(${boardItem.assignedTo}, ${actor})`,
        assignedAt: sql`coalesce(${boardItem.assignedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(boardItem.id, id)),
  );

  revalidatePath("/board");
}

/**
 * Explicitly assign a card. `assignee` may be a BRAND_OWNERS key; when omitted
 * the current user claims the card ("Assign to me").
 */
export async function assignItem(
  tenantId: string,
  id: string,
  assignee?: string,
): Promise<{ assignedTo: string }> {
  await canManageMessagingForTenant(tenantId);
  const actor = await requireActor();
  const target = assignee?.trim() || actor;

  await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .update(boardItem)
      .set({
        assignedTo: target,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(boardItem.id, id)),
  );

  revalidatePath("/board");
  return { assignedTo: target };
}

export async function updateDraft(
  tenantId: string,
  id: string,
  draft: string,
): Promise<void> {
  await canManageMessagingForTenant(tenantId);
  await requireActor();

  await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .update(boardItem)
      .set({ suggestedDraft: draft, updatedAt: new Date() })
      .where(eq(boardItem.id, id)),
  );

  revalidatePath("/board");
}
