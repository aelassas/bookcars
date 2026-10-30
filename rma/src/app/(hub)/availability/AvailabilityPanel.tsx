"use client";

// AvailabilityPanel — the /availability toggles. Agents pick THEIR name from
// the rotation list (preselected to the PIN session's name when it matches)
// and set Available / Busy (auto-expires after the configured TTL) / Off duty.
// Polls /availability/api every 15s; the buttons POST there.

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardHeader, Table, TH, TD, cx, type BadgeTone } from "@/components/ui";

type AgentRow = {
  name: string;
  brand: string;
  /** Effective phone: the DB override when set, else the env roster phone. */
  phone: string;
  /** The manager-set override only (null = env phone rules). */
  phoneOverride: string | null;
  status: "available" | "busy" | "off";
  busyUntil: string | null;
  dayOff: number | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  leaveDaysRemaining: number | null;
  updatedAt: string | null;
  editable: boolean;
};
type PanelData = {
  agents: AgentRow[];
  allowedNames: string[];
  canPickAny: boolean;
  busyTtlMin: number;
  distributorEnabled: boolean;
  serverWeekday: number;
  at: string;
};

const POLL_MS = 15_000;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_TONE: Record<AgentRow["status"], BadgeTone> = {
  available: "success",
  busy: "warning",
  off: "neutral",
};
const STATUS_LABEL: Record<AgentRow["status"], string> = {
  available: "Available",
  busy: "Busy",
  off: "Off duty",
};

// Owner's order: Available first, then Busy, then Off duty. Array#sort is
// stable, so agents with the same status keep the roster order.
const STATUS_ORDER: Record<AgentRow["status"], number> = { available: 0, busy: 1, off: 2 };

function byStatus(agents: AgentRow[]): AgentRow[] {
  return [...agents].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
}

function busyLeft(busyUntil: string | null, nowMs: number): string | null {
  if (!busyUntil) return null;
  const ms = new Date(busyUntil).getTime() - nowMs;
  if (ms <= 0) return null;
  return `back in ${Math.ceil(ms / 60_000)} min`;
}

