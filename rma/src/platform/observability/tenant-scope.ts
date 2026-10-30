// Attach the current tenant to the active Sentry scope so every error captured
// during a request / job / webhook is attributable to a tenant.
//
// Next.js' Sentry SDK creates an isolation scope per request, so setting a tag
// on the current scope here does not bleed across concurrent tenants. This is a
// no-op if Sentry has no DSN configured (dev), and it never throws — telemetry
// must never break the request path.

import * as Sentry from "@sentry/nextjs";

export function setSentryTenant(tenantId: string, tenantSlug?: string): void {
  try {
    Sentry.setTag("tenantId", tenantId);
    if (tenantSlug) Sentry.setTag("tenantSlug", tenantSlug);
    Sentry.setContext("tenant", { id: tenantId, ...(tenantSlug ? { slug: tenantSlug } : {}) });
  } catch {
    // Sentry not initialized / unavailable — telemetry is best-effort.
  }
}
