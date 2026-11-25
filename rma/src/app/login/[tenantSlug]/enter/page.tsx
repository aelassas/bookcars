import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { isFloorLoginEnabled } from "@/platform/auth/floor-login";
import { clientIp, isOfficeLan } from "@/platform/net/device";
import { listFloorMembers } from "@/modules/admin/floor-queries";
import { FloorNameGrid } from "@/components/auth/FloorNameGrid";

// «Floor login» door — passwordless name-tap sign-in for the office floor
// (owner order 2026-07-24). Lives under /login (NOT under [tenantSlug]) on
// purpose, exactly like the branded login page: the tenant layout's auth guard
// and the middleware both bounce anonymous visitors away from /<slug>/*, so a
// page for anonymous floor staff has to sit behind the public /login prefix.
//
// Fully gated: when FLOOR_LOGIN_ENABLED isn't "true" this behaves as if the
// route doesn't exist and sends people to the normal login. Never cache — the
// member list must reflect the current tenant roster.
export const dynamic = "force-dynamic";

export default async function FloorEnterPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  // Whole door is a deploy switch: off → fall back to the normal login.
  if (!isFloorLoginEnabled()) redirect("/login");

  // LAN gate — this page sits behind the public /login prefix, so it is
  // reachable ANONYMOUSLY. Without this check anyone on the internet could
  // enumerate a tenant's staff roster (and tap a name). Same isOfficeLan
  // check as registration and the mint gate itself (authorizeFloorName): off
  // the office LAN the door behaves as if it doesn't exist. clientIp() is
  // trustworthy only because server.cjs stamps the real socket address into
  // the headers — see the trust note in platform/auth/floor-login.ts.
  const h = await headers();
  if (!isOfficeLan(clientIp(h))) redirect("/login");

  const { tenantSlug } = await params;
  const [t] = await db
    .select({ id: tenant.id, name: tenant.name, brandName: tenant.brandName })
    .from(tenant)
    .where(eq(tenant.slug, tenantSlug))
    .limit(1);
  if (!t) redirect("/login");

  const members = await listFloorMembers(t.id);
  const workspace = t.brandName?.trim() || t.name;

  return (
    <main className="flex min-h-screen justify-center bg-sunken px-4 py-10">
      <div className="w-full max-w-2xl">
        <header className="mb-6">
          <h1 className="text-[22px] font-semibold text-ink">Who are you?</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            Tap your name to sign in to {workspace}.
          </p>
        </header>
        <FloorNameGrid tenantSlug={tenantSlug} members={members} />
      </div>
    </main>
  );
}
