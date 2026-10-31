/**
 * observe.mjs — WhatsApp line observer for RMA CRM.
 *
 * One process per line slug: `node observe.mjs <slug>`.
 * Runs under systemd as wa@<slug>.service with WorkingDirectory =
 * WA_OBSERVER_DIR (/opt/rma-crm/wa-observer on the box).
 *
 * Honors the /lines page contract (src/modules/lines/registry.ts,
 * app/(hub)/lines/api/[slug]/{qr,relink}/route.ts):
 *   qr-<slug>.txt              pairing QR payload (deleted on success)
 *   pair-code-<slug>.txt       8-char pair code, code mode (deleted on success)
 *   status-<slug>.json         {state: "qr"|"open"|"close"|"dormant", at: ISO}
 *   observed-<slug>.jsonl      one JSON line per message (drives "silent" badge
 *                              and feeds scripts/importers/import-observer-messages.ts)
 *   session-<slug>/creds.json  Baileys multi-file auth state
 *   connect-fails-<slug>.json  {count: N} — 2-strike lockout counter
 *   pair-request-<slug>.json   written by relink-web.sh: {mode, phone?} for the
 *                              NEXT boot; consumed and deleted at startup
 *
 * Ban protection: on any abnormal disconnect the process exits non-zero and
 * systemd's RestartSec=300 holds the restart for 5 minutes. On loggedOut the
 * counter goes up; at 2 strikes the line goes dormant and stays down
 * (exit 0, Restart=on-failure) until a human relinks from /lines.
 *
 * v1 scope: text + placeholders for media ([image]/[voice]/[document]) — no
 * media download, no wa_identity DB writes, no outbound sends. The importer
 * already upgrades placeholder rows when a later transcript exists.
 */
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { existsSync, readFileSync, writeFileSync, appendFileSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";

const SLUG = process.argv[2];
if (!SLUG || !/^[a-z0-9][a-z0-9-]*$/.test(SLUG)) {
  console.error("usage: node observe.mjs <slug>");
  process.exit(2);
}

const DIR = path.resolve(process.env.WA_OBSERVER_DIR ?? process.cwd());
const SESSION_DIR = path.join(DIR, `session-${SLUG}`);
const QR_FILE = path.join(DIR, `qr-${SLUG}.txt`);
const PAIR_CODE_FILE = path.join(DIR, `pair-code-${SLUG}.txt`);
const STATUS_FILE = path.join(DIR, `status-${SLUG}.json`);
const OBSERVED_FILE = path.join(DIR, `observed-${SLUG}.jsonl`);
const FAILS_FILE = path.join(DIR, `connect-fails-${SLUG}.json`);
const PAIR_REQUEST_FILE = path.join(DIR, `pair-request-${SLUG}.json`);

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });
const log = (msg) => console.log(`[wa-${SLUG}] ${new Date().toISOString()} ${msg}`);

function writeStatus(state) {
  writeFileSync(STATUS_FILE, JSON.stringify({ state, at: new Date().toISOString() }));
}

function readFails() {
  try {
    return Number(JSON.parse(readFileSync(FAILS_FILE, "utf8"))?.count ?? 0) || 0;
  } catch {
    return 0;
  }
}

function writeFails(count) {
  writeFileSync(FAILS_FILE, JSON.stringify({ count }));
}

function readPairRequest() {
  try {
    const r = JSON.parse(readFileSync(PAIR_REQUEST_FILE, "utf8"));
    rmSync(PAIR_REQUEST_FILE, { force: true });
    return r && (r.mode === "qr" || r.mode === "code") ? r : { mode: "qr" };
  } catch {
    return { mode: "qr" };
  }
}

/** Pull displayable text out of a Baileys message; media becomes a
 *  placeholder the importer can upgrade once a transcript exists. */
