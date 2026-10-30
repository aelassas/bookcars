// Meta (Instagram DM + Facebook Messenger) webhook ingestion.
//
// Same architecture as the CallGear webhook (../callgear/webhook.ts): PURE
// parsing/signature logic separated from the store that talks to the platform
// DB, with a thin Next.js route (app/api/webhooks/meta/route.ts) on top.
//
// Differences from CallGear, all forced by Meta's contract:
//   - Auth is ONE app secret, not a per-tenant path token: Meta signs every
//     POST with `X-Hub-Signature-256` = HMAC-SHA256(META_APP_SECRET, raw body).
//     No secret configured → 500, NEVER a silent accept.
//   - The endpoint is subscribed per Meta APP, so every event it delivers is
//     for one of OUR accounts — the tenant comes from a small account map
//     (META_ACCOUNT_TENANT keyed by recipient.id), not from the URL.
//   - Attachment CDN URLs EXPIRE. Rows are inserted first with a placeholder
//     body; the media download runs after the 200 (see the route), and a
//     failed download keeps the placeholder — the webhook never fails over
//     media.
//
// Dedupe rides the same constraint as every other channel:
// ON CONFLICT (tenant_id, external_message_id) DO NOTHING, with the extid
// namespace `igmsg:<accountSlug>:<mid>` / `fbmsg:<accountSlug>:<mid>`.

import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { mediaFilePath } from "@/platform/media/token";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { log } from "@/platform/log";

type PlatformDb = typeof platformDb;

export type MetaChannel = "instagram" | "messenger";

/** One of OUR business accounts the webhook may deliver for. */
export interface MetaAccount {
  /** Line-style slug the rows are filed under (`to`, owner routing, lines.ts). */
  accountSlug: string;
  tenantSlug: string;
}

/**
 * recipient.id (the IG professional / FB page account the customer wrote TO)
 * → which of our accounts it is. v1 has ONE subscribed Instagram account and
 * ONE page, and Meta only delivers OUR app's subscriptions to this endpoint —
 * so an unmapped recipient falls through to the single default per object
 * type (with a warning), and adding a second account is a config row here,
 * not code. Pin the real ids at deploy time (first live payload shows them).
 */
export const META_ACCOUNT_TENANT: Record<string, MetaAccount> = {};

const DEFAULT_ACCOUNT: Record<"instagram" | "page", MetaAccount> = {
  instagram: { accountSlug: "ig-takeauto", tenantSlug: "take-auto" },
  page: { accountSlug: "fb-takeauto", tenantSlug: "take-auto" },
};

export function metaAccountFor(object: string, recipientId: string): MetaAccount | null {
  if (object !== "instagram" && object !== "page") return null;
  const pinned = META_ACCOUNT_TENANT[recipientId];
  if (pinned) return pinned;
  const envId = process.env[object === "instagram" ? "META_IG_ACCOUNT_ID" : "META_FB_ACCOUNT_ID"]?.trim();
  if (envId) {
    // An id pinned to a DIFFERENT account means this event is not for us.
    if (envId !== recipientId) return null;
    return DEFAULT_ACCOUNT[object];
  }
  log.warn("[meta] recipient.id not pinned in META_ACCOUNT_TENANT — defaulting to the single v1 account", {
    metaObject: object,
  });
  return DEFAULT_ACCOUNT[object];
}

/**
 * `X-Hub-Signature-256` = "sha256=" + hex(HMAC-SHA256(secret, raw body)).
 * Timing-safe; a missing or malformed header is a mismatch, never a bypass.
 */
