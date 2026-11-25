import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getLineMonitor } from "@/modules/monitor/queries";
import { businessLine, lineForTenantSlug, BUSINESS_LINES } from "@/modules/monitor/lines";
import { LineMonitor } from "@/components/monitor/LineMonitor";
import { redirectIfSalesOnlyManagerScreen } from "@/modules/rental/policies";

// A head watches this screen; it must never be cached.
export const dynamic = "force-dynamic";

/**
 * The line head's monitor — «что моя команда сейчас роняет», across every brand
 * of their business line.
 *
 * The line comes from `?line=`, defaulting to whichever line the brand in the
 * URL belongs to, so a head landing from their own brand sees their own work
 * without touching anything.
 */
export default async function MonitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ line?: string; assignee?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  await redirectIfSalesOnlyManagerScreen(tenantSlug);

  const { line: requested, assignee } = await searchParams;
  const line = businessLine(requested) ?? lineForTenantSlug(tenantSlug) ?? BUSINESS_LINES.rent;

  const data = await getLineMonitor(line.key);

  return (
    <>
      {/* Same honest zero-JS refresh «Мой день» uses — this is a wall screen. */}
      <meta httpEquiv="refresh" content="60" />
      <main className="min-h-screen bg-sunken">
        <LineMonitor data={data} tenantSlug={tenantSlug} activeAssignee={assignee ?? null} />
      </main>
    </>
  );
}
