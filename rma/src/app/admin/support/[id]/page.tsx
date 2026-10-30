import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { findTicketAnyTenant } from "@/modules/support/queries";
import { replyTicketAdmin, setTicketStatus } from "../actions";
import { Card, Badge, Button, Select, Textarea, cx } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;
  const data = await findTicketAnyTenant(id);
  if (!data) notFound();

  const { ticket, tenantId, tenantName } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/support" className="text-xs font-medium text-ink-3 hover:text-ink-2">
          ← all tickets
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{ticket.subject}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span>{tenantName}</span>
          <Badge
            tone={
              ticket.priority === "urgent"
                ? "danger"
                : ticket.priority === "high"
                  ? "warning"
                  : "neutral"
            }
          >
            {ticket.priority}
          </Badge>
          <Badge tone={ticket.status === "open" ? "info" : "neutral"}>{ticket.status}</Badge>
          <span className="text-ink-3">opened by {data.openedByEmail ?? "—"}</span>
        </div>
      </div>

      <Card className="whitespace-pre-wrap p-4 text-sm text-ink">{ticket.body}</Card>

      <div className="space-y-3">
        {data.replies.map((r) => (
          <div
            key={r.id}
            className={cx(
              "rounded-card border p-3 text-sm shadow-card",
              r.authorKind === "platform_admin"
                ? "border-brand-200 bg-brand-50"
                : "border-line bg-surface"
            )}
          >
            <div className="mb-1 text-xs text-ink-3">
              {r.authorKind === "platform_admin" ? "Support" : "Tenant"} · {r.authorEmail ?? "—"} ·{" "}
              {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </div>
            <div className="whitespace-pre-wrap text-ink">{r.body}</div>
          </div>
        ))}
        {data.replies.length === 0 && <p className="text-sm text-ink-3">No replies yet.</p>}
      </div>

      <form action={replyTicketAdmin.bind(null, ticket.id, tenantId)} className="space-y-2">
        <Textarea name="body" required rows={3} placeholder="Reply as support…" className="w-full" />
        <Button type="submit">Reply</Button>
      </form>

      <form
        action={setTicketStatus.bind(null, ticket.id, tenantId)}
        className="flex items-center gap-2"
      >
        <Select name="status" defaultValue={ticket.status}>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </Select>
        <Button type="submit" variant="secondary">
          Update status
        </Button>
      </form>
    </div>
  );
}
