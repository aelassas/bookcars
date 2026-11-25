import { eq, and, inArray, type Column, type SQL } from "drizzle-orm";
import { auth } from "./index";
import { db } from "@/platform/db/client";
import { tenantMember, company } from "@/platform/db/schema";

// Branch/company scoping (adaptive UI). A holding (tenant) has several
// companies/brands in two business lines (rental, leasing). A user sees only
// the companies assigned to them; crossBranch (security/owner) sees all.
//
// Scaffold note: enforced at the query layer (centralized helper) on top of
// the existing tenant RLS. A second RLS predicate on company_id is the
// production hardening (deferred), not needed for the interview scaffold.

export type UserScope = { companyIds: string[]; crossBranch: boolean };

export async function getUserScope(tenantId: string): Promise<UserScope> {
  const session = await auth();
  if (!session?.user?.id) return { companyIds: [], crossBranch: false };
  const [m] = await db
    .select({ companyIds: tenantMember.companyIds, crossBranch: tenantMember.crossBranch })
    .from(tenantMember)
    .where(and(eq(tenantMember.tenantId, tenantId), eq(tenantMember.userId, session.user.id)))
    .limit(1);
  return { companyIds: m?.companyIds ?? [], crossBranch: m?.crossBranch ?? false };
}

/**
 * Drizzle condition filtering `companyIdCol` to the user's scope, or undefined
 * when no filter applies: crossBranch (sees all), or unscoped (no companyIds —
 * e.g. tenant_admin / legacy users keep full visibility). Combine via and().
 */
export async function companyScope(
  tenantId: string,
  companyIdCol: Column
): Promise<SQL | undefined> {
  const s = await getUserScope(tenantId);
  if (s.crossBranch) return undefined;
  if (!s.companyIds.length) return undefined;
  return inArray(companyIdCol, s.companyIds);
}

/**
 * READ-THROUGH scope for the SHARED physical fleet. The brands of a holding
 * share ONE fleet — cars move rent → lease/sale → rent — so a company is the
 * current HAND of a car, not its owner. Fleet/rental/lease READ paths therefore
 * show every company of the tenant to any member with the relevant role, rather
 * than only the member's own company_ids.
 *
 * Signature mirrors companyScope() so read call sites swap 1:1. It intentionally
 * returns undefined (no company predicate) — tenant RLS still isolates tenants;
 * this only relaxes the intra-tenant company filter for reads. WRITE paths keep
 * using companyScope()/getUserScope() for role/company-gated edits.
 */
export const companyReadScope: typeof companyScope = async () => undefined;

export type ActiveCompany = typeof company.$inferSelect;

/** The user's primary company (for branding + business line), or null for
 * cross-branch / unscoped users (they keep the holding default brand). */
export async function getActiveCompany(tenantId: string): Promise<ActiveCompany | null> {
  const s = await getUserScope(tenantId);
  // companyIds[0] drives branding even for cross-branch users (admin/security
  // can carry a brand while still seeing all data via companyScope).
  if (!s.companyIds.length) return null;
  const [c] = await db
    .select()
    .from(company)
    .where(and(eq(company.tenantId, tenantId), eq(company.id, s.companyIds[0])))
    .limit(1);
  return c ?? null;
}

/** Filter the nav modules to the user's business line: rental users don't see
 * leasing nav and vice-versa. null line (cross/unscoped) keeps all. */
export function lineModules(modules: string[] | null | undefined, line: string | null): string[] | null | undefined {
  if (!modules || !line) return modules;
  if (line === "rental") return modules.filter((m) => m !== "leases");
  if (line === "leasing") return modules.filter((m) => !["rentals", "returns", "collections"].includes(m));
  return modules;
}
