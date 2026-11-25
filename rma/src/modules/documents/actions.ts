"use server";

import { revalidatePath } from "next/cache";
import { document, auditEvent } from "@/platform/db/schema";
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

  const storageTenantId = data.entityType === "rental" ? await requireFleetHomeTenantId() : tenantId;
  const uploaded = await uploadDocument(data.file);

  const row = await withDrizzleTenant(storageTenantId, async (tx) => {
    const rows = await tx
      .insert(document)
      .values({
        tenantId: storageTenantId,
        entityType: data.entityType,
        entityId: data.entityId,
        category: data.category,
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

  if (data.entityType === "customer" && ["id", "license", "passport", "international_license"].includes(data.category)) {
    await runDocumentRecognition(tenantId, row.id);
  }
  revalidatePath("/");
  return row;
}
