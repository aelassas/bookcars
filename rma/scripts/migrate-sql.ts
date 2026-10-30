// Reliable replacement for `drizzle-kit migrate` (broken on the prod box:
// missing snapshot files + stale __drizzle_migrations state make drizzle-kit
// die). Applies drizzle/*.sql in filename order, tracked in our own
// platform_migrations journal — drizzle-kit's meta/ and __drizzle_migrations
// are ignored entirely.
//
// Usage:
//   tsx scripts/migrate-sql.ts              apply pending files, then FORCE RLS
//   tsx scripts/migrate-sql.ts --status     print applied vs pending, change nothing
//   tsx scripts/migrate-sql.ts --baseline   mark ALL current files applied WITHOUT
//                                           executing them (first run on a DB that
//                                           already has the schema)
//
// Safety: if platform_migrations is empty but the DB already has a `tenant`
// table, a plain apply would re-run 0000..NNNN against a live schema — we
// refuse and tell the operator to run --baseline first.
//
// Each file runs in its own transaction (file SQL + journal INSERT commit
// together). Files are executed as one batch; drizzle's
// `--> statement-breakpoint` markers are honored when present. First failure
// rolls back that file and exits 1 — nothing is skipped over.
//
// After a successful apply this spawns scripts/run-tighten-rls.ts (FORCE RLS),
// same as the old `npm run migrate` chain — so package.json only needs to call
// this script, and --status/--baseline never touch RLS.

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool, type PoolClient } from "pg";
import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { spawnSync } from "child_process";

const scriptsDir = dirname(import.meta.filename);
const drizzleDir = resolve(scriptsDir, "..", "drizzle");

// Journal name for the driver bot's schema, which lives outside drizzle/.
// Resolved relative to drizzleDir so applyFile's join() reaches it.
const DRIVER_BOT_SCHEMA = "../driver-bot/schema.sql";
const driverBotSchema = resolve(drizzleDir, DRIVER_BOT_SCHEMA);

const args = process.argv.slice(2);
const isBaseline = args.includes("--baseline");
const isStatus = args.includes("--status");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const BREAKPOINT = "--> statement-breakpoint";

/**
 * Every migration this repo ships, in apply order: the generated/hand-written
 * chain in `drizzle/`, then the hand-written ones in `drizzle/autonomous/`.
 *
 * The subdirectory is not optional extra credit — it creates board_item,
 * wa_outbox, booking, price_tier and the funnel/KPI tables, i.e. the WhatsApp
 * board and the reply pipeline. It was invisible to this runner until
 * 2026-07-25, so a database built purely from `npm run migrate` (CI, or a
 * restore following the recovery runbook) came up missing them, and the app
 * only appeared healthy because production had them applied by hand.
 *
 * Journal names keep the `autonomous/` prefix so the two sets can never
 * collide on a shared number — both directories have an 0003.
 */
function listMigrationFiles(): string[] {
  const root = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const autonomousDir = join(drizzleDir, "autonomous");
  const autonomous = existsSync(autonomousDir)
    ? readdirSync(autonomousDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => `autonomous/${f}`)
    : [];

  // The driver bot's tables sit between the two sets: autonomous/0008 and
  // autonomous/0010 ALTER driver_assignment, and drizzle/0045 references it,
  // so its schema has to exist by then. Its own header says "do not
  // auto-apply" — that predates this runner, when there was no safe way to.
  // It is plain CREATE ... IF NOT EXISTS and it is part of the application's
  // schema, so leaving it out is what actually caused trouble.
  const driverSchema = existsSync(driverBotSchema) ? [DRIVER_BOT_SCHEMA] : [];

  // drizzle/0075 alters wa_outbox, so its table must exist before that file.
  const waOutbox = autonomous.filter((f) => f === "autonomous/0007_wa_outbox.sql");

  return [
    ...root.filter((f) => f < "0075_wa_reactions.sql"),
    ...waOutbox,
    ...root.filter((f) => f >= "0075_wa_reactions.sql"),
    ...driverSchema,
    ...autonomous.filter((f) => f !== "autonomous/0007_wa_outbox.sql"),
  ];
}

