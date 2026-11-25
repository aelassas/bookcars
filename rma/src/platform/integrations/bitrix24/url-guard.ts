/**
 * url-guard.ts — SSRF hardening for admin-supplied Bitrix24 webhook URLs.
 *
 * A Bitrix24 incoming-webhook URL is fetched server-side by a logged-in tenant
 * admin (testBitrixConnection / connectBitrix24 / sync). A bare
 * `url.includes("/rest/")` check does NOT stop an admin pointing us at internal
 * infrastructure — `http://169.254.169.254/rest/x` passes it. This helper adds
 * a proper host guard: https/http only, must be a `/rest/` path, and the host
 * must not be loopback, link-local (169.254.0.0/16 — cloud metadata), or any
 * RFC-1918 / unique-local private range.
 *
 * NOT "use server" — a plain helper imported by the settings server actions.
 * Best-effort by design: literal-IP and well-known-name checks only (no DNS
 * resolution, so DNS-rebinding is out of scope here), which is the layer the
 * audit called for.
 */

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  // Well-known internal names.
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // IPv6 loopback / unique-local / link-local.
  if (host === "::1" || host === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true; // fc00::/7 ULA
  if (host.startsWith("fe80:")) return true; // link-local

  // IPv4 literal ranges.
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (metadata)
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  }

  return false;
}

/**
 * Validate an admin-supplied Bitrix24 webhook URL, throwing a user-facing
 * Error on anything unsafe. Returns the parsed URL on success.
 */
export function assertSafeBitrixWebhookUrl(webhookUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(webhookUrl);
  } catch {
    throw new Error(
      "Invalid Bitrix24 webhook URL. Expected format: https://domain.com/rest/USER_ID/TOKEN/"
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Bitrix24 webhook URL must be an http(s) URL.");
  }
  if (!parsed.pathname.includes("/rest/")) {
    throw new Error(
      "Invalid Bitrix24 webhook URL. Expected format: https://domain.com/rest/USER_ID/TOKEN/"
    );
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error(
      "Refusing to connect to an internal or private address. Use your public Bitrix24 portal URL."
    );
  }

  return parsed;
}
