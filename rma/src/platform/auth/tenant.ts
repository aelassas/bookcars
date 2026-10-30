import { eq, and } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, tenantMember } from "@/platform/db/schema";
import { auth } from "./index";

export type ActiveTenant = {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  logoUrl: string | null;
  modules: string[];
  status: string;
  roles: string[];
  // Set when access is via an active support_access_grant (platform admin
  // acting as the tenant), not real membership. SPEC §7.
  impersonation?: {
    grantId: string;
    scope: "read" | "write";
    expiresAt: Date;
    impersonatorId: string;
  };
};

// Read-capable module roles handed to a support impersonator so tenant
// pages render. tenant_admin is intentionally excluded; write actions stay
// blocked because they resolve roles via membership (getActiveTenant).
const IMPERSONATION_VIEW_ROLES = [
  "sales",
  "sales_manager",
  "general_manager",
  "primary",
  "security",
  "programs_department",
  "fleet",
  "hr",
  "finance",
  "technical",
];

/**
 * Resolve the active tenant for the signed-in user.
 * Returns the first tenant_member row for the user, or null.
 */
export async function getActiveTenant(): Promise<ActiveTenant | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db
    .select({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      modules: tenant.modules,
      status: tenant.status,
      roles: tenantMember.roles,
    })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id))
    .where(eq(tenantMember.userId, session.user.id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the tenant for a specific slug, ensuring the signed-in user is a member.
 * Returns null if user is not signed in, slug not found, or user is not a member.
 */
export async function getTenantBySlug(slug: string): Promise<ActiveTenant | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const rows = await db
    .select({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      modules: tenant.modules,
      status: tenant.status,
      roles: tenantMember.roles,
    })
    .from(tenant)
    .innerJoin(tenantMember, eq(tenantMember.tenantId, tenant.id))
    .where(and(eq(tenant.slug, slug), eq(tenantMember.userId, session.user.id)))
    .limit(1);
  if (rows[0]) return rows[0];

  // No membership — check for an active support session (impersonation).
  // Imported lazily to avoid a module cycle (support-session → auth/index).
  const { getActiveSupportContext } = await import("./support-session");
  const ctx = await getActiveSupportContext();
  if (!ctx) return null;
  const [tRow] = await db
    .select({ id: tenant.id, slug: tenant.slug, name: tenant.name, brandName: tenant.brandName, logoUrl: tenant.logoUrl, modules: tenant.modules, status: tenant.status })
    .from(tenant)
    .where(and(eq(tenant.slug, slug), eq(tenant.id, ctx.tenantId)))
    .limit(1);
  if (!tRow) return null;
  return {
    ...tRow,
    roles: IMPERSONATION_VIEW_ROLES,
    impersonation: {
      grantId: ctx.grantId,
      scope: ctx.scope,
      expiresAt: ctx.expiresAt,
      impersonatorId: ctx.impersonatorId,
    },
  };
}

/**
 * Same as getActiveTenant but throws if no tenant is bound to the session.
 * Use this in API routes and server actions where no tenant = auth bug.
 */
export async function requireActiveTenant(): Promise<ActiveTenant> {
  const t = await getActiveTenant();
  if (!t) throw new Error("No active tenant for current session");
  return t;
}
