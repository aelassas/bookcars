import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { ContractsList } from "@/components/fleet/ContractsList";
import { PageHeader } from "@/components/ui";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ContractsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  return (
    <main className="min-h-screen p-6">
      <PageHeader title="Contracts" subtitle={`${t.name} — handovers, returns, exchanges from Telegram`} icon={<FileText className="h-4.5 w-4.5" />} />
      <ContractsList tenantId={t.id} />
    </main>
  );
}
