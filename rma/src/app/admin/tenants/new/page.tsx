import Link from "next/link";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { provisionTenant } from "@/modules/admin/actions";
import { Card, Button, Input, Select, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold text-ink">
        <span className="mr-2 text-brand-600">{n}.</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

export default async function NewTenantPage() {
  await requirePlatformAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/admin/tenants" className="text-xs font-medium text-ink-3 hover:text-ink-2">
          ← all tenants
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">Provision tenant</h1>
      </div>

      <form action={provisionTenant} className="space-y-4">
        <Section n={1} title="Tenant">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pt-name">Name</Label>
              <Input id="pt-name" name="name" required placeholder="Acme Rentals" className="w-full" />
            </div>
            <div>
              <Label htmlFor="pt-slug">Slug</Label>
              <Input
                id="pt-slug"
                name="slug"
                required
                placeholder="acme-rentals"
                pattern="[a-z0-9-]{2,}"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="pt-locale">Region / locale</Label>
              <Input id="pt-locale" name="locale" placeholder="ae / en-AE" className="w-full" />
            </div>
            <div>
              <Label htmlFor="pt-tier">Tier</Label>
              <Select id="pt-tier" name="tier" defaultValue="starter" className="w-full">
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </Select>
            </div>
          </div>
        </Section>

        <Section n={2} title="Primary admin">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pt-admin-email">Admin email</Label>
              <Input
                id="pt-admin-email"
                name="adminEmail"
                type="email"
                required
                placeholder="omar@acme.ae"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="pt-admin-name">Admin name</Label>
              <Input id="pt-admin-name" name="adminName" placeholder="Omar" className="w-full" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="pt-billing-email">Billing email (optional)</Label>
              <Input
                id="pt-billing-email"
                name="billingEmail"
                type="email"
                placeholder="billing@acme.ae"
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-ink-3">
            The admin user is created with the tenant_admin role. Magic-link delivery is pending
            email setup — until then, set a password via seed or share login another way.
          </p>
        </Section>

        <Section n={3} title="Integrations (optional)">
          <div>
            <Label htmlFor="pt-bitrix">Bitrix24 inbound webhook URL</Label>
            <Input
              id="pt-bitrix"
              name="bitrixWebhook"
              placeholder="https://acme.bitrix24.ae/rest/..."
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="pilotEnabled" className="h-4 w-4 accent-brand-600" />
            Enable Pilot GPS connection
          </label>
        </Section>

        <Section n={4} title="AI provider">
          <div>
            <Label htmlFor="pt-ai-provider">Provider</Label>
            <Select id="pt-ai-provider" name="aiProvider" defaultValue="claude" className="w-full">
              <option value="claude">Claude (cloud)</option>
              <option value="local">Local (on-prem)</option>
              <option value="auto">Auto (local-first, Claude fallback)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pt-local-endpoint">Local endpoint</Label>
              <Input
                id="pt-local-endpoint"
                name="localEndpoint"
                placeholder="http://100.x.x.x:1234/v1"
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="pt-local-model">Local model</Label>
              <Input
                id="pt-local-model"
                name="localModel"
                placeholder="qwen2.5:14b"
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-ink-3">
            Endpoint + model are required only for local/auto. Configurable later in the tenant&apos;s
            /settings/ai.
          </p>
        </Section>

        <Section n={5} title="Confirm">
          <Button type="submit" className="w-full">
            Create tenant
          </Button>
        </Section>
      </form>
    </div>
  );
}
