"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/platform/auth/authorization";
import { auditEvent, rental } from "@/platform/db/schema";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { confirmRentalExtensionForTenant } from "./extension-service";
import { canManageRentalsForTenant } from "./policies";
import type { ExtensionStatus } from "./operations";

export async function setRentalExtensionStatus(tenantId: string, tenantSlug: string, rentalId: string, status: Extract<ExtensionStatus, "wants_extension" | "returning">): Promise<void> {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  await withDrizzleTenant(home, async (tx) => {
    const [current] = await tx.select({ status: rental.status }).from(rental).where(eq(rental.id, rentalId)).limit(1);
    if (!current || current.status !== "active") throw new Error("Active rental not found");
    await tx.update(rental).set({ extensionStatus: status, updatedAt: new Date() }).where(eq(rental.id, rentalId));
    await tx.insert(auditEvent).values({ tenantId: home, actorId, action: "rental.extension_response.reviewed", entityType: "rental", entityId: rentalId, intent: status });
  });
  revalidatePath(`/${tenantSlug}/rentals/${rentalId}`);
  revalidatePath(`/${tenantSlug}/operations`);
}

export async function confirmRentalExtension(tenantId: string, tenantSlug: string, rentalId: string, newReturnDate: Date): Promise<{ ok: true } | { ok: false; error: string }> {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  try {
    await confirmRentalExtensionForTenant(home, actorId, rentalId, newReturnDate);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Extension failed" };
  }
  revalidatePath(`/${tenantSlug}/rentals/${rentalId}`);
  revalidatePath(`/${tenantSlug}/operations`);
  revalidatePath(`/${tenantSlug}/fleet/availability`);
  return { ok: true };
}
