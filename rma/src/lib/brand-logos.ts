// Path lookup for manufacturer brand logos vendored under public/brand-logos/.
// PNGs are from filippofilip95/car-logos-dataset (with a handful of Wikimedia
// emblem-only swaps for the wordmark-heavy ones). Detection lives in
// `./pilot/normalize.ts` — this module only owns the slug -> file mapping.

import { BRANDS, brandSlug } from "@/platform/integrations/pilot/normalize";

// Slugs whose .png lives under public/brand-logos/. Built from the BRANDS
// table so adding a brand in normalize.ts is the single source of truth.
const AVAILABLE_SLUGS = new Set<string>(BRANDS.map((b) => b.slug));

// Returns "/brand-logos/<slug>.png" if the file is vendored, else null.
// Accepts either a canonical display name ("Mercedes-Benz") or a raw slug
// ("mercedes-benz"); both resolve to the same path.
export function brandLogoPath(make: string): string | null {
  if (!make) return null;
  const slug = brandSlug(make);
  return AVAILABLE_SLUGS.has(slug) ? `/brand-logos/${slug}.png` : null;
}
