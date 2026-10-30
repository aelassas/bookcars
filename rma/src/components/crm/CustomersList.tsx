"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Table,
  TH,
  TD,
  EmptyState,
  cx,
  type BadgeTone,
} from "@/components/ui";
import { CreateCustomerModal } from "@/components/modals/CreateCustomerModal";
import { recordHref } from "@/lib/return-navigation";
import { DocumentPanel } from "@/components/documents/DocumentPanel";
import { ChevronLeft, ChevronRight, Paperclip, Pencil, Plus, Users } from "lucide-react";
import type { customer as CustomerTable } from "@/platform/db/schema";

type Customer = typeof CustomerTable.$inferSelect;

const SOURCE_TONE: Record<string, BadgeTone> = {
  whatsapp: "success",
  instagram: "brand",
  facebook: "info",
  localrent: "warning",
  yango: "info",
  walk_in: "neutral",
};

const ICON_BTN = "rounded-field p-1.5 transition-colors disabled:opacity-50";

export default function CustomersList({
  customers,
  total,
  page,
  pageSize,
  tenantId,
  tenantSlug,
}: {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  tenantId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [notice, setNotice] = useState("");
  const [docCustomer, setDocCustomer] = useState<Customer | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const activeSearch = searchParams.get("search") ?? "";
  const [previousSearch, setPreviousSearch] = useState(activeSearch);
  if (previousSearch !== activeSearch) {
    setPreviousSearch(activeSearch);
    setSearchInput(activeSearch);
  }
  const returnTo = `${pathname}?${searchParams.toString()}`;

  function navigate(nextPage: number, search?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    if (search !== undefined) {
      if (search) params.set("search", search);
      else params.delete("search");
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(1, searchInput.trim());
  }

  return (
    <div aria-busy={isPending}>
      <PageHeader
        title="Customers"
        subtitle={`${total.toLocaleString()} customer${total === 1 ? "" : "s"} in your database`}
        icon={<Users className="h-4.5 w-4.5" />}
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add customer
          </Button>
        }
      />

      {(showModal || editCustomer) && (
        <CreateCustomerModal
          tenantId={tenantId}
          customer={editCustomer ?? undefined}
          onClose={() => { setShowModal(false); setEditCustomer(null); }}
          onCreated={() => { setNotice(editCustomer ? "Customer updated" : "Customer added"); router.refresh(); }}
        />
      )}

      {notice && <p role="status" className="mb-4 text-sm text-success">{notice}</p>}

      {docCustomer && (
        <div className="mb-6">
          <DocumentPanel
            tenantId={tenantId}
            entityType="customer"
            entityId={docCustomer.id}
            entityLabel={docCustomer.name}
            onClose={() => setDocCustomer(null)}
          />
        </div>
      )}

      {/* Search bar (server-side; searches name + phone) */}
      <form onSubmit={onSearch} className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search name, phone or email…"
          aria-label="Search customers by name, phone or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full min-w-0 sm:w-80"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
          {isPending ? "Searching…" : "Search"}
        </Button>
        {activeSearch && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              navigate(1, "");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No customers found"
          description={
            activeSearch
              ? "No customers match that search. Try a different name, phone number or email."
              : "Add your first customer to get started."
          }
          action={
            !activeSearch ? (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Add customer
              </Button>
            ) : <Button variant="secondary" onClick={() => { setSearchInput(""); navigate(1, ""); }}>Clear search</Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Customer directory" count={total} />
          <Table>
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Phone</TH>
                <TH>Email</TH>
                <TH>Division</TH>
                <TH>Source</TH>
                <TH>Notes</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-sunken/50">
                  <TD className="min-w-40 font-medium text-ink">
                    <Link
                      href={recordHref(`/${tenantSlug}/customers/${c.id}`, returnTo)}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap tnum">{c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:text-brand-700 hover:underline">{c.phone}</a> : "—"}</TD>
                  <TD>{c.email ? <a href={`mailto:${c.email}`} className="hover:text-brand-700 hover:underline">{c.email}</a> : "—"}</TD>
                  <TD>
                    <Badge tone={c.division === "rent" ? "info" : "brand"}>{c.division}</Badge>
                  </TD>
                  <TD>
                    {c.source ? (
                      <Badge tone={SOURCE_TONE[c.source] ?? "neutral"}>{c.source}</Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD className="max-w-xs truncate" title={c.notes ?? undefined}>{c.notes || "—"}</TD>
                  <TD>
                    <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setEditCustomer(c)} className={cx(ICON_BTN, "text-ink-3 hover:bg-sunken hover:text-ink")} aria-label={`Edit ${c.name}`} title="Edit customer">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDocCustomer(c)}
                      className={cx(
                        ICON_BTN,
                        docCustomer?.id === c.id
                          ? "bg-brand-50 text-brand-700"
                          : "text-ink-3 hover:bg-sunken hover:text-ink-2"
                      )}
                      aria-label="Documents"
                      title="Documents"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>

          {/* Pagination controls */}
          <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-sm text-ink-2">
            <span className="tnum">
              {start}–{end} of {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(page - 1)}
                disabled={page <= 1 || isPending}
                className="rounded-field p-1.5 transition-colors hover:bg-sunken disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 tnum">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => navigate(page + 1)}
                disabled={page >= totalPages || isPending}
                className="rounded-field p-1.5 transition-colors hover:bg-sunken disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
