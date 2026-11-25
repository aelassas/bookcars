// WhatsApp Cloud API — the OFFICIAL Meta transport, running in parallel with
// the unofficial Baileys observers (hybrid strategy, owner 2026-09-19):
// Cloud API serves the notification bot line and the two rental MAIN lines
// (+971564048816 ETM / +971569808087 Cardiwan); Baileys observers stay on the
// agent lines.
//
// Two halves in one module, both env-driven:
//
//   INBOUND  — `object:"whatsapp_business_account"` webhook payloads
//   (entry[].changes[] where field="messages": value.messages[] are inbound
//   customer messages, value.statuses[] are delivery receipts for our
//   outbound), dispatched from app/api/webhooks/meta/route.ts (same GET
//   handshake + X-Hub-Signature-256 HMAC as IG/FB — one Meta app, one
//   secret). Inbound rows land in the SAME `message` table the wa-lead relay
//   already reads, as channel 'whatsapp' (NOT 'whatsapp-cloud'): the relay's
//   loadRows filters `channel IN ('whatsapp','telegram','instagram',
//   'messenger')` and routes whatsapp rows by `to` = line slug, so a distinct
//   channel would hide these threads from the relay/qualifier for zero gain.
//   Unlike Baileys rows there is NO @lid problem — value.contacts[].wa_id is
//   the customer's real E.164 phone, so `from` is dialable digits from the
//   first byte. Dedupe rides (tenant_id, external_message_id) with the raw
//   wamid as the extid — wamids are self-namespacing ("wamid.…") and Meta is
//   at-least-once, so ON CONFLICT DO NOTHING carries the retries.
//
//   OUTBOUND — sendText / sendTemplate against
//   POST graph.facebook.com/v21.0/<META_WA_PHONE_NUMBER_ID>/messages.
//   Pure-ish: the config (token + phone number id) is passed in, built once
//   by waCloudConfigFromEnv; API failures return {ok:false}, never throw.
//
// Tenant routing is JIVO_LINES-style: META_WA_LINES =
// "phoneNumberId:tenantSlug[:lineSlug],…" keyed on value.metadata.
// phone_number_id. An UNKNOWN phone_number_id (or a malformed pair, or a
// lineSlug that lines.ts does not know) THROWS WaCloudUnknownLineError and
// the route answers 500 — a config gap fails loud, NEVER defaults to a
// tenant (the standing lesson: a wrong tenant re-files the archive onto the
// wrong desk). The optional third segment pins the lines.ts slug the rows
// file under (`to` = slug → brand chip, owner routing, the distributor's
// reply-line watch); without it `to` falls back to the tenant slug label.
//
// Reactions mirror wa-observer/bridge.js byte-for-byte in spirit: a 👍 on an
// assignment ping is lead acceptance (0075). Cloud reactions carry
// reaction.message_id = the wamid of the reacted-to message, so the same
// INSERT…SELECT joins wa_reaction to wa_outbox on wa_message_id — as soon as
// a sender writes Cloud API wamids into wa_outbox.wa_message_id, 👍-acceptance
// works on cloud numbers with ZERO distributor changes. Reactions matching no
// outbox row insert nothing (same as hand-typed messages on the bridge). A
// removed reaction arrives with an empty emoji and OVERWRITES — an un-👍
// un-accepts a card the sweeper has not processed yet. And the reactor is a
// REAL PHONE here (no wa_identity fallback needed).
//
// Statuses (sent/delivered/read/failed receipts) are parsed and handed to the
// route's hook, which logs at DEBUG only — nothing is persisted yet.
//
// Media (image/audio/video/document) arrives as a media ID, not a URL:
//   GET graph.facebook.com/v21.0/<media-id>  (Bearer)  → { url }
//   GET <url>                                 (Bearer — expires ~5 min)
// Downloads run AFTER the webhook's 200 (fire-and-forget, like the IG pass),
// into the "wa" MEDIA_ROOT as wa/<lineSlug>/<wamid>.<ext>, then media_path is
// stamped on the row. No token (META_WA_TOKEN / META_WA_ACCESS_TOKEN unset) →
// one warn and the row keeps its house placeholder ([image] / [voice/audio] /
// [document] + filename/caption) — the same degradation as the IG pass.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { isMappedLine } from "@/modules/messaging/lines";
import { mediaFilePath } from "@/platform/media/token";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { log } from "@/platform/log";

