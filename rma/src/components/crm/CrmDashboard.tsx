"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PageHeader, StatCard, cx } from "@/components/ui";
import { PipelineBoard } from "./PipelineBoard";
import { LeadsList } from "./LeadsList";
import { getWatchersBoard, type WatcherColumn } from "@/modules/crm/queries";
import { DealsList } from "./DealsList";
import { WatchersBoard } from "./WatchersBoard";
import { SalesFunnel } from "./SalesFunnel";
import { CoordinatorInbox } from "./CoordinatorInbox";
import { getCrmDashboardStats } from "@/modules/crm/queries";
import { formatCurrency } from "@/lib/format";
import { Target } from "lucide-react";

type Tab = "pipeline" | "assign" | "leads" | "deals" | "watchers";

// Presentation labels for the tab strip (team speaks Russian).
const TAB_LABELS: Record<Tab, string> = {
  pipeline: "Funnel",
  watchers: "Watchers",
  assign: "To assign",
  leads: "Leads",
  deals: "Deals",
};

export function CrmDashboard({
  tenantId,
  tenantName,
  tenantSlug,
  currentUserId,
  defaultMine = false,
  canAssign = false,
  defaultTab = "pipeline",
  isRent = false,
}: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  currentUserId?: string;
  defaultMine?: boolean;
  // Coordinator/admin — sees the "To assign" inbox tab.
  canAssign?: boolean;
  // Which tab opens first. Rent brands land on "leads": their Bitrix DEAL
  // pipeline is all but dead (a handful of deals a year), while their living
  // work — WhatsApp/Insta/FB inquiries — arrives as leads. Sales brands keep
  // the deal pipeline as the front door.
  defaultTab?: Tab;
  // Rent brands: the Bitrix DEAL funnel is dead, so hide the Воронка/Сделки
  // tabs entirely and show only Leads (+ assign). Their real funnel is /rent.
  isRent?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState({ newLeads: 0, openDeals: 0, pipelineValue: 0, winRate: 0 });

  // Rent: only Leads (+ assign). Sales: the full deal-pipeline tab set.
  const tabs: Tab[] = isRent
    ? canAssign
      ? ["leads", "assign"]
      : ["leads"]
    : canAssign
      ? ["pipeline", "assign", "leads", "deals", "watchers"]
      : ["pipeline", "leads", "deals", "watchers"];
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab = requestedTab && tabs.includes(requestedTab) ? requestedTab : isRent ? "leads" : defaultTab;
  function setTab(next: Tab) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("tab", next);
    router.replace(`${pathname}?${query}`, { scroll: false });
  }

  useEffect(() => {
    getCrmDashboardStats(tenantId).then(setStats).catch(console.error);
  }, [tenantId]);

  return (
    <main className="min-h-screen p-6">
      <PageHeader
        title="Pipeline"
        subtitle={`${tenantName} — leads, deals & pipeline`}
        icon={<Target className="h-4.5 w-4.5" />}
        action={
          <div aria-label="CRM views" className="flex flex-wrap gap-1 rounded-field border border-line bg-surface p-0.5">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={cx(
                  "rounded-field px-3 py-1 text-sm font-medium",
                  tab === t ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken",
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        }
      />

      {/* Deal-centric funnel + stats are meaningless for rent (dead deal
          pipeline) — hidden there; rent works from Leads and the /rent board. */}
      {!isRent && (
        <>
          <SalesFunnel tenantId={tenantId} />
          <div className="mb-6 grid grid-cols-2 gap-4">
            <StatCard label="Open Deals" value={stats.openDeals} tone="amber" />
            <StatCard label="Pipeline Value" value={formatCurrency(stats.pipelineValue)} tone="emerald" />
          </div>
        </>
      )}

      {tab === "pipeline" && (
        <PipelineBoard tenantId={tenantId} tenantSlug={tenantSlug} currentUserId={currentUserId} defaultMine={defaultMine} />
      )}
      {tab === "assign" && canAssign && <CoordinatorInbox tenantId={tenantId} />}
      {tab === "leads" && <LeadsList tenantId={tenantId} tenantSlug={tenantSlug} />}
      {tab === "deals" && <DealsList tenantId={tenantId} tenantSlug={tenantSlug} />}
      {tab === "watchers" && <WatchersTab tenantId={tenantId} tenantSlug={tenantSlug} />}
    </main>
  );
}

// Watchers as a Pipeline tab (was a separate nav entry — one tool, one home).
function WatchersTab({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [columns, setColumns] = useState<WatcherColumn[] | null>(null);
  useEffect(() => {
    getWatchersBoard(tenantId).then(setColumns).catch(console.error);
  }, [tenantId]);
  if (!columns) return <p className="text-sm text-ink-3">Loading watchers…</p>;
  return <WatchersBoard columns={columns} tenantSlug={tenantSlug} />;
}
