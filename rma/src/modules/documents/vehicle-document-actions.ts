"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canManageDocumentsForTenant, requireAuth } from "@/platform/auth/authorization";
import { auditEvent, document, vehicle } from "@/platform/db/schema";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { parseRecognizedVehicleData, type RecognizedVehicleData } from "./recognition";

export async function applyRecognizedVehicleData(
  tenantId: string,
  documentId: string,
  data: RecognizedVehicleData,
): Promise<void> {
  await canManageDocumentsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const input = parseRecognizedVehicleData(data);
  await withDrizzleTenant(tenantId, async (tx) => {
    const [doc] = await tx.select().from(document).where(and(
      eq(document.id, documentId),
      eq(document.entityType, "vehicle"),
      eq(document.category, "mulkiya"),
    )).limit(1);
    if (!doc) throw new Error("Vehicle Mulkiya document not found");
    if (doc.recognitionStatus !== "review_required") throw new Error("Run document recognition before applying its data");
    const rows = await tx.update(vehicle).set({
      ...input,
      ...(input.year !== undefined ? { year: Number(input.year) } : {}),
      updatedAt: new Date(),
    }).where(eq(vehicle.id, doc.entityId)).returning({ id: vehicle.id });
    const saved = Array.isArray(rows) ? rows[0] : rows;
    if (!saved) throw new Error("Vehicle not found");
    await tx.update(document).set({ recognitionStatus: "applied", updatedAt: new Date() }).where(eq(document.id, documentId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.document_data.applied",
      entityType: "vehicle",
      entityId: saved.id,
      intent: `Staff reviewed and applied recognized Mulkiya fields from document ${documentId}: ${Object.keys(input).join(", ")}`,
    });
  });
  revalidatePath("/");
}
