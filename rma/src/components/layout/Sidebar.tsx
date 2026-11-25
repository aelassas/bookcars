"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { hostAgnosticSignOut } from "@/lib/auth/host-agnostic-sign-out";
import { LayoutDashboard, Users, MessageSquare, Car, CalendarDays, CalendarRange, RotateCcw, ShieldAlert, Settings, Menu, X, Briefcase, ClipboardList, ClipboardCheck, ListChecks, UserCog, Bot, LifeBuoy, Palette, FileText, Search, Inbox, KeyRound, LogOut, Activity, Sun, GitFork, Siren, Phone, Globe, Receipt,  } from "lucide-react";
import { normalizeModules, type ModuleId } from "@/platform/tenant-modules";
import { ru } from "@/lib/i18n/ru";
import { t, type Lang } from "@/platform/i18n/dict";

type NavLink = {
  href: string;
  label: string;
  module: ModuleId;
  icon: React.ElementType;
  exact?: boolean;
  /** If set, the link renders only for these tenant slugs (on top of module). */
  slugs?: string[];
  /** Hidden for rent brands — sales-only clutter / dead-ends for the rent desk. */
  hideForRent?: boolean;
  /** Rent-operations screen — hidden for pure-sales users on the sales line
   *  (owner 2026-07-29: "sales must not see rent"; managers keep everything). */
  rentOps?: boolean;
  /** Line-management screen (wallboards/analytics) — hidden for pure-sales
   *  users; their workbench is My Day + CRM. Managers keep the full nav. */
  managerOnly?: boolean;
  /** Admins only (tenant_admin / platform_admin). */
  adminOnly?: boolean;
};

// Rent brands: their deal pipeline is dead and several sales screens are noise,
// so the sidebar is trimmed to what the rent desk actually uses.
const RENT_SLUGS = ["cardiwan", "easyrent", "etm", "rma"];

/**
 * Grouped navigation. Module filtering is unchanged — a link renders only if
 * its module is enabled for the user's line; a group disappears when empty.
 */
// `label` is an i18n KEY (see platform/i18n/dict.ts), resolved at render with
// t(lang, key) so the whole nav flips RU/EN per the viewer's cookie. Product
// terms that ARE the brand (CRM) resolve to the same string in both.
const GROUPS: { label: string | null; links: NavLink[] }[] = [
  {
    // One home per job: My Day for the person, Search for everything.
    label: null,
    links: [
      { href: "/my", label: "nav.myDay", module: "dashboard", icon: Sun, hideForRent: true },
      { href: "/search", label: "nav.search", module: "dashboard", icon: Search },
    ],
  },
  {
    // The work itself: ONE pipeline (funnel + leads + deals + watchers are
    // tabs inside it, not separate nav entries), people, chats.
    label: "nav.sales",
    links: [
      { href: "/rent", label: "nav.rentPipeline", module: "crm", icon: GitFork, slugs: RENT_SLUGS },
      // Rent brands already have their pipeline as "Rent" above — a second
      // "CRM" entry for the same funnel is duplication (owner's call 2026-07-29).
      // Label is "Pipeline" — the platform IS the CRM (owner's call 2026-07-29).
      { href: "/crm", label: "nav.crm", module: "crm", icon: Briefcase, hideForRent: true },
      { href: "/customers", label: "nav.customers", module: "customers", icon: Users },
      { href: "/messages", label: "nav.messages", module: "messages", icon: MessageSquare },
    ],
  },
  {
    label: "nav.operations", // "Stock"
    links: [
      { href: "/fleet", label: "nav.fleet", module: "fleet", icon: Car },
      // The fleet is ONE fleet. A car moves lease → rent → lease-to-own, so
      // which line is looking at it says nothing about who may see it (owner,
      // 2026-08-09). These three answer "where is this car and when is it
      // free" — no `rentOps`, they belong to both lines.
      { href: "/fleet/availability", label: "nav.calendar", module: "rentals", icon: CalendarRange },
      { href: "/rentals", label: "nav.rentals", module: "rentals", icon: CalendarDays },
      { href: "/onboarding", label: "nav.rentalOnboarding", module: "rentals", icon: ClipboardCheck },
      { href: "/leases", label: "nav.leasing", module: "leases", icon: FileText, hideForRent: true },
      { href: "/returns", label: "nav.returns", module: "returns", icon: RotateCcw },
      { href: "/operations", label: "nav.operationsBoard", module: "rentals", icon: Activity },
      { href: "/charges", label: "nav.charges", module: "rentals", icon: Receipt },
      { href: "/fines", label: "nav.fines", module: "fleet", icon: Siren },
      { href: "/collections", label: "nav.collections", module: "collections", icon: ShieldAlert, hideForRent: true, rentOps: true },
    ],
  },
  {
    // Head tools only (managerOnly) — a salesperson never sees these.
    label: "nav.manager",
    links: [
      { href: "/monitor", label: "nav.monitor", module: "dashboard", icon: Activity, hideForRent: true, managerOnly: true },
      { href: "", label: "nav.overview", module: "dashboard", icon: LayoutDashboard, exact: true, hideForRent: true, managerOnly: true, adminOnly: true },
      { href: "/board", label: "nav.leadsBoard", module: "messages", icon: Inbox, hideForRent: true, managerOnly: true },
      { href: "/pulse", label: "nav.pulse", module: "crm", icon: Activity, hideForRent: true, managerOnly: true },
      { href: "/analytics", label: "nav.analytics", module: "crm", icon: Activity, managerOnly: true },
    ],
  },
  {
    label: "nav.team",
    links: [{ href: "/tasks", label: "nav.tasks", module: "tasks", icon: ListChecks }],
  },
];

