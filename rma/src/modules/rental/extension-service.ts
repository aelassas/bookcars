import "server-only";

import { and, eq, gte, inArray, lte, ne, or } from "drizzle-orm";
import { auditEvent, rental, vehicleTimelineEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { booking as legacyBooking } from "@/platform/db/rental-extras";

export async function confirmRentalExtensionForTenant(home: string, actorId: string | null, rentalId: string, newReturnDate: Date): Promise<void> {
  await withDrizzleTenant(home, async (tx) => {
    if (!(newReturnDate instanceof Date) || Number.isNaN(newReturnDate.getTime())) throw new Error("Enter a valid new return date");
    const [current] = await tx.select().from(rental).where(eq(rental.id, rentalId)).for("update").limit(1);
    if (!current || !["reserved", "active"].includes(current.status)) throw new Error("Only an active or reserved rental can be extended");
    if (newReturnDate <= current.returnDate) throw new Error("New return must be later than the current return date");
    const [overlap] = await tx.select({ id: rental.id }).from(rental).where(and(
      eq(rental.vehicleId, current.vehicleId),
      inArray(rental.status, ["reserved", "active"]),
      ne(rental.id, rentalId),
      or(
        and(lte(rental.startDate, newReturnDate), gte(rental.returnDate, current.returnDate)),
        and(eq(rental.status, "active"), eq(rental.extensionStatus, "long_term")),
      ),
    )).limit(1);
    if (overlap) throw new Error("Another booking overlaps the extension period");
    const [legacyOverlap] = await tx.select({ id: legacyBooking.id }).from(legacyBooking).where(and(
      eq(legacyBooking.vehicleId, current.vehicleId),
      inArray(legacyBooking.status, ["booked", "active"]),
      lte(legacyBooking.dateFrom, newReturnDate.toISOString().slice(0, 10)),
      gte(legacyBooking.dateTo, current.returnDate.toISOString().slice(0, 10)),
    )).limit(1);
    if (legacyOverlap) throw new Error("An imported calendar booking overlaps the extension period");
    const extraDays = Math.max(1, Math.ceil((newReturnDate.getTime() - current.returnDate.getTime()) / 86_400_000));
    const extraTotal = extraDays * current.dailyRate;
    await tx.update(rental).set({
      returnDate: newReturnDate,
      totalDays: current.totalDays + extraDays,
      total: current.total + extraTotal,
      balanceDue: current.balanceDue + extraTotal,
      extensionStatus: "extension_confirmed",
      returnReminderSentAt: null,
      customerResponseAt: null,
      customerResponse: null,
      updatedAt: new Date(),
    }).where(eq(rental.id, rentalId));
    await tx.update(vehicleTimelineEvent).set({ endsAt: newReturnDate, updatedAt: new Date() }).where(eq(vehicleTimelineEvent.rentalId, rentalId));
    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId,
      action: "rental.extension.confirmed",
      entityType: "rental",
      entityId: rentalId,
      intent: `Manager extended return to ${newReturnDate.toISOString()}; ${extraDays} paid days and ${extraTotal} AED added`,
    });
  });
}
