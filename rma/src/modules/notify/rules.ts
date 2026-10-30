/**
 * rules.ts — push-first v1: WHAT gets pushed to whom. Delivery policy (flags,
 * allowlist, quiet hours, rate cap, dedupe) lives entirely in send.ts; every
 * rule here just computes its signal from data the platform already has and
 * describes the ping.
 *
 *   1. "Клиент ждёт"      — breached Board conversations → line/deal owner.
 *      Implemented by modules/board/escalation.ts (now routed through
 *      send.ts); re-exported here so the heartbeat has one entry point.
 *   2. "Горячий лид на тебя" — an owned deal appeared and it has real WhatsApp
 *      context stitched to it → ping the owner within a heartbeat tick.
 *   3. Morning digest 09:00 — each deal owner: your hot deals, your zombies.
 *   4. CEO digest 09:00    — yesterday's numbers across the businesses.
 *
 * All rules take {dryRun} (compute + log, send nothing) and an injectable
 * `now`. Rule 2 has a first-run backfill guard: if the tenant has never
 * recorded a hot_deal notification, the current backlog is written to the
 * ledger as 'backfill' WITHOUT sending — so flipping the flag on doesn't
 * blast the team with months of history.
 */

import { and, desc, eq, gte, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { deal, message, notification, tenant, user, rental, customer, vehicle } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { getBreachedCards } from "@/modules/board/queries";
import { resolveOwnerForLine, resolveOwnerByKey } from "@/modules/board/owners";
import { sendNotification, type SendOutcome } from "./send";
import { ceoDigestKey, dubaiDateKey, digestKey, dubaiDayStartUtc, dubaiHour, hotDealKey, perContactKey } from "./policy";
import { formatSlaByOwner } from "./sla-rollup";
import { ownerKeyForUser, ownerUserId } from "./registry";
import { qualifiesAsLead, WA_LEAD_SOURCE, waLeadExternalId } from "@/modules/crm/lead-from-whatsapp";
import { detectLeadOrigin, leadOriginNotes } from "@/modules/crm/lead-origin";
import { isBroadcast } from "@/modules/messaging/competitor";
import { workMinutesBetween } from "@/modules/messaging/heat";

export { escalateBreachedBoardCards as notifyWaitingClients } from "@/modules/board/escalation";

export type RuleOpts = { dryRun?: boolean; now?: Date };

export type RuleSummary = {
  rule: string;
  scanned: number;
  outcomes: Partial<Record<SendOutcome, number>>;
};

function tally(summary: RuleSummary, outcome: SendOutcome) {
  summary.outcomes[outcome] = (summary.outcomes[outcome] ?? 0) + 1;
}

function baseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

async function tenantSlug(tenantId: string): Promise<string> {
  const [t] = await db.select({ slug: tenant.slug }).from(tenant).where(eq(tenant.id, tenantId)).limit(1);
  return t?.slug ?? tenantId;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

// ─── Rule 2: "Горячий лид на тебя" ──────────────────────────────────────────

const HOT_DEAL_WINDOW_HOURS = 24;

type HotDeal = {
  id: string;
  ref: string;
  ownerId: string;
  ownerName: string | null;
  customerName: string | null;
  vouchedCar: string | null;
  vouchedValue: number | null;
  lastLine: string | null;
};

/** Newest stitched inbound line for the deal's lead — the "why it's hot". */
const lastInboundLineExpr = sql<string | null>`(
  select m.body from message m
  where m.tenant_id = ${deal.tenantId}
    and m.related_entity_type = 'lead'
    and m.related_entity_id = ${deal.leadId}
    and m.direction = 'inbound'
  order by m.created_at desc
  limit 1
)`;

async function findHotDeals(tenantId: string, now: Date): Promise<HotDeal[]> {
  const cutoff = new Date(now.getTime() - HOT_DEAL_WINDOW_HOURS * HOUR_MS);
  const rows = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select({
        id: deal.id,
        ref: deal.ref,
        ownerId: deal.ownerId,
        ownerName: user.name,
        customerName: sql<string | null>`(select l.customer_name from lead l where l.id = ${deal.leadId})`,
        vouchedCar: deal.vouchedCar,
        vouchedValue: deal.vouchedValue,
        lastLine: lastInboundLineExpr,
      })
      .from(deal)
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(
        and(
          eq(deal.status, "open"),
          isNotNull(deal.ownerId),
          isNotNull(deal.leadId),
          gte(deal.createdAt, cutoff),
        ),
      )
      .orderBy(desc(deal.createdAt))
      .limit(100),
  );
  // Hot = there is actual WhatsApp context stitched to it (a customer line or
  // vouched facts) — an owned deal with no conversation is just data entry.
  return (rows as HotDeal[]).filter((r) => r.ownerId && (r.lastLine || r.vouchedCar));
}

async function hotDealLedgerCount(tenantId: string): Promise<number> {
  return withDrizzleTenant(tenantId, async (tx) => {
    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(notification)
      .where(eq(notification.kind, "hot_deal"));
    return row?.n ?? 0;
  });
}

export async function notifyHotDeals(tenantId: string, opts: RuleOpts = {}): Promise<RuleSummary> {
  const now = opts.now ?? new Date();
  const summary: RuleSummary = { rule: "hot_deal", scanned: 0, outcomes: {} };

  const hot = await findHotDeals(tenantId, now);
  summary.scanned = hot.length;
  if (hot.length === 0) return summary;

  // First-run backfill guard: never blast the existing backlog.
  const backfill = !opts.dryRun && (await hotDealLedgerCount(tenantId)) === 0;
  if (backfill) {
    console.log(`[notify] hot_deal first run — backfilling ${hot.length} existing deals without sending`);
  }

  const slug = await tenantSlug(tenantId);
  for (const d of hot) {
    const who = d.customerName?.trim() || d.ref;
    const facts = [
      d.vouchedCar ? `Car: ${d.vouchedCar}` : null,
      d.vouchedValue ? `Budget: ${d.vouchedValue} AED` : null,
    ].filter(Boolean);
    const text = [
      `🔥 Hot lead for you: ${who}`,
      ...facts,
      d.lastLine ? `Client: "${d.lastLine.slice(0, 160)}"` : null,
      ``,
      `Open: ${baseUrl()}/${slug}/deals?deal=${d.id}`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    const res = await sendNotification(tenantId, {
      kind: "hot_deal",
      target: { userId: d.ownerId },
      text,
      dedupeKey: hotDealKey(d.id),
      entityType: "deal",
      entityId: d.id,
      dryRun: opts.dryRun,
      backfill,
      now,
    });
    tally(summary, res.outcome);
  }
  return summary;
}

// ─── Rule 3: morning digest per deal owner ──────────────────────────────────

const ZOMBIE_AFTER_DAYS = 14;

function digestHour(): number {
  const n = Number(process.env.NOTIFY_DIGEST_HOUR ?? "9");
  return Number.isFinite(n) ? n : 9;
}

type OwnerRow = { ownerId: string; ownerName: string | null };

async function activeDealOwners(tenantId: string): Promise<OwnerRow[]> {
  const rows = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .selectDistinct({ ownerId: deal.ownerId, ownerName: user.name })
      .from(deal)
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(and(eq(deal.status, "open"), isNotNull(deal.ownerId))),
  );
  return (rows as (OwnerRow | { ownerId: null })[]).filter((r): r is OwnerRow => Boolean(r.ownerId));
}

export async function sendMorningDigests(
  tenantId: string,
  opts: RuleOpts & { forceHour?: boolean } = {},
): Promise<RuleSummary> {
  const now = opts.now ?? new Date();
  const summary: RuleSummary = { rule: "digest", scanned: 0, outcomes: {} };
  if (!opts.forceHour && dubaiHour(now) !== digestHour()) return summary;

  const owners = await activeDealOwners(tenantId);
  summary.scanned = owners.length;
  if (owners.length === 0) return summary;

  const slug = await tenantSlug(tenantId);
  const zombieCutoff = new Date(now.getTime() - ZOMBIE_AFTER_DAYS * DAY_MS);
  const hotCutoff = new Date(now.getTime() - 2 * DAY_MS);
  const breached = await getBreachedCards(tenantId);

  for (const o of owners) {
    const [hotDeals, zombies] = await withDrizzleTenant(tenantId, async (tx) =>
      Promise.all([
        tx
          .select({ id: deal.id, ref: deal.ref, vouchedCar: deal.vouchedCar })
          .from(deal)
          .where(
            and(eq(deal.status, "open"), eq(deal.ownerId, o.ownerId), gte(deal.createdAt, hotCutoff)),
          )
          .orderBy(desc(deal.createdAt))
          .limit(5),
        tx
          .select({ id: deal.id, ref: deal.ref, lastActivityAt: deal.lastActivityAt })
          .from(deal)
          .where(
            and(
              eq(deal.status, "open"),
              eq(deal.ownerId, o.ownerId),
              or(lt(deal.lastActivityAt, zombieCutoff), sql`${deal.lastActivityAt} IS NULL AND ${deal.createdAt} < ${zombieCutoff.toISOString()}`),
            ),
          )
          .orderBy(sql`${deal.lastActivityAt} ASC NULLS FIRST`)
          .limit(5),
      ]),
    );

    // Waiting conversations on this person's lines, when the env bridge
    // NOTIFY_OWNER_USER_<KEY> ties them to an owner key.
    const key = ownerKeyForUser(o.ownerId);
    const waiting = key
      ? breached.filter((c) => {
          const owner = resolveOwnerByKey(c.assignedTo) ?? resolveOwnerForLine(c.sourceLine);
          return owner?.key === key;
        })
      : [];

    if (hotDeals.length === 0 && zombies.length === 0 && waiting.length === 0) continue;

    const lines: string[] = [`☀️ Good morning${o.ownerName ? `, ${o.ownerName}` : ""}! Your day:`];
    if (waiting.length > 0) {
      lines.push(``, `⏳ Waiting for reply: ${waiting.length}`);
      for (const c of waiting.slice(0, 3)) {
        lines.push(`• ${c.customerName ?? c.customerRef}: ${(c.summary ?? "").slice(0, 60)}`);
      }
    }
    if (hotDeals.length > 0) {
      lines.push(``, `🔥 Fresh deals: ${hotDeals.length}`);
      for (const d of hotDeals.slice(0, 3)) lines.push(`• ${d.ref}${d.vouchedCar ? ` — ${d.vouchedCar}` : ""}`);
    }
    if (zombies.length > 0) {
      lines.push(``, `🧟 Forgotten (no touch in ${ZOMBIE_AFTER_DAYS}+ days): ${zombies.length}`);
      for (const d of zombies.slice(0, 5)) lines.push(`• ${d.ref}`);
    }
    lines.push(``, `All of it: ${baseUrl()}/${slug}/board`);

    const res = await sendNotification(tenantId, {
      kind: "digest",
      target: { userId: o.ownerId, ownerKey: key },
      text: lines.join("\n"),
      dedupeKey: digestKey(o.ownerId, now),
      dryRun: opts.dryRun,
      now,
    });
    tally(summary, res.outcome);
  }
  return summary;
}

// ─── Rule 4: CEO digest ─────────────────────────────────────────────────────

/** Ayham 2026-08-17: daily – weekly – monthly reports. Same digest, wider window. */
export type CeoDigestPeriod = "daily" | "weekly" | "monthly";

export async function sendCeoDigest(
  tenantId: string,
  opts: RuleOpts & { forceHour?: boolean; period?: CeoDigestPeriod } = {},
): Promise<RuleSummary> {
  const now = opts.now ?? new Date();
  const period = opts.period ?? "daily";
  const summary: RuleSummary = { rule: `ceo_digest:${period}`, scanned: 0, outcomes: {} };
  if (!opts.forceHour && dubaiHour(now) !== digestHour()) return summary;

  const ceoUser = process.env.NOTIFY_CEO_USER?.trim() || null;
  // Falls back to the 'ceo' owner key → NOTIFY_TG_CHAT_CEO env.
  const target = ceoUser ? { userId: ceoUser, ownerKey: "ceo" } : { ownerKey: "ceo" };
  summary.scanned = 1;

  const dayStart = dubaiDayStartUtc(now);
  // Window [yStart, dayStart): yesterday / last 7 days / the previous Dubai
  // calendar month. dayStart is always the exclusive end — the digest never
  // counts the partial day it is sent on.
  let yStart: Date;
  if (period === "weekly") {
    yStart = new Date(dayStart.getTime() - 7 * DAY_MS);
  } else if (period === "monthly") {
    const d = new Date(dayStart.getTime() + 4 * 3_600_000); // Dubai wall date
    yStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) - 4 * 3_600_000);
  } else {
    yStart = new Date(dayStart.getTime() - DAY_MS);
  }
  const perfDays = Math.max(1, Math.round((now.getTime() - yStart.getTime()) / DAY_MS));

  const [stats] = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select({
        newDeals: sql<number>`(select count(*) from deal d where d.tenant_id = ${tenantId} and d.created_at >= ${yStart.toISOString()} and d.created_at < ${dayStart.toISOString()})::int`,
        inbound: sql<number>`(select count(*) from message m where m.tenant_id = ${tenantId} and m.direction = 'inbound' and m.created_at >= ${yStart.toISOString()} and m.created_at < ${dayStart.toISOString()})::int`,
        outbound: sql<number>`(select count(*) from message m where m.tenant_id = ${tenantId} and m.direction = 'outbound' and m.created_at >= ${yStart.toISOString()} and m.created_at < ${dayStart.toISOString()})::int`,
        openDeals: sql<number>`(select count(*) from deal d where d.tenant_id = ${tenantId} and d.status = 'open')::int`,
      })
      .from(sql`(select 1) as one`),
  );
  const breached = await getBreachedCards(tenantId);

  // Per-line inbound split — the businesses live on separate WhatsApp lines
  // (external_message_id = 'waobs:<line>:…').
  const perLine = await withDrizzleTenant(tenantId, async (tx) =>
    tx
      .select({
        line: sql<string>`split_part(${message.externalMessageId}, ':', 2)`,
        n: sql<number>`count(*)::int`,
      })
      .from(message)
      .where(
        and(
          eq(message.direction, "inbound"),
          gte(message.createdAt, yStart),
          lt(message.createdAt, dayStart),
          sql`${message.externalMessageId} like 'waobs:%'`,
        ),
      )
      .groupBy(sql`split_part(${message.externalMessageId}, ':', 2)`)
      .orderBy(sql`count(*) desc`),
  );

  const slug = await tenantSlug(tenantId);
  const windowLabel =
    period === "weekly" ? "last 7 days" : period === "monthly" ? "last month" : "yesterday";

  // New lead cards on the Twenty board — the number the manager actually sees
  // (mycrm `deal` counts stay for history but read 0 on rental tenants, which
  // is exactly the "digest says 0, board shows leads" confusion to avoid).
  let twentyLines: string[] = [];
  try {
    const [{ twentyInstanceForTenantSlug, resolveTwentyInstance }, { getTwentyClientForInstance }, { brandLineForTenantSlug }] =
      await Promise.all([
        import("@/platform/integrations/twenty/instance"),
        import("@/platform/integrations/twenty/client"),
        import("@/platform/integrations/twenty/mirror"),
      ]);
    const instanceKey = twentyInstanceForTenantSlug(slug);
    if (resolveTwentyInstance(instanceKey).configured) {
      const twenty = getTwentyClientForInstance(instanceKey);
      const brand = brandLineForTenantSlug(slug);
      let cards = 0;
      let unowned = 0;
      for await (const rec of twenty.listAll<Record<string, unknown>>("opportunities", {
        filter: `createdAt[gte]:${yStart.toISOString()}`,
      })) {
        const created = typeof rec.createdAt === "string" ? Date.parse(rec.createdAt) : NaN;
        if (!Number.isFinite(created) || created >= dayStart.getTime()) continue;
        if (brand !== null && rec.brandLine !== brand) continue;
        cards += 1;
        if (!(typeof rec.ownerId === "string" && rec.ownerId)) unowned += 1;
      }
      twentyLines = [
        `• New lead cards on the board: ${cards}${unowned > 0 ? ` (${unowned} not picked up by anyone yet)` : ""}`,
      ];
    }
  } catch (e) {
    console.warn("[ceo-digest] twenty lead-card count failed:", (e as Error).message);
  }

  const lines = [
    `📊 ${slug} — ${windowLabel}:`,
    ...twentyLines,
    `• New deals: ${stats?.newDeals ?? 0}`,
    `• Messages: ${stats?.inbound ?? 0} in / ${stats?.outbound ?? 0} out`,
    ...(perLine as { line: string; n: number }[]).slice(0, 6).map((l) => `   – ${l.line}: ${l.n}`),
    `• Waiting for reply now: ${breached.length}`,
    `• Open deals total: ${stats?.openDeals ?? 0}`,
  ];

  // P4: per-person performance for the CEO — who performed, who didn't answer.
  try {
    const { computePerformanceBoard } = await import("@/modules/crm/perf-core");
    const perf = await computePerformanceBoard(tenantId, perfDays);
    if (perf.length > 0) {
      lines.push(`👥 Team, ${windowLabel}:`);
      for (const r of perf) {
        const resp = r.inbound > 0 ? `${r.answered}/${r.inbound} answered` : "no inbound";
        const won = r.dealsWon > 0 ? ` · WON ${r.dealsWon} (${r.wonAed.toLocaleString()} AED)` : "";
        const missed = r.callsMissed > 0 ? ` · 📵${r.callsMissed}` : "";
        lines.push(`• ${r.name}: ${r.leads} leads · ${resp}${won}${missed}`);
      }
    }
  } catch (e) {
    console.warn("[ceo-digest] perf block failed:", (e as Error).message);
  }

  // SLA breaches grouped BY PERSON. `breached.length` above is the headline
  // number; a manager also needs to know WHOSE cards they are, or the number
  // tells them something is wrong without telling them what to do about it.
  // Prints nothing when nobody is late — see sla-rollup.ts for why.
  lines.push(...formatSlaByOwner(breached, now.getTime()));

  lines.push(``, `Pulse: ${baseUrl()}/${slug}/board`);

  const text = lines.join("\n");

  // The same digest goes to every manager who is accountable for the team, not
  // only the CEO: NOTIFY_DIGEST_EXTRA_KEYS=mohammed,babek (owner keys, comma
  // separated). Each recipient is a separate send with its own dedupe key, so
  // one unreachable manager never suppresses the others.
  // Per-tenant recipients first (NOTIFY_DIGEST_EXTRA_KEYS_CARDIWAN=ayham),
  // global list as the fallback — the rental manager should not receive the
  // sales digest just because one env var is shared.
  const envSlug = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const extraRaw =
    process.env[`NOTIFY_DIGEST_EXTRA_KEYS_${envSlug}`] ?? process.env.NOTIFY_DIGEST_EXTRA_KEYS ?? "";
  const extraKeys = extraRaw
    .split(",").map((s) => s.trim()).filter(Boolean)
    .filter((k) => k !== "ceo");
  const targets: { userId?: string | null; ownerKey?: string | null }[] = [
    target,
    ...extraKeys.map((k) => ({ ownerKey: k })),
  ];
  summary.scanned = targets.length;

  for (const t of targets) {
    const res = await sendNotification(tenantId, {
      kind: "ceo_digest",
      target: t,
      text,
      // Per-recipient: a shared key would let the first send mark the day done
      // and silently swallow every other manager's copy.
      // Daily keeps the historical key shape; weekly/monthly get their own
      // namespace so all three can land on the same morning.
      dedupeKey: `${ceoDigestKey(now)}${period === "daily" ? "" : `:${period}`}:${t.ownerKey ?? t.userId ?? "?"}`,
      dryRun: opts.dryRun,
      now,
    });
    tally(summary, res.outcome);
  }
  return summary;
}

