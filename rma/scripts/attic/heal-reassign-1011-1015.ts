// HEAL the false-reassign casualties of 2026-09-18.
//
// What happened (verified in the message table, not assumed): the acceptance
// probe was scoped to the assignment's tenant. Cardiwan main-line cards record
// tenantSlug "cardiwan", but most agent lines write on tenant "easyrent" —
// so the probe never saw the agent's reply, the window expired, and each card
// ping-ponged through the roster (up to 31 "ignores" on #998) while the
// customers were already being talked to. Fixed in run-rental-distributor.ts
// (probe is now cross-tenant) and rental-distributor.ts (a re-pick excludes
// the WHOLE ignore history, so a card can never lap the roster again) — this
// script repairs the six live casualties.
//
// Attribution is by the observer session embedded in external_message_id
// ("waobs:<line>:…"), never by guess:
//
//   #1015 ff1957ba-…  +971543666118 — Babek, his line, 16:06:32Z
//                     ("Hi" / "I'm Babek" / …, 41 rows) <5 min after assignment.
//   #1011 d6be4069-…  +971589306442 — Askhab, 15:38:24Z; same human as the
//                     accepted etm card #1010 — he owns the relationship.
//   #1013 1074bdec-…  +971…753601355 — Mohamed (waobs:mohamed-etm), 16:05:31Z.
//   #1014 b660390e-…  +971…378563474 — self-identified "This is Abdullah from
//                     Cardiwan", sent off the cardiwan line, 14:28:19Z.
//   #1008 b98c88f4-…  +971…588170410 — answered from the cardiwan MAIN line
//                     (the manager's desk), 13:04:30Z → credited to Ayham.
//   #998  49c63b82-…  +971…551561601 — answered from the cardiwan main line
//                     12:29:20Z ("270"), again by Mohamed 14:15Z → Ayham.
//
// #1012 (tail 509196277) has NO outbound at all — genuinely unanswered — and
// #1023 (etm) is a normal flow card; both are left to the fixed sweeper.
//
// Per card: Twenty opportunity ownerId+acceptedAt, the rental_distribution
// assignment marked done, and the manager gets the "accepted" WhatsApp the
// system owed him (dedupeKey mgr-accepted:<oppId> — the exact key the sweeper
// would have used, so a later real accept cannot double-send).
//
// Idempotent: an already-healed assignment (done=true, acceptedAt set) is
// skipped. DRY-RUN by default, --commit to write.
//
//   npx tsx scripts/heal-reassign-1011-1015.ts --commit
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { tenantSlugForLine } from "@/modules/messaging/lines";
import { enqueueDistributorWhatsApp, tenantIdForSlug } from "@/modules/rental/outbox";

const COMMIT = process.argv.includes("--commit");
const AYHAM_MEMBER_ID = "2366ace5-bffa-48f1-910a-657d8e88fbdd";
const managerWa = (process.env.MANAGER_WA_CARDIWAN ?? "").replace(/\D/g, "");

const HEALS = [
  {
    oppId: "ff1957ba-38c3-42ca-9591-13f2c85f2cac",
    lead: "#1015",
    agentName: "Babek",
    memberId: "e062e52d-02ca-4432-a59c-c2310855cefb",
    phone: "971529965085",
    acceptedAt: "2026-09-18T16:06:32.568Z",
  },
  {
    oppId: "d6be4069-6dc9-48a6-9d64-8b4f7b3ccf9f",
    lead: "#1011",
    agentName: "Askhab",
    memberId: "ea5e1db7-de81-42ae-818b-035cb8a9d928",
    phone: "971542445834",
    acceptedAt: "2026-09-18T15:38:24.112Z",
  },
  {
    oppId: "1074bdec-c9dd-4d89-862b-cc013c5e8a66",
    lead: "#1013",
    agentName: "Mohamed",
    memberId: "a9724602-8921-448a-a374-19c76de1854b",
    phone: "971542445832",
    acceptedAt: "2026-09-18T16:05:31.392Z",
  },
  {
    oppId: "b660390e-e68a-4cd3-91e6-b7935c8289ec",
    lead: "#1014",
    agentName: "Abdullah",
    memberId: "dfafac22-03c6-488b-85f2-d976f62191e1",
    phone: "971585809747",
    acceptedAt: "2026-09-18T14:28:19.024Z",
  },
  {
    oppId: "b98c88f4-5a1b-472f-9cc3-b998c136e3b8",
    lead: "#1008",
    agentName: "Ayham",
    memberId: AYHAM_MEMBER_ID,
    phone: managerWa,
    acceptedAt: "2026-09-18T13:04:30.287Z",
  },
  {
    oppId: "49c63b82-aa84-42d8-bc07-e76c2f9edcde",
    lead: "#998",
    agentName: "Ayham",
    memberId: AYHAM_MEMBER_ID,
    phone: managerWa,
    acceptedAt: "2026-09-18T12:29:20.017Z",
  },
];