type PlatformDb = typeof platformDb;

// ─── Env-driven config ──────────────────────────────────────────────────────

/** Misconfiguration, not data — the route maps this to a 500 (Jivo rule). */
export class WaCloudUnknownLineError extends Error {}

export interface WaCloudLine {
  phoneNumberId: string;
  tenantSlug: string;
  /** lines.ts slug the rows file under (`to`), when configured. */
  lineSlug: string | null;
}

const TENANT_SLUG_RE = /^[a-z][a-z0-9-]*$/;

/**
 * META_WA_LINES: "phoneNumberId:tenantSlug[:lineSlug],…" — which of OUR Cloud
 * API numbers files under which platform tenant (and optionally which
 * lines.ts line slug). A malformed pair throws: a half-parsed routing table
 * is how a stranger's chats land on the wrong desk.
 */
export function waCloudLineMap(
  env: Record<string, string | undefined> = process.env
): Record<string, WaCloudLine> {
  const raw = env.META_WA_LINES?.trim();
  if (!raw) return {};
  const out: Record<string, WaCloudLine> = {};
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const [id, tenantSlug, lineSlug] = trimmed.split(":").map((s) => s.trim());
    if (!id || !tenantSlug || !TENANT_SLUG_RE.test(tenantSlug)) {
      throw new WaCloudUnknownLineError(
        `malformed META_WA_LINES entry: "${trimmed}" (expected phoneNumberId:tenantSlug[:lineSlug])`
      );
    }
    if (lineSlug && !isMappedLine(lineSlug)) {
      throw new WaCloudUnknownLineError(
        `META_WA_LINES entry "${trimmed}" names line slug "${lineSlug}" that lines.ts does not know`
      );
    }
    out[id] = { phoneNumberId: id, tenantSlug, lineSlug: lineSlug || null };
  }
  return out;
}

/**
 * phone_number_id → routing. THROWS on an unknown id — never a default
 * tenant. Called for ANY event-bearing change (messages, statuses,
 * reactions), not just message-bearing ones: an unmapped number posting to
 * us is a config gap, and config gaps fail loud.
 */
export function resolveWaCloudLine(
  phoneNumberId: string,
  env: Record<string, string | undefined> = process.env
): WaCloudLine {
  const line = waCloudLineMap(env)[phoneNumberId];
  if (!line) {
    throw new WaCloudUnknownLineError(
      `unknown WhatsApp phone_number_id "${phoneNumberId}" — add it to META_WA_LINES (phoneNumberId:tenantSlug[:lineSlug])`
    );
  }
  return line;
}

export interface WaCloudConfig {
  accessToken: string;
  phoneNumberId: string;
  graphBaseUrl: string;
  apiVersion: string;
}

/** Sender credentials from env; null (never a throw) when unconfigured. */
export function waCloudConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): WaCloudConfig | null {
  const accessToken = env.META_WA_ACCESS_TOKEN?.trim() || env.META_WA_TOKEN?.trim();
  const phoneNumberId = env.META_WA_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId, graphBaseUrl: "https://graph.facebook.com", apiVersion: "v21.0" };
}

// ─── Inbound: webhook parse ─────────────────────────────────────────────────

/** One normalized inbound Cloud API message, ready to insert into `message`. */
export interface WaCloudInbound {
  line: WaCloudLine;
  /** The customer's E.164 digits (no +) — a real phone, unlike ig:/fb: ids. */
  fromDigits: string;
  customerName: string | null;
  wamid: string;
  body: string;
  at: Date;
  /** Set on media messages — the post-200 download resolves it. */
  media: { id: string; mimeType: string | null; filename: string | null } | null;
}

/** One inbound reaction (👍-acceptance on assignment pings — see 0075). */
export interface WaCloudReaction {
  line: WaCloudLine;
  /** wamid of the REACTED-TO message — joins wa_outbox.wa_message_id. */
  messageId: string;
  reactorJid: string;
  /** Real digits, always — Cloud API has no @lid. */
  reactorPhone: string;
  /** "" = the reaction was removed (overwrites the previous emoji). */
  emoji: string;
  at: Date;
}

