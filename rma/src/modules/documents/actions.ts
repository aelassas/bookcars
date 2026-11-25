"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { document, auditEvent, rental } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { uploadDocument } from "@/platform/storage/upload";
import { auth } from "@/platform/auth";
import { canManageDocumentsForTenant } from "@/platform/auth/authorization";
import { runDocumentRecognition } from "./recognition-service";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";

export async function uploadDocumentForEntity(
  tenantId: string,
  data: {
    entityType: string;
    entityId: string;
    category: string;
    file: File;
    odometer?: number;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await canManageDocumentsForTenant(tenantId);
  if (data.odometer !== undefined && (
    !Number.isInteger(data.odometer) || data.odometer < 0 || !data.file.type.startsWith("image/") ||
    data.entityType !== "rental" || !["inspection", "odometer"].includes(data.category)
  )) throw new Error("Enter a valid odometer reading for a rental inspection photo");

  const isRentalContract = data.entityType === "rental" && ["contract", "rental_contract"].includes(data.category);
  if (isRentalContract && data.file.type !== "application/pdf") throw new Error("Rental contract must be a PDF");
  const storageTenantId = data.entityType === "rental" ? await requireFleetHomeTenantId() : tenantId;
  if (isRentalContract) {
    const [current] = await withDrizzleTenant(storageTenantId, (tx) => tx.select({ contractUrl: rental.contractUrl }).from(rental).where(eq(rental.id, data.entityId)).limit(1));
    if (!current) throw new Error("Rental not found");
    if (current.contractUrl) throw new Error("A contract is already attached to this rental");
  }
  const uploaded = await uploadDocument(data.file);

  const row = await withDrizzleTenant(storageTenantId, async (tx) => {
    const rows = await tx
      .insert(document)
      .values({
        tenantId: storageTenantId,
        entityType: data.entityType,
        entityId: data.entityId,
        category: isRentalContract ? "rental_contract" : data.category,
        filename: data.file.name,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.size,
        storageKey: uploaded.key,
        publicUrl: uploaded.url,
        uploadedBy: session.user.id,
        recognizedData: data.odometer === undefined ? null : { odometer: data.odometer },
      })
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    const publicUrl = `/api/files/${r.id}`;
    await tx.update(document).set({ publicUrl }).where(eq(document.id, r.id));
    if (isRentalContract) {
      const updated = await tx.update(rental).set({ contractUrl: publicUrl, updatedAt: new Date() })
        .where(and(eq(rental.id, data.entityId), isNull(rental.contractUrl))).returning({ id: rental.id });
      if (!updated[0]) throw new Error("Rental not found or a contract was attached concurrently");
    }
    r.publicUrl = publicUrl;
    await tx.insert(auditEvent).values({
      tenantId: storageTenantId,
      actorId: session.user.id,
      action: "document.create",
      entityType: "document",
      entityId: r.id,
      intent: `Uploaded ${data.category} document for ${data.entityType}`,
    });
    return r;
  });

  if ((data.entityType === "customer" && ["id", "license", "passport", "international_license"].includes(data.category)) ||
      (data.entityType === "vehicle" && data.category === "mulkiya")) {
    await runDocumentRecognition(tenantId, row.id);
  }
  revalidatePath("/");
  revalidatePath("/[tenantSlug]/rentals/[rentalId]", "page");
  revalidatePath("/[tenantSlug]/fleet/[vehicleId]", "page");
  revalidatePath("/[tenantSlug]/customers/[id]", "page");
  return row;
}
