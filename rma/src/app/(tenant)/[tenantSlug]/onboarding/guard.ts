import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";

/**
 * First-run guard: send tenant admins to the setup wizard until they finish
 * it. Only admins are redirected (regular members can't complete setup), so
 * the rest of the team is never blocked. Call from tenant landing pages —
 * never from the onboarding route itself (that would loop).
 */
export async function redirectIfNeedsOnboarding(
  slug: string,
  tenantId: string,
  roles: string[] | undefined
) {
  const isAdmin = (roles ?? []).some((r) => r === "tenant_admin" || r === "platform_admin");
  if (!isAdmin) return;
  const [row] = await db
    .select({ onboardedAt: tenant.onboardedAt })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  if (row && !row.onboardedAt) redirect(`/${slug}/onboarding/setup`);
}
