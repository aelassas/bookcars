import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import CollectionsView from "@/components/collections/CollectionsView";
import { getCollectionsRentals } from "@/modules/collections/queries";
import { redirectIfSalesOnlyRentOps } from "@/modules/rental/policies";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("collections")) redirect(`/${tenantSlug}`);
  await redirectIfSalesOnlyRentOps(tenantSlug);

  const rentals = await getCollectionsRentals(t.id);

  return (
    <main className="p-6">
      <CollectionsView rentals={rentals} tenantSlug={tenantSlug} tenantId={t.id} />
    </main>
  );
}
