import { config } from "dotenv";
config({ path: ".env.local" });

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { customer, engineBlock, message, payment, rental, rentalCharge, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { createTestTenant } from "@/test/db";
import { upsertRentalCharge, vehiclesForChargeEntry } from "@/modules/rental-charges/core";
import { importParkingEvents } from "@/modules/rental-charges/parking";
import { confirmRentalExtensionForTenant } from "@/modules/rental/extension-service";
import { lookupFines } from "@/platform/integrations/rta/client";
import * as salik from "@/platform/integrations/salik/client";
import { parsePlate } from "@/lib/plates";

const testFixture = process.argv.includes("--commit-test-fixture");
const liveRead = process.argv.includes("--live-read");

async function runTestFixture() {
  const suffix = randomUUID().slice(0, 8);
  const tenant = await createTestTenant(`test-ops-${suffix}`, `TEST ONLY RMA operations ${suffix}`);
  const home = tenant.id;
  const customerId = randomUUID();
  const vehicleId = randomUUID();
  const rentalId = randomUUID();
  const now = new Date();
  const originalReturn = new Date(now.getTime() + 86_400_000);
  try {
    await withDrizzleTenant(home, async (tx) => {
      await tx.insert(customer).values({ id: customerId, tenantId: home, name: `TEST ONLY - DO NOT CONTACT ${suffix}` });
      await tx.insert(vehicle).values({ id: vehicleId, tenantId: home, make: "TEST", model: "DO NOT BLOCK", plate: `TEST ${suffix}`, odometer: 1100 });
      await tx.insert(rental).values({
        id: rentalId,
        tenantId: home,
        customerId,
        vehicleId,
        startDate: new Date(now.getTime() - 2 * 86_400_000),
        returnDate: originalReturn,
        startOdometer: 1000,
        dailyMileageLimitKm: 150,
        dailyRate: 100,
        totalDays: 3,
        total: 300,
        balanceDue: 300,
        status: "active",
      });
    });

    const fineInput = { vehicleId, kind: "fine" as const, externalId: `TEST-FINE-${suffix}`, occurredAt: new Date(now.getTime() - 60_000), amount: 100, source: "e2e-rta" };
    const salikInput = { vehicleId, kind: "salik" as const, externalId: `TEST-SALIK-${suffix}`, occurredAt: new Date(now.getTime() - 50_000), amount: 4.20, source: "e2e-salik" };
    assert.equal((await upsertRentalCharge(home, null, fineInput)).created, true);
    assert.equal((await upsertRentalCharge(home, null, fineInput)).created, false);
    assert.equal((await upsertRentalCharge(home, null, salikInput)).created, true);
    assert.equal((await upsertRentalCharge(home, null, salikInput)).created, false);

    for (const operator of ["parkin", "parkonic"] as const) {
      const event = { reference: `TEST-${operator}-${suffix}`, plate: `TEST ${suffix}`, occurredAt: new Date(now.getTime() - 40_000), amount: 4.50, location: "TEST ONLY" };
      assert.equal((await importParkingEvents(home, null, operator, [event])).created, 1);
      assert.equal((await importParkingEvents(home, null, operator, [event])).duplicates, 1);
    }

    await confirmRentalExtensionForTenant(home, null, rentalId, new Date(originalReturn.getTime() + 2 * 86_400_000));
    const verification = await withDrizzleTenant(home, async (tx) => {
      const [extended] = await tx.select().from(rental).where(eq(rental.id, rentalId)).limit(1);
      const charges = await tx.select().from(rentalCharge).where(eq(rental.rentalId, rentalId));
      const outbound = await tx.select({ id: message.id }).from(message).where(eq(message.tenantId, home));
      const payments = await tx.select({ id: payment.id }).from(payment).where(eq(payment.tenantId, home));
      const blocks = await tx.select({ id: engineBlock.id }).from(engineBlock).where(eq(engineBlock.tenantId, home));
      return { extended, charges, outbound: outbound.length, payments: payments.length, blocks: blocks.length };
    });
    assert.equal(verification.extended.totalDays, 5);
    assert.equal(verification.extended.total, 500);
    assert.equal(verification.extended.balanceDue, 500);
    assert.equal(verification.extended.extensionStatus, "extension_confirmed");
    assert.equal(verification.charges.length, 4);
    assert.equal(verification.charges.find((charge) => charge.kind === "salik")?.amount, 4.2);
    assert.ok(verification.charges.every((charge) => charge.notificationStatus === "not_sent"));
    assert.deepEqual([verification.outbound, verification.payments, verification.blocks], [0, 0, 0]);
    console.log(JSON.stringify({ testFixture: "passed", tenant: "isolated TEST tenant", charges: 4, duplicateImportsIgnored: 4, extension: { totalDays: 5, total: 500 }, notifications: 0, payments: 0, engineCommands: 0 }));
  } finally {
    for (const table of ["integration_event", "audit_event", "rental_charge", "rental", "vehicle", "customer"]) {
      await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE tenant_id = ${home}`);
    }
    await db.execute(sql`DELETE FROM tenant WHERE id = ${home}`);
  }
}

async function runLiveRead() {
  const [tenant] = (await pool.query("SELECT id FROM tenant WHERE slug='rma'")).rows as { id: string }[];
  if (!tenant) throw new Error("RMA tenant not found");
  const vehicles = await vehiclesForChargeEntry(tenant.id);
  let fineCount = 0;
  let rtaVehicleChecked = false;
  for (const row of vehicles) {
    const plate = parsePlate(row.plate);
    if (!plate) continue;
    const result = await lookupFines({ sourceCode: "DXB", plateCategory: "PRIVATE", ...plate });
    fineCount = result.fines.length;
    rtaVehicleChecked = true;
    break;
  }

  const accountsPath = process.env.SALIK_ACCOUNTS_PATH || join(process.cwd(), "scripts", ".salik-accounts.json");
  const accounts = JSON.parse(readFileSync(accountsPath, "utf8")) as { user?: string; pass?: string }[];
  const crmPlates = new Map(vehicles.map((row) => [row.plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase(), parsePlate(row.plate)]));
  let salikTrips = 0;
  let salikVehicleChecked = false;
  for (const account of accounts) {
    if (!account.user || !account.pass) continue;
    const jar = await salik.login(account.user, account.pass);
    const operatorVehicles = await salik.getVehicles(jar);
    for (const [plateNumber, operatorVehicle] of operatorVehicles) {
      const crmPlate = [...crmPlates.entries()].find(([key]) => key.endsWith(plateNumber.replace(/\D/g, "")))?.[1];
      if (!crmPlate) continue;
      const trips = await salik.getTollTrips(jar, {
        plateNumber: crmPlate.plateNo,
        colorId: operatorVehicle.colorId,
        from: new Date(Date.now() - 7 * 86_400_000),
        to: new Date(),
      });
      salikTrips = trips.length;
      salikVehicleChecked = true;
      break;
    }
    if (salikVehicleChecked) break;
  }
  console.log(JSON.stringify({ liveRead: "passed", rta: { vehiclesChecked: rtaVehicleChecked ? 1 : 0, finesReturned: fineCount }, salik: { vehiclesChecked: salikVehicleChecked ? 1 : 0, tripsReturnedLast7Days: salikTrips }, databaseWrites: 0, notifications: 0, payments: 0, engineCommands: 0 }));
}

async function main() {
  if (!testFixture && !liveRead) {
    console.log("Dry run only. Use --commit-test-fixture for an isolated create/verify/delete TEST tenant, and/or --live-read for read-only RTA/Salik retrieval. No notifications, payments or engine commands are supported by this script.");
    return;
  }
  if (testFixture) await runTestFixture();
  if (liveRead) await runLiveRead();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => pool.end());
