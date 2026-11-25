import { redirect } from "next/navigation";
import { canUseAvailability } from "@/modules/availability/access";
import AvailabilityPanel from "./AvailabilityPanel";

export const dynamic = "force-dynamic";

// Rotation agent availability — Available / Busy (auto-expires) / Off duty.
// In the (hub) route group — the side menu comes from the group layout.
// Guarded to rotation agents (their own row) + the manager allowlist (any
// row); everyone else bounces to /login as if the page did not exist.
export default async function AvailabilityPage() {
  const access = await canUseAvailability();
  if (!access) redirect("/login?callbackUrl=/availability");
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold">Agent availability</h1>
        <span className="text-xs text-ink-2">rental main-line rotations · refreshes every 15s</span>
      </div>
      <div className="px-5 pb-8">
        <AvailabilityPanel sessionName={access.name} canPickAny={access.canPickAny} />
      </div>
    </div>
  );
}
