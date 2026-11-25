import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Palette } from "lucide-react";
import { db } from "@/platform/db/client";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { tenant } from "@/platform/db/schema";
import { saveBrandName, uploadLogo, removeLogo } from "./actions";
import { PageHeader, Card, CardHeader, Button, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BrandingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  let t;
  try {
    t = await requireTenantAdmin(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}`);
  }
  const [row] = await db
    .select({ name: tenant.name, brandName: tenant.brandName, logoUrl: tenant.logoUrl })
    .from(tenant)
    .where(eq(tenant.id, t.id))
    .limit(1);

  return (
    <main className="p-6">
      <div className="max-w-2xl">
        <PageHeader
          title="Branding"
          subtitle="Your logo and name appear across your workspace. Any logo is auto-fitted without distortion."
          icon={<Palette className="h-4.5 w-4.5" />}
        />

        {/* Logo */}
        <Card className="overflow-hidden">
          <CardHeader title="Logo" />
          <div className="p-4">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-44 items-center justify-center rounded-field border border-line bg-sunken">
                {row?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.logoUrl} alt="Logo" className="h-12 w-auto max-w-[160px] object-contain" />
                ) : (
                  <span className="text-xs text-ink-3">No logo yet</span>
                )}
              </div>
              {row?.logoUrl && (
                <form action={removeLogo.bind(null, tenantSlug)}>
                  <button type="submit" className="text-xs font-medium text-danger hover:underline">
                    Remove logo
                  </button>
                </form>
              )}
            </div>
            <form action={uploadLogo.bind(null, tenantSlug)} className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                required
                className="text-sm text-ink-2 file:mr-3 file:rounded-field file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
              />
              <Button type="submit">Upload</Button>
            </form>
            <p className="mt-2 text-xs text-ink-3">PNG, JPG, SVG or WEBP · up to 300 KB.</p>
          </div>
        </Card>

        {/* Display name */}
        <Card className="mt-6 overflow-hidden">
          <CardHeader title="Display name" />
          <form action={saveBrandName.bind(null, tenantSlug)} className="space-y-3 p-4">
            <Input
              name="brandName"
              defaultValue={row?.brandName ?? ""}
              placeholder={row?.name ?? "Your company name"}
              className="w-full"
            />
            <p className="text-xs text-ink-3">
              Shown in the sidebar when no logo is set. Leave blank to use “{row?.name}”.
            </p>
            <Button type="submit">Save</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
