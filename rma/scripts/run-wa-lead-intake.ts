/**
 * run-wa-lead-intake.ts — create leads and native CRM cards from inbound WhatsApp.
 *
 *   npx tsx scripts/run-wa-lead-intake.ts                 # dry run
 *   npx tsx scripts/run-wa-lead-intake.ts --commit
 *   npx tsx scripts/run-wa-lead-intake.ts --since 7d --commit
 *
 * One person = one lead (wa:<last 9 digits>) = one open native deal. The first
 * qualifying message supplies the original note; later messages enrich the same
 * card with the car, budget, term and rental dates they actually named.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { pool } from "@/platform/db/client";
import { deal, lead, message } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { leadFromMessage, WA_LEAD_SOURCE, type NewLead } from "@/modules/crm/lead-from-whatsapp";
import { fromExtractIntent } from "@/modules/crm/intent";
import { mergeVouched, type VouchedFacts } from "@/modules/messaging/vouch";
import { markWhatsappContacted } from "@/modules/crm/whatsapp-contacted";
import { normalizePhone, MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";

const COMMIT = process.argv.includes("--commit");
const sinceArg = (() => {
  const i = process.argv.indexOf("--since");
  return i >= 0 ? process.argv[i + 1] : "3d";
})();
const SINCE_SQL = /^\d+[dh]$/.test(sinceArg)
  ? `${parseInt(sinceArg, 10)} ${sinceArg.endsWith("h") ? "hours" : "days"}`
  : "3 days";

async function main() {
  const ownNumbers = new Set(
    Object.entries(process.env)
      .filter(([k]) => k.startsWith("NOTIFY_WA_PHONE_"))
      .map(([, v]) => normalizePhone(v ?? ""))
      .filter(Boolean)
  );

  const { rows } = await pool.query(`
    SELECT m.id, m.tenant_id, m.direction, m.channel, m."from", m.from_pn, m."to",
           m.customer_name, m.body, m.created_at
    FROM message m
    WHERE m.channel = 'whatsapp'
      AND m.direction = 'inbound'
      AND m.created_at > now() - interval '${SINCE_SQL}'
    ORDER BY m.created_at ASC`);

  const candidates = new Map<string, NewLead[]>();
  let looked = 0, refused = 0;
  for (const r of rows) {
    looked++;
    const candidate = leadFromMessage({
      id: r.id, tenantId: r.tenant_id, direction: r.direction, channel: r.channel,
      from: r.from, fromPn: r.from_pn, to: r.to,
      customerName: r.customer_name, body: r.body, createdAt: r.created_at,
    }, { ownNumbers });
    if (!candidate) { refused++; continue; }
    const key = `${candidate.tenantId}|${candidate.externalId}`;
    const history = candidates.get(key) ?? [];
    history.push(candidate);
    candidates.set(key, history);
  }

  let created = 0, existed = 0, dealsCreated = 0, dealsExisting = 0;
  for (const history of candidates.values()) {
    const first = history[0];
    const latest = history[history.length - 1];
    const tail = normalizePhone(first.phone).slice(-MIN_PHONE_MATCH_DIGITS);

    if (!COMMIT) {
      const dup = await pool.query(
        `SELECT id FROM lead
          WHERE tenant_id = $1
            AND (external_id = $2
                 OR right(regexp_replace(coalesce(phone,''), '\\D', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = $3)
          LIMIT 1`,
        [first.tenantId, first.externalId, tail]
      );
      if (dup.rowCount) { existed++; continue; }
      console.log(`  NEW  ${first.customerName.padEnd(22).slice(0, 22)} ${first.phone.padEnd(14)} "${first.notes.slice(0, 60)}"`);
      created++;
      continue;
    }

    const facts = history.reduce<VouchedFacts>(
      (acc, c) => mergeVouched(acc, c.signals),
      { car: null, value: null, term: null }
    );
    const intentSignal = [...history].reverse().find((c) => c.signals.intent)?.signals.intent ?? null;
    const intent = fromExtractIntent(intentSignal, facts.term);
    const type = intentSignal === "sale" ? "purchase" : intentSignal?.startsWith("lease") ? "lease" : "rent";

    const outcome = await withDrizzleTenant(first.tenantId, async (tx) => {
      const [existingLead] = await tx
        .select({ id: lead.id, assignedTo: lead.assignedTo })
        .from(lead)
        .where(and(
          eq(lead.tenantId, first.tenantId),
          or(
            eq(lead.externalId, first.externalId),
            sql`right(regexp_replace(coalesce(${lead.phone}, ''), '\\D', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}`
          )
        ))
        .orderBy(desc(lead.updatedAt))
        .limit(1);

      let leadId: string;
      let wasCreated = false;
      if (existingLead) {
        leadId = existingLead.id;
        await tx.update(lead).set({
          vouchedCar: facts.car,
          vouchedValue: facts.value,
          vouchedTerm: facts.term,
          updatedAt: latest.createdAt,
        }).where(eq(lead.id, leadId));
      } else {
        const inserted = await tx.insert(lead).values({
          tenantId: first.tenantId,
          customerName: first.customerName,
          phone: first.phone,
          notes: first.notes,
          source: first.source,
          externalId: first.externalId,
          externalSource: first.externalSource,
          status: "new",
          vouchedCar: facts.car,
          vouchedValue: facts.value,
          vouchedTerm: facts.term,
          createdAt: first.createdAt,
          updatedAt: latest.createdAt,
        }).returning({ id: lead.id });
        leadId = inserted[0].id;
        wasCreated = true;
      }

      for (const c of history) {
        await tx.update(message).set({
          extractedCarText: c.signals.carText,
          extractedPriceAed: c.signals.priceAed,
          extractedDateFrom: c.signals.dateFrom,
          extractedDateTo: c.signals.dateTo,
          extractedTermMonths: c.signals.termMonths,
          extractedIntent: c.signals.intent,
          extractedLanguage: c.signals.language,
          extractedManagerMention: c.signals.managerMention,
          extractedAt: new Date(),
          relatedEntityType: "lead",
          relatedEntityId: leadId,
        }).where(and(eq(message.tenantId, c.tenantId), eq(message.id, c.messageId)));
      }
      await tx.update(message).set({ relatedEntityType: "lead", relatedEntityId: leadId }).where(and(
        eq(message.tenantId, first.tenantId),
        eq(message.channel, "whatsapp"),
        isNull(message.relatedEntityId),
        sql`right(regexp_replace(coalesce(coalesce(${message.fromPn}, ${message.from}), ''), '\\D', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}`
      ));

      const [existingDeal] = await tx
        .select({ id: deal.id, intent: deal.intent })
        .from(deal)
        .where(and(eq(deal.tenantId, first.tenantId), eq(deal.leadId, leadId), eq(deal.status, "open")))
        .orderBy(desc(deal.createdAt))
        .limit(1);
      if (existingDeal) {
        await tx.update(deal).set({
          intent: intent ?? existingDeal.intent,
          vouchedCar: facts.car,
          vouchedValue: facts.value,
          vouchedTerm: facts.term,
          lastActivityAt: latest.createdAt,
          updatedAt: latest.createdAt,
        }).where(eq(deal.id, existingDeal.id));
      } else {
        await tx.insert(deal).values({
          tenantId: first.tenantId,
          leadId,
          ref: `WA-${tail}`,
          type,
          status: "open",
          stage: "inquiry",
          intent,
          notes: first.notes,
          externalId: first.externalId,
          externalSource: first.externalSource,
          ownerId: existingLead?.assignedTo ?? null,
          vouchedCar: facts.car,
          vouchedValue: facts.value,
          vouchedTerm: facts.term,
          lastActivityAt: latest.createdAt,
          createdAt: first.createdAt,
          updatedAt: latest.createdAt,
        });
      }
      return { wasCreated, dealCreated: !existingDeal };
    });

    if (outcome.wasCreated) created++; else existed++;
    if (outcome.dealCreated) dealsCreated++; else dealsExisting++;
  }

  let contacted = 0, moved = 0;
  if (COMMIT) {
    const answered = await pool.query(`
      SELECT DISTINCT tenant_id, related_entity_id AS lead_id
      FROM message
      WHERE channel = 'whatsapp' AND direction = 'outbound'
        AND related_entity_type = 'lead' AND related_entity_id IS NOT NULL
        AND created_at > now() - interval '${SINCE_SQL}'`);
    for (const row of answered.rows) {
      const result = await withDrizzleTenant(row.tenant_id, (tx) =>
        markWhatsappContacted(tx, { tenantId: row.tenant_id, leadId: row.lead_id })
      );
      if (result.contacted) contacted++;
      moved += result.moved;
    }
  }

  console.log(
    `\n[wa-lead] window=${SINCE_SQL} looked=${looked} refused=${refused} ` +
    `already-known=${existed} ${COMMIT ? "created" : "would create"}=${created} ` +
    `deals-new=${dealsCreated} deals-existing=${dealsExisting} contacted=${contacted} moved=${moved}`
  );
  if (!COMMIT) console.log(`[wa-lead] dry run — add --commit to write. Source tag: ${WA_LEAD_SOURCE}`);
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
