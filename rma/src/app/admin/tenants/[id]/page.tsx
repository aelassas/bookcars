import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantDetail } from "@/modules/admin/queries";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { activeGrantForAdmin } from "@/modules/support/queries";
import { startSupportSession } from "@/app/admin/support/actions";
import {
  setTenantStatus,
  updateTenantPlan,
  logServiceHours,
  adminInviteMember,
  adminRemoveMember,
} from "@/modules/admin/actions";
import { ASSIGNABLE_ROLES } from "@/app/(tenant)/[tenantSlug]/settings/team/roles";
import { ResetMemberPassword, RemoveMemberButton } from "./MemberActions";
import {
  Card,
  CardHeader,
  Badge,
  Button,
  ButtonLink,
  Input,
  Select,
  cx,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function minsLeft(d: Date) {
  return Math.max(0, Math.round((d.getTime() - Date.now()) / 60000));
}

const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

const isPast = (d: Date) => d.getTime() < Date.now();

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      <div className="p-4">{children}</div>
    </Card>
  );
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const adminId = await requirePlatformAdmin();
  const { id } = await params;
  const d = await getTenantDetail(id);
  if (!d) notFound();

  const t = d.tenant;
  const grant = await activeGrantForAdmin(t.id, adminId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/tenants" className="text-xs font-medium text-ink-3 hover:text-ink-2">
            ← all tenants
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{t.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span className="text-ink-3">{t.slug}</span>
            <Badge
              tone={
                t.status === "active"
                  ? "success"
                  : t.status === "trial"
                    ? "info"
                    : t.status === "suspended"
                      ? "warning"
                      : "neutral"
              }
            >
              {t.status}
            </Badge>
            <Badge tone="brand">{t.tier}</Badge>
          </div>
        </div>
        <ButtonLink href={`/admin/audit?tenantId=${t.id}`} variant="secondary">
          View audit
        </ButtonLink>
      </div>

      {/* Management — lifecycle, plan, service hours */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Status & lifecycle">
          <div className="mb-3 text-sm text-ink-2">
            Current: <span className="font-semibold text-ink">{t.status}</span>
            {t.suspendedReason && <span className="text-ink-3"> — {t.suspendedReason}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {t.status !== "suspended" && (
              <form action={setTenantStatus.bind(null, t.id)} className="flex items-center gap-2">
                <input type="hidden" name="status" value="suspended" />
                <Input name="reason" placeholder="reason" className="h-8 w-36" />
                <Button type="submit" size="sm" variant="secondary">
                  Suspend
                </Button>
              </form>
            )}
            {(t.status === "suspended" || t.status === "churned") && (
              <form action={setTenantStatus.bind(null, t.id)}>
                <input type="hidden" name="status" value="active" />
                <Button type="submit" size="sm">
                  Resume (activate)
                </Button>
              </form>
            )}
            {t.status !== "churned" && (
              <form action={setTenantStatus.bind(null, t.id)}>
                <input type="hidden" name="status" value="churned" />
                <Button type="submit" size="sm" variant="danger">
                  Churn
                </Button>
              </form>
            )}
          </div>
        </Panel>

        <Panel title="Plan & billing">
          <form action={updateTenantPlan.bind(null, t.id)} className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <label className="text-ink-2">Tier</label>
              <Select name="tier" defaultValue={t.tier} className="h-8">
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-ink-2">Custom price (AED/mo)</label>
              <Input
                name="customMonthlyPrice"
                type="number"
                min="0"
                defaultValue={t.customMonthlyPrice ?? ""}
                placeholder="tier default"
                className="h-8 w-32"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-ink-2">Paid until</label>
              <Input name="paidUntil" type="date" defaultValue={ymd(t.paidUntil)} className="h-8" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-ink-2">Service hours / month</label>
              <Input
                name="serviceHoursPerMonth"
                type="number"
                min="0"
                defaultValue={t.serviceHoursPerMonth}
                className="h-8 w-24"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button type="submit" size="sm">
                Save plan
              </Button>
              {t.paidUntil && isPast(t.paidUntil) && (
                <Badge tone="danger">OVERDUE — paid until {ymd(t.paidUntil)}</Badge>
              )}
            </div>
          </form>
        </Panel>
      </div>

      <Panel
        title={`Service hours — ${(d.serviceHours.usedMinutesThisMonth / 60).toFixed(1)}h used of ${d.serviceHours.perMonth}h this month`}
      >
        <div className="mb-3 text-sm text-ink-2">
          Remaining this month:{" "}
          <span
            className={cx(
              "font-semibold tnum",
              d.serviceHours.perMonth * 60 - d.serviceHours.usedMinutesThisMonth < 0
                ? "text-danger"
                : "text-success"
            )}
          >
            {((d.serviceHours.perMonth * 60 - d.serviceHours.usedMinutesThisMonth) / 60).toFixed(1)}h
          </span>
        </div>
        <form action={logServiceHours.bind(null, t.id)} className="mb-3 flex flex-wrap items-center gap-2">
          <Input name="hours" type="number" step="0.25" min="0" placeholder="hours" className="h-8 w-24" />
          <Input name="note" placeholder="what was done" className="h-8 min-w-[180px] flex-1" />
          <Button type="submit" size="sm" variant="secondary">
            Log time
          </Button>
        </form>
        <table className="w-full text-sm">
          <tbody>
            {d.serviceHours.entries.map((e, i) => (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="py-1 text-ink-3 tnum">{e.at.toISOString().slice(0, 10)}</td>
                <td className="py-1 text-ink tnum">{(e.minutes / 60).toFixed(2)}h</td>
                <td className="py-1 text-ink-3">{e.note ?? "—"}</td>
              </tr>
            ))}
            {d.serviceHours.entries.length === 0 && (
              <tr>
                <td className="py-1 text-ink-3">No service time logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>

      {/* SPEC §7 — support access grant status + enter session */}
      <Panel title="Support access">
        {grant ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-ink-2">
              Active grant · <Badge tone="success">{grant.scope}</Badge> · expires in{" "}
              {minsLeft(grant.expiresAt)} min · reason:{" "}
              <span className="text-ink-3">{grant.reason}</span>
            </div>
            <form action={startSupportSession}>
              <input type="hidden" name="tenantId" value={t.id} />
              <input type="hidden" name="tenantSlug" value={t.slug} />
              <Button type="submit">Enter support session →</Button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-ink-3">
            No active grant. Request access from the tenant admin — they grant it from their
            Settings → Support page. Platform admins cannot self-grant.
          </p>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {Object.entries(d.counts).map(([k, v]) => (
          <div
            key={k}
            className="rounded-card border border-line bg-surface p-3 text-center shadow-card"
          >
            <div className="text-xl font-semibold text-brand-700 tnum">{v}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{k}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel title="Billing">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-3">Tier</dt>
              <dd className="text-ink">{t.tier}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Billing email</dt>
              <dd className="text-ink">{t.billingEmail ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Trial ends</dt>
              <dd className="text-ink tnum">
                {t.trialEndsAt ? t.trialEndsAt.toISOString().slice(0, 10) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">Suspended</dt>
              <dd className="text-ink">
                {t.suspendedAt ? `${t.suspendedAt.toISOString().slice(0, 10)} — ${t.suspendedReason ?? ""}` : "—"}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel title="AI provider">
          {d.aiConfig ? (
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-3">Provider</dt>
                <dd className="text-ink">{d.aiConfig.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Endpoint</dt>
                <dd className="text-ink">{d.aiConfig.localEndpoint ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Model</dt>
                <dd className="text-ink">{d.aiConfig.localModel ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Last healthy</dt>
                <dd className="text-ink tnum">
                  {d.aiConfig.lastHealthyAt ? d.aiConfig.lastHealthyAt.toISOString().slice(0, 16).replace("T", " ") : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-ink-3">Default (Claude / heuristic) — no per-tenant config.</p>
          )}
        </Panel>
      </div>

      <Panel title={`Members (${d.members.length})`}>
        <table className="w-full text-sm">
          <tbody>
            {d.members.map((m) => (
              <tr key={m.userId} className="border-b border-line-soft last:border-0 align-top">
                <td className="py-2 text-ink">{m.name ?? "—"}</td>
                <td className="py-2 text-ink-3">{m.email}</td>
                <td className="py-2 text-ink-2">{m.roles.join(", ") || "—"}</td>
                <td className="py-2">
                  <div className="flex flex-col items-end gap-1.5">
                    <ResetMemberPassword tenantId={t.id} userId={m.userId} email={m.email} />
                    <RemoveMemberButton
                      action={adminRemoveMember.bind(null, t.id)}
                      userId={m.userId}
                      email={m.email}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {d.members.length === 0 && (
              <tr><td className="py-1.5 text-ink-3">No members.</td></tr>
            )}
          </tbody>
        </table>

        {/* Invite — the console twin of the tenant's own /settings/team form. */}
        <form
          action={adminInviteMember.bind(null, t.id)}
          className="mt-4 border-t border-line-soft pt-4"
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">
            Invite a member
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input name="email" type="email" required placeholder="person@tenant.ae" className="h-8 min-w-[200px] flex-1" />
            <Input name="name" placeholder="Name (optional)" className="h-8 w-40" />
            <Button type="submit" size="sm" variant="secondary">
              Invite
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
            {ASSIGNABLE_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1.5 text-xs text-ink-2">
                <input
                  type="checkbox"
                  name="roles"
                  value={r}
                  defaultChecked={r === "sales"}
                  className="h-3.5 w-3.5 accent-brand-600"
                />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            An existing user with this email is added to the tenant (their roles are replaced with
            the selection). An invite email is sent best-effort.
          </p>
        </form>
      </Panel>

      <Panel title="Integrations">
        <table className="w-full text-sm">
          <tbody>
            {d.integrations.map((ic, i) => (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="py-1.5 text-ink">{ic.provider}</td>
                <td className="py-1.5 text-ink-2">{ic.status}</td>
                <td className="py-1.5 text-right text-ink-3 tnum">
                  {ic.lastSyncAt ? ic.lastSyncAt.toISOString().slice(0, 16).replace("T", " ") : "never synced"}
                </td>
              </tr>
            ))}
            {d.integrations.length === 0 && (
              <tr><td className="py-1.5 text-ink-3">No integrations connected.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>

      <Panel title="Recent audit">
        <table className="w-full text-sm">
          <tbody>
            {d.recentAudit.map((a, i) => (
              <tr key={i} className="border-b border-line-soft last:border-0">
                <td className="py-1.5 text-ink-3 tnum">
                  {a.at.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="py-1.5 text-ink">{a.action}</td>
                <td className="py-1.5 text-ink-3">{a.entityType}</td>
                <td className="py-1.5 text-ink-3">{a.actorEmail ?? "—"}</td>
              </tr>
            ))}
            {d.recentAudit.length === 0 && (
              <tr><td className="py-1.5 text-ink-3">No audit events.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
