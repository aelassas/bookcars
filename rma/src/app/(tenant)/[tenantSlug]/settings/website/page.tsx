import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { getVehicles } from "@/modules/fleet/queries";
import { WebsiteFleetManager } from "@/components/fleet/WebsiteFleetManager";
import { ButtonLink, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function WebsiteSettingsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantAdmin(tenantSlug).catch(() => null);
  if (!tenant) redirect(`/${tenantSlug}`);
  const vehicles = await getVehicles(tenant.id);

  return (
    <main className="p-6">
      <PageHeader
        title="Website fleet"
        subtitle="Choose public cars, edit their price and category, and manage website photos."
        icon={<Globe className="h-4.5 w-4.5" />}
        action={<ButtonLink href={`/${tenantSlug}/fleet`}>Add or edit cars in Fleet</ButtonLink>}
      />
      <WebsiteFleetManager
        tenantId={tenant.id}
        vehicles={vehicles.map((car) => ({
          id: car.id,
          make: car.make,
          model: car.model,
          plate: car.plate,
          dailyRate: car.dailyRate,
          published: car.websitePublished,
          category: car.websiteCategory,
          photos: car.photos ?? [],
        }))}
      />
    </main>
  );
}
