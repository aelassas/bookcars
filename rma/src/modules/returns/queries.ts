"use server";

import { rental, customer, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, and, gte, lte, desc, ne } from "drizzle-orm";
import { canManageRentalsForTenant } from "@/modules/rental/policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";

export async function getRentalsReturningToday(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Shared fleet lives in fleet-home — authorize on viewer's brand, read there.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
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
      .where(
        and(
          eq(rental.status, "active"),
          gte(rental.returnDate, startOfDay),
          lte(rental.returnDate, endOfDay)
        )
      )
      .orderBy(desc(rental.returnDate));
  });
}

/**
 * Cars due back in the next `days` days, TOMORROW onward (today already has
 * its own list above, and showing it twice reads as a duplicate).
 *
 * This list exists for one job: traffic fines land on the plate's owner and
 * surface days after the offence, so the only moment the money is still
 * recoverable is BEFORE the handover, while the deposit is in hand. The return
 * checklist has always been able to record that check — it was just never
 * shown until the day the car came back, by which point the useful window had
 * closed. Ordered soonest-first: the car coming back tomorrow is the one worth
 * looking up now.
 */
export async function getRentalsReturningSoon(tenantId: string, days = 7) {
  await canManageRentalsForTenant(tenantId);
  const now = new Date();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const horizon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1 + days);

  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
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
      .where(
        and(
          eq(rental.status, "active"),
          gte(rental.returnDate, startOfTomorrow),
          lte(rental.returnDate, horizon)
        )
      )
      .orderBy(rental.returnDate);
  });
}

export async function getRentalsOverdue(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  const now = new Date();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx
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
      .where(
        and(
          eq(rental.status, "active"),
          ne(rental.extensionStatus, "long_term"),
          lte(rental.returnDate, now)
        )
      )
      .orderBy(desc(rental.returnDate));
  });
}
