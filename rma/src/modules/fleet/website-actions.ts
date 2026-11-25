"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditEvent, vehicle } from "@/platform/db/schema";
import { requireAuth } from "@/platform/auth/authorization";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { canManageFleetForTenant } from "./policies";
import type { WebsiteCarPhoto } from "./website";

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MANAGED_PHOTO_PREFIX = "/site-cars/";

function refreshWebsiteSettings() {
  revalidatePath("/[tenantSlug]/settings/website", "page");
}

export async function setWebsiteListing(
  tenantId: string,
  vehicleId: string,
  input: { published: boolean; category: string; dailyRate: number; weeklyRate: number; monthlyRate: number },
): Promise<void> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  if (!Number.isInteger(input.dailyRate) || input.dailyRate < 0) throw new Error("Daily rate must be a non-negative integer");
  if (!Number.isInteger(input.weeklyRate) || input.weeklyRate < 0) throw new Error("Weekly rate must be a non-negative integer");
  if (!Number.isInteger(input.monthlyRate) || input.monthlyRate < 0) throw new Error("Monthly rate must be a non-negative integer");
  if (input.category.length > 80) throw new Error("Category must be 80 characters or fewer");

  await withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .update(vehicle)
      .set({
        websitePublished: input.published,
        websiteCategory: input.category.trim() || null,
        dailyRate: input.dailyRate,
        weeklyRate: input.weeklyRate,
        monthlyRate: input.monthlyRate,
        updatedAt: new Date(),
      })
      .where(eq(vehicle.id, vehicleId))
      .returning({ id: vehicle.id });
    if (!row) throw new Error("Vehicle not found");
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.website.update",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: `${input.published ? "Published" : "Unpublished"} website vehicle; rates ${input.dailyRate}/${input.weeklyRate}/${input.monthlyRate} AED (d/w/m); category ${input.category.trim() || "-"}`,
    });
  });
  refreshWebsiteSettings();
}

export async function addWebsitePhoto(tenantId: string, vehicleId: string, formData: FormData): Promise<void> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a photo");
  const extension = PHOTO_TYPES[file.type];
  if (!extension) throw new Error("Photo must be JPG, PNG or WEBP");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo must be 5 MB or smaller");

  const filename = `${randomUUID()}${extension}`;
  const url = `${MANAGED_PHOTO_PREFIX}${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  let written = false;
  try {
    await withDrizzleTenant(tenantId, async (tx) => {
      const [current] = await tx.select({ photos: vehicle.photos }).from(vehicle).where(eq(vehicle.id, vehicleId)).for("update").limit(1);
      if (!current) throw new Error("Vehicle not found");
      const photos = (current.photos ?? []) as WebsiteCarPhoto[];
      if (photos.length >= 12) throw new Error("A vehicle can have up to 12 website photos");

      const dir = path.join(process.cwd(), "public", "site-cars");
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, filename), buffer);
      written = true;
      await tx.update(vehicle).set({
        photos: [...photos, { url, name: file.name.slice(0, 120) }],
        updatedAt: new Date(),
      }).where(eq(vehicle.id, vehicleId));
      await tx.insert(auditEvent).values({
        tenantId,
        actorId,
        action: "vehicle.website.photo.add",
        entityType: "vehicle",
        entityId: vehicleId,
        intent: `Added public website photo ${file.name.slice(0, 120)}`,
      });
    });
  } catch (error) {
    if (written) await unlink(path.join(process.cwd(), "public", "site-cars", filename)).catch(() => {});
    throw error;
  }
  refreshWebsiteSettings();
}

export async function removeWebsitePhoto(tenantId: string, vehicleId: string, photoUrl: string): Promise<void> {
  await canManageFleetForTenant(tenantId);
  await assertNotPreviewMode(tenantId);
  const actorId = await requireAuth();

  await withDrizzleTenant(tenantId, async (tx) => {
    const [current] = await tx.select({ photos: vehicle.photos }).from(vehicle).where(eq(vehicle.id, vehicleId)).for("update").limit(1);
    if (!current) throw new Error("Vehicle not found");
    const photos = (current.photos ?? []) as WebsiteCarPhoto[];
    const remaining = photos.filter((photo) => photo.url !== photoUrl);
    if (remaining.length === photos.length) throw new Error("Photo not found");
    await tx.update(vehicle).set({ photos: remaining, updatedAt: new Date() }).where(eq(vehicle.id, vehicleId));
    await tx.insert(auditEvent).values({
      tenantId,
      actorId,
      action: "vehicle.website.photo.remove",
      entityType: "vehicle",
      entityId: vehicleId,
      intent: "Removed public website photo",
    });
  });

  const filename = photoUrl.startsWith(MANAGED_PHOTO_PREFIX) ? photoUrl.slice(MANAGED_PHOTO_PREFIX.length) : "";
  if (filename && path.basename(filename) === filename) {
    await unlink(path.join(process.cwd(), "public", "site-cars", filename)).catch(() => {});
  }
  refreshWebsiteSettings();
}
