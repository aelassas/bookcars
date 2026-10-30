/** Carry the list's filters/page into a record without relying on browser history. */
export function recordHref(href: string, returnTo: string): string {
  const url = new URL(href, "https://crm.local");
  url.searchParams.set("returnTo", returnTo);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** A copied record URL must never send someone outside their tenant workspace. */
export function safeReturnHref(candidate: string | null, fallback: string): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || /[\\\u0000-\u0020]/.test(candidate)) return fallback;
  try {
    const base = new URL(fallback, "https://crm.local");
    const target = new URL(candidate, base);
    const tenantPrefix = `/${base.pathname.split("/")[1]}/`;
    if (target.origin !== base.origin || !target.pathname.startsWith(tenantPrefix)) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
