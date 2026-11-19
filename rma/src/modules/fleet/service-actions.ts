"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/platform/auth/authorization";
import { auditEvent, vehicle, vehicleTimelineEvent } from "@/platform/db/schema";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageFleetForTenant } from "./policies";
import { nextServiceLimitOdometer } from "./maintenance";

export interface VehicleServiceInput {
  vehicleId: string;
  date: string;
  odometer: number | null;
  category: string;
  description: string;
  costAed: number | null;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
}

export async function recordVehicleService(tenantId: string, tenantSlug: string, input: VehicleServiceInput): Promise<void> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const startsAt = new Date(`${input.date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(startsAt.getTime())) throw new Error("Valid service date is required");
  if (!input.description.trim()) throw new Error("Describe the work performed");
  if (input.odometer != null && (!Number.isInteger(input.odometer) || input.odometer < 0)) throw new Error("Odometer must be a non-negative integer");
  if (input.costAed != null && (!Number.isFinite(input.costAed) || input.costAed < 0)) throw new Error("Cost must be non-negative");
  if (input.nextServiceOdometer != null && (!Number.isInteger(input.nextServiceOdometer) || input.nextServiceOdometer < 0)) throw new Error("Next service odometer is invalid");
  if (!["oil_change", "service", "parking", "polishing", "other"].includes(input.category)) throw new Error("Unsupported service category");

  await withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select().from(vehicle).where(eq(vehicle.id, input.vehicleId)).limit(1);
    if (!current) throw new Error("Vehicle not found");
    const resetsService = ["oil_change", "service"].includes(input.category);
    const nextOdometer = input.nextServiceOdometer ?? (resetsService && input.odometer != null ? nextServiceLimitOdometer(input.odometer, current.serviceLimitIntervalKm) : null);
    await tx.insert(vehicleTimelineEvent).values({
      tenantId,
      vehicleId: input.vehicleId,
      type: "service",
      startsAt,
      status: "done",
      title: input.description.trim(),
      meta: { category: input.category, ...(input.odometer != null ? { odometer: input.odometer } : {}), ...(input.costAed != null ? { costAed: input.costAed } : {}) },
    });
    await tx.update(vehicle).set({
      ...(input.odometer != null ? { odometer: input.odometer } : {}),
      ...(resetsService ? {
        lastServiceDate: input.date,
        lastServiceOdometer: input.odometer,
        lastServiceWork: input.description.trim(),
        nextServiceDate: input.nextServiceDate,
        nextServiceOdometer: nextOdometer,
      } : {}),
      updatedAt: new Date(),
    }).where(eq(vehicle.id, input.vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.service.recorded",
      entityType: "vehicle",
      entityId: input.vehicleId,
      intent: `${input.category}: ${input.description.trim()}; odometer ${input.odometer ?? "not recorded"}; next limit ${resetsService ? nextOdometer ?? "not set" : "unchanged"}`,
    });
  });
  revalidatePath(`/${tenantSlug}/fleet/${input.vehicleId}`);
  revalidatePath(`/${tenantSlug}/operations`);
}
