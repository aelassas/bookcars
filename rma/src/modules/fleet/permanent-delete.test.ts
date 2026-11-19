import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { customer, document, engineBlock, payment, rental, rentalCharge, vehicle, vehicleTimelineEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { createTestTenant, createTestUser, hasTestDatabase, resetPool } from "@/test/db";
import { permanentlyDeleteVehicle } from "./permanent-delete";

const suffix = randomUUID();
let tenantId = "";
let actorId = "";

describe.skipIf(!hasTestDatabase())("permanent vehicle deletion", () => {
  afterAll(async () => {
    if (tenantId) {
      await db.execute(sql`DELETE FROM vehicle_timeline_event WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM document WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM payment WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM engine_block WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM rental_charge WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM rental WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM lease WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM vehicle_ledger_event WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM vehicle WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM customer WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM audit_event WHERE tenant_id = ${tenantId}`);
      await db.execute(sql`DELETE FROM tenant WHERE id = ${tenantId}`);
    }
    if (actorId) await db.execute(sql`DELETE FROM "user" WHERE id = ${actorId}`);
    await resetPool();
  });

  it("deletes the vehicle and linked operational history in one transaction", async () => {
    const tenantRow = await createTestTenant(`delete-${suffix.slice(0, 8)}`, "Delete Test");
    const actorRow = await createTestUser(`delete-${suffix}@example.com`);
    tenantId = tenantRow.id;
    actorId = actorRow.id;

    const { vehicleId, rentalId, documentId } = await withDrizzleTenant(tenantId, async (tx) => {
      const customerRows = await tx.insert(customer).values({ tenantId, name: "Delete Test Customer" }).returning({ id: customer.id });
      const customerId = Array.isArray(customerRows) ? customerRows[0].id : customerRows.id;
      const vehicleRows = await tx.insert(vehicle).values({ tenantId, make: "Test", model: "Delete", plate: `TEST ${suffix.slice(0, 8)}` }).returning({ id: vehicle.id });
      const id = Array.isArray(vehicleRows) ? vehicleRows[0].id : vehicleRows.id;
      const rentalRows = await tx.insert(rental).values({
        tenantId,
        customerId,
        vehicleId: id,
        startDate: new Date("2026-01-01T00:00:00Z"),
        returnDate: new Date("2026-01-02T00:00:00Z"),
        dailyRate: 0,
        totalDays: 1,
        total: 0,
        status: "completed",
      }).returning({ id: rental.id });
      const currentRentalId = Array.isArray(rentalRows) ? rentalRows[0].id : rentalRows.id;
      const chargeRows = await tx.insert(rentalCharge).values({
        tenantId,
        rentalId: currentRentalId,
        vehicleId: id,
        customerId,
        kind: "fine",
        externalId: `delete-${suffix}`,
        occurredAt: new Date(),
        amount: 10,
      }).returning({ id: rentalCharge.id });
      const chargeId = Array.isArray(chargeRows) ? chargeRows[0].id : chargeRows.id;
      await tx.insert(payment).values({ tenantId, rentalId: currentRentalId, rentalChargeId: chargeId, amount: 10 });
      await tx.insert(engineBlock).values({ tenantId, rentalChargeId: chargeId, vehicleId: id, liveStateCheckedAt: new Date() });
      const documentRows = await tx.insert(document).values({
        tenantId,
        entityType: "vehicle",
        entityId: id,
        filename: "delete-test.txt",
        mimeType: "text/plain",
        sizeBytes: 1,
        storageKey: `test/${suffix}.txt`,
        publicUrl: `/test/${suffix}`,
      }).returning({ id: document.id });
      const currentDocumentId = Array.isArray(documentRows) ? documentRows[0].id : documentRows.id;
      await tx.insert(vehicleTimelineEvent).values({
        tenantId,
        vehicleId: id,
        rentalId: currentRentalId,
        documentId: currentDocumentId,
        type: "document",
        startsAt: new Date(),
        status: "done",
      });
      await tx.execute(sql`
        INSERT INTO vehicle_ledger_event (tenant_id, vehicle_id, event_type, amount, occurred_on)
        VALUES (${tenantId}, ${id}, 'fine', 5, CURRENT_DATE)
      `);
      return { vehicleId: id, rentalId: currentRentalId, documentId: currentDocumentId };
    });

    await permanentlyDeleteVehicle(tenantId, vehicleId, actorId);

    const result = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM vehicle WHERE id = ${vehicleId})::int AS vehicle,
        (SELECT count(*) FROM rental WHERE id = ${rentalId})::int AS rental,
        (SELECT count(*) FROM rental_charge WHERE rental_id = ${rentalId})::int AS charges,
        (SELECT count(*) FROM payment WHERE rental_id = ${rentalId})::int AS payments,
        (SELECT count(*) FROM engine_block WHERE vehicle_id = ${vehicleId})::int AS blocks,
        (SELECT count(*) FROM document WHERE id = ${documentId})::int AS documents,
        (SELECT count(*) FROM vehicle_timeline_event WHERE vehicle_id = ${vehicleId})::int AS timeline,
        (SELECT count(*) FROM vehicle_ledger_event WHERE vehicle_id = ${vehicleId})::int AS ledger,
        (SELECT count(*) FROM audit_event WHERE tenant_id = ${tenantId} AND action = 'vehicle.deletePermanent')::int AS audit
    `);
    expect(result.rows[0]).toEqual({ vehicle: 0, rental: 0, charges: 0, payments: 0, blocks: 0, documents: 0, timeline: 0, ledger: 0, audit: 1 });
  }, 20_000);
});
