import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata = { title: "Set up your workspace" };

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  // Admin-only setup flow. Non-admins (or non-members) go to the workspace.
  try {
    await requireTenantAdmin(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/crm`);
  }

  const [row] = await db
    .select({
      name: tenant.name,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      modules: tenant.modules,
    })
    .from(tenant)
    .where(eq(tenant.slug, tenantSlug))
    .limit(1);

  if (!row) redirect(`/${tenantSlug}/crm`);

  return (
    <OnboardingWizard
      slug={tenantSlug}
      companyName={row.name}
      initialBrandName={row.brandName ?? ""}
      initialLogoUrl={row.logoUrl ?? null}
      initialModules={row.modules ?? []}
    />
  );
}
