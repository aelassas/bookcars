"use server";

import { task } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, desc, sql } from "drizzle-orm";
import { canManageTasksForTenant } from "./policies";
import { companyScope } from "@/platform/auth/scope";

export async function getTasks(tenantId: string): Promise<typeof task.$inferSelect[]> {
  await canManageTasksForTenant(tenantId);
  const scope = await companyScope(tenantId, task.companyId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(task).where(scope ?? sql`true`).orderBy(desc(task.createdAt)) as Promise<typeof task.$inferSelect[]>;
  });
}

export async function getTasksByStatus(tenantId: string, status: string): Promise<typeof task.$inferSelect[]> {
  await canManageTasksForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(task).where(eq(task.status, status)).orderBy(desc(task.createdAt)) as Promise<typeof task.$inferSelect[]>;
  });
}
