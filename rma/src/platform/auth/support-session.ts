// SPEC §7 — support (impersonation) session.
//
// A platform admin can "act as a tenant" ONLY while:
//   1. they hold an active support_access_grant for that tenant, AND
//   2. they have explicitly entered a support session (this cookie).
//
// The cookie only carries a pointer (tenantId:grantId). The grant row in
// the DB is the source of truth and is re-verified on every read, so a
// tampered cookie can never produce access — it just won't match a valid,
// non-revoked, unexpired grant whose grantedTo is the current user.

import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "./index";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { supportAccessGrant } from "@/platform/db/schema";

const COOKIE = "support_session";

export interface SupportContext {
  tenantId: string;
  grantId: string;
  scope: "read" | "write";
  expiresAt: Date;
  impersonatorId: string;
}

export async function setSupportSession(tenantId: string, grantId: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE, `${tenantId}:${grantId}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
}

export async function clearSupportSession(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}

/** Raw cookie pointer (no DB verification). */
export async function readSupportSessionCookie(): Promise<{ tenantId: string; grantId: string } | null> {
  const c = await cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  const [tenantId, grantId] = raw.split(":");
  if (!tenantId || !grantId) return null;
  return { tenantId, grantId };
}

/**
 * The active, DB-verified support context for the current user, or null.
 * Returns null (does not throw) if no session, grant revoked/expired, or
 * the grant doesn't belong to the current user.
 */
export async function getActiveSupportContext(): Promise<SupportContext | null> {
  const ptr = await readSupportSessionCookie();
  if (!ptr) return null;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  try {
    const [grant] = await withDrizzleTenant(ptr.tenantId, async (tx) =>
      tx
        .select()
        .from(supportAccessGrant)
        .where(
          and(
            eq(supportAccessGrant.id, ptr.grantId),
            eq(supportAccessGrant.tenantId, ptr.tenantId),
            eq(supportAccessGrant.grantedTo, userId),
            isNull(supportAccessGrant.revokedAt)
          )
        )
        .limit(1)
    );
    if (!grant) return null;
    if (grant.expiresAt.getTime() <= Date.now()) return null;

    return {
      tenantId: grant.tenantId,
      grantId: grant.id,
      scope: grant.scope === "write" ? "write" : "read",
      expiresAt: grant.expiresAt,
      impersonatorId: userId,
    };
  } catch {
    return null;
  }
}

/**
 * Audit fields to merge into an audit_event insert. When a support session
 * is active for `tenantId`, both impersonatorId and supportGrantId are set;
 * otherwise empty. SPEC §3.6.
 */
export async function impersonationAuditFields(
  tenantId: string
): Promise<{ impersonatorId?: string; supportGrantId?: string }> {
  const ctx = await getActiveSupportContext();
  if (ctx && ctx.tenantId === tenantId) {
    return { impersonatorId: ctx.impersonatorId, supportGrantId: ctx.grantId };
  }
  return {};
}
