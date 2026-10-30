/**
 * run-wa-lead-intake.ts — create leads from inbound WhatsApp.
 *
 *   npx tsx scripts/run-wa-lead-intake.ts                 # dry run, prints what it would make
 *   npx tsx scripts/run-wa-lead-intake.ts --commit
 *   npx tsx scripts/run-wa-lead-intake.ts --since 7d --commit
 *
 * Bitrix is being switched off for cost. It is not the CRM we are replacing —
 * it is the switchboard, and WhatsApp through its open lines is its biggest
 * intake channel (33% of leads). We already receive the same traffic on our own
 * observers; this is the step that turns a stranger's first message into a lead
 * the desk can work.
 *
 * Idempotent by (tenant_id, external_id = wa:<last 9 digits>): re-running makes
 * nothing new, and a customer who writes fifty times is one lead. The rules for
 * what counts as a lead live in modules/crm/lead-from-whatsapp.ts — pure and
 * unit-tested, so they cannot quietly drift in here.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { leadFromMessage, WA_LEAD_SOURCE } from "@/modules/crm/lead-from-whatsapp";
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
  // Our own line numbers, so staff coordinating between lines is never a lead.
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

  // One lead per person, from their EARLIEST qualifying message in the window —
  // the first ask is the one a salesperson wants to read, not the fifth.
  const candidates = new Map<string, ReturnType<typeof leadFromMessage>>();
  let looked = 0, refused = 0;
  for (const r of rows) {
    looked++;
    const lead = leadFromMessage({
      id: r.id, tenantId: r.tenant_id, direction: r.direction, channel: r.channel,
      from: r.from, fromPn: r.from_pn, to: r.to,
      customerName: r.customer_name, body: r.body, createdAt: r.created_at,
    }, { ownNumbers });
    if (!lead) { refused++; continue; }
    const key = `${lead.tenantId}|${lead.externalId}`;
    if (!candidates.has(key)) candidates.set(key, lead);
  }

  let created = 0, existed = 0;
  for (const lead of candidates.values()) {
    if (!lead) continue;
    const tail = normalizePhone(lead.phone).slice(-MIN_PHONE_MATCH_DIGITS);
    // Already a lead for this human? Match on external_id AND on the phone key,
    // because the same person very often already exists as a Bitrix lead — and
    // creating a second one would split their history in two.
    const dup = await pool.query(
      `SELECT id, external_source FROM lead
        WHERE tenant_id = $1
          AND (external_id = $2
               OR right(regexp_replace(coalesce(phone,''), '\\D', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = $3)
        LIMIT 1`,
      [lead.tenantId, lead.externalId, tail]
    );
    if (dup.rowCount) { existed++; continue; }

    if (!COMMIT) {
      console.log(`  NEW  ${lead.customerName.padEnd(22).slice(0, 22)} ${lead.phone.padEnd(14)} "${lead.notes.slice(0, 60)}"`);
      created++;
      continue;
    }
    const ins = await pool.query(
      `INSERT INTO lead (tenant_id, customer_name, phone, notes, source, external_id, external_source, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'new',$8) RETURNING id`,
      [lead.tenantId, lead.customerName, lead.phone, lead.notes, lead.source,
       lead.externalId, lead.externalSource, lead.createdAt]
    );
    const leadId = ins.rows[0]?.id;
    // Stitch the conversation to the lead it created, so the desk opens the
    // record and reads what the customer actually asked for.
    if (leadId) {
      await pool.query(
        `UPDATE message SET related_entity_type='lead', related_entity_id=$1
          WHERE tenant_id=$2 AND channel='whatsapp' AND related_entity_id IS NULL
            AND right(regexp_replace(coalesce(coalesce(from_pn,"from"),''), '\\D', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = $3`,
        [leadId, lead.tenantId, tail]
      );
    }
    created++;
  }

  console.log(
    `\n[wa-lead] window=${SINCE_SQL} looked=${looked} refused=${refused} ` +
    `already-known=${existed} ${COMMIT ? "created" : "would create"}=${created}`
  );
  if (!COMMIT) console.log(`[wa-lead] dry run — add --commit to write. Source tag: ${WA_LEAD_SOURCE}`);
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
