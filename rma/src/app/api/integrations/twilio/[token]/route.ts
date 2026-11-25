import { NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { call, tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";

// Twilio status + recording callbacks. Tenant is bound to the unguessable
// path token (never to query params), same threat model as the CallGear
// webhook. Always 200 — a 5xx would make Twilio retry and duplicate updates.

export function generateTelephonyWebhookToken(): string {
  return randomBytes(32).toString("hex");
}

async function tenantFromToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const rows = await db
    .select({ id: tenant.id })
    .from(tenant)
    .where(eq(tenant.telephonyWebhookToken, token))
    .limit(1);
  return rows[0]?.id ?? null;
}

// X-Twilio-Signature: HMAC-SHA1(authToken, url + sorted POST params), base64.
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  header: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  // Fail-closed in live mode (swarm audit 2026-07-29): with the token
  // configured, a MISSING signature header used to pass — replay/forgery via
  // the path token alone. Unsigned is accepted only in mock (no token set).
  if (!authToken) return true;
  if (!header) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = createHmac("sha1", authToken).update(data).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

const STATUS_MAP: Record<string, string> = {
  queued: "initiated",
  initiated: "initiated",
  ringing: "ringing",
  "in-progress": "in-progress",
  answered: "in-progress",
  completed: "completed",
  busy: "busy",
  "no-answer": "no-answer",
  canceled: "failed",
  failed: "failed",
};

export async function POST(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const tenantId = await tenantFromToken(token);
  if (!tenantId) return NextResponse.json({ ok: false, reason: "unknown token" });

  const kind = new URL(req.url).searchParams.get("kind") ?? "status";
  const form = await req.formData();
  const params = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  if (!verifyTwilioSignature(req.url, params, req.headers.get("x-twilio-signature"))) {
    return NextResponse.json({ ok: false, reason: "signature_mismatch" });
  }

  const callSid = params.CallSid;
  if (!callSid) return NextResponse.json({ ok: false, reason: "missing CallSid" });

  try {
    if (kind === "inbound") return await handleInbound(tenantId, token, params);
    if (kind === "dial-status") return await handleDialStatus(tenantId, params);

    if (kind === "recording") {
      // Allowlist the host before it ever reaches call.recording_url — the QA
      // worker later fetches it with account credentials attached (SSRF +
      // cred leak found by the swarm audit). Anything else is dropped.
      const rawUrl = params.RecordingUrl ? `${params.RecordingUrl}.mp3` : null;
      const recordingUrl =
        rawUrl && /^https:\/\/[a-z0-9.-]*\.twilio\.com\//i.test(rawUrl) ? rawUrl : null;
      const d1 = Number(params.RecordingDuration);
      const duration = Number.isFinite(d1) ? d1 : null;
      await withDrizzleTenant(tenantId, (tx) =>
        tx.execute(sql`
          UPDATE "call" SET recording_url = coalesce(${recordingUrl}, recording_url),
                            duration_sec = coalesce(${duration}, duration_sec),
                            updated_at = now()
          WHERE provider_call_id = ${callSid}
        `)
      );
      return NextResponse.json({ ok: true, kind });
    }

    const status = STATUS_MAP[params.CallStatus ?? ""] ?? "initiated";
    const d2 = Number(params.CallDuration);
    const duration = Number.isFinite(d2) ? d2 : null;
    await withDrizzleTenant(tenantId, (tx) =>
      tx.execute(sql`
        UPDATE "call" SET status = ${status},
                          duration_sec = coalesce(${duration}, duration_sec),
                          updated_at = now()
        WHERE provider_call_id = ${callSid}
      `)
    );
    return NextResponse.json({ ok: true, kind });
  } catch (e) {
    console.error("[twilio-webhook]", (e as Error).message);
    return NextResponse.json({ ok: false, reason: "internal" });
  }
}

// ── Inbound voice (P2) ──────────────────────────────────────────────────────
// Twilio number's Voice URL = ...?kind=inbound. We log the call, attach it to
// the caller's lead (or CREATE one — unknown callers are exactly the leads
// CallGear used to mint), then forward to the duty phone. The forwarded leg
// reports back via ?kind=dial-status; a missed leg pings the brand owner.
async function handleInbound(
  tenantId: string,
  token: string,
  params: Record<string, string>
): Promise<NextResponse> {
  const from = (params.From ?? "").replace(/\D/g, "");
  const tail = from.slice(-9);
  const base = process.env.APP_BASE_URL?.trim() ?? "http://localhost:3000";
  const dutyPhone = process.env.TWILIO_DUTY_PHONE?.trim();
  const dialStatusUrl = `${base}/api/integrations/twilio/${token}?kind=dial-status`;
  const recordingUrl = `${base}/api/integrations/twilio/${token}?kind=recording`;

  const { lead, call } = await import("@/platform/db/schema");
  const { PG_NON_DIGIT_RE } = await import("@/platform/messaging/phone");

  const { leadId, customerId, leadName } = await withDrizzleTenant(tenantId, async (tx) => {
    let leadId: string | null = null;
    let leadName: string | null = null;
    if (tail.length >= 9) {
      const [found] = ((await tx.execute(sql`
        SELECT id, customer_name FROM lead
        WHERE right(regexp_replace(coalesce(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), 9) = ${tail}
        ORDER BY created_at DESC LIMIT 1
      `)) as unknown as { rows: { id: string; customer_name: string | null }[] }).rows;
      if (found) {
        leadId = found.id;
        leadName = found.customer_name;
      }
    }
    if (!leadId) {
      // Unknown caller → auto-lead with full provenance (source = inbound call).
      const ins = await tx
        .insert(lead)
        .values({
          tenantId,
          customerName: leadName ?? `Call ${from}`,
          phone: from,
          source: "call:inbound",
          status: "new",
          notes: `Auto-created from an inbound phone call on ${new Date().toISOString().slice(0, 10)}.`,
        })
        .returning({ id: lead.id });
      leadId = ins[0].id;
    }
    const custId = null; // customer stitching is the stitcher's job, same as messages
    return { leadId, customerId: custId, leadName };
  });

  // Log the inbound call row (manager = duty user once known; for now the
  // platform admin placeholder is avoided — manager_id is set when the duty
  // leg is answered; use the tenant's first sales member as fallback).
  const managerId = await withDrizzleTenant(tenantId, async (tx) => {
    const [m] = ((await tx.execute(sql`
      SELECT u.id FROM "user" u
      JOIN tenant_member tm ON tm.user_id = u.id AND tm.tenant_id = ${tenantId}
      WHERE tm.roles && ARRAY['sales','sales_manager','general_manager']::text[]
      ORDER BY u.created_at LIMIT 1
    `)) as unknown as { rows: { id: string }[] }).rows;
    return m?.id ?? null;
  });

  if (managerId) {
    await withDrizzleTenant(tenantId, (tx) =>
      tx.insert(call).values({
        tenantId,
        leadId,
        customerId,
        managerId,
        direction: "inbound",
        phone: from,
        provider: "twilio",
        providerCallId: callSid(params),
        status: "ringing",
      })
    );
  }

  const label = leadName ? `Lead: ${leadName}` : `New caller: ${from}`;
  const twiml = dutyPhone
    ? `<Response><Dial record="record-from-answer-dual" recordingStatusCallback="${recordingUrl}" action="${dialStatusUrl}" method="POST" timeout="25">${dutyPhone}</Dial></Response>`
    : `<Response><Say>No one is available right now. Please send us a WhatsApp message.</Say></Response>`;
  void label;
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

function callSid(params: Record<string, string>): string {
  return params.CallSid ?? params.DialCallSid ?? "";
}

async function handleDialStatus(tenantId: string, params: Record<string, string>): Promise<NextResponse> {
  const sid = params.CallSid ?? "";
  const dialStatus = params.DialCallStatus ?? "";
  const status = dialStatus === "completed" ? "completed" : dialStatus === "no-answer" || dialStatus === "busy" ? "missed" : "failed";
  const d3 = Number(params.DialCallDuration);
  const duration = Number.isFinite(d3) ? d3 : null;
  await withDrizzleTenant(tenantId, (tx) =>
    tx.execute(sql`
      UPDATE "call" SET status = ${status}, duration_sec = coalesce(${duration}, duration_sec), updated_at = now()
      WHERE provider_call_id = ${sid}
    `)
  );
  if (status === "missed") {
    // Missed call = hot incident for the brand owner (WA/TG ping via the
    // standard notify path). Owner key by brand: rent line → babek, sales → mohammed.
    const { sendNotification } = await import("@/modules/notify/send");
    const { tenant } = await import("@/platform/db/schema");
    const [t] = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
    const ownerKey = t?.slug === "take-auto" ? "mohammed" : "babek";
    const from = (params.From ?? "").replace(/\D/g, "");
    await sendNotification(tenantId, {
      kind: "call_missed",
      target: { ownerKey },
      text: `📵 Missed call from ${from || "unknown"} — call them back.`,
      dedupeKey: `missed:${sid}`,
      entityType: "call",
      entityId: sid,
    });
  }
  return NextResponse.json({ ok: true });
}
