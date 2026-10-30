// Read-only health check: do staff actually see real, recent, enriched leads
// in Twenty right now? Reports per instance — total live opportunities, how
// many arrived in the last 24h/7d (is the clean feeder actually feeding?), how
// many carry a name / a phone / a real stage (enriched vs thin), and the most
// recent few. No writes.
//
//   npx tsx scripts/twenty-health.ts

import { getTwentyClientForInstance } from "../src/platform/integrations/twenty/client";
import type { TwentyInstanceKey } from "../src/platform/integrations/twenty/instance";

const INSTANCES: TwentyInstanceKey[] = ["default", "rental"];
const now = Date.now();
const DAY = 24 * 3600 * 1000;

interface Opp {
  id?: string;
  name?: string;
  stage?: string;
  createdAt?: string;
  externalSource?: string;
  brandLine?: string;
  deletedAt?: string | null;
  phoneTail9?: string;
  pointOfContactId?: string | null;
}

function ageDays(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (now - t) / DAY : null;
}

async function checkInstance(key: TwentyInstanceKey) {
  let client;
  try {
    client = getTwentyClientForInstance(key);
  } catch (e) {
    console.log(`\n[${key}] not configured — skipped (${e instanceof Error ? e.message : e})`);
    return;
  }
  if (client.mode !== "live") {
    console.log(`\n[${key}] Twenty client not live — skipped.`);
    return;
  }

  let live = 0,
    last24h = 0,
    last7d = 0,
    withName = 0,
    withPhone = 0,
    withContact = 0;
  const bySource: Record<string, number> = {};
  const byStage: Record<string, number> = {};
  const recent: { name: string; stage: string; age: string; src: string }[] = [];

  for await (const o of client.listAll<Opp>("opportunities")) {
    if (o.deletedAt) continue;
    live++;
    const age = ageDays(o.createdAt);
    if (age !== null && age <= 1) last24h++;
    if (age !== null && age <= 7) last7d++;
    const nm = (o.name ?? "").trim();
    // A phone-fallback name ("+…123456789" or "BX-…") is NOT a real name.
    if (nm && !/^\+…|^BX-/.test(nm)) withName++;
    if (o.phoneTail9) withPhone++;
    if (o.pointOfContactId) withContact++;
    bySource[o.externalSource ?? "(none)"] = (bySource[o.externalSource ?? "(none)"] ?? 0) + 1;
    byStage[o.stage ?? "(none)"] = (byStage[o.stage ?? "(none)"] ?? 0) + 1;
    if (age !== null && age <= 7) {
      recent.push({
        name: nm || "(no name)",
        stage: o.stage ?? "-",
        age: age < 1 ? `${Math.round(age * 24)}h` : `${Math.round(age)}d`,
        src: o.externalSource ?? "-",
      });
    }
  }

  console.log(`\n=== [${key}] ${key === "default" ? "SALES (take-auto)" : "RENTAL (cardiwan/easyrent — Babek)"} ===`);
  console.log(`  live opportunities: ${live}`);
  console.log(`  arrived  last 24h: ${last24h} · last 7d: ${last7d}   <- is a real lead flow reaching staff?`);
  console.log(`  enriched: name ${pct(withName, live)} · phone ${pct(withPhone, live)} · linked contact ${pct(withContact, live)}`);
  console.log(`  by source: ${Object.entries(bySource).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  console.log(`  by stage:  ${Object.entries(byStage).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}`);
  recent.sort((a, b) => parseFloat(a.age) - parseFloat(b.age));
  console.log(`  most recent (<=7d):`);
  for (const r of recent.slice(0, 6)) console.log(`     ${r.age.padStart(4)}  [${r.stage}]  ${r.name}  (${r.src})`);
  if (recent.length === 0) console.log(`     — nothing in the last 7 days —`);
}

function pct(n: number, total: number): string {
  return total ? `${n}/${total} (${Math.round((100 * n) / total)}%)` : "0/0";
}

async function main() {
  console.log("Twenty lead-visibility health check (read-only)");
  for (const key of INSTANCES) await checkInstance(key);
}

main().catch((e) => {
  console.error("health check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
