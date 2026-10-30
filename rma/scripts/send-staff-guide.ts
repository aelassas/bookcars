/**
 * send-staff-guide.ts — WhatsApp each reachable manager the CRM quick-guide PDF.
 *
 *   npx tsx scripts/send-staff-guide.ts              # dry run, prints each message
 *   npx tsx scripts/send-staff-guide.ts --commit
 *
 * Russian PDF → Babek, Azat, Firuz. English PDF → Ali, Abdullah.
 * Same delivery rail as send-staff-logins.ts: wa_outbox on the notify sender
 * line, stop-word guard and 12h staleness window included.
 *
 * MEDIA GOTCHA: the bridge DELETES media_path after a successful send, so each
 * recipient gets their own staged copy under outbox-media/guide/<key>/ — the
 * basename stays a clean "TAKE-Auto-CRM-guide-XX.pdf" for the chat bubble.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { copyFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { pool } from "@/platform/db/client";

const COMMIT = process.argv.includes("--commit");

const ph = (k: string) => {
  const v = process.env[`NOTIFY_WA_PHONE_${k}`]?.trim();
  if (!v) throw new Error(`NOTIFY_WA_PHONE_${k} is not set`);
  return v;
};

type Staff = { key: string; name: string; lang: "RU" | "EN"; phone: string };
const STAFF: Staff[] = [
  { key: "babek",    name: "Babek",    lang: "RU", phone: ph("BABEK") },
  { key: "azat",     name: "Azat",     lang: "RU", phone: ph("AZAT") },
  { key: "firuz",    name: "Firuz",    lang: "RU", phone: ph("FIRUZ") },
  { key: "ali",      name: "Ali",      lang: "EN", phone: ph("ALI") },
  { key: "abdullah", name: "Abdullah", lang: "EN", phone: ph("ABDULLAH") },
];

const SENDER_LINE = process.env.NOTIFY_WA_SENDER_LINE?.trim() || "takeauto-leasing-dept";
const MEDIA_DIR = process.env.WA_OUTBOX_MEDIA_DIR?.trim()
  || resolve(process.cwd(), "..", "wa-observer", "outbox-media");
const SRC_DIR = process.env.GUIDE_PDF_DIR?.trim() || "/tmp/crm-guide";

const CAPTION: Record<"RU" | "EN", string> = {
  RU: [
    "Привет! Это короткая инструкция по новой CRM (2 минуты чтения):",
    "как войти, где ваша доска, что на карточке клиента.",
    "Главное новое: стадии теперь двигаются сами — система читает переписку и звонки",
    "и поднимает карточку вперёд. Назад — никогда, ваши ручные карточки не трогает.",
    "Вопросы — просто ответьте сюда.",
  ].join("\n"),
  EN: [
    "Hi! This is the quick guide for the new CRM (2-minute read):",
    "how to sign in, where your board is, what a customer card shows.",
    "The big thing: the system reads chats and calls and keeps the card filled in —",
    "but stages move when YOU drag the card. Nothing moves your cards by itself.",
    "Questions — just reply here.",
  ].join("\n"),
};

async function main() {
  const tenantRow = (await pool.query("SELECT id FROM tenant WHERE slug='take-auto'")).rows[0];
  if (!tenantRow) throw new Error("tenant take-auto not found");
  const anchor = (await pool.query(
    "SELECT id FROM board_item WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1", [tenantRow.id]
  )).rows[0];
  if (!anchor) throw new Error("no board_item to anchor the outbox row to");

  for (const s of STAFF) {
    const fileName = `TAKE-Auto-CRM-guide-${s.lang}.pdf`;
    const staged = join(MEDIA_DIR, "guide", s.key, fileName);
    const body = CAPTION[s.lang];
    const jid = `${s.phone}@s.whatsapp.net`;
    if (!COMMIT) {
      console.log(`\n──── ${s.name} (${s.lang}) → ${jid}\n[document] ${staged}\n${body}`);
      continue;
    }
    mkdirSync(join(MEDIA_DIR, "guide", s.key), { recursive: true });
    copyFileSync(join(SRC_DIR, fileName), staged);
    const hash = require("crypto").createHash("md5").update(`${s.key}:${body}`).digest("hex");
    const res = await pool.query(
      `INSERT INTO wa_outbox (tenant_id, board_item_id, to_jid, brand_line, body, approved_by, content_hash, status, media_kind, media_mime, media_path)
       VALUES ($1,$2,$3,$4,$5,'staff-guide',$6,'pending','document','application/pdf',$7)
       ON CONFLICT DO NOTHING RETURNING id`,
      [tenantRow.id, anchor.id, jid, SENDER_LINE, body, hash, staged]
    );
    console.log(`${s.name.padEnd(9)} ${s.lang} → ${jid}  ${res.rowCount ? "queued" : "duplicate, skipped"}`);
  }
  if (!COMMIT) console.log(`\n[dry run] ${STAFF.length} guide PDF(s) would be queued on line ${SENDER_LINE}. Add --commit to send.`);
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
