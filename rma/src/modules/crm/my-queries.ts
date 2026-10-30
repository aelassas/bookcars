"use server";
// «Мой день» reads — the phone-first salesperson's one screen. Every block is
// Kvadrat-shaped: owner + status-in-lifecycle + freshness. Observer-captured
// WhatsApp keeps a CONSISTENT conversation key on both directions — `to` = the
// LINE slug (waobs session, e.g. "babek-rent"), `coalesce(from_pn, "from")` =
// the CONTACT (customer) — so "my lines" is just `m."to" = ANY(<my slugs>)`.
// `lines = null` means the admin/CEO view: no line filter, the whole tenant
// (RLS still scopes it). Everything read-only; per-tenant (call with the
// CURRENT tenant id, same guard as watchers/page.tsx).
import { sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { requireAuth, getTenantRoles } from "@/platform/auth/authorization";
import { workMinutesBetween } from "@/modules/messaging/heat";
import { isBroadcast } from "@/modules/messaging/competitor";
import { dubaiDayStartUtc } from "@/modules/notify/policy";
import { resolveOwnerForLine } from "@/modules/board/owners";

// A group message counts as "seeking" (real demand) only when someone is
// actually asking for a car — mirrors notifyHotInbound so group chatter with
// stray car names doesn't flood the intel feed.
const SEEKING_RE =
  "(looking for|need |required|anyone (have|has)|urgent|available\\?|ищу|нужн|дайте|есть ли)";

// The CRM record this conversation is stitched to, if any — lets «Ответить»
// route into the full-width ChatThread on the lead/customer page (owner ask
// 2026-07-24: «not a cramped box»). Null when the contact was never stitched;
// the card then falls back to /pulse.
export type ConvoLink = {
  relatedEntityType: "lead" | "customer" | null;
  relatedEntityId: string | null;
  customerId: string | null;
};

export type WaitingRow = ConvoLink & {
  line: string;
  contact: string;
  /** Raw thread jid of the newest inbound — the key board_item is stored under. */
  threadRef: string | null;
  name: string;
  lastLine: string;
  car: string | null;
  priceAed: number | null;
  waitingMin: number;
  ownerKey: string | null;
  ownerName: string | null;
};

/**
 * "recent" — newest activity on top, what a rep wants when working a queue.
 * "worst" — longest wait on top, what a line head wants when looking for what
 * is being dropped. Same rows, opposite ends.
 */
export type WaitingSort = "recent" | "worst";

export type HotRow = ConvoLink & {
  id: string;
  line: string;
  contact: string;
  name: string;
  lastLine: string;
  car: string | null;
  priceAed: number | null;
  fromGroup: boolean;
  ownerName: string | null;
};

export type IntelRow = {
  id: string;
  line: string;
  body: string;
  car: string | null;
  priceAed: number | null;
  ownerName: string | null;
};

export type MyDay = {
  waiting: WaitingRow[];
  hot: HotRow[];
  answeredToday: number;
  intel: IntelRow[];
};

// A reusable "my lines" WHERE fragment. `null` → no filter (admin view).
// Build ANY(ARRAY[$1,$2,…]::text[]) from parameterised values — interpolating
// a JS array directly renders a record tuple and Postgres throws "cannot cast
// type record to text[]" (crashed floor reps' cockpit 2026-07-24). Slugs are
// trusted config, but sql.join keeps them parameterised regardless.
function lineFilter(lines: string[] | null) {
  if (!lines || lines.length === 0) return sql``;
  return sql`AND m."to" = ANY(ARRAY[${sql.join(
    lines.map((l) => sql`${l}`),
    sql`, `,
  )}]::text[])`;
}

function ownerNameForLine(line: string): string | null {
  return resolveOwnerForLine(line)?.name ?? null;
}

// The CRM record a conversation's latest inbound message is stitched to (see
// modules/messaging/stitch.ts): a lead sits in related_entity_type/id, a
// customer in customer_id. Lets «Ответить» land on the full ChatThread.
function convoLink(r: Record<string, unknown>): ConvoLink {
  const relType = r.related_entity_type === "lead" || r.related_entity_type === "customer"
    ? (r.related_entity_type as "lead" | "customer")
    : null;
  return {
    relatedEntityType: relType,
    relatedEntityId: relType ? ((r.related_entity_id as string) ?? null) : null,
    customerId: (r.customer_id as string) ?? null,
  };
}

/**
 * The «Ждут ответа» query, shared by «Мой день» and the line head's monitor.
 *
 * A local function rather than its own module on purpose: extracting it into a
 * separate file added an import edge that changed Turbopack's chunking and
 * broke the build on node-only imports reached from the edge bundle. Same
 * sharing, no new module boundary.
 */
async function queryWaiting(
  tx: Parameters<Parameters<typeof withDrizzleTenant>[1]>[0],
  tenantId: string,
  lines: string[] | null,
  now: Date,
  sort: WaitingSort,
): Promise<WaitingRow[]> {
  const myLines = lineFilter(lines);
  const res = (await tx.execute(sql`
      WITH conv AS (
        SELECT m."to" AS line,
               coalesce(m.from_pn, m."from") AS contact,
               max(m.created_at) FILTER (WHERE m.direction = 'inbound')  AS last_in,
               max(m.created_at) FILTER (WHERE m.direction = 'outbound') AS last_out,
               max(m.customer_name) AS name
        FROM message m
        WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp'
          AND m."to" IS NOT NULL
          AND m."from" NOT LIKE '%@g.us'
          AND coalesce(m.from_pn, m."from") IS NOT NULL
          AND m.created_at >= now() - interval '14 days'
          ${myLines}
        GROUP BY 1, 2
      )
      SELECT c.line, c.contact, c.name, c.last_in,
             li.body AS last_line, li.car, li.price, li.thread_ref,
             li.related_entity_type, li.related_entity_id, li.customer_id
      FROM conv c
      LEFT JOIN LATERAL (
        SELECT left(m2.body, 200) AS body,
               m2.extracted_car_text AS car, m2.extracted_price_aed AS price,
               -- board_item.customer_ref is keyed by the raw thread jid, NOT by
               -- the resolved from_pn contact, so reassignment needs it too.
               m2."from" AS thread_ref,
               m2.related_entity_type, m2.related_entity_id, m2.customer_id
        FROM message m2
        WHERE m2.tenant_id = ${tenantId} AND m2."to" = c.line
          AND coalesce(m2.from_pn, m2."from") = c.contact
          AND m2.direction = 'inbound'
        ORDER BY m2.created_at DESC LIMIT 1
      ) li ON true
      -- Hide conversations the team already closed (dismiss-to-learn, 0057):
      -- LEFT JOIN the last 14 days of dismissals for this (line, contact) and
      -- keep only rows with no match (d.id IS NULL).
      LEFT JOIN card_dismissal d
        ON d.tenant_id = ${tenantId}
       AND d.line = c.line AND d.contact = c.contact
       AND d.created_at > now() - interval '14 days'
      WHERE c.last_in IS NOT NULL AND (c.last_out IS NULL OR c.last_out < c.last_in)
        AND d.id IS NULL
      ORDER BY c.last_in DESC
      LIMIT 200
    `)) as unknown as { rows: Record<string, unknown>[] };

  const rows: WaitingRow[] = res.rows.map((r) => {
        const line = String(r.line);
        const contact = String(r.contact);
        return {
          line,
          contact,
          name: (r.name as string) || contact,
          lastLine: (r.last_line as string) ?? "",
          car: (r.car as string) ?? null,
          priceAed: (r.price as number) ?? null,
          threadRef: (r.thread_ref as string) ?? null,
          waitingMin: workMinutesBetween(new Date(r.last_in as string), now),
          ownerKey: resolveOwnerForLine(line)?.key ?? null,
          ownerName: ownerNameForLine(line),
          ...convoLink(r),
        };
  });

  // waitingMin ascending = most recent first.
  return sort === "worst"
    ? rows.sort((a, b) => b.waitingMin - a.waitingMin)
    : rows.sort((a, b) => a.waitingMin - b.waitingMin);
}

/**
 * The whole «Мой день» payload in one tenant-scoped round of reads.
 * @param lines owned line slugs, or null for the admin/all-lines view.
 */
export async function getMyDay(tenantId: string, lines: string[] | null): Promise<MyDay> {
  // AUTHZ: tenantId is caller-supplied ("use server" exports are directly
  // POSTable), so require a membership in THAT tenant before RLS scopes to it.
  // «Мой день» rides the always-on dashboard module (every role sees the nav
  // item), so membership — not a CRM role — is the right bar.
  const userId = await requireAuth();
  const memberRoles = await getTenantRoles(userId, tenantId);
  if (memberRoles.length === 0) throw new Error("Forbidden: not a member of this tenant");

  return withDrizzleTenant(tenantId, async (tx) => {
    const now = new Date();
    const dayStart = dubaiDayStartUtc(now);
    const myLines = lineFilter(lines);

    // ── 1. «Ждут ответа» — shared with the line head's monitor, which reads
    // the same rows worst-first. Here: most-recent activity on top (owner
    // 2026-07-24: latest first, not history).
    const waiting = await queryWaiting(tx, tenantId, lines, now, "recent");

    // ── 2. «Горячее за 24ч» — inbound that named a car/price (DMs + seeking
    // groups), the notifyHotInbound shape minus the "already answered" gate.
    const hotRes = (await tx.execute(sql`
      SELECT m.id, m."to" AS line, coalesce(m.from_pn, m."from") AS contact,
             m.customer_name AS name, m.extracted_car_text AS car,
             m.extracted_price_aed AS price, left(m.body, 200) AS body,
             m."from" LIKE '%@g.us' AS from_group,
             m.related_entity_type, m.related_entity_id, m.customer_id
      FROM message m
      -- Same dismiss-to-learn exclusion as «Ждут ответа» (0057): drop rows whose
      -- (line, contact) was closed in the last 14 days.
      LEFT JOIN card_dismissal d
        ON d.tenant_id = m.tenant_id
       AND d.line = m."to"
       AND d.contact = coalesce(m.from_pn, m."from")
       AND d.created_at > now() - interval '14 days'
      WHERE m.tenant_id = ${tenantId}
        AND m.channel = 'whatsapp' AND m.direction = 'inbound'
        AND m.created_at >= now() - interval '24 hours'
        AND (m.extracted_car_text IS NOT NULL OR m.extracted_price_aed IS NOT NULL)
        AND m."to" IS NOT NULL
        AND (
          m."from" NOT LIKE '%@g.us'
          OR m.body ~* ${SEEKING_RE}
        )
        AND d.id IS NULL
        ${myLines}
      ORDER BY m.created_at DESC
      LIMIT 60
    `)) as unknown as { rows: Record<string, unknown>[] };

    const hot: HotRow[] = hotRes.rows
      .filter((r) => !isBroadcast(String(r.body ?? ""))) // rival "available cars" blasts
      .slice(0, 40)
      .map((r) => {
        const line = String(r.line);
        const contact = String(r.contact);
        return {
          id: String(r.id),
          line,
          contact,
          name: (r.name as string) || contact,
          lastLine: (r.body as string) ?? "",
          car: (r.car as string) ?? null,
          priceAed: (r.price as number) ?? null,
          fromGroup: Boolean(r.from_group),
          ownerName: ownerNameForLine(line),
          ...convoLink(r),
        };
      });

    // ── 3. «Отвечено сегодня» — distinct conversations with an outbound today
    // (Dubai). The Kvadrat «done-sent» metric, visible thanks to fromMe capture.
    const answeredRes = (await tx.execute(sql`
      SELECT count(*)::int AS n FROM (
        SELECT DISTINCT m."to", coalesce(m.from_pn, m."from")
        FROM message m
        WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp'
          AND m.direction = 'outbound'
          AND m."to" IS NOT NULL
          AND m.created_at >= ${dayStart.toISOString()}
          ${myLines}
      ) t
    `)) as unknown as { rows: Record<string, unknown>[] };
    const answeredToday = Number(answeredRes.rows[0]?.n ?? 0);

    // ── 4. «Интел из групп» — last 24h group messages that match the seeking
    // pattern (the market-demand feed).
    const intelRes = (await tx.execute(sql`
      SELECT m.id, m."to" AS line, left(m.body, 240) AS body,
             m.extracted_car_text AS car, m.extracted_price_aed AS price
      FROM message m
      WHERE m.tenant_id = ${tenantId}
        AND m.channel = 'whatsapp' AND m.direction = 'inbound'
        AND m."from" LIKE '%@g.us'
        AND m.created_at >= now() - interval '24 hours'
        AND m.body ~* ${SEEKING_RE}
        AND m."to" IS NOT NULL
        ${myLines}
      ORDER BY m.created_at DESC
      LIMIT 60
    `)) as unknown as { rows: Record<string, unknown>[] };

    const intel: IntelRow[] = intelRes.rows
      .filter((r) => !isBroadcast(String(r.body ?? "")))
      .slice(0, 40)
      .map((r) => {
        const line = String(r.line);
        return {
          id: String(r.id),
          line,
          body: (r.body as string) ?? "",
          car: (r.car as string) ?? null,
          priceAed: (r.price as number) ?? null,
          ownerName: ownerNameForLine(line),
        };
      });

    return { waiting, hot, answeredToday, intel };
  });
}

/**
 * «Ждут ответа» on its own, for the line head's monitor — the same rows
 * «Мой день» shows a rep, ordered worst-first so the longest-ignored customer
 * is at the top instead of the most recent one.
 *
 * @param lines line slugs belonging to this business line, or null for all.
 */
export async function getWaitingConversations(
  tenantId: string,
  lines: string[] | null,
  sort: WaitingSort = "worst",
): Promise<WaitingRow[]> {
  // AUTHZ: same bar as getMyDay — tenantId is caller-supplied, so require a
  // membership in THAT tenant before RLS scopes to it.
  const userId = await requireAuth();
  const memberRoles = await getTenantRoles(userId, tenantId);
  if (memberRoles.length === 0) throw new Error("Forbidden: not a member of this tenant");

  return withDrizzleTenant(tenantId, (tx) => queryWaiting(tx, tenantId, lines, new Date(), sort));
}
