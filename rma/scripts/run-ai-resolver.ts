// AI resolver runner (nohup/pm2-friendly CLI, same shape as
// run-callgear-twenty-relay.ts).
//
// Polls the CRM for new/newly-active deals per tenant and runs the local-AI
// enrichment pass (src/platform/ai/resolver.ts) against each tenant's OWN
// Twenty deployment (sales :3001 / rental :3002 — routing comes from
// twentyInstanceForTenantSlug, never a shared client). All decision logic
// lives in the resolver; this file is only wiring: env, the per-tenant loop,
// and signal handling.
//
// DRY-RUN BY DEFAULT — nothing is written to Twenty and the checkpoint does
// not move until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-ai-resolver.ts                     # poll forever, dry-run
//   npx tsx scripts/run-ai-resolver.ts --once              # single dry-run pass
//   npx tsx scripts/run-ai-resolver.ts --once --commit     # single LIVE pass
//   npx tsx scripts/run-ai-resolver.ts cardiwan --commit   # one tenant only
//
// Env:
//   AI_RESOLVER_POLL_MS   poll interval, default 60000
//   AI_RESOLVER_BATCH     cases per tenant per pass, default 25
//   DATABASE_URL, TWENTY_BASE_URL, TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import {
  getTwentyClientForInstance,
} from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import {
  createDrizzleResolverSource,
  createLocalCompleter,
  runResolverPass,
} from "@/platform/ai/resolver";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("AI_RESOLVER_POLL_MS", 60_000);
const BATCH = envInt("AI_RESOLVER_BATCH", 25);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = process.argv.slice(2).filter((a) => !a.startsWith("-"));

async function main() {
  console.log(
    `[ai-resolver] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE}`
  );

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[ai-resolver] ${signal} received — finishing current pass`);
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
          console.warn(`[ai-resolver] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        // No local model configured → no pass. Never a hardcoded endpoint.
        const complete = await createLocalCompleter(t.id);
        if (!complete) {
          console.warn(`[ai-resolver] ${t.slug}: no local AI provider configured — skipped`);
          continue;
        }
        const counts = await runResolverPass(
          {
            client: getTwentyClientForInstance(key),
            source: createDrizzleResolverSource(db, t.id),
            complete,
            brandLine: brandLineForTenantSlug(t.slug),
          },
          { batch: BATCH, dryRun: !COMMIT }
        );
        if (counts.scanned > 0 || ONCE) {
          console.log(`[ai-resolver] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        // A pass-level failure (DB down, Twenty down, model endpoint down)
        // must not kill the loop — the next poll retries. Per-case failures
        // are settled inside the pass.
        console.error(
          `[ai-resolver] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
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
