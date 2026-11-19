"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, LogOut } from "lucide-react";
import { hostAgnosticSignOut } from "@/lib/auth/host-agnostic-sign-out";
import ThemeToggle from "@/components/theme/ThemeToggle";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import type { Lang } from "@/platform/i18n/dict";

/** Human titles for the first path segment under /[tenantSlug]. */
// RU titles — owner feedback 2026-07-23 (no EN/RU mix in the chrome).
const SECTION_TITLES: Record<string, string> = {
  "": "Overview",
  rent: "Rent",
  my: "My Day",
  monitor: "Monitor",
  board: "Lead board",
  crm: "CRM",
  deals: "Deals",
  watchers: "Watchers",
  pulse: "Pulse",
  customers: "Customers",
  messages: "Messages",
  fleet: "Fleet",
  rentals: "Rentals",
  leases: "Leasing",
  returns: "Returns",
  collections: "Collections",
  security: "Security queue",
  tasks: "Tasks",
  search: "Search",
  settings: "Settings",
  onboarding: "Rental onboarding",
};

export default function Topbar({ tenantSlug, lang = "ru" }: { tenantSlug: string; lang?: Lang }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const rest = pathname.replace(`/${tenantSlug}`, "").split("/").filter(Boolean);
  let title = SECTION_TITLES[rest[0] ?? ""] ?? "Overview";
  if (rest[0] === "fleet" && rest[1] === "availability") title = "Availability calendar";
  if (rest[0] === "onboarding" && rest[1] === "setup") title = "Workspace setup";

  const user = session?.user;
  const display = user?.name || user?.email || "";
  const initial = (display || "?").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 pl-14 backdrop-blur lg:px-6 lg:pl-6">
      <h2 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-ink">
        {title}
      </h2>

      <div className="ml-auto flex items-center gap-2">
        <LanguageSwitcher lang={lang} compact />
        <ThemeToggle />
        <Link
          href={`/${tenantSlug}/search`}
          className="flex h-8 items-center gap-2 rounded-field border border-line bg-surface px-2.5 text-sm text-ink-3 shadow-card transition-colors hover:border-brand-300 hover:text-ink-2 sm:w-56"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden truncate sm:inline">Search: customers, plates…</span>
        </Link>

        {user && (
          <div className="flex items-center gap-2 pl-1">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
              title={display}
            >
              {initial}
            </span>
            <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink-2 md:inline">
              {display}
            </span>
            <button
              onClick={() => hostAgnosticSignOut()}
              className="rounded-field p-2 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
