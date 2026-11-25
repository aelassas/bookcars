import { NextRequest } from "next/server";
import { GET, POST as authPost } from "@/platform/auth";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

export { GET };

// Throttle magic-link requests. Auth.js exposes the email sign-in as
// `POST /api/auth/signin/email` with the address in the form body. Without
// this, the endpoint is an open email-spam relay (any attacker can burn a
// victim's inbox / our Resend quota). Limit is keyed by IP+email so one
// noisy client can't lock out others, and applied ONLY to the email route —
// credentials/callback/session traffic passes straight through.
//
// Best-effort, per-instance limiter — see platform/security/rate-limit.ts.
const MAGIC_LINK_LIMIT = 5; // requests
const MAGIC_LINK_WINDOW_MS = 60 * 60 * 1000; // per hour

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname.endsWith("/signin/email")) {
    // Read the body once, then hand a fresh Request to Auth.js since the
    // stream can only be consumed a single time.
    const rawBody = await req.text();
    const email = new URLSearchParams(rawBody).get("email")?.toLowerCase().trim() ?? "";
    const ip = clientIp(req);

    const result = rateLimit({
      key: `magiclink:${ip}:${email}`,
      limit: MAGIC_LINK_LIMIT,
      windowMs: MAGIC_LINK_WINDOW_MS,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({ error: "Too many sign-in requests. Please try again later." }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": String(result.retryAfter),
          },
        }
      );
    }

    const replay = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: rawBody,
    });
    return authPost(replay);
  }

  return authPost(req);
}
