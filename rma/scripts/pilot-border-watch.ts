/**
 * Pilot GPS → Oman-border approach watch (5-minute pm2 cron, 2026-08-29).
 *
 * For every Pilot vehicle with a fresh fix (<15 min old), checks whether it
 * is inside one of the UAE→Oman approach zones (circles around the real
 * crossing posts, coordinates verified 2026-08-29):
 *   - Hatta / Al Wajajah   24.7956N 56.1158E   (dubaivisitsvisa.com)
 *   - Khatam Al Shukla     24.2114N 55.9537E   (thedesertdiva.com)
 *   - Mezyad–Hafeet        24.0223N 55.8472E   (thedesertdiva.com)
 *
 * On ENTERING a zone (state transition only — per-vehicle state lives in
 * scripts/.pilot-border-state.json) it:
 *   1. posts a Telegram alert to the rental ops group (Deliveries Control
 *      Group, same bot token + chat as run-deal-broadcast.ts), and
 *   2. writes a note on the Twenty RENTAL vehicle card (noteTargets
 *      targetVehicleId).
 * Leaving a zone just clears the state, quietly. Every check is one log line.
 *
 * DRY-RUN BY DEFAULT; --commit to send/write. In dry-run NOTHING is written
 * (no state file either), so transitions re-report on every dry pass.
 *
 * Forced-path test: `--test-zone <lat>,<lon>,<rkm>[,<name>]` adds a temporary
 * zone (e.g. around a car's current position) without touching the real list.
 *
 * Env: same as pilot-live-location.ts (PILOT_API_EMAIL/PILOT_API_PASSWORD,
 * TWENTY_RENTAL_BASE_URL/TWENTY_RENTAL_API_KEY) plus TELEGRAM_BOT_TOKEN and
 * BORDER_WATCH_CHAT_ID (default: DEAL_BROADCAST_CHAT_ID, then the hardcoded
 * Deliveries Control Group id).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const COMMIT = process.argv.includes("--commit");
const PILOT_BASE = process.env.PILOT_API_BASE ?? "https://pilot-gps.com/api/api.php";
const SCRIPTS_DIR = dirname(import.meta.filename);
const STATE_PATH =
  process.env.BORDER_WATCH_STATE?.trim() || resolve(SCRIPTS_DIR, ".pilot-border-state.json");
const FRESH_MS = 15 * 60 * 1000;

function envFromFile(key: string): string {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim().replace(/^"|"$/g, "") : "";
}
const env = (k: string): string => process.env[k]?.trim() || envFromFile(k);

const PILOT_USER = env("PILOT_API_EMAIL");
const PILOT_PASS = env("PILOT_API_PASSWORD");
const T_BASE = (env("TWENTY_RENTAL_BASE_URL") || "http://localhost:3002").replace(/\/$/, "");
const T_KEY = env("TWENTY_RENTAL_API_KEY");
const TG_TOKEN = env("TELEGRAM_BOT_TOKEN");
const TG_CHAT =
  env("BORDER_WATCH_CHAT_ID") || env("DEAL_BROADCAST_CHAT_ID") || "-1002858056428";
if (!PILOT_USER || !PILOT_PASS || !T_KEY) throw new Error("missing PILOT_API_* or TWENTY_RENTAL_API_KEY");

type Zone = { id: string; name: string; lat: number; lon: number; radiusKm: number };

const ZONES: Zone[] = [
  { id: "hatta", name: "Hatta / Al Wajajah", lat: 24.7956, lon: 56.1158, radiusKm: 15 },
  { id: "khatam-al-shukla", name: "Khatam Al Shukla (Al Ain)", lat: 24.2114, lon: 55.9537, radiusKm: 15 },
  { id: "mezyad-hafeet", name: "Mezyad–Hafeet (Al Ain)", lat: 24.0223, lon: 55.8472, radiusKm: 15 },
];

// --test-zone 25.19,55.27,5,TEST — forced alert-path verification, then drop the flag.
const tzRaw = process.argv[process.argv.indexOf("--test-zone") + 1];
if (process.argv.includes("--test-zone") && tzRaw) {
  const [lat, lon, r, name] = tzRaw.split(",");
  ZONES.push({ id: "test", name: name?.trim() || "TEST ZONE", lat: Number(lat), lon: Number(lon), radiusKm: Number(r) || 5 });
}

type PilotStatus = {
  agentid: number;
  status?: { active: number; lat?: string; lon?: string; unixtimestamp?: string; speed?: number };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pilot(cmd: string): Promise<{ code: number; msg: string; [k: string]: unknown }> {
  const res = await fetch(`${PILOT_BASE}?${cmd}`, {
    headers: { Authorization: "Basic " + Buffer.from(`${PILOT_USER}:${PILOT_PASS}`).toString("base64") },
    signal: AbortSignal.timeout(60_000),
  });
  return (await res.json()) as { code: number; msg: string };
}

async function tRest(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${T_BASE}/rest${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${T_KEY}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`twenty ${path} → ${res.status}: ${(await res.text()).slice(0, 150)}`);
  return res.json();
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function zoneAt(lat: number, lon: number): Zone | null {
  for (const z of ZONES) {
    if (haversineKm(lat, lon, z.lat, z.lon) <= z.radiusKm) return z;
  }
  return null;
}

/** Same Bot-API-over-fetch pattern as run-deal-broadcast.ts (sendMessage ONLY). */
async function sendTelegram(text: string): Promise<void> {
  if (!TG_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT, text, disable_web_page_preview: false }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) throw new Error(`Telegram: ${body.description ?? res.status}`);
}

