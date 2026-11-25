import { notFound, redirect } from "next/navigation";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { getMyDay } from "@/modules/crm/my-queries";
import { ownerKeyForUser } from "@/modules/notify/registry";
import { resolveOwnerByKey } from "@/modules/board/owners";
import { MyDay } from "@/components/crm/MyDay";

// «Мой день» is a live cockpit — never cache; a lightweight client-side refresh
// keeps the phone screen current without any interaction (v1: meta refresh).
export const dynamic = "force-dynamic";

// Who am I → my lines: owner key via the reverse env bridge (ownerKeyForUser),
// then every BRAND_OWNERS line with that key. No key = admin/CEO view: null
// lines → the whole tenant. Per-tenant reads use the CURRENT tenant id (same
// guard as watchers/page.tsx).
export default async function MyDayPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { tenantSlug } = await params;
  const t = await getTenantBySlug(tenantSlug);
  if (!t) notFound();

  // OPEN by owner directive (2026-07-24): «no limits — they all see the whole
  // rent, they work together». Everyone's «Мой день» shows the WHOLE tenant
  // (lines = null), not just their own line — a shared team board. Babek is
  // Manager of Rent over every company under the tenant; his reps back each
  // other up, so they share one queue. Personal targeting still lives in the
  // per-person hunter PINGS (notify), not in what the board shows.
  const key = ownerKeyForUser(session.user.id);
  const ownerName =
    (key ? (resolveOwnerByKey(key)?.name ?? null) : null) ??
    session.user.name ??
    null;

  const data = await getMyDay(t.id, null);

  return (
    <>
      {/* v1 auto-refresh: honest, zero-JS, good enough for a wall/phone screen. */}
      <meta httpEquiv="refresh" content="60" />
      <main className="min-h-screen bg-sunken">
        <MyDay data={data} ownerName={ownerName} tenantSlug={tenantSlug} />
      </main>
    </>
  );
}