/** One delivery receipt for one of OUR outbound messages (statuses[]). */
export interface WaCloudStatus {
  wamid: string;
  /** sent | delivered | read | failed | anything Meta adds later. */
  status: string;
  recipientId: string | null;
  at: Date;
  error: string | null;
}

export interface WaCloudWebhookParse {
  messages: WaCloudInbound[];
  reactions: WaCloudReaction[];
  statuses: WaCloudStatus[];
  /** contentless events, malformed rows — counted, never stored. */
  skippedNonMessage: number;
  /** entry.id ≠ META_WA_WABA_ID when the WABA id is pinned. */
  skippedUnknownWaba: number;
}

/** Cloud API message type → the house placeholder vocabulary (observer-compatible). */
function waCloudPlaceholder(type: string): string {
  switch (type) {
    case "image":
      return "[image]";
    case "video":
      return "[video]";
    case "audio":
    case "voice":
      return "[voice/audio]";
    case "document":
      return "[document]";
    case "location":
      return "[location]";
    // sticker / contacts / unsupported / unknown — one honest bucket.
    default:
      return "[non-text]";
  }
}

/** Media types whose payload carries a downloadable Graph API media id. */
const WA_CLOUD_MEDIA_TYPES = new Set(["image", "audio", "video", "document"]);

/**
 * Walk a `whatsapp_business_account` envelope down to real inbound messages,
 * reactions and delivery receipts. Pure parsing + routing resolution;
 * resolveWaCloudLine THROWS on an unmapped phone_number_id (see the header).
 * Anything else is counted and dropped.
 */
