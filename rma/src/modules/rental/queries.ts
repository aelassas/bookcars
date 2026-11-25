"use server";

import { rental, customer, vehicle, payment, rentalCharge, document } from "@/platform/db/schema";
import { quoteRental, type Channel } from "@/platform/db/rental-extras";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, desc, sql, and, ne, lte, gte, or, inArray } from "drizzle-orm";
import { canManageRentalsForTenant } from "./policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { rentalPricingDays } from "./pricing";
import { getLiveVehicleOdometer } from "@/modules/fleet/telemetry";
import type { WebsiteCarPhoto } from "@/modules/fleet/website";

export async function getRentals(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: rentals are holding-wide and physically live in the fleet-home
  // tenant (imported from Babek's sheet). Authorize on the viewer's brand, but
  // READ from fleet-home so rent brands see the shared rental book instead of an
  // empty per-brand list (mirrors getCalendarSlots).
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
      .select({
        rental: rental,
        customerName: customer.name,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .orderBy(desc(rental.createdAt));
  });
}

export async function getRentalById(tenantId: string, id: string) {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: rentals live in fleet-home — read there (see getRentals).
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const rows = await tx
      .select({
        rental: rental,
        customerName: customer.name,
        customerPhone: customer.phone,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(eq(rental.id, id))
      .limit(1);
    return rows[0] ?? null;
  });
}

export type RentalOdometerPhoto = {
  id: string;
  filename: string;
  createdAt: Date;
  odometer: number | null;
};

function odometerMetadata(value: unknown): number | null {
  if (!value || typeof value !== "object" || !("odometer" in value)) return null;
  const reading = (value as { odometer?: unknown }).odometer;
  return typeof reading === "number" && Number.isInteger(reading) && reading >= 0 ? reading : null;
}

export type RentalWithDetails = {
  rental: typeof rental.$inferSelect;
  customerName: string | null;
  customerPhone: string | null;
  customerEmiratesId: string | null;
  customerDocumentsReviewedAt: Date | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVin: string | null;
  vehicleOdometer: number | null;
  vehiclePhotos: WebsiteCarPhoto[];
  liveVehicleOdometer: number | null;
  liveVehicleOdometerAt: Date | null;
  odometerPhotos: RentalOdometerPhoto[];
  payments: (typeof payment.$inferSelect)[];
  charges: (typeof rentalCharge.$inferSelect)[];
};

export async function getRentalWithDetails(tenantId: string, id: string): Promise<RentalWithDetails | null> {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: rentals live in fleet-home — read there so the detail page
  // resolves (was 404ing because it read the viewer's brand tenant).
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [row] = await tx
      .select({
        rental: rental,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmiratesId: customer.emiratesId,
        customerDocumentsReviewedAt: customer.documentsReviewedAt,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleVin: vehicle.vin,
        vehicleImei: vehicle.imei,
        vehicleOdometer: vehicle.odometer,
        vehiclePhotos: vehicle.photos,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(eq(rental.id, id))
      .limit(1);

    if (!row) return null;

    const [payments, charges, photoRows] = await Promise.all([
      tx.select().from(payment).where(eq(payment.rentalId, id)).orderBy(desc(payment.createdAt)),
      tx.select().from(rentalCharge).where(eq(rentalCharge.rentalId, id)).orderBy(desc(rentalCharge.occurredAt)),
      tx.select({ id: document.id, filename: document.filename, mimeType: document.mimeType, recognizedData: document.recognizedData, createdAt: document.createdAt })
        .from(document).where(and(
          eq(document.entityType, "rental"),
          eq(document.entityId, id),
          inArray(document.category, ["inspection", "odometer"]),
        )).orderBy(desc(document.createdAt)),
    ]);
    const live = await getLiveVehicleOdometer({ vin: row.vehicleVin, imei: row.vehicleImei, plate: row.vehiclePlate });
    const liveTimestamp = live?.lastFixAt ? Date.parse(live.lastFixAt) : NaN;
    return {
      ...row,
      vehicleOdometer: live ? Math.max(row.vehicleOdometer ?? 0, live.odometerKm) : row.vehicleOdometer,
      vehiclePhotos: row.vehiclePhotos ?? [],
      liveVehicleOdometer: live?.odometerKm ?? null,
      liveVehicleOdometerAt: Number.isFinite(liveTimestamp) ? new Date(liveTimestamp) : null,
      odometerPhotos: photoRows.filter((photo) => photo.mimeType.startsWith("image/")).map((photo) => ({
        id: photo.id,
        filename: photo.filename,
        createdAt: photo.createdAt,
        odometer: odometerMetadata(photo.recognizedData),
      })),
      payments,
      charges,
    };
  });
}

