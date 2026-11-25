"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { isPlatformAdmin } from "@/platform/auth/authorization";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { deviceLogin, tenantMember, user, auditEvent } from "@/platform/db/schema";

async function requireAdmin(): Promise<string> {
  const s = await auth();
  if (!s?.user?.id || !(await isPlatformAdmin(s.user.id))) redirect("/");
  return s.user.id;
}

export async function confirmDevice(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!id) return;

  await db
    .update(deviceLogin)
    .set({ confirmed: true, confirmedBy: adminId, confirmedAt: new Date() })
    .where(eq(deviceLogin.id, id));

  // audit_event is tenant-scoped, so a device with no membership yet has
  // nowhere to log to; the confirm still stands, we just can't attribute it.
  if (tenantId) {
    const [d] = await db
      .select({ email: deviceLogin.email, mac: deviceLogin.mac, ip: deviceLogin.ip })
      .from(deviceLogin)
      .where(eq(deviceLogin.id, id))
      .limit(1);
    await withDrizzleTenant(tenantId, async (tx) => {
      await tx.insert(auditEvent).values({
        tenantId,
        actorId: adminId,
        action: "device_confirmed",
        entityType: "device_login",
        entityId: id,
        intent: `Confirmed ${d?.email ?? "device"} on ${d?.mac || "unknown MAC"} (${d?.ip ?? "?"})`,
      });
    });
  }
  revalidatePath("/admin/access");
}

/**
 * Remove a person's access to ONE tenant.
 *
 * This used to delete every tenant_member row the user had, across every
 * tenant on the platform — a platform-wide kill fired from a button rendered
 * inside a single tenant's row, with no confirmation and no audit trail. It
 * now takes the tenantId it is scoped to, deletes exactly that membership,
 * and logs it. Their user row and device history are kept for audit.
 *
 * Access ends immediately even though sessions are 30-day JWTs: every request
 * re-reads membership from the DB (platform/auth/tenant.ts), so removing the
 * row locks them out of that tenant on the next request.
 */
export async function revokeUser(formData: FormData) {
  const adminId = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!userId) throw new Error("userId required");
  if (!tenantId) throw new Error("tenantId required — revoke is scoped to one tenant");

  await withDrizzleTenant(tenantId, async (tx) => {
    const [m] = await tx
      .select()
      .from(tenantMember)
      .where(and(eq(tenantMember.tenantId, tenantId), eq(tenantMember.userId, userId)))
      .limit(1);
    if (!m) throw new Error("That person is not a member of this tenant");

    // Same protection the tenant's own team page enforces: never strip a
    // workspace of its last admin.
    if (m.roles?.includes("tenant_admin")) {
      const admins = await tx.select().from(tenantMember).where(eq(tenantMember.tenantId, tenantId));
      const adminCount = admins.filter((a) => a.roles?.includes("tenant_admin")).length;
      if (adminCount <= 1) throw new Error("Cannot remove the last tenant_admin");
    }

    const [u] = await tx.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);

    await tx.delete(tenantMember).where(eq(tenantMember.id, m.id));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: adminId,
      action: "member_access_revoked",
      entityType: "tenant_member",
      entityId: userId,
      intent: `[access review] Revoked ${u?.email ?? userId} from this tenant`,
    });
  });
  revalidatePath("/admin/access");
}
