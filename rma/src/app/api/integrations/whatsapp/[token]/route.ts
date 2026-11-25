// WhatsApp Business API webhook handler.
//
// Endpoint: /api/integrations/whatsapp/<token>
//   token = per-tenant unguessable string (tenant.whatsappWebhookToken)
//
// GET  — Meta verification challenge (hub.mode=subscribe)
// POST — inbound messages + delivery status updates
//
// Webhooks NEVER 5xx (ADR-001 §11). Errors go in the JSON body.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, integrationEvent } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import {
  verifyWhatsAppSignature,
  verifySubscribeChallenge,
} from "@/platform/integrations/whatsapp/verifier";
import {
  extractFirstInboundTextMessage,
  type WhatsAppWebhookPayload,
} from "@/platform/integrations/whatsapp/types";
import { projectWhatsAppInbound } from "@/platform/integrations/whatsapp/projector";
import { log } from "@/platform/log";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

// Coarse flood guard, keyed by token+IP. A rate-limited webhook still
// returns 200 (ADR-001 §11: webhooks NEVER 5xx) with a body — the provider
// will not retry-storm us. Best-effort, per-instance limiter.
const WEBHOOK_LIMIT = 120; // requests
const WEBHOOK_WINDOW_MS = 60 * 1000; // per minute

async function resolveTenantFromToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const rows = await db
    .select({ id: tenant.id })
    .from(tenant)
    .where(eq(tenant.whatsappWebhookToken, token))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function ingestEvent(args: {
  tenantId: string;
  payload: WhatsAppWebhookPayload;
  signatureValid: boolean;
  rawBody: string;
}): Promise<{ ok: boolean; duplicate?: boolean; eventId?: string; reason?: string }> {
  const { tenantId, payload, signatureValid } = args;

  // Extract providerEventId from first message or entry id
  let providerEventId = payload.entry[0]?.id ?? "unknown";
  const firstMsg = extractFirstInboundTextMessage(payload);
  if (firstMsg) {
    providerEventId = firstMsg.messageId;
  }

  try {
    const rows = await withDrizzleTenant(tenantId, async (tx) => {
      return tx
        .insert(integrationEvent)
        .values({
          tenantId,
          provider: "whatsapp",
          providerEventId,
          signatureValid,
          rawPayload: payload as unknown as Record<string, unknown>,
          normalizedType: firstMsg ? "message.inbound" : "status.update",
          processingStatus: firstMsg ? "queued" : "acknowledged",
        })
        .onConflictDoNothing({
          target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
        })
        .returning();
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { ok: true, duplicate: true };
    return { ok: true, eventId: row.id };
  } catch (e) {
    log.error("whatsapp ingest failed", { tenantId, err: e });
    return { ok: false, reason: e instanceof Error ? e.message : "ingest failed" };
  }
}

// ─── GET: Subscribe verification ───────────────────────────────────────────

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  // Token is not actually needed for the challenge itself,
  // but we validate it exists to avoid leaking the endpoint.
  const tenantId = await resolveTenantFromToken(token);
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, reason: "unknown webhook token" },
      { status: 200 }
    );
  }

  const url = new URL(_req.url);
  const challenge = verifySubscribeChallenge({
    mode: url.searchParams.get("hub.mode") ?? undefined,
    verifyToken: url.searchParams.get("hub.verify_token") ?? undefined,
    challenge: url.searchParams.get("hub.challenge") ?? undefined,
  });

  if (!challenge.ok) {
    return NextResponse.json(
      { ok: false, reason: challenge.reason },
      { status: 200 }
    );
  }

  // Meta expects the raw challenge string back, not JSON.
  return new NextResponse(challenge.challenge, { status: 200 });
}

// ─── POST: Inbound messages ────────────────────────────────────────────────

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  const limit = rateLimit({
    key: `whatsapp:${token}:${clientIp(req)}`,
    limit: WEBHOOK_LIMIT,
    windowMs: WEBHOOK_WINDOW_MS,
  });
  if (!limit.ok) {
     
    console.warn("[whatsapp] rate limited", { retryAfter: limit.retryAfter });
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 200, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  const rawBody = await req.text();

  const tenantId = await resolveTenantFromToken(token);
  if (!tenantId) {
    log.warn("whatsapp webhook dropped: token did not resolve to a tenant");
    return NextResponse.json(
      { ok: false, reason: "unknown webhook token" },
      { status: 200 }
    );
  }

  const sig = verifyWhatsAppSignature(
    rawBody,
    req.headers.get("x-hub-signature-256")
  );
  if (!sig.ok) {
    log.warn("whatsapp signature rejected", { tenantId, reason: sig.reason });
    return NextResponse.json({ ok: false, reason: sig.reason }, { status: 200 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid JSON" },
      { status: 200 }
    );
  }

  // 1. Store raw event
  const ingest = await ingestEvent({ tenantId, payload, signatureValid: sig.valid, rawBody });
  if (!ingest.ok) {
    return NextResponse.json(ingest, { status: 200 });
  }
  if (ingest.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  // 2. Project inbound text messages
  const inbound = extractFirstInboundTextMessage(payload);
  if (!inbound) {
    // Status update or non-text message — acknowledged but no projection needed
    return NextResponse.json({ ok: true, acknowledged: true }, { status: 200 });
  }

  const project = await projectWhatsAppInbound({
    tenantId,
    from: inbound.from,
    name: inbound.name,
    body: inbound.body,
  });

  if (!project.ok) {
    // Mark event as failed so we can retry / inspect
    // TODO: update integration_event.processingStatus = "failed"
    return NextResponse.json(
      { ok: false, reason: project.reason, eventId: ingest.eventId },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      eventId: ingest.eventId,
      messageId: project.messageId,
      customerId: project.customerId,
      customerCreated: project.customerCreated,
      classification: project.classification?.intent,
      aiDrafted: !!project.aiReply,
    },
    { status: 200 }
  );
}
