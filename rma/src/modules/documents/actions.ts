"use server";

import { revalidatePath } from "next/cache";
import { document, auditEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { uploadDocument } from "@/platform/storage/upload";
import { auth } from "@/platform/auth";
import { canManageDocumentsForTenant } from "@/platform/auth/authorization";
import { runDocumentRecognition } from "./recognition-service";

export async function uploadDocumentForEntity(
  tenantId: string,
  data: {
    entityType: string;
    entityId: string;
    category: string;
    file: File;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await canManageDocumentsForTenant(tenantId);

  const uploaded = await uploadDocument(data.file);

  const row = await withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .insert(document)
      .values({
        tenantId,
        entityType: data.entityType,
        entityId: data.entityId,
        category: data.category,
        filename: data.file.name,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.size,
        storageKey: uploaded.key,
        publicUrl: uploaded.url,
        uploadedBy: session.user.id,
      })
      .returning();
    const r = Array.isArray(rows) ? rows[0] : rows;
    await tx.insert(auditEvent).values({
      tenantId,
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
