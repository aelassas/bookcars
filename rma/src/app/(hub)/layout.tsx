import type { ReactNode } from "react";
import HubSidebar from "@/components/hub-sidebar";
import { nameCanManageLines } from "@/modules/lines/access";

// (hub) layout — the tenant-less hub section (/availability, /lines): one left
// side menu instead of the bare-page header links (owner, 2026-09-19). The
// pages keep their own hard guards (redirect/404); this layout ONLY decides
// whether the manager-only Lines tab renders — it never blocks. A session or
// DB hiccup degrades to "agent view" (Availability tab only), not an error
// page.
export default async function HubLayout({ children }: { children: ReactNode }) {
  let showLines = false;
  try {
    const { auth } = await import("@/platform/auth");
    const { isPlatformAdmin } = await import("@/platform/auth/authorization");
    const session = await auth();
    const userId = session?.user?.id;
    const name = session?.user?.name ?? null;
    showLines = !!userId && ((await isPlatformAdmin(userId)) || nameCanManageLines(name));
  } catch {
    showLines = false;
  }
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <HubSidebar showLines={showLines} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