async function writeTwentyNote(vehicleId: string, title: string, markdown: string): Promise<void> {
  const created = (await tRest("/notes", {
    method: "POST",
    body: JSON.stringify({ title, bodyV2: { markdown, blocknote: null } }),
  })) as { data?: { createNote?: { id?: string }; notes?: { id?: string } } };
  const noteId = created.data?.createNote?.id ?? created.data?.notes?.id;
  if (!noteId) throw new Error("note created without id");
  await tRest("/noteTargets", {
    method: "POST",
    body: JSON.stringify({ noteId, targetVehicleId: vehicleId }),
  });
}

function gstTime(): string {
  return new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
}

async function main() {
  console.log(`[pilot-border-watch] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} ${new Date().toISOString()} zones=${ZONES.map((z) => z.id).join(",")}`);

  const state: Record<string, string | null> = existsSync(STATE_PATH)
    ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
    : {};

  const list = (await pilot("cmd=list")) as { list?: { veh_id: number; vehiclenumber?: string }[] };
  const ids = (list.list ?? []).map((v) => v.veh_id);
  if (ids.length === 0) throw new Error("pilot returned no vehicles");
  const nameById = new Map((list.list ?? []).map((v) => [v.veh_id, (v.vehiclenumber ?? "").trim()]));

  const statuses: PilotStatus[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const r = (await pilot(`cmd=status&agents=${ids.slice(i, i + 40).join(",")}`)) as { data?: PilotStatus[] };
    if (r.data) statuses.push(...r.data);
    await sleep(300);
  }

  // Twenty RENTAL vehicles: externalId pilot:<agentid> → {id, name}
  const twenty = new Map<string, { id: string; name: string }>();
  let cursor: string | null = null;
  do {
    const page = (await tRest(`/vehicles?limit=200${cursor ? `&ending_before=${cursor}` : ""}`)) as {
      data: { vehicles: { id: string; externalId?: string | null; name?: string | null }[] };
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
    for (const v of page.data.vehicles) {
      if (v.externalId) twenty.set(v.externalId, { id: v.id, name: (v.name ?? "").trim() });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  let checked = 0, stale = 0, inside = 0, entered = 0, alerted = 0, failed = 0;
  const now = Date.now();
  for (const s of statuses) {
    const st = s.status;
    const key = String(s.agentid);
    if (!st || !st.active || !st.lat || !st.lon) { stale++; continue; }
    const fixTs = Number(st.unixtimestamp ?? 0) * 1000;
    if (!fixTs || now - fixTs > FRESH_MS) { stale++; continue; }
    checked++;

    const lat = Number(st.lat);
    const lon = Number(st.lon);
    const zone = zoneAt(lat, lon);
    const prev = state[key] ?? null;

    if (!zone) {
      if (prev) { state[key] = null; console.log(` ${nameById.get(s.agentid) ?? key}: left ${prev}`); }
      continue;
    }
    inside++;
    if (prev === zone.id) continue; // already inside — no re-alert
    entered++;

    const rawName = twenty.get(`pilot:${s.agentid}`)?.name || nameById.get(s.agentid) || `#${s.agentid}`;
    const [plate, ...rest] = rawName.split(/\s+/);
    const model = rest.join(" ") || "vehicle";
    const speed = Math.round(st.speed ?? 0);
    const maps = `https://www.google.com/maps?q=${lat},${lon}`;
    const line = `⚠️ ${plate} (${model}) approaching Oman border near ${zone.name} — ${gstTime()} GST, speed ${speed} km/h`;
    console.log(` ENTER ${rawName} → ${zone.id} (${lat},${lon}) ${speed} km/h`);

    if (COMMIT) {
      try {
        await sendTelegram(`${line}\n📍 ${maps}`);
        const rec = twenty.get(`pilot:${s.agentid}`);
        if (rec) {
          await writeTwentyNote(rec.id, `⚠️ Oman border approach — ${plate}`, `${line}\n\n📍 ${maps}`);
        } else {
          console.log(` (no Twenty vehicle for pilot:${s.agentid} — Telegram only)`);
        }
        alerted++;
        state[key] = zone.id; // mark only after a successful alert so a failure retries
      } catch (e) {
        failed++;
        console.error(` FAIL alert ${rawName}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  if (COMMIT) writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`done: ${checked} fresh-checked, ${stale} stale/inactive, ${inside} inside zone, ${entered} entered, ${alerted} alerted, ${failed} failed`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
