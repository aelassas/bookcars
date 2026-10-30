import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { FleetView } from "@/components/fleet/FleetView";
import { getFleetForTenant } from "@/modules/fleet/queries";
import { getServerLang } from "@/platform/i18n/lang";

export default async function FleetPage({
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

  const lang = await getServerLang();
  const { mode, vehicles } = await getFleetForTenant(t.id);

  return <FleetView vehicles={vehicles} mode={mode} tenantSlug={tenantSlug} tenantId={t.id} lang={lang} />;
}
