// CallGear webhook handler — authorizes tenant via per-tenant path token,
// verifies signature, writes the raw event to integration_event. Webhooks
// NEVER 5xx (ADR-001 §11) — failures land in the response body as
// `{ok:false, reason:...}` and the provider stops retrying.
//
// Two threat models we defend against:
//   1) Forged events that don't come from CallGear. Mitigated by
//      verifyCallGearSignature using a shared secret HMAC.
//   2) Cross-tenant injection — an attacker writing rows into someone
//      else's `integration_event`. Mitigated by binding the tenant to an
//      unguessable token in the URL path (`/:token`), looked up server-side.
//      Tenant identity is NEVER taken from the query string.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { integrationEvent, tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import type {
  CallGearCallFinishedParams,
  CallGearCallFinishedRequest,
  CallGearJsonRpcRequest,
} from "./types";

export interface IngestResult {
  ok: boolean;
  duplicate?: boolean;
  reason?: string;
  eventId?: string;
}

export type SignatureCheck =
  | { ok: true; valid: boolean }
  | { ok: false; reason: "signature_required" | "signature_mismatch" };

/**
 * Generate a 32-byte (64-hex-char) random token for binding a tenant to
 * its inbound webhook URL. Unguessable; never exposed in error messages.
 */
export function generateCallGearWebhookToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Verify the HMAC-SHA256 signature on the raw body.
 *
 * Tri-state behavior so the audit log is honest:
 * - secret set + header matches  → { ok:true, valid:true }
 * - secret set + header wrong    → { ok:false, reason:"signature_mismatch" }
 * - secret set + header missing  → { ok:true, valid:false } — the UIS/CoMagic
 *   notification panel (what CallGear actually runs on) cannot HMAC-sign its
 *   POSTs; the 64-hex per-brand path token remains the tenant credential.
 *   A header that IS present must still verify — no downgrade attack.
 * - secret unset + production    → { ok:false, reason:"signature_required" } (fail closed)
 * - secret unset + non-production → { ok:true, valid:false } (accept, but record honestly)
 *
 * Recording `valid:false` for unsigned-but-accepted events keeps the audit
 * log honest instead of lying via signatureValid:true.
 */
export function verifyCallGearSignature(
  rawBody: string,
  signatureHeader: string | null
): SignatureCheck {
  const secret = process.env.CALLGEAR_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "signature_required" };
    }
    return { ok: true, valid: false };
  }
  if (!signatureHeader) {
    return { ok: true, valid: false };
  }
  const given = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (given.length !== expected.length) {
    return { ok: false, reason: "signature_mismatch" };
  }
  let match: boolean;
  try {
    match = timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return { ok: false, reason: "signature_mismatch" };
  }
  return match
    ? { ok: true, valid: true }
    : { ok: false, reason: "signature_mismatch" };
}

/**
 * Look up the tenant id for a webhook path token. Constant-format check
 * before touching the DB. Returns null when no tenant has this token —
 * caller writes nothing.
 */
export async function resolveTenantFromToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const rows = await db
    .select({ id: tenant.id })
    .from(tenant)
    .where(eq(tenant.callgearWebhookToken, token))
    .limit(1);
  return rows[0]?.id ?? null;
}

/**
 * The ONE-notification reality: the UIS/CoMagic panel sends EVERY call to a
 * single URL, so the brand is decided by the payload's virtual_phone_number
 * (the line the customer dialed), mapped via tenant.callgear_virtual_number.
 * The path token remains the authenticity gate + the catch-all for numbers
 * not mapped yet (those land in the unmapped-bucket tenant the single
 * notification points at — see resolveTenantForWebhook's caller).
 */
export async function resolveTenantForWebhook(
  token: string,
  virtualPhoneNumber: string | null
): Promise<string | null> {
  const digits = virtualPhoneNumber?.replace(/\D/g, "") ?? "";
  if (digits.length >= 7) {
    // callgear_virtual_number holds the brand's line(s), comma-separated when
    // a brand runs several numbers (EasyRent/ETM: three lines, one desk).
    const mapped = await db
      .select({ id: tenant.id, lines: tenant.callgearVirtualNumber })
      .from(tenant)
      .where(isNotNull(tenant.callgearVirtualNumber));
    const hit = mapped.find((t) =>
      (t.lines ?? "").split(",").map((s) => s.trim()).includes(digits)
    );
    if (hit) return hit.id;
  }
  return resolveTenantFromToken(token);
}

