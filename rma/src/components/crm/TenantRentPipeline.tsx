import { GitFork, Inbox } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui";
import { getCrmFunnel } from "@/modules/crm/queries";
import { getServerLang } from "@/platform/i18n/lang";
import { t } from "@/platform/i18n/dict";
import { PipelineBoard } from "./PipelineBoard";
import { SalesFunnel } from "./SalesFunnel";

// A tenant's OWN rental pipeline — shown on /rent for every brand that is not
// part of Babek's hardcoded cross-tenant view (cardiwan/easyrent, see
// modules/crm/rent-funnels.ts RENT_BRANDS). Reuses the exact CRM kanban pieces
// the /crm page runs on: SalesFunnel (getCrmFunnel) + PipelineBoard
// (getKanbanBoardConfig / getKanbanSummary / getKanbanStageDeals), which pick
// the detail vs coarse column layout from the tenant's own data.
export async function TenantRentPipeline({
  tenantId,
  tenantSlug,
  tenantName,
  currentUserId,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  currentUserId?: string;
}) {
  const lang = await getServerLang();
  const funnel = await getCrmFunnel(tenantId);
  const isEmpty =
    funnel.newLeads +
      funnel.qualified +
      funnel.offersSent +
      funnel.won +
      funnel.lost +
      funnel.archivedLeads +
      funnel.archivedDeals ===
    0;

  return (
    <main className="min-h-screen p-6">
      <PageHeader
        title={`${tenantName} — ${t(lang, "nav.rentPipeline")}`}
        subtitle={t(lang, "rent.ownSubtitle")}
        icon={<GitFork className="h-4.5 w-4.5" />}
      />

      {isEmpty ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={t(lang, "rent.emptyTitle")}
          description={t(lang, "rent.emptyBody")}
        />
      ) : (
        <>
          <SalesFunnel tenantId={tenantId} />
          <PipelineBoard tenantId={tenantId} tenantSlug={tenantSlug} currentUserId={currentUserId} />
        </>
      )}
    </main>
  );
}
