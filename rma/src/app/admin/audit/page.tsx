import Link from "next/link";
import { ScrollText } from "lucide-react";
import { searchAudit } from "@/modules/admin/queries";
import { PageHeader, Card, CardHeader, Table, TH, TD, Input, Label, Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const rows = await searchAudit({ tenantId: sp.tenantId, action: sp.action, limit: 200 });

  return (
    <div>
      <PageHeader
        title="Cross-tenant audit log"
        subtitle="Every privileged action across all tenants, newest first."
        icon={<ScrollText className="h-4.5 w-4.5" />}
      />

      <form className="mb-4 flex flex-wrap items-end gap-3" action="/admin/audit" method="get">
        <div>
          <Label htmlFor="audit-action">Action</Label>
          <Input
            id="audit-action"
            name="action"
            defaultValue={sp.action ?? ""}
            placeholder="e.g. engine_block"
          />
        </div>
        {sp.tenantId && <input type="hidden" name="tenantId" value={sp.tenantId} />}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(sp.action || sp.tenantId) && (
          <Link
            href="/admin/audit"
            className="pb-2 text-xs font-medium text-ink-3 hover:text-ink-2"
          >
            clear
          </Link>
        )}
      </form>

      <Card className="overflow-hidden">
        <CardHeader title="Audit events" count={rows.length} />
        <Table>
          <thead>
            <tr>
              <TH>When</TH>
              <TH>Tenant</TH>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Actor</TH>
              <TH>Intent</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="transition-colors hover:bg-sunken/60">
                <TD className="text-ink-3 tnum">
                  {r.at.toISOString().slice(0, 19).replace("T", " ")}
                </TD>
                <TD className="font-medium text-ink">{r.tenantName}</TD>
                <TD className="text-brand-700">{r.action}</TD>
                <TD className="text-ink-3">{r.entityType}</TD>
                <TD className="text-ink-3">{r.actorEmail ?? "—"}</TD>
                <TD className="text-ink-3">{r.intent ?? "—"}</TD>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <TD className="text-ink-3" colSpan={6}>
                  No audit events match.
                </TD>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
