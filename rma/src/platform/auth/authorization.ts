import { eq, and } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { platformAdmin, tenantMember } from "@/platform/db/schema";
import { auth } from "./index";
import { getActiveTenant, getTenantBySlug, type ActiveTenant } from "./tenant";

export type PlatformRole =
  | "platform_admin"
  | "tenant_admin"
  | "sales"
  // Sales line managers — receive escalations and may act as sales.
  | "sales_manager"
  | "general_manager"
  | "primary"
  | "fleet"
  // Security (SB) — RENTAL ONLY: doc checks, issuance, sanctions, repossession,
  // engine block. Cross-brand within the rental line (see scope.ts).
  | "security"
  // Programs department — leasing TARS + Deposit-contract only.
  | "programs_department"
  // Driver — RENTAL ONLY, works exclusively via the Telegram bot (delivery /
  // return). Has no web-CRM module access; gets Telegram reminders only.
  | "driver"
  | "hr"
  | "finance"
  | "technical";

// Sales line — sales + its managers act on CRM/rentals/leases/payments alike.
export const SALES_LINE: PlatformRole[] = ["sales", "sales_manager", "general_manager"];

/**
 * True when EVERY role the user holds is a sales-line role (and they hold at
 * least one) — i.e. a pure phone-first salesperson, not an admin/CEO/ops hybrid.
 * Used to land such users on «Мой день» instead of the manager dashboard.
 */
export function isSalesLineOnly(roles: string[] | null | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.every((r) => (SALES_LINE as string[]).includes(r));
}

/**
 * A PURE phone-first floor rep — role is exactly `sales`, nothing more. These
 * are the users the minimal «Мой день» cockpit is for. Managers/supervisors
 * (sales_manager / general_manager) are NOT floor reps: they need the full
 * workspace (sidebar: Автопарк, Пульс, все сделки), so they must NOT be
 * trapped on the cockpit. Fixes Babek (2026-07-24): «where is the fleet?».
 */
export function isFloorRepOnly(roles: string[] | null | undefined): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.every((r) => r === "sales");
}

/** Require a signed-in user. Returns user id. */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Require an active tenant membership. Returns tenant context with roles. */
export async function requireActiveTenant() {
  const tenant = await getActiveTenant();
  if (!tenant) throw new Error("No active tenant");
  return tenant;
}

/**
 * Require that the current user holds at least one of the allowed roles
 * (or is tenant_admin / platform_admin, which implicitly grants all).
 */
export async function requireRole(allowedRoles: PlatformRole[]) {
  const tenant = await requireActiveTenant();
  const userRoles: string[] = tenant.roles ?? [];
  const isAdmin =
    userRoles.includes("tenant_admin") || userRoles.includes("platform_admin");
  const hasAllowed = userRoles.some((r) =>
    allowedRoles.includes(r as PlatformRole)
  );
  if (!isAdmin && !hasAllowed) {
    throw new Error(
      `Forbidden: requires one of [${allowedRoles.join(", ")}]`
    );
  }
  return tenant;
}

/**
 * Require that the current user is tenant_admin of a specific tenant
 * (by slug). Used to gate /settings/* admin pages and their actions for
 * the exact tenant being edited — more precise than requireRole(), which
 * resolves the user's first membership. platform_admin is also allowed.
 */
export async function requireTenantAdmin(slug: string): Promise<ActiveTenant> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  const roles = t.roles ?? [];
  if (!roles.includes("tenant_admin") && !roles.includes("platform_admin")) {
    throw new Error("Forbidden: tenant admin only");
  }
  return t;
}

// ─── Platform admin (vendor team) — SPEC §3.1, §5 ──────────────────────────

