"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditEvent, document, lease, rental, tenant, vehicle, vehicleTimelineEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireAuth } from "@/platform/auth/authorization";
import { canManageFleetForTenant } from "./policies";
import { EDITABLE_VEHICLE_STATUSES } from "./vehicle-options";

/**
 * Editable vehicle fields. Everything optional — the Edit vehicle form sends
 * the full set, the "Log service" flow sends only the nextService* pair.
 * `nextServiceDate` is the wire format of a pg `date` column: "YYYY-MM-DD".
 */
export interface UpdateVehicleInput {
  make?: string;
  model?: string;
  year?: number | null;
  plate?: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  odometer?: number;
  location?: string | null;
  nextServiceDate?: string | null;
  nextServiceOdometer?: number | null;
  oilChangeIntervalKm?: number;
  /** Lifecycle status — only the manager-set values. on_rent/reserved are
   *  derived from active rentals and are never accepted here. */
  status?: (typeof EDITABLE_VEHICLE_STATUSES)[number];
}

function assertNonNegativeInt(value: number, field: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
}

export async function updateVehicle(
  tenantId: string,
  vehicleId: string,
  data: UpdateVehicleInput,
) {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);

  if (data.plate !== undefined && !data.plate.trim()) {
    throw new Error("Plate must not be empty");
  }
  if (data.dailyRate !== undefined) assertNonNegativeInt(data.dailyRate, "Daily rate");
  if (data.weeklyRate !== undefined) assertNonNegativeInt(data.weeklyRate, "Weekly rate");
  if (data.monthlyRate !== undefined) assertNonNegativeInt(data.monthlyRate, "Monthly rate");
  if (data.odometer !== undefined) assertNonNegativeInt(data.odometer, "Odometer");
  if (data.nextServiceOdometer !== undefined && data.nextServiceOdometer !== null) {
    assertNonNegativeInt(data.nextServiceOdometer, "Next service odometer");
  }
  if (data.oilChangeIntervalKm !== undefined && (!Number.isInteger(data.oilChangeIntervalKm) || data.oilChangeIntervalKm <= 0)) {
    throw new Error("Oil change interval must be a positive integer");
  }
  if (data.year !== undefined && data.year !== null) {
    if (!Number.isInteger(data.year) || data.year < 1900 || data.year > 2100) {
      throw new Error("Year must be between 1900 and 2100");
    }
  }
  if (data.nextServiceDate !== undefined && data.nextServiceDate !== null) {
    if (Number.isNaN(new Date(data.nextServiceDate).getTime())) {
      throw new Error("Invalid next service date");
    }
  }
  if (data.status !== undefined && !EDITABLE_VEHICLE_STATUSES.includes(data.status)) {
    throw new Error(`Status must be one of: ${EDITABLE_VEHICLE_STATUSES.join(", ")}`);
  }

  const set: Partial<typeof vehicle.$inferInsert> = { updatedAt: new Date() };
  if (data.make !== undefined) set.make = data.make.trim();
  if (data.model !== undefined) set.model = data.model.trim();
  if (data.year !== undefined) set.year = data.year;
  if (data.plate !== undefined) set.plate = data.plate.trim();
  if (data.dailyRate !== undefined) set.dailyRate = data.dailyRate;
  if (data.weeklyRate !== undefined) set.weeklyRate = data.weeklyRate;
  if (data.monthlyRate !== undefined) set.monthlyRate = data.monthlyRate;
  if (data.odometer !== undefined) set.odometer = data.odometer;
  if (data.location !== undefined) set.location = data.location;
  if (data.nextServiceDate !== undefined) set.nextServiceDate = data.nextServiceDate;
  if (data.nextServiceOdometer !== undefined) set.nextServiceOdometer = data.nextServiceOdometer;
  if (data.oilChangeIntervalKm !== undefined) set.oilChangeIntervalKm = data.oilChangeIntervalKm;
  if (data.status !== undefined) set.status = data.status;

  const { slug } = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .update(vehicle)
      .set(set)
      .where(eq(vehicle.id, vehicleId))
      .returning({ id: vehicle.id });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) throw new Error("Vehicle not found");

    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "vehicle.update",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Updated fields: ${Object.keys(set).filter((k) => k !== "updatedAt").join(", ")}`,
    });

    const t = await tx
      .select({ slug: tenant.slug })
      .from(tenant)
      .where(eq(tenant.id, tenantId));
    return { slug: t[0]?.slug ?? null };
  });

  if (slug) {
    revalidatePath(`/${slug}/fleet/${vehicleId}`);
    revalidatePath(`/${slug}/fleet`);
  }
}

export async function deleteVehicle(tenantId: string, vehicleId: string, confirmation: string): Promise<{ error: string | null; canMarkSold?: boolean }> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  if (confirmation !== "DELETE") return { error: "Type DELETE to confirm" };

  const result: { error: string | null; canMarkSold?: boolean; slug?: string } = await withDrizzleTenant(tenantId, async (tx) => {
    const [target] = await tx.select({ plate: vehicle.plate }).from(vehicle).where(eq(vehicle.id, vehicleId)).limit(1);
    if (!target) return { error: "Vehicle not found" };

    const [linkedRental] = await tx.select({ id: rental.id }).from(rental).where(eq(rental.vehicleId, vehicleId)).limit(1);
    const [linkedLease] = await tx.select({ id: lease.id }).from(lease).where(eq(lease.vehicleId, vehicleId)).limit(1);
    const [linkedEvent] = await tx.select({ id: vehicleTimelineEvent.id }).from(vehicleTimelineEvent).where(eq(vehicleTimelineEvent.vehicleId, vehicleId)).limit(1);
    const [linkedDocument] = await tx.select({ id: document.id }).from(document).where(and(eq(document.entityType, "vehicle"), eq(document.entityId, vehicleId))).limit(1);
    if (linkedRental || linkedLease || linkedEvent || linkedDocument) {
      return {
        error: "This vehicle has linked history. Mark it Sold instead of deleting it",
        canMarkSold: true,
      };
    }

    // Soft-delete so the car is removed from every operational view but the
    // archive page can still surface it and the audit trail stays intact.
    await tx.update(vehicle).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(vehicle.id, vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.delete",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Archived (soft-delete) unused vehicle ${target.plate}`,
    });
    const [t] = await tx.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    return { error: null, slug: t?.slug };
  });

  if (result.slug) {
    revalidatePath(`/${result.slug}/fleet/${vehicleId}`);
    revalidatePath(`/${result.slug}/fleet`);
  }
  return { error: result.error, canMarkSold: result.canMarkSold };
}