function splitStatements(sql: string): string[] {
  if (!sql.includes(BREAKPOINT)) return [sql];
  return sql
    .split(BREAKPOINT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function applyFile(client: PoolClient, name: string): Promise<void> {
  const sql = readFileSync(join(drizzleDir, name), "utf-8");
  const statements = splitStatements(sql);
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("INSERT INTO platform_migrations (name) VALUES ($1)", [name]);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

function runTightenRls(): void {
  const tightenPath = join(scriptsDir, "run-tighten-rls.ts");
  const result = spawnSync("npx", ["tsx", tightenPath], {
    stdio: "inherit",
    cwd: resolve(scriptsDir, ".."),
  });
  if (result.status !== 0) {
    console.error("[migrate-sql] run-tighten-rls.ts failed (migrations themselves are committed).");
    process.exit(1);
  }
}

async function main() {
  const files = listMigrationFiles();
  if (files.length === 0) {
    console.error(`[migrate-sql] No .sql files found in ${drizzleDir}`);
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS platform_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz DEFAULT now()
      )`
    );

    const { rows } = await client.query<{ name: string }>(
      "SELECT name FROM platform_migrations ORDER BY name"
    );
    const applied = new Set(rows.map((r) => r.name));
    const pending = files.filter((f) => !applied.has(f));

    if (isStatus) {
      console.log(`[migrate-sql] Applied (${applied.size}):`);
      for (const f of files.filter((f) => applied.has(f))) console.log(`  ✓ ${f}`);
      console.log(`[migrate-sql] Pending (${pending.length}):`);
      for (const f of pending) console.log(`  … ${f}`);
      return;
    }

    if (isBaseline) {
      if (pending.length === 0) {
        console.log("[migrate-sql] Baseline: nothing to mark — all files already recorded.");
        return;
      }
      await client.query("BEGIN");
      for (const f of pending) {
        await client.query(
          "INSERT INTO platform_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
          [f]
        );
      }
      await client.query("COMMIT");
      console.log(`[migrate-sql] Baseline: marked ${pending.length} file(s) as applied WITHOUT executing:`);
      for (const f of pending) console.log(`  ✓ ${f}`);
      return;
    }

    // Safety: empty journal + existing schema means this DB predates
    // platform_migrations. Running every file from 0000 against a live
    // schema is exactly the drizzle-kit disaster we are replacing.
    if (applied.size === 0) {
      const { rows: reg } = await client.query<{ exists: string | null }>(
        "SELECT to_regclass('public.tenant') AS exists"
      );
      if (reg[0]?.exists) {
        console.error(
          "[migrate-sql] REFUSING to apply: platform_migrations is empty but this DB already has a `tenant` table —\n" +
            "it was migrated before this journal existed. Run once first:\n\n" +
            "  npx tsx scripts/migrate-sql.ts --baseline\n\n" +
            "to mark the current files as applied, then re-run the migrate."
        );
        process.exit(1);
      }
    }

    if (pending.length === 0) {
      console.log(`[migrate-sql] Up to date — ${applied.size} migration(s) applied, nothing pending.`);
    } else {
      for (const f of pending) {
        try {
          await applyFile(client, f);
          console.log(`[migrate-sql] ✓ ${f}`);
        } catch (e) {
          console.error(`[migrate-sql] ✗ ${f} failed — rolled back, stopping.`);
          console.error(e instanceof Error ? e.message : e);
          process.exit(1);
        }
      }
      console.log(`[migrate-sql] Applied ${pending.length} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }

  // FORCE RLS — same post-step the old `npm run migrate` chain had.
  runTightenRls();
}

main().catch((e) => {
  console.error("[migrate-sql] Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
