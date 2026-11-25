import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getWatchersBoard } from "@/modules/crm/queries";
import { PageHeader } from "@/components/ui";
import { WatchersBoard } from "@/components/crm/WatchersBoard";
import { Target } from "lucide-react";

export const dynamic = "force-dynamic";

// "Наблюдатели" — the owner's guiding-star board: live demand grouped by what
// the customer actually wants, so nobody has to guess which line a deal belongs
// to. CRM-gated.
export default async function WatchersPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  const columns = await getWatchersBoard(t.id);

  return (
    <main className="p-6">
      <PageHeader
        icon={<Target className="h-4.5 w-4.5" />}
        title="Watchers"
        subtitle="Demand by customer intent — rent, lease, buyout, sale."
      />
      <WatchersBoard columns={columns} tenantSlug={tenantSlug} />
    </main>
  );
}
