"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ClipboardCheck, Search, Pencil, Play, XCircle, ArrowUpDown } from "lucide-react";
import { DayPilotScheduler } from "@daypilot/daypilot-lite-react";
import { moveRentalDates, startRental, cancelRental } from "@/modules/rental/actions";
import { CreateRentalModal } from "@/components/modals/CreateRentalModal";
import { t, type Lang } from "@/platform/i18n/dict";
import type { CalendarSlot } from "@/modules/rental/booking-queries";
import { currentEvent, eventOnDay, groupUpcomingEvents, nextDays } from "./fleet-board-mobile";
import { rentalIsLongTerm } from "@/modules/rental/operations";

/**
 * Yango-style booking board on DayPilot Lite (open-source, Apache-2.0).
 * Rows = cars, horizontal timeline = days; each booking is a status-coloured
 * bar. Yango-parity layer on top of the base scheduler:
 *  - overdue rentals flip red automatically (active past return date)
 *  - today column + weekend shading (onBeforeCellRender)
 *  - two-line row header (onBeforeRowHeaderRender): plate + status dot +
 *    occupancy chip on line 1, full make + model on line 2 (tooltip carries
 *    the whole identity, nothing truncates mid-word)
 *  - search box (plate / make / model) + status filter chips
 *  - "Arrange" control: model line / plate / status / utilisation, persisted
 *    in localStorage
 * Interactive: click a bar → detail card; drag / resize a canonical rental →
 * reschedule (server validates the drop against overlaps). Imported (sheet)
 * bookings and closed rentals are display-only — a move on them reverts.
 * `?view=month` switches back to the old month calendar.
 */

type Vehicle = { id: string; make: string | null; model: string | null; plate: string | null; status: string };

