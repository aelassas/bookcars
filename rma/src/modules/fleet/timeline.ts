"use server";
import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { vehicle, rental, customer } from "@/platform/db/schema";
import { booking } from "@/platform/db/rental-extras";
import { canManageFleetForTenant } from "./policies";

export type TLBooking = {
  id: string;
  dateFrom: string | null;
  dateTo: string | null;
  customerName: string | null;
  status: string;
  /** "rental" = a live platform rental (clickable); "booking" = frozen sheet import. */
  source: "rental" | "booking";
};
export type TLVehicle = { id: string; plate: string; make: string; model: string; status: string; bookings: TLBooking[] };

const asDay = (d: Date | string | null): string | null =>
  d == null ? null : (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/**
 * Per-vehicle timeline: every car + its occupancy, busiest first. Merges LIVE
 * platform rentals with the legacy sheet-imported bookings — until 2026-07-26
 * this read only `booking`, so no rental created in the platform ever appeared
 * on the fleet timeline (Babek's calendar looked empty as the sheet ages out).
 * Display-level, RLS-scoped.
 */
export async function getFleetTimeline(tenantId: string, opts?: { days?: number }): Promise<{ vehicles: TLVehicle[]; days: number }> {
  await canManageFleetForTenant(tenantId);
  const days = opts?.days ?? 21;
  return withDrizzleTenant(tenantId, async (tx) => {
    const vs = await tx
      .select({ id: vehicle.id, plate: vehicle.plate, make: vehicle.make, model: vehicle.model, status: vehicle.status })
      .from(vehicle)
      .limit(500);
    const byVeh = new Map<string, TLBooking[]>();
    const push = (vehicleId: string, b: TLBooking) => {
      const arr = byVeh.get(vehicleId) ?? [];
      arr.push(b);
      byVeh.set(vehicleId, arr);
    };

    // Live platform rentals (the canonical source going forward).
    const rs = await tx
      .select({
        id: rental.id, vehicleId: rental.vehicleId, startDate: rental.startDate,
        returnDate: rental.returnDate, actualReturnDate: rental.actualReturnDate,
        status: rental.status, customerName: customer.name,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id));
    for (const r of rs) {
      push(r.vehicleId, {
        id: r.id,
        dateFrom: asDay(r.startDate),
        dateTo: asDay(r.actualReturnDate ?? r.returnDate),
        customerName: r.customerName,
        status: r.status,
        source: "rental",
      });
    }

    // Legacy sheet bookings — display-only, nothing new is written here.
    const bs = await tx
      .select({ id: booking.id, vehicleId: booking.vehicleId, dateFrom: booking.dateFrom, dateTo: booking.dateTo, customerName: booking.customerName, status: booking.status })
      .from(booking);
    for (const b of bs) {
      push(b.vehicleId, { id: b.id, dateFrom: b.dateFrom, dateTo: b.dateTo, customerName: b.customerName, status: b.status, source: "booking" });
    }

    const vehicles: TLVehicle[] = vs.map((v) => ({ ...v, bookings: byVeh.get(v.id) ?? [] }));
    vehicles.sort((a, b) => b.bookings.length - a.bookings.length);
    return { vehicles, days };
  });
}
