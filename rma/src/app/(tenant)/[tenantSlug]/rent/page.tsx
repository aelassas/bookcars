import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getRentBoard } from "@/modules/crm/rent-funnels";
import { RentPipeline } from "@/components/crm/RentPipeline";
import { TenantRentPipeline } from "@/components/crm/TenantRentPipeline";
import { redirectIfNeedsOnboarding } from "../onboarding/guard";

// Babek's home: both rent brands' Bitrix funnels, side by side. Cross-tenant —
// getRentBoard enforces membership per brand, so Abdullah (cardiwan only) sees
// one funnel and Babek/Ali see both.
//
// That merged view is hardcoded to the two brands in RENT_BRANDS (see
// modules/crm/rent-funnels.ts), so it is only served under those slugs. Any
// other tenant (rma, etm, …) gets its OWN rental pipeline instead of a bare
// "No access to: cardiwan, easyrent".
const CROSS_TENANT_RENT_SLUGS = new Set(["cardiwan", "easyrent"]);

export const dynamic = "force-dynamic";

export default async function RentPipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ assignee?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  if (!CROSS_TENANT_RENT_SLUGS.has(tenantSlug)) {
    await redirectIfNeedsOnboarding(tenantSlug, t.id, t.roles);
    return (
      <TenantRentPipeline
        tenantId={t.id}
        tenantSlug={tenantSlug}
        tenantName={t.name}
        currentUserId={session.user.id}
      />
    );
  }

  const { assignee } = await searchParams;
  const board = await getRentBoard(assignee ?? null);

  return <RentPipeline board={board} tenantSlug={tenantSlug} activeAssignee={assignee ?? null} />;
}
