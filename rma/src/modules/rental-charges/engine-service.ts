import "server-only";
import { and, eq, inArray, lte, ne } from "drizzle-orm";
import { auditEvent, engineBlock, rental, rentalCharge, vehicle } from "@/platform/db/schema";
import { getPilotClient } from "@/platform/integrations/pilot/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertEngineBlockAllowed } from "@/modules/fleet/engine-block";
import { isFineBlockEligible } from "./rules";

export async function blockChargeEngine(home: string, chargeId: string, actorId: string | null, now = new Date()): Promise<number | null> {
  const data = await withDrizzleTenant(home, async (tx) => {
    const [row] = await tx.select({ charge: rentalCharge, imei: vehicle.imei, vehicleStatus: vehicle.status })
      .from(rentalCharge).innerJoin(vehicle, eq(vehicle.id, rentalCharge.vehicleId)).where(eq(rentalCharge.id, chargeId)).limit(1);
    if (!row) throw new Error("Charge not found");
    const [current] = await tx.select({ id: rental.id }).from(rental)
      .where(and(eq(rental.vehicleId, row.charge.vehicleId), eq(rental.status, "active"))).limit(1);
    if (!isFineBlockEligible({
      kind: row.charge.kind,
      status: row.charge.status,
      paymentDueAt: row.charge.paymentDueAt,
      chargeRentalId: row.charge.rentalId,
      currentRentalId: current?.id ?? null,
    }, now)) throw new Error("Only an unpaid fine overdue by 24 hours on the current rental can block this engine");
    if (!row.imei) throw new Error("The vehicle has no Pilot IMEI");

    const claimed = await tx.insert(engineBlock).values({
      tenantId: home,
      rentalChargeId: chargeId,
      vehicleId: row.charge.vehicleId,
      requestedBy: actorId,
      liveStateCheckedAt: now,
    }).onConflictDoNothing().returning({ id: engineBlock.id });
    const claim = Array.isArray(claimed) ? claimed[0] : claimed;
    if (claim) return { ...row, blockId: claim.id };
    const [existing] = await tx.select().from(engineBlock).where(eq(engineBlock.rentalChargeId, chargeId)).limit(1);
    if (!existing || existing.status !== "failed") return null;
    await tx.update(engineBlock).set({ status: "requested", error: null, requestedBy: actorId, liveStateCheckedAt: now, updatedAt: now }).where(and(eq(engineBlock.id, existing.id), eq(engineBlock.status, "failed")));
    return { ...row, blockId: existing.id };
  });
  if (!data) return null;

  const pilot = getPilotClient();
  try {
    const live = await pilot.getStatus(data.imei!);
    assertEngineBlockAllowed({
      vehicleStatus: data.vehicleStatus,
      blocked: live.blocked,
      ignition: live.ignition,
      speed: live.speed,
      lastFixAt: live.lastFixAt,
    }, now);
    const result = await pilot.blockEngine(data.imei!);
    await withDrizzleTenant(home, async (tx) => {
      await tx.update(engineBlock).set({ status: "accepted", commandId: result.commandId, updatedAt: new Date() }).where(eq(engineBlock.id, data.blockId));
      await tx.update(vehicle).set({ gpsBlocked: true, updatedAt: new Date() }).where(eq(vehicle.id, data.charge.vehicleId));
      await tx.insert(auditEvent).values({
        tenantId: home,
        actorId,
        action: "rental_charge.engine_block.accepted",
        entityType: "rental_charge",
        entityId: chargeId,
        intent: `Pilot accepted command ${result.commandId} after fresh stopped/ignition-off telemetry; fine ${data.charge.externalId}`,
      });
    });
    return result.commandId;
  } catch (error) {
    await withDrizzleTenant(home, (tx) => tx.update(engineBlock).set({
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 500) : "Pilot command failed",
      updatedAt: new Date(),
    }).where(eq(engineBlock.id, data.blockId)));
    throw error;
  }
}

export async function releaseChargeEngineBlocks(home: string, chargeId: string, actorId: string | null): Promise<string[]> {
  const blocks = await withDrizzleTenant(home, (tx) => tx.select({ block: engineBlock, imei: vehicle.imei })
    .from(engineBlock).innerJoin(vehicle, eq(vehicle.id, engineBlock.vehicleId))
    .where(and(eq(engineBlock.rentalChargeId, chargeId), eq(engineBlock.status, "accepted"))));
  const errors: string[] = [];
  const pilot = getPilotClient();
  for (const { block, imei } of blocks) {
    if (!imei) {
      errors.push(`Block ${block.id}: vehicle IMEI is missing`);
      continue;
    }
    try {
      const result = await pilot.unblockEngine(imei);
      await withDrizzleTenant(home, async (tx) => {
        await tx.update(engineBlock).set({ status: "released", unblockCommandId: result.commandId, releasedAt: new Date(), updatedAt: new Date() }).where(eq(engineBlock.id, block.id));
        const [other] = await tx.select({ id: engineBlock.id }).from(engineBlock).where(and(
          eq(engineBlock.vehicleId, block.vehicleId), eq(engineBlock.status, "accepted"), ne(engineBlock.id, block.id),
        )).limit(1);
        if (!other) await tx.update(vehicle).set({ gpsBlocked: false, updatedAt: new Date() }).where(eq(vehicle.id, block.vehicleId));
        await tx.insert(auditEvent).values({
          tenantId: home,
          actorId,
          action: "rental_charge.engine_block.released",
          entityType: "rental_charge",
          entityId: chargeId,
          intent: `Pilot accepted unblock command ${result.commandId} after confirmed payment`,
        });
      });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Pilot unblock failed");
    }
  }
  return errors;
}

export async function blockEligibleFineCharges(home: string, now = new Date()): Promise<{ attempted: number; blocked: number; errors: string[] }> {
  const charges = await withDrizzleTenant(home, (tx) => tx.select({ id: rentalCharge.id }).from(rentalCharge).where(and(
    eq(rentalCharge.kind, "fine"),
    inArray(rentalCharge.status, ["unpaid", "notification_queued"]),
    lte(rentalCharge.paymentDueAt, now),
  )));
  let blocked = 0;
  const errors: string[] = [];
  for (const charge of charges) {
    try {
      const command = await blockChargeEngine(home, charge.id, null, now);
      if (command != null) blocked++;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Engine block failed");
    }
  }
  return { attempted: charges.length, blocked, errors };
}
