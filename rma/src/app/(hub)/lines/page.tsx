import { redirect } from "next/navigation";
import { canManageLines } from "@/modules/lines/access";
import LinesPanel from "./LinesPanel";

export const dynamic = "force-dynamic";

// WhatsApp line health + re-pairing. In the (hub) route group — the side menu
// comes from the group layout. Guarded to platform admins + the
// LINES_ADMIN_NAMES allowlist; everyone else bounces to /login as if the page
// did not exist.
export default async function LinesPage() {
  const access = await canManageLines();
  if (!access) redirect("/login?callbackUrl=/lines");
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold">WhatsApp lines</h1>
        <span className="text-xs text-ink-2">live from the observer box · refreshes every 10s</span>
      </div>
      <div className="px-5 pb-8">
        <LinesPanel />
      </div>
    </div>
  );
}
