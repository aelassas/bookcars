"use server";

import { and, eq, desc } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { waOutbox } from "@/platform/outbox/schema";
import { auditEvent } from "@/platform/db/schema";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";

// Stop-word review queue (send-safety.ts). Messages flagged for sensitive
// financial language are HELD by the observer drain until a SENIOR releases
// them here. Gated to tenant_admin — releasing a flagged "here are the bank
// details / we'll refund you" message is a senior decision, logged in the audit.

export interface FlaggedOutboxRow {
  id: string;
  toJid: string;
  brandLine: string;
  body: string;
  flaggedWords: string | null;
  createdAt: Date;
}

/** List still-held (flagged, unsent) outbound messages for the tenant. */
export async function listFlaggedOutbox(slug: string): Promise<FlaggedOutboxRow[]> {
  const t = await requireTenantAdmin(slug);
  return withDrizzleTenant(t.id, async (tx) =>
    tx
      .select({
        id: waOutbox.id,
        toJid: waOutbox.toJid,
        brandLine: waOutbox.brandLine,
        body: waOutbox.body,
        flaggedWords: waOutbox.flaggedWords,
        createdAt: waOutbox.createdAt,
      })
      .from(waOutbox)
      .where(and(eq(waOutbox.flagged, true), eq(waOutbox.status, "pending")))
      .orderBy(desc(waOutbox.createdAt)),
  );
}

/**
 * Release a flagged message so the drain may send it (subject to the usual
 * WA_SEND_ENABLED kill-switch). Senior-only; writes an audit_event naming who
 * approved the sensitive content.
 */
export async function clearOutboxFlag(slug: string, outboxId: string): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  if (!outboxId) return;

  await withDrizzleTenant(t.id, async (tx) => {
    const [row] = await tx
      .select({ id: waOutbox.id, flaggedWords: waOutbox.flaggedWords, toJid: waOutbox.toJid })
      .from(waOutbox)
      .where(and(eq(waOutbox.id, outboxId), eq(waOutbox.flagged, true)))
      .limit(1);
    if (!row) return;

    await tx
      .update(waOutbox)
      .set({ flagged: false, flaggedClearedBy: actorId, flaggedClearedAt: new Date() })
      .where(eq(waOutbox.id, outboxId));

    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "outbox_flag_cleared",
      entityType: "wa_outbox",
      entityId: outboxId,
      intent: `Senior released a stop-word-flagged message to ${row.toJid} [${row.flaggedWords ?? ""}]`,
    });
  });
}
