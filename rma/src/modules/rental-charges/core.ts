import "server-only";
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import type { db } from "@/platform/db/client";
import { auditEvent, customer, integrationEvent, message, rental, rentalCharge, vehicle } from "@/platform/db/schema";
import { enqueueDistributorWhatsApp } from "@/modules/rental/outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { buildChargeNotification, parseRentalChargeInput, type RentalChargeInput } from "./rules";

type DbTx = typeof db;

export async function upsertRentalCharge(
  home: string,
  actorId: string | null,
  rawInput: RentalChargeInput,
): Promise<{ charge: typeof rentalCharge.$inferSelect; created: boolean }> {
  const input = parseRentalChargeInput(rawInput);
  return withDrizzleTenant(home, async (tx) => {
    const assigned = await findRentalForCharge(tx, input.vehicleId, input.occurredAt);
    if (!assigned) throw new Error("No rental covers this vehicle at the charge date/time; the charge was not assigned");

    if (input.source !== "manual") {
      await tx.insert(integrationEvent).values({
        tenantId: home,
        provider: input.source ?? "manual",
        providerEventId: `${input.kind}:${input.externalId}`,
        signatureValid: true,
        rawPayload: { ...input, occurredAt: input.occurredAt.toISOString() },
        normalizedType: `rental_charge.${input.kind}`,
        processingStatus: "done",
        processedAt: new Date(),
      }).onConflictDoNothing({
        target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
      });
    }

    const inserted = await tx.insert(rentalCharge).values({
      tenantId: home,
      rentalId: assigned.id,
      vehicleId: input.vehicleId,
      customerId: assigned.customerId,
      kind: input.kind,
      externalId: input.externalId,
      source: input.source ?? "manual",
      occurredAt: input.occurredAt,
      description: input.description ?? null,
      location: input.location ?? null,
      amount: input.amount,
      createdBy: actorId,
    }).onConflictDoNothing({
      target: [rentalCharge.tenantId, rentalCharge.kind, rentalCharge.externalId],
    }).returning();
    const created = Array.isArray(inserted) ? inserted[0] : inserted;
    if (created) {
      await tx.insert(auditEvent).values({
        tenantId: home,
        actorId,
        action: "rental_charge.created",
        entityType: "rental_charge",
        entityId: created.id,
        intent: `${created.kind} ${created.externalId}: ${created.amount} AED assigned to rental ${assigned.id}`,
      });
      return { charge: created, created: true };
    }
    const [existing] = await tx.select().from(rentalCharge).where(and(
      eq(rentalCharge.kind, input.kind),
      eq(rentalCharge.externalId, input.externalId),
    )).limit(1);
    if (!existing) throw new Error("Charge could not be saved");
    return { charge: existing, created: false };
  });
}

async function findRentalForCharge(tx: DbTx, vehicleId: string, occurredAt: Date) {
  const [row] = await tx.select({ id: rental.id, customerId: rental.customerId }).from(rental).where(and(
    eq(rental.vehicleId, vehicleId),
    ne(rental.status, "cancelled"),
    lte(rental.startDate, occurredAt),
    sql`coalesce(${rental.actualReturnDate}, ${rental.returnDate}) >= ${occurredAt}`,
  )).orderBy(desc(rental.startDate)).limit(1);
  return row ?? null;
}

function customerSenderLine(tenantSlug: string): string {
  const line = process.env.CUSTOMER_WA_SENDER_LINE?.trim() || (tenantSlug === "rma" ? "rma-main" : "");
  if (!line) throw new Error("CUSTOMER_WA_SENDER_LINE is not configured for this tenant");
  return line;
}

