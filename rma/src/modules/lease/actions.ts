"use server";

import { eq, and } from "drizzle-orm";
import { lease, leaseInstallment, leasePayment, vehicle, customer, auditEvent, task } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { revalidatePath } from "next/cache";
import { canManageLeasesForTenant } from "./policies";
import { insertPurposeChangeEvent } from "@/modules/fleet/purpose-events";
import { requireRoleForTenant, requireAuth } from "@/platform/auth/authorization";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function createLease(
  tenantId: string,
  actorId: string | undefined,
  data: {
    customerId: string;
    vehicleId: string;
    dealId?: string;
    contractRef: string;
    startDate: Date;
    termMonths: number;
    downPayment?: number;
    monthlyPayment: number;
    residualValue?: number;
    notes?: string;
  },
  tenantSlug?: string
) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  if (!data.contractRef || data.termMonths < 1 || data.monthlyPayment <= 0) {
    throw new Error("Invalid lease terms");
  }

  return withDrizzleTenant(tenantId, async (tx) => {
    const [vehicleRow] = await tx.select({ division: vehicle.division, status: vehicle.status, companyId: vehicle.companyId }).from(vehicle).where(eq(vehicle.id, data.vehicleId)).limit(1);
    if (!vehicleRow) throw new Error("Vehicle not found");
    if (vehicleRow.division !== "lease") throw new Error("Vehicle is not in the lease division");

    const [customerRow] = await tx.select({ division: customer.division }).from(customer).where(eq(customer.id, data.customerId)).limit(1);
    if (!customerRow) throw new Error("Customer not found");
    if (customerRow.division !== "lease") throw new Error("Customer is not in the lease division");

    const existingRef = await tx
      .select({ id: lease.id })
      .from(lease)
      .where(and(eq(lease.tenantId, tenantId), eq(lease.contractRef, data.contractRef)))
      .limit(1);
    if (existingRef.length > 0) throw new Error("Contract reference already exists");

    const downPayment = data.downPayment ?? 0;
    const residualValue = data.residualValue ?? 0;
    const totalAmount = downPayment + data.monthlyPayment * data.termMonths + residualValue;
    const endDate = endOfDay(addMonths(data.startDate, data.termMonths));

    const leaseRows = await tx
      .insert(lease)
      .values({
        tenantId,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        dealId: data.dealId ?? null,
        salesAgentId: actorId ?? null,
        contractRef: data.contractRef,
        startDate: data.startDate,
        endDate,
        termMonths: data.termMonths,
        downPayment,
        monthlyPayment: data.monthlyPayment,
        residualValue,
        totalAmount,
        balanceDue: totalAmount - downPayment,
        status: "draft",
        notes: data.notes ?? null,
      })
      .returning();
    const leaseRow = Array.isArray(leaseRows) ? leaseRows[0] : leaseRows;

    const installments = Array.from({ length: data.termMonths }, (_, i) => ({
      tenantId,
      leaseId: leaseRow.id,
      installmentNumber: i + 1,
      dueDate: addMonths(data.startDate, i + 1),
      amount: data.monthlyPayment,
      status: "pending" as const,
    }));
    if (installments.length > 0) {
      await tx.insert(leaseInstallment).values(installments);
    }

    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.create",
      entityType: "lease",
      entityId: leaseRow.id,
      intent: `Created lease ${data.contractRef} for vehicle ${data.vehicleId}`,
    });

    // Purpose/custody marker on the car timeline: this fleet car is now on a
    // lease (rent → lease). Hand (company) is unchanged here — the purpose is
    // what moves. Atomic with the lease creation.
    await insertPurposeChangeEvent(tx, {
      tenantId,
      vehicleId: data.vehicleId,
      purpose: "lease",
      fromCompanyId: vehicleRow.companyId,
      toCompanyId: vehicleRow.companyId,
      note: `Lease ${data.contractRef}`,
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/leases`);
    return leaseRow;
  });
}

export async function startLease(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  return withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ status: lease.status, vehicleId: lease.vehicleId }).from(lease).where(eq(lease.id, id)).limit(1);
    if (!current) throw new Error("Lease not found");
    if (current.status !== "draft") throw new Error(`Cannot start lease with status ${current.status}`);

    const rows = await tx.update(lease).set({ status: "active", updatedAt: new Date() }).where(eq(lease.id, id)).returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    await tx.update(vehicle).set({ status: "on_rent", updatedAt: new Date() }).where(eq(vehicle.id, current.vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.start",
      entityType: "lease",
      entityId: id,
      intent: "Lease started, vehicle handed over",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/leases`);
    return row;
  });
}

