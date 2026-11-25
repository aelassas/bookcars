import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { auditEvent, document, rental } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import type { TarsClient } from "@/platform/integrations/tars/client";

export async function storeRentalContract(options: {
  tenantId: string;
  rentalId: string;
  bytes: Buffer;
  filename: string;
  actorId: string | null;
  source: "generated" | "tars";
}): Promise<{ url: string; created: boolean }> {
  if (options.bytes.length === 0 || options.bytes.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("Contract must be a valid PDF");
  }
  const safeName = options.filename.replace(/[^A-Za-z0-9.-]/g, "_").slice(-100);
  const storageKey = `${randomUUID()}-${safeName}`;
  const directory = path.join(process.cwd(), ".private-uploads", "documents");
  await mkdir(directory, { recursive: true });
  const filePath = path.join(directory, storageKey);
  await writeFile(filePath, options.bytes, { mode: 0o600 });

  let result: { url: string; created: boolean };
  try {
    result = await withDrizzleTenant(options.tenantId, async (tx) => {
      const [current] = await tx.select({ contractUrl: rental.contractUrl, tarsDocumentNumber: rental.tarsDocumentNumber }).from(rental)
        .where(eq(rental.id, options.rentalId)).for("update").limit(1);
      if (!current) throw new Error("Rental not found");
      if (current.contractUrl) return { url: current.contractUrl, created: false };
      if (options.source === "generated" && current.tarsDocumentNumber) {
        throw new Error(`TARS contract ${current.tarsDocumentNumber} already exists; sync its PDF instead`);
      }
      const rows = await tx.insert(document).values({
        tenantId: options.tenantId,
        entityType: "rental",
        entityId: options.rentalId,
        category: "rental_contract",
        filename: safeName,
        mimeType: "application/pdf",
        sizeBytes: options.bytes.length,
        storageKey,
        publicUrl: "/api/files/pending",
        uploadedBy: options.actorId,
      }).returning({ id: document.id });
      const doc = Array.isArray(rows) ? rows[0] : rows;
      const url = `/api/files/${doc.id}`;
      await tx.update(document).set({ publicUrl: url }).where(eq(document.id, doc.id));
      await tx.update(rental).set({ contractUrl: url, updatedAt: new Date() }).where(eq(rental.id, options.rentalId));
      await tx.insert(auditEvent).values({
        tenantId: options.tenantId,
        actorId: options.actorId,
        action: options.source === "tars" ? "rental.tars.contract_synced" : "rental.contract.generated",
        entityType: "rental",
        entityId: options.rentalId,
        intent: options.source === "tars" ? `Downloaded the existing TARS contract PDF as document ${doc.id}` : `Generated a new RMA contract PDF as document ${doc.id}`,
      });
      return { url, created: true };
    });
  } catch (error) {
    await unlink(filePath).catch(() => {});
    throw error;
  }
  if (!result.created) await unlink(filePath).catch(() => {});
  return result;
}

export async function syncTarsRentalContract(options: {
  tenantId: string;
  rentalId: string;
  actorId: string | null;
  client: TarsClient;
}): Promise<{ url: string; created: boolean }> {
  const current = await withDrizzleTenant(options.tenantId, async (tx) => {
    const [row] = await tx.select({ contractUrl: rental.contractUrl, tarsDocumentNumber: rental.tarsDocumentNumber })
      .from(rental).where(eq(rental.id, options.rentalId)).limit(1);
    if (!row) throw new Error("Rental not found");
    return row;
  });
  if (current.contractUrl) return { url: current.contractUrl, created: false };
  if (!current.tarsDocumentNumber) throw new Error("This rental is not linked to an existing TARS contract");
  const contract = await options.client.downloadContract(current.tarsDocumentNumber);
  return storeRentalContract({
    tenantId: options.tenantId,
    rentalId: options.rentalId,
    actorId: options.actorId,
    bytes: contract.bytes,
    filename: contract.filename,
    source: "tars",
  });
}
