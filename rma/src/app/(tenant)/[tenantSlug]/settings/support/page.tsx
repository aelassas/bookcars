import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { listTenantTickets, listActiveGrants, listPlatformAdmins } from "@/modules/support/queries";
import { openTicket, grantSupportAccess, revokeSupportAccess } from "./actions";
import { PageHeader, Card, CardHeader, Badge, Button, Input, Select, Textarea, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

function minutesLeft(d: Date) {
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 60000));
}

export default async function SupportPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  let t;
  try {
    t = await requireTenantAdmin(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}`);
  }
  const [tickets, grants, engineers] = await Promise.all([
    listTenantTickets(t.id),
    listActiveGrants(t.id),
    listPlatformAdmins(),
  ]);

  return (
    <main className="p-6">
      <div className="max-w-3xl space-y-6">
        <PageHeader
          title="Support"
          subtitle="Open a support request, or grant our team time-bounded access to help inside your account."
          icon={<LifeBuoy className="h-4.5 w-4.5" />}
        />

        {/* Open a ticket */}
        <Card className="overflow-hidden">
          <CardHeader title="Open a ticket" />
          <form action={openTicket.bind(null, tenantSlug)} className="space-y-3 p-4">
            <div className="grid grid-cols-3 gap-3">
              <Input name="subject" required placeholder="Subject" className="col-span-2" />
              <Select name="priority" defaultValue="normal">
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </Select>
            </div>
            <Textarea
              name="body"
              required
              rows={4}
              placeholder="Describe the issue…"
              className="w-full"
            />
            <Button type="submit">Submit ticket</Button>
          </form>
        </Card>

        {/* Your tickets */}
        <Card className="overflow-hidden">
          <CardHeader title="Your tickets" count={tickets.length} />
          <table className="w-full text-sm">
            <tbody>
              {tickets.map((tk) => (
                <tr key={tk.id} className="border-b border-line-soft last:border-0">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/${tenantSlug}/settings/support/${tk.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {tk.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        tk.priority === "urgent"
                          ? "danger"
                          : tk.priority === "high"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {tk.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{tk.status}</td>
                  <td className="px-4 py-2.5 text-right text-ink-3 tnum">
                    {tk.createdAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-ink-3">No tickets yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Grant support access */}
        <section className="rounded-card border border-warn-line bg-warn-soft p-6 shadow-card">
          <h2 className="mb-1 text-base font-semibold text-ink">Grant support access</h2>
          <p className="mb-4 text-sm text-ink-2">
            Lets our support team act inside your account for a limited time to resolve an issue. Every
            action is logged, a banner is shown the whole time, and you can revoke instantly.
          </p>
          <form action={grantSupportAccess.bind(null, tenantSlug)} className="space-y-3">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label htmlFor="grant-scope">Scope</Label>
                <Select id="grant-scope" name="scope" defaultValue="read">
                  <option value="read">read (view only)</option>
                  <option value="write">write (make changes)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="grant-hours">Expires in</Label>
                <Select id="grant-hours" name="hours" defaultValue="4">
                  <option value="1">1 hour</option>
                  <option value="4">4 hours</option>
                  <option value="24">24 hours</option>
                </Select>
              </div>
              {engineers.length > 1 && (
                <div>
                  <Label htmlFor="grant-to">Give access to</Label>
                  <Select id="grant-to" name="grantTo" defaultValue="all">
                    <option value="all">the whole support team</option>
                    {engineers.map((e) => (
                      <option key={e.userId} value={e.userId}>
                        {e.name ? `${e.name} — ${e.email}` : e.email}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <Input
              name="reason"
              required
              placeholder="Reason (required) — e.g. 'debugging WhatsApp sync'"
              className="w-full"
            />
            <Button type="submit">Grant access</Button>
          </form>

          {grants.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-ink-2">Active grants</h3>
              <div className="space-y-2">
                {grants.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-field border border-warn-line bg-surface px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-ink">{g.scope}</span> ·{" "}
                      <span className="text-ink-2">{g.reason}</span>
                      <span className="ml-2 text-xs text-ink-3">
                        to {g.grantedToEmail ?? "support"} · {minutesLeft(g.expiresAt)} min left
                      </span>
                    </div>
                    <form action={revokeSupportAccess.bind(null, tenantSlug)}>
                      <input type="hidden" name="grantId" value={g.id} />
                      <button type="submit" className="text-xs font-semibold text-danger hover:underline">
                        Revoke
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
