// JivoChat → `message` ingest. Jivo carries Instagram DM, Facebook Messenger
// and the website chat widget for BOTH companies — one JivoChat ACCOUNT per
// Twenty board, identified by its `site_id`.
//
// Same architecture as ../meta/whatsapp-cloud.ts: PURE parsing + env config
// separated from the store that talks to the platform DB, with thin Next.js
// routes on top (app/api/webhooks/jivo/route.ts + [token]/route.ts).
//
// Jivo has TWO webhook dialects, both POST application/json, both parsed here:
//
//   WEBHOOKS API (jivochat.com/docs/webhooks) — `event_name` payloads:
//   chat_accepted / chat_assigned / chat_updated / call_event / … Only two
//   carry client text: offline_message (message + offline_message_id) and
//   chat_finished (chat.messages[] — the FULL log; visitor lines only, agent
//   lines are Jivo-side and skipped like Meta's is_echo). The rest are
//   lifecycle events — counted, logged, never stored.
//
//   BOT API (jivochat.com/docs/bot) — `event` payloads: CLIENT_MESSAGE is the
//   surface that carries EVERY client message IN REAL TIME (the Webhooks API
//   hands over the conversation only when the chat closes). CHAT_CLOSED /
//   AGENT_UNAVAILABLE / AGENT_JOINED / CLIENT_RATED are counted and ignored.
//
// Dedupe rides the house constraint ON CONFLICT (tenant_id,
// external_message_id) DO NOTHING, extid namespaces:
//   jivo:<site>:evt:<eventId>          — bot CLIENT_MESSAGE (event id)
//   jivo:<site>:offline:<id>           — webhooks offline_message
//   jivo:<site>:chat:<chatId>:<ts>:<n> — chat_finished log lines
// A message seen on BOTH surfaces files twice at worst; the note's line-level
// dedupe (minute + direction + words) merges the copies.
//
// Identity: `from` is ALWAYS the pseudo-counterparty `jivo:<site_id>:<client>`
// (client = bot client_id / webhooks visitor.number — the same per-account
// visitor id). A visitor with NO phone keys the relay thread on that whole
// prefixed id (the ig:/fb: rule, extended to jivo: in wa-lead-relay.ts); a
// visitor who GAVE a phone (webhooks visitor.phone) also carries it in
// from_pn, and the relay keys the thread on the phone tail9 — stitching the
// Jivo chat onto the same card as that customer's WhatsApp thread. Known
// limit: bot-surface events carry no phone, so a visitor who types their
// number into the widget form mid-chat is stitched only once a webhooks-dialect
// event (chat_finished / offline_message) arrives with it.
//
// Routing: JIVO_LINES = "siteId:tenantSlug,…", parsed ONCE here. An unknown
// site_id THROWS JivoUnknownSiteError — the lead-counter lesson: an unknown
// key must fail loud, never default to a tenant. The Twenty instance is
// DERIVED from the tenant slug (twentyInstanceForTenantSlug), never
// re-declared.

import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import {
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { log } from "@/platform/log";

type PlatformDb = typeof platformDb;

// ─── Env-driven config ──────────────────────────────────────────────────────

/** Unknown / malformed site routing — the route answers 500, loud. */
export class JivoUnknownSiteError extends Error {}

export interface JivoSite {
  siteId: string;
  tenantSlug: string;
  /** The Twenty deployment this account's cards live on — derived, never configured. */
  instance: TwentyInstanceKey;
}

/**
 * JIVO_LINES: "siteId:tenantSlug,siteId:tenantSlug,…" — which JivoChat account
 * files under which platform tenant. A malformed pair throws: a half-parsed
 * routing table is how a stranger's chats land on the wrong desk.
 */
export function jivoLineMap(env: Record<string, string | undefined> = process.env): Record<string, string> {
  const raw = env.JIVO_LINES?.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const [id, slug] = trimmed.split(":").map((s) => s.trim());
    if (!id || !slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
      throw new JivoUnknownSiteError(`malformed JIVO_LINES entry: "${trimmed}" (expected siteId:tenantSlug)`);
    }
    out[id] = slug;
  }
  return out;
}

