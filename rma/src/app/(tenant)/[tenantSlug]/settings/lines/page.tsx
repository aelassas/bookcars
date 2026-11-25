import { notFound, redirect } from "next/navigation";
import { Phone } from "lucide-react";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageLines } from "@/modules/lines/access";
import { PageHeader } from "@/components/ui";
import LinesPanel from "@/app/(hub)/lines/LinesPanel";

export const dynamic = "force-dynamic";

// WhatsApp line pairing INSIDE the tenant shell (Settings → WhatsApp lines).
// Same LinesPanel as the hub /lines page — the client polls the absolute
// /lines/api routes either way — but the CRM sidebar stays put, so the owner
// never feels teleported into a separate console. Guards stack: tenant admin
// for the settings surface AND canManageLines for the lines operation itself.
export default async function LinesSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return notFound();
  if (!tenant.roles.includes("tenant_admin") && !tenant.roles.includes("platform_admin")) {
    redirect(`/${tenantSlug}`);
  }
  const access = await canManageLines();
  if (!access) redirect(`/${tenantSlug}`);

  return (
    <main className="p-6">
      <div className="max-w-6xl">
        <PageHeader
          title="WhatsApp lines"
          subtitle="Pair and monitor the business WhatsApp numbers this CRM observes. Live from the observer box · refreshes every 10s."
          icon={<Phone className="h-4.5 w-4.5" />}
        />
        <LinesPanel />
      </div>
    </main>
  );
}
