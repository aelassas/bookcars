"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageDocumentsForTenant, requireAuth } from "@/platform/auth/authorization";
import { auditEvent, customer, document } from "@/platform/db/schema";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { parseRecognizedCustomerData, type RecognizedCustomerData } from "./recognition";
import { runDocumentRecognition } from "./recognition-service";

export async function recognizeCustomerDocument(tenantId: string, documentId: string): Promise<void> {
  await canManageDocumentsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  await runDocumentRecognition(tenantId, documentId);
  revalidatePath("/");
}

export async function applyRecognizedCustomerData(
  tenantId: string,
  documentId: string,
  data: RecognizedCustomerData,
): Promise<void> {
  await canManageDocumentsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const input = parseRecognizedCustomerData(data);
  await withDrizzleTenant(tenantId, async (tx) => {
    const [doc] = await tx.select().from(document).where(and(eq(document.id, documentId), eq(document.entityType, "customer"))).limit(1);
    if (!doc) throw new Error("Customer document not found");
    if (doc.recognitionStatus !== "review_required") throw new Error("Run document recognition before applying its data");
    const rows = await tx.update(customer).set({
      ...input,
      documentsReviewedAt: new Date(),
      documentsReviewedBy: actorId,
      updatedAt: new Date(),
    }).where(eq(customer.id, doc.entityId)).returning({ id: customer.id });
    const saved = Array.isArray(rows) ? rows[0] : rows;
    if (!saved) throw new Error("Customer not found");
    await tx.update(document).set({ recognitionStatus: "applied", updatedAt: new Date() }).where(eq(document.id, documentId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "customer.document_data.applied",
      entityType: "customer",
      entityId: saved.id,
      intent: `Staff reviewed and applied recognized fields from document ${documentId}: ${Object.keys(input).join(", ")}`,
    });
    return saved;
  });
  revalidatePath("/");
}