export async function recordLeasePayment(
  tenantId: string,
  actorId: string | undefined,
  leaseId: string,
  data: { amount: number; method?: string; notes?: string; installmentId?: string },
  tenantSlug?: string
) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  if (!data.amount || data.amount <= 0) throw new Error("Invalid payment amount");

  return withDrizzleTenant(tenantId, async (tx) => {
    const [leaseRow] = await tx
      .select({ balanceDue: lease.balanceDue, status: lease.status, companyId: lease.companyId })
      .from(lease)
      .where(eq(lease.id, leaseId))
      .limit(1);
    if (!leaseRow) throw new Error("Lease not found");
    if (leaseRow.status === "cancelled") throw new Error("Cannot record payment for cancelled lease");

    let installmentId = data.installmentId ?? null;
    if (!installmentId) {
      const [nextInstallment] = await tx
        .select({ id: leaseInstallment.id, amount: leaseInstallment.amount })
        .from(leaseInstallment)
        .where(and(eq(leaseInstallment.leaseId, leaseId), eq(leaseInstallment.status, "pending")))
        .orderBy(leaseInstallment.installmentNumber)
        .limit(1);
      if (nextInstallment && nextInstallment.amount === data.amount) {
        installmentId = nextInstallment.id;
      }
    }

    if (installmentId) {
      const [inst] = await tx
        .select({ id: leaseInstallment.id, amount: leaseInstallment.amount, status: leaseInstallment.status })
        .from(leaseInstallment)
        .where(and(eq(leaseInstallment.id, installmentId), eq(leaseInstallment.leaseId, leaseId)))
        .limit(1);
      if (!inst) throw new Error("Installment not found");
      if (inst.status === "paid") throw new Error("Installment already paid");
      if (data.amount !== inst.amount) throw new Error(`Payment must match installment amount of ${inst.amount} AED`);
    }

    // STEP 1: record as PENDING. Balance and installment are NOT changed yet —
    // sales must confirm. Two follow-up tasks are opened.
    const paymentRows = await tx
      .insert(leasePayment)
      .values({
        tenantId,
        leaseId,
        installmentId,
        amount: data.amount,
        method: data.method ?? "cash",
        notes: data.notes ?? null,
        status: "pending",
        recordedBy: actorId ?? null,
      })
      .returning();
    const paymentRow = Array.isArray(paymentRows) ? paymentRows[0] : paymentRows;

    const ref = `leasepayment:${paymentRow.id}`;
    // Leasing is security-free (security is rental-only); oversight task goes to
    // the sales manager rather than security.
    await tx.insert(task).values([
      { tenantId, companyId: leaseRow.companyId, externalId: ref, board: "sales", column: "open", status: "open", title: `Confirm ${data.amount} AED lease payment received`, description: "Lease payment recorded — sales must confirm 'payment received' to post it." },
      { tenantId, companyId: leaseRow.companyId, externalId: ref, board: "sales_manager", column: "open", status: "open", title: `Accepted-not-posted: ${data.amount} AED (lease)`, description: "Lease payment recorded but not yet confirmed — verify funds received." },
    ]);

    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.payment.received",
      entityType: "lease_payment",
      entityId: paymentRow.id,
      intent: `Sales recorded ${data.amount} AED ${data.method ?? "cash"} for lease ${leaseId} (pending sales confirmation)`,
    });

    if (tenantSlug) { revalidatePath(`/${tenantSlug}/leases/${leaseId}`); revalidatePath(`/${tenantSlug}/security`); }
    return paymentRow;
  });
}

