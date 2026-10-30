"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lead, customer, message } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { requireTenantAdmin } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { normalizePhone, MIN_PHONE_MATCH_DIGITS, PG_NON_DIGIT_RE } from "@/platform/messaging/phone";
import { canManageCRMForTenant } from "./policies";

/**
 * Link ONE lead's WhatsApp thread by phone (the "Найти по номеру" button on
 * the empty-thread state). Finds still-unlinked inbound `whatsapp` message
 * rows whose `from` normalizes (right-anchored, last MIN_PHONE_MATCH_DIGITS
 * digits — see platform/messaging/phone.ts) to the same value as
 * `lead.phone`, and stamps them relatedEntityType='lead' /
 * relatedEntityId=lead.id.
 *
 * Deliberately no ambiguity guard here: the human is explicitly choosing
 * THIS lead for THIS phone number by clicking the button on THIS lead's
 * page. `backfillLeadLinks` below (the unattended bulk pass) is the one that
 * must stay conservative about phones shared by multiple leads.
 */
export async function linkLeadByPhone(slug: string, leadId: string): Promise<{ linked: number }> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageCRMForTenant(t.id);

  const linked = await withDrizzleTenant(t.id, async (tx) => {
    const [leadRow] = await tx.select({ phone: lead.phone }).from(lead).where(eq(lead.id, leadId)).limit(1);
    if (!leadRow) throw new Error("Lead not found");

    const norm = normalizePhone(leadRow.phone);
    if (norm.length < MIN_PHONE_MATCH_DIGITS) return 0;
    const suffix = norm.slice(-MIN_PHONE_MATCH_DIGITS);

    const rows = await tx
      .update(message)
      .set({ relatedEntityType: "lead", relatedEntityId: leadId, updatedAt: new Date() })
      .where(
        and(
          eq(message.tenantId, t.id),
          eq(message.channel, "whatsapp"),
          isNull(message.relatedEntityId),
          // Resolve @lid senders to their real phone via wa_identity (WhatsApp
          // hides the number behind "<n>@lid"); fall back to the JID digits for
          // classic @s.whatsapp.net senders.
          sql`RIGHT(regexp_replace(COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = ${message.from}), ${message.from}, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${suffix}`
        )
      )
      .returning({ id: message.id });
    return rows.length;
  });

  revalidatePath(`/${slug}/crm/leads/${leadId}`);
  return { linked };
}

/**
 * Link ONE customer's WhatsApp thread by phone (the "Найти по номеру"
 * button on the empty-thread state, customer page). Exact mirror of
 * linkLeadByPhone above — same still-unlinked-only scope, same @lid ->
 * wa_identity resolution, same right-anchored last-MIN_PHONE_MATCH_DIGITS
 * match against `customer.phone` instead of `lead.phone`, same "no
 * ambiguity guard needed" rationale (the human explicitly chose THIS
 * customer for THIS phone by clicking the button on THIS customer's page).
 */
export async function linkCustomerByPhone(slug: string, customerId: string): Promise<{ linked: number }> {
  const t = await getTenantBySlug(slug);
  if (!t) throw new Error("Forbidden: not a member of this tenant");
  await assertNotPreviewMode(t.id);
  await canManageCRMForTenant(t.id);

  const linked = await withDrizzleTenant(t.id, async (tx) => {
    const [customerRow] = await tx
      .select({ phone: customer.phone })
      .from(customer)
      .where(eq(customer.id, customerId))
      .limit(1);
    if (!customerRow) throw new Error("Customer not found");

    const norm = normalizePhone(customerRow.phone);
    if (norm.length < MIN_PHONE_MATCH_DIGITS) return 0;
    const suffix = norm.slice(-MIN_PHONE_MATCH_DIGITS);

    const rows = await tx
      .update(message)
      .set({ relatedEntityType: "customer", relatedEntityId: customerId, updatedAt: new Date() })
      .where(
        and(
          eq(message.tenantId, t.id),
          eq(message.channel, "whatsapp"),
          isNull(message.relatedEntityId),
          // Same @lid -> wa_identity resolution as linkLeadByPhone.
          sql`RIGHT(regexp_replace(COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = ${message.from}), ${message.from}, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${suffix}`
        )
      )
      .returning({ id: message.id });
    return rows.length;
  });

  revalidatePath(`/${slug}/customers/${customerId}`);
  return { linked };
}