function extractText(msg) {
  const m = msg.message ?? {};
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  const captioned =
    m.imageMessage ?? m.videoMessage ?? m.documentMessage ?? null;
  if (captioned?.caption) return captioned.caption;
  if (m.imageMessage) return "[image]";
  if (m.videoMessage) return "[video]";
  if (m.audioMessage) return m.audioMessage.ptt ? "[voice]" : "[voice/audio]";
  if (m.documentMessage) return "[document]";
  if (m.stickerMessage) return "[sticker]";
  if (m.locationMessage || m.liveLocationMessage) return "[location]";
  if (m.contactMessage || m.contactsArrayMessage) return "[contact]";
  return null;
}

function recordMessage(msg) {
  const key = msg.key ?? {};
  const jid = key.remoteJid ?? "";
  if (!jid || jid === "status@broadcast" || jid.endsWith("@newsletter")) return;
  const text = extractText(msg);
  if (!text) return;
  const fromMe = Boolean(key.fromMe);
  // Plain phone JID exposes digits directly; @lid DMs and group participants
  // expose them via senderPn / participantPn when WhatsApp chooses to.
  const senderPhone =
    key.senderPn?.split("@")[0] ??
    key.participantPn?.split("@")[0] ??
    (jid.endsWith("@s.whatsapp.net") ? jid.split("@")[0] : null);
  const row = {
    ts: new Date(Number(msg.messageTimestamp ?? 0) * 1000 || Date.now()).toISOString(),
    brand: SLUG,
    from: jid,
    direction: fromMe ? "outbound" : "inbound",
    senderPhone,
    pushName: msg.pushName ?? null,
    text,
  };
  appendFileSync(OBSERVED_FILE, JSON.stringify(row) + "\n");
}

async function main() {
  mkdirSync(SESSION_DIR, { recursive: true });
  const pairRequest = readPairRequest();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: ["RMA CRM", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  let pairCodeRequested = false;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (pairRequest.mode === "code" && pairRequest.phone && !pairCodeRequested) {
        pairCodeRequested = true;
        try {
          const code = await sock.requestPairingCode(pairRequest.phone);
          writeFileSync(PAIR_CODE_FILE, String(code).trim());
          writeStatus("qr");
          log(`pair code issued for +${pairRequest.phone}`);
        } catch (e) {
          log(`requestPairingCode failed: ${e?.message ?? e} — falling back to QR file`);
          writeFileSync(QR_FILE, qr);
          writeStatus("qr");
        }
      } else {
        writeFileSync(QR_FILE, qr);
        writeStatus("qr");
        log("QR payload written — waiting for scan");
      }
      return;
    }

    if (connection === "open") {
      rmSync(QR_FILE, { force: true });
      rmSync(PAIR_CODE_FILE, { force: true });
      writeFails(0);
      writeStatus("open");
      const me = state.creds.me?.id ?? "unknown";
      log(`connected as ${me}`);
      return;
    }

    if (connection === "close") {
      // A QR from a dead socket scans as "expired" — remove it so the Pair
      // modal shows its waiting state until the relink/restart cycle mints a
      // fresh one (the Pair button IS the relink trigger).
      rmSync(QR_FILE, { force: true });
      rmSync(PAIR_CODE_FILE, { force: true });
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      if (loggedOut) {
        const fails = readFails() + 1;
        writeFails(fails);
        if (fails >= 2) {
          writeStatus("dormant");
          log(`logged out, strike ${fails}/2 — going dormant until relink from /lines`);
          process.exit(0); // clean exit: Restart=on-failure keeps the line down
        }
        writeStatus("close");
        log(`logged out, strike ${fails}/2 — systemd restarts in 5 min for a fresh QR`);
      } else {
        writeStatus("close");
        log(`connection closed (status ${statusCode ?? "?"}) — systemd restarts in 5 min`);
      }
      process.exit(1);
    }
  });

  sock.ev.on("messages.upsert", ({ type, messages }) => {
    // "append" is history sync — importing it would storm the jsonl with old
    // chats on first pairing. Live traffic only.
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        recordMessage(msg);
      } catch (e) {
        log(`recordMessage failed: ${e?.message ?? e}`);
      }
    }
  });
}

main().catch((e) => {
  log(`fatal: ${e?.message ?? e}`);
  try {
    writeStatus("close");
  } catch {
    /* status file is best-effort */
  }
  process.exit(1);
});
