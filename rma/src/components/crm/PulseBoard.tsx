"use client";
// Card = живой разговор. Секции: Сегодня / Вчера / Эта неделя / Остывшие.
// 🔥 hot = красная кайма; warm = янтарная; «ждёт N ч» бейдж на неотвеченных.
// Вкладка «Не распределено» — нераспознанные номера (без групп и рассылок).
// Ответ: инлайн-композер на карточке → queueLeadReply (существующий путь,
// wa_outbox + stop-words; отправка реально уходит только когда включат
// WA_SEND_ENABLED — до того честно висит в «queued»).
//
// Styling: design-system tokens ONLY (bg-surface/bg-sunken, text-ink*,
// border-line, rounded-card/field) — the first cut shipped light-theme
// slate/white classes and was unreadable on the dark app (2026-07-22 visual
// pass). Mirror WatchersBoard.tsx if in doubt.
import { useState, useTransition } from "react";
import Link from "next/link";
import { queueLeadReply } from "@/modules/crm/reply-actions";
import type { PulseConvo, UnassignedConvo } from "@/modules/crm/pulse-queries";

const SECTIONS: { key: PulseConvo["section"]; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This week" },
  { key: "cold", label: "Cooled off" },
];

function heatClasses(heat: PulseConvo["heat"]): string {
  if (heat === "hot") return "border-red-500/60 bg-red-500/5";
  if (heat === "warm") return "border-amber-400/50 bg-amber-400/5";
  return "border-line bg-surface";
}

function waitBadge(min: number | null) {
  if (min == null || min < 30) return null;
  const h = Math.floor(min / 60);
  const label = h >= 1 ? `client waiting ${h} h` : `client waiting ${min} min`;
  return (
    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      {label}
    </span>
  );
}

function Composer({ tenantSlug, leadId }: { tenantSlug: string; leadId: string }) {
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Reply to the client…"
          className="w-full rounded-field border border-line bg-sunken px-2 py-1 text-sm text-ink placeholder:text-ink-3 focus:border-brand-400 focus:outline-none"
        />
        <button
          disabled={pending || !draft.trim()}
          onClick={() =>
            start(async () => {
              setErr(null);
              try {
                await queueLeadReply(tenantSlug, leadId, draft);
                setDraft("");
                setSent(true);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Not sent");
              }
            })
          }
          className="rounded-field bg-brand-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-brand-500 disabled:opacity-40"
        >
          {pending ? "…" : "Queue"}
        </button>
      </div>
      {sent && <div className="mt-1 text-xs text-emerald-500">Queued for sending</div>}
      {err && <div className="mt-1 text-xs text-red-500">{err}</div>}
    </div>
  );
}

export function PulseBoard({
  tenantSlug,
  convos,
  unassigned,
}: {
  tenantSlug: string;
  convos: PulseConvo[];
  unassigned: UnassignedConvo[];
}) {
  const [tab, setTab] = useState<"board" | "unassigned">("board");
  const waiting = convos.filter((c) => (c.waitingMin ?? 0) >= 120).length;

  const tabClass = (active: boolean) =>
    `rounded-field px-2.5 py-1 text-sm transition-colors ${
      active
        ? "bg-brand-600 font-medium text-white"
        : "bg-sunken text-ink-2 hover:text-ink"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {waiting > 0 && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            Awaiting reply: {waiting}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button onClick={() => setTab("board")} className={tabClass(tab === "board")}>
            Conversations ({convos.length})
          </button>
          <button onClick={() => setTab("unassigned")} className={tabClass(tab === "unassigned")}>
            Unassigned ({unassigned.length})
          </button>
        </div>
      </div>

      {tab === "board" && convos.length === 0 && (
        <div className="rounded-card border border-dashed border-line-soft px-4 py-10 text-center text-sm text-ink-3">
          0 stitched conversations so far: WhatsApp hides the numbers of half the chats
          (@lid); phone-based stitching will work after the observer upgrade.
          The live stream is already visible in the "Unassigned" tab.
        </div>
      )}

      {tab === "board" &&
        SECTIONS.map(({ key, label }) => {
          const rows = convos.filter((c) => c.section === key);
          if (rows.length === 0) return null;
          return (
            <section key={key}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
                {label} · {rows.length}
              </h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((c) => (
                  <div
                    key={`${c.leadId}`}
                    className={`rounded-card border p-3 shadow-card ${heatClasses(c.heat)}`}
                  >
                    <div className="flex items-center gap-2">
                      {c.heat === "hot" && <span>🔥</span>}
                      <Link
                        href={c.dealId
                          ? `/${tenantSlug}/deals/${c.dealId}`
                          : `/${tenantSlug}/crm/leads/${c.leadId}`}
                        className="truncate text-[13px] font-medium text-ink hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="ml-auto shrink-0 text-xs text-ink-3">
                        {c.ownerName ?? "—"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {waitBadge(c.waitingMin)}
                      {c.carText && (
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-2">{c.carText}</span>
                      )}
                      {c.priceAed != null && (
                        <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-2 tnum">
                          {c.priceAed.toLocaleString()} AED
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {c.lastLines.slice(0, 3).map((l, i) => (
                        <div key={i} className="truncate text-xs text-ink-2">
                          <span className={l.direction === "inbound" ? "text-ink" : "text-emerald-500"}>
                            {l.direction === "inbound" ? "→" : "←"}
                          </span>{" "}
                          {l.body}
                        </div>
                      ))}
                    </div>
                    {c.leadId && <Composer tenantSlug={tenantSlug} leadId={c.leadId} />}
                  </div>
                ))}
              </div>
            </section>
          );
        })}

      {tab === "unassigned" && (
        <div className="space-y-1">
          {unassigned.map((u) => (
            <div
              key={u.from}
              className="flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2 text-sm"
            >
              <span className="shrink-0 font-medium text-ink">{u.pushName ?? u.from}</span>
              <span className="truncate text-ink-3">{u.lastBody}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-3 tnum">{u.msgs7d} msgs / 7d</span>
            </div>
          ))}
          {unassigned.length === 0 && (
            <div className="text-sm text-ink-3">Empty — everything is assigned.</div>
          )}
        </div>
      )}
    </div>
  );
}
