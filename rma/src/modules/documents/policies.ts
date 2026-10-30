import {
  canManageDocumentsForTenant,
  requireRoleForTenant,
} from "@/platform/auth/authorization";

export async function canManageDocuments(tenantId: string) {
  return canManageDocumentsForTenant(tenantId);
}

export async function canDeleteDocuments(tenantId: string) {
  return requireRoleForTenant(tenantId, ["tenant_admin", "sales"]);
}
