import Link from "next/link";
import { cx } from "@/components/ui";
import { funnelStageLabel } from "@/platform/integrations/bitrix24/mappings";
import type { WatcherColumn } from "@/modules/crm/queries";

// "Наблюдатели" — live demand grouped by customer intent. A dense, read-first
// kanban: each column is an intent bucket, each card a live open deal with the
// owner's initials and days-since-touch. Server-rendered; cards link to the
// deal card where the intent picker lives.

// Days-since-touch → tone. Text carries the meaning; colour only reinforces it.
function touchTone(days: number | null): { cls: string; label: string } {
  if (days == null) return { cls: "text-ink-3", label: "—" };
  if (days >= 14) return { cls: "text-danger", label: `${days}d` };
  if (days >= 7) return { cls: "text-warning", label: `${days}d` };
  return { cls: "text-ink-3", label: `${days}d` };
}

export function WatchersBoard({
  columns,
  tenantSlug,
}: {
  columns: WatcherColumn[];
  tenantSlug: string;
}) {
  const total = columns.reduce((s, c) => s + c.count, 0);

  return (
    <div>
      <p className="mb-4 text-sm text-ink-3">
        {total.toLocaleString("en-US")} active deals grouped by customer intent.
        The tag is set on the deal card; without a tag the deal is placed in a column by heuristic
        (marked <span className="font-mono">?</span>).
      </p>

      {/* Wider columns + larger type — owner feedback 2026-07-23 («карточки слишком мелкие»). */}
      <div className="grid grid-flow-col auto-cols-[minmax(320px,1fr)] gap-4 overflow-x-auto pb-3">
        {columns.map((col) => (
          <section
            key={col.key}
            className="flex flex-col rounded-card border border-line bg-sunken/40"
            aria-label={col.full}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-card border-b border-line-soft bg-surface px-3 py-2">
              <h2 className="truncate text-[13px] font-semibold text-ink" title={col.full}>
                {col.label}
              </h2>
              <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-2 tnum">
                {col.count}
              </span>
            </header>

            <div className="flex flex-col gap-2 p-2">
              {col.cards.length === 0 && (
                <div className="rounded-field border border-dashed border-line-soft px-3 py-6 text-center text-xs text-ink-3">
                  No deals
                </div>
              )}
              {col.cards.map((card) => {
                const t = touchTone(card.daysSinceTouch);
                return (
                  <Link
                    key={card.id}
                    href={`/${tenantSlug}/deals/${card.id}`}
                    className="group rounded-field border border-line bg-surface px-3.5 py-3 shadow-card transition-colors hover:border-brand-400"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
                        {card.headline}
                        {!card.intentExplicit && (
                          <span
                            className="ml-1 font-mono text-[11px] text-ink-3"
                            title="Intent inferred by heuristic, not confirmed manually"
                          >
                            ?
                          </span>
                        )}
                      </span>
                      <span
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-[12px] font-bold text-brand-700"
                        title={card.ownerName ?? "No owner"}
                      >
                        {card.ownerInitials}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate text-ink-3" title={card.stageDetail ?? undefined}>
                        {funnelStageLabel(card.stageDetail)}
                      </span>
                      <span className={cx("shrink-0 tnum font-medium", t.cls)} title="Days since last touch">
                        {t.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