export function parseWaCloudWebhook(
  body: unknown,
  env: Record<string, string | undefined> = process.env
): WaCloudWebhookParse {
  const out: WaCloudWebhookParse = {
    messages: [],
    reactions: [],
    statuses: [],
    skippedNonMessage: 0,
    skippedUnknownWaba: 0,
  };
  const root = body as { object?: unknown; entry?: unknown } | null;
  if (root?.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) return out;

  const wabaId = env.META_WA_WABA_ID?.trim() || null;

  for (const entry of root.entry as Record<string, unknown>[]) {
    if (wabaId && typeof entry?.id === "string" && entry.id !== wabaId) {
      out.skippedUnknownWaba++;
      log.warn("[wa-cloud] entry.id is not our pinned WABA — skipped", { entryId: entry.id });
      continue;
    }
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes as Record<string, unknown>[]) {
      const value = change?.value as Record<string, unknown> | undefined;
      if (!value) continue;

      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      if (messages.length === 0 && statuses.length === 0) continue;

      const phoneNumberId =
        typeof (value.metadata as { phone_number_id?: unknown } | undefined)?.phone_number_id === "string"
          ? (value.metadata as { phone_number_id: string }).phone_number_id
          : null;
      // Any event from a number we do not route is a config gap — fail loud.
      if (!phoneNumberId) {
        out.skippedNonMessage += messages.length + statuses.length;
        continue;
      }
      const line = resolveWaCloudLine(phoneNumberId, env);

      // ── Delivery receipts for our outbound (parsed + hooked, logged at
      //    debug by the route — nothing is persisted yet). ──
      for (const s of statuses as Record<string, unknown>[]) {
        if (typeof s?.id !== "string" || !s.id || typeof s?.status !== "string" || !s.status) {
          out.skippedNonMessage++;
          continue;
        }
        const ts = Number(s.timestamp);
        const firstError = Array.isArray(s.errors)
          ? (s.errors[0] as { title?: unknown; message?: unknown } | undefined)
          : undefined;
        out.statuses.push({
          wamid: s.id,
          status: s.status,
          recipientId: typeof s.recipient_id === "string" ? s.recipient_id : null,
          at: Number.isFinite(ts) ? new Date(ts * 1000) : new Date(),
          error:
            typeof firstError?.title === "string"
              ? firstError.title
              : typeof firstError?.message === "string"
                ? firstError.message
                : null,
        });
      }

      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      for (const m of messages as Record<string, unknown>[]) {
        const fromDigits = normalizePhone(typeof m?.from === "string" ? m.from : "");
        const wamid = typeof m?.id === "string" ? m.id : "";
        const type = typeof m?.type === "string" ? m.type : "";
        if (!wamid || fromDigits.length < MIN_PHONE_MATCH_DIGITS) {
          out.skippedNonMessage++;
          continue;
        }
        const ts = Number(m.timestamp);
        const at = Number.isFinite(ts) ? new Date(ts * 1000) : new Date();

        // Reactions are not conversation rows — they key wa_reaction off the
        // REACTED-TO wamid (the 👍-acceptance chain).
        if (type === "reaction") {
          const rx = m.reaction as { message_id?: unknown; emoji?: unknown } | undefined;
          if (typeof rx?.message_id !== "string" || !rx.message_id) {
            out.skippedNonMessage++;
            continue;
          }
          out.reactions.push({
            line,
            messageId: rx.message_id,
            reactorJid: `${fromDigits}@s.whatsapp.net`,
            reactorPhone: fromDigits,
            emoji: typeof rx.emoji === "string" ? rx.emoji : "",
            at,
          });
          continue;
        }

        const contact = (contacts as { wa_id?: unknown; profile?: { name?: unknown } }[]).find(
          (c) => typeof c?.wa_id === "string" && normalizePhone(c.wa_id) === fromDigits
        );
        const customerName =
          typeof contact?.profile?.name === "string" && contact.profile.name.trim()
            ? contact.profile.name.trim()
            : null;

        let body: string;
        let media: WaCloudInbound["media"] = null;
        if (type === "text") {
          const text = (m.text as { body?: unknown } | undefined)?.body;
          if (typeof text !== "string" || !text.trim()) {
            out.skippedNonMessage++;
            continue;
          }
          body = text.trim();
        } else {
          // Placeholder + the context that makes it useful: image/video caption,
          // document FILENAME (idDocumentSent keys on "EID_…" names).
          const mediaPayload = m[type] as
            | { id?: unknown; mime_type?: unknown; caption?: unknown; filename?: unknown }
            | undefined;
          const detail =
            typeof mediaPayload?.filename === "string" && mediaPayload.filename.trim()
              ? mediaPayload.filename.trim()
              : typeof mediaPayload?.caption === "string" && mediaPayload.caption.trim()
                ? mediaPayload.caption.trim()
                : null;
          body = [waCloudPlaceholder(type), detail].filter(Boolean).join(" ");
          if (WA_CLOUD_MEDIA_TYPES.has(type) && typeof mediaPayload?.id === "string" && mediaPayload.id) {
            media = {
              id: mediaPayload.id,
              mimeType: typeof mediaPayload.mime_type === "string" ? mediaPayload.mime_type : null,
              filename: typeof mediaPayload.filename === "string" ? mediaPayload.filename : null,
            };
          }
        }

        out.messages.push({ line, fromDigits, customerName, wamid, body, at, media });
      }
    }
  }
  return out;
}

// ─── Media (downloaded AFTER the webhook's 200 — see the header) ────────────

/** Per-request cap — a hung Graph API call must not wedge the pass. */
export const WA_CLOUD_MEDIA_TIMEOUT_MS = 10_000;
/** Beyond this, skip the file and keep the placeholder. */
export const WA_CLOUD_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export interface WaCloudMediaJob {
  tenantId: string;
  externalMessageId: string;
  mediaId: string;
  /** `wa/<lineSlug>/<wamid>.<ext>` under the "wa" MEDIA_ROOT. */
  relpath: string;
}

function sanitizeWamid(wamid: string): string {
  return wamid.replace(/[^A-Za-z0-9_-]/g, "_");
}

/** Extension from the document filename, else the mime type, else .bin. */
function waCloudMediaExt(mimeType: string | null, filename: string | null): string {
  if (filename) {
    const ext = path.posix.extname(filename).slice(1).toLowerCase();
    if (/^[a-z0-9]{2,5}$/.test(ext)) return ext;
  }
  const mimeExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/amr": "amr",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  const base = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  return mimeExt[base] ?? "bin";
}

