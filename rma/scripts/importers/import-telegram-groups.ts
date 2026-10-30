/**
 * Bridge: Telegram group observer JSONL logs → the platform `message` table.
 * Read-only from the logs; inbound only; nothing is ever sent.
 * DRY-RUN default; --commit to write.
 *
 * Same role as import-observer-messages.ts, for the two Telegram observers:
 *   - platform/driver-bot/observed-telegram-groups.jsonl (Cardiwan ops groups)
 *   - otp-bot/observed-telegram-groups.jsonl (the "Yango" booking group)
 * Both write the SAME line shape (see the group middleware in
 * platform/driver-bot/bot.ts:351-371).
 *
 * INCREMENTAL — each file is tailed from a byte-offset checkpoint kept in a
 * small state file (env TG_IMPORT_STATE_FILE), not re-read wholesale: the
 * dedupe index (message_tenant_extid_uidx, 0054) is the backstop, the offset
 * is what keeps a 15-minute beat cheap. Dry-run writes NOTHING, state file
 * included.
 *
 * MULTI-TENANT — the group routes by its TITLE (see TG_GROUP_TENANT below):
 * anything "yango" and the known Cardiwan ops groups → cardiwan; unknown
 * groups fall back to take-auto with a one-line warning, same convention as
 * tenantSlugForLine in modules/messaging/lines.ts.
 *
 * Env:
 *   TG_OBSERVED_DRIVER_BOT / TG_OBSERVED_OTP_BOT   override the tailed paths
 *   TG_IMPORT_STATE_FILE                           override the state file
 *   DATABASE_URL as usual.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const HERE = dirname(import.meta.filename);
const REPO_ROOT = resolve(HERE, "../../..");
const FILES = [
  process.env.TG_OBSERVED_DRIVER_BOT ?? resolve(REPO_ROOT, "platform/driver-bot/observed-telegram-groups.jsonl"),
  process.env.TG_OBSERVED_OTP_BOT ?? resolve(REPO_ROOT, "otp-bot/observed-telegram-groups.jsonl"),
];
const STATE_FILE =
  process.env.TG_IMPORT_STATE_FILE ?? resolve(HERE, ".import-telegram-groups.state.json");
const COMMIT = process.argv.includes("--commit");

// Telegram group → business tenant, keyed on a LOWERCASED SUBSTRING of the
// chat title — a title is a label typed once and never corrected, the same
// caveat as modules/messaging/lines.ts. First match wins. Unknown groups
// fall back to take-auto with a one-line warning — which silently dumps a
// rent chat on the sales desk, so pin a new group here the moment it appears.
const TG_GROUP_TENANT: Record<string, string> = {
  yango: "cardiwan",    // Yango booking notifications (otp-bot's group)
  cardiwan: "cardiwan", // Cardiwan ops groups (driver-bot observations)
};
const DEFAULT_TG_GROUP_TENANT = "take-auto";

function tenantSlugForGroup(chatTitle: string | null): string {
  const t = (chatTitle ?? "").toLowerCase();
  for (const [key, slug] of Object.entries(TG_GROUP_TENANT)) {
    if (t.includes(key)) return slug;
  }
  return DEFAULT_TG_GROUP_TENANT;
}

// First plausible phone in a message body (9-15 digits once stripped) — Yango
// bookings and marketplace forwards carry the customer's number in the text;
// it becomes from_pn, the thread key the lead relay matches on.
function phoneFromBody(text: string | null): string | null {
  const m = /(?<!\d)\+?\d[\d\s().-]{7,18}\d(?!\d)/.exec(text ?? "");
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

type Obs = {
  ts?: string;
  chatId?: number | null;
  chatTitle?: string | null;
  chatType?: string | null;
  fromId?: number | null;
  fromName?: string | null;
  username?: string | null;
  messageId?: number | null;
  text?: string | null;
  hasMedia?: boolean;
  replyTo?: number | null;
};

/** The new complete lines of one file, and the byte offset just past them. */
function tailFile(path: string, offset: number): { lines: string[]; nextOffset: number } {
  if (!existsSync(path)) return { lines: [], nextOffset: 0 };
  const size = statSync(path).size;
  // Rotated or truncated since the last pass — start over rather than read
  // garbage from the middle of a line.
  const start = offset > size ? 0 : offset;
  if (start === size) return { lines: [], nextOffset: start };
  const buf = Buffer.alloc(size - start);
  const fd = openSync(path, "r");
  try {
    readSync(fd, buf, 0, buf.length, start);
  } finally {
    closeSync(fd);
  }
  // Only whole lines: a partially-written trailing line is picked up next pass.
  const text = buf.toString("utf8");
  const lastNl = text.lastIndexOf("\n");
  if (lastNl === -1) return { lines: [], nextOffset: start };
  const complete = text.slice(0, lastNl + 1);
  return {
    lines: complete.split("\n").filter((l) => l.trim()),
    nextOffset: start + Buffer.byteLength(complete, "utf8"),
  };
}

