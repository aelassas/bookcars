// Business lines for the head's monitor.
//
// A line head runs a KIND OF WORK, not a legal entity: the rent head is
// responsible for rent across every brand, and the sales/lease-to-own head
// must not see rent processes at all (owner, 2026-07-25). The brands exist for
// contract requisites and per-company reporting.
//
// Today each brand is its own tenant, so "all rent" spans several of them and
// the monitor reads each one separately (still inside withDrizzleTenant, still
// membership-checked). This file is the seam that disappears when the brands
// are collapsed into one workspace with companies — at that point `tenantSlugs`
// goes away and `lineSlugs` stays.
//
// Derived from LINE_TENANT rather than restated, so a newly paired WhatsApp
// line only has to be added in one place.
import { LINE_TENANT } from "@/modules/messaging/lines";

export type BusinessLineKey = "rent" | "sales";

/** Which tenants hold each line's data today. */
const LINE_TENANTS: Record<BusinessLineKey, string[]> = {
  rent: ["cardiwan", "easyrent", "etm", "rma"],
  sales: ["take-auto"],
};

export type BusinessLine = {
  key: BusinessLineKey;
  label: string;
  /** Tenant slugs to read, in display order. */
  tenantSlugs: string[];
  /** Observer line slugs belonging to this business line. */
  lineSlugs: string[];
};

function slugsForTenants(tenants: string[]): string[] {
  return Object.entries(LINE_TENANT)
    .filter(([, tenantSlug]) => tenants.includes(tenantSlug))
    .map(([lineSlug]) => lineSlug)
    .sort();
}

export const BUSINESS_LINES: Record<BusinessLineKey, BusinessLine> = {
  rent: {
    key: "rent",
    label: "Rent",
    tenantSlugs: LINE_TENANTS.rent,
    lineSlugs: slugsForTenants(LINE_TENANTS.rent),
  },
  sales: {
    key: "sales",
    label: "Sales & Buyback",
    tenantSlugs: LINE_TENANTS.sales,
    lineSlugs: slugsForTenants(LINE_TENANTS.sales),
  },
};

export function businessLine(key: string | null | undefined): BusinessLine | null {
  if (key !== "rent" && key !== "sales") return null;
  return BUSINESS_LINES[key];
}

/**
 * The business line a tenant currently belongs to — used to pick a default
 * when a head opens the monitor from one of their brands.
 */
export function lineForTenantSlug(tenantSlug: string): BusinessLine | null {
  for (const line of Object.values(BUSINESS_LINES)) {
    if (line.tenantSlugs.includes(tenantSlug)) return line;
  }
  return null;
}
