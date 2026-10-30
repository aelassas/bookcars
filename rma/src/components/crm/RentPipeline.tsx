import Link from "next/link";
import type { RentBoard } from "@/modules/crm/rent-funnels";
import { PageHeader, cx } from "@/components/ui";
import { GitFork } from "lucide-react";

// Babek's merged rent board: each brand's own Bitrix funnel, stacked, with a
// person filter that scopes every funnel at once. Server component — the filter
// is a set of links (?assignee=) so there's no client state to hydrate.
export function RentPipeline({
  board,
  tenantSlug,
  activeAssignee,
}: {
  board: RentBoard;
  tenantSlug: string;
  activeAssignee: string | null;
}) {
  const base = `/${tenantSlug}/rent`;
  const chip = (label: string, value: string | null) => {
    const active = (value ?? null) === (activeAssignee ?? null);
    const href = value ? `${base}?assignee=${encodeURIComponent(value)}` : base;
    return (
      <Link
        key={label}
        href={href}
        className={cx(
          "rounded-field px-3 py-1 text-sm font-medium transition-colors",
          active ? "bg-brand-600 text-white" : "text-ink-2 hover:bg-sunken",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <main className="min-h-screen p-6">
      <PageHeader
        title="Rent — funnels"
        subtitle="Cardiwan + EasyRent, each with its own Bitrix funnel"
        icon={<GitFork className="h-4.5 w-4.5" />}
      />

      {/* Person filter — scopes every funnel at once. */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-field border border-line bg-surface p-0.5">
        {chip("All", null)}
        {board.people.map((p) => chip(p, p))}
      </div>

      <div className="space-y-6">
        {board.funnels.map((f) => (
          <section key={f.slug}>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-ink">{f.brandName}</h2>
              <span className="text-xs text-ink-3">{f.total.toLocaleString()} leads (2026)</span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {f.columns.map((col) => (
                <div key={col.stage} className="w-52 shrink-0">
                  <div className="mb-1.5 flex items-center justify-between rounded-field bg-sunken px-2 py-1">
                    <span className="truncate text-xs font-semibold uppercase tracking-wide text-ink-2">
                      {col.stage}
                    </span>
                    <span className="ml-2 shrink-0 text-xs font-semibold text-ink-3 tnum">{col.count}</span>
                  </div>

                  <div className="space-y-2">
                    {col.cards.length === 0 && (
                      <p className="px-1 py-2 text-xs text-ink-3">—</p>
                    )}
                    {col.cards.map((c) => (
                      <Link
                        key={c.id}
                        href={`/${f.slug}/crm/leads/${c.id}`}
                        className="block rounded-card border border-line bg-surface px-2 py-1.5 transition-colors hover:border-brand-600/40 hover:bg-sunken/40"
                      >
                        <div className="truncate text-[13px] font-medium text-ink">{c.name}</div>
                        {c.car && <div className="mt-0.5 truncate text-xs text-brand-700">🚗 {c.car}</div>}
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-3">
                          <span className="truncate tnum">{c.phone ?? "—"}</span>
                          {c.assignee && <span className="shrink-0 font-medium text-ink-2">{c.assignee}</span>}
                        </div>
                      </Link>
                    ))}
                    {col.count > col.cards.length && (
                      <p className="px-1 text-[11px] text-ink-3">+{col.count - col.cards.length} more…</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {board.skipped.length > 0 && (
          <p className="text-xs text-ink-3">
            No access to: {board.skipped.join(", ")}
          </p>
        )}
      </div>
    </main>
  );
}
