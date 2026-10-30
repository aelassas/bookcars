import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getLeaseWithDetails } from "@/modules/lease/queries";
import { LeaseDetail } from "@/components/lease/LeaseDetail";

interface Props {
  params: Promise<{ tenantSlug: string; leaseId: string }>;
}

export default async function LeaseDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, leaseId } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("leases")) redirect(`/${tenantSlug}`);
  // Leasing is sales line + fleet + programs dept (+admin); security is
  // rental-only. Redirect gracefully instead of throwing a 500.
  const LEASE_ROLES = ["sales", "sales_manager", "general_manager", "fleet", "programs_department", "tenant_admin", "platform_admin"];
  if (!(t.roles ?? []).some((r) => LEASE_ROLES.includes(r))) redirect(`/${tenantSlug}`);

  const data = await getLeaseWithDetails(t.id, leaseId);
  if (!data) notFound();

  const canConfirm = (t.roles ?? []).some((r) => ["sales", "sales_manager", "general_manager", "tenant_admin", "platform_admin"].includes(r));

  return (
    <main className="p-6">
      <LeaseDetail
        tenantId={t.id}
        tenantSlug={tenantSlug}
        lease={data.lease}
        customerName={data.customerName}
        customerPhone={data.customerPhone}
        vehicleLabel={`${data.vehicleMake} ${data.vehicleModel} (${data.vehiclePlate})`}
        installments={data.installments}
        payments={data.payments}
        actorId={session.user.id}
        canConfirm={canConfirm}
      />
    </main>
  );
}
