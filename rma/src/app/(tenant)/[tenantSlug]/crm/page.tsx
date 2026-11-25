import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { CrmDashboard } from "@/components/crm/CrmDashboard";
import { lineForTenantSlug } from "@/modules/monitor/lines";
import { redirectIfNeedsOnboarding } from "../onboarding/guard";

export default async function CrmPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  await redirectIfNeedsOnboarding(tenantSlug, t.id, t.roles);
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  // "My" default — salespeople (sales / sales_manager) open the pipeline scoped
  // to their own deals so they land in their personal funnel; coordinators and
  // admins keep the whole-tenant "All" view. The board keeps a My / All toggle
  // either way, so this only sets the initial view.
  const roles = t.roles ?? [];
  const isCoordinatorOrAdmin = roles.some((r) =>
    ["general_manager", "tenant_admin", "platform_admin"].includes(r)
  );
  const isSales = roles.includes("sales") || roles.includes("sales_manager");
  const defaultMine = isSales && !isCoordinatorOrAdmin;

  // The "To assign" inbox is where the girls (lead coordinators/validators) and
  // sales managers distribute unowned deals to salespeople.
  const canAssign = roles.some((r) =>
    ["sales_manager", "general_manager", "tenant_admin", "platform_admin"].includes(r)
  );

  // Rent brands (cardiwan/easyrent/etm) open on the Leads tab — their deal
  // funnel is effectively dead, their live work lives as leads (see
  // CrmDashboard.defaultTab). Sales brands keep the pipeline as the front door.
  const isRent = lineForTenantSlug(tenantSlug)?.key === "rent";

  return (
    <CrmDashboard
      tenantId={t.id}
      tenantName={t.name}
      tenantSlug={tenantSlug}
      currentUserId={session.user.id}
      defaultMine={defaultMine}
      canAssign={canAssign}
      defaultTab={isRent ? "leads" : "pipeline"}
      isRent={isRent}
    />
  );
}