export async function getRentalsByStatus(tenantId: string, status: string) {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: rentals live in fleet-home; authz stays on the caller's brand.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
      .select({
        rental: rental,
        customerName: customer.name,
        vehiclePlate: vehicle.plate,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(eq(rental.status, status))
      .orderBy(desc(rental.createdAt));
  });
}

export async function getRentalsInDateRange(tenantId: string, start: Date, end: Date) {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: read from fleet-home (a brand-tenant read returns empty and
  // the old eq(rental.tenantId, tenantId) filter would hide every fleet-home row).
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
      .select({
        rental: {
          id: rental.id,
          vehicleId: rental.vehicleId,
          startDate: rental.startDate,
          returnDate: rental.returnDate,
          actualReturnDate: rental.actualReturnDate,
          status: rental.status,
          extensionStatus: rental.extensionStatus,
        },
        customerName: customer.name,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .where(
        and(
          lte(rental.startDate, end),
          or(
            gte(rental.returnDate, start),
            and(eq(rental.status, "active"), eq(rental.extensionStatus, "long_term")),
          ),
        )
      )
      .orderBy(rental.startDate);
  });
}

export async function getRentalCountsByStatus(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  // Shared fleet: counts over the fleet-home rentals, not the (empty) brand tenant.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const rows = await tx
      .select({ status: rental.status, count: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${rental.total}), 0)` })
      .from(rental)
      .groupBy(rental.status);
    return rows;
  });
}

// Vehicles for the rent booking calendar. Gated by the rentals permission
// (sales line + fleet + security) so EVERY rent-responsible user can open the
// calendar — getVehicles() is fleet/security-only and would 500 for sales.
// Shared fleet: the calendar shows the whole holding's fleet, not one brand.
export async function getRentVehicles(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  // Shared holding-wide fleet: access is checked on the viewer's brand, but the
  // vehicles live under the fleet-home tenant (take-auto), so read from there —
  // otherwise a rent brand (cardiwan/easyrent/etm) sees an empty fleet.
  // Sold cars leave operations entirely: no board row, no booking picklist.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate, status: vehicle.status })
      .from(vehicle)
      .where(and(eq(vehicle.division, "rent"), ne(vehicle.status, "sold")))
      .orderBy(vehicle.make, vehicle.model);
  });
}

// Live quote for the New-Booking UI — the exact same tier engine
// (quoteRental over the imported price_tier rows) that createRentalFromQuote
// uses at write time, so the number the user confirms is the number stored.
export type RentalQuoteResult =
  | {
      ok: true;
      quote: { dailyRate: number; days: number; subtotal: number; deposit: number; total: number; channel: Channel };
    }
  | { ok: false; days: number; error: string };

export async function getRentalQuote(
  tenantId: string,
  vehicleId: string,
  startDate: string,
  returnDate: string,
  channel: Channel = "b2c"
): Promise<RentalQuoteResult> {
  await canManageRentalsForTenant(tenantId);
  const start = new Date(startDate);
  const end = new Date(returnDate);
  if (!vehicleId || isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    return { ok: false, days: 0, error: "Pick a vehicle and a valid date range" };
  }
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  // Vehicles + price_tier live in the shared fleet-home tenant, so quote there
  // (authz above is still the caller's own brand). Without this, rent brands —
  // whose own price_tier is empty — always fail to quote and fall back to a
  // manual rate.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    try {
      const q = await quoteRental(tx, home, vehicleId, days, channel);
      const deposit = q.deposit ?? 0;
      const subtotal = q.dailyRate * rentalPricingDays(days);
      return {
        ok: true as const,
        quote: { dailyRate: q.dailyRate, days, subtotal, deposit, total: subtotal + deposit, channel },
      };
    } catch {
      return {
        ok: false as const,
        days,
        error: `No price tier for this vehicle (${channel}, ${days} day${days === 1 ? "" : "s"})`,
      };
    }
  });
}
