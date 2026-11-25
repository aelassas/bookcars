"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { isValidModuleId } from "@/platform/tenant-modules";
import {
  saveBitrixConnection,
  runDiscoveryCounts,
} from "@/app/(tenant)/[tenantSlug]/settings/migration/actions";
import { connectKaiten } from "@/app/(tenant)/[tenantSlug]/settings/integrations/actions";

// Logos are stored inline as data: URLs on the tenant row (same model as
// settings/branding) — portable, no object storage, no public file exposure.
const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const LOGO_MAX_BYTES = 300 * 1024;

/** Step 1 — brand: optional logo + display name. */
export async function saveBrandStep(slug: string, formData: FormData) {
  const t = await requireTenantAdmin(slug);
  const brandName = String(formData.get("brandName") ?? "").trim() || null;

  const patch: { brandName: string | null; logoUrl?: string; updatedAt: Date } = {
    brandName,
    updatedAt: new Date(),
  };

  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) {
      return { ok: false as const, error: "Logo must be PNG, JPG, SVG or WEBP" };
    }
    if (file.size > LOGO_MAX_BYTES) {
      return { ok: false as const, error: "Logo must be 300 KB or smaller" };
    }
    const buf = Buffer.from(await file.arrayBuffer());
    patch.logoUrl = `data:${file.type};base64,${buf.toString("base64")}`;
  }

  await db.update(tenant).set(patch).where(eq(tenant.id, t.id));
  revalidatePath(`/${slug}`, "layout");
  return { ok: true as const, brandName, logoUrl: patch.logoUrl ?? null };
}

/** Step 2 — modules. */
export async function saveModulesStep(slug: string, modules: string[]) {
  const t = await requireTenantAdmin(slug);
  const valid = (modules ?? []).filter(isValidModuleId);
  // dashboard is always on so the workspace has a landing page.
  const finalModules = Array.from(new Set(["dashboard", ...valid]));
  await db.update(tenant).set({ modules: finalModules, updatedAt: new Date() }).where(eq(tenant.id, t.id));
  revalidatePath(`/${slug}`, "layout");
  return { ok: true as const, modules: finalModules };
}

/** Step 3 — connect the CRM the customer migrates from, then scan record counts. */
export async function connectMigration(
  slug: string,
  source: "bitrix24" | "kaiten",
  credential: string
) {
  const t = await requireTenantAdmin(slug);
  const cred = (credential ?? "").trim();
  if (!cred) return { ok: false as const, error: "Enter your connection details first." };

  try {
    if (source === "bitrix24") {
      await saveBitrixConnection(t.id, cred);
      const { counts, customFields } = await runDiscoveryCounts(t.id);
      return { ok: true as const, source, counts, customFields };
    } else {
      await connectKaiten(t.id, cred);
      return { ok: true as const, source, counts: {}, customFields: [] };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Could not connect.";
    return { ok: false as const, error: msg };
  }
}

/** Step 5 — finish: stamp onboarding complete and enter the workspace. */
export async function completeOnboarding(slug: string) {
  const t = await requireTenantAdmin(slug);
  await db.update(tenant).set({ onboardedAt: new Date(), updatedAt: new Date() }).where(eq(tenant.id, t.id));
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/crm`);
}
