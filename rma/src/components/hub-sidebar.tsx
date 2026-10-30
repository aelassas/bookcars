"use client";

// HubSidebar — the hub's side menu (the /lines + /availability + /fines route
// group). Tenant-less: deliberately NOT the tenant Sidebar (that one is
// module/scope machinery); just tabs in the same visual language. Client-side
// for usePathname (active tab); `showLines` comes from the server layout —
// Lines is manager-only, Availability is every rotation agent's own toggle
// (Ayham, 2026-09-19). Fines & Salik is the desk's RTA/Salik view, visible to
// anyone with hub access (owner, 2026-09-19).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Phone, Ticket } from "lucide-react";

const TAB_CLS = (active: boolean) =>
  `flex items-center gap-2 rounded px-3 py-2 text-sm ${
    active ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:bg-sunken"
  }`;

export default function HubSidebar(props: { showLines: boolean }) {
  const pathname = usePathname() ?? "";
  const tabs = [
    { href: "/availability", label: "Availability", icon: CalendarCheck, show: true },
    { href: "/fines", label: "Fines & Salik", icon: Ticket, show: true },
    { href: "/lines", label: "Lines", icon: Phone, show: props.showLines },
  ].filter((t) => t.show);
  return (
    <>
      {/* Desktop: the left side menu. */}
      <aside className="hidden sm:flex w-44 shrink-0 flex-col border-r border-line bg-surface min-h-screen">
        <div className="px-4 pt-4 pb-3 text-sm font-semibold">TAKE hub</div>
        <nav className="flex flex-col gap-1 px-2">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={TAB_CLS(pathname.startsWith(t.href))}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile: the same two tabs as a top bar. */}
      <nav className="flex sm:hidden items-center gap-1 border-b border-line bg-surface px-2 py-2">
        <span className="px-2 text-sm font-semibold">TAKE hub</span>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={TAB_CLS(pathname.startsWith(t.href))}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
