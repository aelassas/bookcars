// Stage progression runner (nohup/pm2-friendly CLI, same shape as
// run-ai-resolver.ts).
//
// Polls the CRM for leads with fresh conversation (WhatsApp + call summaries)
// and runs the local-AI stage pass (src/platform/ai/stage-progression.ts)
// against each tenant's OWN Twenty deployment (sales :3001 / rental :3002 —
// routing comes from twentyInstanceForTenantSlug, never a shared client). All
// decision logic lives in the module; this file is only wiring: env, the
// per-tenant loop, and signal handling.
//
// DRY-RUN BY DEFAULT — nothing is written to Twenty and the checkpoint does
// not move until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-stage-progression.ts                          # poll forever, dry-run
//   npx tsx scripts/run-stage-progression.ts --once                   # single dry-run pass
//   npx tsx scripts/run-stage-progression.ts --once --commit          # single LIVE pass
//   npx tsx scripts/run-stage-progression.ts --tenant cardiwan --once # one tenant only
//   npx tsx scripts/run-stage-progression.ts --since 2026-08-01 --once # backfill window
//
// Env:
//   STAGE_PROGRESSION_POLL_MS   poll interval, default 60000
//   STAGE_PROGRESSION_BATCH     threads per tenant per pass, default 25
//   DATABASE_URL, TWENTY_BASE_URL, TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import { createLocalCompleter } from "@/platform/ai/resolver";
import {
  createDrizzleStageProgressionSource,
  runStageProgressionPass,
} from "@/platform/ai/stage-progression";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** `--flag value` reader (repeatable flags join on commas). */
function flagValues(name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) {
      out.push(...process.argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return out;
}

const POLL_MS = envInt("STAGE_PROGRESSION_POLL_MS", 60_000);
const BATCH = envInt("STAGE_PROGRESSION_BATCH", 25);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = flagValues("tenant");
const sinceRaw = flagValues("since")[0];
const SINCE = sinceRaw ? new Date(sinceRaw) : undefined;
if (sinceRaw && Number.isNaN(SINCE!.getTime())) {
  console.error(`[stage-progression] --since '${sinceRaw}' is not a parseable date`);
  process.exit(1);
}

async function main() {
  console.log(
    `[stage-progression] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE}` +
      (SINCE ? ` since=${SINCE.toISOString()}` : "")
  );

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[stage-progression] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    // Tenants re-read every pass: a new brand must not need a restart, and a
    // tenant whose Twenty instance is unconfigured must say so per pass.
    const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
    const targets = requestedSlugs.length > 0 ? tenants.filter((t) => requestedSlugs.includes(t.slug)) : tenants;

    for (const t of targets) {
      if (stopping) break;
      try {
        const key = twentyInstanceForTenantSlug(t.slug);
        // An unconfigured instance must SAY so — falling back to the other
        // deployment's key would write one brand's records into the other's
        // workspace (the leak the two-deployment split exists to prevent).
        if (!resolveTwentyInstance(key).configured) {
          console.warn(`[stage-progression] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        // No local model configured → no pass. Never a hardcoded endpoint.
        const complete = await createLocalCompleter(t.id);
        if (!complete) {
          console.warn(`[stage-progression] ${t.slug}: no local AI provider configured — skipped`);
          continue;
        }
        const counts = await runStageProgressionPass(
          {
            client: getTwentyClientForInstance(key),
            instance: key,
            source: createDrizzleStageProgressionSource(db, t.id),
            complete,
            brandLine: brandLineForTenantSlug(t.slug),
          },
          { commit: COMMIT, since: SINCE, batch: BATCH, logger: (line) => console.log(line) }
        );
        if (counts.threads > 0 || ONCE) {
          console.log(`[stage-progression] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        // A pass-level failure (DB down, Twenty down, model endpoint down)
        // must not kill the loop — the next poll retries. Per-lead failures
        // are settled inside the pass.
        console.error(
          `[stage-progression] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    if (ONCE) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
