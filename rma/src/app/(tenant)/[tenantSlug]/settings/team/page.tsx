import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { tenantMember, user, company } from "@/platform/db/schema";
import { inviteMember, updateMemberRoles, updateMemberCompanies, removeMember } from "./actions";
import { ASSIGNABLE_ROLES } from "./roles";
import ResetPasswordButton from "./ResetPasswordButton";
import { PageHeader, Card, CardHeader, Table, TH, TD, Button, Input, Label } from "@/components/ui";

export const dynamic = "force-dynamic";

async function listMembers(tenantId: string) {
  return withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select({
        id: tenantMember.id,
        userId: tenantMember.userId,
        email: user.email,
        name: user.name,
        roles: tenantMember.roles,
        companyIds: tenantMember.companyIds,
        crossBranch: tenantMember.crossBranch,
        createdAt: tenantMember.createdAt,
      })
      .from(tenantMember)
      .innerJoin(user, eq(tenantMember.userId, user.id))
  );
}

async function listCompanies(tenantId: string) {
  return withDrizzleTenant(tenantId, async (tx) =>
    tx.select({ id: company.id, name: company.name }).from(company).orderBy(company.name)
  );
}

export default async function TeamPage({
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
  const members = await listMembers(t.id);
  const companies = await listCompanies(t.id);

  return (
    <main className="p-6">
      <div className="max-w-4xl">
        <PageHeader
          title="Team"
          subtitle="Invite teammates and manage their roles. Roles control which modules each person can access."
          icon={<Users className="h-4.5 w-4.5" />}
        />

        <Card className="overflow-hidden">
          <CardHeader title="Members" count={members.length} />
          <Table>
            <thead>
              <tr>
                <TH>Member</TH>
                <TH>Company</TH>
                <TH>Roles</TH>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="align-top transition-colors hover:bg-sunken/40">
                  <TD>
                    <div className="font-medium text-ink">{m.name ?? "—"}</div>
                    <div className="text-ink-3">{m.email}</div>
                  </TD>
                  <TD>
                    {/* Companies decide what this person SEES (companyScope);
                        roles decide what they may do. Empty = the whole holding,
                        which is stated in the hint so it is a choice, not a trap. */}
                    <form action={updateMemberCompanies.bind(null, tenantSlug)} className="space-y-1">
                      <input type="hidden" name="memberId" value={m.id} />
                      {companies.map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 text-xs text-ink-2">
                          <input
                            type="checkbox"
                            name="companyIds"
                            value={c.id}
                            defaultChecked={m.companyIds?.includes(c.id)}
                            className="accent-brand-600"
                          />
                          {c.name}
                        </label>
                      ))}
                      <label className="flex items-center gap-1.5 pt-1 text-xs text-ink-3">
                        <input
                          type="checkbox"
                          name="crossBranch"
                          defaultChecked={m.crossBranch ?? false}
                          className="accent-brand-600"
                        />
                        sees all companies
                      </label>
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                      {!m.crossBranch && !m.companyIds?.length && (
                        <p className="pt-1 text-[11px] leading-tight text-warn">
                          no company — sees everyone's data
                        </p>
                      )}
                    </form>
                  </TD>
                  <TD>
                    <form action={updateMemberRoles.bind(null, tenantSlug)} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="memberId" value={m.id} />
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {ASSIGNABLE_ROLES.map((r) => (
                          <label key={r} className="flex items-center gap-1 text-xs text-ink-2">
                            <input
                              type="checkbox"
                              name="roles"
                              value={r}
                              defaultChecked={m.roles?.includes(r)}
                              className="accent-brand-600"
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                      <Button type="submit" size="sm" variant="secondary">
                        Save
                      </Button>
                    </form>
                    <form action={removeMember.bind(null, tenantSlug)} className="mt-2 inline-block">
                      <input type="hidden" name="memberId" value={m.id} />
                      <button type="submit" className="text-xs font-medium text-danger hover:underline">
                        Remove from tenant
                      </button>
                    </form>
                    <ResetPasswordButton slug={tenantSlug} memberId={m.id} />
                  </TD>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <TD className="text-ink-3" colSpan={3}>
                    No members yet.
                  </TD>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <CardHeader title="Invite a teammate" />
          <form action={inviteMember.bind(null, tenantSlug)} className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="teammate@company.ae"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="invite-name">Name</Label>
                <Input id="invite-name" name="name" placeholder="Full name" className="w-full" />
              </div>
            </div>
            <div>
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {ASSIGNABLE_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-1 text-sm text-ink-2">
                    <input type="checkbox" name="roles" value={r} className="accent-brand-600" />
                    {r}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit">Send invite</Button>
            <p className="text-xs text-ink-3">
              Creates the account and grants tenant access. Magic-link email delivery is pending email
              setup.
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
