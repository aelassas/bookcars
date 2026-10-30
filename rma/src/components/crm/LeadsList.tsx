"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getLeadsPaginated, getLeadCountsByStatus, getLeadOwnerChips, type DealOwnerChip } from "@/modules/crm/queries";
import { humanizeLeadSource } from "@/lib/source-label";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Table,
  TH,
  TD,
  EmptyState,
  type BadgeTone,
} from "@/components/ui";
import { CreateLeadModal } from "@/components/modals/CreateLeadModal";
import { Plus, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const STATUS_TONE: Record<string, BadgeTone> = {
  new: "neutral",
  contacted: "info",
  qualified: "success",
  lost: "danger",
};

/** HOT LANE — hours since createdAt, for the "⏳ Ждёт Nч" badge. */
function hoursWaiting(createdAt: string | Date): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

function isHot(l: { status: string; assignedTo: string | null }): boolean {
  return l.status === "new" && !l.assignedTo;
}

type LeadRow = Awaited<ReturnType<typeof getLeadsPaginated>>["rows"][number];
type StatusCount = Awaited<ReturnType<typeof getLeadCountsByStatus>>[number];

export function LeadsList({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StatusCount[]>([]);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  // Person chips — leads divide by the owner's canonical name (same model as
  // the pipeline: Moe/Azat/Firuz on take-auto). "All" is the management view.
  const [sel, setSel] = useState<string>("all");
  const [chips, setChips] = useState<DealOwnerChip[]>([]);
  useEffect(() => {
    getLeadOwnerChips(tenantId).then(setChips).catch(() => {});
  }, [tenantId]);
  const activeChip = chips.find((c) => c.name === sel);
  const ownerIds = activeChip?.ids;
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(
    (p: number, s: string, unassignedOnly: boolean, owners: string[] | undefined) => {
      startTransition(async () => {
        const [result, c] = await Promise.all([
          getLeadsPaginated(tenantId, {
            page: p,
            pageSize: PAGE_SIZE,
            search: s || undefined,
            hotFirst: true,
            onlyUnassigned: unassignedOnly,
            ownerIds: owners,
            // A selected person chip means "show THEIR leads" — the live/archive
            // lens would hide Bitrix-imported rows that are still their current
            // work (status 'new' + pre-import createdAt), so chips widen to all.
            scope: owners ? "all" : "live",
          }),
          getLeadCountsByStatus(tenantId),
        ]);
        setRows(result.rows);
        setTotal(result.total);
        setCounts(c);
      });
    },
    [tenantId]
  );

  useEffect(() => {
    load(page, search, onlyUnassigned, ownerIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, page, search, onlyUnassigned, sel]);

  // Debounced search: commit search term after 400 ms idle
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {counts.map((c) => (
            <Badge key={c.status} tone={STATUS_TONE[c.status] ?? "neutral"}>
              <span className="capitalize">{c.status}</span>
              <span className="tnum">{c.count}</span>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={onlyUnassigned}
              onChange={(e) => {
                setPage(1);
                setOnlyUnassigned(e.target.checked);
              }}
              className="h-4 w-4 rounded border-line accent-brand-600"
            />
            Unassigned only
          </label>
          <input
            type="text"
            className="w-52 rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand-400"
            placeholder="Search name or phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Create lead
          </Button>
        </div>
      </div>

      {showModal && (
        <CreateLeadModal
          tenantId={tenantId}
          onClose={() => setShowModal(false)}
          onCreated={() => load(page, search, onlyUnassigned, ownerIds)}
        />
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 rounded-field border border-line bg-surface p-0.5 w-fit">
          <button
            onClick={() => { setPage(1); setSel("all"); }}
            className={`rounded-field px-3 py-1 text-xs font-medium ${sel === "all" ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken"}`}
          >
            All
          </button>
          {chips.map((c) => (
            <button
              key={c.name}
              onClick={() => { setPage(1); setSel(c.name); }}
              title={`${c.deals} leads`}
              className={`rounded-field px-3 py-1 text-xs font-medium ${sel === c.name ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken"}`}
            >
              {c.name} <span className={`text-[10px] ${sel === c.name ? "text-white/70" : "text-ink-3"}`}>{c.deals}</span>
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <EmptyState
          icon={<UserPlus className="h-5 w-5" />}
          title="No leads found"
          description={search ? "Try a different search term." : "Create your first lead to get started."}
          action={
            !search ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Create lead
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Leads" count={total} />
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <Table>
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <TH>Name</TH>
                  <TH>Phone</TH>
                  <TH>Email</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  <TH>Owner</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => {
                  const hot = isHot(l);
                  const hours = hot ? hoursWaiting(l.createdAt) : 0;
                  return (
                    <tr
                      key={l.id}
                      className={`transition-colors hover:bg-sunken/50 ${hot ? "bg-warn-soft/40" : ""}`}
                    >
                      <TD className="font-medium text-ink">
                        <Link
                          href={`/${tenantSlug}/crm/leads/${l.id}`}
                          className="hover:text-brand-700 hover:underline"
                        >
                          {l.customerName}
                        </Link>
                      </TD>
                      <TD className="tnum">{l.phone ?? "—"}</TD>
                      <TD>{l.email ?? "—"}</TD>
                      <TD>{humanizeLeadSource(l.source)}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[l.status] ?? "neutral"}>{l.status}</Badge>
                      </TD>
                      <TD>
                        {hot ? (
                          <Badge tone={hours >= 24 ? "danger" : "warning"}>
                            ⏳ Waiting {hours}h
                          </Badge>
                        ) : l.assignedTo ? (
                          <span className="text-ink-2">{l.ownerName ?? "—"}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line-soft px-4 py-2 text-sm text-ink-3">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