export function waCloudMediaRelPath(
  line: WaCloudLine,
  wamid: string,
  mimeType: string | null,
  filename: string | null
): string {
  const dir = line.lineSlug ?? line.tenantSlug;
  return `wa/${dir}/${sanitizeWamid(wamid)}.${waCloudMediaExt(mimeType, filename)}`;
}

// ─── Inbound: store + ingest ────────────────────────────────────────────────

/** The seam the tests fake: everything the WA ingest path needs from the DB. */
export interface WaCloudStore {
  tenantIdForSlug(slug: string): Promise<string | null>;
  /** Returns true when the row was actually inserted (false = duplicate wamid). */
  insertInbound(row: {
    tenantId: string;
    from: string;
    to: string;
    customerName: string | null;
    body: string;
    externalMessageId: string;
    createdAt: Date;
  }): Promise<boolean>;
  /**
   * INSERT…SELECT into wa_reaction keyed on wa_outbox.wa_message_id (the
   * bridge.js pattern). Returns true when an outbox row matched; a reaction
   * to anything else inserts nothing.
   */
  recordReaction(row: {
    tenantId: string;
    line: string;
    messageId: string;
    reactorJid: string;
    reactorPhone: string;
    emoji: string;
  }): Promise<boolean>;
  setMediaPath(tenantId: string, externalMessageId: string, mediaPath: string): Promise<void>;
}

export interface WaCloudIngestResult {
  received: number;
  inserted: number;
  duplicates: number;
  /** Reactions seen / reactions that matched an outbox row. */
  reactions: number;
  reactionsMatched: number;
  statuses: WaCloudStatus[];
  skippedNonMessage: number;
  skippedUnknownWaba: number;
  /** Rows whose tenant slug resolved to nothing — logged, never fatal. */
  skippedNoTenant: number;
  mediaJobs: WaCloudMediaJob[];
}

/**
 * Parse + insert one WA webhook payload. `onStatus` is the delivery-receipt
 * hook (the route logs at debug); it persists nothing today by design.
 * Media is NOT downloaded here — the jobs are returned for the caller to run
 * after it has answered Meta's 200. Throws WaCloudUnknownLineError on an
 * unmapped phone_number_id — the route maps that to a 500.
 */
