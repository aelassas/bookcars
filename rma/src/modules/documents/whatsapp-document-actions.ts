"use server";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { canManageDocumentsForTenant } from "@/platform/auth/authorization";
import { message, rental } from "@/platform/db/schema";
import { mediaContentType, mediaFilePath } from "@/platform/media/token";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { uploadDocumentForEntity } from "./actions";

const DOCUMENT_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

type Entity = { entityType: "customer" | "rental"; entityId: string };

async function resolveCustomer(tenantId: string, entity: Entity) {
  const home = await requireFleetHomeTenantId();
  const storageTenantId = entity.entityType === "rental" ? home : tenantId;
  const customerId = await withDrizzleTenant(storageTenantId, async (tx) => {
    if (entity.entityType === "customer") return entity.entityId;
    const [row] = await tx.select({ customerId: rental.customerId }).from(rental).where(eq(rental.id, entity.entityId)).limit(1);
    if (!row) throw new Error("Rental not found");
    return row.customerId;
  });
  return { storageTenantId, customerId };
}

function isDocumentMedia(mediaPath: string): boolean {
  return /^(wa|ig)\//.test(mediaPath) && !mediaPath.includes("..") && !mediaPath.includes("\0") &&
    DOCUMENT_EXTENSIONS.has(path.extname(mediaPath).slice(1).toLowerCase());
}

export async function getWhatsAppDocumentMessages(tenantId: string, entity: Entity) {
  await canManageDocumentsForTenant(tenantId);
  const { storageTenantId, customerId } = await resolveCustomer(tenantId, entity);
  const rows = await withDrizzleTenant(storageTenantId, (tx) => tx.select({
    id: message.id,
    body: message.body,
    mediaPath: message.mediaPath,
    createdAt: message.createdAt,
  }).from(message).where(and(
    eq(message.customerId, customerId),
    eq(message.direction, "inbound"),
    isNotNull(message.mediaPath),
  )).orderBy(desc(message.createdAt)).limit(100));
  return rows.filter((row): row is typeof row & { mediaPath: string } => Boolean(row.mediaPath && isDocumentMedia(row.mediaPath)));
}

export async function importWhatsAppDocument(
  tenantId: string,
  entity: Entity,
  category: string,
  messageId: string,
) {
  await canManageDocumentsForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const { storageTenantId, customerId } = await resolveCustomer(tenantId, entity);
  const source = await withDrizzleTenant(storageTenantId, async (tx) => {
    const [row] = await tx.select({ mediaPath: message.mediaPath }).from(message).where(and(
      eq(message.id, messageId),
      eq(message.customerId, customerId),
      eq(message.direction, "inbound"),
      isNotNull(message.mediaPath),
    )).limit(1);
    return row?.mediaPath ?? null;
  });
  if (!source || !isDocumentMedia(source)) throw new Error("WhatsApp document not found for this customer");
  const sourcePath = mediaFilePath(source);
  const info = await stat(sourcePath);
  if (!info.isFile() || info.size === 0 || info.size > MAX_DOCUMENT_BYTES) throw new Error("WhatsApp document is empty or larger than 10 MB");
  const bytes = await readFile(sourcePath);
  const file = new File([new Uint8Array(bytes)], path.basename(source), { type: mediaContentType(source) });
  return uploadDocumentForEntity(tenantId, { ...entity, category, file });
}
