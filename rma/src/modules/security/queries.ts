"use server";

import { eq, and, or, isNull, asc } from "drizzle-orm";
import { task, company } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { getUserScope } from "@/platform/auth/scope";

// Cross-brand security/escalation queue — RENTAL ONLY (spec: Security (SB) is
// scoped to the rental line, with cross-access across the rental brands only).
// Only a cross-branch user (security) may read it; it spans every RENTAL
// company but never leasing. Legacy tasks with no company (created before
// company_id was inherited) are also shown here — the cross-branch viewer is
// the only one who can triage them — via the left join + IS NULL branch.
export async function getSecurityQueue(tenantId: string) {
  const scope = await getUserScope(tenantId);
  if (!scope.crossBranch) throw new Error("Forbidden: cross-branch (security) only");
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx
      .select({
        task: task,
        companyName: company.name,
        businessLine: company.businessLine,
      })
      .from(task)
      .leftJoin(company, eq(task.companyId, company.id))
      .where(
        and(
          eq(task.status, "open"),
          or(eq(company.businessLine, "rental"), isNull(task.companyId))
        )
      )
      .orderBy(asc(task.dueDate));
  });
}
