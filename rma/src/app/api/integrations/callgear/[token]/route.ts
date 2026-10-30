import { NextResponse } from "next/server";
import {
  extractVirtualPhoneNumber,
  ingestCallGearEvent,
  normalizeToCallFinished,
  resolveTenantForWebhook,
  verifyCallGearSignature,
} from "@/platform/integrations/callgear/webhook";
import type { CallGearCallFinishedRequest } from "@/platform/integrations/callgear/types";
import { log } from "@/platform/log";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

// Coarse flood guard, keyed by token+IP. A rate-limited webhook still
// returns 200 (never 5xx — CallGear retries on 5xx) with a body. Best-effort,
// per-instance limiter — see platform/security/rate-limit.ts.
const WEBHOOK_LIMIT = 120; // requests
const WEBHOOK_WINDOW_MS = 60 * 1000; // per minute

// Always returns 200 — CallGear retries on 5xx, which causes duplicates
// worse than a dropped event we'd notice in `processing_status`. Errors
// are recorded in the JSON body for diagnostic purposes.
//
// Tenant is bound to the path token (`/api/integrations/callgear/<token>`),
// looked up server-side. Never trust tenant identifiers from query strings.
export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const limit = rateLimit({
    key: `callgear:${token}:${clientIp(req)}`,
    limit: WEBHOOK_LIMIT,
    windowMs: WEBHOOK_WINDOW_MS,
  });
  if (!limit.ok) {
     
    console.warn("[callgear] rate limited", { retryAfter: limit.retryAfter });
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 200, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  const rawBody = await req.text();

  let parsed: CallGearCallFinishedRequest;
  try {
    // UIS/CoMagic notifications arrive as flat JSON — normalize at the edge
    // so everything downstream sees one JSON-RPC call.finished shape.
    parsed = normalizeToCallFinished(JSON.parse(rawBody));
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid JSON" },
      { status: 200 }
    );
  }

  // Brand comes from the dialed line (virtual_phone_number) when mapped —
  // one panel notification covers all four brands; the path token is the
  // authenticity gate and the catch-all bucket for unmapped numbers.
  const tenantId = await resolveTenantForWebhook(token, extractVirtualPhoneNumber(parsed));
  if (!tenantId) {
    // Don't leak whether the token is malformed vs. unknown.
    log.warn("callgear webhook dropped: token did not resolve to a tenant");
    return NextResponse.json(
      { ok: false, reason: "unknown webhook token" },
      { status: 200 }
    );
  }

  const sig = verifyCallGearSignature(
    rawBody,
    req.headers.get("x-callgear-signature")
  );
  if (!sig.ok) {
    log.warn("callgear signature rejected", { tenantId, reason: sig.reason });
    return NextResponse.json({ ok: false, reason: sig.reason }, { status: 200 });
  }

  const result = await ingestCallGearEvent({
    tenantId,
    parsed,
    signatureValid: sig.valid,
  });

  return NextResponse.json(result, { status: 200 });
}
