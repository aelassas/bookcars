"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { lead, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";
import { revalidatePath } from "next/cache";
import { assignLeadOwnersRoundRobin } from "./lead-routing";

/**
 * HOT LANE backfill — admin action for the ~3.8k pre-existing ownerless
 * leads (status='new' AND assigned_to IS NULL) that predate auto-routing.
 * Fairly round-robins them across the sales pool: the pool + current load is
 * fetched ONCE (see assignLeadOwnersRoundRobin), picks are made in memory,
 * then the writes are grouped by owner so it's one UPDATE per sales rep (a
 * handful), not one per lead (thousands) — no N+1 lookups either way.
 *
 * Telegram notifications are intentionally SKIPPED here — this can touch
 * thousands of rows in a single call, and bursting every sales rep's phone
 * with a backfill flood is not useful (the live paths — createLead and the
 * Bitrix sync — already notify going forward for newly-created leads).
 */
export async function autoAssignOwnerlessLeads(slug: string): Promise<{ assigned: number }> {
  const t = await requireTenantAdmin(slug);
  await assertNotPreviewMode(t.id);
  const actorId = await requireAuth();

  const assigned = await withDrizzleTenant(t.id, async (tx) => {
    const targets = await tx
      .select({ id: lead.id })
      .from(lead)
      .where(and(eq(lead.status, "new"), isNull(lead.assignedTo)));
    if (targets.length === 0) return 0;

    const owners = await assignLeadOwnersRoundRobin(tx, t.id, targets.length);

    // Group by picked owner so the update is one query PER OWNER (a
    // handful), not one per lead (thousands) — the round-robin pick itself
    // already happened in memory above.
    const byOwner = new Map<string, string[]>();
    for (let i = 0; i < targets.length; i++) {
      const ownerId = owners[i];
      if (!ownerId) continue; // no sales pool configured — leave unassigned
      const ids = byOwner.get(ownerId) ?? [];
      ids.push(targets[i].id);
      byOwner.set(ownerId, ids);
    }

    let n = 0;
    for (const [ownerId, ids] of byOwner) {
      await tx.update(lead).set({ assignedTo: ownerId, updatedAt: new Date() }).where(inArray(lead.id, ids));
      n += ids.length;
    }

    if (n > 0) {
      await tx.insert(auditEvent).values({
        tenantId: t.id,
        actorId,
        action: "lead.autoAssignBackfill",
        entityType: "lead",
        entityId: t.id, // batch-level event — no single lead applies
        intent: `Hot-lane backfill: auto-assigned ${n} ownerless lead(s) across the sales pool`,
      });
    }

    return n;
  });

  revalidatePath(`/${slug}/crm`);
  return { assigned };
}