/**
 * Flip a vehicle to "sold" without going through the full Edit form. Used as
 * the one-click fallback when delete is blocked by linked history — the owner
 * wants the car out of operations, not out of the database.
 */
export async function markVehicleAsSold(tenantId: string, vehicleId: string): Promise<{ error: string | null }> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();

  const { slug } = await withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ status: vehicle.status, plate: vehicle.plate }).from(vehicle).where(eq(vehicle.id, vehicleId)).limit(1);
    if (!current) throw new Error("Vehicle not found");
    // Reserved / on_rent are live rental handoffs — flipping those to sold
    // would orphan an active rental, so the one-click button must not bypass
    // them. "overdue" (engine blocked / rental past its return date) is a
    // problem state the owner retires, not a live handoff, so it IS sellable.
    if (current.status === "reserved" || current.status === "on_rent") {
      throw new Error(
        `Cannot mark a ${current.status} vehicle as sold — settle the active rental first`,
      );
    }
    await tx.update(vehicle).set({ status: "sold", updatedAt: new Date() }).where(eq(vehicle.id, vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.markSold",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Marked ${current.plate} as sold (delete blocked by linked history)`,
    });
    const [t] = await tx.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    return { slug: t?.slug ?? null };
  });

  if (slug) {
    revalidatePath(`/${slug}/fleet/${vehicleId}`);
    revalidatePath(`/${slug}/fleet`);
  }
  return { error: null };
}

/**
 * Bring a soft-deleted vehicle back into the operational fleet. Flipping the
 * status to `in_service` makes the recovery explicit — the car is in the DB
 * but should be inspected before it can be rented again.
 */
export async function restoreVehicle(tenantId: string, vehicleId: string): Promise<void> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();

  const { slug } = await withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx
      .select({ plate: vehicle.plate, deletedAt: vehicle.deletedAt })
      .from(vehicle)
      .where(eq(vehicle.id, vehicleId))
      .limit(1);
    if (!current) throw new Error("Vehicle not found");
    if (!current.deletedAt) throw new Error("Vehicle is already active");

    await tx
      .update(vehicle)
      .set({ deletedAt: null, status: "in_service", updatedAt: new Date() })
      .where(eq(vehicle.id, vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.restore",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `Restored vehicle ${current.plate} from archive`,
    });
    const [t] = await tx.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    return { slug: t?.slug ?? null };
  });

  if (slug) {
    revalidatePath(`/${slug}/fleet/${vehicleId}`);
    revalidatePath(`/${slug}/fleet`);
  }
}

