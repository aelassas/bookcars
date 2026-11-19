import "server-only";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { customer, document, rental, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { canManageRentalsForTenant } from "./policies";

export async function getRentalOnboardingBoard(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const selection = { rental, customer, vehicle };
    const active = await tx.select(selection).from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .where(ne(rental.onboardingStage, "tars"))
      .orderBy(desc(rental.createdAt));
    const completed = await tx.select(selection).from(rental)
      .innerJoin(customer, eq(customer.id, rental.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .where(eq(rental.onboardingStage, "tars"))
      .orderBy(desc(rental.createdAt)).limit(20);
    const rows = [...active, ...completed];
    const customerIds = [...new Set(rows.map((row) => row.customer.id))];
    const docs = customerIds.length > 0
      ? await tx.select({ entityId: document.entityId }).from(document)
        .where(and(eq(document.entityType, "customer"), inArray(document.entityId, customerIds)))
      : [];
    return { rows, customersWithDocuments: new Set(docs.map((doc) => doc.entityId)) };
  });
}
