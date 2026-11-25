"use server";

import { db } from "@/platform/db/client";
import { tenant, customer, rental, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, and } from "drizzle-orm";
import { auth } from "@/platform/auth";

// Portal data is ALWAYS scoped to the authenticated user's own email — the
// caller cannot pass an arbitrary email to read another customer's rentals.
export async function getPortalData(tenantSlug: string) {
  const session = await auth();
  const customerEmail = session?.user?.email;
  if (!customerEmail) return null;

  const tenantRow = await db.select().from(tenant).where(eq(tenant.slug, tenantSlug)).limit(1).then((r) => r[0] ?? null);
  if (!tenantRow) return null;

  return withDrizzleTenant(tenantRow.id, async (tx) => {
    const cust = await tx
      .select()
      .from(customer)
      .where(and(eq(customer.tenantId, tenantRow.id), eq(customer.email, customerEmail.toLowerCase())))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!cust) return null;

    const rentals = await tx
      .select({
        rental: rental,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehiclePlate: vehicle.plate,
        vehicleYear: vehicle.year,
      })
      .from(rental)
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(and(eq(rental.tenantId, tenantRow.id), eq(rental.customerId, cust.id)))
      .orderBy(rental.startDate);

    return { customer: cust, rentals };
  });
}
