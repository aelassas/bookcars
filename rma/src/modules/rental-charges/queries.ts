"use server";

import { canManageRentalsForTenant } from "@/modules/rental/policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { listCharges, listChargesForRental, vehiclesForChargeEntry } from "./core";

export async function getRentalCharges(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  return listCharges(await requireFleetHomeTenantId());
}

export async function getRentalChargesForRental(tenantId: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  return listChargesForRental(await requireFleetHomeTenantId(), rentalId);
}

export async function getChargeVehicles(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  return vehiclesForChargeEntry(await requireFleetHomeTenantId());
}
