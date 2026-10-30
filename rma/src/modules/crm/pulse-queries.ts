"use server";
// Pulse board reads (spec §U1): conversations = linked WhatsApp threads,
// joined to the lead's open deal and owner. Only linked threads appear on
// the main board (the girls' Bitrix filter is the noise gate); the raw
// unlinked stream is a separate secondary tab. Everything read-only.
import { sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { canManageCRMForTenant } from "./policies";
import { computeHeat, workMinutesBetween } from "@/modules/messaging/heat";
import { isBroadcast } from "@/modules/messaging/competitor";

export type PulseConvo = {
  leadId: string | null;
  customerId: string | null;
  dealId: string | null;
  title: string;
  ownerName: string | null;
  lastAt: Date;
  lastLines: { body: string; direction: string; at: Date }[];
  carText: string | null;
  priceAed: number | null;
  intent: string | null;
  heat: "hot" | "warm" | "normal";
  waitingMin: number | null;
  section: "today" | "yesterday" | "week" | "cold";
};

export type UnassignedConvo = {
  from: string;
  pushName: string | null;
  lastAt: Date;
  lastBody: string;
  msgs7d: number;
};

function sectionFor(lastAt: Date, now: Date): PulseConvo["section"] {
  const dayMs = 86400000;
  const dubaiDay = (d: Date) => Math.floor((d.getTime() + 4 * 3600000) / dayMs);
  const diff = dubaiDay(now) - dubaiDay(lastAt);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff <= 7) return "week";
  return "cold";
}

export async function getPulseBoard(tenantId: string): Promise<PulseConvo[]> {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    // NOTE: the lead's display name lives in lead.customer_name (there is no
    // lead.name column in this schema) — see db/schema.ts `lead`.
    const res = (await tx.execute(sql`
      WITH convo AS (
        SELECT m.related_entity_id AS lead_id,
               max(m.created_at) AS last_at,
               max(m.created_at) FILTER (WHERE m.direction = 'inbound')  AS last_in_at,
               max(m.created_at) FILTER (WHERE m.direction = 'outbound') AS last_out_at,
               count(*) FILTER (WHERE m.direction = 'inbound'
                                AND m.created_at >= now() - interval '2 hours') AS inbound_2h,
               max(m.customer_id::text) AS customer_id
        FROM message m
        WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp'
          AND m.related_entity_type = 'lead' AND m.related_entity_id IS NOT NULL
        GROUP BY 1
      )
      SELECT c.lead_id, c.customer_id, c.last_at, c.last_in_at, c.last_out_at, c.inbound_2h,
             l.customer_name AS lead_name,
             d.id AS deal_id, d.ref AS deal_ref,
             u.name AS owner_name,
             last3.lines,
             facts.car_text, facts.price_aed, facts.intent
      FROM convo c
      JOIN lead l ON l.id = c.lead_id AND l.tenant_id = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT d.id, d.ref, d.owner_id FROM deal d
        WHERE d.tenant_id = ${tenantId} AND d.lead_id = c.lead_id AND d.status = 'open'
        ORDER BY d.updated_at DESC LIMIT 1
      ) d ON true
      LEFT JOIN "user" u ON u.id = COALESCE(d.owner_id, l.assigned_to)
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('body', left(m2.body, 160),
                        'direction', m2.direction, 'at', m2.created_at)
               ORDER BY m2.created_at DESC) AS lines
        FROM (SELECT * FROM message m2
              WHERE m2.tenant_id = ${tenantId} AND m2.related_entity_type = 'lead'
                AND m2.related_entity_id = c.lead_id
              ORDER BY m2.created_at DESC LIMIT 3) m2
      ) last3 ON true
      LEFT JOIN LATERAL (
        SELECT m3.extracted_car_text AS car_text, m3.extracted_price_aed AS price_aed,
               m3.extracted_intent AS intent
        FROM message m3
        WHERE m3.tenant_id = ${tenantId} AND m3.related_entity_type = 'lead'
          AND m3.related_entity_id = c.lead_id AND m3.extracted_car_text IS NOT NULL
        ORDER BY m3.created_at DESC LIMIT 1
      ) facts ON true
      ORDER BY c.last_at DESC
      LIMIT 300
    `)) as unknown as { rows: Record<string, unknown>[] };

    const now = new Date();
    return res.rows.map((r) => {
      const lastAt = new Date(r.last_at as string);
      const lastIn = r.last_in_at ? new Date(r.last_in_at as string) : null;
      const lastOut = r.last_out_at ? new Date(r.last_out_at as string) : null;
      // Waiting = customer spoke last and nobody answered since (work-hours clock).
      const waitingMin =
        lastIn && (!lastOut || lastOut < lastIn) ? workMinutesBetween(lastIn, now) : null;
      const carText = (r.car_text as string) ?? null;
      const priceAed = (r.price_aed as number) ?? null;
      return {
        leadId: (r.lead_id as string) ?? null,
        customerId: (r.customer_id as string) ?? null,
        dealId: (r.deal_id as string) ?? null,
        title: (r.lead_name as string) || (r.deal_ref as string) || "No name",
        ownerName: (r.owner_name as string) ?? null,
        lastAt,
        lastLines: ((r.lines as { body: string; direction: string; at: string }[]) ?? []).map(
          (x) => ({ body: x.body, direction: x.direction, at: new Date(x.at) })
        ),
        carText,
        priceAed,
        intent: (r.intent as string) ?? null,
        heat: computeHeat({
          inbound2h: Number(r.inbound_2h ?? 0),
          carNamed: !!carText,
          priceNamed: priceAed != null,
          waitingMin,
        }),
        waitingMin,
        section: sectionFor(lastAt, now),
      };
    });
  });
}

export async function getUnassignedStream(tenantId: string): Promise<UnassignedConvo[]> {
  await canManageCRMForTenant(tenantId);
  return withDrizzleTenant(tenantId, async (tx) => {
    const res = (await tx.execute(sql`
      SELECT m."from" AS from_jid,
             max(m.customer_name) AS push_name,
             max(m.created_at) AS last_at,
             (array_agg(m.body ORDER BY m.created_at DESC))[1] AS last_body,
             count(*) AS msgs_7d
      FROM message m
      WHERE m.tenant_id = ${tenantId} AND m.channel = 'whatsapp'
        AND m.direction = 'inbound'
        AND m.related_entity_id IS NULL AND m.customer_id IS NULL
        AND m."from" IS NOT NULL AND m."from" NOT LIKE '%@g.us'
        AND m.created_at >= now() - interval '7 days'
      GROUP BY 1
      ORDER BY max(m.created_at) DESC
      LIMIT 100
    `)) as unknown as { rows: Record<string, unknown>[] };

    return res.rows
      .map((r) => ({
        from: r.from_jid as string,
        pushName: (r.push_name as string) ?? null,
        lastAt: new Date(r.last_at as string),
        lastBody: (r.last_body as string) ?? "",
        msgs7d: Number(r.msgs_7d ?? 0),
      }))
      .filter((c) => !isBroadcast(c.lastBody)); // competitor blasts never surface
  });
}
