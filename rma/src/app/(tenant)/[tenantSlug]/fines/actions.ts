"use server";

import { eq } from "drizzle-orm";
import { vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageFleetForTenant } from "@/platform/auth/authorization";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { lookupFines, type RtaFinesResult } from "@/platform/integrations/rta/client";
import { parsePlate } from "@/lib/plates";

export type FinesCheckResult =
  | { ok: true; result: RtaFinesResult }
  | { ok: false; error: string };

export async function checkVehicleFines(tenantId: string, vehicleId: string): Promise<FinesCheckResult> {
  await canManageFleetForTenant(tenantId);
  // Shared fleet lives in fleet-home — authorize on the caller's tenant, read there.
  const home = await requireFleetHomeTenantId();
  const [v] = await withDrizzleTenant(home, async (tx) =>
    tx
      .select({ plate: vehicle.plate })
      .from(vehicle)
      .where(eq(vehicle.id, vehicleId))
      .limit(1),
  );
  if (!v) return { ok: false, error: "Vehicle not found" };
  const parts = parsePlate(v.plate);
  if (!parts) return { ok: false, error: `Plate "${v.plate}" is not a Dubai plate format` };
  try {
    const result = await lookupFines({
      sourceCode: "DXB",
      plateCategory: "PRIVATE",
      ...parts,
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "RTA lookup failed" };
  }
}
