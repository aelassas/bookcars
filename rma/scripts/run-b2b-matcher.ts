// B2B supply/demand matcher runner (nohup/pm2-friendly CLI, same shape as
// run-stage-progression.ts / run-deal-broadcast.ts).
//
// RENTAL BOARD ONLY — cardiwan/easyrent/etm by default. Tails the GROUP
// streams (WhatsApp @g.us + Telegram) for operator supply/demand, files
// offers into b2b_offer (24h TTL), cards demand posts into the rental
// workspace, and DMs the manager a hint when an open deal's car is short in
// our fleet but fresh supply exists in a group. All logic lives in
// src/platform/ai/b2b-matcher.ts; this file is only wiring.
//
// DRY-RUN BY DEFAULT — zero writes (no offers, no cards, no hints, no
// checkpoint) until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-b2b-matcher.ts                          # poll forever, dry-run
//   npx tsx scripts/run-b2b-matcher.ts --once                   # single dry-run pass
//   npx tsx scripts/run-b2b-matcher.ts --once --commit          # single LIVE pass
//   npx tsx scripts/run-b2b-matcher.ts --tenant cardiwan --once # one tenant only
//   npx tsx scripts/run-b2b-matcher.ts --since 2026-08-01 --once # backfill window
//
// Env:
//   B2B_MATCHER_POLL_MS    poll interval, default 120000
//   B2B_MATCHER_BATCH      threads per tenant per pass, default 50
//   B2B_MATCHER_ROWS       raw group rows read per pass, default 500
//   B2B_MATCHER_KEYS       hint-dedupe sidecar, default scripts/.b2b-matcher-keys.json
//   MANAGER_PHONE_TAIL9    manager phone tail, default 581417020 (Ayham)
//   TELEGRAM_OTP_BOT_TOKEN required for --commit (staff bot; sendMessage only)
//   DATABASE_URL, TWENTY_RENTAL_BASE_URL, TWENTY_RENTAL_API_KEY as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { dirname, resolve } from "path";
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
  createFileSentKeys,
  resolveTelegramChatIdByPhoneTail,
  sendTelegramDm,
} from "@/platform/notify/manager-events";
import {
  createDrizzleB2bMatcherSource,
  runB2bMatcherPass,
} from "@/platform/ai/b2b-matcher";

/** Rental board only — the B2B streams live in the rental groups. */
const RENTAL_SLUGS = ["cardiwan", "easyrent", "etm"];

const SCRIPTS_DIR = dirname(import.meta.filename);
const KEYS_PATH =
  process.env.B2B_MATCHER_KEYS?.trim() || resolve(SCRIPTS_DIR, ".b2b-matcher-keys.json");
const MANAGER_TAIL = process.env.MANAGER_PHONE_TAIL9?.trim() || "581417020"; // Ayham

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

const POLL_MS = envInt("B2B_MATCHER_POLL_MS", 120_000);
const BATCH = envInt("B2B_MATCHER_BATCH", 50);
const ROWS = envInt("B2B_MATCHER_ROWS", 500);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = flagValues("tenant");
const sinceRaw = flagValues("since")[0];
const SINCE = sinceRaw ? new Date(sinceRaw) : undefined;
if (sinceRaw && Number.isNaN(SINCE!.getTime())) {
  console.error(`[b2b-matcher] --since '${sinceRaw}' is not a parseable date`);
  process.exit(1);
}

async function main() {
  console.log(
    `[b2b-matcher] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE}` +
      (SINCE ? ` since=${SINCE.toISOString()}` : "")
  );

  if (COMMIT && !process.env.TELEGRAM_OTP_BOT_TOKEN?.trim()) {
    console.error("[b2b-matcher] TELEGRAM_OTP_BOT_TOKEN is not set — cannot send hints. Exiting.");
    process.exit(1);
  }

  const hintKeys = createFileSentKeys(KEYS_PATH);

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[b2b-matcher] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
    const targets = requestedSlugs.length > 0
      ? tenants.filter((t) => requestedSlugs.includes(t.slug))
      : tenants.filter((t) => RENTAL_SLUGS.includes(t.slug));

    // The manager's DM target, re-resolved every pass: the moment he links
    // the bot, hints start landing (same convention as manager-notify).
    const managerChatId = await resolveTelegramChatIdByPhoneTail(db, MANAGER_TAIL);
    const sendHint = async (text: string): Promise<void> => {
      if (!managerChatId) {
        // Unlinked manager: THROW so the pass counts the hint failed and
        // does NOT mark its dedupe key — it retries next pass until he
        // links, rather than being marked-sent into the void.
        throw new Error(`manager …${MANAGER_TAIL} not linked — hint not deliverable: ${text.slice(0, 80)}`);
      }
      await sendTelegramDm(managerChatId, text);
    };

    for (const t of targets) {
      if (stopping) break;
      try {
        const key = twentyInstanceForTenantSlug(t.slug);
        if (!resolveTwentyInstance(key).configured) {
          console.warn(`[b2b-matcher] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        const complete = await createLocalCompleter(t.id);
        if (!complete) {
          console.warn(`[b2b-matcher] ${t.slug}: no local AI provider configured — skipped`);
          continue;
        }
        const brandLine = brandLineForTenantSlug(t.slug);
        const counts = await runB2bMatcherPass(
          {
            client: getTwentyClientForInstance(key),
            instance: key,
            tenantSlug: t.slug,
            brandLine,
            source: createDrizzleB2bMatcherSource(db, t.id, brandLine),
            complete,
            hintKeys,
            sendHint,
          },
          { commit: COMMIT, since: SINCE, batch: BATCH, rowLimit: ROWS, logger: (line) => console.log(line) }
        );
        if (counts.threads > 0 || ONCE) {
          console.log(`[b2b-matcher] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        console.error(
          `[b2b-matcher] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
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
