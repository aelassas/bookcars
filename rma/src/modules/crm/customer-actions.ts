"use server";

import { customer, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
