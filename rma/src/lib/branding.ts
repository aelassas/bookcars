// Per-tenant login-door wordmark. The branded login page shows "<Brand>CRM"
// where <Brand> is the accented prefix and "CRM" the neutral suffix — the same
// two-tone treatment the neutral "MyCRM" wordmark uses (accent "My").
//
// Resolution order: an explicit slug→Brand map (pins the exact casing the
// business wants — e.g. all-caps ETM, camel-cased EasyRent that a plain
// capitalize couldn't recover), then PascalCase(brandName ?? name ?? slug).

const BRAND_BY_SLUG: Record<string, string> = {
  "take-auto": "TakeAuto",
  cardiwan: "Cardiwan",
  easyrent: "EasyRent",
  etm: "ETM",
};

// "take auto" / "take-auto" → "TakeAuto"; "ETM" → "ETM" (first char upper,
// remainder untouched so existing capitals survive); "" → "".
function pascalCase(input: string): string {
  return input
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export type Wordmark = { accent: string; rest: string };

/** The accented brand token for a tenant (without the "CRM" suffix). */
export function tenantBrand(
  slug: string,
  name?: string | null,
  brandName?: string | null,
): string {
  const mapped = BRAND_BY_SLUG[slug];
  if (mapped) return mapped;
  const derived = pascalCase((brandName || name || slug).replace(/[ _-]*CRM$/i, ""));
  return derived || "My";
}

/** Full two-tone wordmark parts for a tenant login door: { accent, rest:"CRM" }. */
export function tenantWordmark(
  slug: string,
  name?: string | null,
  brandName?: string | null,
): Wordmark {
  return { accent: tenantBrand(slug, name, brandName), rest: "CRM" };
}
