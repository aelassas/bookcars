"use client";

import { useState, useTransition } from "react";
import { approveItem, assignItem, dismissItem, updateDraft } from "./actions";
import { isBreached, overdueMinutes, formatDurationMins } from "@/modules/board/sla";

type BoardStatus = "open" | "approved" | "dismissed" | "done";
type BoardUrgency = "low" | "med" | "high";
type BoardChannel = "whatsapp" | "instagram" | "telegram" | "call";
type BoardIntent =
  | "booking"
  | "price"
  | "complaint"
  | "handover"
  | "payment"
  | "other";

type SerializedBoardItem = {
  id: string;
  tenantId: string;
  channel: BoardChannel;
  customerRef: string;
  customerName: string | null;
  summary: string;
  intent: BoardIntent;
  urgency: BoardUrgency;
  awaitingReply: boolean;
  suggestedDraft: string | null;
  status: BoardStatus;
  firstSeenAt: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
  sourceLine: string | null;
  assignedTo: string | null;
  assignedAt: string | null;
  lastEscalatedAt: string | null;
  assignedToLabel: string | null;
  routedOwnerName: string | null;
};

function urgencyRank(u: BoardUrgency): number {
  return u === "high" ? 3 : u === "med" ? 2 : 1;
}

function urgencyBorder(u: BoardUrgency): string {
  if (u === "high") return "border-l-red-500";
  if (u === "med") return "border-l-amber-500";
  return "border-l-emerald-500";
}

