"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getUnassignedDeals,
  getAssignableMembers,
  type KanbanDeal,
  type AssignableMember,
} from "@/modules/crm/queries";
import { assignDeal } from "@/modules/crm/actions";
import { Card, CardHeader, EmptyState, Select, cx } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { Inbox, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 25;

function daysSince(d: Date | string | null): number | null {
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

/**
 * The "girls" queue: every live, owner-less deal, newest activity first. Pick a
 * salesperson from the per-row dropdown → the deal is assigned and drops out of
 * this list, landing in that person's "My" funnel.
 */
export function CoordinatorInbox({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<KanbanDeal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [loading, startTransition] = useTransition();
  // Deals mid-assign — disabled + dimmed until the server confirms.
  const [assigning, setAssigning] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function load(p: number) {
    startTransition(async () => {
      try {
        const [q, m] = await Promise.all([
          getUnassignedDeals(tenantId, { page: p, pageSize: PAGE_SIZE }),
          members.length ? Promise.resolve(members) : getAssignableMembers(tenantId),
        ]);
        setRows(q.rows);
        setTotal(q.total);
        if (!members.length) setMembers(m);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the queue");
      }
    });
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, page]);

  async function handleAssign(dealId: string, ownerId: string) {
    if (!ownerId) return;
    setError(null);
    setAssigning((prev) => new Set(prev).add(dealId));
    try {
      await assignDeal(tenantId, dealId, ownerId);
      // Leaves the queue immediately; keep the total honest.
      setRows((prev) => prev.filter((r) => r.id !== dealId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign");
      setAssigning((prev) => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (rows.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<Inbox className="h-5 w-5" />}
        title="Queue is empty"
        description="Every live deal has been assigned to a manager."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-field border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {members.length === 0 && !loading && (
        <div className="rounded-field border border-line bg-warn-soft/50 px-3 py-2 text-sm text-ink-2">
          No managers with the "sales" role — no one to assign to. Add salespeople in the "Team" section.
        </div>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="To assign" count={total} />
        <div className="max-h-[calc(100vh-320px)] divide-y divide-line-soft overflow-y-auto">
          {rows.map((d) => {
            const days = daysSince(d.lastActivityAt);
            const busy = assigning.has(d.id);
            return (
              <div
                key={d.id}
                className={cx(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-sunken/40",
                  busy && "pointer-events-none opacity-50"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {d.customerName?.trim() || d.ref}
                  </div>
                  {d.vehicleLabel && (
                    <div className="truncate text-[11px] text-ink-3">{d.vehicleLabel}</div>
                  )}
                  {d.aiNote && (
                    <div
                      className="mt-0.5 flex items-center gap-1 text-[11px] italic text-ink-3"
                      title={d.aiNote}
                    >
                      <Sparkles className="h-3 w-3 shrink-0 text-brand-400" />
                      <span className="truncate">{d.aiNote}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-ink-3 tnum">
                    <span>{days == null ? "—" : days === 0 ? "today" : `${days}d idle`}</span>
                    {d.value ? (
                      <span className="font-medium text-success">{formatCurrency(d.value)}</span>
                    ) : d.estValue ? (
                      <span className="italic">~{formatCurrency(d.estValue)} est</span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0">
                  <Select
                    aria-label="Assign manager"
                    defaultValue=""
                    disabled={busy || members.length === 0}
                    onChange={(e) => void handleAssign(d.id, e.target.value)}
                    className="w-40"
                  >
                    <option value="" disabled>
                      {busy ? "Assigning…" : "Assign →"}
                    </option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line-soft px-4 py-2 text-sm text-ink-3">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="rounded-field border border-line bg-surface p-1.5 text-ink-2 transition-colors hover:bg-sunken disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="rounded-field border border-line bg-surface p-1.5 text-ink-2 transition-colors hover:bg-sunken disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
