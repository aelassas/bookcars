import Link from "next/link";
import { Activity, LayoutDashboard } from "lucide-react";
import { getPlatformStats } from "@/modules/admin/queries";
import { PageHeader, StatCard, Card, CardHeader, Table, TD } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const stats = await getPlatformStats();
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div>
      <PageHeader
        title="Platform dashboard"
        subtitle="Cross-tenant health, billing and activity at a glance."
        icon={<LayoutDashboard className="h-4.5 w-4.5" />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tenants" value={stats.tenantCount} tone="brand" />
        <StatCard label="Est. MRR (AED/mo)" value={fmt(stats.estMrr)} tone="emerald" />
        <StatCard label="Users" value={fmt(stats.userCount)} />
        <StatCard label="Active" value={stats.byStatus.active ?? 0} tone="emerald" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="By status" />
          <ul className="space-y-1 p-4 text-sm">
            {Object.entries(stats.byStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-ink-2">{k}</span>
                <span className="font-medium text-ink tnum">{v}</span>
              </li>
            ))}
            {Object.keys(stats.byStatus).length === 0 && (
              <li className="text-ink-3">no tenants</li>
            )}
          </ul>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="By tier" />
          <ul className="space-y-1 p-4 text-sm">
            {Object.entries(stats.byTier).map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="text-ink-2">{k}</span>
                <span className="font-medium text-ink tnum">{v}</span>
              </li>
            ))}
            {Object.keys(stats.byTier).length === 0 && (
              <li className="text-ink-3">no tenants</li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader
          title="Recent activity (cross-tenant)"
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <Table>
          <tbody>
            {stats.recentActivity.map((a, i) => (
              <tr key={i} className="transition-colors hover:bg-sunken/60">
                <TD className="text-ink-3 tnum">
                  {a.at.toISOString().slice(0, 16).replace("T", " ")}
                </TD>
                <TD>
                  <Link
                    href={`/admin/tenants/${a.tenantSlug}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {a.tenantName}
                  </Link>
                </TD>
                <TD className="text-ink">{a.action}</TD>
                <TD className="text-ink-3">{a.entityType}</TD>
                <TD className="text-ink-3">{a.actorEmail ?? "—"}</TD>
              </tr>
            ))}
            {stats.recentActivity.length === 0 && (
              <tr>
                <TD className="text-ink-3" colSpan={5}>
                  No activity yet.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>

      <p className="mt-4 text-xs text-ink-3">
        Est. MRR is a tier-based estimate until real billing amounts are wired.
      </p>
    </div>
  );
}