// Module-scope nav row (never recreated during render) — everything it needs
// from the sidebar (slug, accent, current path, close-on-navigate) comes in
// as props.
function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  absolute,
  tenantSlug,
  accent,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  /** Hub routes (/lines) live outside the tenant prefix. */
  absolute?: boolean;
  tenantSlug: string;
  accent: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const full = absolute ? href : `/${tenantSlug}${href}`;
  const active = !href || exact ? pathname === full : pathname.startsWith(full);
  return (
    <Link
      href={full}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-11 items-center gap-2.5 rounded-field px-3 py-2 text-[13px] font-medium transition-colors ${
        active ? "font-semibold" : "text-ink-2 hover:bg-sunken hover:text-ink"
      }`}
      style={
        active
          ? {
              color: accent,
              background: `color-mix(in srgb, ${accent} 9%, transparent)`,
            }
          : undefined
      }
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
          style={{ background: accent }}
        />
      )}
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? "" : "text-ink-3 group-hover:text-ink-2"}`}
      />
      {label}
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  tenantSlug,
  accent,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  tenantSlug: string;
  accent: string;
  pathname: string;
}) {
  const full = `/${tenantSlug}${href}`;
  const active = pathname === full || pathname.startsWith(`${full}/`);
  return (
    <Link
      href={full}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-field px-1 text-[10px] font-medium transition-colors ${
        active ? "" : "text-ink-3 hover:bg-sunken hover:text-ink"
      }`}
      style={active ? { color: accent, background: `color-mix(in srgb, ${accent} 9%, transparent)` } : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

const SETTINGS_LINKS: {
  href: string;
  label: string;
  icon: React.ElementType;
  absolute?: boolean;
}[] = [
  { href: "/settings/branding", label: "Branding", icon: Palette },
  { href: "/settings/website", label: "Website", icon: Globe },
  { href: "/settings/team", label: "Team", icon: UserCog },
  { href: "/settings/ai", label: "AI Provider", icon: Bot },
  { href: "/settings/integrations", label: "Integrations", icon: Settings },
  // WhatsApp line pairing renders inside the tenant shell
  // ([tenantSlug]/settings/lines) — the CRM navigation stays put.
  { href: "/settings/lines", label: "WhatsApp lines", icon: Phone },
  { href: "/settings/migration", label: "Migration", icon: ClipboardList },
  { href: "/settings/support", label: "Support", icon: LifeBuoy },
];

export default function Sidebar({
  tenantSlug,
  brandName,
  logoUrl,
  modules,
  crossBranch,
  showSettings,
  accentColor,
  userEmail,
  roles,
  lang = "ru",
}: {
  tenantSlug: string;
  brandName?: string | null;
  logoUrl?: string | null;
  modules?: string[] | null;
  crossBranch?: boolean;
  showSettings?: boolean;
  accentColor?: string | null;
  // Auth Wave 1 (P0-1) — passed in from the tenant layout (server
  // component, calls auth()) since Sidebar itself is a client component.
  userEmail?: string | null;
  /** Tenant roles of the signed-in user (from the server layout) — drives the
   *  pure-sales rent-ops trim. */
  roles?: string[];
  lang?: Lang;
}) {
  const accent = accentColor || "#7B61FF";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const enabledModules = normalizeModules(modules);
  const isRent = RENT_SLUGS.includes(tenantSlug);
  const pureSales = (roles?.length ?? 0) > 0 && roles!.every((role) => role === "sales");
  const isAdmin = (roles ?? []).some((role) => role === "tenant_admin" || role === "platform_admin");
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter(
      (link) =>
        enabledModules.includes(link.module) &&
        (!link.slugs || link.slugs.includes(tenantSlug)) &&
        !(isRent && link.hideForRent) &&
        !(!isRent && link.rentOps) &&
        !(pureSales && link.managerOnly) &&
        !(link.adminOnly && !isAdmin),
    ),
  }));
  const allLinks = visibleGroups.flatMap((group) => group.links);
  const mobileHrefs = [isRent ? "/rent" : "/crm", "/fleet/availability", "/rentals", "/customers"];
  const mobileLinks = mobileHrefs.flatMap((href) => {
    const link = allLinks.find((item) => item.href === href);
    return link ? [link] : [];
  });

  // Shared props for every NavItem row (see module-scope component above).
  const navCtx = {
    tenantSlug,
    accent,
    pathname,
    onNavigate: () => setOpen(false),
  };

  return (
    <>
      {/* Mobile toggle — sits inside the top bar row */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.625rem)] z-50 flex h-11 w-11 items-center justify-center rounded-field border border-line bg-surface shadow-card transition-colors hover:bg-sunken lg:hidden"
        aria-label="Toggle menu"
      >
        {open ? <X className="h-5 w-5 text-ink-2" /> : <Menu className="h-5 w-5 text-ink-2" />}
      </button>

      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-[100dvh] w-60 max-w-[calc(100vw-3rem)] transform flex-col border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Per-tenant brand. Logo (if uploaded) is normalized into a fixed box
            via object-contain; otherwise the tenant's name is a wordmark. */}
        <div className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center gap-2.5 border-b border-line px-4 pt-[env(safe-area-inset-top)]">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={brandName ?? "Logo"}
              className="h-9 w-auto max-w-[170px] object-contain"
            />
          ) : (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ background: accent }}
              >
                {(brandName ?? tenantSlug).slice(0, 1).toUpperCase()}
              </span>
              <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
                {brandName ?? tenantSlug}
              </span>
            </>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {crossBranch && (
            <NavItem href="/security" label="Security queue" icon={ShieldAlert} {...navCtx} />
          )}

          {visibleGroups.map((group) => {
            if (group.links.length === 0) return null;
            return (
              <div key={group.label ?? "top"}>
                {group.label && (
                  <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                    {t(lang, group.label)}
                  </div>
                )}
                {group.links.map((link) => (
                  <NavItem key={link.href} {...link} label={t(lang, link.label)} {...navCtx} />
                ))}
              </div>
            );
          })}

          {showSettings && (
            <div>
              <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                {t(lang, "nav.settings")}
              </div>
              {SETTINGS_LINKS.map((link) => (
                <NavItem key={link.href} {...link} {...navCtx} />
              ))}
            </div>
          )}
        </nav>

        {/* Auth Wave 1 (P0-1) — account block: signed-in email, a link to
            /account/password, and a real sign-out. Topbar also has a
            sign-out affordance (desktop, top-right); this is the
            always-visible mobile-friendly counterpart in the sidebar. */}
        <div className="shrink-0 border-t border-line-soft px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {userEmail && (
            <div
              className="mb-2 truncate px-1 text-[11px] font-medium text-ink-3"
              title={userEmail}
            >
              {userEmail}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Link
              href="/account/password"
              onClick={() => setOpen(false)}
              className="flex min-h-11 flex-1 items-center gap-1.5 rounded-field px-2 py-2 text-xs font-medium text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-ink-3" />
              {ru.sidebar.myAccount}
            </Link>
            <button
              type="button"
              onClick={() => hostAgnosticSignOut()}
              aria-label={ru.sidebar.signOut}
              className="flex min-h-11 items-center gap-1.5 rounded-field px-2 py-2 text-xs font-medium text-ink-2 hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {ru.sidebar.signOut}
            </button>
          </div>
        </div>
      </aside>

      <nav
        aria-label={lang === "ru" ? "Основная навигация" : "Main navigation"}
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        {mobileLinks.map((link) => (
          <MobileNavItem
            key={link.href}
            {...link}
            label={t(lang, link.label)}
            tenantSlug={tenantSlug}
            accent={accent}
            pathname={pathname}
          />
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={lang === "ru" ? "Открыть меню" : "Open menu"}
          className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-field px-1 text-[10px] font-medium transition-colors ${
            open ? "bg-sunken text-ink" : "text-ink-3 hover:bg-sunken hover:text-ink"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span>{lang === "ru" ? "Меню" : "Menu"}</span>
        </button>
      </nav>
    </>
  );
}
