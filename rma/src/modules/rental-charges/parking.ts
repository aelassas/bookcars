import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, inArray, lte, ne, sql } from "drizzle-orm";
import { rental } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  httpParkingConnector,
  normalizeParkingPlate,
  PARKING_OPERATORS,
  parseParkingCsv,
  type ParkingEvent,
  type ParkingOperator,
} from "@/platform/integrations/parking/connectors";
import { upsertRentalCharge, vehiclesForChargeEntry } from "./core";

async function coveringVehicleIds(home: string, vehicleIds: string[], occurredAt: Date): Promise<Set<string>> {
  return withDrizzleTenant(home, async (tx) => {
    const rows = await tx.select({ vehicleId: rental.vehicleId }).from(rental).where(and(
      inArray(rental.vehicleId, vehicleIds),
      ne(rental.status, "cancelled"),
      lte(rental.startDate, occurredAt),
      sql`coalesce(${rental.actualReturnDate}, ${rental.returnDate}) >= ${occurredAt}`,
    ));
    return new Set(rows.map((row) => row.vehicleId));
  });
}

export async function importParkingEvents(home: string, actorId: string | null, operator: ParkingOperator, events: ParkingEvent[]) {
  const vehicles = await vehiclesForChargeEntry(home);
  const byPlate = new Map<string, typeof vehicles>();
  for (const vehicle of vehicles) {
    const key = normalizeParkingPlate(vehicle.plate);
    const rows = byPlate.get(key) ?? [];
    rows.push(vehicle);
    byPlate.set(key, rows);
  }
  let created = 0;
  let duplicates = 0;
  const errors: string[] = [];
  for (const event of events) {
    try {
      const candidates = byPlate.get(normalizeParkingPlate(event.plate)) ?? [];
      if (candidates.length === 0) throw new Error(`No CRM vehicle matches plate ${event.plate}`);
      let vehicleId = candidates[0].id;
      if (candidates.length > 1) {
        const covering = await coveringVehicleIds(home, candidates.map((vehicle) => vehicle.id), event.occurredAt);
        if (covering.size !== 1) throw new Error(`Plate ${event.plate} matches ${candidates.length} vehicles and ${covering.size} covering rentals; resolve the VIN/plate mapping first`);
        vehicleId = [...covering][0];
      }
      const saved = await upsertRentalCharge(home, actorId, {
        vehicleId,
        kind: operator,
        externalId: event.reference,
        occurredAt: event.occurredAt,
        amount: event.amount,
        description: event.description,
        location: event.location,
        source: operator,
      });
      if (saved.created) created++;
      else duplicates++;
    } catch (error) {
      errors.push(`${event.reference}: ${error instanceof Error ? error.message : "Parking import failed"}`);
    }
  }
  return { operator, found: events.length, created, duplicates, errors };
}

async function earliestRentalStart(home: string, now: Date): Promise<Date> {
  return withDrizzleTenant(home, async (tx) => {
    const [row] = await tx.select({ startDate: rental.startDate }).from(rental)
      .where(ne(rental.status, "cancelled")).orderBy(asc(rental.startDate)).limit(1);
    return row?.startDate ?? new Date(now.getTime() - 86_400_000);
  });
}

async function fileFallback(operator: ParkingOperator): Promise<ParkingEvent[] | null> {
  const dir = process.env.PARKING_IMPORT_DIR?.trim();
  if (!dir) return null;
  try {
    return parseParkingCsv(await readFile(path.join(dir, `${operator}.csv`), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function syncParkingCharges(home: string, actorId: string | null, vehicleId?: string, now = new Date()) {
  const from = await earliestRentalStart(home, now);
  const selectedVehicles = await vehiclesForChargeEntry(home);
  const selected = vehicleId ? selectedVehicles.find((vehicle) => vehicle.id === vehicleId) : null;
  if (vehicleId && !selected) throw new Error("Vehicle not found");
  const results = [];
  for (const operator of PARKING_OPERATORS) {
    const connector = httpParkingConnector(operator);
    const batches: ParkingEvent[][] = [];
    const errors: string[] = [];
    if (connector) {
      try {
        batches.push(await connector.pull(from, now));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${operator} API failed`);
      }
    }
    try {
      const fallback = await fileFallback(operator);
      if (fallback) batches.push(fallback);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${operator} CSV import failed`);
    }
    const events = batches.flat().filter((event) => !selected || normalizeParkingPlate(event.plate) === normalizeParkingPlate(selected.plate));
    const imported = await importParkingEvents(home, actorId, operator, events);
    results.push({ ...imported, configured: Boolean(connector || process.env.PARKING_IMPORT_DIR), errors: [...errors, ...imported.errors] });
  }
  return { from: from.toISOString(), to: now.toISOString(), results };
}
