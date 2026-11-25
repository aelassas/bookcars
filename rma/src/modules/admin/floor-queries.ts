// Members shown on the passwordless «floor login» page (/login/<slug>/enter).
// Only sales-line members are listed — an admin/CEO/finance/security account
// must NEVER appear as a tappable name. This is the same isSalesLineOnly()
// gate the floor-name provider enforces at mint time (platform/auth/
// floor-login.ts): the list a person can tap and the door that lets them in
// agree by construction, so a role change closes both at once.
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenantMember, user } from "@/platform/db/schema";
import { isSalesLineOnly } from "@/platform/auth/authorization";

export interface FloorMember {
  userId: string;
  name: string;
  roleLabel: string;
}

// RU chip labels. When a member holds several sales-line roles the most senior
// wins, so a general manager reads as «Директор», not «Продажи».
const ROLE_LABEL: Record<string, string> = {
  general_manager: "Director",
  sales_manager: "Sales Manager",
  sales: "Sales",
};
const ROLE_PRIORITY = ["general_manager", "sales_manager", "sales"];

function roleLabelFor(roles: string[]): string {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return ROLE_LABEL[r];
  return "Sales";
}

/**
 * List a tenant's sales-line members as name buttons for the floor page.
 * tenant_member is a plain table (no RLS), so a direct join is safe — same
 * access pattern as getTenantRoles(). Privileged accounts are filtered out in
 * app code via isSalesLineOnly, mirroring the provider's mint-time gate.
 */
export async function listFloorMembers(tenantId: string): Promise<FloorMember[]> {
  const rows = await db
    .select({
      userId: tenantMember.userId,
      name: user.name,
      email: user.email,
      roles: tenantMember.roles,
    })
    .from(tenantMember)
    .innerJoin(user, eq(tenantMember.userId, user.id))
    .where(eq(tenantMember.tenantId, tenantId));

  return rows
    .filter((r) => isSalesLineOnly(r.roles))
    .map((r) => ({
      userId: r.userId,
      name: r.name?.trim() || r.email,
      roleLabel: roleLabelFor(r.roles),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
