"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getKanbanBoardConfig,
  getKanbanSummary,
  getKanbanStageDeals,
  getDealOwnerChips,
  type DealOwnerChip,
  type KanbanBoardConfig,
  type KanbanColumn,
  type KanbanDeal,
  type KanbanStageSummary,
} from "@/modules/crm/queries";
import { moveDealStage, moveDealStageDetail } from "@/modules/crm/actions";
import { cx } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { CreateDealModal } from "@/components/modals/CreateDealModal";
import { EditDealModal } from "@/components/modals/EditDealModal";
import { Plus, ChevronRight, Sparkles, AlertTriangle } from "lucide-react";

// The board is now DATA-driven: columns come from getKanbanBoardConfig, which
// returns either Azat's exact 8-column Bitrix category-6 funnel ("detail" mode,
// whenever any open deal carries a stage_detail) or the legacy 5-stage coarse
// board ("coarse" mode, for a purely platform-native tenant). Cards group by
// column key; dragging in detail mode writes back to Bitrix two-way.

// Whole days since a timestamp — the card's only recency signal.
function daysSince(d: Date | string | null): number | null {
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

// "Azat Petrosyan" → "AP". Used for the owner avatar chip.
export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Cards fetched per stage per page. The inquiry stage carries ~25k archived
// deals, so nothing loads all rows — live first, "load more" pulls the rest.
const PAGE_SIZE = 50;

type StageState = {
  live: KanbanDeal[];
  liveTotal: number;
  archive: KanbanDeal[];
  archiveTotal: number;
  showArchive: boolean;
  loadingMore: boolean;
};

const emptyStage = (): StageState => ({
  live: [],
  liveTotal: 0,
  archive: [],
  archiveTotal: 0,
  showArchive: false,
  loadingMore: false,
});

// "24960" → "24.9k". Keeps the archive badge compact next to the live count.
function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}

