// Manual Bitrix24 → Twenty mirror run (Task C).
//
// DRY-RUN BY DEFAULT — nothing is written to Twenty or to
// twenty_mirror_state until --commit is passed. A dry run still reads both
// sides and prints the full counts (what WOULD be created/updated/dropped),
// so it is the safe first step of the cutover.
//
// Usage (from platform/):
//   npx tsx scripts/run-twenty-mirror.ts --tenant take-auto
//   npx tsx scripts/run-twenty-mirror.ts --tenant take-auto --commit
//   npx tsx scripts/run-twenty-mirror.ts --tenant take-auto --commit --entities contacts,leads --max 500
//   npx tsx scripts/run-twenty-mirror.ts --tenant take-auto --since 2026-08-01
//   npx tsx scripts/run-twenty-mirror.ts --tenant take-auto --reconcile   (counts report only)
//
// --tenant accepts the tenant slug or the tenant UUID.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { eq, or } from "drizzle-orm";
import {
  DEFAULT_MIRROR_CUTOFF,
  mirrorBitrixToTwenty,
  MIRROR_ENTITIES,
  type MirrorEntity,
} from "@/platform/integrations/twenty/mirror";
import { reconcileCounts } from "@/platform/integrations/twenty/reconcile";

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  // SALES-ONLY mirror (owner 2026-08-11). The Bitrix→Twenty mirror is a
  // temporary bridge for the SALES team (take-auto) only. RENTAL brands
  // (cardiwan/easyrent/etm) run on the clean CallGear feed — mirroring them
  // re-creates the junk we purged, so a committed run against a rental brand is
  // refused unless --force. Dry runs and take-auto are always allowed.
  const RENTAL_BRANDS = new Set(["cardiwan", "easyrent", "etm"]);
  const tenantRef = argValue("tenant");
  if (
    (hasFlag("commit") || hasFlag("reconcile")) &&
    RENTAL_BRANDS.has((tenantRef ?? "").toLowerCase()) &&
    !hasFlag("force")
  ) {
    console.error(
      `The Bitrix→Twenty mirror is retired for RENTAL brands (${[...RENTAL_BRANDS].join("/")}) — ` +
        "they run on the clean CallGear feed and re-mirroring re-pushes junk.\n" +
        "Sales (take-auto) is allowed. Use --force only if you really mean to mirror a rental brand.",
    );
    process.exit(1);
  }

  if (!tenantRef) {
    console.error("usage: run-twenty-mirror.ts --tenant <slug|uuid> [--commit] [--since ISO] [--entities a,b,c] [--max N] [--reconcile]");
    process.exit(1);
  }

  const [t] = await db
    .select({ id: tenant.id, slug: tenant.slug })
    .from(tenant)
    .where(
      // slug always matches; id only when it parses as uuid — otherwise the
      // uuid cast kills the query before slug gets a chance (audit finding).
      tenantRef.match(/^[0-9a-f-]{36}$/i)
        ? or(eq(tenant.slug, tenantRef), eq(tenant.id, tenantRef))
        : eq(tenant.slug, tenantRef)
    )
    .limit(1);
  if (!t) {
    console.error(`tenant not found: ${tenantRef}`);
    process.exit(1);
  }

  const sinceArg = argValue("since");
  const since = sinceArg ? new Date(sinceArg) : DEFAULT_MIRROR_CUTOFF;
  if (Number.isNaN(since.getTime())) {
    console.error(`invalid --since date: ${sinceArg}`);
    process.exit(1);
  }

  const entitiesArg = argValue("entities");
  const entities = entitiesArg
    ? (entitiesArg.split(",").map((s) => s.trim()) as MirrorEntity[]).filter((e) =>
        (MIRROR_ENTITIES as readonly string[]).includes(e)
      )
    : undefined;
  if (entitiesArg && (!entities || entities.length === 0)) {
    console.error(`invalid --entities: ${entitiesArg} (allowed: ${MIRROR_ENTITIES.join(",")})`);
    process.exit(1);
  }

  const maxArg = argValue("max");
  const maxRecords = maxArg ? Number(maxArg) : undefined;
  if (maxArg && (!Number.isFinite(maxRecords) || (maxRecords as number) <= 0)) {
    console.error(`invalid --max: ${maxArg}`);
    process.exit(1);
  }

  if (hasFlag("reconcile")) {
    const lines = await reconcileCounts(db, t.id, { since });
    console.log(JSON.stringify({ tenant: t.slug, since: since.toISOString(), lines }, null, 2));
    return;
  }

  const commit = hasFlag("commit");
  console.log(
    `[twenty-mirror] tenant=${t.slug} mode=${commit ? "COMMIT" : "DRY-RUN"} since=${since.toISOString()}` +
      (entities ? ` entities=${entities.join(",")}` : "") +
      (maxRecords ? ` max=${maxRecords}` : "")
  );
  const report = await mirrorBitrixToTwenty(db, t.id, {
    since,
    entities,
    maxRecords,
    dryRun: !commit,
  });
  console.log(JSON.stringify(report, null, 2));
  if (!commit) {
    console.log("[twenty-mirror] dry run — re-run with --commit to write");
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
