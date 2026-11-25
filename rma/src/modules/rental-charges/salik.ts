import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ne } from "drizzle-orm";
import { rental } from "@/platform/db/schema";
import * as salik from "@/platform/integrations/salik/client";
import type { SalikJar } from "@/platform/integrations/salik/client";
import { parsePlate } from "@/lib/plates";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { upsertRentalCharge, vehiclesForChargeEntry } from "./core";
import { salikChargeReference } from "./salik-rules";

function salikAccounts(): Array<{ user: string; pass: string }> {
  const configuredPath = process.env.SALIK_ACCOUNTS_PATH?.trim();
  const path = configuredPath || join(/*turbopackIgnore: true*/ process.cwd(), "scripts", ".salik-accounts.json");
  if (!configuredPath && !existsSync(path)) return [];
  const accounts = JSON.parse(readFileSync(path, "utf8")) as Array<{ user?: string; pass?: string }>;
  if (!Array.isArray(accounts) || accounts.length === 0 || accounts.some((account) => !account.user || !account.pass)) {
    throw new Error("Salik accounts must contain at least one user and password");
  }
  return accounts as Array<{ user: string; pass: string }>;
}

export async function syncSalikCharges(home: string, actorId: string | null, vehicleId?: string, now = new Date()) {
  const accounts = salikAccounts();
  if (accounts.length === 0) return { configured: false, accountsReady: 0, vehicles: 0, found: 0, created: 0, skippedNoAccount: 0, errors: [] as string[] };
  const [vehicles, rentals] = await Promise.all([
    vehiclesForChargeEntry(home),
    withDrizzleTenant(home, (tx) => tx.select({ vehicleId: rental.vehicleId, startDate: rental.startDate }).from(rental).where(ne(rental.status, "cancelled"))),
  ]);
  const earliestStart = new Map<string, Date>();
  for (const row of rentals) {
    const current = earliestStart.get(row.vehicleId);
    if (!current || row.startDate < current) earliestStart.set(row.vehicleId, row.startDate);
  }
  const selected = vehicles.filter((vehicle) => (!vehicleId || vehicle.id === vehicleId) && (earliestStart.get(vehicle.id)?.getTime() ?? Infinity) <= now.getTime() && parsePlate(vehicle.plate));
  const ownership = new Map<string, { jar: SalikJar; colorId: string }>();
  const errors: string[] = [];
  let accountsReady = 0;

  for (const account of accounts) {
    try {
      const jar = await salik.login(account.user, account.pass);
      const salikVehicles = await salik.getVehicles(jar);
      for (const [plateNo, vehicle] of salikVehicles) {
        ownership.set(`${plateNo}|${vehicle.color.toUpperCase()}`, { jar, colorId: vehicle.colorId });
      }
      accountsReady++;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Salik account login failed");
    }
  }

  let found = 0;
  let created = 0;
  let skippedNoAccount = 0;
  for (const vehicle of selected) {
    const plate = parsePlate(vehicle.plate)!;
    const owner = ownership.get(`${plate.plateNo}|${plate.plateCode}`)
      ?? [...ownership.entries()].find(([key]) => key.startsWith(`${plate.plateNo}|`))?.[1];
    if (!owner) {
      skippedNoAccount++;
      continue;
    }
    try {
      const trips = await salik.getTollTrips(owner.jar, {
        plateNumber: plate.plateNo,
        colorId: owner.colorId,
        from: earliestStart.get(vehicle.id)!,
        to: now,
      });
      found += trips.length;
      for (const trip of trips) {
        if (!trip.date) {
          errors.push(`${vehicle.plate}: Salik returned a trip without a valid timestamp`);
          continue;
        }
        try {
          const saved = await upsertRentalCharge(home, actorId, {
            vehicleId: vehicle.id,
            kind: "salik",
            externalId: salikChargeReference({
              plateNo: plate.plateNo,
              plateCode: plate.plateCode,
              occurredAt: trip.date,
              amount: trip.amount,
              gate: trip.gate,
            }),
            occurredAt: trip.date,
            amount: trip.amount,
            description: trip.gate,
            location: trip.gate,
            source: "salik",
          });
          if (saved.created) created++;
        } catch (error) {
          errors.push(`${vehicle.plate}: ${error instanceof Error ? error.message : "Salik charge import failed"}`);
        }
      }
    } catch (error) {
      errors.push(`${vehicle.plate}: ${error instanceof Error ? error.message : "Salik trip lookup failed"}`);
    }
  }

  return { configured: true, accountsReady, vehicles: selected.length, found, created, skippedNoAccount, errors };
}
