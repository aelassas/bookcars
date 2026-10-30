"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { supportTicket, supportTicketReply, auditEvent } from "@/platform/db/schema";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import {
  setSupportSession,
  clearSupportSession,
  readSupportSessionCookie,
} from "@/platform/auth/support-session";
import { activeGrantForAdmin } from "@/modules/support/queries";

// SPEC §5, §7 — platform-admin support actions.

export async function replyTicketAdmin(
  ticketId: string,
  tenantId: string,
  formData: FormData
): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Reply body required");

  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.insert(supportTicketReply).values({
      tenantId,
      ticketId,
      authorId: adminId,
      authorKind: "platform_admin",
      body,
    });
    await tx.update(supportTicket).set({ status: "in_progress" }).where(eq(supportTicket.id, ticketId));
  });
  revalidatePath(`/admin/support/${ticketId}`);
}

export async function setTicketStatus(
  ticketId: string,
  tenantId: string,
  formData: FormData
): Promise<void> {
  await requirePlatformAdmin();
  const status = String(formData.get("status") ?? "open");
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
    throw new Error("Invalid status");
  }
  await withDrizzleTenant(tenantId, async (tx) => {
    await tx
      .update(supportTicket)
      .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
      .where(eq(supportTicket.id, ticketId));
  });
  revalidatePath(`/admin/support/${ticketId}`);
}

// ─── Impersonation session (SPEC §7) ────────────────────────────────────────

export async function startSupportSession(formData: FormData): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  if (!tenantId || !tenantSlug) throw new Error("tenant required");

  const grant = await activeGrantForAdmin(tenantId, adminId);
  if (!grant) throw new Error("No active support grant for you on this tenant");

  await setSupportSession(tenantId, grant.id);
  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: "support_session_started",
      entityType: "support_access_grant",
      entityId: grant.id,
      intent: "Platform admin entered support session",
      impersonatorId: adminId,
      supportGrantId: grant.id,
    });
  });
  redirect(`/${tenantSlug}`);
}

export async function endSupportSession(): Promise<void> {
  const adminId = await requirePlatformAdmin();
  const ptr = await readSupportSessionCookie();
  if (ptr) {
    try {
      await withDrizzleTenant(ptr.tenantId, async (tx) => {
        await tx.insert(auditEvent).values({
          tenantId: ptr.tenantId,
          actorId: adminId,
          action: "support_session_ended",
          entityType: "support_access_grant",
          entityId: ptr.grantId,
          intent: "Platform admin exited support session",
          impersonatorId: adminId,
          supportGrantId: ptr.grantId,
        });
      });
    } catch {
      // best-effort audit
    }
  }
  await clearSupportSession();
  redirect(ptr ? `/admin/tenants/${ptr.tenantId}` : "/admin/tenants");
}
