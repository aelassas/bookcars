// B2B SUPPLY/DEMAND MATCHER + OFFER INDEX (Core Job 2).
//
// The same WhatsApp/Telegram group streams we already ingest carry two kinds
// of traffic: customers asking for cars (the wa-lead-relay owns those —
// DIRECT chats only since the owner's 2026-08-13 call) and OPERATORS: other
// rental companies OFFERING cars (supply) and people SEEKING them (demand).
// This pass reads GROUP rows only, classifies each (group, participant)
// thread with ONE local-model verdict behind the usual verbatim-evidence
// gate, and:
//
//   b2b_supply → a row in the b2b_offer index (dedupe on message_ext_id,
//                expires spotted_at + 24h);
//   b2b_demand → a demand offer row AND a hint DM to the manager — THE DM IS
//                THE ROUTING. Owner 2026-08-13: groups must NOT create cards
//                in Twenty (market chatter ≠ pipeline), so demand no longer
//                creates an opportunity;
//   customer_request / staff_chatter / noise → counted, nothing written.
//
// THE MATCH STEP: for each recently-active open rental opportunity whose
// carModels names a model, count FREE fleet cars of that model for the
// requested period (fleet minus overlapping active/reserved rentals). Short
// → look up FRESH (<24h) supply offers for the model and DM the manager:
//   🔎 G63 needed for <lead> · none free · offered in <group> by <contact> at <price> · 3h ago
// One hint per (opportunity, offer) pair EVER (dedupe sidecar).
//
// THE 24h RAIL: expires_at is hard. The matcher never suggests an expired
// offer, and the pass DELETES expired rows (commit only) — b2b_offer is an
// index of what is fresh NOW; the source `message` rows keep the history.
//
// Same architecture as the other passes: PURE logic (buildGroupThreads /
// parseB2bVerdict / planFleetMatch / matchSupplyOffers / b2bHintLine —
// unit-tested) separated from the adapters (B2bMatcherSource over drizzle,
// Twenty reads over the rate-limited client, the manager DM injected by the
// runner). DRY-RUN BY DEFAULT — zero writes anywhere until --commit.

