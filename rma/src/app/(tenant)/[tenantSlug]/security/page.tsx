import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getUserScope } from "@/platform/auth/scope";
import { getSecurityQueue } from "@/modules/security/queries";
import { completeTask } from "@/modules/tasks/actions";
import { PageHeader, Card, CardHeader, Badge, Table, TH, TD, EmptyState, Button } from "@/components/ui";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

export const metadata = { title: "Security queue" };

export default async function SecurityPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();
  const scope = await getUserScope(t.id);
  if (!scope.crossBranch) redirect(`/${tenantSlug}`);

  const rows = await getSecurityQueue(t.id);

  return (
    <main className="p-6">
      <PageHeader
        title="Security queue"
        subtitle="Cross-branch escalations and unconfirmed-payment follow-ups across all companies. No remote engine block — contact & control only."
        icon={<ShieldAlert className="h-4.5 w-4.5" />}
      />

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Escalations"
            count={rows.length}
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
          />
          <Table>
            <thead>
              <tr>
                <TH>Branch</TH>
                <TH>Company</TH>
                <TH>Task</TH>
                <TH>Owner role</TH>
                <TH>Due</TH>
                <TH>Action</TH>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.task.id} className="transition-colors hover:bg-sunken/60">
                  <TD>
                    <Badge tone={r.businessLine === "leasing" ? "success" : "brand"}>
                      {r.businessLine ?? "—"}
                    </Badge>
                  </TD>
                  <TD>{r.companyName ?? "—"}</TD>
                  <TD className="font-medium text-ink">{r.task.title}</TD>
                  <TD className="text-ink-3">{r.task.board ?? "—"}</TD>
                  <TD className="text-ink-3 tnum">
                    {r.task.dueDate ? new Date(r.task.dueDate).toLocaleDateString() : "—"}
                  </TD>
                  <TD>
                    <form action={completeTask.bind(null, tenantSlug, r.task.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        Complete
                      </Button>
                    </form>
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Nothing in the queue"
          description="No cross-branch escalations or unconfirmed-payment follow-ups right now."
        />
      )}
    </main>
  );
}