/**
 * Admin-gated bulk backfill across ALL leads in the tenant. A message is
 * only auto-linked when its normalized phone maps to EXACTLY ONE lead — a
 * phone shared by multiple leads is logged (console.warn) and skipped,
 * never guessed. This is the "never auto-link ambiguous phones" guard the
 * task brief asked for; linkLeadByPhone (above) intentionally does not need
 * it because that path is a deliberate, per-lead human action.
 *
 * Raw SQL (CTE + UPDATE ... FROM) rather than the query builder: expressing
 * "group leads by normalized phone, keep only groups of size 1, join that
 * back to message" needs a join-in-UPDATE the drizzle builder doesn't offer
 * a portable way to express here. `PG_NON_DIGIT_RE` and every other dynamic
 * value is passed as a bound `${...}` parameter, never spliced into the
 * template's literal SQL text (see platform/messaging/phone.ts for why that
 * matters for `\D` specifically).
 */
export async function backfillLeadLinks(
  slug: string
): Promise<{ linked: number; ambiguousPhones: number }> {
  const t = await requireTenantAdmin(slug);
  await assertNotPreviewMode(t.id);

  const result = await withDrizzleTenant(t.id, async (tx) => {
    const ambigRes = await tx.execute(sql`
      SELECT norm_phone, COUNT(*)::int AS n
      FROM (
        SELECT RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM lead
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ) x
      GROUP BY norm_phone
      HAVING COUNT(*) > 1
    `);
    const ambiguousRows = ((ambigRes as unknown as { rows?: unknown[] }).rows ?? ambigRes) as Array<{
      norm_phone: string;
      n: number;
    }>;
    if (ambiguousRows.length > 0) {
      console.warn(
        `[backfillLeadLinks] tenant=${t.id}: ${ambiguousRows.length} phone(s) shared by multiple leads — skipped, no auto-link:`,
        ambiguousRows.map((r) => `${r.norm_phone}(x${r.n})`).join(", ")
      );
    }

    const updateRes = await tx.execute(sql`
      WITH lead_norm AS (
        SELECT id, RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM lead
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ),
      unambiguous AS (
        SELECT norm_phone, MIN(id) AS lead_id
        FROM lead_norm
        GROUP BY norm_phone
        HAVING COUNT(*) = 1
      )
      UPDATE message m
      SET related_entity_type = 'lead', related_entity_id = u.lead_id, updated_at = now()
      FROM unambiguous u
      WHERE m.tenant_id = ${t.id}
        AND m.channel = 'whatsapp'
        AND m.related_entity_id IS NULL
        AND RIGHT(regexp_replace(COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"), m."from", ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = u.norm_phone
      RETURNING m.id
    `);
    const linkedRows = ((updateRes as unknown as { rows?: unknown[] }).rows ?? updateRes) as unknown[];

    return { linked: linkedRows.length, ambiguousPhones: ambiguousRows.length };
  });

  revalidatePath(`/${slug}/crm/leads`);
  return result;
}

/**
 * Admin-gated bulk backfill across BOTH customers and leads, with
 * CUSTOMER PRECEDENCE: a WhatsApp message whose resolved phone maps to
 * exactly ONE customer links to that customer; only messages still
 * unlinked after the customer pass are considered for the lead pass (same
 * unique-match-only, log-and-skip-ambiguous guarantee as backfillLeadLinks,
 * applied independently to each entity kind).
 *
 * Implemented as two sequential raw-SQL UPDATE passes inside one
 * transaction rather than a single query: the customer pass runs first and
 * only touches related_entity_id IS NULL rows; because it sets
 * related_entity_id on the rows it links, the lead pass's own
 * related_entity_id IS NULL filter automatically excludes anything the
 * customer pass just claimed — the precedence and the "never double-link a
 * message" guarantee both fall out of that ordering + shared filter,
 * without a manual EXCEPT/anti-join. Same bound-parameter discipline as
 * backfillLeadLinks (see its docstring re: PG_NON_DIGIT_RE).
 *
 * Superset of backfillLeadLinks — that function is left in place unchanged
 * (lead-only backfill, e.g. for callers that only ever want lead linking),
 * this one is the "link everything, customers first" entry point the
 * customer-chat feature needs.
 */
