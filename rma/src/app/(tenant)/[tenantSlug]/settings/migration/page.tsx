import { notFound, redirect } from "next/navigation";
import { Database } from "lucide-react";
import { getTenantBySlug } from "@/platform/auth/tenant";
import MigrationClient from "./MigrationClient";
import { getBitrixConnection, getPipelineMapping } from "./actions";
import { PLATFORM_NAME } from "@/platform/brand";
import { PageHeader } from "@/components/ui";

export default async function MigrationPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();

  if (!t.roles.includes("tenant_admin") && !t.roles.includes("platform_admin")) {
    redirect(`/${tenantSlug}`);
  }

  const connection = await getBitrixConnection(t.id);
  const mapping = await getPipelineMapping(t.id);

  return (
    <main className="p-6">
      <div className="max-w-4xl">
        <PageHeader
          title="Bitrix24 Migration"
          subtitle={`Discover, map, and dry-run your Bitrix24 data before cutting over to ${PLATFORM_NAME}.`}
          icon={<Database className="h-4.5 w-4.5" />}
        />
        <MigrationClient
          tenantId={t.id}
          tenantSlug={tenantSlug}
          initialConnected={!!connection?.connected}
          initialMaskedUrl={connection?.maskedUrl ?? ""}
          initialMapping={mapping}
        />
      </div>
    </main>
  );
}