function loadState(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {}; // first run, or a state file someone edited by hand
  }
}

async function main() {
  // Resolve every tenant this run might touch, once.
  const slugs = Array.from(new Set([...Object.values(TG_GROUP_TENANT), DEFAULT_TG_GROUP_TENANT]));
  const tenantIds = new Map<string, string>();
  for (const slug of slugs) {
    const row = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [slug])).rows[0];
    if (row) tenantIds.set(slug, row.id);
    else console.warn(`⚠️  tenant '${slug}' not found — its groups will be skipped`);
  }

  const state = loadState();
  const nextState: Record<string, number> = { ...state };
  const msgs: (Obs & { extId: string })[] = [];
  let skippedNoBody = 0;
  for (const f of FILES) {
    const { lines, nextOffset } = tailFile(f, state[f] ?? 0);
    nextState[f] = nextOffset;
    for (const line of lines) {
      let r: Obs;
      try { r = JSON.parse(line); } catch { continue; }
      // Media-only ops spam (fines screenshots, delivery photos) carries no
      // text to qualify; service messages carry none either. message.body is
      // NOT NULL, so both stay out.
      if (!r.text || !r.text.trim()) { skippedNoBody++; continue; }
      msgs.push({
        ...r,
        extId: `tg:${r.chatId ?? "unknown"}:${r.messageId ?? r.ts ?? "unknown"}`,
      });
    }
  }

  console.log(`\n📨 Parsed ${msgs.length} NEW telegram group messages (${skippedNoBody} media-only/service lines skipped).`);

  if (!COMMIT) {
    for (const m of msgs.slice(0, 10)) {
      console.log(`  [${tenantSlugForGroup(m.chatTitle ?? null)}] ${m.chatTitle ?? "?"} · ${m.fromName ?? "?"}: ${(m.text ?? "").slice(0, 80)}`);
    }
    if (msgs.length > 10) console.log(`  … and ${msgs.length - 10} more`);
    console.log(`\n— DRY-RUN — no writes (state file untouched). Re-run with --commit.\n`);
    await pool.end();
    return;
  }

  const perTenant = new Map<string, number>();
  const warnedGroups = new Set<string>();
  let inserted = 0;
  for (const m of msgs) {
    const title = m.chatTitle ?? null;
    const slug = tenantSlugForGroup(title);
    const mapped = Object.keys(TG_GROUP_TENANT).some((k) => (title ?? "").toLowerCase().includes(k));
    if (!mapped && !warnedGroups.has(title ?? "")) {
      warnedGroups.add(title ?? "");
      console.warn(`⚠️  unmapped group '${title ?? "?"}' → defaulting to ${DEFAULT_TG_GROUP_TENANT} (add it to TG_GROUP_TENANT in this file)`);
    }
    const tid = tenantIds.get(slug);
    if (!tid) continue;
    const res = await pool.query(
      `INSERT INTO message (tenant_id, channel, direction, "from", from_pn, "to", customer_name, body, status, external_message_id, created_at)
       VALUES ($1,'telegram','inbound',$2,$3,$4,$5,$6,'received',$7,$8)
       ON CONFLICT (tenant_id, external_message_id) WHERE external_message_id IS NOT NULL
       DO NOTHING`,
      [
        tid,
        `tg:${m.fromId ?? "unknown"}`,
        phoneFromBody(m.text ?? null),
        title,
        m.fromName ?? m.username ?? null,
        m.text,
        m.extId,
        m.ts ?? new Date().toISOString(),
      ],
    );
    if (res.rowCount === 1) {
      inserted++;
      perTenant.set(slug, (perTenant.get(slug) ?? 0) + 1);
    }
  }

  // The checkpoint moves only after every insert above succeeded — a crash
  // mid-pass just re-reads (the unique index absorbs the replay).
  writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2) + "\n");

  const breakdown = Array.from(perTenant.entries()).map(([s, n]) => `${s}=${n}`).join(" ") || "none";
  console.log(`✅ Inserted ${inserted} NEW telegram messages (${breakdown}); ${msgs.length - inserted} already present.\n`);
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
