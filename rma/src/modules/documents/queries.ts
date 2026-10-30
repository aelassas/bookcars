"use server";

import { eq, and, desc } from "drizzle-orm";
import { document } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageDocumentsForTenant, requireRoleForTenant } from "@/platform/auth/authorization";

export async function getDocuments(
  tenantId: string,
  filters: { entityType: string; entityId: string }
) {
  await canManageDocumentsForTenant(tenantId);
  return withDrizzleTenant(tenantId, (tx) =>
    tx
      .select()
      .from(document)
      .where(and(eq(document.entityType, filters.entityType), eq(document.entityId, filters.entityId)))
      .orderBy(desc(document.createdAt))
  );
}

export async function deleteDocument(tenantId: string, documentId: string) {
  await requireRoleForTenant(tenantId, ["tenant_admin", "sales"]);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx.delete(document).where(eq(document.id, documentId)).returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ?? null;
  });
}
