"use client";

import { useCallback, useEffect, useState } from "react";

// Mirrors the shapes returned by /reports/api/rental (modules/reports/rental.ts).
type AgentRow = {
  id: string;
  name: string;
  leads: number;
  contacted: number;
  calls: number;
  successful: number;
  lost: number;
  conversionPct: number | null;
  avgFirstResponseMin: number | null;
  firstResponseCount: number;
  followUpsDone: number;
  followUpsMissed: number;
};
type SourceRow = {
  source: string;
  label: string;
  leads: number;
  successful: number;
  lost: number;
  successPct: number | null;
};
type LostReasonRow = { reason: string; label: string; count: number };
type BrandRow = {
  brand: string;
  label: string;
  leads: number;
  successful: number;
  lost: number;
  successPct: number | null;
  conversations: number;
  answered: number;
  answerPct: number | null;
  replies: number;
  avgFirstResponseMin: number | null;
};
type Report = {
  period: string;
  range: { start: string; end: string };
  generatedAt: string;
  warning: string | null;
  kpis: {
    newLeads: number;
    calls: number;
    whatsappPeople: number;
    successful: number;
    lost: number;
    followUpsDue: number;
    followUpsDone: number;
    avgFirstResponseMin: number | null;
  };
  agents: AgentRow[];
  brands: BrandRow[];
  unmappedLines: { line: string; conversations: number }[];
  sources: SourceRow[];
  lostReasons: LostReasonRow[];
  notes: string[];
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
] as const;

const DUBAI = "Asia/Dubai";
const dash = "—";

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: DUBAI,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMinutes(min: number | null): string {
  if (min === null) return dash;
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(report: Report): string {
  const lines: string[] = [];
  const row = (cells: (string | number)[]) => lines.push(cells.map(csvEscape).join(","));
  row(["Rental report", PERIODS.find((p) => p.key === report.period)?.label ?? report.period]);
  row(["Period (Asia/Dubai)", fmtDateTime(report.range.start), "to", fmtDateTime(report.range.end)]);
  row(["Generated", fmtDateTime(report.generatedAt)]);
  lines.push("");
  row(["KPI", "Value"]);
  row(["New leads", report.kpis.newLeads]);
  row(["Calls", report.kpis.calls]);
  row(["WhatsApp people", report.kpis.whatsappPeople]);
  row(["Successful deals", report.kpis.successful]);
  row(["Lost deals", report.kpis.lost]);
  row(["Follow-ups due", report.kpis.followUpsDue]);
  row(["Follow-ups completed", report.kpis.followUpsDone]);
  row(["Avg first response", fmtMinutes(report.kpis.avgFirstResponseMin)]);
  lines.push("");
  row([
    "Agent", "Leads", "Contacted", "Calls", "Successful", "Lost",
    "Conversion %", "Avg first response", "Responses", "Follow-ups done", "Follow-ups missed",
  ]);
  for (const a of report.agents) {
    row([
      a.name, a.leads, a.contacted, a.calls, a.successful, a.lost,
      a.conversionPct === null ? dash : a.conversionPct,
      fmtMinutes(a.avgFirstResponseMin), a.firstResponseCount, a.followUpsDone, a.followUpsMissed,
    ]);
  }
  lines.push("");
  row([
    "Brand", "Leads", "Successful", "Lost", "Success %",
    "Conversations", "Answered", "Answer %", "Replies sent", "Avg first response",
  ]);
  for (const b of report.brands) {
    row([
      b.label, b.leads, b.successful, b.lost, b.successPct === null ? dash : b.successPct,
      b.conversations, b.answered, b.answerPct === null ? dash : b.answerPct,
      b.replies, fmtMinutes(b.avgFirstResponseMin),
    ]);
  }
  lines.push("");
  row(["Lead source", "Leads", "Successful", "Lost", "Success %"]);
  for (const s of report.sources) {
    row([s.label, s.leads, s.successful, s.lost, s.successPct === null ? dash : s.successPct]);
  }
  lines.push("");
  row(["Lost reason", "Deals"]);
  for (const r of report.lostReasons) row([r.label, r.count]);
  return lines.join("\n");
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-ink-3">{hint}</div> : null}
    </div>
  );
}

