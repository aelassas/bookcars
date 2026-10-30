import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { vehicle } from "@/platform/db/schema";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { PageHeader } from "@/components/ui";
import { Siren } from "lucide-react";
import { FinesBoard } from "@/components/fleet/FinesBoard";
import { parsePlate } from "@/lib/plates";

export const dynamic = "force-dynamic";

export default async function TenantFinesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("fleet")) redirect(`/${tenantSlug}`);

  // Shared fleet lives in fleet-home — same pattern as Returns.
  const home = await requireFleetHomeTenantId();
  const vehicles = await withDrizzleTenant(home, async (tx) =>
    tx
      .select({ id: vehicle.id, plate: vehicle.plate, make: vehicle.make, model: vehicle.model })
      .from(vehicle)
      .orderBy(vehicle.plate),
  );

  const rows = vehicles
    .map((v) => ({
      id: v.id,
      plate: v.plate,
      label: [v.make, v.model].filter(Boolean).join(" ") || "—",
      checkable: parsePlate(v.plate) !== null,
    }))
    .sort((a, b) => Number(b.checkable) - Number(a.checkable));

  return (
    <main className="p-6">
      <PageHeader
        title="Fines & Salik"
        subtitle="Live RTA payable-fines check per car (Dubai public gateway) · Salik connects when the account login arrives"
        icon={<Siren className="h-4.5 w-4.5" />}
      />
      <FinesBoard tenantId={t.id} vehicles={rows} />
    </main>
  );
}
