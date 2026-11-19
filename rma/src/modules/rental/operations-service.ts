import "server-only";
import { and, asc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { customer, message, rental, tenantMember, vehicle } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import { sendNotification } from "@/modules/notify/send";
import { enqueueDistributorWhatsApp } from "./outbox";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { buildReturnReminder, classifyExtensionReply, returnReminderIsDue } from "./operations";
import { buildChargeStatement } from "@/modules/rental-charges/rules";
import { chargeAndRentalsForStatement, markStatementSent, statementChargesDue, statementIsDue } from "@/modules/rental-charges/core";

function senderLine(tenantSlug: string): string {
  const line = process.env.CUSTOMER_WA_SENDER_LINE?.trim() || (tenantSlug === "rma" ? "rma-main" : "");
  if (!line) throw new Error("CUSTOMER_WA_SENDER_LINE is not configured for this tenant");
  return line;
}

async function sendCustomerText(home: string, tenantSlug: string, input: {
  rentalId: string;
  customerId: string;
  phone: string | null;
  text: string;
  dedupeKey: string;
}): Promise<void> {
  if (!input.phone) throw new Error("Customer phone is missing");
  await enqueueDistributorWhatsApp({
    tenantId: home,
    line: senderLine(tenantSlug),
    toDigits: input.phone,
    text: input.text,
    dedupeKey: input.dedupeKey,
  });
  await withDrizzleTenant(home, (tx) => tx.insert(message).values({
    tenantId: home,
    channel: "whatsapp",
    direction: "outbound",
    to: input.phone,
    customerId: input.customerId,
    body: input.text,
    status: "queued",
    relatedEntityType: "rental",
    relatedEntityId: input.rentalId,
  }));
}

export async function sendDueReturnReminders(home: string, tenantSlug: string, now = new Date()): Promise<{ sent: number; errors: string[] }> {
  const rows = await withDrizzleTenant(home, (tx) => tx.select({ rental, phone: customer.phone, customerName: customer.name, plate: vehicle.plate })
    .from(rental).innerJoin(customer, eq(customer.id, rental.customerId)).innerJoin(vehicle, eq(vehicle.id, rental.vehicleId))
    .where(and(eq(rental.status, "active"), isNull(rental.returnReminderSentAt), lte(rental.returnDate, new Date(now.getTime() + 48 * 60 * 60 * 1000)))));
  let sent = 0;
  const errors: string[] = [];
  for (const row of rows) {
    if (!returnReminderIsDue(row.rental.returnDate, row.rental.returnReminderSentAt, now)) continue;
    try {
      const text = buildReturnReminder({ customerName: row.customerName, plate: row.plate, returnDate: row.rental.returnDate });
      await sendCustomerText(home, tenantSlug, {
        rentalId: row.rental.id,
        customerId: row.rental.customerId,
        phone: row.phone,
        text,
        dedupeKey: `return-reminder:${row.rental.id}:${row.rental.returnDate.toISOString()}`,
      });
      await withDrizzleTenant(home, (tx) => tx.update(rental).set({ returnReminderSentAt: now, extensionStatus: "awaiting_response", updatedAt: now }).where(eq(rental.id, row.rental.id)));
      sent++;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Reminder failed");
    }
  }
  return { sent, errors };
}

export async function sendDueChargeStatements(home: string, tenantSlug: string, now = new Date()): Promise<{ sent: number; errors: string[] }> {
  let sent = 0;
  const errors: string[] = [];
  for (const final of [false, true]) {
    const candidates = await statementChargesDue(home, now, final);
    for (const candidate of candidates) {
      if (!final && !statementIsDue(candidate.startDate, candidate.statementCount, now)) continue;
      const data = await chargeAndRentalsForStatement(home, candidate.id);
      if (!data) continue;
      const text = buildChargeStatement({ customerName: data.customerName, plate: data.plate, final, charges: data.charges.map((charge) => ({ kind: charge.kind, amount: charge.amount, status: charge.status })) });
      try {
        await sendCustomerText(home, tenantSlug, {
          rentalId: candidate.id,
          customerId: data.rental.customerId,
          phone: data.customerPhone,
          text,
          dedupeKey: final ? `rental-final-statement:${candidate.id}` : `rental-statement:${candidate.id}:${candidate.statementCount + 1}`,
        });
        await markStatementSent(home, candidate.id, final, now);
        sent++;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Statement failed");
      }
    }
  }
  return { sent, errors };
}

export async function captureExtensionReplies(home: string, now = new Date()): Promise<{ saved: number; errors: string[] }> {
  const rentals = await withDrizzleTenant(home, (tx) => tx.select({ rental, phone: customer.phone })
    .from(rental).innerJoin(customer, eq(customer.id, rental.customerId))
    .where(and(eq(rental.status, "active"), sql`${rental.returnReminderSentAt} is not null`, isNull(rental.customerResponseAt))));
  let saved = 0;
  const errors: string[] = [];
  for (const row of rentals) {
    try {
      const digits = normalizePhone(row.phone);
      const phoneMatch = digits.length >= MIN_PHONE_MATCH_DIGITS
        ? sql`right(regexp_replace(coalesce(${message.fromPn}, ${message.from}, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${digits.slice(-MIN_PHONE_MATCH_DIGITS)}`
        : null;
      const [reply] = await withDrizzleTenant(home, (tx) => tx.select().from(message).where(and(
        eq(message.direction, "inbound"),
        gt(message.createdAt, row.rental.returnReminderSentAt!),
        lte(message.createdAt, now),
        or(eq(message.customerId, row.rental.customerId), ...(phoneMatch ? [phoneMatch] : [])),
      )).orderBy(asc(message.createdAt)).limit(1));
      if (!reply) continue;
      const status = classifyExtensionReply(reply.body) ?? "awaiting_response";
      await withDrizzleTenant(home, (tx) => tx.update(rental).set({
        customerResponse: reply.body,
        customerResponseAt: reply.createdAt,
        extensionStatus: status,
        updatedAt: now,
      }).where(and(eq(rental.id, row.rental.id), isNull(rental.customerResponseAt))));
      await notifyManagerOfReply(home, row.rental.id, row.rental.salesAgentId, reply.body, now);
      saved++;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Reply capture failed");
    }
  }
  return { saved, errors };
}

async function notifyManagerOfReply(home: string, rentalId: string, salesAgentId: string | null, body: string, now: Date) {
  let userIds = salesAgentId ? [salesAgentId] : [];
  if (userIds.length === 0) {
    userIds = await withDrizzleTenant(home, async (tx) => {
      const rows = await tx.select({ userId: tenantMember.userId, roles: tenantMember.roles }).from(tenantMember).where(eq(tenantMember.tenantId, home));
      return rows.filter((row) => row.roles.some((role) => ["sales_manager", "general_manager", "tenant_admin"].includes(role))).map((row) => row.userId);
    });
  }
  for (const userId of userIds) {
    await sendNotification(home, {
      kind: "rental_extension_reply",
      target: { userId },
      text: `Rental ${rentalId.slice(0, 8)}: customer replied about return/extension.\n${body.slice(0, 500)}\nReview the rental and confirm or decline the extension.`,
      dedupeKey: `rental-extension-reply:${rentalId}:${userId}`,
      entityType: "rental",
      entityId: rentalId,
      now,
    });
  }
}
