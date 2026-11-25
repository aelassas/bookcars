"use server";

import { customer, rental, lease, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, desc, sql, or, ilike, count } from "drizzle-orm";
import { canManageCRMForTenant } from "./policies";
import { companyScope } from "@/platform/auth/scope";

export async function getCustomers(tenantId: string) {
  await canManageCRMForTenant(tenantId);
  const scope = await companyScope(tenantId, customer.companyId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(customer).where(scope ?? sql`true`).orderBy(desc(customer.createdAt));
  });
}

/** Customer + their rental and lease contracts (for the detail card). */
export async function getCustomerDetail(tenantId: string, id: string) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const [c] = await tx.select().from(customer).where(eq(customer.id, id)).limit(1);
    if (!c) return null;
    const rentals = await tx
      .select({ rental, vehicleMake: vehicle.make, vehicleModel: vehicle.model, vehiclePlate: vehicle.plate })
      .from(rental)
      .leftJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(eq(rental.customerId, id))
      .orderBy(desc(rental.createdAt));
    const leases = await tx
      .select({ lease, vehicleMake: vehicle.make, vehicleModel: vehicle.model, vehiclePlate: vehicle.plate })
      .from(lease)
      .leftJoin(vehicle, eq(lease.vehicleId, vehicle.id))
      .where(eq(lease.customerId, id))
      .orderBy(desc(lease.createdAt));
    return { customer: c, rentals, leases };
  });
}

export async function getCustomerById(tenantId: string, id: string) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx.select().from(customer).where(eq(customer.id, id));
    return rows[0] ?? null;
  });
}

export async function getCustomerCountsBySource(tenantId: string) {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ source: customer.source, count: sql<number>`count(*)` })
      .from(customer)
      .groupBy(customer.source);
    return rows;
  });
}

/**
 * Paginated customer directory with optional name/phone search.
 * Replaces the unbounded getCustomers() for the customers list page —
 * the table has ~59k rows so we never SELECT them all.
 */
export async function getCustomersPaginated(
  tenantId: string,
  opts: { page: number; pageSize: number; search?: string }
) {
  await canManageCRMForTenant(tenantId);
  const scope = await companyScope(tenantId, customer.companyId);
  const { search } = opts;
  const pageSize = Math.max(1, Math.min(100, Math.floor(opts.pageSize) || 50));

  return withDrizzleTenant(tenantId, async (tx) => {
    const searchCond = search
      ? or(ilike(customer.name, `%${search}%`), ilike(customer.phone, `%${search}%`), ilike(customer.email, `%${search}%`))
      : undefined;

    const baseCond = scope ? scope : sql`true`;
    const fullCond = searchCond ? sql`(${baseCond}) AND (${searchCond})` : baseCond;

    const [{ total }] = await tx
      .select({ total: count() })
      .from(customer)
      .where(fullCond);

    const page = Math.max(1, Math.min(Math.floor(opts.page) || 1, Math.max(1, Math.ceil(total / pageSize))));
    const rows = await tx
      .select()
      .from(customer)
      .where(fullCond)
      .orderBy(desc(customer.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { rows, total, page };
  });
}
