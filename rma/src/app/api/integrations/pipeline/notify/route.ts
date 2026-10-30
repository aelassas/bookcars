// Pipeline notify endpoint — receives automation events from the Twenty
// pipelines app (logic functions running on this same host) and delivers
// staff Telegram nudges.
//
// Endpoint: POST /api/integrations/pipeline/notify
// Auth:     header `x-pipeline-token` must match env PIPELINE_NOTIFY_TOKEN.
//           A shared workspace-level secret (not per-tenant): the Twenty
//           workspace is shared across brands; routing to the right staff
//           chat happens by `brandLine` in the body.
//
// Chat routing (env, per brand with a common fallback):
//   PIPELINE_NOTIFY_CHAT_ID            fallback group for every brand
//   PIPELINE_NOTIFY_CHAT_ID_TAKE_AUTO  take-auto (leasing) override
//   PIPELINE_NOTIFY_CHAT_ID_CARDIWAN   cardiwan override
//   PIPELINE_NOTIFY_CHAT_ID_ETM        etm/easyrent override
// No chat id configured → ok:false in the body, still HTTP 200 (ADR-001 §11:
// inbound automation endpoints never 5xx; the caller treats send failure as
// non-fatal anyway).

import { NextResponse } from "next/server";
import { notifyTelegram } from "@/platform/notify/telegram";
import { log } from "@/platform/log";
import { clientIp, rateLimit } from "@/platform/security/rate-limit";

const LIMIT = 60; // requests
const WINDOW_MS = 60 * 1000;

const KINDS = new Set(["booked", "ending_reminder", "overdue", "tars_task"]);

function chatIdForBrand(brandLine: string | undefined): string | null {
  const key = (brandLine ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  const specific = key ? process.env[`PIPELINE_NOTIFY_CHAT_ID_${key}`]?.trim() : "";
  return specific || process.env.PIPELINE_NOTIFY_CHAT_ID?.trim() || null;
}

export async function POST(req: Request) {
  const limit = rateLimit({ key: `pipeline-notify:${clientIp(req)}`, limit: LIMIT, windowMs: WINDOW_MS });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" });
  }

  const expected = process.env.PIPELINE_NOTIFY_TOKEN?.trim();
  if (!expected) {
    log.error("pipeline-notify: PIPELINE_NOTIFY_TOKEN is not set");
    return NextResponse.json({ ok: false, error: "not_configured" });
  }
  const got = req.headers.get("x-pipeline-token")?.trim();
  if (!got || got !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { kind?: string; brandLine?: string; text?: string; dealId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!body.kind || !KINDS.has(body.kind) || typeof body.text !== "string" || body.text.length === 0) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const chatId = chatIdForBrand(body.brandLine);
  if (!chatId) {
    log.warn(`pipeline-notify: no chat id for brand=${body.brandLine ?? "?"} kind=${body.kind}`);
    return NextResponse.json({ ok: false, error: "no_chat_configured" });
  }

  const sent = await notifyTelegram(chatId, body.text.slice(0, 4000));
  if (!sent.ok) log.warn(`pipeline-notify: telegram failed kind=${body.kind}: ${sent.error}`);
  return NextResponse.json(sent.ok ? { ok: true } : { ok: false, error: sent.error });
}
