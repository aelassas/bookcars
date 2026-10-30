"use server";

import { requireRoleForTenant } from "@/platform/auth/authorization";
import { computePerformanceBoard, type PerfRow } from "./perf-core";

/** Team performance board for the analytics page — GM+ only. */
export async function getPerformanceBoard(tenantId: string, days: number): Promise<PerfRow[]> {
  // Line managers see their own line's board too (Moe — sales line, Babek — rent).
  await requireRoleForTenant(tenantId, ["sales_manager", "general_manager", "tenant_admin", "platform_admin"]);
  return computePerformanceBoard(tenantId, days);
}