/**
 * site_id → { tenant, Twenty instance }. THROWS on an unknown site — never a
 * default tenant (the standing lines.ts rule: a wrong tenant re-files the
 * archive onto the wrong desk).
 */
export function resolveJivoSite(
  siteId: string,
  env: Record<string, string | undefined> = process.env
): JivoSite {
  const tenantSlug = jivoLineMap(env)[siteId];
  if (!tenantSlug) {
    throw new JivoUnknownSiteError(
      `unknown Jivo site_id "${siteId}" — add it to JIVO_LINES (siteId:tenantSlug)`
    );
  }
  return { siteId, tenantSlug, instance: twentyInstanceForTenantSlug(tenantSlug) };
}

// ─── Inbound: payload parse (both dialects) ─────────────────────────────────

/** One normalized inbound client message, ready to insert into `message`. */
export interface JivoInbound {
  site: JivoSite;
  /** `jivo:<site_id>:<client>` — the pseudo-counterparty, always prefixed. */
  from: string;
  /** The visitor's real phone digits when Jivo knows them (webhooks dialect). */
  fromPn: string | null;
  customerName: string | null;
  /** 'instagram' | 'messenger' | 'jivo' (widget and everything else). */
  channel: string;
  body: string;
  externalMessageId: string;
  at: Date;
  /** Present on bot CLIENT_MESSAGE — needed to answer via BOT_MESSAGE. */
  clientId: string | null;
  chatId: string | null;
  /** message.source_meta payload. */
  sourceMeta: Record<string, unknown>;
}

export interface JivoWebhookParse {
  messages: JivoInbound[];
  /** Lifecycle events we deliberately did not store (logged by the route). */
  ignoredEvents: string[];
  /** Message-bearing events with nothing fileable (empty text, agent lines). */
  skippedNonMessage: number;
}

/** Jivo channel type → the house channel vocabulary the relay already reads. */
export function jivoChannel(channelType: string | null): string {
  const t = (channelType ?? "").toLowerCase();
  if (t.includes("insta")) return "instagram";
  if (t === "fb" || t.includes("facebook") || t.includes("messenger")) return "messenger";
  return "jivo"; // widget, email, telegram-via-jivo, … — one honest bucket
}

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Jivo timestamps are unix seconds in most payloads, millis in some. */
function jivoTs(ts: unknown): Date {
  const n = typeof ts === "string" ? Number(ts) : ts;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return new Date();
  return new Date(n > 1e12 ? n : n * 1000);
}

/** The `from` pseudo-identity. The prefix is LOAD-BEARING — same rule as ig:/fb:. */
export function jivoFromValue(siteId: string, clientKey: string): string {
  return `jivo:${siteId}:${clientKey}`;
}

function visitorPhone(phone: unknown): string | null {
  const digits = normalizePhone(typeof phone === "string" ? phone : null);
  return digits.length >= MIN_PHONE_MATCH_DIGITS ? digits : null;
}

/** Bot API message.type → body text or the house placeholder vocabulary. */
function botMessageBody(msg: Record<string, unknown>): string | null {
  const type = firstString(msg.type)?.toUpperCase() ?? "";
  const text = firstString(msg.text);
  switch (type) {
    case "TEXT":
      return text;
    case "MARKDOWN":
      return text ?? firstString(msg.content);
    case "BUTTONS":
      return text ?? firstString(msg.title);
    case "PHOTO":
      return ["[image]", firstString(msg.file_name)].filter(Boolean).join(" ");
    case "VIDEO":
      return ["[video]", firstString(msg.file_name)].filter(Boolean).join(" ");
    case "AUDIO":
    case "VOICE":
      return ["[voice/audio]", firstString(msg.file_name)].filter(Boolean).join(" ");
    case "DOCUMENT":
      return ["[document]", firstString(msg.file_name)].filter(Boolean).join(" ");
    case "LOCATION":
      return "[location]";
    default:
      return text ?? "[non-text]";
  }
}

