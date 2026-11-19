import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  auditEvent,
  deal,
  document,
  engineBlock,
  lease,
  payment,
  rental,
  rentalCharge,
  tenant,
  vehicle,
  vehicleTimelineEvent,
} from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";

export async function permanentlyDeleteVehicle(tenantId: string, vehicleId: string, actorId: string): Promise<string | null> {
  return withDrizzleTenant(tenantId, async (tx) => {
    const [target] = await tx.select({ plate: vehicle.plate }).from(vehicle).where(eq(vehicle.id, vehicleId)).limit(1);
    if (!target) throw new Error("Vehicle not found");

    const rentalIds = (await tx.select({ id: rental.id }).from(rental).where(eq(rental.vehicleId, vehicleId))).map((row) => row.id);
    const leaseIds = (await tx.select({ id: lease.id }).from(lease).where(eq(lease.vehicleId, vehicleId))).map((row) => row.id);

    await tx.delete(vehicleTimelineEvent).where(eq(vehicleTimelineEvent.vehicleId, vehicleId));
    await tx.delete(document).where(or(
      and(eq(document.entityType, "vehicle"), eq(document.entityId, vehicleId)),
      rentalIds.length > 0 ? and(eq(document.entityType, "rental"), inArray(document.entityId, rentalIds)) : undefined,
      leaseIds.length > 0 ? and(eq(document.entityType, "lease"), inArray(document.entityId, leaseIds)) : undefined,
    ));
    if (rentalIds.length > 0) await tx.delete(payment).where(inArray(payment.rentalId, rentalIds));
    await tx.delete(engineBlock).where(eq(engineBlock.vehicleId, vehicleId));
    await tx.delete(rentalCharge).where(eq(rentalCharge.vehicleId, vehicleId));
    await tx.delete(lease).where(eq(lease.vehicleId, vehicleId));
    await tx.delete(rental).where(eq(rental.vehicleId, vehicleId));
    await tx.execute(sql`DELETE FROM vehicle_ledger_event WHERE vehicle_id = ${vehicleId}`);
    await tx.update(deal).set({ vehicleId: null, updatedAt: new Date() }).where(eq(deal.vehicleId, vehicleId));

    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.deletePermanent",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Permanently deleted vehicle ${target.plate} and its linked operational history`,
    });
    await tx.delete(vehicle).where(eq(vehicle.id, vehicleId));
    const [row] = await tx.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    return row?.slug ?? null;
  });
}
