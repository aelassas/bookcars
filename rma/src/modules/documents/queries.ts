"use server";

import { eq, and, desc } from "drizzle-orm";
import { document } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageDocumentsForTenant, requireRoleForTenant } from "@/platform/auth/authorization";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { db } from "@/platform/db/client";

export async function getDocuments(
  tenantId: string,
  filters: { entityType: string; entityId: string }
) {
  await canManageDocumentsForTenant(tenantId);
  const storageTenantId = filters.entityType === "rental" ? await requireFleetHomeTenantId() : tenantId;
  return withDrizzleTenant(storageTenantId, (tx) =>
    tx
      .select()
      .from(document)
      .where(and(eq(document.entityType, filters.entityType), eq(document.entityId, filters.entityId)))
      .orderBy(desc(document.createdAt))
  );
}

export async function deleteDocument(tenantId: string, documentId: string) {
  await requireRoleForTenant(tenantId, ["tenant_admin", "sales"]);
  const [existing] = await db.select({ entityType: document.entityType }).from(document).where(eq(document.id, documentId)).limit(1);
  if (!existing) return null;
  const storageTenantId = existing.entityType === "rental" ? await requireFleetHomeTenantId() : tenantId;
  return withDrizzleTenant(storageTenantId, async (tx) => {
    const rows = await tx.delete(document).where(eq(document.id, documentId)).returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row ?? null;
  });
}
