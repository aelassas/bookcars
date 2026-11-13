"use server";

import { call, customer, deal, document, lease, message, rental, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/platform/auth/authorization";
import { canManageCRMForTenant } from "./policies";
import { normalizeCustomerInput } from "./customer-input";

export async function createCustomer(
  tenantId: string,
  data: {
    name: string;
    phone?: string;
    email?: string;
    division?: string;
    source?: string;
    notes?: string;
  }
) {
  await canManageCRMForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const input = normalizeCustomerInput(data);
  if (!input.name) throw new Error("Enter the customer’s name.");
  const saved = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(customer)
      .values({
        tenantId,
        name: input.name!,
        phone: input.phone || null,
        email: input.email || null,
        division: input.division ?? "rent",
        source: input.source || null,
        notes: input.notes || null,
      })
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "customer.create",
      entityType: "customer",
      entityId: row.id,
      intent: `Created customer: ${data.name}`,
    });
    return row;
  });
  revalidatePath("/[tenantSlug]/customers", "page");
  return saved;
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  data: Partial<{
    name: string;
    phone: string;
    email: string;
    division: string;
    source: string;
    notes: string;
  }>
) {
  await canManageCRMForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const input = normalizeCustomerInput(data);
  const saved = await withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .update(customer)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(customer.id, id))
      .returning();
    if (!row) throw new Error("This customer no longer exists. Return to the customer directory and try again.");
    await tx.insert(auditEvent).values({
      tenantId,
      actorId: null,
      action: "customer.update",
      entityType: "customer",
      entityId: id,
      intent: `Updated customer ${id}`,
    });
    return row;
  });
  revalidatePath("/[tenantSlug]/customers", "page");
  revalidatePath("/[tenantSlug]/customers/[id]", "page");
  return saved;
}

export async function deleteCustomer(tenantId: string, id: string, confirmation: string): Promise<void> {
  await canManageCRMForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  if (confirmation !== "DELETE") throw new Error("Type DELETE to confirm");

  await withDrizzleTenant(tenantId, async (tx) => {
    const [target] = await tx.select({ name: customer.name }).from(customer).where(eq(customer.id, id)).limit(1);
    if (!target) throw new Error("Customer not found");
    const [linkedDeal] = await tx.select({ id: deal.id }).from(deal).where(eq(deal.customerId, id)).limit(1);
    const [linkedMessage] = await tx.select({ id: message.id }).from(message).where(eq(message.customerId, id)).limit(1);
    const [linkedCall] = await tx.select({ id: call.id }).from(call).where(eq(call.customerId, id)).limit(1);
    const [linkedRental] = await tx.select({ id: rental.id }).from(rental).where(eq(rental.customerId, id)).limit(1);
    const [linkedLease] = await tx.select({ id: lease.id }).from(lease).where(eq(lease.customerId, id)).limit(1);
    const [linkedDocument] = await tx.select({ id: document.id }).from(document).where(and(eq(document.entityType, "customer"), eq(document.entityId, id))).limit(1);
    if (linkedDeal || linkedMessage || linkedCall || linkedRental || linkedLease || linkedDocument) {
      throw new Error("This customer has linked CRM history and cannot be deleted");
    }

    await tx.delete(customer).where(eq(customer.id, id));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "customer.delete",
      entityType: "customer",
      entityId: id,
      intent: `Deleted unused customer ${target.name}`,
    });
  });
  revalidatePath("/[tenantSlug]/customers", "page");
  revalidatePath("/[tenantSlug]/customers/[id]", "page");
}