async function main() {
  const client = getTwentyClientForInstance("rental");
  const notifyLine = process.env.RENTAL_NOTIFY_LINE?.trim() || "cardiwan";
  const cardBase = (process.env.TWENTY_RENTAL_URL?.trim() || "https://rent.takeauto.tech").replace(/\/$/, "");

  for (const h of HEALS) {
    // 1. The assignment record — only when it is still open (idempotency).
    const state = await db.execute(sql`
      SELECT s.id, s.counts->'rentalAssignments'->${h.oppId} AS assignment
        FROM twenty_mirror_state s
       WHERE s.entity = 'rental_distribution'
         AND s.counts->'rentalAssignments' ? ${h.oppId}
    `);
    const row = (state as unknown as { rows: { id: string; assignment: Record<string, unknown> | null }[] }).rows[0];
    if (!row?.assignment) {
      console.log(`${h.lead} ${h.oppId}: no assignment record — skipping (already pruned?)`);
      continue;
    }
    const a = row.assignment;
    if (a.done === true && typeof a.acceptedAt === "string") {
      console.log(`${h.lead} ${h.oppId}: already done (acceptedAt=${a.acceptedAt}) — skipping`);
      continue;
    }
    const brand = typeof a.brand === "string" ? a.brand : "cardiwan";
    const customerPhone = typeof a.customerPhone === "string" ? a.customerPhone : "";
    console.log(
      `${h.lead} ${h.oppId}: healing — was assigned to ${a.agentName} since ${a.assignedAt}, ` +
        `ignored=${JSON.stringify(a.ignoredNames)} → done, credited to ${h.agentName} at ${h.acceptedAt}${COMMIT ? "" : " (dry-run)"}`
    );
    if (!COMMIT) continue;

    const patch = {
      ...a,
      done: true,
      agentName: h.agentName,
      memberId: h.memberId,
      phone: h.phone,
      acceptedAt: h.acceptedAt,
    };
    await db.execute(sql`
      UPDATE twenty_mirror_state s
         SET counts = jsonb_set(s.counts, ARRAY['rentalAssignments', ${h.oppId}], ${JSON.stringify(patch)}::jsonb),
             updated_at = now()
       WHERE s.id = ${row.id}
    `);

    // 2. The Twenty card — owner back to the agent who actually answered.
    await client.patch(`opportunities/${h.oppId}`, { ownerId: h.memberId, acceptedAt: h.acceptedAt });

    // 3. The manager notification the system owed him.
    if (managerWa) {
      const tenantId = await tenantIdForSlug(tenantSlugForLine(notifyLine), db);
      if (tenantId) {
        await enqueueDistributorWhatsApp({
          line: notifyLine,
          toDigits: managerWa,
          text:
            `✅ Lead ${h.lead} (+${customerPhone}) accepted by ${h.agentName} (${brand}).` +
            `\n🗂 ${cardBase}/object/opportunity/${h.oppId}`,
          dedupeKey: `mgr-accepted:${h.oppId}`,
          tenantId,
        });
      } else {
        console.warn(`${h.lead}: notify line tenant unresolved — manager WhatsApp skipped`);
      }
    }
    console.log(`${h.lead}: healed.`);
  }

  // 4. What is still open after the heal?
  const open = await db.execute(sql`
    SELECT kv.key, kv.value->>'agentName' AS agent, kv.value->>'leadNumber' AS lead,
           kv.value->>'assignedAt' AS assigned_at
      FROM twenty_mirror_state s, jsonb_each(s.counts->'rentalAssignments') kv
     WHERE s.entity = 'rental_distribution' AND kv.value->>'done' = 'false'
  `);
  const rows = (open as unknown as { rows: unknown[] }).rows;
  console.log(`still-open assignments: ${rows.length}`);
  for (const r of rows) console.log(" ", JSON.stringify(r));
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end().catch(() => {});
    process.exit(1);
  });
