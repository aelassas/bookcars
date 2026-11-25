import Link from "next/link";
import { Activity } from "lucide-react";
import { getHealthBoard } from "@/modules/admin/queries";
import { PageHeader, Card, CardHeader, Table, TH, TD, Badge, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HealthBoard() {
  const rows = await getHealthBoard();

  return (
    <div>
      <PageHeader
        title="Integration & AI health"
        subtitle="Per-tenant connector status and AI provider heartbeat."
        icon={<Activity className="h-4.5 w-4.5" />}
      />

      <Card className="overflow-hidden">
        <CardHeader title="Tenants" count={rows.length} />
        <Table>
          <thead>
            <tr>
              <TH>Tenant</TH>
              <TH>Integrations</TH>
              <TH>AI provider</TH>
              <TH>AI last healthy</TH>
              <TH className="text-right">Failed events</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tenantId} className="transition-colors hover:bg-sunken/60">
                <TD>
                  <Link
                    href={`/admin/tenants/${r.tenantId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.tenantName}
                  </Link>
                </TD>
                <TD>
                  {r.integrations.length === 0 ? (
                    <span className="text-ink-3">none</span>
                  ) : (
                    <span className="flex flex-wrap gap-1.5">
                      {r.integrations.map((ic, i) => (
                        <Badge key={i} tone={ic.status === "active" ? "success" : "neutral"}>
                          {ic.provider}:{ic.status}
                        </Badge>
                      ))}
                    </span>
                  )}
                </TD>
                <TD className="text-ink">{r.ai?.provider ?? "default"}</TD>
                <TD className="text-ink-3 tnum">
                  {r.ai?.lastHealthyAt
                    ? r.ai.lastHealthyAt.toISOString().slice(0, 16).replace("T", " ")
                    : r.ai
                      ? "never"
                      : "—"}
                </TD>
                <TD
                  className={cx(
                    "text-right tnum",
                    r.recentFailures > 0 ? "font-semibold text-warn" : "text-ink-3"
                  )}
                >
                  {r.recentFailures}
                </TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <TD className="text-ink-3" colSpan={5}>
                  No tenants.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
      <p className="mt-4 text-xs text-ink-3">
        AI &ldquo;last healthy&rdquo; is updated by the per-tenant health-check job (local/auto
        providers). &ldquo;Failed events&rdquo; counts integration_event rows in error state.
      </p>
    </div>
  );
}
