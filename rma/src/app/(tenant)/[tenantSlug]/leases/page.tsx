import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import LeasesList from "@/components/lease/LeasesList";
import { getLeases } from "@/modules/lease/queries";

export default async function LeasesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("leases")) redirect(`/${tenantSlug}`);
  // Leasing is sales line + fleet + programs dept (+admin). Security is
  // rental-only and other roles have no leasing access — redirect gracefully to
  // the dashboard instead of throwing a 500 from the query's role gate.
  const LEASE_ROLES = ["sales", "sales_manager", "general_manager", "fleet", "programs_department", "tenant_admin", "platform_admin"];
  if (!(t.roles ?? []).some((r) => LEASE_ROLES.includes(r))) redirect(`/${tenantSlug}`);

  const leases = await getLeases(t.id);

  return (
    <main className="p-6">
      <LeasesList leases={leases} tenantSlug={tenantSlug} tenantId={t.id} actorId={session.user.id} />
    </main>
  );
}
