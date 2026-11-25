// «Floor login» — passwordless, LAN-only name-tap sign-in (owner order
// 2026-07-24). The office floor has no tailscale and no patience for codes:
// staff open /login/<slug>/enter, tap their name, and the `floor-name`
// credentials provider mints their session. The office LAN is the accepted
// trust boundary. Three invariants live here so they can be tested in
// isolation and can never drift from the provider:
//   1. FLOOR_LOGIN_ENABLED — the whole door is a deploy-time switch.
//   2. office-LAN-only — the request must originate from the office network
//      (same isOfficeLan check registration uses); off-LAN → denied.
//   3. sales-line-only — an admin/CEO/finance/security account is NEVER
//      mintable through this door, even if it also sells (isSalesLineOnly).
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, tenantMember, user } from "@/platform/db/schema";
import { clientIp, isOfficeLan } from "@/platform/net/device";
import { isSalesLineOnly } from "./authorization";

/** The floor door is off unless explicitly enabled for this deployment. */
export function isFloorLoginEnabled(): boolean {
  return process.env.FLOOR_LOGIN_ENABLED === "true";
}

/**
 * Core authorize for the `floor-name` provider, extracted from the NextAuth
 * config so the gate is unit-testable without booting Auth.js. Returns the
 * user in the SAME shape as the password/telegram providers (so the
 * jwt/session callbacks work unchanged), or null to deny.
 *
 * Denies unless ALL hold: the flag is on; the request comes from the office
 * LAN; `userId` is a member of the tenant identified by `tenantSlug`; and
 * every role that membership holds is sales-line (isSalesLineOnly). A hybrid
 * or privileged account is rejected.
 */
export async function authorizeFloorName(input: {
  userId?: unknown;
  tenantSlug?: unknown;
}): Promise<{ id: string; email: string; name: string | null; image: string | null } | null> {
  // Hard gate first — never touch the DB when the door is off.
  if (!isFloorLoginEnabled()) return null;

  // LAN gate — «the office LAN is the trust boundary», enforced, not just
  // claimed. Same check as self-registration (app/register/actions.ts).
  // TRUST NOTE: clientIp() reads x-real-ip/x-forwarded-for, which are
  // client-controlled in general; they are trustworthy here only because
  // server.cjs overwrites both with the real socket address on every request.
  // Under bare `next start`/`next dev` (no wrapper) the headers are absent and
  // this denies everyone — fail closed — but a proxy topology that forwards
  // client-supplied headers unstripped would be spoofable. Keep the wrapper.
  const ip = clientIp(await headers());
  if (!isOfficeLan(ip)) return null;

  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const tenantSlug = typeof input.tenantSlug === "string" ? input.tenantSlug.trim() : "";
  if (!userId || !tenantSlug) return null;

  // One row: the membership (its roles) joined to its tenant (by slug) and
  // the user. tenant_member is a plain table (no RLS), same access pattern as
  // getTenantRoles/canEmailSignIn, so a direct join is safe here.
  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      roles: tenantMember.roles,
    })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id))
    .innerJoin(user, eq(tenantMember.userId, user.id))
    .where(and(eq(tenantMember.userId, userId), eq(tenant.slug, tenantSlug)))
    .limit(1);

  if (!row) return null; // not a member of that tenant
  if (!isSalesLineOnly(row.roles)) return null; // admin/CEO/ops/finance/security — denied

  return { id: row.id, email: row.email, name: row.name, image: row.image };
}
