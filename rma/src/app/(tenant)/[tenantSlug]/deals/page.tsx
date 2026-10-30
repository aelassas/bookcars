import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getDealsPaginated, getDealPipelineSummary } from "@/modules/crm/queries";
import {
  PageHeader,
  ButtonLink,
  Card,
  CardHeader,
  Badge,
  Table,
  TH,
  TD,
  EmptyState,
  cx,
  STAGE_CLS,
  type BadgeTone,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { Handshake } from "lucide-react";
import DealsFilters from "./DealsFilters";
import { recordHref } from "@/lib/return-navigation";

const PAGE_SIZE = 50;

const TYPE_TONE: Record<string, BadgeTone> = {
  rent: "info",
  lease: "brand",
  purchase: "success",
};

const STATUS_TONE: Record<string, BadgeTone> = {
  open: "info",
  won: "success",
  lost: "danger",
};

const STAGES = ["inquiry", "quote", "contract", "handover", "closed"] as const;

export default async function DealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ status?: string; stage?: string; myDeals?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const { status, stage, myDeals, page: pageParam } = await searchParams;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  if (!t.modules.includes("crm")) redirect(`/${tenantSlug}`);

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const ownerId = myDeals === "1" ? session.user.id : undefined;

  const [{ rows: deals, total }, summary] = await Promise.all([
    getDealsPaginated(t.id, { page, pageSize: PAGE_SIZE, status, stage, ownerId }),
    getDealPipelineSummary(t.id),
  ]);

  const summaryByStage = new Map(summary.map((s) => [s.stage, s]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  const filterDesc = [myDeals === "1" ? "my deals" : null, status, stage]
    .filter(Boolean)
    .join(", ");

  function pageHref(nextPage: number) {
    const p = new URLSearchParams();
    p.set("page", String(nextPage));
    if (status) p.set("status", status);
    if (stage) p.set("stage", stage);
    if (myDeals) p.set("myDeals", myDeals);
    return `/${tenantSlug}/deals?${p.toString()}`;
  }

  return (
    <main className="p-6">
      <PageHeader
        title="Deals"
        subtitle={`${total.toLocaleString()} deal${total === 1 ? "" : "s"}${filterDesc ? ` — ${filterDesc}` : ""}`}
        icon={<Handshake className="h-4.5 w-4.5" />}
        action={<DealsFilters status={status} stage={stage} myDeals={myDeals} />}
      />

      {/* Pipeline summary strip (open deals per stage) */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STAGES.map((s) => {
          const row = summaryByStage.get(s);
          return (
            <div
              key={s}
              className="flex items-center gap-2 rounded-field border border-line bg-surface px-3 py-1.5 text-xs shadow-card"
            >
              <span className={cx("h-2 w-2 rounded-full", STAGE_CLS[s])} />
              <span className="font-medium capitalize text-ink">{s}</span>
              <span className="text-ink-3 tnum">({row?.count ?? 0})</span>
              <span className="font-medium text-ink-2 tnum">
                {formatCurrency(row?.totalValue ?? 0)}
              </span>
            </div>
          );
        })}
      </div>

      {deals.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-5 w-5" />}
          title="No deals found"
          description={
            filterDesc
              ? "No deals match the current filters."
              : "Deals will appear here once they are created or synced."
          }
          action={filterDesc ? <ButtonLink href={`/${tenantSlug}/deals`}>Clear filters</ButtonLink> : <ButtonLink href={`/${tenantSlug}/crm?tab=deals`}>Create a deal</ButtonLink>}
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Deal pipeline" count={total} />
          <Table>
            <thead>
              <tr>
                <TH>Ref</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH>Stage</TH>
                <TH className="text-right">Value</TH>
                <TH className="text-right">Balance due</TH>
                <TH>Updated</TH>
                <TH></TH>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="transition-colors hover:bg-sunken/50">
                  <TD className="font-medium text-ink">
                    <Link
                      href={recordHref(`/${tenantSlug}/deals/${d.id}`, pageHref(page))}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {d.ref}
                    </Link>
                  </TD>
                  <TD>
                    <Badge tone={TYPE_TONE[d.type] ?? "neutral"}>{d.type}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{d.status}</Badge>
                  </TD>
                  <TD>
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <span className={cx("h-2 w-2 rounded-full", STAGE_CLS[d.stage] ?? "bg-line")} />
                      {d.stage}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap text-right font-medium tnum">
                    {d.value != null ? formatCurrency(d.value) : "—"}
                  </TD>
                  <TD
                    className={cx(
                      "whitespace-nowrap text-right font-medium tnum",
                      d.balanceDue > 0 ? "text-danger" : "text-success"
                    )}
                  >
                    {formatCurrency(d.balanceDue)}
                  </TD>
                  <TD className="whitespace-nowrap tnum">
                    {new Date(d.updatedAt).toLocaleDateString()}
                  </TD>
                  <TD>
                    <Link
                      href={recordHref(`/${tenantSlug}/deals/${d.id}`, pageHref(page))}
                      className="whitespace-nowrap rounded-field border border-line px-2 py-1 text-xs text-ink-2 transition-colors hover:border-brand-400 hover:text-brand-700"
                    >
                      + Booking
                    </Link>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-sm text-ink-2">
            <span className="tnum">
              {start}–{end} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              {page <= 1 ? (
                <span className="rounded-field px-2 py-1 text-xs text-ink-3 opacity-40">‹ Prev</span>
              ) : (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-field px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                >
                  ‹ Prev
                </Link>
              )}
              <span className="px-2 tnum">
                {page} / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="rounded-field px-2 py-1 text-xs text-ink-3 opacity-40">Next ›</span>
              ) : (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-field px-2 py-1 text-xs text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                >
                  Next ›
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}
