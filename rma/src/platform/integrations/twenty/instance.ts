/**
 * instance.ts — which Twenty DEPLOYMENT a tenant's records live in.
 *
 * The holding runs two separate self-hosted Twenty instances, each with its
 * own workspace, its own people, and its own API key:
 *
 *   default (:3001) — the sales line, tenant `take-auto`
 *   rental  (:3002) — the rental brands: Cardiwan, and ETM trading as EasyRent
 *
 * They are separate on purpose: the owner's 2026-07-29 rule is that the sales
 * team does not see rent activity at all. Two deployments make that structural
 * rather than a filter someone can forget.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * Until 2026-08-05 the integration held ONE module-level cached client built
 * from TWENTY_BASE_URL, which points at the sales instance. Every rental
 * brand's WhatsApp projection therefore looked its contacts up in the SALES
 * workspace, matched nobody, and counted them `noPerson` — dropped in silence.
 * Result: the rental Twenty had ZERO notes for its entire existence while the
 * logs showed a healthy `projected=0 noPerson=6`. Routing has to be explicit
 * and per-tenant, and an instance that is not configured must SAY so rather
 * than quietly fall back to the other one's credentials — a fallback would
 * write rental records into the sales workspace, which is the very leak the
 * two-deployment split exists to prevent.
 */

export type TwentyInstanceKey = "default" | "rental";

export type TwentyInstanceConfig = {
  baseUrl: string;
  apiKey: string | undefined;
  /** False when this deployment has no usable base URL + key pair. */
  configured: boolean;
};

const DEFAULT_BASE_URL = "http://localhost:3001";
const DEFAULT_RENTAL_BASE_URL = "http://localhost:3002";

/** Tenant slugs whose workspace lives on the rental deployment. */
function rentalTenants(): Set<string> {
  const raw = process.env.TWENTY_RENTAL_TENANTS ?? "cardiwan,easyrent,etm";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

/**
 * Deployment holding this tenant's workspace. Unknown/missing tenants resolve
 * to `default`: that instance has always been configured, so failing toward it
 * degrades to the historical behaviour instead of dropping a tenant into the
 * rental workspace by accident.
 */
export function twentyInstanceForTenantSlug(slug: string | null | undefined): TwentyInstanceKey {
  if (!slug) return "default";
  return rentalTenants().has(slug) ? "rental" : "default";
}

/**
 * Base URL + key for one deployment. Read fresh from env on every call (not
 * captured at import) so a script can point itself at another instance without
 * a rebuild — the same way scripts/create-brand-views.mjs already does.
 */
export function resolveTwentyInstance(key: TwentyInstanceKey): TwentyInstanceConfig {
  const baseUrl =
    key === "rental"
      ? process.env.TWENTY_RENTAL_BASE_URL?.trim() || DEFAULT_RENTAL_BASE_URL
      : process.env.TWENTY_BASE_URL?.trim() || DEFAULT_BASE_URL;
  // Deliberately NOT falling back to TWENTY_API_KEY for the rental instance:
  // the sales key would authenticate against the sales workspace, so rental
  // records would be written into the sales brand's book.
  const apiKey =
    key === "rental"
      ? process.env.TWENTY_RENTAL_API_KEY?.trim() || undefined
      : process.env.TWENTY_API_KEY?.trim() || undefined;
  return { baseUrl, apiKey, configured: Boolean(apiKey) };
}
