"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/platform/db/client";
import { user, auditEvent } from "@/platform/db/schema";
import { requireAuth } from "@/platform/auth/authorization";
import { getActiveTenant } from "@/platform/auth/tenant";
import { rateLimit } from "@/platform/security/rate-limit";
import { ru } from "@/lib/i18n/ru";

// Auth Wave 1 (P0-2/P0-3) — ONE action that both SETS a password (when
// user.password IS NULL) and CHANGES it (requires current password,
// bcrypt-compare). Gated by requireAuth() ONLY — it never accepts an email,
// so canEmailSignIn()'s allow-list can't be bypassed by this route; the
// session is the sole proof of identity.

export type PasswordActionState = {
  error?: string;
  success?: boolean;
};

export async function setOrChangePassword(
  _prev: PasswordActionState | null,
  formData: FormData
): Promise<PasswordActionState> {
  const userId = await requireAuth();

  // Best-effort brute-force guard on the current-password check below —
  // reuses the existing rate-limit module (platform/security/rate-limit.ts),
  // no new/duplicate limiter.
  const limited = rateLimit({
    key: `account-password:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return { error: ru.password.errors.rateLimited };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: ru.password.errors.tooShort };
  }
  if (newPassword !== confirmPassword) {
    return { error: ru.password.errors.mismatch };
  }

  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!u) return { error: ru.password.errors.generic };

  const isChange = !!u.password;
  if (isChange) {
    if (!currentPassword) return { error: ru.password.errors.currentRequired };
    const valid = await bcrypt.compare(currentPassword, u.password as string);
    if (!valid) return { error: ru.password.errors.currentWrong };
  }

  // Exactly as authorize() in platform/auth/index.ts uses bcryptjs for the
  // compare side; hash rounds match register/actions.ts (bcrypt.hash(_, 10)).
  const hash = await bcrypt.hash(newPassword, 10);

  await db
    .update(user)
    .set({ password: hash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(user.id, userId));

  // Audit only when the user has an active tenant — a brand-new invite
  // accepted before any membership exists has nothing to scope the event
  // to (audit_event.tenant_id is NOT NULL).
  const activeTenant = await getActiveTenant();
  if (activeTenant) {
    await db.insert(auditEvent).values({
      tenantId: activeTenant.id,
      actorId: userId,
      action: isChange ? "password_changed" : "password_set",
      entityType: "user",
      entityId: userId,
      intent: isChange ? "User changed their own password" : "User set a password",
    });
  }

  return { success: true };
}