const STATUS_COLOR: Record<string, string> = {
  reserved: "#f59e0b",
  active: "#16a34a",
  overdue: "#dc2626",
  returned: "#3b82f6",
  completed: "#94a3b8",
  cancelled: "#e5e7eb",
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "reserved", label: "Reserved" },
  { key: "active", label: "Active" },
  { key: "overdue", label: "Overdue" },
  { key: "returned", label: "Returned" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

type Tags = {
  source: "rental" | "booking";
  rentalId: string;
  status: string; // display status (overdue derived)
  customerName: string;
  salesAgentName: string | null;
  vehicleName: string;
  editable: boolean;
  longTerm: boolean;
  startYmd: string;
  endYmd: string; // inclusive display end (return day)
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayYmd(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Inclusive return day → DayPilot's exclusive right edge. */
function endExclYmd(endYmd: string): string {
  const d = new Date(`${endYmd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return ymd(d);
}

const HINT_KEY = "fleetBoardHintDismissed";
const ARRANGE_KEY = "fleetBoardArrange";

type ArrangeMode = "modelLine" | "plate" | "status" | "utilisation";

/** "Arrange: Status" ordering — available first, trouble last. */
const ROW_STATUS_ORDER: Record<string, number> = {
  available: 0,
  reserved: 1,
  on_rent: 2,
  in_service: 3,
  overdue: 4,
};

/** Row-header status dot (emerald / sky / amber / rose, matching the fleet palette). */
const ROW_STATUS_DOT: Record<string, string> = {
  available: "#10b981",
  on_rent: "#0ea5e9",
  reserved: "#f59e0b",
  in_service: "#f43f5e",
  overdue: "#f43f5e",
};

function cmpText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

/** Row headers are built as HTML strings — escape DB text before interpolating. */
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Yango semantics: an active rental whose return day has passed is "overdue". */
function displayStatus(status: string, endYmd: string, today: string): string {
  if (status === "active" && endYmd < today) return "overdue";
  return status;
}

export function FleetSchedulerBoard({
  vehicles,
  slots,
  startDate,
  days,
  tenantId,
  actorId,
  tenantSlug,
  lang,
}: {
  vehicles: Vehicle[];
  slots: CalendarSlot[];
  startDate: string;
  days: number;
  tenantId: string;
  actorId: string;
  tenantSlug: string;
  lang: Lang;
}) {
  const router = useRouter();
  const schedulerRef = useRef<{ control: { scrollTo?: (d: string) => void } | null }>(null);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Tags | null>(null);
  const [newBooking, setNewBooking] = useState<{ vehicleId: string; start: string; end: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set(["cancelled"]));
  const [hintVisible, setHintVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [detailMsg, setDetailMsg] = useState<string | null>(null);
  const [arrange, setArrange] = useState<ArrangeMode>("modelLine");
  const [phone, setPhone] = useState(false);
  const [view, setView] = useState<"board" | "list" | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const shownView = view ?? (phone ? "list" : "board");
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);
  // localStorage is client-only — read it after mount to keep SSR/CSR markup equal.
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        setHintVisible(!localStorage.getItem(HINT_KEY));
      } catch {
        setHintVisible(true);
      }
      try {
        const saved = localStorage.getItem(ARRANGE_KEY);
        if (saved === "modelLine" || saved === "plate" || saved === "status" || saved === "utilisation") {
          setArrange(saved);
        }
      } catch {
        /* private mode — keep the model-line default */
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  function changeArrange(mode: ArrangeMode) {
    setArrange(mode);
    try {
      localStorage.setItem(ARRANGE_KEY, mode);
    } catch {
      /* private mode — session-only choice */
    }
  }

  function dismissHint() {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* private mode — just hide for this session */
    }
    setHintVisible(false);
  }

  const today = todayYmd();
  const boardEnd = useMemo(() => {
    const value = new Date(`${startDate}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days - 1);
    return value;
  }, [startDate, days]);

  // Land the viewport on TODAY (the range starts a month back for history,
  // but opening the board on the 1st of last month was the #1 confusion).
  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => schedulerRef.current?.control?.scrollTo?.(today), 50);
    return () => clearTimeout(id);
  }, [mounted, today]);

  // Occupancy per car over the visible window: distinct booked days / window
  // days, counting everything except cancelled. Yango shows this as the fleet
  // "load" number; ours lives in the row header next to the plate.
  const occupancy = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const s of slots) {
      if (s.rental.status === "cancelled") continue;
      if (!s.rental.startDate || (!rentalIsLongTerm(s.rental) && !(s.rental.actualReturnDate || s.rental.returnDate))) continue;
      const start = new Date(s.rental.startDate as Date);
      const end = rentalIsLongTerm(s.rental) ? new Date(boardEnd) : new Date((s.rental.actualReturnDate || s.rental.returnDate) as Date);
      const set = counts.get(s.rental.vehicleId) ?? new Set<string>();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        if (key >= startDate) set.add(key);
      }
      counts.set(s.rental.vehicleId, set);
    }
    const pct = new Map<string, number>();
    for (const v of vehicles) {
      const n = counts.get(v.id)?.size ?? 0;
      pct.set(v.id, Math.min(100, Math.round((n / days) * 100)));
    }
    return pct;
  }, [slots, vehicles, startDate, days, boardEnd]);

  // Short label for the click-a-bar detail card (the row header itself is a
  // two-line HTML block, see onBeforeRowHeaderRender).
  const vName = new Map(
    vehicles.map((v) => {
      const mm = [v.make, (v.model ?? "").split(" ").slice(0, 2).join(" ")].filter(Boolean).join(" ");
      const label = [v.plate, mm].filter(Boolean).join(" · ") || "—";
      return [v.id, label.length > 22 ? `${label.slice(0, 21)}…` : label];
    }),
  );

  // Search filter + "Arrange" sort, client-side (every row is already loaded).
  // Model line is the default: same make+model sit together, alphabetically.
  const visibleVehicles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? vehicles.filter((v) => [v.plate, v.make, v.model].filter(Boolean).join(" ").toLowerCase().includes(q))
      : [...vehicles];
    const lineKey = (v: Vehicle) => [v.make, v.model].filter(Boolean).join(" ");
    const byLine = (a: Vehicle, b: Vehicle) =>
      cmpText(lineKey(a), lineKey(b)) || cmpText(a.plate ?? "", b.plate ?? "");
    if (arrange === "plate") {
      filtered.sort((a, b) => cmpText(a.plate ?? "", b.plate ?? "") || byLine(a, b));
    } else if (arrange === "status") {
      filtered.sort(
        (a, b) => (ROW_STATUS_ORDER[a.status] ?? 9) - (ROW_STATUS_ORDER[b.status] ?? 9) || byLine(a, b)
      );
    } else if (arrange === "utilisation") {
      filtered.sort((a, b) => (occupancy.get(b.id) ?? 0) - (occupancy.get(a.id) ?? 0) || byLine(a, b));
    } else {
      filtered.sort(byLine);
    }
    return filtered;
  }, [vehicles, query, arrange, occupancy]);

  // Per-row header data, keyed by vehicle id for onBeforeRowHeaderRender.
  const rowMeta = useMemo(
    () =>
      new Map(
        vehicles.map((v) => [
          v.id,
          {
            plate: v.plate ?? "—",
            makeModel: [v.make, v.model].filter(Boolean).join(" "),
            dot: ROW_STATUS_DOT[v.status] ?? "#94a3b8",
          },
        ])
      ),
    [vehicles]
  );

  const resources = visibleVehicles.map((v) => ({
    id: v.id,
    name: v.plate ?? "—",
  }));

  const events = slots
    .filter((s) => s.rental.startDate && (rentalIsLongTerm(s.rental) || s.rental.actualReturnDate || s.rental.returnDate))
    .map((s) => {
      const longTerm = rentalIsLongTerm(s.rental);
      const start = new Date(s.rental.startDate as Date);
      const rawEnd = longTerm ? new Date(boardEnd) : new Date((s.rental.actualReturnDate || s.rental.returnDate) as Date);
      const endExcl = new Date(rawEnd);
      endExcl.setDate(endExcl.getDate() + 1); // +1: cover the return day at Day scale
      const dispStatus = longTerm ? "active" : displayStatus(s.rental.status, ymd(rawEnd), today);
      const editable = !longTerm && s.source === "rental" && (s.rental.status === "reserved" || s.rental.status === "active");
      const tags: Tags = {
        source: s.source,
        rentalId: s.rental.id,
        status: dispStatus,
        customerName: s.customerName ?? "—",
        salesAgentName: s.salesAgentName ?? null,
        vehicleName: vName.get(s.rental.vehicleId) ?? "—",
        editable,
        longTerm,
        startYmd: ymd(start),
        endYmd: ymd(rawEnd),
      };
      // Bar = "who holds it": customer · booking manager (first name).
      const managerFirst = s.salesAgentName ? s.salesAgentName.split(" ")[0] : null;
      const tagText = [s.customerName ?? "—", managerFirst].filter(Boolean).join(" · ");
      return {
        id: `${s.source}:${s.rental.id}`,
        resource: s.rental.vehicleId,
        start: ymd(start),
        end: ymd(endExcl),
        text: longTerm ? `Long-term · ${tagText}` : dispStatus === "overdue" ? `⚠ ${tagText}` : tagText,
        backColor: STATUS_COLOR[dispStatus] ?? "#64748b",
        fontColor: "#ffffff",
        borderColor: "darker",
        tags,
      };
    })
    .filter((e) => !hidden.has(e.tags.status))
    .filter((e) => visibleVehicles.some((v) => v.id === e.resource));

  const stripDays = nextDays(today);
  const eventsByCar = groupUpcomingEvents(events, today);
  const shortDate = (value: string) =>
    new Date(`${value}T12:00:00.000Z`).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB", {
      day: "numeric",
      month: "short",
    });

  function toggleStatus(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function applyMove(tags: Tags | undefined, newStartYmd: string, newEndExclYmd: string) {
    if (!tags) return;
    if (!tags.editable) {
      setMsg("That booking is display-only (imported from the sheet or already closed).");
      router.refresh();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await moveRentalDates(tenantId, actorId, tags.rentalId, newStartYmd, newEndExclYmd);
      if (!res.ok) setMsg(res.error ?? "Couldn't reschedule");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't reschedule");
    } finally {
      setBusy(false);
      router.refresh(); // resync from the server (also reverts a rejected drag)
    }
  }

  function closeDetail() {
    setSelected(null);
    setEditing(false);
    setDetailMsg(null);
  }

  function openDetail(tags: Tags | null) {
    setMsg(null);
    setDetailMsg(null);
    setEditing(false);
    setSelected(tags);
    if (tags) {
      setEditStart(tags.startYmd);
      setEditEnd(tags.endYmd);
    }
  }

  // Form-based reschedule from the detail card — the non-drag path into the
  // same moveRentalDates action (server still validates overlap + recomputes
  // totals). Active rentals keep their start (only the return day is edited).
  async function saveDates() {
    if (!selected) return;
    if (!editStart || !editEnd || editEnd < editStart) {
      setDetailMsg("Invalid date range");
      return;
    }
    setBusy(true);
    setDetailMsg(null);
    try {
      const res = await moveRentalDates(tenantId, actorId, selected.rentalId, editStart, endExclYmd(editEnd));
      if (!res.ok) {
        setDetailMsg(res.error ?? "Couldn't reschedule");
        return;
      }
      closeDetail();
    } catch (e) {
      setDetailMsg(e instanceof Error ? e.message : "Couldn't reschedule");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function handleStart() {
    if (!selected) return;
    setBusy(true);
    setDetailMsg(null);
    try {
      await startRental(tenantId, actorId, selected.rentalId, tenantSlug);
      closeDetail();
    } catch (e) {
      setDetailMsg(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function handleCancel() {
    if (!selected) return;
    if (!confirm(t(lang, "fleet.confirmCancel"))) return;
    setBusy(true);
    setDetailMsg(null);
    try {
      await cancelRental(tenantId, actorId, selected.rentalId, tenantSlug);
      closeDetail();
    } catch (e) {
      setDetailMsg(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 text-sm text-ink-3">Loading fleet board…</div>
    );
  }

  return (
    <div className="min-w-0 rounded-card border border-line bg-surface p-2">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mb-2 flex flex-wrap items-center gap-2 bg-surface px-1 py-2 text-[11px] text-ink-2 sm:gap-3 lg:static lg:py-0">
        <span className="hidden font-semibold text-ink sm:inline">Fleet board</span>
        <span className="inline-flex min-h-11 overflow-hidden rounded-field border border-line" aria-label="Calendar view">
          {(["list", "board"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              aria-pressed={shownView === value}
              className={`min-h-11 min-w-16 px-3 py-2 font-semibold transition-colors ${
                shownView === value ? "bg-brand-600 text-white" : "bg-surface text-ink-2 hover:bg-sunken"
              }`}
            >
              {value === "list" ? (lang === "ru" ? "Список" : "List") : (lang === "ru" ? "Доска" : "Board")}
            </button>
          ))}
        </span>
        <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-field border border-line bg-surface px-3 sm:flex-none">
          <Search className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Plate, make, model…"
            aria-label="Search cars"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3 sm:w-40 sm:text-[11px]"
          />
        </label>
        {STATUS_FILTERS.map(({ key, label }) => {
          const off = hidden.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleStatus(key)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 transition-opacity ${
                off ? "border-line opacity-40" : "border-transparent"
              }`}
              aria-pressed={!off}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[key] }} />
              {label}
            </button>
          );
        })}
        <label className="inline-flex min-h-11 items-center gap-1.5 rounded-field border border-line bg-surface px-3 py-2">
          <ArrowUpDown className="h-4 w-4 text-ink-3" />
          <span className="hidden text-ink-3 sm:inline">{t(lang, "fleetBoard.arrange")}:</span>
          <select
            value={arrange}
            onChange={(e) => changeArrange(e.target.value as ArrangeMode)}
            aria-label={t(lang, "fleetBoard.arrange")}
            className="min-h-11 bg-transparent text-[11px] font-medium text-ink outline-none"
          >
            <option value="modelLine">{t(lang, "fleetBoard.arrangeModelLine")}</option>
            <option value="plate">{t(lang, "fleetBoard.arrangePlate")}</option>
            <option value="status">{t(lang, "fleetBoard.arrangeStatus")}</option>
            <option value="utilisation">{t(lang, "fleetBoard.arrangeUtilisation")}</option>
          </select>
        </label>
        <span className="text-ink-3">
          · {resources.length} cars · % = booked days in window
          {shownView === "board" ? " · drag/resize to reschedule · click for details" : " · tap a booking for details"}
        </span>
        {busy && <span className="text-brand-600">{t(lang, "fleet.saving")}</span>}
      </div>

      {hintVisible && shownView === "board" && (
        <div className="mb-2 flex items-center gap-2 rounded-field border border-line bg-sunken px-3 py-1.5 text-[11px] text-ink-2">
          <span className="flex-1">{t(lang, "fleet.hint")}</span>
          <button
            type="button"
            onClick={dismissHint}
            className="min-h-11 rounded px-3 py-2 text-ink-3 hover:bg-surface hover:text-ink"
          >
            {t(lang, "fleet.hintDismiss")}
          </button>
        </div>
      )}

      {msg && (
        <div className="mb-2 rounded-field border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          {msg}
        </div>
      )}

      {shownView === "list" && (
        <ul className="divide-y divide-line-soft">
          {visibleVehicles.map((vehicle) => {
            const meta = rowMeta.get(vehicle.id);
            const list = eventsByCar.get(vehicle.id) ?? [];
            const now = currentEvent(list, today);
            return (
              <li key={vehicle.id} className="px-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: meta?.dot ?? "#94a3b8" }} />
                      <span className="font-mono text-[13px] font-semibold text-ink">{vehicle.plate ?? "—"}</span>
                      <span className="truncate text-xs text-ink-3">{meta?.makeModel ?? ""}</span>
                    </div>
                    <div className="mt-0.5 text-xs">
                      {now ? (
                        <button
                          type="button"
                          onClick={() => openDetail(now.tags)}
                          className="min-h-11 py-2 text-left"
                          style={{ color: STATUS_COLOR[now.tags.status] }}
                        >
                          {now.tags.status === "overdue" ? "⚠ " : "● "}
                          {now.tags.customerName} · {lang === "ru" ? "до" : "until"} {shortDate(now.tags.endYmd)}
                        </button>
                      ) : (
                        <span className="flex min-h-11 items-center text-success">
                          {lang === "ru" ? "Свободна сейчас" : "Free now"}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex-none rounded-full border border-line bg-sunken px-2 py-1 text-[10px] font-semibold text-ink-2">
                    {occupancy.get(vehicle.id) ?? 0}%
                  </span>
                </div>
                <div className="mt-1.5 flex gap-[3px]" aria-label={lang === "ru" ? "Следующие 14 дней" : "Next 14 days"}>
                  {stripDays.map((day) => {
                    const status = eventOnDay(list, day)?.tags.status;
                    return (
                      <div key={day} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
                        <span
                          className={`h-3.5 w-full rounded-[3px] ${day === today ? "ring-1 ring-amber-400" : ""}`}
                          style={{ background: status ? STATUS_COLOR[status] : "#e2e8f0" }}
                        />
                        <span className="text-[9px] leading-none text-ink-3">{Number(day.slice(8))}</span>
                      </div>
                    );
                  })}
                </div>
                {list.filter((event) => event !== now).slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openDetail(event.tags)}
                    className="mt-1.5 flex min-h-11 w-full items-center gap-2 rounded-field border border-line-soft px-2 py-2 text-left text-xs transition-colors hover:bg-sunken"
                  >
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: STATUS_COLOR[event.tags.status] }} />
                    <span className="flex-none text-ink-2 tnum">
                      {shortDate(event.tags.startYmd)} → {shortDate(event.tags.endYmd)}
                    </span>
                    <span className="truncate text-ink">{event.tags.customerName}</span>
                  </button>
                ))}
              </li>
            );
          })}
          {!visibleVehicles.length && <li className="p-4 text-sm text-ink-3">No cars match.</li>}
        </ul>
      )}

      <div className={shownView === "board" ? "touch-scroll overflow-auto" : "hidden"}>
        <DayPilotScheduler
          ref={schedulerRef as never}
          startDate={startDate}
          days={days}
          scale="Day"
          timeHeaders={[{ groupBy: "Month" }, { groupBy: "Day", format: "d" }]}
          cellWidth={phone ? 30 : 34}
          rowHeaderWidth={phone ? 92 : 230}
          eventHeight={phone ? 44 : 30}
          rowMarginTop={phone ? 2 : 3}
          rowMarginBottom={phone ? 2 : 3}
          resources={resources}
          events={events}
          onBeforeRowHeaderRender={(args: { row: { id: string | number; html: string; toolTip: string } }) => {
            // Two-line header: [dot] PLATE …… [occupancy chip] / full make + model.
            // The tooltip carries the whole identity so an ellipsised model is
            // never lost.
            const meta = rowMeta.get(String(args.row.id));
            if (!meta) return;
            const pct = occupancy.get(String(args.row.id)) ?? 0;
            args.row.toolTip = `${meta.plate} · ${meta.makeModel} · ${pct}%`;
            args.row.html =
              `<div style="display:flex;flex-direction:column;justify-content:center;gap:2px;height:100%;padding:0 4px 0 2px;line-height:1.25;">` +
              `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;">` +
              `<span style="display:inline-flex;align-items:center;gap:6px;min-width:0;">` +
              `<span style="flex:none;width:8px;height:8px;border-radius:9999px;background:${meta.dot};"></span>` +
              `<span style="font-size:12px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(meta.plate)}</span>` +
              `</span>` +
              (phone ? "" : `<span style="flex:none;font-size:10px;font-weight:600;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9999px;padding:1px 7px;">${pct}%</span>`) +
              `</div>` +
              `<div style="padding-left:14px;font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(meta.makeModel)}</div>` +
              `</div>`;
          }}
          onBeforeCellRender={(args: {
            cell: { start: { toString: (f?: string) => string; dayOfWeek: () => number }; properties: { backColor: string; cssClass: string } };
          }) => {
            const cellYmd = args.cell.start.toString("yyyy-MM-dd");
            if (cellYmd === today) {
              args.cell.properties.backColor = "#fef3c7"; // today column — amber tint
            } else if (args.cell.start.dayOfWeek() === 0 || args.cell.start.dayOfWeek() === 6) {
              args.cell.properties.backColor = "#f1f5f9"; // weekends — subtle slate
            }
          }}
          onEventClick={(args: { e: { data: { tags?: Tags } } }) => {
            openDetail(args.e.data.tags ?? null);
          }}
          onEventMoved={(args: { e: { data: { tags?: Tags } }; newStart: { toString: (f: string) => string }; newEnd: { toString: (f: string) => string } }) =>
            applyMove(args.e.data.tags, args.newStart.toString("yyyy-MM-dd"), args.newEnd.toString("yyyy-MM-dd"))
          }
          onEventResized={(args: { e: { data: { tags?: Tags } }; newStart: { toString: (f: string) => string }; newEnd: { toString: (f: string) => string } }) =>
            applyMove(args.e.data.tags, args.newStart.toString("yyyy-MM-dd"), args.newEnd.toString("yyyy-MM-dd"))
          }
          onTimeRangeSelected={(args: { start: { toString: (f: string) => string }; end: { toString: (f: string) => string }; resource: string | number }) => {
            // Selecting empty days on a car → New Booking prefilled. `end` is the
            // exclusive right edge, so the return day is end − 1.
            const endExcl = new Date(`${args.end.toString("yyyy-MM-dd")}T00:00:00.000Z`);
            endExcl.setUTCDate(endExcl.getUTCDate() - 1);
            setNewBooking({
              vehicleId: String(args.resource),
              start: args.start.toString("yyyy-MM-dd"),
              end: ymd(endExcl),
            });
          }}
        />
      </div>

      {/* Click-a-bar detail card */}
      {selected && (() => {
        // "overdue" is the display form of an active rental past its return day.
        const isReserved = selected.status === "reserved";
        const isActive = selected.status === "active" || selected.status === "overdue";
        const canAct = selected.source === "rental" && selected.editable && (isReserved || isActive);
        return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-ink/40" role="button" aria-label="Close" onClick={closeDetail} />
          <div className="mobile-sheet relative z-10 max-h-[90dvh] w-full overflow-y-auto rounded-t-card border border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop sm:max-w-md sm:rounded-card sm:pb-0">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLOR[selected.status] ?? "#64748b" }} />
                <h3 className="text-sm font-semibold text-ink">{selected.customerName}</h3>
              </div>
              <button onClick={closeDetail} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded text-ink-3 hover:bg-sunken hover:text-ink">✕</button>
            </div>
            <div className="space-y-2 px-5 py-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-3">Car</span><span className="text-ink">{selected.vehicleName}</span></div>
              {editing ? (
                <div className="space-y-2 rounded-field border border-line bg-sunken p-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-ink-3" htmlFor="fleet-edit-start">{t(lang, "fleet.startDate")}</label>
                    <input
                      id="fleet-edit-start"
                      type="date"
                      value={editStart}
                      min={isReserved ? today : undefined}
                      disabled={isActive}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="min-h-11 rounded-field border border-line bg-surface px-2 py-2 text-xs text-ink disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-ink-3" htmlFor="fleet-edit-end">{t(lang, "fleet.returnDate")}</label>
                    <input
                      id="fleet-edit-end"
                      type="date"
                      value={editEnd}
                      min={editStart}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="min-h-11 rounded-field border border-line bg-surface px-2 py-2 text-xs text-ink"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-between"><span className="text-ink-3">Dates</span><span className="text-ink tnum">{selected.startYmd} → {selected.longTerm ? "open-ended" : selected.endYmd}</span></div>
              )}
              {selected.salesAgentName && (
                <div className="flex justify-between"><span className="text-ink-3">Booked by</span><span className="text-ink">{selected.salesAgentName}</span></div>
              )}
              <div className="flex justify-between"><span className="text-ink-3">Status</span><span className="capitalize text-ink">{selected.longTerm ? "long-term" : selected.status}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Type</span><span className="text-ink">{selected.source === "rental" ? "Platform rental" : "Imported (sheet)"}</span></div>
              {detailMsg && (
                <div className="rounded-field border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                  {detailMsg}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line-soft px-5 py-3">
              {selected.source === "rental" ? (
                <>
                  {canAct && !editing && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setDetailMsg(null);
                        setEditStart(selected.startYmd);
                        setEditEnd(selected.endYmd);
                        setEditing(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" /> {t(lang, "fleet.editDates")}
                    </button>
                  )}
                  {editing && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditing(false);
                          setDetailMsg(null);
                        }}
                        className="rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-50"
                      >
                        {t(lang, "fleet.cancel")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={saveDates}
                        className="rounded-field bg-brand-600 min-h-11 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {t(lang, "fleet.save")}
                      </button>
                    </>
                  )}
                  {isReserved && !editing && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleStart}
                        className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-green-700 hover:bg-sunken disabled:opacity-50"
                      >
                        <Play className="h-4 w-4" /> {t(lang, "fleet.startRental")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleCancel}
                        className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-red-600 hover:bg-sunken disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" /> {t(lang, "fleet.cancelBooking")}
                      </button>
                    </>
                  )}
                  <Link
                    href={`/${tenantSlug}/rentals/${selected.rentalId}#chat`}
                    className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink"
                  >
                    <MessageSquare className="h-4 w-4" /> Chat
                  </Link>
                  <Link
                    href={`/${tenantSlug}/rentals/${selected.rentalId}#return-checklist`}
                    className="inline-flex items-center gap-1.5 rounded-field border border-line bg-surface min-h-11 px-3 py-2 text-sm font-medium text-ink-2 hover:bg-sunken hover:text-ink"
                  >
                    <ClipboardCheck className="h-4 w-4" /> Return checklist
                  </Link>
                  <Link
                    href={`/${tenantSlug}/rentals/${selected.rentalId}`}
                    className="rounded-field bg-brand-600 min-h-11 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Open rental →
                  </Link>
                </>
              ) : (
                <span className="text-xs text-ink-3">Display-only — imported from the coordination sheet.</span>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* New Booking from a selected day-range on a car */}
      {newBooking && (
        <CreateRentalModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          actorId={actorId}
          vehicles={vehicles.map((v) => ({ id: v.id, make: v.make ?? "", model: v.model ?? "", plate: v.plate ?? "" }))}
          initialVehicleId={newBooking.vehicleId}
          initialStartDate={newBooking.start}
          initialReturnDate={newBooking.end}
          onClose={() => setNewBooking(null)}
          onCreated={() => {
            setNewBooking(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
