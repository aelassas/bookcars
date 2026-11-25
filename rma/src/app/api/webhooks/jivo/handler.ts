import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/platform/db/client";
import {
  createDrizzleJivoStore,
  ingestJivoWebhook,
  JivoUnknownSiteError,
} from "@/platform/integrations/jivo/webhook";
import { jivoAutoReplyFromEnv, jivoBotConfigFromEnv, sendBotText } from "@/platform/integrations/jivo/sender";
import { log } from "@/platform/log";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

// JivoChat webhooks (Webhooks API `event_name` + Bot API `event` payloads) →
// `message` rows. One endpoint serves BOTH JivoChat accounts; the account is
// identified by the payload's site_id and routed through JIVO_LINES
// (integrations/jivo/webhook.ts) — an unknown site_id is a 500, never a
// default tenant.
//
// Auth: Jivo signs nothing. The shared secret is JIVO_WEBHOOK_TOKEN, presented
// either as `?token=` (Webhooks API — we paste the full URL into the account's
// webhook field) or as a PATH segment (Bot API — Jivo posts to
// `{bot_endpoint}/{token}`, served by the [token] sibling route). Unset token
// → 500, fail CLOSED: an unsigned webhook endpoint writes stranger text into
// the CRM of anyone who guesses the URL.
//
// Response contract: always {result:"ok"}-shaped on success (Jivo's parser
// looks for it), 200 for data faults (dedupe absorbs retries), 500 only for
// misconfiguration (unset token, unknown site_id) — loud, so the deploy gets
// fixed. The auto-ack (JIVO_AUTOREPLY, default OFF) fires AFTER the 200 —
// same fire-and-forget pattern as the Meta media pass; the pm2 process keeps
// the promise alive.

const WEBHOOK_LIMIT = 120; // requests
const WEBHOOK_WINDOW_MS = 60 * 1000; // per minute

function tokenMatches(given: string | null, expected: string): boolean {
  return (
    given !== null &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"))
  );
}

/** Shared by route.ts (query token) and [token]/route.ts (path token). */
export async function handleJivoPost(req: Request, pathToken: string | null) {
  const limit = rateLimit({
    key: `jivo:${clientIp(req)}`,
    limit: WEBHOOK_LIMIT,
    windowMs: WEBHOOK_WINDOW_MS,
  });
  if (!limit.ok) {
    log.warn("[jivo] rate limited", { retryAfter: limit.retryAfter });
    return NextResponse.json(
      { result: "error", ok: false, reason: "rate_limited" },
      { status: 200, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  const expected = process.env.JIVO_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    log.error("[jivo] JIVO_WEBHOOK_TOKEN is not set — refusing webhook POST");
    return NextResponse.json({ result: "error", ok: false, reason: "server_misconfigured" }, { status: 500 });
  }
  const given = pathToken ?? new URL(req.url).searchParams.get("token");
  if (!tokenMatches(given, expected)) {
    log.warn("[jivo] token rejected");
    return NextResponse.json({ result: "error", ok: false, reason: "token_mismatch" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ result: "error", ok: false, reason: "invalid JSON" }, { status: 400 });
  }

  const store = createDrizzleJivoStore(db);
  let result;
  try {
    result = await ingestJivoWebhook(store, body);
  } catch (e) {
    if (e instanceof JivoUnknownSiteError) {
      // Misconfiguration, not data: JIVO_LINES is missing this account.
      log.error("[jivo] unknown site_id — refusing (add it to JIVO_LINES)", {
        error: e.message,
      });
      return NextResponse.json(
        { result: "error", ok: false, reason: e.message.slice(0, 200) },
        { status: 500 }
      );
    }
    // Never 5xx a DATA fault — Jivo retries, and retries here are safe (the
    // extid dedupe absorbs them). Log and acknowledge.
    log.error("[jivo] ingest failed", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json(
      { result: "ok", ok: false, reason: e instanceof Error ? e.message.slice(0, 200) : "ingest failed" },
      { status: 200 }
    );
  }

  for (const eventName of result.ignoredEvents) {
    log.info("[jivo] non-message event ignored", { event: eventName });
  }

  // Auto-ack AFTER the 200 (see the header comment). Default OFF; a missing
  // provider id with the flag on is a loud skip, never a send to a guess.
  const auto = jivoAutoReplyFromEnv();
  if (auto.enabled && result.ackJobs.length > 0) {
    const botCfg = jivoBotConfigFromEnv();
    if (!botCfg) {
      log.warn("[jivo] JIVO_AUTOREPLY is on but JIVO_BOT_PROVIDER_ID/JIVO_WEBHOOK_TOKEN is incomplete — ack skipped");
    } else {
      void Promise.allSettled(result.ackJobs.map((job) => sendBotText(botCfg, job, auto.text))).then((settled) => {
        settled.forEach((s, i) => {
          const failure = s.status === "rejected" ? String(s.reason) : s.value.ok ? null : s.value.error;
          if (failure) {
            log.warn("[jivo] auto-ack failed", { chatId: result.ackJobs[i].chatId, error: failure.slice(0, 200) });
          }
        });
      });
    }
  }

  const { ackJobs: _ackJobs, ...counts } = result;
  return NextResponse.json({ result: "ok", ok: true, ...counts, acks: result.ackJobs.length }, { status: 200 });
}
