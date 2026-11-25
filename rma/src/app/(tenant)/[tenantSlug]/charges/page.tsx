import { notFound, redirect } from "next/navigation";
import { Receipt } from "lucide-react";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getChargeVehicles, getRentalCharges } from "@/modules/rental-charges/queries";
import { ChargesBoard } from "@/components/rental/ChargesBoard";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ChargesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  if (!tenant.modules.includes("rentals")) redirect(`/${tenantSlug}`);
  const [charges, vehicles] = await Promise.all([getRentalCharges(tenant.id), getChargeVehicles(tenant.id)]);
  return <main className="p-6"><PageHeader title="Fines, Salik & parking" subtitle="Assigned by car and event time · separate payments · late charges stay with the responsible renter" icon={<Receipt className="h-4.5 w-4.5" />} /><ChargesBoard tenantId={tenant.id} tenantSlug={tenantSlug} charges={charges} vehicles={vehicles} /></main>;
}
