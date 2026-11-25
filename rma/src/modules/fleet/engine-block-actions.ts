"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditEvent, tenant, vehicle } from "@/platform/db/schema";
import { requireAuth } from "@/platform/auth/authorization";
import { getPilotClient } from "@/platform/integrations/pilot/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { canPerformEngineBlockForTenant } from "./policies";
import { assertEngineBlockAllowed, assertEngineBlockConfirmation } from "./engine-block";

export async function blockVehicleEngine(
  tenantId: string,
  vehicleId: string,
  confirmation: string,
): Promise<{ commandId: number }> {
  await canPerformEngineBlockForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  assertEngineBlockConfirmation(confirmation);

  const target = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ imei: vehicle.imei, plate: vehicle.plate, status: vehicle.status, slug: tenant.slug })
      .from(vehicle)
      .innerJoin(tenant, eq(tenant.id, vehicle.tenantId))
      .where(eq(vehicle.id, vehicleId))
      .limit(1);
    return rows[0];
  });
  if (!target) throw new Error("Vehicle not found");
  if (!target.imei) throw new Error("Add the vehicle IMEI before using Pilot engine block");

  const pilot = getPilotClient();
  const live = await pilot.getStatus(target.imei);
  assertEngineBlockAllowed({
    vehicleStatus: target.status,
    blocked: live.blocked,
    ignition: live.ignition,
    speed: live.speed,
    lastFixAt: live.lastFixAt,
  });

  const result = await pilot.blockEngine(target.imei);
  await withDrizzleTenant(tenantId, async (tx) => {
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.engine_block.accepted",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Pilot accepted engine-block command ${result.commandId} for ${target.plate} after typed confirmation`,
    });
  });

  revalidatePath(`/${target.slug}/fleet`);
  revalidatePath(`/${target.slug}/fleet/${vehicleId}`);
  return result;
}
