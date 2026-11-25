/**
 * Pilot GPS → Twenty RENTAL live location (5-minute cadence, 2026-08-29).
 *
 * One batched status call to Pilot (all agent ids), then patches ONLY the
 * vehicles whose state actually changed. Writes:
 *   liveLocation  (LINKS)  — clickable Google Maps pin
 *   lastLocationAt (DATE_TIME) — when the tracker last reported
 *   motion        (TEXT)   — "Moving · N km/h" / "Parked" (2026-08-29, owner:
 *                            the vehicle table must show parked/moving at a glance)
 *   lastMovedAt   (DATE_TIME) — last fix with speed > 3 km/h
 *
 * Read-only against Pilot. DRY-RUN BY DEFAULT; --commit to write.
 * Env: same as pilot-fleet-sync.ts.
 */
import { readFileSync } from "node:fs";

const COMMIT = process.argv.includes("--commit");
const PILOT_BASE = process.env.PILOT_API_BASE ?? "https://pilot-gps.com/api/api.php";

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
if (!PILOT_USER || !PILOT_PASS || !T_KEY) throw new Error("missing PILOT_API_* or TWENTY_RENTAL_API_KEY");

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

async function main() {
  console.log(`[pilot-live-location] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} ${new Date().toISOString()}`);

  const list = (await pilot("cmd=list")) as { list?: { veh_id: number }[] };
  const ids = (list.list ?? []).map((v) => v.veh_id);
  if (ids.length === 0) throw new Error("pilot returned no vehicles");

  // Batched status — one call per ~40 agents to keep URLs sane.
  const statuses: PilotStatus[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const r = (await pilot(`cmd=status&agents=${chunk.join(",")}`)) as { data?: PilotStatus[] };
    if (r.data) statuses.push(...r.data);
    await sleep(300);
  }
  console.log(`pilot statuses: ${statuses.length}/${ids.length}`);

  // Twenty side: map externalId → {id, current link, current motion}
  const twenty = new Map<string, { id: string; url: string | null; motion: string | null }>();
  let cursor: string | null = null;
  do {
    const page = (await tRest(`/vehicles?limit=200${cursor ? `&ending_before=${cursor}` : ""}`)) as {
      data: { vehicles: { id: string; externalId?: string | null; liveLocation?: { primaryLinkUrl?: string } | null; motion?: string | null }[] };
      pageInfo: { endCursor: string | null; hasNextPage: boolean };
    };
    for (const v of page.data.vehicles) {
      if (v.externalId) twenty.set(v.externalId, { id: v.id, url: v.liveLocation?.primaryLinkUrl ?? null, motion: v.motion ?? null });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  let updated = 0, skipped = 0, inactive = 0, failed = 0;
  for (const s of statuses) {
    const st = s.status;
    const rec = twenty.get(`pilot:${s.agentid}`);
    if (!rec) { skipped++; continue; } // not mirrored (deleted card etc.)
    if (!st || !st.active || !st.lat || !st.lon) { inactive++; continue; }
    const speed = st.speed ?? 0;
    const motion = speed > 3 ? `Moving · ${speed} km/h` : "Parked";
    const url = `https://www.google.com/maps?q=${st.lat},${st.lon}`;
    if (rec.url === url && rec.motion === motion) { skipped++; continue; } // nothing changed
    const label = `${st.lat}, ${st.lon}${speed ? ` · ${speed} km/h` : ""}`;
    const when = st.unixtimestamp ? new Date(Number(st.unixtimestamp) * 1000).toISOString() : null;
    try {
      if (COMMIT) {
        await tRest(`/vehicles/${rec.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            liveLocation: { primaryLinkUrl: url, primaryLinkLabel: label },
            motion,
            ...(when ? { lastLocationAt: when } : {}),
            ...(speed > 3 && when ? { lastMovedAt: when } : {}),
          }),
        });
        await sleep(100);
      }
      updated++;
    } catch (e) {
      failed++;
      console.error(` FAIL agent ${s.agentid}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`done: ${updated} moved+updated, ${skipped} unchanged, ${inactive} inactive/no-fix, ${failed} failed`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