export function verifyMetaSignature(rawBody: string, header: string | null, secret: string): boolean {
  const given = header?.startsWith("sha256=") ? header.slice("sha256=".length) : header;
  if (!given || !/^[0-9a-f]{64}$/i.test(given)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

/** One normalized inbound message, ready to insert into `message`. */
export interface MetaInboundMessage {
  channel: MetaChannel;
  account: MetaAccount;
  /** The customer's app-scoped id — digits, but NEVER a phone. */
  senderScopedId: string;
  mid: string;
  text: string | null;
  attachments: { type: string; url: string }[];
  at: Date;
}

export interface MetaWebhookParse {
  messages: MetaInboundMessage[];
  /** Our own outbound echoes (is_echo) — the sender is the business account. */
  skippedEcho: number;
  /** delivery/read/reaction/standby events — counted, never stored. */
  skippedNonMessage: number;
  /** Events for an account that is not ours (env-pinned mismatch). */
  skippedUnknownAccount: number;
}

/** Attachment type → the house placeholder vocabulary (`[image]` etc.). */
function attachmentPlaceholder(type: string): string {
  switch (type) {
    case "image":
      return "[image]";
    case "video":
      return "[video]";
    case "audio":
      return "[audio]";
    // file / share / reel / story_mention / location … — one honest bucket.
    default:
      return "[file]";
  }
}

/**
 * Walk the Meta envelope (`{object, entry:[{messaging:[…]}]}`) down to the
 * real inbound messages. Everything that is not a customer-authored message —
 * echoes of our own replies, delivery/read receipts, reactions, standby
 * handover events — is counted and dropped, never stored.
 */
export function parseMetaWebhook(body: unknown): MetaWebhookParse {
  const out: MetaWebhookParse = {
    messages: [],
    skippedEcho: 0,
    skippedNonMessage: 0,
    skippedUnknownAccount: 0,
  };
  const root = body as { object?: unknown; entry?: unknown } | null;
  const object = typeof root?.object === "string" ? root.object : null;
  if (!object || !Array.isArray(root?.entry)) return out;
  for (const entry of root.entry as Record<string, unknown>[]) {
    const items = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const item of items as Record<string, unknown>[]) {
      const senderId = (item?.sender as { id?: unknown } | undefined)?.id;
      const recipientId = (item?.recipient as { id?: unknown } | undefined)?.id;
      const message = item?.message as
        | { mid?: unknown; text?: unknown; is_echo?: unknown; attachments?: unknown }
        | undefined;
      if (!message) {
        out.skippedNonMessage++; // delivery / read / reaction / standby
        continue;
      }
      if (message.is_echo === true) {
        out.skippedEcho++;
        continue;
      }
      if (
        typeof senderId !== "string" || !senderId ||
        typeof recipientId !== "string" || !recipientId ||
        typeof message.mid !== "string" || !message.mid
      ) {
        out.skippedNonMessage++;
        continue;
      }
      const account = metaAccountFor(object, recipientId);
      if (!account) {
        out.skippedUnknownAccount++;
        continue;
      }
      const attachments: { type: string; url: string }[] = [];
      if (Array.isArray(message.attachments)) {
        for (const a of message.attachments as { type?: unknown; payload?: unknown }[]) {
          const url = (a?.payload as { url?: unknown } | undefined)?.url;
          if (typeof url === "string" && url) {
            attachments.push({ type: typeof a?.type === "string" ? a.type : "file", url });
          }
        }
      }
      const text = typeof message.text === "string" && message.text.trim() ? message.text.trim() : null;
      if (!text && attachments.length === 0) {
        out.skippedNonMessage++; // a like/sticker with nothing to file
        continue;
      }
      const ts = typeof item?.timestamp === "number" ? item.timestamp : Number(item?.timestamp);
      out.messages.push({
        channel: object === "instagram" ? "instagram" : "messenger",
        account,
        senderScopedId: senderId,
        mid: message.mid,
        text,
        attachments,
        at: Number.isFinite(ts) ? new Date(ts) : new Date(),
      });
    }
  }
  return out;
}

/**
 * The `from` value for one message: `ig:<scopedId>` / `fb:<scopedId>`. The
 * prefix is LOAD-BEARING — scoped ids are pure digits, and unprefixed they
 * would be parsed as phone numbers by every tail9 path in the relay.
 */
export function metaFromValue(channel: MetaChannel, scopedId: string): string {
  return `${channel === "instagram" ? "ig" : "fb"}:${scopedId}`;
}

/** external_message_id namespace — mirrors `waobs:<line>:…` / `tg:<chat>:<id>`. */
export function metaExternalMessageId(channel: MetaChannel, accountSlug: string, mid: string): string {
  return `${channel === "instagram" ? "igmsg" : "fbmsg"}:${accountSlug}:${mid}`;
}

/** Message body: the text, the attachment placeholders, or both. */
export function metaMessageBody(m: MetaInboundMessage): string {
  const placeholders = m.attachments.map((a) => attachmentPlaceholder(a.type)).join(" ");
  return [m.text, placeholders].filter(Boolean).join(" ");
}

// ─── Media (downloaded AFTER the webhook's 200 — see the route) ─────────────

/** Per-file download cap — Meta's CDN is fast; a hung fetch must not wedge. */
export const META_MEDIA_TIMEOUT_MS = 10_000;
/** Beyond this, skip the file and keep the placeholder (a reel can be huge). */
export const META_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export interface MetaMediaJob {
  tenantId: string;
  externalMessageId: string;
  url: string;
  /** `ig/<accountSlug>/<mid>-<i>.<ext>` under the MEDIA_ROOTS.ig root. */
  relpath: string;
}

function sanitizeMid(mid: string): string {
  return mid.replace(/[^A-Za-z0-9_-]/g, "_");
}

function extFromUrl(url: string): string {
  try {
    const ext = path.posix.extname(new URL(url).pathname).slice(1).toLowerCase();
    return /^[a-z0-9]{2,5}$/.test(ext) ? ext : "bin";
  } catch {
    return "bin";
  }
}

export function metaMediaRelPath(accountSlug: string, mid: string, index: number, url: string): string {
  return `ig/${accountSlug}/${sanitizeMid(mid)}-${index}.${extFromUrl(url)}`;
}

/** The seam the tests fake: everything the ingest path needs from the DB. */
export interface MetaWebhookStore {
  tenantIdForSlug(slug: string): Promise<string | null>;
  /** Returns true when the row was actually inserted (false = duplicate mid). */
  insertInbound(row: {
    tenantId: string;
    channel: MetaChannel;
    from: string;
    to: string;
    body: string;
    externalMessageId: string;
    createdAt: Date;
  }): Promise<boolean>;
  setMediaPath(tenantId: string, externalMessageId: string, mediaPath: string): Promise<void>;
}

export interface MetaIngestResult {
  received: number;
  inserted: number;
  duplicates: number;
  skippedEcho: number;
  skippedNonMessage: number;
  skippedUnknownAccount: number;
  /** Rows whose tenant slug resolved to nothing — logged, never fatal. */
  skippedNoTenant: number;
  mediaJobs: MetaMediaJob[];
}

/**
 * Parse + insert one webhook payload. Media is NOT downloaded here — the jobs
 * are returned for the caller to run after it has answered Meta's 200.
 */
export async function ingestMetaWebhook(
  store: MetaWebhookStore,
  body: unknown
): Promise<MetaIngestResult> {
  const parsed = parseMetaWebhook(body);
  const result: MetaIngestResult = {
    received: parsed.messages.length,
    inserted: 0,
    duplicates: 0,
    skippedEcho: parsed.skippedEcho,
    skippedNonMessage: parsed.skippedNonMessage,
    skippedUnknownAccount: parsed.skippedUnknownAccount,
    skippedNoTenant: 0,
    mediaJobs: [],
  };
  const tenantIds = new Map<string, string | null>();
  for (const m of parsed.messages) {
    if (!tenantIds.has(m.account.tenantSlug)) {
      tenantIds.set(m.account.tenantSlug, await store.tenantIdForSlug(m.account.tenantSlug));
    }
    const tenantId = tenantIds.get(m.account.tenantSlug) ?? null;
    if (!tenantId) {
      result.skippedNoTenant++;
      log.warn("[meta] tenant slug did not resolve — message dropped", { tenantSlug: m.account.tenantSlug });
      continue;
    }
    const externalMessageId = metaExternalMessageId(m.channel, m.account.accountSlug, m.mid);
    const inserted = await store.insertInbound({
      tenantId,
      channel: m.channel,
      from: metaFromValue(m.channel, m.senderScopedId),
      to: m.account.accountSlug,
      body: metaMessageBody(m),
      externalMessageId,
      createdAt: m.at,
    });
    if (!inserted) {
      result.duplicates++;
      continue;
    }
    result.inserted++;
    m.attachments.forEach((a, i) => {
      result.mediaJobs.push({
        tenantId,
        externalMessageId,
        url: a.url,
        relpath: metaMediaRelPath(m.account.accountSlug, m.mid, i, a.url),
      });
    });
  }
  return result;
}

/**
 * Download the queued attachments into the `ig` media root and stamp
 * media_path on the row. Best-effort by contract: a failure logs and leaves
 * the placeholder body — the webhook has already been answered, and a media
 * hiccup must never cost the message.
 */
export async function processMetaMediaJobs(
  store: MetaWebhookStore,
  jobs: MetaMediaJob[]
): Promise<void> {
  for (const job of jobs) {
    try {
      const res = await fetch(job.url, { signal: AbortSignal.timeout(META_MEDIA_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > META_MEDIA_MAX_BYTES) throw new Error(`too large (${length} bytes)`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > META_MEDIA_MAX_BYTES) throw new Error(`too large (${buf.length} bytes)`);
      const abs = mediaFilePath(job.relpath);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, buf);
      await store.setMediaPath(job.tenantId, job.externalMessageId, job.relpath);
    } catch (e) {
      log.warn("[meta] attachment download failed — placeholder kept", {
        relpath: job.relpath,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

export function createDrizzleMetaStore(db: PlatformDb): MetaWebhookStore {
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
          VALUES (${row.tenantId}, ${row.channel}, 'inbound', ${row.from}, ${row.to}, NULL, ${row.body}, 'received', ${row.externalMessageId}, ${row.createdAt.toISOString()})
          ON CONFLICT (tenant_id, external_message_id) WHERE external_message_id IS NOT NULL
          DO NOTHING
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