/** Shared visitor/sender extraction across the two dialects. */
function visitorParts(
  body: Record<string, unknown>
): { clientKey: string | null; name: string | null; email: string | null; phone: string | null } {
  // Webhooks dialect: visitor { name, email, phone, number }.
  const visitor = body.visitor as Record<string, unknown> | undefined;
  // Bot dialect: sender { id, name } + top-level client_id.
  const sender = body.sender as Record<string, unknown> | undefined;
  const clientKey =
    firstString(body.client_id) ?? firstString(visitor?.number) ?? firstString(sender?.id) ?? null;
  return {
    clientKey,
    name: firstString(visitor?.name) ?? firstString(sender?.name),
    email: firstString(visitor?.email),
    phone: visitorPhone(visitor?.phone),
  };
}

/**
 * Parse one Jivo payload of EITHER dialect down to normalized inbound client
 * messages. Throws JivoUnknownSiteError when the site_id is not in JIVO_LINES
 * (any event, not just message-bearing ones — an unmapped account posting to
 * us is a config gap, and config gaps fail loud).
 */
export function parseJivoWebhook(
  body: unknown,
  env: Record<string, string | undefined> = process.env
): JivoWebhookParse {
  const out: JivoWebhookParse = { messages: [], ignoredEvents: [], skippedNonMessage: 0 };
  const root = body as Record<string, unknown> | null;
  if (!root || typeof root !== "object") return out;

  // Dialect detection: bot events carry `event`, webhooks carry `event_name`.
  const botEvent = firstString(root.event);
  const webhookEvent = firstString(root.event_name);
  const eventName = botEvent ?? webhookEvent;
  if (!eventName) {
    out.skippedNonMessage++;
    return out;
  }

  // site_id is stamped on every payload in both dialects (the webhooks docs'
  // examples predate it — widget_id is the fallback key there). A MESSAGE-
  // BEARING event without either cannot be routed at all: throw, don't guess.
  const siteId = firstString(root.site_id) ?? firstString(root.widget_id);
  const MESSAGE_EVENTS = new Set(["CLIENT_MESSAGE", "offline_message", "chat_finished"]);
  if (!siteId) {
    if (MESSAGE_EVENTS.has(eventName)) {
      throw new JivoUnknownSiteError(`Jivo ${eventName} payload carries no site_id/widget_id — cannot route`);
    }
    out.ignoredEvents.push(eventName);
    return out;
  }
  const site = resolveJivoSite(siteId, env); // throws on unknown — by design

  const chatId = firstString(root.chat_id);
  const { clientKey, name, email, phone } = visitorParts(root);
  const channelType = firstString((root.channel as Record<string, unknown> | undefined)?.type);
  const base = {
    site,
    customerName: name,
    channel: botEvent ? jivoChannel(channelType) : "jivo", // webhooks dialect names no channel
    chatId,
  };
  const sourceMeta = (extra: Record<string, unknown>): Record<string, unknown> => ({
    jivo: {
      siteId,
      event: eventName,
      channelType,
      chatId,
      email,
      pageUrl: firstString((root.page as Record<string, unknown> | undefined)?.url),
      ...extra,
    },
  });

  // ── Bot API: CLIENT_MESSAGE — one real-time client message. ──────────────
  if (botEvent === "CLIENT_MESSAGE") {
    const msg =
      root.message && typeof root.message === "object"
        ? (root.message as Record<string, unknown>)
        : undefined;
    const text = msg ? botMessageBody(msg) : null;
    if (!msg || !clientKey || !text?.trim()) {
      out.skippedNonMessage++;
      return out;
    }
    const eventId = firstString(root.id);
    if (!eventId) {
      out.skippedNonMessage++;
      return out;
    }
    out.messages.push({
      ...base,
      clientId: firstString(root.client_id) ?? clientKey,
      from: jivoFromValue(siteId, clientKey),
      fromPn: phone,
      body: text.trim(),
      externalMessageId: `jivo:${siteId}:evt:${eventId}`,
      at: jivoTs(msg.timestamp),
      sourceMeta: sourceMeta({ eventId }),
    });
    return out;
  }

  // ── Webhooks API: offline_message — the offline-form message. ────────────
  if (webhookEvent === "offline_message") {
    const text = firstString(root.message);
    const offlineId = firstString(root.offline_message_id);
    if (!clientKey || !text?.trim() || !offlineId) {
      out.skippedNonMessage++;
      return out;
    }
    out.messages.push({
      ...base,
      clientId: clientKey,
      from: jivoFromValue(siteId, clientKey),
      fromPn: phone,
      body: text.trim(),
      externalMessageId: `jivo:${siteId}:offline:${offlineId}`,
      at: new Date(), // the event carries no timestamp of its own
      sourceMeta: sourceMeta({ offlineMessageId: offlineId }),
    });
    return out;
  }

  // ── Webhooks API: chat_finished — the full log at close. Visitor lines
  //    only: agent lines are the Jivo-side half (agents reply in the Jivo
  //    app), skipped like Meta's is_echo. ───────────────────────────────────
  if (webhookEvent === "chat_finished") {
    const chat = root.chat as { messages?: unknown } | undefined;
    const items = Array.isArray(chat?.messages) ? chat.messages : [];
    const firstAgent = Array.isArray(root.agents)
      ? (root.agents[0] as Record<string, unknown> | undefined)
      : undefined;
    const agentName =
      firstString((root.assigned_agent as Record<string, unknown> | undefined)?.name) ??
      firstString(firstAgent?.name);
    if (!clientKey || !chatId) {
      out.skippedNonMessage += items.length || 1;
      return out;
    }
    let n = 0;
    for (const item of items as Record<string, unknown>[]) {
      if (firstString(item?.type) !== "visitor") continue; // agent line
      const text = firstString(item?.message);
      if (!text?.trim()) {
        out.skippedNonMessage++;
        continue;
      }
      const at = jivoTs(item?.timestamp);
      out.messages.push({
        ...base,
        clientId: clientKey,
        from: jivoFromValue(siteId, clientKey),
        fromPn: phone,
        body: text.trim(),
        // Index in the visitor-line sequence: two lines can share a second.
        externalMessageId: `jivo:${siteId}:chat:${chatId}:${Math.floor(at.getTime() / 1000)}:${n++}`,
        at,
        sourceMeta: sourceMeta({ agentName }),
      });
    }
    return out;
  }

  // Everything else — chat_accepted / chat_assigned / chat_updated /
  // call_event / client_updated / CHAT_CLOSED / AGENT_UNAVAILABLE / … — is a
  // lifecycle event: counted, logged by the route, never stored.
  out.ignoredEvents.push(eventName);
  return out;
}

