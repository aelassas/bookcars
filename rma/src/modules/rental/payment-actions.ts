"use server";

import { eq, and, sql } from "drizzle-orm";
import { rental, payment, task, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { revalidatePath } from "next/cache";
import { canManageRentalsForTenant } from "./policies";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { requireRoleForTenant, requireAuth } from "@/platform/auth/authorization";
import { assertValidPayment, availablePaymentBalance } from "./payment-rules";

// STEP 1 — sales records a payment ("payment received + amount"). Status =
// pending; balance is NOT reduced yet. Two follow-up tasks are opened: sales
// (confirm & post) and security (accepted-but-not-posted oversight). Balance
// only drops after sales confirms (spec: sales owns both steps, no separate
// accounting role).
export async function recordPayment(
  tenantId: string,
  data: { rentalId: string; amount: number; method?: string; notes?: string },
  tenantSlug?: string
) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  // The actor is ALWAYS the session user — a caller-supplied id would let any
  // sales account write audit rows in someone else's name (the cash trail must
  // be undeniable; confirmPayment already follows this rule).
  const actorId = await requireAuth();
  if (!data.rentalId) throw new Error("Rental is required");

  // Shared fleet: the rental (and therefore its payment/task/audit rows) lives
  // in fleet-home. Authorize on the viewer's brand, write everything under
  // fleet-home so the rows stay consistent with the rental and read back.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [r] = await tx.select().from(rental).where(eq(rental.id, data.rentalId)).for("update").limit(1);
    if (!r) throw new Error("Rental not found");
    if (r.status === "cancelled") throw new Error("Cannot record payment for cancelled rental");
    const [pending] = await tx
      .select({ total: sql<number>`coalesce(sum(${payment.amount}), 0)::int` })
      .from(payment)
      .where(and(eq(payment.rentalId, data.rentalId), eq(payment.status, "pending")));
    const method = data.method ?? "cash";
    assertValidPayment(data.amount, availablePaymentBalance(r.balanceDue, Number(pending?.total ?? 0)), method);

    const ins = await tx
      .insert(payment)
      .values({ tenantId: home, rentalId: data.rentalId, amount: data.amount, method, notes: data.notes ?? null, status: "pending", recordedBy: actorId ?? null })
      .returning();
    const p = Array.isArray(ins) ? ins[0] : ins;

    const ref = `payment:${p.id}`;
    await tx.insert(task).values([
      { tenantId: home, companyId: r.companyId, externalId: ref, board: "sales", column: "open", status: "open", title: `Confirm ${data.amount} AED payment received (rental)`, description: "Payment recorded — sales must confirm 'payment received' to post it." },
      { tenantId: home, companyId: r.companyId, externalId: ref, board: "security", column: "open", status: "open", title: `Accepted-not-posted: ${data.amount} AED (rental)`, description: "Payment recorded but not yet confirmed — verify cash reached the till." },
    ]);

    await tx.insert(auditEvent).values({ tenantId: home, actorId: actorId ?? null, action: "payment.received", entityType: "payment", entityId: p.id, intent: `Sales recorded ${data.amount} AED ${method} (pending sales confirmation)` });

    if (tenantSlug) { revalidatePath(`/${tenantSlug}/rentals/${data.rentalId}`); revalidatePath(`/${tenantSlug}/security`); }
    return p;
  });
}

// STEP 2 — sales confirms ("payment received"). Status = confirmed; balance
// reduced; the pending follow-up tasks are closed. Overdue clears once balance
// hits 0. Spec: sales confirms payment; there is no separate accounting role.
export async function confirmPayment(tenantId: string, paymentId: string, tenantSlug?: string) {
  await requireRoleForTenant(tenantId, ["sales", "sales_manager", "general_manager"]);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [p] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
    if (!p) throw new Error("Payment not found");
    if (p.status === "confirmed") return p;
    if (p.status !== "pending") throw new Error(`Cannot confirm a ${p.status} payment`);

    // Serialize confirmations against other payments for the same rental.
    const [r] = await tx.select().from(rental).where(eq(rental.id, p.rentalId)).for("update").limit(1);
    if (!r) throw new Error("Rental not found");
    if (p.amount > r.balanceDue) throw new Error(`Payment exceeds the remaining balance of ${r.balanceDue} AED`);

    const postedRows = await tx
      .update(payment)
      .set({ status: "confirmed", confirmedBy: actorId, confirmedAt: new Date() })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pending")))
      .returning();
    const posted = Array.isArray(postedRows) ? postedRows[0] : postedRows;
    if (!posted) {
      const [current] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
      return current;
    }

    await tx.update(rental).set({ balanceDue: r.balanceDue - p.amount, updatedAt: new Date() }).where(eq(rental.id, r.id));
    await tx.update(task).set({ status: "done", updatedAt: new Date() }).where(and(eq(task.externalId, `payment:${paymentId}`), eq(task.status, "open")));

    await tx.insert(auditEvent).values({ tenantId: home, actorId, action: "payment.confirmed", entityType: "payment", entityId: paymentId, intent: `Sales confirmed payment received: ${p.amount} AED` });

    if (tenantSlug) { revalidatePath(`/${tenantSlug}/rentals/${p.rentalId}`); revalidatePath(`/${tenantSlug}/security`); revalidatePath(`/${tenantSlug}/collections`); }
    return posted;
  });
}

export async function rejectPayment(tenantId: string, paymentId: string, tenantSlug?: string) {
  await requireRoleForTenant(tenantId, ["sales", "sales_manager", "general_manager"]);
  const actorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [p] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
    if (!p) throw new Error("Payment not found");
    if (p.status === "rejected") return p;
    if (p.status !== "pending") throw new Error("A confirmed payment cannot be rejected");

    const rejectedRows = await tx
      .update(payment)
      .set({ status: "rejected" })
      .where(and(eq(payment.id, paymentId), eq(payment.status, "pending")))
      .returning();
    const rejected = Array.isArray(rejectedRows) ? rejectedRows[0] : rejectedRows;
    if (!rejected) {
      const [current] = await tx.select().from(payment).where(eq(payment.id, paymentId)).limit(1);
      return current;
    }
    await tx.update(task).set({ status: "done", updatedAt: new Date() }).where(and(eq(task.externalId, `payment:${paymentId}`), eq(task.status, "open")));
    await tx.insert(auditEvent).values({ tenantId: home, actorId, action: "payment.rejected", entityType: "payment", entityId: paymentId, intent: `Sales rejected unposted payment: ${p.amount} AED; balance unchanged` });

    if (tenantSlug) { revalidatePath(`/${tenantSlug}/rentals/${p.rentalId}`); revalidatePath(`/${tenantSlug}/security`); }
    return rejected;
  });
}

export async function getPaymentsForRental(tenantId: string, rentalId: string) {
  await canManageRentalsForTenant(tenantId);
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    return tx.select().from(payment).where(eq(payment.rentalId, rentalId)).orderBy(payment.createdAt.desc());
  });
}
