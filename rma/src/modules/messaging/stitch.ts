// Chat<->CRM stitching: attach an inbound WhatsApp message to the customer
// and lead that own its phone number. The spec's iron rule: NEVER guess —
// an ambiguous phone (two customers / two competing leads) links to nothing
// and is left for a human. Linking writes the message columns the existing
// chat feature already consumes (relatedEntityType='lead' → ChatThread,
// resolveReplyContext, reply composer all light up for free).
import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/platform/db/client";
import { message } from "@/platform/db/schema";
import { phoneKey } from "./phone";

export type StitchCandidates = {
  customers: { id: string }[];
  leads: { id: string; hasOpenDeal: boolean }[];
};

export type StitchDecision = {
  customerId: string | null;
  relatedEntityType: "lead" | null;
  relatedEntityId: string | null;
  ambiguous: boolean;
};

const NONE: StitchDecision = {
  customerId: null,
  relatedEntityType: null,
  relatedEntityId: null,
  ambiguous: false,
};

/** Pure decision core. Exactly-one wins; open-deal lead outranks cold leads. */
export function resolveStitch(c: StitchCandidates): StitchDecision {
  let ambiguous = false;

  let customerId: string | null = null;
  if (c.customers.length === 1) customerId = c.customers[0].id;
  else if (c.customers.length > 1) ambiguous = true;

  let leadId: string | null = null;
  if (c.leads.length === 1) {
    leadId = c.leads[0].id;
  } else if (c.leads.length > 1) {
    const open = c.leads.filter((l) => l.hasOpenDeal);
    if (open.length === 1) leadId = open[0].id;
    else ambiguous = true;
  }

  if (customerId === null && leadId === null) return { ...NONE, ambiguous };
  return {
    customerId,
    relatedEntityType: leadId ? "lead" : null,
    relatedEntityId: leadId,
    ambiguous,
  };
}

/**
 * Resolve candidates by phone key (SQL twin of phone.ts — last 9 digits) and
 * write the decision onto the message row. Caller supplies a tx already
 * inside withDrizzleTenant OR an admin-pool drizzle handle with explicit
 * tenant filtering (both patterns exist in this repo; tenantId is always
 * filtered explicitly here, so either works).
 */
export async function linkInboundMessage(
  tx: typeof db,
  tenantId: string,
  args: { messageId: string; from: string | null }
): Promise<StitchDecision> {
  const key = phoneKey(args.from);
  if (!key) return NONE;

  const keyExpr = (col: string) =>
    sql.raw(`right(regexp_replace(coalesce(${col}, ''), '\\D', '', 'g'), 9)`);

  const customers = (await tx.execute(
    sql`select id from customer
        where tenant_id = ${tenantId} and phone is not null
          and ${keyExpr("phone")} = ${key}
        limit 3`
  )) as unknown as { rows: { id: string }[] };

  const leads = (await tx.execute(
    sql`select l.id,
               exists(select 1 from deal d
                      where d.tenant_id = ${tenantId} and d.lead_id = l.id
                        and d.status = 'open') as has_open_deal
        from lead l
        where l.tenant_id = ${tenantId} and l.phone is not null
          and ${keyExpr("l.phone")} = ${key}
        limit 5`
  )) as unknown as { rows: { id: string; has_open_deal: boolean }[] };

  const decision = resolveStitch({
    customers: customers.rows.map((r) => ({ id: r.id })),
    leads: leads.rows.map((r) => ({ id: r.id, hasOpenDeal: r.has_open_deal })),
  });

  if (decision.customerId || decision.relatedEntityId) {
    await tx
      .update(message)
      .set({
        customerId: decision.customerId ?? undefined,
        relatedEntityType: decision.relatedEntityType ?? undefined,
        relatedEntityId: decision.relatedEntityId ?? undefined,
      })
      .where(and(eq(message.tenantId, tenantId), eq(message.id, args.messageId)));
  }
  return decision;
}