// ─── Inbound: store + ingest ────────────────────────────────────────────────

/** The seam the tests fake: everything the Jivo ingest path needs from the DB. */
export interface JivoStore {
  tenantIdForSlug(slug: string): Promise<string | null>;
  /** Returns true when the row was actually inserted (false = duplicate extid). */
  insertInbound(row: {
    tenantId: string;
    channel: string;
    from: string;
    to: string;
    fromPn: string | null;
    customerName: string | null;
    body: string;
    externalMessageId: string;
    sourceMeta: Record<string, unknown>;
    createdAt: Date;
  }): Promise<boolean>;
  /** Inbound rows already filed for this pseudo-counterparty (first-contact). */
  countInboundForVisitor(tenantId: string, from: string): Promise<number>;
}

/** One first-contact acknowledgement to send AFTER the 200 (Bot API). */
export interface JivoAckJob {
  clientId: string;
  chatId: string;
  tenantSlug: string;
}

export interface JivoIngestResult {
  received: number;
  inserted: number;
  duplicates: number;
  ignoredEvents: string[];
  skippedNonMessage: number;
  /** Rows whose tenant slug resolved to nothing — logged, never fatal. */
  skippedNoTenant: number;
  ackJobs: JivoAckJob[];
}

/**
 * Parse + insert one Jivo payload. Throws JivoUnknownSiteError for an
 * unmapped account (the route turns that into a loud 500); every other fault
 * is the caller's to soften.
 */