import { and, eq, sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { twentyMirrorState } from "@/platform/db/schema";
import { normalizePhone } from "@/platform/messaging/phone";
import type { TwentyClient } from "@/platform/integrations/twenty/client";
import type { TwentyInstanceKey } from "@/platform/integrations/twenty/instance";
import { CLOSED_STAGES } from "@/platform/integrations/twenty/stages";
import { groupDisplayName } from "@/platform/integrations/twenty/group-names";
import type { SentKeys } from "@/platform/notify/manager-events";
import { matchFleetVehicles } from "./deal-confirmation";

type PlatformDb = typeof platformDb;

/** Supply offers are fresh for exactly this long — the hard rail. */
export const OFFER_TTL_MS = 24 * 3_600_000;

// ─── Pure: group rows → (group, participant) threads ────────────────────────

export interface B2bGroupRow {
  id: string;
  channel: string;
  /** WA group JID (…@g.us) / tg:<fromId>. */
  from: string | null;
  fromPn: string | null;
  /** Line slug (whatsapp) / chat title (telegram). */
  to: string | null;
  customerName: string | null;
  body: string | null;
  /** message.external_message_id — the offer's dedupe key. */
  extId: string | null;
  createdAt: Date;
}

export interface B2bThread {
  key: string;
  /** "WhatsApp group: <jid>" / "Telegram: <title>" — where the post ran. */
  sourceLabel: string;
  participant: string;
  lines: { body: string; at: Date }[];
  lastActivityAt: Date;
  /** Newest line's external id — the offer dedupe key. */
  extId: string;
}

/** Where a group post ran — the same label shape the lead cards carry. The
 *  group subject replaces the opaque JID when the observers have cached it. */
export function groupSourceLabel(channel: string, from: string | null, to: string | null): string {
  if (channel === "telegram") return to ? `Telegram: ${to}` : "Telegram";
  return from ? `WhatsApp group: ${groupDisplayName(from)}` : "WhatsApp group";
}

/**
 * Batch group rows into one thread per (group, participant) within the pass
 * window. A participant's burst is ONE verdict — operator ads arrive as a
 * burst (the car list + the price + the contact), and splitting them would
 * classify each fragment as noise.
 */
export function buildGroupThreads(rows: B2bGroupRow[]): Map<string, B2bThread> {
  const threads = new Map<string, B2bThread>();
  for (const row of rows) {
    const body = (row.body ?? "").trim();
    if (!body) continue;
    const group = row.channel === "telegram" ? `tg:${row.to ?? "?"}` : (row.from ?? "?");
    const participant =
      row.customerName?.trim() || normalizePhone(row.fromPn) || row.fromPn || row.from || "unknown";
    const key = `${group}::${participant}`;
    const existing = threads.get(key);
    if (!existing) {
      threads.set(key, {
        key,
        sourceLabel: groupSourceLabel(row.channel, row.from, row.to),
        participant,
        lines: [{ body, at: row.createdAt }],
        lastActivityAt: row.createdAt,
        extId: row.extId ?? `msg:${row.id}`,
      });
      continue;
    }
    existing.lines.push({ body, at: row.createdAt });
    if (row.createdAt >= existing.lastActivityAt) {
      existing.lastActivityAt = row.createdAt;
      existing.extId = row.extId ?? existing.extId;
    }
  }
  for (const t of threads.values()) {
    t.lines.sort((a, b) => a.at.getTime() - b.at.getTime());
  }
  return threads;
}

// ─── Pure: the verdict contract ─────────────────────────────────────────────

export type B2bKind = "customer_request" | "b2b_supply" | "b2b_demand" | "staff_chatter" | "noise";
const B2B_KINDS: readonly string[] = ["customer_request", "b2b_supply", "b2b_demand", "staff_chatter", "noise"];

export interface B2bVerdict {
  kind: B2bKind;
  car: string | null;
  priceAed: number | null;
  /** Phone/handle exactly as the post wrote it. */
  contact: string | null;
  evidence: string[];
}

const B2B_SYSTEM =
  `You are reading messages from a car-rental OPERATORS group chat (rental ` +
  `companies trading cars with each other in the UAE). One participant's ` +
  `messages are below. Classify them and respond with ONLY a JSON object ` +
  `(no prose, no markdown) with exactly these fields:\n` +
  `- kind: one of\n` +
  `  "b2b_supply" — an operator OFFERING cars: reads like an ad, lists car(s) ` +
  `with daily/monthly prices ("available", "for rent", plates) and a contact.\n` +
  `  "b2b_demand" — someone SEEKING a car from another operator: "who has", ` +
  `"need", "looking for", "anyone have".\n` +
  `  "customer_request" — an end customer asking to rent for themselves.\n` +
  `  "staff_chatter" — our OWN team's coordination: delivery checklists, ` +
  `"#выдача"/"#opencontract" cards, fines or Salik screenshots, bot posts ` +
  `(🛒 arbitrage listings), driver talk.\n` +
  `  "noise" — everything else (small talk, forwards, media without content).\n` +
  `- car: the car make+model the post is about (one, the headline car), or null\n` +
  `- priceAed: the stated price in AED (number), or null\n` +
  `- contact: the phone or handle the post gives, exactly as written, or null\n` +
  `- evidence: array of 1-3 VERBATIM quotes copied character-for-character ` +
  `from the messages below that justify the classification. Never invent a quote.`;

const MAX_THREAD_MESSAGES = 30;
const MAX_THREAD_CHARS = 4000;

export interface B2bPrompt {
  system: string;
  user: string;
  sourceText: string;
}

export function buildB2bPrompt(thread: B2bThread): B2bPrompt {
  const recent = thread.lines.slice(-MAX_THREAD_MESSAGES);
  const kept: string[] = [];
  let chars = 0;
  for (const line of [...recent].reverse()) {
    if (chars + line.body.length > MAX_THREAD_CHARS) break;
    chars += line.body.length;
    kept.unshift(`[${line.at.toISOString()}] ${line.body}`);
  }
  const sourceText = kept.join("\n");
  return {
    system: B2B_SYSTEM,
    user: `Messages from one participant (oldest first):\n${sourceText || "none"}`,
    sourceText,
  };
}

/**
 * Parse + gate the model's verdict. Returns null — treat as noise — when the
 * JSON is malformed, the kind is off-vocabulary, `evidence` is empty, or any
 * quote is not a verbatim substring of `sourceText` (the same anti-
 * hallucination gate as stage-progression / wa-lead-relay).
 */
export function parseB2bVerdict(content: string, sourceText: string): B2bVerdict | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    const trimmed = content.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    parsed = JSON.parse(start === -1 || end < start ? trimmed : trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.kind !== "string" || !B2B_KINDS.includes(parsed.kind)) return null;
  if (!Array.isArray(parsed.evidence) || parsed.evidence.length === 0) return null;
  const evidence: string[] = [];
  for (const quote of parsed.evidence) {
    if (typeof quote !== "string" || !quote.trim()) return null;
    if (!sourceText.includes(quote)) return null;
    evidence.push(quote);
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const price =
    typeof parsed.priceAed === "number" && Number.isFinite(parsed.priceAed) && parsed.priceAed > 0
      ? parsed.priceAed
      : null;
  return { kind: parsed.kind as B2bKind, car: str(parsed.car), priceAed: price, contact: str(parsed.contact), evidence };
}

// ─── Pure: the match step ───────────────────────────────────────────────────

export interface FleetVehicle {
  id: string;
  make: string;
  model: string;
  plate: string;
}

/**
 * Fleet cars of the named model minus the ones busy over the requested
 * period. Pure — the SQL adapters hand in the fleet list and the busy ids.
 */
export function planFleetMatch(
  carText: string,
  fleet: FleetVehicle[],
  busyVehicleIds: ReadonlySet<string>
): { freeCount: number; freePlates: string[] } {
  const free = matchFleetVehicles(carText, fleet).filter((v) => !busyVehicleIds.has(v.id));
  return { freeCount: free.length, freePlates: free.map((v) => v.plate) };
}

export interface SupplyOffer {
  id: string;
  carText: string | null;
  priceAed: number | null;
  contactText: string | null;
  sourceLabel: string | null;
  spottedAt: Date;
}

/** "3h ago" — the offer's age on the hint line. */
export function agoShort(at: Date, now: Date): string {
  const mins = Math.max(0, Math.round((now.getTime() - at.getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Fresh supply offers whose car_text covers the named model's tokens — the
 *  same token-subset rule as the fleet match, so both sides agree. */
export function matchSupplyOffers(carText: string, offers: SupplyOffer[]): SupplyOffer[] {
  const tokens = carText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  return offers.filter((o) => {
    const hay = (o.carText ?? "").toLowerCase();
    return hay.length > 0 && tokens.every((t) => hay.includes(t));
  });
}

/** `🔎 G63 needed for <lead> · none free · offered in <group> by <contact> at <price> · 3h ago` */
export function b2bHintLine(input: {
  car: string;
  leadName: string | null;
  offer: SupplyOffer;
  now: Date;
}): string {
  const o = input.offer;
  const parts = [
    `🔎 ${input.car} needed for ${input.leadName ?? "a lead"}`,
    "none free",
    `offered in ${o.sourceLabel ?? "a group"}${o.contactText ? ` by ${o.contactText}` : ""}${o.priceAed ? ` at ${o.priceAed} AED` : ""}`,
    agoShort(o.spottedAt, input.now),
  ];
  return parts.join(" · ");
}

/** The demand-post hint (no spec format — compact, same one-line style). */
export function b2bDemandHintLine(verdict: B2bVerdict, sourceLabel: string): string {
  const parts = ["🤝 B2B demand", verdict.car ?? "?"];
  if (verdict.priceAed) parts.push(`${verdict.priceAed} AED`);
  if (verdict.contact) parts.push(verdict.contact);
  parts.push(sourceLabel);
  return parts.join(" · ");
}

// ─── Core pass (DB-agnostic, fully testable) ────────────────────────────────

export interface B2bMatcherSource {
  loadCheckpoint(): Promise<Date | null>;
  saveCheckpoint(at: Date): Promise<void>;
  /** Inbound GROUP rows (whatsapp @g.us + telegram) since `since`. */
  loadGroupRows(since: Date, limit: number): Promise<B2bGroupRow[]>;
  /** ON CONFLICT (tenant_id, message_ext_id) DO NOTHING. */
  insertOffer(offer: {
    kind: "supply" | "demand";
    carText: string | null;
    priceAed: number | null;
    contactText: string | null;
    sourceLabel: string;
    messageExtId: string;
    bodyExcerpt: string;
    spottedAt: Date;
    expiresAt: Date;
  }): Promise<"inserted" | "duplicate">;
  /** The 24h rail, enforced: delete expired rows. Returns the count. */
  pruneExpired(now: Date): Promise<number>;
  /** Fresh (unexpired) supply offers for the tenant. */
  loadFreshSupply(now: Date): Promise<SupplyOffer[]>;
  /** Fleet cars (own tenant + the brand's shared-fleet bucket). */
  loadFleet(): Promise<FleetVehicle[]>;
  /** Vehicles with an active/reserved rental overlapping [from, to). */
  loadBusyVehicleIds(from: Date, to: Date): Promise<Set<string>>;
}

export interface B2bMatcherDeps {
  client: TwentyClient;
  instance: TwentyInstanceKey;
  tenantSlug: string;
  brandLine: string | null;
  source: B2bMatcherSource;
  complete: ((system: string, user: string) => Promise<string>) | null;
  /** Hint dedupe sidecar (one hint per (opportunity, offer) pair ever). */
  hintKeys: SentKeys;
  /** The manager DM (runner resolves telegram_link and sends, or logs). */
  sendHint: (text: string) => Promise<void>;
}

export interface B2bMatcherPassOptions {
  commit?: boolean;
  since?: Date;
  batch?: number;
  rowLimit?: number;
  sinceDays?: number;
  now?: Date;
  logger?: (line: string) => void;
}

export interface B2bMatcherPassCounts {
  threads: number;
  classified: number;
  supply: number;
  demand: number;
  customerRequest: number;
  staffChatter: number;
  noise: number;
  noEvidence: number;
  offersInserted: number;
  offersDuplicate: number;
  pruned: number;
  oppsChecked: number;
  oppsShort: number;
  hintsSent: number;
  failed: number;
  firstError?: string;
}

const DEFAULT_BATCH = 50;
const DEFAULT_ROW_LIMIT = 500;

function emptyCounts(): B2bMatcherPassCounts {
  return {
    threads: 0, classified: 0, supply: 0, demand: 0, customerRequest: 0,
    staffChatter: 0, noise: 0, noEvidence: 0, offersInserted: 0, offersDuplicate: 0,
    pruned: 0, oppsChecked: 0, oppsShort: 0, hintsSent: 0, failed: 0,
  };
}

export async function runB2bMatcherPass(
  deps: B2bMatcherDeps,
  opts: B2bMatcherPassOptions = {}
): Promise<B2bMatcherPassCounts> {
  const { client, source } = deps;
  const commit = opts.commit ?? false;
  const log = opts.logger ?? (() => {});
  const counts = emptyCounts();
  const now = opts.now ?? new Date();

  const passStart = now;
  const checkpoint = await source.loadCheckpoint();
  const since =
    opts.since ?? checkpoint ?? new Date(passStart.getTime() - (opts.sinceDays ?? 3) * 86_400_000);

  const rows = await source.loadGroupRows(since, opts.rowLimit ?? DEFAULT_ROW_LIMIT);
  const threads = [...buildGroupThreads(rows).values()]
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
    .slice(0, opts.batch ?? DEFAULT_BATCH);
  counts.threads = threads.length;

  for (const thread of threads) {
    try {
      if (!deps.complete) {
        counts.noEvidence++;
        continue;
      }
      const prompt = buildB2bPrompt(thread);
      let content: string;
      try {
        content = await deps.complete(prompt.system, prompt.user);
      } catch (e) {
        counts.failed++;
        counts.firstError ??= `model/${thread.key}: ${(e as Error).message.slice(0, 160)}`;
        continue;
      }
      const verdict = parseB2bVerdict(content, prompt.sourceText);
      if (!verdict) {
        counts.noEvidence++;
        continue;
      }
      counts.classified++;

      if (verdict.kind === "customer_request") counts.customerRequest++;
      else if (verdict.kind === "staff_chatter") counts.staffChatter++;
      else if (verdict.kind === "noise") counts.noise++;

      if (verdict.kind === "b2b_supply" || verdict.kind === "b2b_demand") {
        if (verdict.kind === "b2b_supply") counts.supply++;
        else counts.demand++;
        log(
          `[b2b-matcher] ${commit ? "OFFER" : "DRY  "} ${verdict.kind} · ${verdict.car ?? "?"} · ` +
            `${verdict.priceAed ?? "?"} AED · ${verdict.contact ?? "?"} · ${thread.sourceLabel}`
        );
        if (commit) {
          const result = await source.insertOffer({
            kind: verdict.kind === "b2b_supply" ? "supply" : "demand",
            carText: verdict.car,
            priceAed: verdict.priceAed,
            contactText: verdict.contact,
            sourceLabel: thread.sourceLabel,
            messageExtId: thread.extId,
            bodyExcerpt: thread.lines[thread.lines.length - 1]?.body.slice(0, 300) ?? "",
            spottedAt: thread.lastActivityAt,
            expiresAt: new Date(thread.lastActivityAt.getTime() + OFFER_TTL_MS),
          });
          if (result === "inserted") counts.offersInserted++;
          else counts.offersDuplicate++;
        }

        // Demand → the manager hint DM. THE DM IS THE ROUTING (owner
        // 2026-08-13: groups must not create cards in Twenty) — the demand
        // offer row above keeps it in the index; no opportunity is created.
        if (verdict.kind === "b2b_demand") {
          const hint = b2bDemandHintLine(verdict, thread.sourceLabel);
          log(`[b2b-matcher] ${commit ? "HINT " : "DRY  "} ${hint}`);
          // One DM per demand post ever — with no card, the sidecar key is
          // the only thing standing between a --since overlap and a re-DM.
          const hintKey = `b2b-demand-hint:${deps.tenantSlug}:${thread.extId}`;
          if (commit && !deps.hintKeys.has(hintKey)) {
            await deps.sendHint(hint);
            deps.hintKeys.add(hintKey);
            counts.hintsSent++;
          }
        }
      }
    } catch (e) {
      counts.failed++;
      counts.firstError ??= `thread/${thread.key}: ${(e as Error).message.slice(0, 160)}`;
    }
  }

  if (commit) {
    // The 24h rail, enforced — expired offers are deleted, never suggested.
    counts.pruned = await source.pruneExpired(now);
  }

  // ── The match step: recently-active open deals naming a car, fleet short
  //    → fresh supply → one hint per (opportunity, offer) pair ever.
  const candidateOpps: Record<string, unknown>[] = [];
  for await (const rec of client.listAll<Record<string, unknown>>("opportunities", {
    filter: `updatedAt[gte]:${since.toISOString()}`,
  })) {
    if (deps.brandLine !== null && rec.brandLine !== deps.brandLine) continue;
    const stage = typeof rec.stage === "string" ? rec.stage : null;
    if (stage && CLOSED_STAGES.has(stage)) continue;
    if (typeof rec.carModels !== "string" || !rec.carModels.trim()) continue;
    candidateOpps.push(rec);
  }

  if (candidateOpps.length > 0) {
    const [fleet, freshSupply] = await Promise.all([
      source.loadFleet(),
      source.loadFreshSupply(now),
    ]);

    for (const rec of candidateOpps) {
      const car = (rec.carModels as string).trim();
      const period = requestedPeriod(rec, now);
      // Busy is judged against THIS deal's exact window — a car booked next
      // month is free for this week's rental.
      const busy = await source.loadBusyVehicleIds(period.from, period.to);
      const { freeCount } = planFleetMatch(car, fleet, busy);
      counts.oppsChecked++;
      if (freeCount > 0) continue;
      counts.oppsShort++;

      const offers = matchSupplyOffers(car, freshSupply);
      for (const offer of offers) {
        const key = `b2b-hint:${String(rec.id)}:${offer.id}`;
        if (deps.hintKeys.has(key)) continue;
        const line = b2bHintLine({
          car,
          leadName: typeof rec.name === "string" ? rec.name : null,
          offer,
          now,
        });
        log(`[b2b-matcher] ${commit ? "HINT " : "DRY  "} ${line}`);
        if (commit) {
          try {
            await deps.sendHint(line);
            deps.hintKeys.add(key);
            counts.hintsSent++;
          } catch (e) {
            counts.failed++;
            counts.firstError ??= `hint/${key}: ${(e as Error).message.slice(0, 160)}`;
          }
        }
      }
    }
  }

  if (commit) {
    await deps.hintKeys.persist();
    // Checkpoint advances past the whole pass — classified, noise AND failed
    // alike (stage-progression semantics). Dry-run never moves it.
    await source.saveCheckpoint(passStart);
  }

  return counts;
}

/** The deal's requested window: neededFrom + rentalDays when the card carries
 *  them, else [now, now+30d] — "is anything free for this at all". */
function requestedPeriod(rec: Record<string, unknown>, now: Date): { from: Date; to: Date } {
  const days = typeof rec.rentalDays === "number" && rec.rentalDays > 0 ? rec.rentalDays : 30;
  const raw = typeof rec.neededFrom === "string" ? Date.parse(rec.neededFrom) : NaN;
  const from = Number.isNaN(raw) ? now : new Date(raw);
  return { from, to: new Date(from.getTime() + days * 86_400_000) };
}

// ─── Drizzle plumbing ───────────────────────────────────────────────────────

const CHECKPOINT_ENTITY = "b2b_matcher";

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function sqlRows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

// Same shared-fleet convention as deal-confirmation: rental cars live under
// the take-auto tenant, split by company (import-babek-fleet.ts).
const BRAND_COMPANY: Record<string, string> = { cardiwan: "cardiwan", easyrent: "etm", etm: "etm" };

export function createDrizzleB2bMatcherSource(
  db: PlatformDb,
  tenantId: string,
  brandLine: string | null
): B2bMatcherSource {
  return {
    async loadCheckpoint() {
      const [row] = await db
        .select({ counts: twentyMirrorState.counts })
        .from(twentyMirrorState)
        .where(and(eq(twentyMirrorState.tenantId, tenantId), eq(twentyMirrorState.entity, CHECKPOINT_ENTITY)))
        .limit(1);
      const ts = (row?.counts as { checkpoint?: string } | undefined)?.checkpoint;
      return ts ? new Date(ts) : null;
    },

    async saveCheckpoint(at) {
      await db.execute(sql`
        INSERT INTO twenty_mirror_state (tenant_id, entity, cursor, counts, status, updated_at)
        VALUES (${tenantId}, ${CHECKPOINT_ENTITY}, '', ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, 'running', now())
        ON CONFLICT (tenant_id, entity)
        DO UPDATE SET counts = ${JSON.stringify({ checkpoint: at.toISOString() })}::jsonb, updated_at = now()
      `);
    },

    async loadGroupRows(since, limit) {
      // GROUP ROWS ONLY: WA groups (from ends @g.us) and every telegram row
      // (the tg importer only writes group observations). Direct chats are
      // customers — the wa-lead-relay owns those.
      const res = await db.execute(sql`
        SELECT id, channel, "from", from_pn, "to", customer_name, body,
               external_message_id, created_at
          FROM message
         WHERE tenant_id = ${tenantId}
           AND direction = 'inbound'
           AND body IS NOT NULL
           AND created_at > ${since}
           AND (channel = 'telegram' OR "from" LIKE '%@g.us')
         ORDER BY created_at ASC
         LIMIT ${limit}
      `);
      interface Row {
        id: string; channel: string; from: string | null; from_pn: string | null;
        to: string | null; customer_name: string | null; body: string | null;
        external_message_id: string | null; created_at: string;
      }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id,
        channel: r.channel,
        from: r.from,
        fromPn: r.from_pn,
        to: r.to,
        customerName: r.customer_name,
        body: r.body,
        extId: r.external_message_id,
        createdAt: new Date(r.created_at),
      }));
    },

    async insertOffer(offer) {
      const res = await db.execute(sql`
        INSERT INTO b2b_offer (tenant_id, kind, car_text, price_aed, contact_text,
                               source_label, message_ext_id, body_excerpt, spotted_at, expires_at)
        VALUES (${tenantId}, ${offer.kind}, ${offer.carText}, ${offer.priceAed}, ${offer.contactText},
                ${offer.sourceLabel}, ${offer.messageExtId}, ${offer.bodyExcerpt},
                ${offer.spottedAt.toISOString()}, ${offer.expiresAt.toISOString()})
        ON CONFLICT (tenant_id, message_ext_id) DO NOTHING
      `);
      return (res as { rowCount?: number }).rowCount === 1 ? "inserted" : "duplicate";
    },

    async pruneExpired(now) {
      const res = await db.execute(sql`
        DELETE FROM b2b_offer WHERE tenant_id = ${tenantId} AND expires_at <= ${now.toISOString()}
      `);
      return (res as { rowCount?: number }).rowCount ?? 0;
    },

    async loadFreshSupply(now) {
      const res = await db.execute(sql`
        SELECT id, car_text, price_aed, contact_text, source_label, spotted_at
          FROM b2b_offer
         WHERE tenant_id = ${tenantId}
           AND kind = 'supply'
           AND expires_at > ${now.toISOString()}
         ORDER BY spotted_at DESC
         LIMIT 500
      `);
      interface Row {
        id: string; car_text: string | null; price_aed: number | null;
        contact_text: string | null; source_label: string | null; spotted_at: string;
      }
      return sqlRows<Row>(res).map((r) => ({
        id: r.id,
        carText: r.car_text,
        priceAed: r.price_aed,
        contactText: r.contact_text,
        sourceLabel: r.source_label,
        spottedAt: new Date(r.spotted_at),
      }));
    },

    async loadFleet() {
      const companySlug = brandLine ? (BRAND_COMPANY[brandLine] ?? null) : null;
      const res = await db.execute(sql`
        SELECT v.id, v.make, v.model, v.plate
          FROM vehicle v
          JOIN tenant t ON t.id = v.tenant_id
          LEFT JOIN company c ON c.id = v.company_id
         WHERE v.tenant_id = ${tenantId}
            OR (t.slug = 'take-auto' AND (${companySlug}::text IS NULL OR c.slug = ${companySlug}))
      `);
      return sqlRows<FleetVehicle>(res);
    },

    async loadBusyVehicleIds(from, to) {
      // active | reserved = the car is spoken for. Overlap: the rental's
      // [start, return) intersects the requested window. Rentals of the
      // shared fleet live under the take-auto tenant, same as the vehicles.
      const res = await db.execute(sql`
        SELECT r.vehicle_id
          FROM rental r
          JOIN tenant t ON t.id = r.tenant_id
         WHERE (r.tenant_id = ${tenantId} OR t.slug = 'take-auto')
           AND r.status IN ('active', 'reserved')
           AND r.start_date < ${to.toISOString()}
           AND r.return_date > ${from.toISOString()}
      `);
      return new Set(sqlRows<{ vehicle_id: string }>(res).map((r) => r.vehicle_id));
    },
  };
}