export function PipelineBoard({
  tenantId,
  currentUserId,
  defaultMine = false,
}: {
  tenantId: string;
  currentUserId?: string;
  defaultMine?: boolean;
}) {
  // Person scope — the pipeline divides by the deal owner's canonical name
  // (owner's model: the live stream belongs to the named sales team; "All" is
  // the management overview). Chips are the current sales team; duplicate
  // accounts (Moe = "Moe" + "Mohammad Imad") collapse into one chip. Sales
  // open on their own chip by default.
  const [sel, setSel] = useState<string>(defaultMine ? "me" : "all");
  const [chips, setChips] = useState<DealOwnerChip[]>([]);
  useEffect(() => {
    getDealOwnerChips(tenantId)
      .then((list) => {
        setChips(list);
        // Upgrade the generic "me" default to the person's team chip when their
        // id is part of one (handles duplicate accounts like Moe/Mohammad Imad).
        if (defaultMine && currentUserId) {
          const mine = list.find((c) => c.ids.includes(currentUserId));
          if (mine) setSel(mine.name);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);
  const activeChip = chips.find((c) => c.name === sel);
  const ownerId = sel === "me" ? "me" : undefined;
  const ownerIds = activeChip?.ids;
  const [config, setConfig] = useState<KanbanBoardConfig | null>(null);
  const [summary, setSummary] = useState<Record<string, KanbanStageSummary>>({});
  const [board, setBoard] = useState<Record<string, StageState>>({});
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [createColumn, setCreateColumn] = useState<KanbanColumn | null>(null);
  const [editingDeal, setEditingDeal] = useState<KanbanDeal | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Which columns currently have their archive open — preserved across reloads.
  const openArchives = useRef<Set<string>>(new Set());

  // Surface an error as a transient toast (auto-clears).
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 6000);
  }, []);
  useEffect(() => () => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
  }, []);

  // Fetch everything the board needs WITHOUT touching state — loadBoard
  // applies the result in promise callbacks, so effects never call setState
  // synchronously. `loading` starts true; the render-time adjustment below
  // re-arms it when the board key changes, event reloads use reloadBoard().
  const fetchBoard = useCallback(async () => {
    const cfg = await getKanbanBoardConfig(tenantId, { ownerId, ownerIds });
    const keys = cfg.columns.map((c) => c.key);
    const [sum, ...stageResults] = await Promise.all([
      getKanbanSummary(tenantId, { ownerId, ownerIds, mode: cfg.mode }),
      ...keys.map((stage) =>
        getKanbanStageDeals(tenantId, { stage, scope: "live", page: 1, pageSize: PAGE_SIZE, ownerId, ownerIds, mode: cfg.mode })
      ),
    ]);
    // Archive first pages only for columns the user had expanded.
    const archiveKeys = keys.filter((s) => openArchives.current.has(s));
    const archiveResults = await Promise.all(
      archiveKeys.map((stage) =>
        getKanbanStageDeals(tenantId, { stage, scope: "archive", page: 1, pageSize: PAGE_SIZE, ownerId, ownerIds, mode: cfg.mode })
      )
    );
    const archiveByStage = new Map(archiveKeys.map((s, i) => [s, archiveResults[i]]));

    const nextSummary: Record<string, KanbanStageSummary> = {};
    for (const s of sum) nextSummary[s.stage] = s;

    const nextBoard = Object.fromEntries(
      keys.map((stage, i) => {
        const ar = archiveByStage.get(stage);
        return [
          stage,
          {
            live: stageResults[i].rows,
            liveTotal: stageResults[i].total,
            archive: ar?.rows ?? [],
            archiveTotal: nextSummary[stage]?.archiveCount ?? 0,
            showArchive: openArchives.current.has(stage),
            loadingMore: false,
          } as StageState,
        ];
      })
    ) as Record<string, StageState>;

    return { cfg, nextSummary, nextBoard };
  }, [tenantId, ownerId, ownerIds]);

  const loadBoard = useCallback(
    () =>
      fetchBoard()
        .then(({ cfg, nextSummary, nextBoard }) => {
          setConfig(cfg);
          setSummary(nextSummary);
          setBoard(nextBoard);
        })
        .catch((err: unknown) => {
          console.error(err);
        })
        .finally(() => setLoading(false)),
    [fetchBoard]
  );

  // Event-handler reloads (drag reconcile, modal callbacks) show the spinner
  // exactly like the old sync setLoading(true) inside loadBoard did.
  const reloadBoard = useCallback(() => {
    setLoading(true);
    void loadBoard();
  }, [loadBoard]);

  // When the board key (tenant / "my deals" scope) changes, flip back to
  // loading during render — the effect below refetches for the new key.
  const boardKey = `${tenantId}|${sel}`;
  const [prevBoardKey, setPrevBoardKey] = useState(boardKey);
  if (prevBoardKey !== boardKey) {
    setPrevBoardKey(boardKey);
    setLoading(true);
  }

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  async function loadMore(stage: string, scope: "live" | "archive") {
    const st = board[stage];
    if (!st) return;
    const mode = config?.mode ?? "coarse";
    const already = scope === "live" ? st.live.length : st.archive.length;
    const page = Math.floor(already / PAGE_SIZE) + 1;
    setBoard((prev) => ({ ...prev, [stage]: { ...prev[stage], loadingMore: true } }));
    try {
      const res = await getKanbanStageDeals(tenantId, { stage, scope, page, pageSize: PAGE_SIZE, ownerId, ownerIds, mode });
      setBoard((prev) => {
        const cur = prev[stage];
        return {
          ...prev,
          [stage]:
            scope === "live"
              ? { ...cur, live: [...cur.live, ...res.rows], liveTotal: res.total, loadingMore: false }
              : { ...cur, archive: [...cur.archive, ...res.rows], archiveTotal: res.total, loadingMore: false },
        };
      });
    } catch (err) {
      console.error(err);
      setBoard((prev) => ({ ...prev, [stage]: { ...prev[stage], loadingMore: false } }));
    }
  }

  async function toggleArchive(stage: string) {
    const wasOpen = board[stage]?.showArchive;
    if (wasOpen) {
      openArchives.current.delete(stage);
      setBoard((prev) => ({ ...prev, [stage]: { ...prev[stage], showArchive: false } }));
      return;
    }
    openArchives.current.add(stage);
    setBoard((prev) => ({ ...prev, [stage]: { ...prev[stage], showArchive: true } }));
    if ((board[stage]?.archive.length ?? 0) === 0 && (summary[stage]?.archiveCount ?? 0) > 0) {
      await loadMore(stage, "archive");
    }
  }

  async function handleDrop(targetKey: string) {
    if (!draggingId || !config) return;
    const id = draggingId;
    setDraggingId(null);

    const keys = config.columns.map((c) => c.key);
    // Locate the card in any column/scope list.
    let sourceKey: string | null = null;
    let moved: KanbanDeal | null = null;
    for (const s of keys) {
      const inLive = board[s]?.live.find((d) => d.id === id);
      const inArch = board[s]?.archive.find((d) => d.id === id);
      if (inLive || inArch) {
        sourceKey = s;
        moved = inLive ?? inArch ?? null;
        break;
      }
    }
    if (!moved || !sourceKey || sourceKey === targetKey) return;

    // Optimistic: pull from source, drop on top of target's live list (a move
    // is fresh activity, so it belongs in "live"), restamp its activity time.
    const promoted: KanbanDeal = {
      ...moved,
      stageDetail: config.mode === "detail" ? targetKey : moved.stageDetail,
      lastActivityAt: new Date(),
    };
    setBoard((prev) => {
      const next = { ...prev };
      next[sourceKey!] = {
        ...prev[sourceKey!],
        live: prev[sourceKey!].live.filter((d) => d.id !== id),
        archive: prev[sourceKey!].archive.filter((d) => d.id !== id),
      };
      next[targetKey] = { ...prev[targetKey], live: [promoted, ...prev[targetKey].live.filter((d) => d.id !== id)] };
      return next;
    });

    try {
      if (config.mode === "detail") {
        // Two-way: updates stage_detail locally AND POSTs the stage to Bitrix.
        await moveDealStageDetail(tenantId, id, targetKey);
      } else {
        await moveDealStage(tenantId, id, targetKey as "inquiry" | "quote" | "contract" | "handover" | "closed");
      }
    } catch (err) {
      console.error(err);
      flashError(err instanceof Error ? err.message : "Move failed — reverted.");
    } finally {
      // Reconcile counts/totals/ordering from the server (also un-does a
      // rolled-back optimistic move).
      reloadBoard();
    }
  }

  const scopeToggle = (
    <div className="mb-3 flex flex-wrap items-center gap-1 rounded-field border border-line bg-surface p-0.5 w-fit">
      {([["all", "All", null], ["me", "My deals", null]] as const).map(([key, label]) => {
        const active = sel === key;
        return (
          <button
            key={key}
            onClick={() => setSel(key)}
            className={cx(
              "rounded-field px-3 py-1 text-xs font-medium",
              active ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken"
            )}
          >
            {label}
          </button>
        );
      })}
      {chips.map((c) => {
        const active = sel === c.name;
        return (
          <button
            key={c.name}
            onClick={() => setSel(c.name)}
            title={`${c.deals} open deals`}
            className={cx(
              "rounded-field px-3 py-1 text-xs font-medium",
              active ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken"
            )}
          >
            {c.name} <span className={cx("text-[10px]", active ? "text-white/70" : "text-ink-3")}>{c.deals}</span>
          </button>
        );
      })}
    </div>
  );

  const errorToast = error && (
    <div className="mb-3 flex items-start gap-2 rounded-field border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{error}</span>
    </div>
  );

  if (loading || !config)
    return (
      <div>
        {scopeToggle}
        <p className="text-sm text-ink-3">Loading pipeline…</p>
      </div>
    );

  return (
    <div>
      {scopeToggle}
      {errorToast}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {config.columns.map((col) => {
          const stage = col.key;
          const st = board[stage] ?? emptyStage();
          const sum = summary[stage];
          const liveCount = sum?.liveCount ?? st.live.length;
          const archiveCount = sum?.archiveCount ?? st.archiveTotal;
          return (
            <div
              key={stage}
              className="w-60 shrink-0 space-y-2 rounded-card border border-line-soft bg-sunken/70 p-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleDrop(stage);
              }}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-2">{col.label}</h3>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-surface px-1.5 py-px text-[11px] font-semibold text-ink-2 shadow-card tnum">
                    {liveCount}
                  </span>
                  {archiveCount > 0 && (
                    <span
                      className="rounded-full px-1.5 py-px text-[10px] font-medium text-ink-3 tnum"
                      title={`${archiveCount.toLocaleString()} archived (inactive 90+ days)`}
                    >
                      + {compact(archiveCount)} archived
                    </span>
                  )}
                  <button
                    onClick={() => setCreateColumn(col)}
                    className="rounded-field p-1 text-ink-3 transition-colors hover:bg-surface hover:text-ink-2"
                    aria-label={`Add deal to ${col.label}`}
                    title={`Add deal to ${col.label}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {sum && sum.liveTotalValue > 0 && (
                <div className="text-[11px] font-medium text-ink-3 tnum">{formatCurrency(sum.liveTotalValue)}</div>
              )}

              <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-y-auto pr-1">
                {st.live.map((d) => (
                  <DealCard
                    key={d.id}
                    deal={d}
                    dragging={draggingId === d.id}
                    onDragStart={() => setDraggingId(d.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setEditingDeal(d)}
                  />
                ))}
                {st.live.length === 0 && !st.showArchive && (
                  <div className="rounded-field border border-dashed border-line p-3 text-center text-xs text-ink-3">
                    Drop here
                  </div>
                )}

                {/* Load more live */}
                {st.live.length < st.liveTotal && (
                  <button
                    onClick={() => void loadMore(stage, "live")}
                    disabled={st.loadingMore}
                    className="w-full rounded-field border border-line bg-surface px-2 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-sunken disabled:opacity-50"
                  >
                    {st.loadingMore ? "Loading…" : `Load more (${st.live.length}/${st.liveTotal})`}
                  </button>
                )}

                {/* Archive drawer */}
                {archiveCount > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={() => void toggleArchive(stage)}
                      className="flex w-full items-center gap-1 rounded-field px-1 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink-2"
                    >
                      <ChevronRight
                        className={cx("h-3 w-3 transition-transform", st.showArchive && "rotate-90")}
                      />
                      Archive ({compact(archiveCount)})
                    </button>
                    {st.showArchive && (
                      <div className="mt-1 space-y-2 border-l border-line-soft pl-2">
                        {st.archive.map((d) => (
                          <DealCard
                            key={d.id}
                            deal={d}
                            archived
                            dragging={draggingId === d.id}
                            onDragStart={() => setDraggingId(d.id)}
                            onDragEnd={() => setDraggingId(null)}
                            onClick={() => setEditingDeal(d)}
                          />
                        ))}
                        {st.archive.length < st.archiveTotal && (
                          <button
                            onClick={() => void loadMore(stage, "archive")}
                            disabled={st.loadingMore}
                            className="w-full rounded-field border border-line bg-surface px-2 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-sunken disabled:opacity-50"
                          >
                            {st.loadingMore ? "Loading…" : `Load more (${st.archive.length}/${st.archiveTotal})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {createColumn && (
        <CreateDealModal
          tenantId={tenantId}
          defaultStage={createColumn.coarse}
          onClose={() => setCreateColumn(null)}
          onCreated={reloadBoard}
        />
      )}

      {editingDeal && (
        <EditDealModal
          tenantId={tenantId}
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onUpdated={reloadBoard}
        />
      )}
    </div>
  );
}

function DealCard({
  deal: d,
  archived = false,
  dragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  deal: KanbanDeal;
  archived?: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  // Azat-minimal card: name, vehicle, days-since-activity, owner initials, and
  // a price ONLY when a human set it (est is muted). Plus a one-line AI note
  // when the lead thread was read by the classifier. Nothing else.
  const days = daysSince(d.lastActivityAt);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cx(
        "cursor-grab rounded-field border border-line bg-surface p-2 shadow-card transition-shadow hover:shadow-lifted active:cursor-grabbing",
        archived && "opacity-70",
        dragging ? "opacity-50" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink">
          {d.customerName?.trim() || d.ref}
        </span>
        {d.ownerName && (
          <span
            title={d.ownerName}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700"
          >
            {initials(d.ownerName)}
          </span>
        )}
      </div>

      {d.vehicleLabel && <div className="mt-0.5 truncate text-[11px] text-ink-3">{d.vehicleLabel}</div>}

      {d.aiNote && (
        <div
          className="mt-1 flex items-center gap-1 text-[11px] italic text-ink-3"
          title={d.aiNote}
        >
          <Sparkles className="h-3 w-3 shrink-0 text-brand-400" />
          <span className="truncate">{d.aiNote}</span>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-ink-3 tnum">
          {days == null ? "—" : days === 0 ? "today" : `${days}d`}
        </span>
        {d.value ? (
          <span className="text-xs font-medium text-success tnum">{formatCurrency(d.value)}</span>
        ) : d.estValue ? (
          // Estimate — muted + italic, clearly not a real figure, never summed.
          <span className="text-xs font-medium italic text-ink-3 tnum">~{formatCurrency(d.estValue)} est</span>
        ) : null}
      </div>
    </div>
  );
}
