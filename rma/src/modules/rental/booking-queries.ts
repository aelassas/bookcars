"use server";

import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { booking } from "@/platform/db/rental-extras";
import { rental, customer, user } from "@/platform/db/schema";
import { canManageRentalsForTenant } from "./policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";

// One slot on the availability calendar. Two sources, one shape:
//   * "rental"  — canonical platform rentals (the `rental` table; clickable,
//     they have a detail page).
//   * "booking" — legacy rows imported from Babek's sheet (the `booking`
//     table; display-only, nothing new is ever written there).
export type CalendarSlot = {
  rental: {
    id: string;
    vehicleId: string;
    startDate: Date | null;
    returnDate: Date | null;
    actualReturnDate: Date | null;
    status: string;
  };
  customerName: string | null;
  // Manager who owns the booking (rental.salesAgent). Null for imported sheet
  // rows. Shown on the board tag ("who holds it") and in the detail card.
  salesAgentName: string | null;
  source: "rental" | "booking";
};

/**
 * Unified calendar read: canonical rentals + legacy imported bookings in one
 * list. Fixes the old split where the initial page load showed only `booking`
 * rows and month navigation showed only `rental` rows.
 */
export async function getCalendarSlots(tenantId: string, start: Date, end: Date): Promise<CalendarSlot[]> {
  await canManageRentalsForTenant(tenantId);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  // Shared holding-wide fleet: the calendar lives under the fleet-home tenant
  // (take-auto). Access checked on the viewer's brand above; read from home so
  // rent brands don't see an empty calendar.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [rentalRows, bookingRows] = await Promise.all([
      tx
        .select({
          id: rental.id,
          vehicleId: rental.vehicleId,
          startDate: rental.startDate,
          returnDate: rental.returnDate,
          actualReturnDate: rental.actualReturnDate,
          status: rental.status,
          customerName: customer.name,
          salesAgentName: user.name,
        })
        .from(rental)
        .leftJoin(customer, eq(rental.customerId, customer.id))
        .leftJoin(user, eq(rental.salesAgentId, user.id))
        .where(and(lte(rental.startDate, end), gte(rental.returnDate, start)))
        .orderBy(rental.startDate),
      tx
        .select({
          id: booking.id,
          vehicleId: booking.vehicleId,
          dateFrom: booking.dateFrom,
          dateTo: booking.dateTo,
          status: booking.status,
          customerName: booking.customerName,
        })
        .from(booking)
        .where(and(inArray(booking.status, ["booked", "active", "returned"]), lte(booking.dateFrom, endStr), gte(booking.dateTo, startStr))),
    ]);

    const slots: CalendarSlot[] = rentalRows.map((r) => ({
      rental: {
        id: r.id,
        vehicleId: r.vehicleId,
        startDate: r.startDate,
        returnDate: r.returnDate,
        actualReturnDate: r.actualReturnDate,
        status: r.status,
      },
      customerName: r.customerName ?? null,
      salesAgentName: r.salesAgentName ?? null,
      source: "rental" as const,
    }));

    for (const b of bookingRows) {
      slots.push({
        rental: {
          id: b.id,
          vehicleId: b.vehicleId,
          startDate: b.dateFrom ? new Date(b.dateFrom) : null,
          returnDate: b.dateTo ? new Date(b.dateTo) : null,
          actualReturnDate: null,
          // Map the sheet's "booked" onto the canonical "reserved" tone.
          status: b.status === "booked" ? "reserved" : b.status,
        },
        customerName: b.customerName ?? null,
        salesAgentName: null, // imported sheet rows have no platform manager
        source: "booking" as const,
      });
    }
    return slots;
  });
}
