import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { searchDocs } from "@/modules/search/queries";
import { PageHeader, Card, CardHeader, Badge, Input, Button, EmptyState } from "@/components/ui";
import { Search, SearchX, AlertTriangle } from "lucide-react";

export const metadata = { title: "Search" };

const HREF: Record<string, (slug: string, id: string) => string> = {
  customer: (s, id) => `/${s}/customers/${id}`,
  rental: (s, id) => `/${s}/rentals/${id}`,
  lease: (s, id) => `/${s}/leases/${id}`,
  lead: (s) => `/${s}/crm`,
  deal: (s) => `/${s}/crm`,
  message: (s) => `/${s}/messages`,
};

const GROUP_LABEL: Record<string, string> = {
  customer: "Customers",
  rental: "Rentals",
  lease: "Leases",
  lead: "Leads",
  deal: "Deals",
  message: "Messages",
};

export default async function SearchPage({
  params, searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const { q = "" } = await searchParams;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();

  const { hits, degraded } = q.trim()
    ? await searchDocs(t.id, q)
    : { hits: [], degraded: false };

  // Presentation-only grouping: bucket hits by source type, preserving
  // within-group score order.
  const groups = new Map<string, typeof hits>();
  for (const h of hits) {
    const list = groups.get(h.source_type) ?? [];
    list.push(h);
    groups.set(h.source_type, list);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <PageHeader
        title="Search"
        subtitle="Semantic + keyword search across customers, contracts, leads, deals and messages — scoped to what you can see."
        icon={<Search className="h-4.5 w-4.5" />}
      />

      <form className="flex gap-2" action={`/${tenantSlug}/search`} method="get">
        <Input
          name="q" defaultValue={q} autoFocus
          placeholder="e.g. overdue Ferrari client, or a phone, plate, note…"
          className="h-10 flex-1"
        />
        <Button type="submit" className="h-10 px-5">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      {q.trim() && (
        <div className="mt-6 space-y-4">
          {degraded && (
            <div className="flex items-start gap-2.5 rounded-field border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Smart search unavailable — keyword matches only.</span>
            </div>
          )}
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">
            {hits.length} result{hits.length === 1 ? "" : "s"}
          </div>
          {Array.from(groups.entries()).map(([type, groupHits]) => (
            <Card key={type} className="overflow-hidden">
              <CardHeader title={GROUP_LABEL[type] ?? type} count={groupHits.length} />
              <ul className="divide-y divide-line-soft">
                {groupHits.map((h) => {
                  const href = (HREF[h.source_type] ?? (() => `/${tenantSlug}`))(tenantSlug, h.source_id);
                  return (
                    <li key={`${h.source_type}:${h.source_id}`}>
                      <Link
                        href={href}
                        className="block px-4 py-3 transition-colors hover:bg-sunken/60"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-ink">{h.title || "(untitled)"}</span>
                          <Badge tone="neutral">
                            <span className="capitalize">{h.source_type}</span>
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-2">{h.snippet}</p>
                        <div className="mt-1 text-[11px] text-ink-3 tnum">
                          match {(h.score * 100).toFixed(0)}%
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
          {hits.length === 0 && (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Nothing found"
              description="Try a different phrase — a name, phone number, plate or note."
            />
          )}
        </div>
      )}
    </main>
  );
}
