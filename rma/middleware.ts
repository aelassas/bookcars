import { auth } from "@/platform/auth";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/integrations", // inbound webhooks from third-party providers
];

// Coarse per-IP flood guard on unauthenticated traffic. This is the outer
// blanket over the per-endpoint limiters (magic-link, webhooks) — it catches
// blunt volumetric abuse before it reaches any handler. Generous ceiling so
// normal browsing of the login page + its assets/API is never throttled.
// Best-effort, per-instance — see platform/security/rate-limit.ts.
const GLOBAL_LIMIT = 300; // requests
const GLOBAL_WINDOW_MS = 60 * 1000; // per minute

export default auth((req) => {
  const { nextUrl } = req;
  // Gate on user.id, NOT just `!!req.auth`. A stale/partial JWT can decode to a
  // session object that has no user.id (e.g. a cookie issued before token.sub
  // was reliably set). Server actions and page guards both key off
  // session.user.id (requireAuth throws Unauthorized without it), so a bare
  // `!!req.auth` here would wave such a request past middleware only for it to
  // 500 inside the first server action (the /account/password forced-change
  // action is the visible case). Treating an id-less session as logged-OUT
  // sends it to /login for a clean re-auth (fresh, well-formed cookie) instead
  // — matching the page-level guards, which already redirect id-less sessions.
  const isLoggedIn = !!req.auth?.user?.id;
  const isPublic = PUBLIC_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));

  // Only throttle unauthenticated traffic; signed-in sessions are already
  // attributable and gated at login.
  if (!isLoggedIn) {
    const result = rateLimit({
      key: `global:${clientIp(req)}`,
      limit: GLOBAL_LIMIT,
      windowMs: GLOBAL_WINDOW_MS,
    });
    if (!result.ok) {
      return new Response("Too Many Requests", {
        status: 429,
        headers: { "retry-after": String(result.retryAfter) },
      });
    }
  }

  if (!isLoggedIn && !isPublic) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  // Run in the Node.js runtime: the auth() import pulls in the pg/drizzle
  // adapter (node-only), which the edge runtime cannot load (node:util/types).
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
