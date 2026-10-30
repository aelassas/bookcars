import Link from "next/link";
import { Building2 } from "lucide-react";
import { listTenants } from "@/modules/admin/queries";
import { PageHeader, ButtonLink, Card, CardHeader, Table, TH, TD, Badge, cx } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["", "active", "trial", "suspended", "churned"];
const TIERS = ["", "starter", "growth", "pro", "enterprise"];

function statusTone(s: string): BadgeTone {
  return s === "active"
    ? "success"
    : s === "trial"
      ? "info"
      : s === "suspended"
        ? "warning"
        : "neutral";
}

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string }>;
}) {
  const sp = await searchParams;
  const tenants = await listTenants({ status: sp.status, tier: sp.tier });

  const qs = (patch: Record<string, string>) => {
    const merged = { ...sp, ...patch } as Record<string, string>;
    const entries = Object.entries(merged).filter(([, v]) => v);
    return entries.length ? "?" + new URLSearchParams(entries).toString() : "";
  };

  const pill = (active: boolean) =>
    cx(
      "rounded-full px-2.5 py-1 font-medium transition-colors",
      active ? "bg-brand-50 text-brand-700" : "text-ink-2 hover:bg-sunken hover:text-ink"
    );

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Every workspace on the platform — lifecycle, tier and membership."
        icon={<Building2 className="h-4.5 w-4.5" />}
        action={<ButtonLink href="/admin/tenants/new" variant="primary">+ Provision tenant</ButtonLink>}
      />

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-medium text-ink-3">Status:</span>
          {STATUSES.map((s) => (
            <Link
              key={s || "all"}
              href={`/admin/tenants${qs({ status: s })}`}
              className={pill(sp.status === s || (!sp.status && !s))}
            >
              {s || "all"}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-medium text-ink-3">Tier:</span>
          {TIERS.map((s) => (
            <Link
              key={s || "all"}
              href={`/admin/tenants${qs({ tier: s })}`}
              className={pill(sp.tier === s || (!sp.tier && !s))}
            >
              {s || "all"}
            </Link>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Tenants" count={tenants.length} />
        <Table>
          <thead>
            <tr>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Status</TH>
              <TH>Tier</TH>
              <TH className="text-right">Members</TH>
              <TH>Billing email</TH>
              <TH>Created</TH>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-sunken/60">
                <TD>
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {t.name}
                  </Link>
                </TD>
                <TD className="text-ink-3">{t.slug}</TD>
                <TD>
                  <Badge tone={statusTone(t.status)}>{t.status}</Badge>
                </TD>
                <TD className="text-ink">{t.tier}</TD>
                <TD className="text-right text-ink tnum">{t.memberCount}</TD>
                <TD className="text-ink-3">{t.billingEmail ?? "—"}</TD>
                <TD className="text-ink-3 tnum">{t.createdAt.toISOString().slice(0, 10)}</TD>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <TD className="text-ink-3" colSpan={7}>
                  No tenants match.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
