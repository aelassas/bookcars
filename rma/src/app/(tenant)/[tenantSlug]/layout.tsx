import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { db } from "@/platform/db/client";
import { tenant, user } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getActiveCompany, lineModules, getUserScope } from "@/platform/auth/scope";
import { endSupportSession } from "@/app/admin/support/actions";
import { serverSignOut } from "@/platform/auth/sign-out-action";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import SetPasswordBanner from "@/components/layout/SetPasswordBanner";
import { StaleActionReloader } from "@/components/system/StaleActionReloader";
import { ru } from "@/lib/i18n/ru";
import { getServerLang } from "@/platform/i18n/lang";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  const session = await auth();
  // Land on the tenant's BRANDED door (not the neutral /login) so the person
  // sees the workspace they were trying to reach. This layout wraps every
  // [tenantSlug] page, so its redirect fires before any page-level guard.
  if (!session?.user?.id) redirect(`/login/${tenantSlug}`);

  const activeTenant = await getTenantBySlug(tenantSlug);

  // Suspended workspaces are blocked (except a platform-admin support session).
  if (activeTenant && activeTenant.status === "suspended" && !activeTenant.impersonation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-2xl">⛔</div>
        <h1 className="text-lg font-semibold text-slate-900">{ru.suspended.title}</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{ru.suspended.body}</p>
        {/* Auth Wave 1 (P0-1) — was a bare <a href="/login"> that left the
            JWT intact (the user could just navigate back in, still signed
            in). serverSignOut() clears the session cookie server-side. */}
        <form action={serverSignOut} className="mt-5">
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {ru.suspended.signOut}
          </button>
        </form>
      </div>
    );
  }

  // Auth Wave 1 (P0-2/P0-3) — force a password change before any tenant
  // page renders. /account/password lives outside [tenantSlug] so this
  // can't loop. Skipped for support impersonation (the flag belongs to the
  // platform admin's own account, not the tenant being viewed).
  if (session.user.mustChangePassword && !activeTenant?.impersonation) {
    // The JWT flag can be stale: setOrChangePassword clears the DB flag but a
    // session that never ran update() keeps mustChangePassword=true in the
    // cookie and would loop forever. Confirm against the DB (one read, only
    // when the JWT says true) before forcing the redirect.
    const [fresh] = await db
      .select({ flag: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    if (fresh?.flag) {
      redirect(`/account/password?next=${encodeURIComponent(`/${tenantSlug}`)}`);
    }
  }

  const meta = activeTenant ? await getTenantMeta(activeTenant.id) : null;
  // Adaptive UI: brand + nav follow the user's company / business line.
  const activeCompany = activeTenant ? await getActiveCompany(activeTenant.id) : null;
  const scope = activeTenant ? await getUserScope(activeTenant.id) : null;
  const navBrand = activeCompany?.brandName ?? activeCompany?.name ?? meta?.brandName ?? activeTenant?.name;
  const navLogo = activeCompany?.logoUrl ?? meta?.logoUrl;
  // Nav follows what the role can actually open (no broken clicks):
  // admin → everything; everyone else → their business line. Security is
  // RENTAL-ONLY (cross-brand within rental) so it is line-filtered like ops —
  // its primary company is a rental brand, so leasing nav is hidden.
  const roles = activeTenant?.roles ?? [];
  const isAdmin = roles.includes("tenant_admin") || roles.includes("platform_admin");
  const navModules = isAdmin
    ? activeTenant?.modules
    : lineModules(activeTenant?.modules, activeCompany?.businessLine ?? null);
  const isPreview = meta?.migrationStatus === "preview";
  const impersonation = activeTenant?.impersonation ?? null;
  const minsRemaining = impersonation ? minutesRemaining(impersonation.expiresAt) : 0;

  // Auth Wave 1 (P0-2) — password-less nudge banner. Skipped during support
  // impersonation: session.user.id there is the platform admin, not the
  // tenant member, so their own password status isn't relevant here.
  const showSetPasswordBanner = !impersonation && !(await hasPassword(session.user.id));
  const lang = await getServerLang();

  return (
    <div className="flex min-h-dvh min-w-0 bg-canvas">
      <StaleActionReloader />
      <Sidebar
        tenantSlug={tenantSlug}
        brandName={navBrand}
        logoUrl={navLogo}
        modules={navModules}
        crossBranch={scope?.crossBranch}
        showSettings={isAdmin}
        accentColor={activeCompany?.accentColor}
        userEmail={session.user.email}
        roles={roles}
        lang={lang}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {showSetPasswordBanner && <SetPasswordBanner />}
        {impersonation && (
          <div className="flex items-center justify-between gap-3 border-b-2 border-orange-600 bg-orange-500 px-4 py-2 text-sm font-semibold text-white">
            <span>
              ⚠ Acting as {activeTenant?.name} for support · {impersonation.scope} · {minsRemaining} min
              remaining
            </span>
            <form action={endSupportSession}>
              <button className="rounded bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide hover:bg-white/30">
                Exit support session
              </button>
            </form>
          </div>
        )}
        {isPreview && (
          <div className="border-b border-warn-line bg-warn-soft px-4 py-2 text-sm text-warn">
            <strong>Preview Mode</strong> — Data is synced from Bitrix / Kaiten. Editing is disabled until cutover.
          </div>
        )}
        <Topbar tenantSlug={tenantSlug} lang={lang} />
        <main className="min-w-0 flex-1 px-3 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-8 lg:py-6">
          <div className="mx-auto w-full min-w-0 max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function minutesRemaining(expiresAt: Date): number {
  return Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000));
}

async function hasPassword(userId: string): Promise<boolean> {
  const [row] = await db.select({ password: user.password }).from(user).where(eq(user.id, userId)).limit(1);
  return !!row?.password;
}

async function getTenantMeta(tenantId: string) {
  const [row] = await db
    .select({
      migrationStatus: tenant.migrationStatus,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      modules: tenant.modules,
    })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  return row ?? null;
}