// STEP 2 — sales confirms a lease payment ("payment received"): marks the
// installment paid, reduces the lease balance, closes the follow-up tasks. All
// audited. Spec: sales confirms payment; no separate accounting role.
export async function confirmLeasePayment(tenantId: string, paymentId: string, tenantSlug?: string) {
  await requireRoleForTenant(tenantId, ["sales", "sales_manager", "general_manager"]);
  const actorId = await requireAuth();
  return withDrizzleTenant(tenantId, async (tx) => {
    const [p] = await tx.select().from(leasePayment).where(eq(leasePayment.id, paymentId)).limit(1);
    if (!p) throw new Error("Lease payment not found");
    if (p.status === "confirmed") return p;

    await tx.update(leasePayment).set({ status: "confirmed", confirmedBy: actorId, confirmedAt: new Date() }).where(eq(leasePayment.id, paymentId));

    if (p.installmentId) {
      await tx.update(leaseInstallment).set({ status: "paid", paidAt: new Date(), leasePaymentId: p.id, updatedAt: new Date() }).where(eq(leaseInstallment.id, p.installmentId));
    }

    const [l] = await tx.select({ balanceDue: lease.balanceDue, status: lease.status }).from(lease).where(eq(lease.id, p.leaseId)).limit(1);
    if (l) {
      const newBalance = Math.max(0, l.balanceDue - p.amount);
      const newStatus = newBalance <= 0 && l.status === "active" ? "completed" : l.status;
      await tx.update(lease).set({ balanceDue: newBalance, status: newStatus, updatedAt: new Date() }).where(eq(lease.id, p.leaseId));
    }

    await tx.update(task).set({ status: "done", updatedAt: new Date() }).where(and(eq(task.externalId, `leasepayment:${paymentId}`), eq(task.status, "open")));

    await tx.insert(auditEvent).values({ tenantId, actorId, action: "lease.payment.confirmed", entityType: "lease_payment", entityId: paymentId, intent: `Sales confirmed lease payment received: ${p.amount} AED` });

    if (tenantSlug) { revalidatePath(`/${tenantSlug}/leases/${p.leaseId}`); revalidatePath(`/${tenantSlug}/security`); }
    return p;
  });
}

export async function completeLease(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  return withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ status: lease.status }).from(lease).where(eq(lease.id, id)).limit(1);
    if (!current) throw new Error("Lease not found");
    if (current.status !== "active") throw new Error(`Cannot complete lease with status ${current.status}`);

    const rows = await tx
      .update(lease)
      .set({ status: "completed", balanceDue: 0, updatedAt: new Date() })
      .where(eq(lease.id, id))
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;

    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.complete",
      entityType: "lease",
      entityId: id,
      intent: "Lease completed",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/leases`);
    return row;
  });
}

export async function defaultLease(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  return withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ status: lease.status }).from(lease).where(eq(lease.id, id)).limit(1);
    if (!current) throw new Error("Lease not found");
    if (current.status !== "active") throw new Error(`Cannot mark lease as defaulted with status ${current.status}`);

    const rows = await tx.update(lease).set({ status: "defaulted", updatedAt: new Date() }).where(eq(lease.id, id)).returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.default",
      entityType: "lease",
      entityId: id,
      intent: "Lease marked as defaulted",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/leases`);
    return row;
  });
}

export async function cancelLease(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageLeasesForTenant(tenantId);

  return withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ status: lease.status, vehicleId: lease.vehicleId }).from(lease).where(eq(lease.id, id)).limit(1);
    if (!current) throw new Error("Lease not found");
    if (!["draft", "active"].includes(current.status)) throw new Error(`Cannot cancel lease with status ${current.status}`);

    const rows = await tx.update(lease).set({ status: "cancelled", updatedAt: new Date() }).where(eq(lease.id, id)).returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (current.status === "active") {
      await tx.update(vehicle).set({ status: "available", updatedAt: new Date() }).where(eq(vehicle.id, current.vehicleId));
    }
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: actorId ?? null,
      action: "lease.cancel",
      entityType: "lease",
      entityId: id,
      intent: "Lease cancelled",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/leases`);
    return row;
  });
}
