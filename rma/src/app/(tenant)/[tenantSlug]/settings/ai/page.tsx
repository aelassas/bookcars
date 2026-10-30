import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { aiProviderConfig } from "@/platform/db/schema";
import { PageHeader } from "@/components/ui";
import AiSettingsForm from "./AiSettingsForm";

export const dynamic = "force-dynamic";

export default async function AiSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  let t;
  try {
    t = await requireTenantAdmin(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}`);
  }

  const [cfg] = await withDrizzleTenant(t.id, async (tx) =>
    tx.select().from(aiProviderConfig).where(eq(aiProviderConfig.tenantId, t.id)).limit(1)
  );

  return (
    <main className="p-6">
      <div className="max-w-3xl">
        <PageHeader
          title="AI provider"
          subtitle="Choose where message classification and reply drafting run. Use your own on-prem model to keep customer data inside your office."
          icon={<Sparkles className="h-4.5 w-4.5" />}
        />

        <AiSettingsForm
          slug={tenantSlug}
          initial={{
            provider: cfg?.provider ?? "claude",
            localEndpoint: cfg?.localEndpoint ?? "",
            localModel: cfg?.localModel ?? "",
            lastHealthyAt: cfg?.lastHealthyAt ? cfg.lastHealthyAt.toISOString().slice(0, 16).replace("T", " ") : null,
            lastErrorAt: cfg?.lastErrorAt ? cfg.lastErrorAt.toISOString().slice(0, 16).replace("T", " ") : null,
            lastErrorText: cfg?.lastErrorText ?? null,
          }}
        />
      </div>
    </main>
  );
}
