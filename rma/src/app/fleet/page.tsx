import { redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import FleetMap from "./FleetMap";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/fleet");
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-baseline gap-3 px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold">Fleet map</h1>
        <span className="text-xs text-ink-2">live from Pilot GPS · refreshes every 60s</span>
      </div>
      <div className="min-h-0 flex-1 px-5 pb-5">
        <FleetMap />
      </div>
    </div>
  );
}