export async function notifyRentalChargeById(home: string, tenantSlug: string, chargeId: string): Promise<void> {
  const data = await withDrizzleTenant(home, async (tx) => {
    const [row] = await tx.select({
      charge: rentalCharge,
      phone: customer.phone,
      plate: vehicle.plate,
    }).from(rentalCharge)
      .innerJoin(customer, eq(customer.id, rentalCharge.customerId))
      .innerJoin(vehicle, eq(vehicle.id, rentalCharge.vehicleId))
      .where(eq(rentalCharge.id, chargeId)).limit(1);
    return row ?? null;
  });
  if (!data) throw new Error("Charge not found");
  if (data.charge.status === "void") throw new Error("A void charge cannot be sent");
  if (data.charge.status === "paid") throw new Error("This charge is already paid");
  if (["queued", "sent"].includes(data.charge.notificationStatus)) throw new Error("This charge notification has already been queued or sent");
  if (!data.phone) throw new Error("Add the customer's phone before sending the notification");

  const text = buildChargeNotification({
    kind: data.charge.kind,
    plate: data.plate,
    occurredAt: data.charge.occurredAt,
    amount: data.charge.amount,
    description: data.charge.description,
    location: data.charge.location,
    externalId: data.charge.externalId,
  });
  try {
    await enqueueDistributorWhatsApp({
      tenantId: home,
      line: customerSenderLine(tenantSlug),
      toDigits: data.phone,
      text,
      dedupeKey: `rental-charge:${chargeId}`,
    });
    await withDrizzleTenant(home, async (tx) => {
      await tx.update(rentalCharge).set({
        status: "notification_queued",
        notificationStatus: "queued",
        notifiedAt: null,
        paymentDueAt: null,
        notificationError: null,
        updatedAt: new Date(),
      }).where(eq(rentalCharge.id, chargeId));
      await tx.insert(message).values(messageValues(home, data, text));
    });
  } catch (error) {
    const errorText = error instanceof Error ? error.message : "Notification failed";
    await withDrizzleTenant(home, (tx) => tx.update(rentalCharge).set({
      notificationStatus: "failed",
      notificationError: errorText.slice(0, 500),
      updatedAt: new Date(),
    }).where(eq(rentalCharge.id, chargeId)));
    throw error;
  }
}

function messageValues(home: string, data: { charge: typeof rentalCharge.$inferSelect; phone: string }, text: string) {
  return {
    tenantId: home,
    channel: "whatsapp",
    direction: "outbound",
    to: data.phone,
    customerId: data.charge.customerId,
    body: text,
    status: "queued",
    relatedEntityType: "rental",
    relatedEntityId: data.charge.rentalId,
  };
}

export async function listChargesForRental(home: string, rentalId: string) {
  return withDrizzleTenant(home, (tx) => tx.select().from(rentalCharge)
    .where(eq(rentalCharge.rentalId, rentalId)).orderBy(desc(rentalCharge.occurredAt)));
}

export async function listCharges(home: string) {
  return withDrizzleTenant(home, async (tx) => tx.select({
    charge: rentalCharge,
    customerName: customer.name,
    plate: vehicle.plate,
  }).from(rentalCharge)
    .innerJoin(customer, eq(customer.id, rentalCharge.customerId))
    .innerJoin(vehicle, eq(vehicle.id, rentalCharge.vehicleId))
    .orderBy(desc(rentalCharge.createdAt)).limit(500));
}

export async function vehiclesForChargeEntry(home: string) {
  return withDrizzleTenant(home, (tx) => tx.select({ id: vehicle.id, plate: vehicle.plate, make: vehicle.make, model: vehicle.model })
    .from(vehicle).where(ne(vehicle.status, "sold")).orderBy(vehicle.plate));
}

export async function chargeAndRentalsForStatement(home: string, rentalId: string) {
  return withDrizzleTenant(home, async (tx) => {
    const [row] = await tx.select({ rental, customerName: customer.name, customerPhone: customer.phone, plate: vehicle.plate })
      .from(rental).innerJoin(customer, eq(customer.id, rental.customerId)).innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
      .where(eq(rental.id, rentalId)).limit(1);
    if (!row) return null;
    const charges = await tx.select().from(rentalCharge).where(eq(rentalCharge.rentalId, rentalId));
    return { ...row, charges };
  });
}

export async function statementChargesDue(home: string, now: Date, final: boolean) {
  return withDrizzleTenant(home, async (tx) => tx.select({ id: rental.id, startDate: rental.startDate, statementCount: rental.statementCount })
    .from(rental).where(final
      ? and(sql`${rental.status} in ('returned', 'completed')`, sql`${rental.finalStatementSentAt} is null`)
      : and(eq(rental.status, "active"), lte(rental.startDate, now))));
}

export function statementIsDue(startDate: Date, statementCount: number, now: Date): boolean {
  const next = new Date(startDate.getTime() + (statementCount + 1) * 15 * 86_400_000);
  return next.getTime() <= now.getTime();
}

export async function markStatementSent(home: string, rentalId: string, final: boolean, now: Date) {
  await withDrizzleTenant(home, (tx) => tx.update(rental).set(final ? {
    finalStatementSentAt: now,
    lastStatementSentAt: now,
    updatedAt: now,
  } : {
    statementCount: sql`${rental.statementCount} + 1`,
    lastStatementSentAt: now,
    updatedAt: now,
  }).where(eq(rental.id, rentalId)));
}
