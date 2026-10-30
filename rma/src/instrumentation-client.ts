// Sentry init for the browser.
//
// This replaces the old root `sentry.client.config.ts`. That file only ever
// worked through @sentry/nextjs' webpack entry injection, and this app builds
// with Turbopack (see next.config.ts) — the SDK's own webpack.js says so:
// "When using Turbopack `sentry.client.config.ts` will no longer work".
// `src/instrumentation-client.ts` is the supported convention (Next >= 15.3;
// Next resolves src/ before the project root — see create-compiler-aliases.js,
// and it is picked up by Turbopack builds).
//
// No NEXT_PUBLIC_SENTRY_DSN => no init, silently. Sentry stays optional.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  const rate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
    tracesSampleRate: Number.isFinite(rate) ? rate : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}

// Lets Sentry tie client-side errors to the navigation that caused them.
// No-op when the SDK was never initialised.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
