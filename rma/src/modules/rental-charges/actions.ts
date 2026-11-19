"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canPerformEngineBlockForTenant, requireAuth, requireRoleForTenant } from "@/platform/auth/authorization";
import { auditEvent, payment, rentalCharge } from "@/platform/db/schema";
import { lookupFines } from "@/platform/integrations/rta/client";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { parsePlate } from "@/lib/plates";
import { canManageRentalsForTenant } from "@/modules/rental/policies";
import { assertValidChargePayment } from "@/modules/rental/payment-rules";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { notifyRentalChargeById, upsertRentalCharge } from "./core";
import { blockChargeEngine, releaseChargeEngineBlocks } from "./engine-service";
import type { RentalChargeInput } from "./rules";
import { syncSalikCharges } from "./salik";

export async function syncVehicleSalik(tenantId: string, tenantSlug: string, vehicleId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const result = await syncSalikCharges(home, actorId, vehicleId);
  revalidatePath(`/${tenantSlug}/charges`);
  return result;
}

export async function createRentalCharge(tenantId: string, tenantSlug: string, input: RentalChargeInput, notify: boolean) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const result = await upsertRentalCharge(home, actorId, input);
  let notificationError: string | null = null;
  if (notify && result.created) {
    try {
      await notifyRentalChargeById(home, tenantSlug, result.charge.id);
    } catch (error) {
      notificationError = error instanceof Error ? error.message : "Notification failed";
    }
  }
  revalidatePath(`/${tenantSlug}/charges`);
  revalidatePath(`/${tenantSlug}/rentals/${result.charge.rentalId}`);
  return { ...result, notificationError };
}

export async function notifyRentalCharge(tenantId: string, tenantSlug: string, chargeId: string): Promise<void> {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const home = await requireFleetHomeTenantId();
  await notifyRentalChargeById(home, tenantSlug, chargeId);
  revalidatePath(`/${tenantSlug}/charges`);
}

export async function syncVehicleFines(tenantId: string, tenantSlug: string, vehicleId: string) {
  await canManageRentalsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const vehicleRow = await withDrizzleTenant(home, async (tx) => {
    const { vehicle } = await import("@/platform/db/schema");
    const [row] = await tx.select({ plate: vehicle.plate }).from(vehicle).where(eq(vehicle.id, vehicleId)).limit(1);
    return row ?? null;
  });
  if (!vehicleRow) throw new Error("Vehicle not found");
  const plate = parsePlate(vehicleRow.plate);
  if (!plate) throw new Error(`Plate "${vehicleRow.plate}" is not a supported Dubai plate`);
  const result = await lookupFines({ sourceCode: "DXB", plateCategory: "PRIVATE", ...plate });
  let created = 0;
  const errors: string[] = [];
  for (const fine of result.fines) {
    try {
      const saved = await upsertRentalCharge(home, actorId, {
        vehicleId,
        kind: "fine",
        externalId: fine.referenceNo,
        occurredAt: new Date(fine.ticketDate),
        amount: fine.amount,
        description: [fine.description, fine.source].filter(Boolean).join(" · "),
        source: "rta",
      });
      if (saved.created) {
        created++;
        await notifyRentalChargeById(home, tenantSlug, saved.charge.id);
      }
    } catch (error) {
      errors.push(`${fine.referenceNo || "unknown"}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  revalidatePath(`/${tenantSlug}/charges`);
  return { found: result.fines.length, created, errors };
}

export async function payRentalCharge(tenantId: string, tenantSlug: string, chargeId: string, method: string) {
  await requireRoleForTenant(tenantId, ["sales", "sales_manager", "general_manager", "tenant_admin", "platform_admin"]);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const paid = await withDrizzleTenant(home, async (tx) => {
    const [charge] = await tx.select().from(rentalCharge).where(eq(rentalCharge.id, chargeId)).for("update").limit(1);
    if (!charge) throw new Error("Charge not found");
    if (charge.status === "paid") return { charge, alreadyPaid: true };
    if (charge.status === "void") throw new Error("A void charge cannot be paid");
    assertValidChargePayment(charge.amount, method);
    const inserted = await tx.insert(payment).values({
      tenantId: home,
      rentalId: charge.rentalId,
      rentalChargeId: charge.id,
      amount: charge.amount,
      method,
      notes: `${charge.kind} ${charge.externalId}`,
      status: "confirmed",
      recordedBy: actorId,
      confirmedBy: actorId,
      confirmedAt: new Date(),
    }).returning({ id: payment.id });
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    await tx.update(rentalCharge).set({ status: "paid", paidAt: new Date(), updatedAt: new Date() }).where(eq(rentalCharge.id, chargeId));
    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId,
      action: "rental_charge.paid",
      entityType: "rental_charge",
      entityId: chargeId,
      intent: `Confirmed ${charge.amount} AED ${method} payment ${row.id}; rental balance unchanged`,
    });
    return { charge, alreadyPaid: false };
  });
  const unblockErrors = paid.alreadyPaid ? [] : await releaseChargeEngineBlocks(home, chargeId, actorId);
  revalidatePath(`/${tenantSlug}/charges`);
  revalidatePath(`/${tenantSlug}/rentals/${paid.charge.rentalId}`);
  return { ok: true as const, unblockErrors };
}

export async function blockOverdueFine(tenantId: string, tenantSlug: string, chargeId: string): Promise<number | null> {
  await canPerformEngineBlockForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  const result = await blockChargeEngine(home, chargeId, actorId);
  revalidatePath(`/${tenantSlug}/charges`);
  return result;
}
