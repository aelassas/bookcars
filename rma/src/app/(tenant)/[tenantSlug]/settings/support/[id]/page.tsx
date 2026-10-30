import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { getTenantTicket } from "@/modules/support/queries";
import { replyTicket } from "../actions";
import { Card, Badge, Button, Textarea, cx } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

// The other half of the support loop. Until this route existed the tenant
// could open a ticket but never read the answer: replyTicket() was fully
// built and guarded with zero call sites, and the rows on the support page
// weren't links. Support was write-only — an admin could type a careful
// reply the customer would never see.

export const dynamic = "force-dynamic";

function prioTone(p: string): BadgeTone {
  return p === "urgent" ? "danger" : p === "high" ? "warning" : "neutral";
}

export default async function TenantTicketDetail({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  let t;
  try {
    t = await requireTenantAdmin(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}`);
  }

  const data = await getTenantTicket(t.id, id);
  if (!data) notFound();

  const { ticket } = data;
  const closed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <main className="p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <Link
            href={`/${tenantSlug}/settings/support`}
            className="text-xs font-medium text-ink-3 hover:text-ink-2"
          >
            ← all tickets
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{ticket.subject}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <Badge tone={prioTone(ticket.priority)}>{ticket.priority}</Badge>
            <Badge tone={ticket.status === "open" ? "info" : "neutral"}>{ticket.status}</Badge>
            <span className="text-ink-3">
              opened by {data.openedByEmail ?? "—"} ·{" "}
              {ticket.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </span>
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
                {r.authorKind === "platform_admin" ? "Support" : "You"} · {r.authorEmail ?? "—"} ·{" "}
                {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </div>
              <div className="whitespace-pre-wrap text-ink">{r.body}</div>
            </div>
          ))}
          {data.replies.length === 0 && (
            <p className="text-sm text-ink-3">
              No replies yet — our support team will answer here.
            </p>
          )}
        </div>

        <form action={replyTicket.bind(null, tenantSlug)} className="space-y-2">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <Textarea
            name="body"
            required
            rows={3}
            placeholder={closed ? "Add a note to this closed ticket…" : "Reply to support…"}
            className="w-full"
          />
          <Button type="submit">Send reply</Button>
          {closed && (
            <p className="text-xs text-ink-3">
              This ticket is {ticket.status}. Replying leaves a note — open a new ticket if the
              problem came back.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