// ─── Rule 5: hot inbound (the Artur rule, 2026-07-24) ───────────────────────
// A fresh DIRECT message where extraction caught a car or a price = a live
// customer shopping RIGHT NOW (they blast several rentals at once — first
// reply wins). Ping the owner of the receiving LINE within a minute. Groups
// and competitor broadcasts are excluded; dedupe is per-message, so one ask
// pings exactly once. Born from a real miss: a Rolls-Royce Ghost+Cullinan
// ask at 09:42 sat unanswered for 5h while daily caps were burning on
// 14-day-old backlog.
export async function notifyHotInbound(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<RuleSummary> {
  const summary: RuleSummary = { rule: "hot_inbound", scanned: 0, outcomes: {} };

  const rows = await withDrizzleTenant(tenantId, async (tx) => {
    const res = (await tx.execute(sql`
      SELECT m.id, m."to" AS line, coalesce(m.from_pn, m."from") AS contact,
             m.customer_name, m.extracted_car_text AS car,
             m.extracted_price_aed AS price, left(m.body, 120) AS body
      FROM message m
      WHERE m.tenant_id = ${tenantId}
        AND m.channel = 'whatsapp' AND m.direction = 'inbound'
        AND m.created_at >= now() - interval '10 minutes'
        AND (m.extracted_car_text IS NOT NULL OR m.extracted_price_aed IS NOT NULL)
        AND m."to" IS NOT NULL
        -- DMs always qualify; GROUP messages only when someone is SEEKING a
        -- car (the rent-desk demand watcher, Babek onboarding 2026-07-24) —
        -- otherwise group chatter with car names would flood the pings.
        AND (
          m."from" NOT LIKE '%@g.us'
          OR m.body ~* '(looking for|need |required|anyone (have|has)|urgent|available\\?|ищу|нужн|дайте|есть ли)'
        )
        -- The manager already answered this contact on this line recently —
        -- do NOT nag (Firuz: «я уже ответил ему»). Outbound visibility comes
        -- from the observers' fromMe capture (2026-07-24).
        AND NOT EXISTS (
          SELECT 1 FROM message o
          WHERE o.tenant_id = m.tenant_id AND o.direction = 'outbound'
            AND o."to" = m."to" AND o."from" = m."from"
            AND o.created_at >= now() - interval '2 hours'
        )
      ORDER BY m.created_at DESC
      LIMIT 20
    `)) as unknown as { rows: Record<string, unknown>[] };
    return res.rows;
  });

  for (const r of rows) {
    const body = String(r.body ?? "");
    if (isBroadcast(body)) continue; // rival "available cars" blasts
    summary.scanned++;
    const owner = resolveOwnerForLine(String(r.line));
    if (!owner) { tally(summary, "skipped_no_chat"); continue; }

    const who = (r.customer_name as string) || (r.contact as string);
    const what = [r.car, r.price ? `${Number(r.price).toLocaleString()} AED` : null]
      .filter(Boolean)
      .join(" · ");
    const text =
      `🔥 Hot inbound — reply first!\n` +
      `${who} (${r.contact})\n` +
      `Asking: ${what}\n` +
      `"${body.slice(0, 100)}"\n` +
      `Line: ${r.line}. The client is messaging competitors too — speed wins.`;

    const res = await sendNotification(tenantId, {
      kind: "hot_inbound",
      target: { ownerKey: owner.key },
      text,
      // Shared per-contact-per-day key (see perContactKey) — first rule to fire
      // for this manager+client wins; hot_inbound and every hunter dedupe out on
      // the same key, so one client is at most one ping/manager/day.
      dedupeKey: perContactKey(owner.key, String(r.contact), new Date()),
      entityType: "message",
      entityId: String(r.id),
      dryRun: opts.dryRun,
    });
    tally(summary, res.outcome);
  }
  return summary;
}

// ─── Rule 6: personal hunters — standing agents per manager ────────────────
// Owner orders 2026-07-24: «always be on lookout for Azat … lease-to-own /
// long-term» and «for Firuz a separate agent — economy class is his game».
// One engine, one PROFILE per person: a profile is just an extra WHERE on
// the already-extracted stream. Trash filters (rival broadcasts, internal
// team chatter) and one-ping-per-contact-per-day are shared. Adding the next
// hunter = one entry in HUNTERS.
const TEAM_PHONES = new Set([
  "97143742002", "97143742003", "971529965085", "971569808087",
  "971542445835", "971509082870", "971567235539", "971564048816", "971585809747",
]);

type HunterProfile = {
  /** owner key the pings go to (env-overridable per profile). */
  key: string;
  /** ledger kind + dedupe namespace. */
  kind: string;
  /** ping headline. */
  title: string;
  /** SQL condition over `message m` that makes a line THIS hunter's prey. */
  where: ReturnType<typeof sql>;
};

const HUNTERS: HunterProfile[] = [
  {
    key: process.env.NOTIFY_LEASE_HUNTER_KEY?.trim() || "azat",
    kind: "lease_hunt",
    title: "🎯 Leasing opportunity!",
    where: sql`(
      m.extracted_intent IN ('lease', 'lease_to_own')
      OR m.extracted_term_months >= 3
      OR m.body ~* '(lease.to.own|rent.to.own|long[- ]?term|monthly basis|[3-9] months|12 months|1 year|yearly|с выкупом|выкуп|рассрочк|долгосрочн|помесячн|на пол ?года|на год)'
    )`,
  },
  {
    key: process.env.NOTIFY_ECON_HUNTER_KEY?.trim() || "firuz",
    kind: "econ_hunt",
    title: "🚗 Economy client!",
    where: sql`(
      m.extracted_car_text ~* '(kia|hyundai|sunny|attrage|mirage|corolla|yaris|camry|altima|kicks|pegas|accent|elantra|sentra|cerato|picanto|creta|tucson|jetour|chery|exeed|mg ?5|mg ?zs|spark|groove|aveo)'
      OR m.body ~* '(cheap|cheapest|budget|econom|affordable|lowest price|эконом|дешев|бюджет|недорог)'
      OR (m.extracted_price_aed BETWEEN 40 AND 200)
    )`,
  },
];

export async function notifyHunters(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<RuleSummary[]> {
  const summaries: RuleSummary[] = [];

  for (const h of HUNTERS) {
    const summary: RuleSummary = { rule: h.kind, scanned: 0, outcomes: {} };
    summaries.push(summary);

    const rows = await withDrizzleTenant(tenantId, async (tx) => {
      const res = (await tx.execute(sql`
        SELECT m.id, m."to" AS line, coalesce(m.from_pn, m."from") AS contact,
               m.customer_name, m.extracted_intent AS intent,
               m.extracted_term_months AS term, m.extracted_car_text AS car,
               m.extracted_price_aed AS price, left(m.body, 160) AS body
        FROM message m
        WHERE m.tenant_id = ${tenantId}
          AND m.channel = 'whatsapp' AND m.direction = 'inbound'
          AND m.created_at >= now() - interval '15 minutes'
          AND m."to" IS NOT NULL
          AND ${h.where}
          -- Firuz: «я с ними уже давно общаюсь, что ты мне их отправляешь».
          -- If the manager already answered this contact on this line in the
          -- last 2h, they are on it — do NOT hand it to a hunter. Mirrors the
          -- same guard in notifyHotInbound; outbound visibility = fromMe capture.
          AND NOT EXISTS (
            SELECT 1 FROM message o
            WHERE o.tenant_id = m.tenant_id AND o.direction = 'outbound'
              AND o."to" = m."to" AND o."from" = m."from"
              AND o.created_at >= now() - interval '2 hours'
          )
        ORDER BY m.created_at DESC
        LIMIT 20
      `)) as unknown as { rows: Record<string, unknown>[] };
      return res.rows;
    });

    for (const r of rows) {
      const body = String(r.body ?? "");
      const contactDigits = String(r.contact ?? "").replace(/\D/g, "").slice(-12);
      if (isBroadcast(body)) continue;              // rival blasts
      if (TEAM_PHONES.has(contactDigits)) continue; // internal chatter
      summary.scanned++;

      const who = (r.customer_name as string) || (r.contact as string);
      const facts = [
        r.car ? `car: ${r.car}` : null,
        r.intent ? `intent: ${r.intent}` : null,
        r.term ? `term: ${r.term} mo` : null,
        r.price != null ? `price: ${r.price} AED` : null,
      ].filter(Boolean).join(" · ");

      const res = await sendNotification(tenantId, {
        kind: h.kind,
        target: { ownerKey: h.key },
        text:
          `${h.title}\n` +
          `${who} (${r.contact})\n` +
          (facts ? `${facts}\n` : "") +
          `"${body.slice(0, 140)}"\n` +
          `Line: ${r.line}`,
        // Shared per-contact-per-day key (see perContactKey): same manager never
        // gets one client twice a day across hot_inbound + any hunter.
        dedupeKey: perContactKey(h.key, contactDigits, new Date()),
        entityType: "message",
        entityId: String(r.id),
        dryRun: opts.dryRun,
      });
      tally(summary, res.outcome);

      // Watchers don't just ping — they BRING THE LEAD (owner 2026-07-29):
      // a fresh hunter hit with no existing lead for this phone becomes a real
      // lead, source-stamped so the platform never holds a lead without a
      // demonstrable origin (source=hunter:<kind>, phone = the contact, and
      // the stitched chat on the lead card shows the original conversation).
      if (res.outcome === "sent") {
        await ensureHunterLead(tenantId, h, r, contactDigits, who, body, facts);
      }
    }
  }
  return summaries;
}

async function ensureHunterLead(
  tenantId: string,
  h: HunterProfile,
  r: Record<string, unknown>,
  contactDigits: string,
  who: string,
  body: string,
  facts: string,
): Promise<void> {
  const car = typeof r.car === "string" && r.car.trim() ? r.car.trim().slice(0, 200) : null;
  const term = Number.isFinite(Number(r.term)) && Number(r.term) > 0 ? Math.trunc(Number(r.term)) : null;
  const price = Number.isFinite(Number(r.price)) && Number(r.price) > 0 ? Math.trunc(Number(r.price)) : null;
  const intent = typeof r.intent === "string" && r.intent.trim() ? r.intent.trim() : null;
  // A marketplace enquiry against one of our own listings — it names the car
  // and, for Dubizzle's notification shape, the only inbox that can answer.
  const origin = detectLeadOrigin(body);
  // The bar: someone to reach AND something they want. A "hi" from a real
  // number is a message, not a lead — the manager was already pinged, and a
  // card that says nothing costs more attention than it returns.
  if (
    !qualifiesAsLead(contactDigits, {
      car,
      intent,
      termMonths: term,
      priceAed: price,
      marketplaceListingUrl: origin?.listingUrl,
    })
  ) {
    return;
  }
  const tail = contactDigits.slice(-9);
  const assigned = ownerUserId(h.key);
  // The manager who opens this lead gets what the WATCHER saw — the client's
  // own words and the read of them. The card used to carry a row id and a
  // date, i.e. proof that something happened and no way to know what (owner,
  // 2026-08-10: «it does not show the origin, the contact, the details»).
  const notes = origin
    ? // A marketplace enquiry says where it came from better than we can:
      // which of our listings, its reference, and how to answer it.
      `${leadOriginNotes(origin, body)}\n` +
      `\nLine: ${r.line} · ${new Date().toISOString().slice(0, 10)}\nOrigin message ${r.id}`
    : `WhatsApp lead — ${h.title}\n` +
      `Client: ${who} (${r.contact})\n` +
      (facts ? `${facts}\n` : "") +
      `\nWhat they wrote:\n"${body.slice(0, 500)}"\n` +
      `\nLine: ${r.line} · hunter ${h.kind} · ${new Date().toISOString().slice(0, 10)}\n` +
      `Origin message ${r.id}`;
  // Where it came from, in the field built for it — "hunter:econ_hunt" is our
  // plumbing word, not an origin a human can act on. A marketplace names
  // itself: "Dubizzle · CARDIWAN FOR CAR RENTAL CO. L.L.C".
  const sourceDescription = origin?.label ?? `WhatsApp · line ${r.line}`;
  try {
    await withDrizzleTenant(tenantId, async (tx) => {
      const existing = (await tx.execute(sql`
        SELECT id FROM lead
        WHERE tenant_id = ${tenantId}
          AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = ${tail}
        LIMIT 1
      `)) as unknown as { rows: { id: string }[] };
      if (existing.rows.length > 0) return;
      await tx.execute(sql`
        INSERT INTO lead (
          tenant_id, customer_name, phone, source, source_description, status,
          assigned_to, notes, stage_detail, vouched_car, vouched_term, vouched_value,
          external_id, external_source
        )
        VALUES (
          ${tenantId},
          ${who.slice(0, 200)},
          ${contactDigits},
          ${origin ? origin.channel : `hunter:${h.kind}`},
          ${sourceDescription},
          'new',
          ${assigned},
          ${notes},
          ${h.title.slice(0, 200)},
          ${car},
          ${term},
          ${price},
          -- Without these two the mirror skips the row (it requires an
          -- externalId and a known externalSource), which is why a hunter lead
          -- reached the platform DB and then existed nowhere the desk looks.
          -- Same phone-keyed id as every other WhatsApp lead, so one client
          -- writing on two lines stays one lead.
          ${waLeadExternalId(contactDigits)},
          ${WA_LEAD_SOURCE}
        )
      `);
    });
  } catch (e) {
    // Lead creation must never break the ping pipeline — log and move on.
    console.error(`[${h.kind}] ensureHunterLead failed:`, (e as Error).message);
  }
}

// ─── Rule 7: payment-link follow-up — «eyes for Babek» (owner 2026-07-24) ──
// «If he sent a payment link, remind once, then again.» When a manager sends
// a payment link on their line and the client hasn't since sent proof/paid,
// nudge the SENDER: reminder #1 after ~3 work-hours, reminder #2 after
// ~1 work-day. Two nudges max (ledger keys payfollow:<id>:1 / :2). Uses the
// outbound capture (bridge fromMe). Runs per business tenant.
const PAY_LINK_RE =
  /(ziina|telr|tap\.company|checkout\.stripe|payby|mamopay|network ?international|paylink|payment link|pay(ment)? here|оплат[аеиуы]|ссылк[аеиу] на оплат)/i;
const URL_RE = /https?:\/\/\S+/i;

export async function notifyPaymentFollowups(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<RuleSummary> {
  const summary: RuleSummary = { rule: "pay_followup", scanned: 0, outcomes: {} };

  // Outbound payment-link messages in the last 3 days, with the client's last
  // reply time after it and whether we already reminded.
  const rows = await withDrizzleTenant(tenantId, async (tx) => {
    const res = (await tx.execute(sql`
      SELECT o.id, o."to" AS line, o."from" AS contact_jid, o.created_at AS sent_at,
             left(o.body, 120) AS body,
             (SELECT max(i.created_at) FROM message i
              WHERE i.tenant_id = ${tenantId} AND i."to" = o."to"
                AND i."from" = o."from" AND i.direction = 'inbound'
                AND i.created_at > o.created_at) AS client_reply_at,
             (SELECT max(o2.created_at) FROM message o2
              WHERE o2.tenant_id = ${tenantId} AND o2."to" = o."to"
                AND o2."from" = o."from" AND o2.direction = 'outbound'
                AND o2.created_at > o.created_at
                AND o2.body ~* '(paid|received|confirm|got it|оплачен|получил|подтвержд)') AS closed_at
      FROM message o
      WHERE o.tenant_id = ${tenantId} AND o.channel = 'whatsapp'
        AND o.direction = 'outbound' AND o."to" IS NOT NULL
        AND o.created_at >= now() - interval '3 days'
        AND o.body ~* ${PAY_LINK_RE.source}
      ORDER BY o.created_at DESC
      LIMIT 60
    `)) as unknown as { rows: Record<string, unknown>[] };
    return res.rows;
  });

  const now = new Date();
  for (const r of rows) {
    const body = String(r.body ?? "");
    // Require an actual link OR an explicit payment phrase (avoid "оплата"
    // mentioned in passing without a link being sent).
    if (!URL_RE.test(body) && !/payment link|ссылк[аеиу] на оплат|pay here/i.test(body)) continue;
    if (r.closed_at) continue; // already confirmed paid → nothing to chase
    summary.scanned++;

    const owner = resolveOwnerForLine(String(r.line));
    if (!owner) { tally(summary, "skipped_no_chat"); continue; }
    const mins = workMinutesBetween(new Date(r.sent_at as string), now);

    // Stage: #2 after a work-day, else #1 after 3 work-hours.
    let stage = 0;
    if (mins >= 20 * 60) stage = 2;
    else if (mins >= 3 * 60) stage = 1;
    if (stage === 0) continue;

    const clientReplied = Boolean(r.client_reply_at);
    const contact = String(r.contact_jid ?? "").replace(/@.*/, "");
    const text =
      `💸 Payment not confirmed${stage === 2 ? " (2nd reminder)" : ""}\n` +
      `Client ${contact}: you sent the link/details ${Math.floor(mins / 60)}h ago (work hours).\n` +
      (clientReplied ? "Client replied — check whether they paid.\n" : "Client is silent — nudge them.\n") +
      `"${body.slice(0, 90)}"\nLine: ${r.line}`;

    const res = await sendNotification(tenantId, {
      kind: "pay_followup",
      target: { ownerKey: owner.key },
      text,
      dedupeKey: `payfollow:${r.id}:${stage}`,
      entityType: "message",
      entityId: String(r.id),
      dryRun: opts.dryRun,
    });
    tally(summary, res.outcome);
  }
  return summary;
}

// ─── Rule 8: rental returns due / overdue — automate «PLS RETURN» ───────────
// The rent desk (Babek + Ali + Abdullah) chases returns by hand; clients even
// message us «PLS RETURN». A car not returned is one we can't re-rent and money
// left open. Once a day per active rental due today or overdue, ping the agent
// who rented it out (userId), falling back to the rent head when there is no
// agent on the row. dedupe: return_due:<rentalId>:<Dubai day> — one nudge/day,
// and because the key rolls with the day an overdue car keeps nagging daily.
const RENT_HEAD_OWNER_KEY = process.env.NOTIFY_RENT_HEAD_KEY?.trim() || "babek";

export async function notifyReturnsDue(
  tenantId: string,
  opts: { dryRun?: boolean } = {},
): Promise<RuleSummary> {
  const summary: RuleSummary = { rule: "return_due", scanned: 0, outcomes: {} };
  const now = new Date();
  // End of the current Dubai day = start of today + 24h. Anything active with a
  // returnDate at/before that is due-today or overdue.
  const endOfToday = new Date(dubaiDayStartUtc(now).getTime() + 24 * 3600 * 1000);

  const rows = await withDrizzleTenant(tenantId, (tx) =>
    tx
      .select({
        id: rental.id,
        agent: rental.salesAgentId,
        returnDate: rental.returnDate,
        customerName: customer.name,
        plate: vehicle.plate,
        make: vehicle.make,
        model: vehicle.model,
      })
      .from(rental)
      .innerJoin(customer, eq(rental.customerId, customer.id))
      .innerJoin(vehicle, eq(rental.vehicleId, vehicle.id))
      .where(and(eq(rental.status, "active"), lt(rental.returnDate, endOfToday)))
      .orderBy(rental.returnDate),
  );

  for (const r of rows) {
    summary.scanned++;
    const ret = r.returnDate ? new Date(r.returnDate) : null;
    const overdueMs = ret ? now.getTime() - ret.getTime() : 0;
    const overdueDays = Math.floor(overdueMs / (24 * 3600 * 1000));
    const car = [r.make, r.model].filter(Boolean).join(" ") || "car";
    const who = r.customerName || "client";
    const head =
      overdueDays >= 1
        ? `⏰ Return OVERDUE by ${overdueDays} day(s)`
        : `📅 Return due today`;
    const text =
      `${head}\n` +
      `${car} (${r.plate}) — ${who}\n` +
      (ret ? `Due back: ${ret.toISOString().slice(0, 10)}\n` : "") +
      `The car is still marked on-rent — contact the client and close the return to free it up.`;

    const target = r.agent
      ? { userId: r.agent, ownerKey: ownerKeyForUser(r.agent) }
      : { ownerKey: RENT_HEAD_OWNER_KEY };

    const res = await sendNotification(tenantId, {
      kind: "return_due",
      target,
      text,
      dedupeKey: `return_due:${r.id}:${dubaiDateKey(now)}`,
      entityType: "rental",
      entityId: String(r.id),
      dryRun: opts.dryRun,
    });
    tally(summary, res.outcome);
  }
  return summary;
}
