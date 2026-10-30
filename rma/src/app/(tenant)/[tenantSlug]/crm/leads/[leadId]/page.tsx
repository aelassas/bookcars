import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getLeadById, getAssignableMembers } from "@/modules/crm/queries";
import { getRentVehicles } from "@/modules/rental/queries";
import { LeadBookingButton } from "@/components/crm/LeadBookingButton";
import { getLeadCalls } from "@/modules/crm/call-actions";
import { CallSection } from "@/components/crm/CallSection";
import { getLeadThread, getLeadReplyContext } from "@/modules/crm/chat-queries";
import { canonicalName } from "@/modules/monitor/people";
import { funnelStageLabel } from "@/platform/integrations/bitrix24/mappings";
import { LeadStageBar } from "@/components/crm/LeadStageBar";
import { ChatThread } from "@/components/crm/ChatThread";
import { Card } from "@/components/ui";
import { formatDateTime, formatCurrency } from "@/lib/format";
import { humanizeLeadSource } from "@/lib/source-label";
import { ChevronLeft } from "lucide-react";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; leadId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug, leadId } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  const leadRow = await getLeadById(t.id, leadId);
  if (!leadRow) notFound();

  // Thread + composer eligibility both read here (server) so the first paint
  // is already correct; ChatThread then polls client-side (see its
  // POLL_MS) for a simple refetch-based "feels live" update — a realtime
  // channel (SSE) is a later increment per the task brief.
  const [thread, replyContext, members, calls, vehicles] = await Promise.all([
    getLeadThread(t.id, leadId),
    getLeadReplyContext(t.id, leadId),
    getAssignableMembers(t.id).catch(() => []),
    getLeadCalls(t.id, leadId),
    getRentVehicles(t.id).catch(() => []),
  ]);

  // assignedTo is a user id — show the human name (collapsed to canonical form,
  // e.g. "Бабек Садыгов" → "Babek") instead of a raw UUID.
  const assigneeName = leadRow.assignedTo
    ? canonicalName(members.find((m) => m.userId === leadRow.assignedTo)?.name) ?? "Assigned"
    : "Unassigned";

  return (
    <main className="p-6">
      <Link
        href={`/${tenantSlug}/crm?tab=leads`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" /> CRM
      </Link>

      <div className="mt-3">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {leadRow.customerName ?? "No name"}
        </h1>
        <p className="mt-0.5 text-sm text-ink-2 tnum">{leadRow.phone ?? "No phone"}</p>
        <div className="mt-2">
          <LeadBookingButton
            tenantId={t.id}
            tenantSlug={tenantSlug}
            actorId={session.user.id}
            vehicles={vehicles}
            leadId={leadId}
            customerName={leadRow.customerName}
          />
        </div>
      </div>

      <div className="mt-4">
        <LeadStageBar tenantId={t.id} leadId={leadId} status={leadRow.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-2">Lead details</h2>
          <div className="mt-4 space-y-3">
            <Field label="Lead ID" value={`#${leadRow.id.slice(0, 8)}`} />
            <Field label="Date of input" value={formatDateTime(leadRow.createdAt)} />
            <Field label="Responsible" value={assigneeName} />
            <Field label="Requirements" value={leadRow.vouchedCar ?? "—"} />
            {leadRow.vouchedTerm != null && <Field label="Term" value={`${leadRow.vouchedTerm} mo`} />}
            {leadRow.vouchedValue != null && (
              <Field label="Deal value" value={formatCurrency(leadRow.vouchedValue)} />
            )}
            <Field label="Phone" value={leadRow.phone ?? "—"} />
            <Field label="Email" value={leadRow.email ?? "—"} />
            {/* stage_detail is the raw Bitrix status NAME (Russian on the rent
                portals) — label it, the app is English-only. */}
            <Field
              label="Stage"
              value={leadRow.stageDetail ? funnelStageLabel(leadRow.stageDetail) : leadRow.status ?? "—"}
            />
            <Field
              label="Origin"
              value={
                [humanizeLeadSource(leadRow.source), leadRow.externalSource && `via ${leadRow.externalSource}`]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            {leadRow.externalId && <Field label="Bitrix ID" value={`#${leadRow.externalId}`} />}
            <Field label="Notes" value={leadRow.notes ?? "—"} />
          </div>
        </Card>

        <CallSection tenantId={t.id} leadId={leadId} initialCalls={calls} />

        <ChatThread
          entityType="lead"
          tenantSlug={tenantSlug}
          tenantId={t.id}
          entityId={leadId}
          initialThread={thread}
          initialReplyContext={replyContext}
        />
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-0.5 break-words text-sm text-ink">{value}</div>
    </div>
  );
}
