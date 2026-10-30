import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/platform/db/client";
import {
  createDrizzleMetaStore,
  ingestMetaWebhook,
  processMetaMediaJobs,
  verifyMetaSignature,
} from "@/platform/integrations/meta/webhook";
import {
  createDrizzleWaCloudStore,
  ingestWaCloudWebhook,
  processWaCloudMediaJobs,
  WaCloudUnknownLineError,
} from "@/platform/integrations/meta/whatsapp-cloud";
import { log } from "@/platform/log";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

// Meta webhooks (Instagram DM + Facebook Messenger + WhatsApp Cloud API) →
// `message` rows.
//
// Unlike CallGear there is no per-tenant path token: the endpoint is
// subscribed per Meta APP, authenticity is the `X-Hub-Signature-256` HMAC of
// the raw body against META_APP_SECRET, and the tenant comes from the
// recipient account (META_ACCOUNT_TENANT in integrations/meta/webhook.ts) —
// or, for object="whatsapp_business_account", from META_WA_LINES
// ("phoneNumberId:lineSlug,…") + lines.ts (integrations/meta/whatsapp-cloud.ts).
//
// WhatsApp Cloud API envs (payloads arrive with
// object="whatsapp_business_account" on this same endpoint):
//   META_WA_LINES            — "phoneNumberId:tenantSlug[:lineSlug],…"
//                              (routing; an UNKNOWN number is a 500, never a
//                              default tenant — the JIVO_LINES rule)
//   META_WA_WABA_ID          — optional pin for entry.id (extra paranoia)
//   META_WA_TOKEN            — Bearer for media downloads (media id → url →
//                              bytes, both token-bearing; unset → placeholders
//                              stay, one warn). Same credential as below.
//   META_WA_ACCESS_TOKEN     — sender only (sendText/sendTemplate)
//   META_WA_PHONE_NUMBER_ID  — sender only: the number we send FROM
//
// Two response contracts:
//   GET  — Meta's verification handshake: echo hub.challenge when
//          hub.mode=subscribe and hub.verify_token matches
//          META_WEBHOOK_VERIFY_TOKEN, else 403.
//   POST — verify the signature, insert rows, answer 200 FAST. Attachment
//          downloads run after the response (Meta's CDN URLs expire, but Meta
//          also retries slow webhooks): the rows are already inserted, the
//          pm2 process keeps these promises alive, and a failed download just
//          leaves the `[image]`/`[file]` placeholder in the body.

const WEBHOOK_LIMIT = 120; // requests
const WEBHOOK_WINDOW_MS = 60 * 1000; // per minute

export async function GET(req: Request) {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!expected) {
    log.error("[meta] META_WEBHOOK_VERIFY_TOKEN is not set — cannot answer the handshake");
    return new Response("server misconfigured", { status: 500 });
  }
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token") ?? "";
  const challenge = url.searchParams.get("hub.challenge");
  const tokenOk =
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
  if (mode === "subscribe" && tokenOk && challenge !== null) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const limit = rateLimit({
    key: `meta:${clientIp(req)}`,
    limit: WEBHOOK_LIMIT,
    windowMs: WEBHOOK_WINDOW_MS,
  });
  if (!limit.ok) {
    log.warn("[meta] rate limited", { retryAfter: limit.retryAfter });
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      { status: 200, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  const rawBody = await req.text();

  // Fail CLOSED and loudly: an unsigned webhook endpoint writes stranger text
  // into the CRM of anyone who guesses the URL. 500 so the deploy gets fixed.
  const secret = process.env.META_APP_SECRET?.trim();
  if (!secret) {
    log.error("[meta] META_APP_SECRET is not set — refusing webhook POST");
    return NextResponse.json({ ok: false, reason: "server_misconfigured" }, { status: 500 });
  }
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"), secret)) {
    log.warn("[meta] signature rejected");
    return NextResponse.json({ ok: false, reason: "signature_mismatch" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid JSON" }, { status: 400 });
  }

  // WhatsApp Cloud API payloads take their own ingest path: routing by
  // phone_number_id (META_WA_LINES, JIVO_LINES-style — an unknown number is a
  // 500, never a default tenant), statuses[] logged at debug via the hook,
  // media downloads after the 200 (media id → expiring URL → bytes).
  if ((body as { object?: unknown } | null)?.object === "whatsapp_business_account") {
    const waStore = createDrizzleWaCloudStore(db);
    try {
      const wa = await ingestWaCloudWebhook(waStore, body, {
        onStatus: (s) =>
          log.debug("[meta] wa-cloud delivery receipt", {
            wamid: s.wamid,
            status: s.status,
            recipientId: s.recipientId,
            error: s.error,
          }),
      });
      // Media AFTER the 200 — same contract as the IG pass below.
      if (wa.mediaJobs.length > 0) {
        void processWaCloudMediaJobs(waStore, wa.mediaJobs).catch((e) => {
          log.warn("[meta] wa-cloud media pass failed", { error: e instanceof Error ? e.message : String(e) });
        });
      }
      const { statuses, mediaJobs: _waMediaJobs, ...counts } = wa;
      return NextResponse.json({ ok: true, ...counts, statuses: statuses.length }, { status: 200 });
    } catch (e) {
      if (e instanceof WaCloudUnknownLineError) {
        // Misconfiguration, not data: META_WA_LINES is missing this number.
        log.error("[meta] wa-cloud unknown phone_number_id — refusing (add it to META_WA_LINES)", {
          error: e.message,
        });
        return NextResponse.json({ ok: false, reason: e.message.slice(0, 200) }, { status: 500 });
      }
      // Same contract as below: never 5xx a data fault — dedupe absorbs retries.
      log.error("[meta] wa-cloud ingest failed", { error: e instanceof Error ? e.message : String(e) });
      return NextResponse.json(
        { ok: false, reason: e instanceof Error ? e.message.slice(0, 200) : "ingest failed" },
        { status: 200 }
      );
    }
  }

  const store = createDrizzleMetaStore(db);
  let result;
  try {
    result = await ingestMetaWebhook(store, body);
  } catch (e) {
    // Webhooks never 5xx for a DATA fault (Meta retries, and retries here are
    // safe — the extid dedupe absorbs them). Log and acknowledge.
    log.error("[meta] ingest failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { ok: false, reason: e instanceof Error ? e.message.slice(0, 200) : "ingest failed" },
      { status: 200 }
    );
  }

  // Media AFTER the 200 — see the header comment. Fire-and-forget, with its
  // own catch so a rejection can never surface as an unhandled one.
  if (result.mediaJobs.length > 0) {
    void processMetaMediaJobs(store, result.mediaJobs).catch((e) => {
      log.warn("[meta] media pass failed", { error: e instanceof Error ? e.message : String(e) });
    });
  }

  const { mediaJobs: _mediaJobs, ...counts } = result;
  return NextResponse.json({ ok: true, ...counts }, { status: 200 });
}
