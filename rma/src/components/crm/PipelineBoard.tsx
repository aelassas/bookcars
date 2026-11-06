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
import { AlertTriangle, ChevronRight, Clock3, Plus, Search, Sparkles } from "lucide-react";
import { cardAttention, daysSince, initials, rentalWindow, STALE_DAYS } from "./pipeline-utils";
import type { DealStage } from "@/modules/crm/stages";

// Columns come from the tenant's data: the Bitrix detail funnel when present,
// otherwise the native coarse funnel. Moves use the matching write path.
const PAGE_SIZE = 50;
type AttentionFilter = "all" | "new" | "stale";

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

function compact(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
}

export function PipelineBoard({
  tenantId,
  tenantSlug,
  currentUserId,
  defaultMine = false,
}: {
  tenantId: string;
  tenantSlug: string;
  currentUserId?: string;
  defaultMine?: boolean;
}) {
  const [sel, setSel] = useState<string>(defaultMine ? "me" : "all");
  const [chips, setChips] = useState<DealOwnerChip[]>([]);
  useEffect(() => {
    getDealOwnerChips(tenantId)
      .then((list) => {
        setChips(list);
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
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [attention, setAttention] = useState<AttentionFilter>("all");
  const [mobileStage, setMobileStage] = useState<string | null>(null);
  const openArchives = useRef<Set<string>>(new Set());
  const loadRequest = useRef(0);
  const dragJustEnded = useRef(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashError = useCallback((msg: string) => {
    setError(msg);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 6000);
  }, []);
  useEffect(() => () => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBoard = useCallback(async () => {
    const cfg = await getKanbanBoardConfig(tenantId, { ownerId, ownerIds });
    const keys = cfg.columns.map((c) => c.key);
    const filter = {
      ownerId,
      ownerIds,
      mode: cfg.mode,
      query: query || undefined,
      attention: attention === "all" ? undefined : attention,
    };
    const [sum, ...stageResults] = await Promise.all([
      getKanbanSummary(tenantId, filter),
      ...keys.map((stage) =>
        getKanbanStageDeals(tenantId, { ...filter, stage, scope: "live", page: 1, pageSize: PAGE_SIZE })
      ),
    ]);
    const archiveKeys = keys.filter((s) => openArchives.current.has(s));
    const archiveResults = await Promise.all(
      archiveKeys.map((stage) =>
        getKanbanStageDeals(tenantId, { ...filter, stage, scope: "archive", page: 1, pageSize: PAGE_SIZE })
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
  }, [tenantId, ownerId, ownerIds, query, attention]);

  const loadBoard = useCallback(
    () => {
      const request = ++loadRequest.current;
      return fetchBoard()
        .then(({ cfg, nextSummary, nextBoard }) => {
          if (request !== loadRequest.current) return;
          setConfig(cfg);
          setSummary(nextSummary);
          setBoard(nextBoard);
          setMobileStage((current) => {
            if (current && cfg.columns.some((c) => c.key === current)) return current;
            return cfg.columns.find((c) => (nextBoard[c.key]?.liveTotal ?? 0) > 0)?.key ?? cfg.columns[0]?.key ?? null;
          });
        })
        .catch((err: unknown) => {
          if (request !== loadRequest.current) return;
          console.error(err);
          flashError("Could not load the pipeline. Try again.");
        })
        .finally(() => {
          if (request === loadRequest.current) setLoading(false);
        });
    },
    [fetchBoard, flashError]
  );

  const reloadBoard = useCallback(() => {
    setLoading(true);
    void loadBoard();
  }, [loadBoard]);

  const boardKey = `${tenantId}|${sel}|${query}|${attention}`;
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
      const res = await getKanbanStageDeals(tenantId, {
        stage,
        scope,
        page,
        pageSize: PAGE_SIZE,
        ownerId,
        ownerIds,
        mode,
        query: query || undefined,
        attention: attention === "all" ? undefined : attention,
      });
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
    dragJustEnded.current = true;
    window.setTimeout(() => { dragJustEnded.current = false; }, 0);

    const keys = config.columns.map((c) => c.key);
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
        await moveDealStageDetail(tenantId, id, targetKey);
      } else {
        await moveDealStage(tenantId, id, targetKey as DealStage);
      }
    } catch (err) {
      console.error(err);
      flashError(err instanceof Error ? err.message : "Move failed. The board was restored.");
    } finally {
      reloadBoard();
    }
  }

  function clearFilters() {
    setSearch("");
    setQuery("");
    setAttention("all");
  }

  const scopeToggle = (
    <div className="flex flex-wrap items-center gap-1 rounded-field border border-line bg-surface p-0.5">
      {([["all", "All"], ["me", "My deals"]] as const).map(([key, label]) => {
        const active = sel === key;
        return (
          <button
            key={key}
            onClick={() => setSel(key)}
            aria-pressed={active}
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
            aria-pressed={active}
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

  const toolbar = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {scopeToggle}
      <label className="relative min-w-[180px] flex-1 sm:max-w-[280px]">
        <span className="sr-only">Search deals</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Customer, phone, car or deal…"
          className="h-8 w-full rounded-field border border-line bg-surface pl-8 pr-3 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
        />
      </label>
      <div className="flex items-center gap-1" aria-label="Deal attention filter">
        {([
          ["all", "All"],
          ["new", "Needs reply"],
          ["stale", `${STALE_DAYS}d+ quiet`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setAttention(key)}
            aria-pressed={attention === key}
            className={cx(
              "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              attention === key
                ? key === "new"
                  ? "border-danger bg-danger/10 text-danger"
                  : key === "stale"
                    ? "border-amber-500 bg-amber-500/10 text-amber-700"
                    : "border-brand-600 bg-brand-600 text-white"
                : "border-line bg-surface text-ink-2 hover:text-ink"
            )}
          >
            {key === "stale" && <Clock3 className="h-3 w-3" />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const errorToast = error && (
    <div className="mb-3 flex items-start gap-2 rounded-field border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{error}</span>
    </div>
  );

  if (loading || !config) {
    return (
      <div>
        {toolbar}
        <p className="text-sm text-ink-3">Loading pipeline…</p>
      </div>
    );
  }

  const filtersActive = query !== "" || attention !== "all";
  const matchCount = config.columns.reduce((n, c) => {
    const s = summary[c.key];
    return n + (s?.liveCount ?? 0) + (s?.archiveCount ?? 0);
  }, 0);

  return (
    <div>
      {toolbar}
      {errorToast}

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 md:hidden" aria-label="Pipeline stages">
        {config.columns.map((col) => (
          <button
            key={col.key}
            type="button"
            onClick={() => setMobileStage(col.key)}
            aria-pressed={mobileStage === col.key}
            className={cx(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium",
              mobileStage === col.key ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-surface text-ink-2"
            )}
          >
            {col.label} · {summary[col.key]?.liveCount ?? 0}
          </button>
        ))}
      </div>

      {filtersActive && matchCount === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-sunken/50 px-4 py-12 text-center">
          <Search className="mx-auto mb-2 h-5 w-5 text-ink-3" />
          <p className="text-sm font-medium text-ink">No matching deals</p>
          <p className="mt-1 text-xs text-ink-3">Try another customer, phone, car or filter.</p>
          <button onClick={clearFilters} className="mt-3 rounded-field border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-sunken">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 md:items-stretch">
          {config.columns.map((col) => {
            const stage = col.key;
            const st = board[stage] ?? emptyStage();
            const sum = summary[stage];
            const liveCount = sum?.liveCount ?? st.live.length;
            const archiveCount = sum?.archiveCount ?? st.archiveTotal;
            return (
              <section
                key={stage}
                aria-label={col.label}
                className={cx(
                  "w-full shrink-0 space-y-2 rounded-card border border-line-soft bg-sunken/70 p-2",
                  "md:block md:w-auto md:min-w-[210px] md:max-w-[340px] md:flex-1 md:basis-0",
                  mobileStage === stage ? "block" : "hidden"
                )}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(stage);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-2">{col.label}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="rounded-full bg-surface px-1.5 py-px text-[11px] font-semibold text-ink-2 shadow-card tnum">{liveCount}</span>
                    {archiveCount > 0 && (
                      <span className="rounded-full px-1.5 py-px text-[10px] font-medium text-ink-3 tnum" title={`${archiveCount.toLocaleString()} archived (inactive 90+ days)`}>
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
                {sum && sum.liveTotalValue > 0 && <div className="text-[11px] font-medium text-ink-3 tnum">{formatCurrency(sum.liveTotalValue)}</div>}

                <div className="max-h-[calc(100dvh-330px)] space-y-2 overflow-y-auto pr-1">
                  {st.live.map((d) => (
                    <DealCard
                      key={d.id}
                      deal={d}
                      dragging={draggingId === d.id}
                      onDragStart={() => setDraggingId(d.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => { if (!dragJustEnded.current) setEditingDeal(d); }}
                    />
                  ))}
                  {st.live.length === 0 && !st.showArchive && (
                    <div className="rounded-field border border-dashed border-line p-4 text-center text-[11px] text-ink-3">Drop here</div>
                  )}

                  {st.live.length < st.liveTotal && (
                    <button
                      onClick={() => void loadMore(stage, "live")}
                      disabled={st.loadingMore}
                      className="w-full rounded-field border border-line bg-surface px-2 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-sunken disabled:opacity-50"
                    >
                      {st.loadingMore ? "Loading…" : `Load more (${st.live.length}/${st.liveTotal})`}
                    </button>
                  )}

                  {archiveCount > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => void toggleArchive(stage)}
                        className="flex w-full items-center gap-1 rounded-field px-1 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink-2"
                      >
                        <ChevronRight className={cx("h-3 w-3 transition-transform", st.showArchive && "rotate-90")} />
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
                              onClick={() => { if (!dragJustEnded.current) setEditingDeal(d); }}
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
              </section>
            );
          })}
        </div>
      )}

      {createColumn && (
        <CreateDealModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          defaultStage={createColumn.coarse}
          onClose={() => setCreateColumn(null)}
          onCreated={reloadBoard}
        />
      )}

      {editingDeal && (
        <EditDealModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
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
  const attention = cardAttention(d);
  const days = daysSince(d.lastActivityAt);
  const window = rentalWindow(d.dateFrom, d.dateTo);
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cx(
        "w-full cursor-grab rounded-field border border-l-[3px] border-line bg-surface p-2.5 text-left shadow-card transition-shadow hover:shadow-lifted active:cursor-grabbing",
        attention === "new" ? "border-l-danger" : attention === "stale" ? "border-l-amber-500" : "border-l-line",
        archived && "opacity-70",
        dragging && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-semibold leading-tight text-ink">{d.customerName?.trim() || d.ref}</span>
        {d.ownerName && (
          <span title={d.ownerName} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
            {initials(d.ownerName)}
          </span>
        )}
      </div>

      {d.phone && <div className="mt-0.5 text-[11px] text-ink-3 tnum">{d.phone}</div>}
      {d.requestedCar ? (
        <div className="mt-1 truncate text-[11px] font-medium text-brand-700">Wants: {d.requestedCar}</div>
      ) : d.vehicleLabel ? (
        <div className="mt-1 truncate text-[11px] text-ink-3">{d.vehicleLabel}</div>
      ) : null}
      {window && <div className="mt-0.5 text-[11px] text-ink-2">When: {window}</div>}

      {d.aiNote && (
        <div className="mt-1 flex items-center gap-1 text-[11px] italic text-ink-3" title={d.aiNote}>
          <Sparkles className="h-3 w-3 shrink-0 text-brand-400" />
          <span className="truncate">{d.aiNote}</span>
        </div>
      )}

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
        {attention === "new" ? (
          <span className="font-semibold text-danger">Waiting for first reply</span>
        ) : attention === "stale" ? (
          <span className="flex items-center gap-1 font-medium text-amber-700"><Clock3 className="h-3 w-3" />{days === null ? "No activity" : `${days}d quiet`}</span>
        ) : (
          <span className="text-ink-3 tnum">{days == null ? "No activity" : days === 0 ? "Active today" : `${days}d since activity`}</span>
        )}
        {d.value ? (
          <span className="shrink-0 text-xs font-medium text-success tnum">{formatCurrency(d.value)}</span>
        ) : d.estValue ? (
          <span className="shrink-0 text-xs font-medium italic text-ink-3 tnum">~{formatCurrency(d.estValue)} est</span>
        ) : null}
      </div>
    </button>
  );
}
