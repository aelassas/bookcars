"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { recordHref } from "@/lib/return-navigation";
import { getDealsPaginated, getDealPipelineSummary } from "@/modules/crm/queries";
import { Card, Badge, Button, EmptyState, STAGE_CLS, cx, type BadgeTone } from "@/components/ui";
import { CreateDealModal } from "@/components/modals/CreateDealModal";
import { dealStageLabel, dealStageOptions } from "@/modules/crm/stages";
import { formatCurrency } from "@/lib/format";
import { Plus, Handshake, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

const TYPE_TONE: Record<string, BadgeTone> = {
  rent: "info",
  lease: "brand",
  purchase: "success",
};

type DealRow = Awaited<ReturnType<typeof getDealsPaginated>>["rows"][number];
type StageSummary = Awaited<ReturnType<typeof getDealPipelineSummary>>[number];

export function DealsList({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<StageSummary[]>([]);
  const page = Math.max(1, parseInt(searchParams.get("dealPage") ?? "1", 10) || 1);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const stages = dealStageOptions(tenantSlug);

  const load = useCallback(
    (p: number) => {
      startTransition(async () => {
        setError(null);
        try {
          const [result, s] = await Promise.all([
            getDealsPaginated(tenantId, { page: p, pageSize: PAGE_SIZE }),
            getDealPipelineSummary(tenantId),
          ]);
          setDeals(result.rows);
          setTotal(result.total);
          setSummary(s);
        } catch {
          setError("Could not load deals. Please try again.");
        } finally {
          setLoaded(true);
        }
      });
    },
    [tenantId]
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  function setPage(next: number) {
    const query = new URLSearchParams(searchParams.toString());
    query.set("dealPage", String(next));
    router.replace(`${pathname}?${query}`, { scroll: false });
  }

  return (
    <div className="space-y-4" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {summary.map((s) => (
            <div
              key={s.stage}
              className="rounded-field border border-line bg-surface px-3 py-1.5 text-xs shadow-card"
            >
              <span className="font-medium capitalize text-ink">{dealStageLabel(tenantSlug, s.stage)}</span>
              <span className="ml-1 text-ink-3 tnum">({s.count})</span>
            </div>
          ))}
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Create deal
        </Button>
      </div>

      {showModal && (
        <CreateDealModal
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          onClose={() => setShowModal(false)}
          onCreated={() => load(page)}
        />
      )}

      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-field border border-danger-line bg-danger-soft p-3 text-sm text-danger">{error}<Button variant="secondary" size="sm" onClick={() => load(page)} disabled={loading}>Try again</Button></div>}
      {!loaded && <p role="status" className="py-8 text-center text-sm text-ink-3">Loading deals…</p>}
      {deals.length === 0 && loaded && !loading && !error ? (
        <EmptyState
          icon={<Handshake className="h-5 w-5" />}
          title="No deals yet"
          description="Create your first deal to start tracking the pipeline."
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Create deal
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((d) => (
              <Card key={d.id} className="p-4 transition-shadow hover:shadow-lifted">
                <div className="flex items-center justify-between gap-2">
                  <Link href={recordHref(`/${tenantSlug}/deals/${d.id}`, `${pathname}?${searchParams}`)} className="text-sm font-semibold text-ink hover:text-brand-700 hover:underline">{d.ref}</Link>
                  <Badge tone={TYPE_TONE[d.type] ?? "neutral"}>{d.type}</Badge>
                </div>
                <div className="mt-2 text-sm font-medium text-ink">
                  {d.status === "open" ? "Open deal" : d.status}
                </div>
                <div className="text-xs capitalize text-ink-3">Stage: {dealStageLabel(tenantSlug, d.stage)}</div>
                {d.value && (
                  <div className="mt-1 text-xs font-medium text-success tnum">{formatCurrency(d.value)}</div>
                )}
                {Number(d.balanceDue) > 0 && (
                  <div className="mt-1 text-xs font-medium text-warn tnum">
                    Balance due: {formatCurrency(d.balanceDue)}
                  </div>
                )}
                <div className="mt-3">
                  <div className="flex gap-1">
                    {stages.map(({ key, label }) => (
                      <div
                        key={key}
                        className={cx(
                          "h-2 flex-1 rounded-full",
                          key === d.stage ? STAGE_CLS[key] : "bg-line"
                        )}
                        title={label}
                      />
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-ink-3">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                  disabled={page >= totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
