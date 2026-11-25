export {
  canManageRentals,
  canManageRentalsForTenant,
} from "@/platform/auth/authorization";

import { redirect } from "next/navigation";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { lineForTenantSlug } from "@/modules/monitor/lines";

/**
 * Sales-line separation (owner 2026-07-29: "SALES team is not supposed to SEE
 * RENT and their activities"), scoped by the owner's clarification of
 * 2026-08-09: what must not reach a salesperson is a rent **lead** — a
 * request from another department that only distracts them. Cars were never
 * the target. The fleet is one fleet and a car changes designation (lease →
 * rent → lease-to-own), so /rentals, /returns and /fleet/availability are
 * common to both lines and no longer call this.
 *
 * What remains behind it is chasing a renter (collections). Rent leads
 * themselves need no guard at all: they live in the rent tenants, so a
 * take-auto session never loads one.
 *
 * Sidebar.tsx trims the same links by the same rule.
 */
export async function redirectIfSalesOnlyRentOps(tenantSlug: string) {
  if (lineForTenantSlug(tenantSlug)?.key !== "sales") return;
  redirect(`/${tenantSlug}`);
}

/**
 * Same separation, other direction: line-MANAGEMENT wallboards (monitor,
 * leads board, pulse) are head tools, not a salesperson's workbench — a
 * purely-sales user (Azat, Firuz) landing on one is sent to their day.
 * Sidebar hides the links by the same rule; this guards the direct URLs.
 */
export async function redirectIfSalesOnlyManagerScreen(tenantSlug: string) {
  if (lineForTenantSlug(tenantSlug)?.key !== "sales") return;
  const t = await getTenantBySlug(tenantSlug);
  const roles = t?.roles ?? [];
  if (roles.length > 0 && roles.every((r) => r === "sales")) redirect(`/${tenantSlug}/my`);
}
