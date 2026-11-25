import { UserPlus } from "lucide-react";
import { desc, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, onboardingApplication } from "@/platform/db/schema";
import type { InferSelectModel } from "drizzle-orm";

type OnboardingApplication = InferSelectModel<typeof onboardingApplication>;
import {
  approveApplication,
  rejectApplication,
  approveAndProvision,
} from "@/modules/admin/actions";
import { ASSIGNABLE_ROLES } from "@/app/(tenant)/[tenantSlug]/settings/team/roles";
import {
  PageHeader,
  Card,
  CardHeader,
  Table,
  TH,
  TD,
  Select,
  Button,
  Badge,
  EmptyState,
} from "@/components/ui";

// Onboarding review queue. Rows are written by the Telegram bot's /start
// interview (otp-bot/bot.js#finishInterview) when it can't match the person's
// phone to an existing user. The /tma mini app used to be a second writer; it
// was deleted 2026-08-10 (MyCRM is the engine, Twenty is the workplace — a
// Telegram-wrapped MyCRM was selling the wrong product), and the bot flow
// covers the same ground. See onboarding-schema.ts; until that migration lands
// this page degrades to an informational state instead of 500ing the console.
// Gated by the /admin layout (requirePlatformAdmin).

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const;

export default async function OnboardingPage() {
  const tenants = await db
    .select({ id: tenant.id, slug: tenant.slug, name: tenant.name })
    .from(tenant)
    .orderBy(tenant.name);

  let apps: OnboardingApplication[] = [];
  let tableReady = true;
  try {
    apps = await db
      .select()
      .from(onboardingApplication)
      // Pending first, then most recently decided.
      .orderBy(sql`(${onboardingApplication.status} = 'pending') desc`, desc(onboardingApplication.createdAt));
  } catch (e) {
    const err = (typeof e === "object" && e !== null ? e : {}) as { code?: unknown; message?: unknown };
    const msg = typeof err.message === "string" ? err.message : "";
    if (err.code === "42P01" || /relation .*onboarding_application.* does not exist/i.test(msg)) {
      tableReady = false;
    } else {
      throw e;
    }
  }

  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Onboarding"
        subtitle="Applications from the Telegram mini app. Attach an applicant to a tenant, provision a new tenant for them, or reject."
        icon={<UserPlus className="h-4.5 w-4.5" />}
      />

      {!tableReady ? (
        <Card className="overflow-hidden">
          <CardHeader title="Applications" />
          <EmptyState
            title="Onboarding table not available yet"
            description="The onboarding_application table hasn't been migrated on this database yet. Applications will appear here once it lands."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Applications" count={pendingCount} />
          {apps.length === 0 ? (
            <EmptyState
              title="No applications"
              description="Nothing has come in from the mini app yet."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <TH>Applicant</TH>
                  <TH>Phone</TH>
                  <TH>Company</TH>
                  <TH>Telegram</TH>
                  <TH>Submitted</TH>
                  <TH>Status</TH>
                  <TH>Decide</TH>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => {
                  const decided = a.status !== "pending";
                  return (
                    <tr key={a.id} className="align-top transition-colors hover:bg-sunken/40">
                      <TD>
                        <div className="font-medium text-ink">{a.fullName || "—"}</div>
                        {a.note && <div className="max-w-[260px] text-xs text-ink-3">{a.note}</div>}
                      </TD>
                      <TD className="text-ink-2">{a.phone ?? "—"}</TD>
                      <TD className="text-ink-2">{a.companyName ?? "—"}</TD>
                      <TD className="text-ink-3">
                        {a.telegramUsername ? `@${a.telegramUsername}` : "no username"}
                      </TD>
                      <TD className="text-ink-3 tnum">{a.createdAt.toLocaleString()}</TD>
                      <TD>
                        <Badge tone={STATUS_TONE[a.status as keyof typeof STATUS_TONE] ?? "neutral"}>{a.status}</Badge>
                        {decided && a.decidedAt && (
                          <div className="mt-1 text-[11px] text-ink-3 tnum">
                            {a.decidedAt.toLocaleString()}
                          </div>
                        )}
                      </TD>
                      <TD>
                        {decided ? (
                          <span className="text-xs text-ink-3">—</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <form
                              action={approveApplication.bind(null, a.id)}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <Select
                                name="tenantSlug"
                                required
                                defaultValue=""
                                className="min-w-[180px]"
                              >
                                <option value="" disabled>
                                  Attach to tenant…
                                </option>
                                {tenants.map((t) => (
                                  <option key={t.id} value={t.slug}>
                                    {t.name} ({t.slug})
                                  </option>
                                ))}
                              </Select>
                              <Select name="role" required defaultValue="sales" className="min-w-[130px]">
                                {ASSIGNABLE_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </Select>
                              <Button type="submit" size="sm">
                                Approve
                              </Button>
                            </form>
                            <div className="flex items-center gap-2">
                              <form action={approveAndProvision.bind(null, a.id)}>
                                <Button type="submit" size="sm" variant="secondary">
                                  Approve + new tenant
                                </Button>
                              </form>
                              <form action={rejectApplication.bind(null, a.id)}>
                                <Button type="submit" size="sm" variant="danger">
                                  Reject
                                </Button>
                              </form>
                            </div>
                          </div>
                        )}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
