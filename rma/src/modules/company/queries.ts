"use server";

import { eq, asc } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireAuth, getTenantRoles } from "@/platform/auth/authorization";
import { company } from "@/platform/db/schema";

export async function getCompanies(tenantId: string) {
  // AUTHZ: tenantId is caller-supplied ("use server" exports are directly
  // POSTable), so require a membership in THAT tenant before reading — this
  // list would otherwise confirm a guessed tenant UUID. The company list is
  // shown to every role (tasks filters), so membership is the right bar.
  const userId = await requireAuth();
  const memberRoles = await getTenantRoles(userId, tenantId);
  if (memberRoles.length === 0) throw new Error("Forbidden: not a member of this tenant");

  // Read under RLS (SET LOCAL app.tenant_id), not the global db — the explicit
  // tenant_id predicate stays as defence in depth.
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({ id: company.id, name: company.name, businessLine: company.businessLine })
      .from(company)
      .where(eq(company.tenantId, tenantId))
      .orderBy(asc(company.name))
  );
}
