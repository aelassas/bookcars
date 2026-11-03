// Recover the marketplace enquiries that already arrived and were dropped.
//
// Measured 2026-08-09: 23 real Dubizzle enquiries sat in `message`, 87% of
// them never became a customer record — we pay for those listings and then
// let the answer expire in a chat nobody re-read. This walks the stream with
// the same detector the live path now uses (lead-origin.ts) and creates the
// missing leads, phone-keyed exactly like every other WhatsApp lead so a
// client who also called is ONE lead, not two.
//
//   npx tsx scripts/backfill-dubizzle-leads.ts            # report only
//   npx tsx scripts/backfill-dubizzle-leads.ts --apply
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db as platformDb } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { detectLeadOrigin, leadOriginNotes } from "@/modules/crm/lead-origin";
import { waLeadExternalId, WA_LEAD_SOURCE } from "@/modules/crm/lead-from-whatsapp";
import { normalizePhone } from "@/platform/messaging/phone";

const APPLY = process.argv.includes("--apply");

type Row = {
  id: string;
  created_at: string | Date;
  direction: string;
  from: string | null;
  from_pn: string | null;
  to: string | null;
  customer_name: string | null;
  body: string;
};

/** node-postgres hands dates back as strings on a raw execute(). */
function day(v: string | Date): string {
  return (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);
}

function rows<T>(res: unknown): T[] {
  return (res as { rows?: T[] })?.rows ?? [];
}

/** The dialable number behind a message, or "" when WhatsApp hid it (@lid). */
function phoneOf(m: Row): string {
  if (m.from_pn) return normalizePhone(m.from_pn);
  const jid = m.from ?? "";
  if (jid.endsWith("@lid") || jid.includes("broadcast") || jid.endsWith("@g.us")) return "";
  return normalizePhone(jid.split("@")[0]);
}

async function main() {
  const tenants = await platformDb.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
  let seen = 0;
  let created = 0;
  let alreadyHad = 0;
  let unreachable = 0;

  for (const t of tenants) {
    const messages = await withDrizzleTenant(t.id, async (tx) =>
      rows<Row>(
        await tx.execute(sql`
          SELECT id, created_at, direction, "from", from_pn, "to", customer_name, body
            FROM message
           WHERE body ILIKE '%dubizzle%'
           ORDER BY created_at
        `)
      )
    );

    for (const m of messages) {
      const origin = detectLeadOrigin(m.body);
      if (!origin) continue; // our own bot, our own replies, ordinary chatter
      seen++;
      const phone = phoneOf(m);
      const who = m.customer_name?.trim() || origin.inquirerName || (phone ? `+${phone}` : null);

      if (!phone) {
        // The notification shape carries no number. It is still a real
        // enquiry, but it has no phone-shaped identity to dedupe on, so it
        // cannot become a lead the same way — reported, never invented.
        unreachable++;
        console.log(
          `[${t.slug}] ${day(m.created_at)} NO PHONE — ${origin.label}` +
            ` — ${origin.inquirerName ?? "unnamed"} — ${origin.listingUrl ?? "no link"}`
        );
        continue;
      }

      const externalId = waLeadExternalId(phone);
      const existing = await withDrizzleTenant(t.id, async (tx) =>
        rows<{ id: string }>(
          await tx.execute(sql`
            SELECT id FROM lead
             WHERE tenant_id = ${t.id}
               AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = ${phone.slice(-9)}
             LIMIT 1
          `)
        )
      );
      if (existing.length > 0) {
        alreadyHad++;
        continue;
      }

      console.log(
        `[${t.slug}] ${day(m.created_at)} ${APPLY ? "creating" : "would create"} ` +
          `${who} +${phone} — ${origin.label}${origin.referenceKey ? ` — ref ${origin.referenceKey}` : ""}`
      );
      created++;
      if (!APPLY) continue;

      await withDrizzleTenant(t.id, async (tx) => {
        await tx.execute(sql`
          INSERT INTO lead (
            tenant_id, customer_name, phone, source, source_description, status,
            notes, external_id, external_source
          ) VALUES (
            ${t.id}, ${(who ?? `+${phone}`).slice(0, 200)}, ${phone},
            ${origin.channel}, ${origin.label}, 'new',
            ${leadOriginNotes(origin, m.body)}, ${externalId}, ${WA_LEAD_SOURCE}
          )
        `);
      });
    }
  }

  console.log(
    `\n${APPLY ? "DONE" : "DRY RUN"}: ${seen} marketplace enquiries found — ` +
      `${created} lead(s) ${APPLY ? "created" : "to create"}, ${alreadyHad} already known, ` +
      `${unreachable} carried no phone (answer them inside Dubizzle).` +
      (APPLY ? "" : " Re-run with --apply.")
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