export async function backfillChatLinks(
  slug: string
): Promise<{ linkedCustomers: number; linkedLeads: number; ambiguousCustomerPhones: number; ambiguousLeadPhones: number }> {
  const t = await requireTenantAdmin(slug);
  await assertNotPreviewMode(t.id);

  const result = await withDrizzleTenant(t.id, async (tx) => {
    // ─── Ambiguity report: customers ─────────────────────────────────────
    const ambigCustomerRes = await tx.execute(sql`
      SELECT norm_phone, COUNT(*)::int AS n
      FROM (
        SELECT RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM customer
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ) x
      GROUP BY norm_phone
      HAVING COUNT(*) > 1
    `);
    const ambiguousCustomerRows = ((ambigCustomerRes as unknown as { rows?: unknown[] }).rows ?? ambigCustomerRes) as Array<{
      norm_phone: string;
      n: number;
    }>;
    if (ambiguousCustomerRows.length > 0) {
      console.warn(
        `[backfillChatLinks] tenant=${t.id}: ${ambiguousCustomerRows.length} phone(s) shared by multiple customers — skipped, no auto-link:`,
        ambiguousCustomerRows.map((r) => `${r.norm_phone}(x${r.n})`).join(", ")
      );
    }

    // ─── Pass 1: customers (precedence) ──────────────────────────────────
    const updateCustomerRes = await tx.execute(sql`
      WITH customer_norm AS (
        SELECT id, RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM customer
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ),
      unambiguous AS (
        SELECT norm_phone, MIN(id) AS customer_id
        FROM customer_norm
        GROUP BY norm_phone
        HAVING COUNT(*) = 1
      )
      UPDATE message m
      SET related_entity_type = 'customer', related_entity_id = u.customer_id, updated_at = now()
      FROM unambiguous u
      WHERE m.tenant_id = ${t.id}
        AND m.channel = 'whatsapp'
        AND m.related_entity_id IS NULL
        AND RIGHT(regexp_replace(COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"), m."from", ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = u.norm_phone
      RETURNING m.id
    `);
    const linkedCustomerRows = ((updateCustomerRes as unknown as { rows?: unknown[] }).rows ?? updateCustomerRes) as unknown[];

    // ─── Ambiguity report: leads ──────────────────────────────────────────
    const ambigLeadRes = await tx.execute(sql`
      SELECT norm_phone, COUNT(*)::int AS n
      FROM (
        SELECT RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM lead
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ) x
      GROUP BY norm_phone
      HAVING COUNT(*) > 1
    `);
    const ambiguousLeadRows = ((ambigLeadRes as unknown as { rows?: unknown[] }).rows ?? ambigLeadRes) as Array<{
      norm_phone: string;
      n: number;
    }>;
    if (ambiguousLeadRows.length > 0) {
      console.warn(
        `[backfillChatLinks] tenant=${t.id}: ${ambiguousLeadRows.length} phone(s) shared by multiple leads — skipped, no auto-link:`,
        ambiguousLeadRows.map((r) => `${r.norm_phone}(x${r.n})`).join(", ")
      );
    }

    // ─── Pass 2: leads, only messages the customer pass left unlinked ────
    const updateLeadRes = await tx.execute(sql`
      WITH lead_norm AS (
        SELECT id, RIGHT(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) AS norm_phone
        FROM lead
        WHERE tenant_id = ${t.id}
          AND LENGTH(regexp_replace(COALESCE(phone, ''), ${PG_NON_DIGIT_RE}, '', 'g')) >= ${MIN_PHONE_MATCH_DIGITS}
      ),
      unambiguous AS (
        SELECT norm_phone, MIN(id) AS lead_id
        FROM lead_norm
        GROUP BY norm_phone
        HAVING COUNT(*) = 1
      )
      UPDATE message m
      SET related_entity_type = 'lead', related_entity_id = u.lead_id, updated_at = now()
      FROM unambiguous u
      WHERE m.tenant_id = ${t.id}
        AND m.channel = 'whatsapp'
        AND m.related_entity_id IS NULL
        AND RIGHT(regexp_replace(COALESCE((SELECT wi.phone FROM wa_identity wi WHERE wi.lid = m."from"), m."from", ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = u.norm_phone
      RETURNING m.id
    `);
    const linkedLeadRows = ((updateLeadRes as unknown as { rows?: unknown[] }).rows ?? updateLeadRes) as unknown[];

    return {
      linkedCustomers: linkedCustomerRows.length,
      linkedLeads: linkedLeadRows.length,
      ambiguousCustomerPhones: ambiguousCustomerRows.length,
      ambiguousLeadPhones: ambiguousLeadRows.length,
    };
  });

  revalidatePath(`/${slug}/crm/leads`);
  revalidatePath(`/${slug}/customers`);
  return result;
}
