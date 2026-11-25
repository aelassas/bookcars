"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { tenant, auditEvent } from "@/platform/db/schema";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";

// SPEC: per-tenant white-label branding. Logo is stored inline as a data:
// URL (portable — no object storage), normalized for display via CSS
// object-contain in the sidebar. tenant is a global table (no RLS), so the
// brand fields are updated via plain db; audit goes through withDrizzleTenant.

const ALLOWED = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_BYTES = 300 * 1024; // 300 KB — logos should be small

async function audit(tenantId: string, actorId: string, intent: string) {
  try {
    await withDrizzleTenant(tenantId, async (tx) => {
      await tx.insert(auditEvent).values({
        tenantId,
        actorId,
        action: "branding_updated",
        entityType: "tenant",
        entityId: tenantId,
        intent,
      });
    });
  } catch {
    /* best-effort */
  }
}

export async function saveBrandName(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const brandName = String(formData.get("brandName") ?? "").trim() || null;
  await db.update(tenant).set({ brandName, updatedAt: new Date() }).where(eq(tenant.id, t.id));
  await audit(t.id, actorId, `brand name → ${brandName ?? "(cleared)"}`);
  revalidatePath(`/${slug}/settings/branding`);
}

export async function uploadLogo(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a logo file");
  }
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Logo must be PNG, JPG, SVG or WEBP");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Logo must be 300 KB or smaller");
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  await db.update(tenant).set({ logoUrl: dataUrl, updatedAt: new Date() }).where(eq(tenant.id, t.id));
  await audit(t.id, actorId, `logo uploaded (${Math.round(file.size / 1024)} KB)`);
  revalidatePath(`/${slug}/settings/branding`);
}

export async function removeLogo(slug: string): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();
  await db.update(tenant).set({ logoUrl: null, updatedAt: new Date() }).where(eq(tenant.id, t.id));
  await audit(t.id, actorId, "logo removed");
  revalidatePath(`/${slug}/settings/branding`);
}
