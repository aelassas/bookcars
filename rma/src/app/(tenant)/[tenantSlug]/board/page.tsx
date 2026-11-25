import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getBoardItems, type BoardCard } from "@/modules/board/queries";
import { resolveOwnerForLine, assigneeLabel } from "@/modules/board/owners";
import { BoardClient } from "./BoardClient";
import type { BoardItem } from "@/platform/db/board-schema";
import { redirectIfSalesOnlyManagerScreen } from "@/modules/rental/policies";

export const revalidate = 0;

type SerializedBoardItem = {
  id: string;
  tenantId: string;
  channel: BoardItem["channel"];
  customerRef: string;
  customerName: string | null;
  summary: string;
  intent: BoardItem["intent"];
  urgency: BoardItem["urgency"];
  awaitingReply: boolean;
  suggestedDraft: string | null;
  status: BoardItem["status"];
  firstSeenAt: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
  /** WhatsApp line the thread came in on (persisted or derived). */
  sourceLine: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  lastEscalatedAt: string | null;
  /** Display name for assignedTo (owner key → manager name, else raw value). */
  assignedToLabel: string | null;
  /** Suggested owner from BRAND_OWNERS line routing, for unassigned cards. */
  routedOwnerName: string | null;
};

function serialize(row: BoardCard): SerializedBoardItem {
  return {
    ...row,
    firstSeenAt: row.firstSeenAt.toISOString(),
    slaDueAt: row.slaDueAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
    lastEscalatedAt: row.lastEscalatedAt ? row.lastEscalatedAt.toISOString() : null,
    assignedToLabel: assigneeLabel(row.assignedTo),
    routedOwnerName: resolveOwnerForLine(row.sourceLine)?.name ?? null,
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  await redirectIfSalesOnlyManagerScreen(tenantSlug);

  const rows = await getBoardItems(tenant.id);
  const items = rows.map(serialize);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">The Board</h1>
        <p className="text-sm text-gray-500">
          Missed-lead triage queue. AI drafts replies; humans approve before anything
          is sent to a customer.
        </p>
      </div>

      <BoardClient tenantId={tenant.id} initialItems={items} />
    </main>
  );
}
