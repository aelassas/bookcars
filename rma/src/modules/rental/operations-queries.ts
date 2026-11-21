"use server";

import { asc, desc, eq, inArray, ne } from "drizzle-orm";
import { customer, rental, rentalCharge, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { getPilotClient } from "@/platform/integrations/pilot/client";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { serviceState } from "@/modules/fleet/maintenance";
import { calculateMileageUsage } from "./mileage";
import { canManageRentalsForTenant } from "./policies";

export async function getOperationsBoard(tenantId: string) {
  await canManageRentalsForTenant(tenantId);
  const home = await requireFleetHomeTenantId();
  const rows = await withDrizzleTenant(home, async (tx) => {
    const [vehicles, rentals, charges] = await Promise.all([
      tx.select().from(vehicle).where(ne(vehicle.status, "sold")).orderBy(asc(vehicle.plate)),
      tx.select({ rental, customerName: customer.name }).from(rental).innerJoin(customer, eq(customer.id, rental.customerId))
        .where(inArray(rental.status, ["active", "reserved"])).orderBy(asc(rental.returnDate)),
      tx.select().from(rentalCharge).orderBy(desc(rentalCharge.occurredAt)),
    ]);
    return vehicles.map((car) => {
      const rentalRow = rentals.find((row) => row.rental.vehicleId === car.id && row.rental.status === "active")
        ?? rentals.find((row) => row.rental.vehicleId === car.id);
      const currentRental = rentalRow?.rental ?? null;
      const vehicleCharges = charges.filter((charge) => charge.vehicleId === car.id && charge.status !== "void");
      const outstandingCharges = Math.round(vehicleCharges.filter((charge) => charge.status !== "paid").reduce((sum, charge) => sum + charge.amount, 0) * 100) / 100;
      const chargeSummary = (kind: string) => {
        const rows = vehicleCharges.filter((charge) => charge.kind === kind);
        return {
          count: rows.length,
          unpaid: Math.round(rows.filter((charge) => charge.status !== "paid").reduce((sum, charge) => sum + charge.amount, 0) * 100) / 100,
        };
      };
      const mileage = currentRental ? calculateMileageUsage({
        startOdometer: currentRental.startOdometer,
        finalOdometer: currentRental.status === "active" ? car.odometer : currentRental.finalOdometer,
        dailyMileageLimitKm: currentRental.dailyMileageLimitKm,
        totalDays: currentRental.totalDays,
      }) : null;
      const service = serviceState({
        currentOdometer: car.odometer,
        lastServiceOdometer: car.lastServiceOdometer,
        nextServiceOdometer: car.nextServiceOdometer,
        warningIntervalKm: car.oilChangeIntervalKm,
        limitIntervalKm: car.serviceLimitIntervalKm,
      });
      return {
        vehicle: car,
        rental: currentRental,
        customerName: rentalRow?.customerName ?? null,
        charges: {
          fines: chargeSummary("fine"),
          salik: chargeSummary("salik"),
          parkin: chargeSummary("parkin"),
          parkonic: chargeSummary("parkonic"),
          outstanding: outstandingCharges,
        },
        totalDebt: (currentRental?.balanceDue ?? 0) + outstandingCharges,
        mileage,
        service,
      };
    });
  });

  const baseRows = rows.map((row) => ({
    ...row,
    telemetry: null as null | { lastFixAt: string; fresh: boolean; speed: number; ignition: boolean },
    overdue: row.rental?.status === "active" && row.rental.returnDate.getTime() < Date.now(),
  }));

  try {
    const live = await getPilotClient().getFleet();
    const byImei = new Map(live.map((car) => [car.imei, car]));
    return baseRows.map((row) => {
      const telemetry = row.vehicle.imei ? byImei.get(row.vehicle.imei) : undefined;
      if (!telemetry) return row;
      const currentOdometer = Math.max(row.vehicle.odometer, Math.round(telemetry.odometerKm));
      const lastFixMs = Date.parse(telemetry.lastFixAt);
      const updated: (typeof baseRows)[number] = {
        ...row,
        vehicle: { ...row.vehicle, odometer: currentOdometer, gpsBlocked: telemetry.blocked },
        telemetry: {
          lastFixAt: telemetry.lastFixAt,
          fresh: Number.isFinite(lastFixMs) && Date.now() - lastFixMs >= 0 && Date.now() - lastFixMs <= 5 * 60_000,
          speed: telemetry.speed,
          ignition: telemetry.ignition,
        },
      };
      if (row.rental?.status === "active" && row.mileage) {
        updated.mileage = calculateMileageUsage({
          startOdometer: row.rental.startOdometer,
          finalOdometer: currentOdometer,
          dailyMileageLimitKm: row.rental.dailyMileageLimitKm,
          totalDays: row.rental.totalDays,
        });
      }
      updated.service = serviceState({
        currentOdometer,
        lastServiceOdometer: row.vehicle.lastServiceOdometer,
        nextServiceOdometer: row.vehicle.nextServiceOdometer,
        warningIntervalKm: row.vehicle.oilChangeIntervalKm,
        limitIntervalKm: row.vehicle.serviceLimitIntervalKm,
      });
      return updated;
    });
  } catch {
    return baseRows;
  }
}