export async function ingestWaCloudWebhook(
  store: WaCloudStore,
  body: unknown,
  opts: { env?: Record<string, string | undefined>; onStatus?: (s: WaCloudStatus) => void } = {}
): Promise<WaCloudIngestResult> {
  const parsed = parseWaCloudWebhook(body, opts.env ?? process.env);
  for (const s of parsed.statuses) {
    try {
      opts.onStatus?.(s);
    } catch (e) {
      log.warn("[wa-cloud] status hook failed", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  const result: WaCloudIngestResult = {
    received: parsed.messages.length,
    inserted: 0,
    duplicates: 0,
    reactions: parsed.reactions.length,
    reactionsMatched: 0,
    statuses: parsed.statuses,
    skippedNonMessage: parsed.skippedNonMessage,
    skippedUnknownWaba: parsed.skippedUnknownWaba,
    skippedNoTenant: 0,
    mediaJobs: [],
  };
  const tenantIds = new Map<string, string | null>();
  const tenantIdFor = async (slug: string): Promise<string | null> => {
    if (!tenantIds.has(slug)) tenantIds.set(slug, await store.tenantIdForSlug(slug));
    return tenantIds.get(slug) ?? null;
  };
  for (const m of parsed.messages) {
    const tenantId = await tenantIdFor(m.line.tenantSlug);
    if (!tenantId) {
      result.skippedNoTenant++;
      log.warn("[wa-cloud] tenant slug did not resolve — message dropped", { tenantSlug: m.line.tenantSlug });
      continue;
    }
    const externalMessageId = m.wamid;
    const inserted = await store.insertInbound({
      tenantId,
      from: m.fromDigits,
      to: m.line.lineSlug ?? m.line.tenantSlug,
      customerName: m.customerName,
      body: m.body,
      externalMessageId,
      createdAt: m.at,
    });
    if (!inserted) {
      result.duplicates++;
      continue;
    }
    result.inserted++;
    if (m.media) {
      result.mediaJobs.push({
        tenantId,
        externalMessageId,
        mediaId: m.media.id,
        relpath: waCloudMediaRelPath(m.line, m.wamid, m.media.mimeType, m.media.filename),
      });
    }
  }
  for (const r of parsed.reactions) {
    const tenantId = await tenantIdFor(r.line.tenantSlug);
    if (!tenantId) {
      log.warn("[wa-cloud] tenant slug did not resolve — reaction dropped", { tenantSlug: r.line.tenantSlug });
      continue;
    }
    const matched = await store.recordReaction({
      tenantId,
      line: r.line.lineSlug ?? r.line.tenantSlug,
      messageId: r.messageId,
      reactorJid: r.reactorJid,
      reactorPhone: r.reactorPhone,
      emoji: r.emoji,
    });
    if (matched) result.reactionsMatched++;
  }
  return result;
}

/**
 * Two-step Cloud API media download (media id → expiring URL → bytes) into
 * the "wa" media root, then stamp media_path. Best-effort by contract, same
 * as the IG pass: a failure logs and keeps the placeholder — the webhook has
 * already been answered. No token configured → one warn, placeholders stay.
 */
export async function processWaCloudMediaJobs(
  store: WaCloudStore,
  jobs: WaCloudMediaJob[],
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  if (jobs.length === 0) return;
  const token = env.META_WA_TOKEN?.trim() || env.META_WA_ACCESS_TOKEN?.trim();
  if (!token) {
    log.warn("[wa-cloud] META_WA_TOKEN is not set — media not downloaded, placeholders kept", {
      jobs: jobs.length,
    });
    return;
  }
  const auth = { authorization: `Bearer ${token}` };
  for (const job of jobs) {
    try {
      const meta = await fetch(`https://graph.facebook.com/v21.0/${job.mediaId}`, {
        headers: auth,
        signal: AbortSignal.timeout(WA_CLOUD_MEDIA_TIMEOUT_MS),
      });
      if (!meta.ok) throw new Error(`media lookup HTTP ${meta.status}`);
      const info = (await meta.json()) as { url?: unknown };
      if (typeof info.url !== "string" || !info.url) throw new Error("media lookup returned no url");
      const res = await fetch(info.url, {
        headers: auth,
        signal: AbortSignal.timeout(WA_CLOUD_MEDIA_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > WA_CLOUD_MEDIA_MAX_BYTES) throw new Error(`too large (${length} bytes)`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > WA_CLOUD_MEDIA_MAX_BYTES) throw new Error(`too large (${buf.length} bytes)`);
      const abs = mediaFilePath(job.relpath);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, buf);
      await store.setMediaPath(job.tenantId, job.externalMessageId, job.relpath);
    } catch (e) {
      log.warn("[wa-cloud] media download failed — placeholder kept", {
        relpath: job.relpath,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

// ─── Outbound: the sender ───────────────────────────────────────────────────

/** Bound on the Graph API call — house rule: every outbound fetch is capped. */
export const WA_CLOUD_TIMEOUT_MS = 10_000;

export type WaCloudSendResult =
  | { ok: true; wamid: string | null }
  | { ok: false; error: string; status?: number };

type FetchLike = typeof fetch;

async function postWaCloudMessage(
  cfg: WaCloudConfig,
  payload: Record<string, unknown>,
  fetchImpl: FetchLike
): Promise<WaCloudSendResult> {
  try {
    const res = await fetchImpl(`${cfg.graphBaseUrl}/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(WA_CLOUD_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as {
      messages?: { id?: unknown }[];
      error?: { message?: unknown };
    } | null;
    if (!res.ok) {
      const msg = typeof data?.error?.message === "string" ? data.error.message : `HTTP ${res.status}`;
      return { ok: false, error: msg.slice(0, 300), status: res.status };
    }
    // The returned wamid is what a future wa_outbox drain writes into
    // wa_message_id — that is what makes 👍-acceptance work on cloud numbers.
    const wamid = typeof data?.messages?.[0]?.id === "string" ? data.messages[0].id : null;
    return { ok: true, wamid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function recipientOrError(toDigits: string): { to: string } | { error: string } {
  const to = normalizePhone(toDigits);
  // Fewer than 9 digits — never send to a guess (the outbox house rule).
  if (to.length < MIN_PHONE_MATCH_DIGITS) return { error: `bad recipient: ${toDigits}` };
  return { to };
}

/** Free-form text — valid only inside the 24h customer-service window. */
export async function sendText(
  cfg: WaCloudConfig,
  toDigits: string,
  text: string,
  fetchImpl: FetchLike = fetch
): Promise<WaCloudSendResult> {
  const to = recipientOrError(toDigits);
  if ("error" in to) return { ok: false, error: to.error };
  if (!text.trim()) return { ok: false, error: "empty text" };
  return postWaCloudMessage(cfg, { to: to.to, type: "text", text: { body: text } }, fetchImpl);
}

/** Template message — the only way to write a customer outside the 24h window. */
export async function sendTemplate(
  cfg: WaCloudConfig,
  toDigits: string,
  templateName: string,
  langCode: string,
  components?: unknown[],
  fetchImpl: FetchLike = fetch
): Promise<WaCloudSendResult> {
  const to = recipientOrError(toDigits);
  if ("error" in to) return { ok: false, error: to.error };
  if (!templateName.trim() || !langCode.trim()) return { ok: false, error: "template name and language code are required" };
  return postWaCloudMessage(
    cfg,
    {
      to: to.to,
      type: "template",
      template: {
        name: templateName,
        language: { code: langCode },
        ...(components && components.length > 0 ? { components } : {}),
      },
    },
    fetchImpl
  );
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

export function createDrizzleWaCloudStore(db: PlatformDb): WaCloudStore {
  return {
    async tenantIdForSlug(slug) {
      const res = await db.execute(sql`SELECT id FROM tenant WHERE slug = ${slug} LIMIT 1`);
      const row = (res as unknown as { rows?: { id: string }[] }).rows?.[0];
      return row?.id ?? null;
    },
    async insertInbound(row) {
      return withDrizzleTenant(row.tenantId, async (tx) => {
        const res = await tx.execute(sql`
          INSERT INTO message (tenant_id, channel, direction, "from", "to", customer_name, body, status, external_message_id, created_at)
          VALUES (${row.tenantId}, 'whatsapp', 'inbound', ${row.from}, ${row.to}, ${row.customerName}, ${row.body}, 'received', ${row.externalMessageId}, ${row.createdAt.toISOString()})
          ON CONFLICT (tenant_id, external_message_id) WHERE external_message_id IS NOT NULL
          DO NOTHING
          RETURNING id
        `);
        return ((res as unknown as { rows?: unknown[] }).rows?.length ?? 0) > 0;
      });
    },
    async recordReaction(row) {
      // The bridge.js pattern, verbatim: tenant is copied off the matched
      // outbox row, so reactions to hand-typed or customer messages match no
      // row and insert nothing. A re-reaction (or a removal — empty emoji)
      // overwrites on the (line, message, reactor) unique key.
      return withDrizzleTenant(row.tenantId, async (tx) => {
        const res = await tx.execute(sql`
          INSERT INTO wa_reaction (tenant_id, line, message_id, reactor_jid, reactor_phone, emoji)
          SELECT o.tenant_id, ${row.line}, ${row.messageId}, ${row.reactorJid}, ${row.reactorPhone}, ${row.emoji}
            FROM wa_outbox o
           WHERE o.wa_message_id = ${row.messageId}
           ORDER BY o.sent_at DESC NULLS LAST
           LIMIT 1
          ON CONFLICT (line, message_id, reactor_jid) DO UPDATE SET emoji = EXCLUDED.emoji
          RETURNING id
        `);
        return ((res as unknown as { rows?: unknown[] }).rows?.length ?? 0) > 0;
      });
    },
    async setMediaPath(tenantId, externalMessageId, mediaPath) {
      await withDrizzleTenant(tenantId, async (tx) => {
        await tx.execute(sql`
          UPDATE message SET media_path = ${mediaPath}, updated_at = now()
           WHERE tenant_id = ${tenantId}
             AND external_message_id = ${externalMessageId}
             AND media_path IS NULL
        `);
      });
    },
  };
}
