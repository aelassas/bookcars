"use server";

import { rental, customer, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, and, or, lte, isNull, sql } from "drizzle-orm";
import { canManageCollectionsForTenant } from "./policies";
import { companyScope } from "@/platform/auth/scope";

export async function getCollectionsRentals(tenantId: string) {
  await canManageCollectionsForTenant(tenantId);
  const now = new Date();
  // Cross-branch viewers get no company predicate (see all, incl. legacy
  // NULL-company rows). Scoped viewers keep their company filter but stay
  // tolerant of legacy NULL-company rentals so unassigned overdue debt is not
  // silently hidden from them.
  const scope = await companyScope(tenantId, rental.companyId);
  const companyPredicate = scope ? or(scope, isNull(rental.companyId)) : undefined;
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx
      .select({
        rental: rental,
        customerName: customer.name,
        customerPhone: customer.phone,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleImei: vehicle.imei,
        gpsBlocked: vehicle.gpsBlocked,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(
        and(
          eq(rental.status, "active"),
          lte(rental.returnDate, now),
          sql`${rental.balanceDue} > 0`,
          companyPredicate
        )
      )
      .orderBy(sql`${rental.balanceDue} desc`);
  });
}
