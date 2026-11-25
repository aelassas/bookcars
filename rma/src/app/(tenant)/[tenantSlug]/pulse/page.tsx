import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getPulseBoard, getUnassignedStream } from "@/modules/crm/pulse-queries";
import { PageHeader } from "@/components/ui";
import { PulseBoard } from "@/components/crm/PulseBoard";
import { Activity } from "lucide-react";
import { redirectIfSalesOnlyManagerScreen } from "@/modules/rental/policies";

export const dynamic = "force-dynamic";

// "Пульс" — живые разговоры: сегодняшние сверху, горячие подсвечены, «клиент
// ждёт N ч» на неотвеченных. Разговоры = сшитые с CRM ветки WhatsApp; вторая
// вкладка «Не распределено» — нераспознанные номера. CRM-gated.
export default async function PulsePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  await redirectIfSalesOnlyManagerScreen(tenantSlug);
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  const [convos, unassigned] = await Promise.all([
    getPulseBoard(t.id),
    getUnassignedStream(t.id),
  ]);

  return (
    <main className="p-6">
      <PageHeader
        icon={<Activity className="h-4.5 w-4.5" />}
        title="Pulse"
        subtitle="Live conversations — hot ones on top, waiting-for-reply highlighted."
      />
      <PulseBoard tenantSlug={tenantSlug} convos={convos} unassigned={unassigned} />
    </main>
  );
}
