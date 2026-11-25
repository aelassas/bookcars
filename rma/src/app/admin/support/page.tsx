import Link from "next/link";
import { Ticket } from "lucide-react";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { listAllTickets } from "@/modules/support/queries";
import { PageHeader, Card, CardHeader, Table, TH, TD, Badge, cx } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUSES = ["", "open", "in_progress", "resolved", "closed"];

function prioTone(p: string): BadgeTone {
  return p === "urgent" ? "danger" : p === "high" ? "warning" : "neutral";
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const tickets = await listAllTickets(sp.status || undefined);

  return (
    <div>
      <PageHeader
        title="Support tickets"
        subtitle="Tickets opened by tenant admins across the platform."
        icon={<Ticket className="h-4.5 w-4.5" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 font-medium text-ink-3">Status:</span>
        {STATUSES.map((s) => {
          const active = sp.status === s || (!sp.status && !s);
          return (
            <Link
              key={s || "all"}
              href={s ? `/admin/support?status=${s}` : "/admin/support"}
              className={cx(
                "rounded-full px-2.5 py-1 font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-2 hover:bg-sunken hover:text-ink"
              )}
            >
              {s || "all"}
            </Link>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Tickets" count={tickets.length} />
        <Table>
          <thead>
            <tr>
              <TH>Subject</TH>
              <TH>Tenant</TH>
              <TH>Priority</TH>
              <TH>Status</TH>
              <TH className="text-right">Opened</TH>
            </tr>
          </thead>
          <tbody>
            {tickets.map((tk) => (
              <tr key={tk.id} className="transition-colors hover:bg-sunken/60">
                <TD>
                  <Link
                    href={`/admin/support/${tk.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {tk.subject}
                  </Link>
                </TD>
                <TD className="text-ink">{tk.tenantName}</TD>
                <TD>
                  <Badge tone={prioTone(tk.priority)}>{tk.priority}</Badge>
                </TD>
                <TD className="text-ink-2">{tk.status}</TD>
                <TD className="text-right text-ink-3 tnum">
                  {tk.createdAt.toISOString().slice(0, 10)}
                </TD>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <TD className="text-ink-3" colSpan={5}>
                  No tickets.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
