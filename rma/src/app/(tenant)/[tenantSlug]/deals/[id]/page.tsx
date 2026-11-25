import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getDealById } from "@/modules/crm/queries";
import { getLeadThread, getLeadReplyContext } from "@/modules/crm/chat-queries";
import { Badge, Card, type BadgeTone } from "@/components/ui";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { ChatThread } from "@/components/crm/ChatThread";
import { RefreshCw } from "lucide-react";
import DealEditor from "./DealEditor";

const TYPE_TONE: Record<string, BadgeTone> = {
  rent: "info",
  lease: "brand",
  purchase: "success",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  open: "info",
  won: "success",
  lost: "danger",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, id } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  const deal = await getDealById(t.id, id);
  if (!deal) notFound();

  // WhatsApp conversation strip: reuse the lead's ChatThread wholesale (same
  // server-side thread + reply-context prefetch as crm/leads/[leadId]/page.tsx).
  // Only when the deal carries a lead — otherwise there is no phone thread.
  const leadId = deal.leadId;
  const chat = leadId
    ? await Promise.all([getLeadThread(t.id, leadId), getLeadReplyContext(t.id, leadId)])
    : null;

  return (
    <main className="p-6">
      <BackLink href={`/${tenantSlug}/deals`}>Back to deals</BackLink>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{deal.ref}</h1>
        <Badge tone={TYPE_TONE[deal.type] ?? "neutral"}>{deal.type}</Badge>
        <Badge tone={STATUS_TONE[deal.status] ?? "neutral"}>{deal.status}</Badge>
      </div>

      {deal.externalSource === "bitrix24" && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-field border border-line bg-sunken/60 px-2.5 py-1 text-xs text-ink-3">
          <RefreshCw className="h-3 w-3" />
          Synced from Bitrix (id: {deal.externalId})
        </p>
      )}

      {/* Data markers (owner 2026-07-29): every deal card must show at a
          glance — id, intake date, responsible, value, origin. Bitrix data
          is preserved, not trimmed. */}
      <Card className="mt-4 p-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-3">Deal ID</dt>
            <dd className="text-ink tnum">#{deal.id.slice(0, 8)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-3">Date of input</dt>
            <dd className="text-ink">{formatDateTime(deal.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-3">Responsible</dt>
            <dd className="text-ink">{deal.ownerName ?? "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-3">Value</dt>
            <dd className="text-ink tnum">{deal.value != null ? formatCurrency(deal.value) : "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-ink-3">Origin</dt>
            <dd className="text-ink capitalize">
              {deal.externalSource ? `via ${deal.externalSource}` : "—"}
            </dd>
          </div>
          {deal.externalId && (
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-ink-3">Bitrix ID</dt>
              <dd className="text-ink tnum">#{deal.externalId}</dd>
            </div>
          )}
        </dl>
      </Card>

      <DealEditor
        tenantId={t.id}
        tenantSlug={tenantSlug}
        actorId={session.user.id}
        deal={{
          id: deal.id,
          ref: deal.ref,
          type: deal.type,
          status: deal.status,
          stage: deal.stage,
          stageDetail: deal.stageDetail,
          intent: deal.intent,
          value: deal.value,
          balanceDue: deal.balanceDue,
          notes: deal.notes,
          leadId: deal.leadId,
        }}
        attachedVehicle={deal.vehicle ?? null}
      />

      {leadId && chat && (
        <div className="mt-6">
          <ChatThread
            entityType="lead"
            tenantSlug={tenantSlug}
            tenantId={t.id}
            entityId={leadId}
            initialThread={chat[0]}
            initialReplyContext={chat[1]}
          />
        </div>
      )}
    </main>
  );
}