/** True if the user has a platform_admin row (global, cross-tenant). */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: platformAdmin.userId })
    .from(platformAdmin)
    .where(eq(platformAdmin.userId, userId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Gate for every /admin route and platform-level server action.
 * Throws unless the signed-in user is a platform admin. Returns the
 * user id so callers can record it (e.g. promotedBy, audit).
 */
export async function requirePlatformAdmin(): Promise<string> {
  const userId = await requireAuth();
  if (!(await isPlatformAdmin(userId))) {
    throw new Error("Forbidden: platform admin only");
  }
  return userId;
}

// ─── Module-level permission helpers ───────────────────────────────────────

export async function canManageCRM() {
  return requireRole([...SALES_LINE, "primary"]);
}

export async function canCloseDeal() {
  return requireRole([...SALES_LINE, "tenant_admin"]);
}

export async function canManageFleet() {
  return requireRole(["fleet"]);
}

export async function canManageCollections() {
  return requireRole(["security", "finance"]);
}

export async function canPerformEngineBlock() {
  return requireRole(["security"]);
}

export async function canManageRentals() {
  return requireRole([...SALES_LINE, "fleet"]);
}

// Programs department — leasing TARS + Deposit-contract only.
export async function canManagePrograms() {
  return requireRole(["programs_department"]);
}

export async function canManageMessaging() {
  return requireRole([...SALES_LINE, "primary"]);
}

export async function canManageHR() {
  return requireRole(["hr"]);
}

export async function canManageTasks() {
  return requireRole(["hr", "technical", ...SALES_LINE, "security"]);
}

// ─── Tenant-scoped authorization (checks membership for a specific tenant) ───

export async function getTenantRoles(userId: string, tenantId: string): Promise<string[]> {
  const rows = await db
    .select({ roles: tenantMember.roles })
    .from(tenantMember)
    .where(and(eq(tenantMember.userId, userId), eq(tenantMember.tenantId, tenantId)))
    .limit(1);
  return rows[0]?.roles ?? [];
}

export async function requireRoleForTenant(
  tenantId: string,
  allowedRoles: PlatformRole[]
): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const roles = await getTenantRoles(session.user.id, tenantId);
  const isAdmin = roles.includes("tenant_admin") || roles.includes("platform_admin");
  const hasAllowed = roles.some((r) => allowedRoles.includes(r as PlatformRole));
  if (!isAdmin && !hasAllowed) {
    throw new Error(`Forbidden: requires one of [${allowedRoles.join(", ")}]`);
  }
  return roles;
}

export async function canManageCRMForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "primary", "security"]);
}

/**
 * Quiet version for READ paths (owner 2026-07-29: "no Forbidden anywhere —
 * if it's not related to them, just don't show it"). Returns:
 *   - true   — user may read CRM data in this tenant;
 *   - false  — NOT a member of the tenant (their view should 404/empty
 *     quietly, matching how cross-brand URLs already behave);
 *   - throws Forbidden — a MEMBER whose roles genuinely lack CRM access
 *     (kept loud on purpose: that is a provisioning bug, not a boundary).
 */
export async function canReadCRMForTenant(tenantId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const roles = await getTenantRoles(session.user.id, tenantId);
  if (roles.length === 0) return false; // not related to them → don't show
  const isAdmin = roles.includes("tenant_admin") || roles.includes("platform_admin");
  const allowed = [...SALES_LINE, "primary", "security"] as PlatformRole[];
  if (!isAdmin && !roles.some((r) => allowed.includes(r as PlatformRole))) {
    throw new Error(`Forbidden: requires one of [${allowed.join(", ")}]`);
  }
  return true;
}

export async function canCloseDealForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "tenant_admin"]);
}

export async function canManageFleetForTenant(tenantId: string) {
  // Rent staff see their own fleet — it IS their operation (owner 2026-07-24:
  // «he needs the fleet, it's his Excel»). Sales-line + fleet + security may
  // view/manage vehicles; the DANGEROUS action (engine block) stays
  // security-only via canPerformEngineBlockForTenant, unchanged.
  return requireRoleForTenant(tenantId, [...SALES_LINE, "fleet", "security"]);
}

export async function canManageCollectionsForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, ["security", "finance"]);
}

export async function canPerformEngineBlockForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, ["security"]);
}

export async function canManageRentalsForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "fleet", "security"]);
}

// Leasing (TAKE Auto): sales line + fleet + programs department.
// Security is RENTAL-ONLY per spec and is deliberately NOT allowed here.
export async function canManageLeases() {
  return requireRole([...SALES_LINE, "fleet", "programs_department"]);
}

export async function canManageLeasesForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "fleet", "programs_department"]);
}

export async function canManageProgramsForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, ["programs_department"]);
}

export async function canManageMessagingForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "primary", "security"]);
}

export async function canManageHRForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, ["hr"]);
}

export async function canManageTasksForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, ["hr", "technical", ...SALES_LINE, "security"]);
}

export async function canManageDocumentsForTenant(tenantId: string) {
  return requireRoleForTenant(tenantId, [...SALES_LINE, "primary", "fleet", "technical"]);
}
