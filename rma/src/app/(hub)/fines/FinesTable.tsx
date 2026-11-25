"use client";

// FinesTable — renders the "Fines" sheet rows via /fines/api (server-side
// Google read). Rows with any dirham of fines or Salik get a light highlight
// so the desk's eye goes straight to what costs money. Refetches every 5 min;
// the sheet itself is rewritten hourly by the launchd job, so the "Checked
// on" column is the real freshness signal.
import { useEffect, useState } from "react";

type Payload = { fetchedAt: string; header: string[]; rows: string[][] };

const AED_COLS = new Set(["fines aed", "salik aed"]);

// The hourly sheet job used to write this phrase into the Details column; the
// owner renamed it to "data is not provided". The sheet rewrites hourly, so
// old rows keep arriving until then — swap at display time too.
const OLD_SALIK_NOTE = "plate not on a configured Salik account";

function displayCell(s: string | undefined): string {
  // Cells typed string[][] actually arrive as numbers sometimes (Days out,
  // Fines AED) — coerce before touching string methods.
  if (s == null) return "";
  return String(s).split(OLD_SALIK_NOTE).join("data is not provided");
}

function aedValue(s: string): number {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function FinesTable() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/fines/api", { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (alive) setData(body);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "load failed");
      }
    };
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (error) return <p className="text-sm text-red-600">Не удалось загрузить: {error}</p>;
  if (!data) return <p className="text-sm text-ink-2">Загрузка…</p>;
  if (data.rows.length === 0) return <p className="text-sm text-ink-2">Сейчас нет машин в аренде в листе.</p>;

  const moneyCols = data.header
    .map((h, i) => (AED_COLS.has(h.trim().toLowerCase()) ? i : -1))
    .filter((i) => i >= 0);

  return (
    <div className="overflow-x-auto rounded border border-line">
      <table className="min-w-full text-xs">
        <thead className="bg-sunken text-left">
          <tr>
            {data.header.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-2 py-1.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, ri) => {
            const owes = moneyCols.some((ci) => aedValue(r[ci] ?? "") > 0);
            return (
              <tr key={ri} className={owes ? "bg-warn-soft" : ri % 2 ? "bg-surface" : ""}>
                {data.header.map((_, ci) => (
                  <td key={ci} className="max-w-[340px] whitespace-pre-wrap px-2 py-1.5 align-top">
                    {displayCell(r[ci])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-2 py-1.5 text-[11px] text-ink-2">
        Обновлено {new Date(data.fetchedAt).toLocaleString("ru-RU")} · правки «Notes» — в Google-листе
      </p>
    </div>
  );
}
