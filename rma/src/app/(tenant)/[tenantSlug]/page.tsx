import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import OverviewDashboard from "@/components/dashboard/OverviewDashboard";
import { getDashboardStats } from "@/modules/dashboard/queries";
import { lineForTenantSlug } from "@/modules/monitor/lines";
import { redirectIfNeedsOnboarding } from "./onboarding/guard";

export default async function TenantOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login/${tenantSlug}`);

  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  await redirectIfNeedsOnboarding(tenantSlug, t.id, t.roles);

  // Route each person to THEIR flow (owner order 2026-07-26 — "they must see
  // their flow on login"):
  //   • line heads (general_manager, e.g. Babek) → the cross-brand monitor;
  //   • sales/rent staff → «Мой день» (waiting + hot + jump-to-WhatsApp);
  //   • admins / ops / CEO → the manager dashboard below.
  const roles = t.roles ?? [];
  const isRent = lineForTenantSlug(tenantSlug)?.key === "rent";
  // Rent home is the calendar cockpit (owner 2026-07-27: "rent lives in the
  // calendar") — for the whole rent desk, not just the head. The /rent funnel
  // stays reachable from the sidebar.
  if (isRent) {
    redirect(`/${tenantSlug}/fleet/availability`);
  }
  if (roles.includes("general_manager")) {
    redirect(`/${tenantSlug}/monitor`);
  }
  if (roles.some((r) => r === "sales" || r === "sales_manager")) {
    redirect(`/${tenantSlug}/my`);
  }

  const stats = await getDashboardStats(t.id);

  return <OverviewDashboard stats={stats} tenantSlug={tenantSlug} />;
}
