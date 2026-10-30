"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  supportTicket,
  supportTicketReply,
  supportAccessGrant,
  platformAdmin,
  auditEvent,
} from "@/platform/db/schema";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";
import { impersonationAuditFields } from "@/platform/auth/support-session";

// SPEC §6.3 + §3.5 — tenant-side support: tickets + consent-based access grants.

const PRIORITIES = ["low", "normal", "high", "urgent"];
const MAX_GRANT_HOURS = 24;

export async function openTicket(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const priority = String(formData.get("priority") ?? "normal");
  if (!subject || !body) throw new Error("Subject and body are required");
  const imp = await impersonationAuditFields(t.id);

  await withDrizzleTenant(t.id, async (tx) => {
    const ins = await tx
      .insert(supportTicket)
      .values({
        tenantId: t.id,
        openedBy: actorId,
        subject,
        body,
        priority: PRIORITIES.includes(priority) ? priority : "normal",
      })
      .returning();
    const ticket = Array.isArray(ins) ? ins[0] : ins;
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "support_ticket_opened",
      entityType: "support_ticket",
      entityId: ticket.id,
      intent: subject,
      ...imp,
    });
  });
  revalidatePath(`/${slug}/settings/support`);
}

export async function replyTicket(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const ticketId = String(formData.get("ticketId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!ticketId || !body) throw new Error("Reply body required");

  await withDrizzleTenant(t.id, async (tx) => {
    await tx.insert(supportTicketReply).values({
      tenantId: t.id,
      ticketId,
      authorId: actorId,
      authorKind: "tenant_member",
      body,
    });
  });
  revalidatePath(`/${slug}/settings/support`);
  revalidatePath(`/${slug}/settings/support/${ticketId}`);
}

export async function grantSupportAccess(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const scope = String(formData.get("scope") ?? "read") === "write" ? "write" : "read";
  const reason = String(formData.get("reason") ?? "").trim();
  const hours = Math.min(MAX_GRANT_HOURS, Math.max(1, parseInt(String(formData.get("hours") ?? "4"), 10) || 4));
  if (!reason) throw new Error("A reason is required to grant support access");

  // Who the grant is for. This used to be hardcoded to the earliest platform
  // admin, so with more than one engineer on the platform the others could
  // never be granted access — the tenant's click was silently ineffective for
  // them. Now the tenant either picks one engineer or grants the whole support
  // team; "all" issues an independent, separately-revocable grant per admin so
  // whoever is available can respond.
  const target = String(formData.get("grantTo") ?? "all").trim() || "all";
  const admins = await db
    .select({ userId: platformAdmin.userId })
    .from(platformAdmin)
    .orderBy(asc(platformAdmin.promotedAt));
  if (admins.length === 0) throw new Error("No platform admin exists to grant access to");

  const recipients =
    target === "all" ? admins : admins.filter((a) => a.userId === target);
  if (recipients.length === 0) throw new Error("That support engineer no longer exists");

  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

  await withDrizzleTenant(t.id, async (tx) => {
    for (const admin of recipients) {
      const ins = await tx
        .insert(supportAccessGrant)
        .values({
          tenantId: t.id,
          grantedBy: actorId,
          grantedTo: admin.userId,
          reason,
          scope,
          expiresAt,
        })
        .returning();
      const grant = Array.isArray(ins) ? ins[0] : ins;
      await tx.insert(auditEvent).values({
        tenantId: t.id,
        actorId,
        action: "support_access_granted",
        entityType: "support_access_grant",
        entityId: grant.id,
        intent: `scope=${scope} hours=${hours} reason="${reason}"`,
      });
    }
  });
  revalidatePath(`/${slug}/settings/support`);
}

export async function revokeSupportAccess(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const grantId = String(formData.get("grantId") ?? "");
  if (!grantId) throw new Error("grantId required");

  await withDrizzleTenant(t.id, async (tx) => {
    const [g] = await tx
      .select()
      .from(supportAccessGrant)
      .where(
        and(
          eq(supportAccessGrant.id, grantId),
          eq(supportAccessGrant.tenantId, t.id),
          isNull(supportAccessGrant.revokedAt)
        )
      )
      .limit(1);
    if (!g) throw new Error("Grant not found or already revoked");
    await tx
      .update(supportAccessGrant)
      .set({ revokedAt: new Date() })
      .where(eq(supportAccessGrant.id, grantId));
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "support_access_revoked",
      entityType: "support_access_grant",
      entityId: grantId,
      intent: "Tenant revoked support access",
    });
  });
  revalidatePath(`/${slug}/settings/support`);
}