export async function ingestJivoWebhook(
  store: JivoStore,
  body: unknown,
  opts: { env?: Record<string, string | undefined> } = {}
): Promise<JivoIngestResult> {
  const parsed = parseJivoWebhook(body, opts.env ?? process.env);
  const result: JivoIngestResult = {
    received: parsed.messages.length,
    inserted: 0,
    duplicates: 0,
    ignoredEvents: parsed.ignoredEvents,
    skippedNonMessage: parsed.skippedNonMessage,
    skippedNoTenant: 0,
    ackJobs: [],
  };
  const tenantIds = new Map<string, string | null>();
  for (const m of parsed.messages) {
    if (!tenantIds.has(m.site.tenantSlug)) {
      tenantIds.set(m.site.tenantSlug, await store.tenantIdForSlug(m.site.tenantSlug));
    }
    const tenantId = tenantIds.get(m.site.tenantSlug) ?? null;
    if (!tenantId) {
      result.skippedNoTenant++;
      log.warn("[jivo] tenant slug did not resolve — message dropped", { tenantSlug: m.site.tenantSlug });
      continue;
    }
    const inserted = await store.insertInbound({
      tenantId,
      channel: m.channel,
      from: m.from,
      to: `jivo:${m.site.siteId}`,
      fromPn: m.fromPn,
      customerName: m.customerName,
      body: m.body,
      externalMessageId: m.externalMessageId,
      sourceMeta: m.sourceMeta,
      createdAt: m.at,
    });
    if (!inserted) {
      result.duplicates++;
      continue;
    }
    result.inserted++;
    // First-contact detection for the (default-OFF) auto-ack: this insert was
    // the visitor's FIRST row ever. A duplicate retry never re-acks — the
    // insert above already returned false for it.
    if (m.clientId && m.chatId && (await store.countInboundForVisitor(tenantId, m.from)) === 1) {
      result.ackJobs.push({ clientId: m.clientId, chatId: m.chatId, tenantSlug: m.site.tenantSlug });
    }
  }
  return result;
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

export function createDrizzleJivoStore(db: PlatformDb): JivoStore {
  return {
    async tenantIdForSlug(slug) {
      const res = await db.execute(sql`SELECT id FROM tenant WHERE slug = ${slug} LIMIT 1`);
      const row = (res as unknown as { rows?: { id: string }[] }).rows?.[0];
      return row?.id ?? null;
    },
    async insertInbound(row) {
      return withDrizzleTenant(row.tenantId, async (tx) => {
        const res = await tx.execute(sql`
          INSERT INTO message (tenant_id, channel, direction, "from", "to", from_pn, customer_name, body, status, external_message_id, source_meta, created_at)
          VALUES (${row.tenantId}, ${row.channel}, 'inbound', ${row.from}, ${row.to}, ${row.fromPn}, ${row.customerName}, ${row.body}, 'received', ${row.externalMessageId}, ${JSON.stringify(row.sourceMeta)}::jsonb, ${row.createdAt.toISOString()})
          ON CONFLICT (tenant_id, external_message_id) WHERE external_message_id IS NOT NULL
          DO NOTHING
          RETURNING id
        `);
        return ((res as unknown as { rows?: unknown[] }).rows?.length ?? 0) > 0;
      });
    },
    async countInboundForVisitor(tenantId, from) {
      return withDrizzleTenant(tenantId, async (tx) => {
        const res = await tx.execute(sql`
          SELECT count(*)::int AS n FROM message
           WHERE tenant_id = ${tenantId} AND direction = 'inbound' AND "from" = ${from}
        `);
        const row = (res as unknown as { rows?: { n: number }[] }).rows?.[0];
        return row?.n ?? 0;
      });
    },
  };
}