export default function RentalReport() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("today");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/reports/api/rental?period=${p}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`report ${res.status}`);
      setReport((await res.json()) as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [period, load]);

  function downloadCsv() {
    if (!report) return;
    const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rental-report-${report.period}-${report.range.start.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const th = "px-3 py-2 text-left text-xs font-medium text-ink-2 whitespace-nowrap";
  const td = "px-3 py-2 text-sm tabular-nums";

  return (
    <div className="space-y-5">
      {/* Period tabs + CSV */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-field border border-line bg-surface p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-field px-3 py-1.5 text-sm transition-colors ${
                period === p.key ? "bg-brand-600 text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={downloadCsv}
          disabled={!report}
          className="rounded-field border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 shadow-card transition-colors hover:text-ink disabled:opacity-40"
        >
          Export CSV
        </button>
        {report ? (
          <span className="text-xs text-ink-3">
            {fmtDateTime(report.range.start)} → {fmtDateTime(report.range.end)} · generated{" "}
            {fmtDateTime(report.generatedAt)}
          </span>
        ) : null}
      </div>

      {report?.warning ? (
        <div className="rounded-card border border-warn-line bg-warn-soft px-4 py-2 text-sm text-warn">
          {report.warning}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-card border border-danger-line bg-danger-soft px-4 py-2 text-sm text-danger">
          Failed to load the report: {error}
        </div>
      ) : null}
      {loading ? <div className="text-sm text-ink-2">Loading…</div> : null}

      {report && !loading ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            <KpiCard label="New leads" value={String(report.kpis.newLeads)} />
            <KpiCard label="Calls" value={String(report.kpis.calls)} hint="transcribed calls" />
            <KpiCard label="WhatsApp people" value={String(report.kpis.whatsappPeople)} hint="distinct numbers" />
            <KpiCard label="Successful" value={String(report.kpis.successful)} />
            <KpiCard label="Lost" value={String(report.kpis.lost)} />
            <KpiCard label="Follow-ups due" value={String(report.kpis.followUpsDue)} hint="open tasks" />
            <KpiCard label="Follow-ups done" value={String(report.kpis.followUpsDone)} />
            <KpiCard label="Avg 1st response" value={fmtMinutes(report.kpis.avgFirstResponseMin)} />
          </div>

          {/* Brand comparison */}
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <h2 className="border-b border-line-soft px-4 py-2.5 text-sm font-semibold">
              Brands
              <span className="ml-2 font-normal text-ink-3">
                by the WhatsApp line the customer wrote to · leasing lines excluded
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sunken">
                  <tr>
                    <th className={th}>Brand</th>
                    <th className={th}>Leads</th>
                    <th className={th}>Successful</th>
                    <th className={th}>Lost</th>
                    <th className={th}>Success %</th>
                    <th className={th}>Conversations</th>
                    <th className={th}>Answered</th>
                    <th className={th}>Answer %</th>
                    <th className={th}>Replies sent</th>
                    <th className={th}>Avg 1st resp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {report.brands.map((b) => (
                    <tr key={b.brand}>
                      <td className={`${td} font-medium`}>{b.label}</td>
                      <td className={td}>{b.leads}</td>
                      <td className={`${td} text-success`}>{b.successful}</td>
                      <td className={`${td} text-danger`}>{b.lost}</td>
                      <td className={td}>{b.successPct === null ? dash : `${b.successPct}%`}</td>
                      <td className={td}>{b.conversations}</td>
                      <td className={td}>{b.answered}</td>
                      <td className={td}>{b.answerPct === null ? dash : `${b.answerPct}%`}</td>
                      <td className={td}>{b.replies}</td>
                      <td className={td}>{fmtMinutes(b.avgFirstResponseMin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.unmappedLines.length ? (
              <div className="border-t border-line-soft bg-warn-soft px-4 py-2 text-xs text-warn">
                Not counted under any brand —{" "}
                {report.unmappedLines
                  .map((u) => `${u.line} (${u.conversations})`)
                  .join(", ")}
                . Tell me which brand each belongs to and it will be added.
              </div>
            ) : null}
          </section>

          {/* Per-agent table */}
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <h2 className="border-b border-line-soft px-4 py-2.5 text-sm font-semibold">Agents</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sunken">
                  <tr>
                    <th className={th}>Agent</th>
                    <th className={th}>Leads</th>
                    <th className={th}>Contacted</th>
                    <th className={th}>Calls</th>
                    <th className={th}>Successful</th>
                    <th className={th}>Lost</th>
                    <th className={th}>Conv. %</th>
                    <th className={th}>Avg 1st resp.</th>
                    <th className={th}>F-ups done</th>
                    <th className={th}>F-ups missed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {report.agents.map((a) => (
                    <tr key={a.id}>
                      <td className={`${td} font-medium`}>{a.name}</td>
                      <td className={td}>{a.leads}</td>
                      <td className={td}>{a.contacted}</td>
                      <td className={td}>{a.calls}</td>
                      <td className={`${td} text-success`}>{a.successful}</td>
                      <td className={`${td} text-danger`}>{a.lost}</td>
                      <td className={td}>{a.conversionPct === null ? dash : `${a.conversionPct}%`}</td>
                      <td className={td}>
                        {fmtMinutes(a.avgFirstResponseMin)}
                        {a.firstResponseCount > 0 ? (
                          <span className="ml-1 text-xs text-ink-3">({a.firstResponseCount})</span>
                        ) : null}
                      </td>
                      <td className={td}>{a.followUpsDone}</td>
                      <td className={td}>{a.followUpsMissed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Lead sources */}
            <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <h2 className="border-b border-line-soft px-4 py-2.5 text-sm font-semibold">
                Lead sources
              </h2>
              <table className="w-full">
                <thead className="bg-sunken">
                  <tr>
                    <th className={th}>Source</th>
                    <th className={th}>Leads</th>
                    <th className={th}>Successful</th>
                    <th className={th}>Lost</th>
                    <th className={th}>Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {report.sources.map((s) => (
                    <tr key={s.source}>
                      <td className={`${td} font-medium`}>{s.label}</td>
                      <td className={td}>{s.leads}</td>
                      <td className={`${td} text-success`}>{s.successful}</td>
                      <td className={`${td} text-danger`}>{s.lost}</td>
                      <td className={td}>{s.successPct === null ? dash : `${s.successPct}%`}</td>
                    </tr>
                  ))}
                  {!report.sources.length ? (
                    <tr>
                      <td className={`${td} text-ink-3`} colSpan={5}>
                        No leads in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            {/* Lost deals by reason */}
            <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <h2 className="border-b border-line-soft px-4 py-2.5 text-sm font-semibold">
                Lost deals by reason
              </h2>
              <table className="w-full">
                <thead className="bg-sunken">
                  <tr>
                    <th className={th}>Reason</th>
                    <th className={th}>Deals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {report.lostReasons.map((r) => (
                    <tr key={r.reason}>
                      <td className={`${td} font-medium`}>{r.label}</td>
                      <td className={td}>{r.count}</td>
                    </tr>
                  ))}
                  {!report.lostReasons.length ? (
                    <tr>
                      <td className={`${td} text-ink-3`} colSpan={2}>
                        No lost deals in this period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </div>

          {/* Methodology */}
          <details className="rounded-card border border-line bg-surface px-4 py-2.5 text-xs text-ink-2 shadow-card">
            <summary className="cursor-pointer font-medium text-ink">How these numbers are computed</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        </>
      ) : null}
    </div>
  );
}
