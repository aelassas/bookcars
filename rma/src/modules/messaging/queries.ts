import { message } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { eq, desc, or, asc, sql } from "drizzle-orm";
import { canManageMessagingForTenant } from "./policies";

export async function getMessages(tenantId: string) {
  await canManageMessagingForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    return tx.select().from(message).orderBy(desc(message.createdAt));
  });
}

export async function getMessageById(tenantId: string, id: string) {
  await canManageMessagingForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx.select().from(message).where(eq(message.id, id));
    return rows[0] ?? null;
  });
}

export async function getMessageCountsByStatus(tenantId: string) {
  await canManageMessagingForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({ status: message.status, count: sql<number>`count(*)` })
      .from(message)
      .groupBy(message.status);
    return rows;
  });
}

/** One conversation (thread) per sender JID, most-recently-active first. */
export type MessageThread = {
  fromJid: string;
  customerName: string | null;
  customerId: string | null;
  channel: string;
  latestBody: string;
  latestAt: string;
  messageCount: number;
  unreadCount: number;
  /** The car this person last asked about (most recent non-null extraction on
   *  the thread) — so the inbox shows WHICH car each conversation is about. */
  car: string | null;
};

/**
 * Threaded inbox: groups the ~7.7k messages into one row per sender
 * (from-JID), latest activity first, paginated. Replaces the unbounded
 * getMessages() flat dump for the inbox page.
 *
 * Uses DISTINCT ON to grab each sender's latest message, joined to a
 * per-sender aggregate for counts. RLS scopes tenant_id automatically via
 * the app.tenant_id setting, so no explicit tenant filter is needed here.
 * (No double-dollar tokens are used — plain single-quoted literals only.)
 */
export async function getMessageThreads(
  tenantId: string,
  opts: { page: number; pageSize: number }
): Promise<{ threads: MessageThread[]; total: number }> {
  await canManageMessagingForTenant(tenantId);
  const { page, pageSize } = opts;
  const offset = (page - 1) * pageSize;

  return withDrizzleTenant(tenantId, async (tx) => {
    const totalRes = await tx.execute(sql`
      SELECT COUNT(DISTINCT "from")::int AS total
      FROM message
      WHERE "from" IS NOT NULL
    `);
    const totalRows = (totalRes.rows ?? totalRes) as unknown as Array<{ total: number }>;
    const total = Number(totalRows[0]?.total ?? 0);

    const res = await tx.execute(sql`
      SELECT
        latest.from_jid,
        latest.customer_name,
        latest.customer_id,
        latest.channel,
        latest.latest_body,
        latest.latest_at,
        agg.message_count,
        agg.unread_count,
        car.car_text
      FROM (
        SELECT DISTINCT ON (m."from")
          m."from" AS from_jid,
          m.customer_name,
          m.customer_id::text AS customer_id,
          m.channel,
          m.body AS latest_body,
          m.created_at AS latest_at
        FROM message m
        WHERE m."from" IS NOT NULL
        ORDER BY m."from", m.created_at DESC
      ) latest
      JOIN (
        SELECT m."from" AS from_jid,
          COUNT(*)::int AS message_count,
          COUNT(*) FILTER (WHERE m.status = 'new')::int AS unread_count
        FROM message m
        WHERE m."from" IS NOT NULL
        GROUP BY m."from"
      ) agg ON agg.from_jid = latest.from_jid
      LEFT JOIN LATERAL (
        SELECT m2.extracted_car_text AS car_text
        FROM message m2
        WHERE m2."from" = latest.from_jid AND m2.extracted_car_text IS NOT NULL
        ORDER BY m2.created_at DESC
        LIMIT 1
      ) car ON true
      ORDER BY latest.latest_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const rows = (res.rows ?? res) as unknown as Array<{
      from_jid: string;
      customer_name: string | null;
      customer_id: string | null;
      channel: string;
      latest_body: string;
      latest_at: string | Date;
      message_count: number;
      unread_count: number;
      car_text: string | null;
    }>;

    const threads: MessageThread[] = rows.map((r) => ({
      fromJid: r.from_jid,
      customerName: r.customer_name ?? null,
      customerId: r.customer_id ?? null,
      channel: r.channel ?? "whatsapp",
      latestBody: r.latest_body ?? "",
      latestAt:
        r.latest_at instanceof Date ? r.latest_at.toISOString() : String(r.latest_at),
      messageCount: Number(r.message_count),
      unreadCount: Number(r.unread_count),
      car: r.car_text ?? null,
    }));

    return { threads, total };
  });
}

/** One message in a JID conversation thread (oldest → newest). */
export type ThreadMessage = {
  id: string;
  direction: string;
  body: string;
  status: string;
  channel: string;
  createdAt: string;
};

/** A full conversation with a single sender JID, for the thread detail page. */
export type ConversationThread = {
  jid: string;
  customerId: string | null;
  customerName: string | null;
  channel: string;
  messages: ThreadMessage[];
};

/**
 * Load the full conversation for one sender JID (all inbound + outbound
 * messages where from = jid OR to = jid), oldest first. RLS scopes tenant_id
 * automatically. Returns null when the JID has no messages in this tenant.
 */
export async function getThreadByJid(
  tenantId: string,
  jid: string
): Promise<ConversationThread | null> {
  await canManageMessagingForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: message.id,
        direction: message.direction,
        body: message.body,
        status: message.status,
        channel: message.channel,
        createdAt: message.createdAt,
        customerId: message.customerId,
        customerName: message.customerName,
      })
      .from(message)
      .where(or(eq(message.from, jid), eq(message.to, jid)))
      .orderBy(asc(message.createdAt));

    if (rows.length === 0) return null;

    // Header identity: prefer the most recent row that carries a customer link.
    const linked = [...rows].reverse().find((r) => r.customerId || r.customerName);
    const last = rows[rows.length - 1];

    return {
      jid,
      customerId: linked?.customerId ?? null,
      customerName: linked?.customerName ?? null,
      channel: last.channel ?? "whatsapp",
      messages: rows.map((r) => ({
        id: r.id,
        direction: r.direction,
        body: r.body,
        status: r.status,
        channel: r.channel ?? "whatsapp",
        createdAt:
          r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      })),
    };
  });
}
