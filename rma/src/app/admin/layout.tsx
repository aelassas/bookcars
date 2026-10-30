import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/platform/auth/authorization";
import { Badge } from "@/components/ui";

// SPEC §5 — every /admin route is gated here. Non-admins get a 404 so the
// console's existence isn't revealed. Same design system as the tenant app,
// with an explicit "Platform console" identity so it can't be mistaken for
// a tenant workspace.

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/telegram-links", label: "Telegram links" },
  { href: "/admin/onboarding", label: "Onboarding" },
  // Access review was reachable only by typing the URL — the console's most
  // destructive button was also its most hidden one.
  { href: "/admin/access", label: "Access" },
  { href: "/admin/health", label: "Health" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requirePlatformAdmin();
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface px-6">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <ShieldCheck className="h-4.5 w-4.5" />
              </span>
              <span className="text-sm font-semibold tracking-tight text-ink">
                Platform console
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-field px-2.5 py-1.5 font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <Badge tone="brand">PLATFORM ADMIN</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
