import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "pg-boss", "@anthropic-ai/sdk", "pdfkit"],
  allowedDevOrigins: ["192.168.2.120", "100.115.88.32"],
  turbopack: {
    root: projectRoot,
  },
  // Baseline security headers (swarm audit 2026-07-29: app had NONE — login
  // was clickjackable). HSTS intentionally omitted: the app is reached over
  // plain http inside the tailnet; X-Frame-Options covers framing.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com; " +
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' data: blob: https:; " +
              // mapbox-gl instantiates its web worker from a blob: URL
              "worker-src 'self' blob:; child-src blob:; " +
              "font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig; const __sentry_stub = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
