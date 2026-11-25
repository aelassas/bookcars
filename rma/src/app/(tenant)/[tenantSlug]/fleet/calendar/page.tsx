import { permanentRedirect } from "next/navigation";

// Orphaned: this read-only 28-day CSS grid (FleetTimeline) was superseded by
// the DayPilot board at /fleet/availability and nothing links here anymore.
// 308 so stale bookmarks settle on the live board. FleetTimeline.tsx stays in
// the tree, unused. Auth/tenant checks are left to the target page.
export default async function FleetCalendarPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  permanentRedirect(`/${tenantSlug}/fleet/availability`);
}
