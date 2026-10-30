import { notFound, redirect } from "next/navigation";
import { Cable } from "lucide-react";
import { getIntegrationStatus, connectBitrix24, connectKaiten, syncBitrix24Now, syncKaitenNow, cutoverToPlatform } from "./actions";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { PLATFORM_NAME } from "@/platform/brand";
import { PageHeader, Card, Badge, Button, Input } from "@/components/ui";

export default async function IntegrationsPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return notFound();
  // Settings are admin-only; non-admins (ops/security) go to their dashboard.
  if (!tenant.roles.includes("tenant_admin") && !tenant.roles.includes("platform_admin")) redirect(`/${tenantSlug}`);

  const status = await getIntegrationStatus(tenant.id);

  const isPreview = status.migrationStatus === "preview";
  const isCutover = status.migrationStatus === "cutover";

  return (
    <main className="p-6">
      <div className="max-w-4xl">
        <PageHeader
          title="Data Bridge"
          subtitle={`Connect your existing tools to preview your data in ${PLATFORM_NAME} before cutting over.`}
          icon={<Cable className="h-4.5 w-4.5" />}
        />

        {isPreview && (
          <div className="mb-6 rounded-field border border-warn-line bg-warn-soft px-4 py-3 text-sm text-warn">
            <strong>Preview Mode Active</strong> — Your data is synced and visible across the platform.
            Edits are disabled until cutover.
          </div>
        )}

        {isCutover && (
          <div className="mb-6 rounded-field border border-success-line bg-success-soft px-4 py-3 text-sm text-success">
            <strong>Cutover Complete</strong> — {PLATFORM_NAME} is now your system of record.
          </div>
        )}

        <div className="space-y-6">
          {/* Bitrix24 Card */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Bitrix24</h2>
                <p className="text-sm text-ink-2">CRM, leads, deals, contacts</p>
              </div>
              {status.bitrix ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <Badge tone="neutral">Not connected</Badge>
              )}
            </div>

            {status.bitrix ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Contacts" value={status.bitrix.counts.contacts} />
                  <Stat label="Leads" value={status.bitrix.counts.leads} />
                  <Stat label="Deals" value={status.bitrix.counts.deals} />
                </div>
                {status.bitrix.lastSyncAt && (
                  <p className="text-xs text-ink-3">
                    Last sync: {new Date(status.bitrix.lastSyncAt).toLocaleString()}
                  </p>
                )}
                {!isCutover && (
                  <div className="flex gap-2">
                    <form action={async () => {
                      "use server";
                      await syncBitrix24Now(tenant.id, true);
                    }}>
                      <Button type="submit" disabled={isCutover}>
                        Quick Preview (200)
                      </Button>
                    </form>
                    <form action={async () => {
                      "use server";
                      await syncBitrix24Now(tenant.id, false);
                    }}>
                      <Button type="submit" variant="secondary" disabled={isCutover}>
                        Full Sync
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const url = formData.get("bitrixWebhook") as string;
                  await connectBitrix24(tenant.id, url);
                }}
                className="flex gap-2"
              >
                <Input
                  name="bitrixWebhook"
                  type="url"
                  placeholder="https://takeauto-bx24.com/rest/..."
                  className="flex-1"
                  required
                />
                <Button type="submit">Connect</Button>
              </form>
            )}
          </Card>

          {/* Kaiten Card */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">Kaiten</h2>
                <p className="text-sm text-ink-2">Fleet inventory & stock board</p>
              </div>
              {status.kaiten ? (
                <Badge tone="success">Connected</Badge>
              ) : (
                <Badge tone="neutral">Not connected</Badge>
              )}
            </div>

            {status.kaiten ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Stat label="Vehicles" value={status.kaiten.counts.vehicles} />
                </div>
                {status.kaiten.lastSyncAt && (
                  <p className="text-xs text-ink-3">
                    Last sync: {new Date(status.kaiten.lastSyncAt).toLocaleString()}
                  </p>
                )}
                {!isCutover && (
                  <form action={async () => {
                    "use server";
                    await syncKaitenNow(tenant.id);
                  }}>
                    <Button type="submit" disabled={isCutover}>
                      Sync Now
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const key = formData.get("kaitenKey") as string;
                  await connectKaiten(tenant.id, key);
                }}
                className="flex gap-2"
              >
                <Input
                  name="kaitenKey"
                  type="password"
                  placeholder="Kaiten API key"
                  className="flex-1"
                  required
                />
                <Button type="submit">Connect</Button>
              </form>
            )}
          </Card>

          {/* CallGear Card — ANALYZE-ONLY (observe calls, read-only, no sender) */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink">CallGear</h2>
                <p className="text-sm text-ink-2">Telephony — observed calls</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="info">Read-only · analyze</Badge>
                {status.callgear.mode === "live" ? (
                  <Badge tone="success">Live</Badge>
                ) : (
                  <Badge tone="neutral">Not connected</Badge>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Observed calls" value={status.callgear.counts.calls} />
              </div>
              {status.callgear.lastEventAt && (
                <p className="text-xs text-ink-3">
                  Last call event: {new Date(status.callgear.lastEventAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-ink-2">
                {status.callgear.mode === "live"
                  ? `Connected read-only to ${status.callgear.baseUrl}. Calls are pulled and analyzed — nothing is ever sent back to CallGear.`
                  : "Waiting for the API key. The engineer sets CALLGEAR_API_KEY + CALLGEAR_BASE_URL in the server env (analyze-only); observed calls appear here once the poller runs."}
              </p>
            </div>
          </Card>

          {/* Cutover */}
          {isPreview && (
            <Card className="p-6">
              <h2 className="mb-2 text-base font-semibold text-ink">Ready to switch?</h2>
              <p className="mb-4 text-sm text-ink-2">
                Once you cut over, {PLATFORM_NAME} becomes your system of record. Sync from Bitrix and Kaiten stops.
              </p>
              <form
                action={async () => {
                  "use server";
                  await cutoverToPlatform(tenant.id);
                }}
              >
                <Button type="submit">🚀 Start Using {PLATFORM_NAME}</Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-field bg-sunken px-4 py-3 text-center">
      <div className="text-xl font-semibold text-ink tnum">{value.toLocaleString()}</div>
      <div className="text-xs text-ink-3">{label}</div>
    </div>
  );
}
