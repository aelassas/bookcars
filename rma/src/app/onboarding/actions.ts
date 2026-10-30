"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { db } from "@/platform/db/client";
import { tenant, tenantMember } from "@/platform/db/schema";
import { isPlatformAdmin } from "@/platform/auth/authorization";
import { generateCallGearWebhookToken } from "@/platform/integrations/callgear/webhook";
import { isValidModuleId, DEFAULT_MODULES } from "@/platform/tenant-modules";

export async function createTenantForCurrentUser(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Tenants are provisioned by the vendor team via /admin/tenants/new.
  // Self-serve creation is restricted to platform admins so a tenant user
  // can't spin up extra (unpaid) tenants.
  if (!(await isPlatformAdmin(session.user.id))) {
    redirect("/");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!name || !/^[a-z0-9-]{2,}$/.test(slugRaw)) {
    throw new Error("Invalid workspace name or slug");
  }

  const [existing] = await db.select().from(tenant).where(eq(tenant.slug, slugRaw)).limit(1);
  if (existing) {
    throw new Error(`Workspace slug "${slugRaw}" is taken`);
  }

  const modulesRaw: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === "modules[]" && typeof value === "string") {
      modulesRaw.push(value);
    }
  }
  const modules = modulesRaw.length > 0 ? modulesRaw.filter(isValidModuleId) : DEFAULT_MODULES;

  const inserted = await db
    .insert(tenant)
    .values({
      slug: slugRaw,
      name,
      modules,
      callgearWebhookToken: generateCallGearWebhookToken(),
    })
    .returning();
  const created = Array.isArray(inserted) ? inserted[0] : inserted;

  await db.insert(tenantMember).values({
    tenantId: created.id,
    userId: session.user.id,
    roles: ["tenant_admin"],
  });

  // Hand off to the guided setup wizard (brand → modules → migrate → team).
  redirect(`/${created.slug}/onboarding`);
}
