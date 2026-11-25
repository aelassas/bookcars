import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";

/**
 * The physical fleet is ONE shared holding, stored under a single tenant (the
 * sheet importer writes every rent vehicle + rental + price_tier under
 * `take-auto`). The rent brands (cardiwan/easyrent/etm) are separate tenants
 * with an empty fleet, so a per-brand read shows Babek nothing — which is why
 * "calendar and car distribution" were missing on his screens.
 *
 * fleetHomeTenantId() resolves where the shared fleet actually lives so DATA
 * reads (fleet grid, availability calendar, rentals) can point there while the
 * ACCESS check stays on the viewer's own brand. This is the "holding-wide"
 * model the fleet queries always claimed but never implemented.
 */
const FLEET_HOME_SLUG = process.env.FLEET_HOME_SLUG?.trim() || "take-auto";
let cached: string | null = null;

export async function fleetHomeTenantId(): Promise<string | null> {
  if (cached) return cached;
  const [row] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, FLEET_HOME_SLUG)).limit(1);
  cached = row?.id ?? null;
  return cached;
}

/**
 * Fail-fast variant for WRITE paths. The old `(await fleetHomeTenantId()) ??
 * tenantId` fallback silently degraded to the caller's brand tenant on any
 * lookup failure — recreating the orphan-rental bug (rentals invisible to the
 * calendar/lifecycle) with no signal. Writes now refuse to run and scream.
 */
export async function requireFleetHomeTenantId(): Promise<string> {
  const home = await fleetHomeTenantId();
  if (!home) {
    console.error(`[fleet-home] tenant slug "${FLEET_HOME_SLUG}" not found — refusing to write to a brand tenant fallback`);
    throw new Error("Fleet home is not configured (FLEET_HOME_SLUG) — operation blocked, alert admin.");
  }
  return home;
}