function urgencyBadge(u: BoardUrgency): string {
  if (u === "high") return "bg-red-50 text-red-700 border-red-200";
  if (u === "med") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

function channelIcon(c: BoardChannel): string {
  if (c === "whatsapp") return "💬";
  if (c === "instagram") return "📸";
  if (c === "telegram") return "✈️";
  return "📞";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function slaLabel(iso: string): { text: string; color: string } {
  const ms = new Date(iso).getTime() - Date.now();
  const mins = Math.ceil(ms / 60_000);
  if (ms < 0) {
    return {
      text: `Overdue ${formatDurationMins(overdueMinutes(iso))}`,
      color: "text-red-600",
    };
  }
  if (mins <= 60) return { text: `Due in ${mins}m`, color: "text-amber-600" };
  const hours = Math.floor(mins / 60);
  return { text: `Due in ${hours}h ${mins % 60}m`, color: "text-gray-500" };
}

function ownerLabel(item: SerializedBoardItem): { text: string; assigned: boolean } {
  if (item.assignedTo) {
    return { text: item.assignedToLabel ?? item.assignedTo, assigned: true };
  }
  if (item.routedOwnerName) return { text: item.routedOwnerName, assigned: false };
  return { text: "Unassigned", assigned: false };
}

export function BoardClient({
  tenantId,
  initialItems,
}: {
  tenantId: string;
  initialItems: SerializedBoardItem[];
}) {
  const [items, setItems] = useState<SerializedBoardItem[]>(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = [...items].sort((a, b) => {
    // Breached cards always float to the top — worst breach first.
    const aBreached = isBreached(a);
    const bBreached = isBreached(b);
    if (aBreached !== bBreached) return aBreached ? -1 : 1;
    if (a.awaitingReply !== b.awaitingReply) {
      return a.awaitingReply ? -1 : 1;
    }
    const rankDiff = urgencyRank(b.urgency) - urgencyRank(a.urgency);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime();
  });

  const currentDraft = (item: SerializedBoardItem): string => {
    if (editingId === item.id) {
      return draftEdits[item.id] ?? item.suggestedDraft ?? "";
    }
    return item.suggestedDraft ?? "";
  };

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function showCopied(id: string) {
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  }

  function handleApprove(item: SerializedBoardItem) {
    const draft = currentDraft(item);

    void copyText(draft).then((ok) => {
      if (!ok) {
        alert("Could not copy to clipboard.");
        return;
      }
      showCopied(item.id);

      startTransition(async () => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "approved", suggestedDraft: draft }
              : i,
          ),
        );
        await approveItem(tenantId, item.id);
      });
    });
  }

  function handleEdit(item: SerializedBoardItem) {
    setEditingId(item.id);
    setDraftEdits((prev) => ({
      ...prev,
      [item.id]: item.suggestedDraft ?? "",
    }));
  }

  function handleCancelEdit(id: string) {
    setEditingId(null);
    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleSaveDraft(id: string) {
    const text = draftEdits[id] ?? "";
    startTransition(async () => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, suggestedDraft: text } : i)),
      );
      await updateDraft(tenantId, id, text);
      setEditingId(null);
      setDraftEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });
  }

  function handleReject(id: string) {
    if (!confirm("Dismiss this card? It will be removed from the queue.")) return;
    startTransition(async () => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await dismissItem(tenantId, id);
    });
  }

  function handleAssignToMe(id: string) {
    startTransition(async () => {
      const { assignedTo } = await assignItem(tenantId, id);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                assignedTo,
                assignedToLabel: assignedTo,
                assignedAt: new Date().toISOString(),
              }
            : i,
        ),
      );
    });
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-gray-500">No open leads on the board.</p>
        <p className="text-xs text-gray-400 mt-1">
          New missed leads will appear here automatically.
        </p>
      </div>
    );
  }

  const breachedCount = sorted.filter((i) => isBreached(i)).length;

  return (
    <div className="space-y-4">
      {breachedCount > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {breachedCount} card{breachedCount === 1 ? "" : "s"} past SLA — respond or
          reassign now.
        </div>
      )}
      {sorted.map((item) => {
        const isEditing = editingId === item.id;
        const draft = currentDraft(item);
        const isApproved = item.status === "approved";
        const due = slaLabel(item.slaDueAt);
        const breached = isBreached(item);
        const owner = ownerLabel(item);

        return (
          <div
            key={item.id}
            id={`card-${item.id}`}
            className={`scroll-mt-24 rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md border-l-4 ${
              breached
                ? "border-red-300 border-l-red-600 ring-2 ring-red-200"
                : `border-gray-200 ${urgencyBorder(item.urgency)}`
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg" title={item.channel}>
                    {channelIcon(item.channel)}
                  </span>
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {item.customerName ?? item.customerRef}
                  </h3>
                  {item.customerName && (
                    <span className="text-xs text-gray-400 truncate">
                      {item.customerRef}
                    </span>
                  )}
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {item.intent}
                  </span>
                  {breached && (
                    <span className="animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                      SLA breached
                    </span>
                  )}
                  {item.awaitingReply && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      awaits reply
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                      owner.assigned
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                    title={item.assignedTo ?? "No owner yet"}
                  >
                    👤 {owner.text}
                  </span>
                  {item.sourceLine && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                      line: {item.sourceLine}
                    </span>
                  )}
                  {!owner.assigned && (
                    <button
                      onClick={() => handleAssignToMe(item.id)}
                      disabled={isPending}
                      className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                    >
                      Assign to me
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-700">{item.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${urgencyBadge(
                    item.urgency,
                  )}`}
                >
                  {item.urgency}
                </span>
                <span className={`text-xs font-medium ${due.color}`} title={item.slaDueAt}>
                  {due.text}
                </span>
                <span className="text-xs text-gray-400" title={item.firstSeenAt}>
                  {timeAgo(item.firstSeenAt)} wait
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span>AI draft</span>
                {isApproved && (
                  <span className="text-violet-600">Approved — copy and send manually</span>
                )}
              </label>

              {isEditing ? (
                <textarea
                  value={draft}
                  onChange={(e) =>
                    setDraftEdits((prev) => ({
                      ...prev,
                      [item.id]: e.target.value,
                    }))
                  }
                  disabled={isPending}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-60"
                  placeholder="Write the reply draft the operator will copy..."
                />
              ) : (
                <div className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {draft ? (
                    <p className="whitespace-pre-wrap">{draft}</p>
                  ) : (
                    <span className="italic text-gray-400">No draft suggested</span>
                  )}
                </div>
              )}

              {isApproved && draft && (
                <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-700">
                      Copy this approved reply
                    </span>
                    <button
                      onClick={() => copyText(draft).then((ok) => ok && showCopied(item.id))}
                      disabled={isPending}
                      className="rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {copiedId === item.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-violet-900">{draft}</p>
                  {copiedId === item.id && (
                    <p className="mt-2 text-xs font-medium text-violet-700">
                      ✓ Copied to clipboard — paste it into {item.channel} to send.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={isPending}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50"
                  >
                    {copiedId === item.id ? "Approved & copied" : "Approve & copy"}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    disabled={isPending || isApproved}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
                  >
                    Edit draft
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={isPending}
                    className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSaveDraft(item.id)}
                    disabled={isPending}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                  >
                    Save draft
                  </button>
                  <button
                    onClick={() => handleCancelEdit(item.id)}
                    disabled={isPending}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