/** virtual_phone_number from either payload dialect (see uis-normalize). */
export function extractVirtualPhoneNumber(parsed: unknown): string | null {
  const p = parsed as Record<string, unknown> | null;
  const direct = p?.virtual_phone_number;
  if (typeof direct === "string" && direct) return direct;
  const params = p?.params as Record<string, unknown> | undefined;
  const nested = params?.virtualNumber ?? params?.to;
  return typeof nested === "string" && nested ? nested : null;
}

/**
 * Normalize the UIS/CoMagic notification JSON into our internal
 * call.finished JSON-RPC shape. CallGear runs on the UIS engine; its HTTP
 * notification posts a flat JSON (virtual_phone_number, contact_phone_number,
 * external_id, notification_time, …), NOT our reference JSON-RPC. Already
 * JSON-RPC payloads pass through untouched. The original body is preserved
 * under `uis_raw` for the later field-map polish (duration/recording/agent
 * keys get confirmed by the first live payload).
 */
export function normalizeToCallFinished(raw: unknown): CallGearCallFinishedRequest {
  const body = raw as Partial<CallGearJsonRpcRequest> & Record<string, unknown>;
  if (body && body.jsonrpc === "2.0" && typeof body.method === "string") {
    return body as CallGearCallFinishedRequest;
  }
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : undefined;
  const num = (v: unknown): number | undefined => {
    const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  // UIS nests the parties: contact_info.{contact_phone_number,
  // communication_number} and employee_info.{employee_name,…} (seen in the
  // panel's own template 2026-08-08); flat keys are kept as fallbacks.
  const contactInfo = (body?.contact_info ?? {}) as Record<string, unknown>;
  const employeeInfo = (body?.employee_info ?? {}) as Record<string, unknown>;
  // Live templates captured from the delivery log + real payloads 2026-08-10:
  // recording link at call_record_file_info.file_link (+call_record_duration);
  // call facts under call_info.{call_session_id(number!), direction("in"/"out"),
  // talk_time_duration, scenario_name}; campaign tags at top level.
  const recordInfo = (body?.call_record_file_info ?? {}) as Record<string, unknown>;
  const callInfo = (body?.call_info ?? {}) as Record<string, unknown>;
  const recordUrl =
    str(recordInfo.file_link) ?? str(body?.file_link) ?? str(body?.record_link) ?? str(body?.recording_url);
  // notification_time is the account-local wall clock (no offset): at TAKE it
  // runs MSK (UTC+3) — verified against received_at on a live event. Stamp it
  // with +03:00 so card times aren't off by hours.
  const rawTime = str(body?.notification_time) ?? str(body?.start_time);
  const time = rawTime
    ? new Date(rawTime.replace(" ", "T") + "+03:00").toISOString()
    : new Date().toISOString();
  const agentName =
    str(body?.employee_full_name) ??
    str(employeeInfo.employee_name) ??
    str(employeeInfo.name) ??
    str(employeeInfo.employee_full_name);
  const agentId = str(body?.employee_id) ?? str(employeeInfo.employee_id) ?? str(employeeInfo.id);
  const agentExt = str(employeeInfo.employee_extension) ?? str(employeeInfo.extension);
  const dirRaw = str(callInfo.direction) ?? str(body?.direction);
  const direction = dirRaw === "in" ? "inbound" : dirRaw === "out" ? "outbound" : dirRaw ?? "inbound";
  const duration =
    num(callInfo.talk_time_duration) ??
    num(body?.duration) ??
    num(body?.talk_duration) ??
    num(recordInfo.call_record_duration) ??
    num(body?.file_duration) ??
    0;
  // call_session_id is the shared call key across the call-end and recording
  // events (a NUMBER in the call-end payload!) — prefer it over external_id
  // so the pair dedupes into ONE opportunity.
  const callId =
    str(callInfo.call_session_id) ?? str(body?.call_session_id) ?? str(body?.external_id) ?? `uis-${Date.now()}`;
  const params: CallGearCallFinishedParams = {
    callId,
    startTime: time,
    endTime: str(body?.end_time) ?? time,
    duration,
    direction,
    from: str(contactInfo.contact_phone_number) ?? str(body?.contact_phone_number) ?? str(body?.caller) ?? "",
    to:
      str(body?.virtual_phone_number) ??
      str(contactInfo.communication_number) ??
      str(body?.communication_number) ??
      "",
    ...(recordUrl ? { recordingUrl: recordUrl } : {}),
    ...(agentName
      ? {
          agent: {
            name: agentName,
            ...(agentId ? { id: agentId } : {}),
            ...(agentExt ? { extension: agentExt } : {}),
          },
        }
      : {}),
    // Attribution + tags: which line scenario/site/campaign the call came
    // through, and the operator's tags (e.g. "Нецелевой контакт").
    metadata: {
      ...(str(callInfo.scenario_name) ? { scenario: str(callInfo.scenario_name) } : {}),
      ...(str(body?.site_domain_name) ? { site: str(body?.site_domain_name) } : {}),
      ...(str(body?.advertising_campaign) ? { campaign: str(body?.advertising_campaign) } : {}),
      ...(Array.isArray(body?.tag_names) && (body.tag_names as unknown[]).length
        ? { tags: (body.tag_names as unknown[]).filter((t) => typeof t === "string") }
        : {}),
    },
  };
  return {
    jsonrpc: "2.0",
    method: "call.finished",
    id: str(body?.external_id) ?? null,
    params,
    // Original notification body, for the payload-shape polish after the
    // first live events — nothing is lost by normalizing at the edge.
    ...({ uis_raw: body } as Record<string, unknown>),
  } as CallGearCallFinishedRequest;
}

export async function ingestCallGearEvent(args: {
  tenantId: string;
  parsed: CallGearCallFinishedRequest;
  signatureValid: boolean;
}): Promise<IngestResult> {
  const { tenantId, parsed, signatureValid } = args;
  const params = parsed.params;
  if (!params || typeof params.callId !== "string") {
    return { ok: false, reason: "missing callId" };
  }

  const normalizedType =
    parsed.method === "call.finished" ? "call.finished" : parsed.method;

  try {
    const rows = await withDrizzleTenant(tenantId, async (tx) => {
      return tx
        .insert(integrationEvent)
        .values({
          tenantId,
          provider: "callgear",
          providerEventId: params.callId,
          signatureValid,
          rawPayload: parsed as unknown as Record<string, unknown>,
          normalizedType,
        })
        // CallGear sends TWO notifications per call (call-ended, then
        // recording-ready), both normalized to the SAME callId. Dropping the
        // second one at the edge starves recordings → transcripts (audit
        // 2026-08-14). Instead: when the duplicate brings a recordingUrl the
        // stored row lacks, merge its params in (stored keys win on conflict
        // — the recording half carries no agent/direction facts to lose) and
        // requeue the event so the relay's enrich pass fills the card and
        // the transcriber becomes eligible. Any other duplicate is ignored
        // exactly as before.
        .onConflictDoUpdate({
          target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
          set: {
            rawPayload: sql`jsonb_set(${integrationEvent.rawPayload}, '{params}', COALESCE(excluded.raw_payload->'params', '{}'::jsonb) || COALESCE(${integrationEvent.rawPayload}->'params', '{}'::jsonb))`,
            processingStatus: sql`CASE WHEN ${integrationEvent.processingStatus} IN ('done', 'failed', 'dead') THEN 'queued' ELSE ${integrationEvent.processingStatus} END`,
            processingError: sql`NULL`,
          },
          setWhere: sql`COALESCE(excluded.raw_payload->'params'->>'recordingUrl', '') <> '' AND COALESCE(${integrationEvent.rawPayload}->'params'->>'recordingUrl', '') = ''`,
        })
        .returning();
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return { ok: true, duplicate: true };
    return { ok: true, eventId: row.id };
  } catch (e) {
    // Even DB errors don't 5xx — log and acknowledge so CallGear stops retrying.
    console.error("[callgear] ingest failed:", e);
    return { ok: false, reason: e instanceof Error ? e.message : "ingest failed" };
  }
}
