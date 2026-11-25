import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getPerformanceBoard } from "@/modules/crm/perf-queries";
import { Card, Table, TH, TD, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

// Team performance (P4): the head's "who performs, who doesn't answer" board.
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();

  const { days: daysParam } = await searchParams;
  const days = daysParam === "30" ? 30 : 7;
  const rows = await getPerformanceBoard(t.id, days);

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
            <BarChart3 className="h-5 w-5 text-brand-600" /> Team performance
          </h1>
          <p className="mt-0.5 text-sm text-ink-2">Leads, answers, wins — per person, last {days} days</p>
        </div>
        <div className="flex gap-1 rounded-field border border-line bg-surface p-0.5 text-xs">
          {[7, 30].map((d) => (
            <a
              key={d}
              href={`/${tenantSlug}/analytics?days=${d}`}
              className={`rounded-field px-3 py-1 font-medium ${days === d ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken"}`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <thead>
            <tr>
              <TH>Person</TH>
              <TH>Leads</TH>
              <TH>Answered (2h)</TH>
              <TH>Won</TH>
              <TH>Won, AED</TH>
              <TH>Open deals</TH>
              <TH>Calls out/in</TH>
              <TH>Missed</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const rate = r.inbound > 0 ? Math.round((r.answered / r.inbound) * 100) : null;
              return (
                <tr key={r.name}>
                  <TD className="font-medium text-ink">{r.name}</TD>
                  <TD className="tnum">{r.leads}</TD>
                  <TD>
                    {rate == null ? (
                      <span className="text-ink-3">—</span>
                    ) : (
                      <Badge tone={rate >= 80 ? "success" : rate >= 50 ? "warning" : "danger"}>
                        {r.answered}/{r.inbound} · {rate}%
                      </Badge>
                    )}
                  </TD>
                  <TD className="tnum">{r.dealsWon}</TD>
                  <TD className="tnum">{r.wonAed > 0 ? formatCurrency(r.wonAed) : "—"}</TD>
                  <TD className="tnum">{r.openDeals}</TD>
                  <TD className="tnum">
                    {r.callsOut}/{r.callsIn}
                  </TD>
                  <TD>{r.callsMissed > 0 ? <Badge tone="danger">{r.callsMissed}</Badge> : <span className="text-ink-3">0</span>}</TD>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <TD colSpan={8} className="py-8 text-center text-ink-3">
                  No sales-team members found for this tenant.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </main>
  );
}
