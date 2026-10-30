"use server";

import { lease, leaseInstallment, leasePayment, customer, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, desc, sql, asc } from "drizzle-orm";
import { canManageLeasesForTenant } from "./policies";
import { companyReadScope } from "@/platform/auth/scope";

export async function getLeases(tenantId: string) {
  await canManageLeasesForTenant(tenantId);
  // Shared fleet: leases are holding-wide for any lease-role member.
  const scope = await companyReadScope(tenantId, lease.companyId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx
      .select({
        lease: lease,
        customerName: customer.name,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      })
      .from(lease)
      .innerJoin(customer, eq(lease.customerId, customer.id))
      .innerJoin(vehicle, eq(lease.vehicleId, vehicle.id))
      .where(scope ?? sql`true`)
      .orderBy(desc(lease.createdAt));
  });
}

export type LeaseRow = Awaited<ReturnType<typeof getLeases>>[number];

export type LeaseWithDetails = {
  lease: typeof lease.$inferSelect;
  customerName: string | null;
  customerPhone: string | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  installments: (typeof leaseInstallment.$inferSelect)[];
  payments: (typeof leasePayment.$inferSelect)[];
};

export async function getLeaseWithDetails(tenantId: string, id: string): Promise<LeaseWithDetails | null> {
  await canManageLeasesForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        lease: lease,
        customerName: customer.name,
        customerPhone: customer.phone,
        vehiclePlate: vehicle.plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      })
      .from(lease)
      .innerJoin(customer, eq(lease.customerId, customer.id))
      .innerJoin(vehicle, eq(lease.vehicleId, vehicle.id))
      .where(eq(lease.id, id))
      .limit(1);

    if (!row) return null;

    const installments = await tx
      .select()
      .from(leaseInstallment)
      .where(eq(leaseInstallment.leaseId, id))
      .orderBy(asc(leaseInstallment.installmentNumber));

    const payments = await tx
      .select()
      .from(leasePayment)
      .where(eq(leasePayment.leaseId, id))
      .orderBy(desc(leasePayment.createdAt));

    return { ...row, installments, payments };
  });
}

export async function getLeaseVehiclesAndCustomers(tenantId: string) {
  await canManageLeasesForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const vehicles = await tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate })
      .from(vehicle)
      .where(eq(vehicle.division, "lease"))
      .orderBy(vehicle.plate);

    const customers = await tx
      .select({ id: customer.id, name: customer.name, phone: customer.phone })
      .from(customer)
      .where(eq(customer.division, "lease"))
      .orderBy(customer.name);

    return { vehicles, customers };
  });
}

export async function getLeaseCountsByStatus(tenantId: string) {
  await canManageLeasesForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ status: lease.status, count: sql<number>`count(*)`, value: sql<number>`coalesce(sum(${lease.totalAmount}), 0)` })
      .from(lease)
      .groupBy(lease.status);
    return rows;
  });
}
