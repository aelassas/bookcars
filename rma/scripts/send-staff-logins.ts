/**
 * send-staff-logins.ts — WhatsApp each manager their own CRM sign-in details.
 *
 *   npx tsx scripts/send-staff-logins.ts              # dry run, prints each message
 *   npx tsx scripts/send-staff-logins.ts --commit
 *   npx tsx scripts/send-staff-logins.ts --only azat,firuz --commit
 *
 * Two systems, and WHICH ONE a person gets is the whole point: rent works in
 * the rental instance, sales/lease in the sales one. Sending a rent link to the
 * sales desk is how this team ended up marking our messages as spam.
 *
 * Delivery rides wa_outbox on the notify sender line, so the same drain, the
 * same stop-word guard and the same 12h staleness window apply as to every
 * other outbound message.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";

const COMMIT = process.argv.includes("--commit");
const onlyArg = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1].split(",").map((s) => s.trim().toLowerCase()) : null;
})();

const SENDER_LINE = process.env.NOTIFY_WA_SENDER_LINE?.trim() || "takeauto-leasing-dept";
const LAN = "10.255.254.12";

type Staff = {
  key: string; name: string; phone: string;
  side: "rent" | "sales";
  email: string;
};

/** Phones come from the notify config so there is ONE place a number lives. */
const ph = (k: string) => {
  const v = process.env[`NOTIFY_WA_PHONE_${k}`]?.trim();
  if (!v) throw new Error(`NOTIFY_WA_PHONE_${k} is not set`);
  return v;
};

const STAFF: Staff[] = [
  { key: "babek",    name: "Babek",    phone: ph("BABEK"),    side: "rent",  email: "babek@easyrent.com" },
  { key: "ali",      name: "Ali",      phone: ph("ALI"),      side: "rent",  email: "ali@etm.com" },
  { key: "abdullah", name: "Abdullah", phone: ph("ABDULLAH"), side: "rent",  email: "abdullah@cardiwan.com" },
  { key: "azat",     name: "Azat",     phone: ph("AZAT"),     side: "sales", email: "azat@takeauto.com" },
  { key: "firuz",    name: "Firuz",    phone: ph("FIRUZ"),    side: "sales", email: "firuz@takeauto.com" },
  { key: "moe",      name: "Moe",      phone: ph("MOE"),      side: "sales", email: "moe@takeauto.com" },
];

const PASSWORD = process.env.STAFF_INITIAL_PASSWORD?.trim() || "12345678";

function message(s: Staff): string {
  const port = s.side === "rent" ? 3002 : 3001;
  const what = s.side === "rent"
    ? `You will see the rental side: Cardiwan and EasyRent (ETM).

Your deals are under "Opportunities" — not "Rent Deals". At the top of the list click the name and choose your own company, so you see only your own work.`
    : `You will see the TAKE Auto side only — sale and lease. No rental data.

Your deals are under "Opportunities". Everything from Bitrix since 2024 is inside, and dead deals are marked Lost, so the list shows what is actually alive.`;

  return [
    `Hi ${s.name}, here is your login for the new CRM.`,
    ``,
    `Open in Chrome:  http://${LAN}:${port}`,
    `Login:     ${s.email}`,
    `Password:  ${PASSWORD}`,
    ``,
    `Please change the password after your first login.`,
    ``,
    what,
    ``,
    `It only works on the office wifi for now — from home or mobile data it will not open. We are fixing that.`,
    ``,
    `Reply here if anything looks wrong or missing. We read every answer.`,
  ].join("\n");
}

async function main() {
  const targets = STAFF.filter((s) => !onlyArg || onlyArg.includes(s.key));
  // board_item_id is NOT NULL on wa_outbox and every row must point at one.
  // A staff notice has no card of its own, so it borrows the tenant's newest —
  // same shape the 2026-08-04 onboarding batch used.
  const tenantRow = (await pool.query("SELECT id FROM tenant WHERE slug='take-auto'")).rows[0];
  if (!tenantRow) throw new Error("tenant take-auto not found");
  const anchor = (await pool.query(
    "SELECT id FROM board_item WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1", [tenantRow.id]
  )).rows[0];
  if (!anchor) throw new Error("no board_item to anchor the outbox row to");

  for (const s of targets) {
    const body = message(s);
    const jid = `${s.phone}@s.whatsapp.net`;
    if (!COMMIT) {
      console.log(`\n───────── ${s.name} (${s.side}) → ${jid}\n${body}`);
      continue;
    }
    const hash = require("crypto").createHash("md5").update(body).digest("hex");
    const res = await pool.query(
      `INSERT INTO wa_outbox (tenant_id, board_item_id, to_jid, brand_line, body, approved_by, content_hash, status)
       VALUES ($1,$2,$3,$4,$5,'staff-login',$6,'pending')
       ON CONFLICT DO NOTHING RETURNING id`,
      [tenantRow.id, anchor.id, jid, SENDER_LINE, body, hash]
    );
    console.log(`${s.name.padEnd(9)} ${s.side.padEnd(6)} → ${jid}  ${res.rowCount ? "queued" : "duplicate, skipped"}`);
  }
  if (!COMMIT) console.log(`\n[dry run] ${targets.length} message(s) would be queued on line ${SENDER_LINE}. Add --commit to send.`);
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