export default function AvailabilityPanel(props: { sessionName: string | null; canPickAny: boolean }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>(props.sessionName ?? "");
  const [editing, setEditing] = useState<AgentRow | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/availability/api", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as PanelData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  async function setStatus(status: "available" | "busy" | "off") {
    const name = effectiveSelected;
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/availability/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveSchedule(a: AgentRow) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/availability/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: a.name,
          schedule: {
            dayOff: a.dayOff,
            shiftStart: a.shiftStart,
            shiftEnd: a.shiftEnd,
            leaveDaysRemaining: a.leaveDaysRemaining,
            // The OVERRIDE, not the displayed effective phone — saving an
            // untouched field must not pin today's env phone into the DB.
            phone: a.phoneOverride ?? "",
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditing(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return <div className="text-sm text-ink-2">{error ? `Failed to load: ${error}` : "Loading…"}</div>;
  }
  if (data.agents.length === 0) {
    return (
      <div className="text-sm text-ink-2">
        No rental rotations configured (RENTAL_ROTATION_ETM / RENTAL_ROTATION_CARDIWAN).
      </div>
    );
  }

  // a.status is the API's effectiveStatus (busy expiry + day off already
  // applied server-side) — sort on it directly.
  const editableAgents = byStatus(data.agents.filter((a) => a.editable));
  // The dropdown's effective value: the agent's own roster row by default
  // (the PIN session's name), else the first row they may edit.
  const own =
    data.agents.find(
      (a) => a.editable && a.name.trim().toLowerCase() === (props.sessionName ?? "").trim().toLowerCase()
    )?.name ?? data.allowedNames[0] ?? "";
  const effectiveSelected = selected || own;
  const nowMs = new Date(data.at).getTime(); // the server's clock, not render-time

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Card>
        <CardHeader title="My status" />
        <div className="flex flex-wrap items-center gap-3 p-4">
          {data.canPickAny ? (
            <select
              className="rounded border border-line bg-surface px-2 py-1 text-sm"
              value={effectiveSelected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {editableAgents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.brand})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-medium">{effectiveSelected}</span>
          )}
          <Button disabled={saving || !effectiveSelected} onClick={() => void setStatus("available")}>
            Available
          </Button>
          <Button disabled={saving || !effectiveSelected} onClick={() => void setStatus("busy")}>
            Busy ({data.busyTtlMin} min)
          </Button>
          <Button disabled={saving || !effectiveSelected} onClick={() => void setStatus("off")}>
            Off duty
          </Button>
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </Card>

      <Card>
        <CardHeader title="Rotations" />
        <Table>
          <thead>
            <tr>
              <TH>Agent</TH>
              <TH>Brand</TH>
              <TH>Phone</TH>
              <TH>Status</TH>
              <TH>Shift</TH>
              <TH>Day off</TH>
              <TH>Leaves</TH>
              <TH></TH>
            </tr>
          </thead>
          <tbody>
            {byStatus(data.agents).map((a) => (
              <tr key={a.name} className={cx(a.editable && "bg-sunken/40")}>
                <TD>{a.name}</TD>
                <TD>{a.brand}</TD>
                <TD>
                  <span className="text-xs">
                    +{a.phone}
                    {a.phoneOverride ? <span className="text-ink-2"> ✎</span> : null}
                  </span>
                </TD>
                <TD>
                  <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                </TD>
                <TD>
                  <span className="text-xs">{a.shiftStart && a.shiftEnd ? `${a.shiftStart}–${a.shiftEnd}` : "—"}</span>
                </TD>
                <TD>
                  <span className={cx("text-xs", a.dayOff !== null && a.dayOff === data.serverWeekday && "font-semibold text-red-600")}>
                    {a.dayOff !== null ? DAY_NAMES[a.dayOff] : "—"}
                  </span>
                </TD>
                <TD>
                  <span className="text-xs">{a.leaveDaysRemaining ?? "—"}</span>
                </TD>
                <TD>
                  <span className="text-xs text-ink-2">
                    {a.status === "busy" ? busyLeft(a.busyUntil, nowMs) ?? "" : ""}
                  </span>
                  {data.canPickAny ? (
                    <Button className="ml-2 px-2 py-0.5 text-xs" disabled={saving} onClick={() => setEditing({ ...a })}>
                      Edit
                    </Button>
                  ) : null}
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
        {!data.distributorEnabled ? (
          <div className="p-3 text-xs text-ink-2">
            The distributor is OFF (RENTAL_DISTRIBUTOR=off) — these toggles are recorded but not used.
          </div>
        ) : null}
      </Card>

      {editing ? (
        <Card>
          <CardHeader title={`Edit — ${editing.name}`} />
          <div className="flex flex-wrap items-end gap-3 p-4">
            <label className="flex flex-col gap-1 text-xs text-ink-2">
              Phone (override — empty = env roster)
              <input
                className="rounded border border-line bg-surface px-2 py-1 text-sm w-36"
                value={editing.phoneOverride ?? ""}
                placeholder={editing.phone}
                onChange={(e) => setEditing({ ...editing, phoneOverride: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-2">
              Day off (auto — no leads that day)
              <select
                className="rounded border border-line bg-surface px-2 py-1 text-sm"
                value={editing.dayOff === null ? "" : String(editing.dayOff)}
                onChange={(e) => setEditing({ ...editing, dayOff: e.target.value === "" ? null : Number(e.target.value) })}
              >
                <option value="">none</option>
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-2">
              Shift start
              <input
                className="rounded border border-line bg-surface px-2 py-1 text-sm w-20"
                value={editing.shiftStart ?? ""}
                placeholder="10:00"
                onChange={(e) => setEditing({ ...editing, shiftStart: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-2">
              Shift end
              <input
                className="rounded border border-line bg-surface px-2 py-1 text-sm w-20"
                value={editing.shiftEnd ?? ""}
                placeholder="20:00"
                onChange={(e) => setEditing({ ...editing, shiftEnd: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-2">
              Leave days left
              <input
                className="rounded border border-line bg-surface px-2 py-1 text-sm w-16"
                type="number"
                min={0}
                value={editing.leaveDaysRemaining ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, leaveDaysRemaining: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </label>
            <Button disabled={saving} onClick={() => void saveSchedule(editing)}>
              Save
            </Button>
            <Button disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
          <div className="px-4 pb-3 text-xs text-ink-2">
            The day off is enforced automatically. Shift hours are informational — after-hours lead flow is
            controlled by the Available/Off-duty toggle, not the clock.
          </div>
        </Card>
      ) : null}
    </div>
  );
}
