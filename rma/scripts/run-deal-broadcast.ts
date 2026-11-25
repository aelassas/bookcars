// Deal-broadcast runner (nohup/pm2-friendly CLI, same shape as
// run-stage-progression.ts / run-wa-lead-relay.ts).
//
// RENTAL BOARD ONLY — cardiwan/easyrent/etm by default (sales has no delivery
// flow). Polls each rental tenant's conversations for CONFIRMED + documented
// deals and runs the broadcast pass (src/platform/ai/deal-confirmation.ts):
// Telegram card to the Deliveries Control Group, Twenty protocol (note +
// fill-the-blanks + stageEvents idempotency marker with fromStage = toStage —
// NO stage move, managers drag cards themselves, owner 2026-08-13), and
// Babek's Google Sheet. All decision logic lives in the module;
// this file is only wiring: env, the per-tenant loop, and signal handling.
//
// DRY-RUN BY DEFAULT — nothing is posted, written or appended, and the
// checkpoint does not move, until --commit is passed. Dry-run prints the FULL
// card text per deal and the missing-list for skipped ones.
//
// Usage (from platform/):
//   npx tsx scripts/run-deal-broadcast.ts                          # poll forever, dry-run
//   npx tsx scripts/run-deal-broadcast.ts --once                   # single dry-run pass
//   npx tsx scripts/run-deal-broadcast.ts --once --commit          # single LIVE pass
//   npx tsx scripts/run-deal-broadcast.ts --tenant cardiwan --once # one tenant only
//   npx tsx scripts/run-deal-broadcast.ts --since 2026-08-01 --once # backfill window
//
// Env:
//   DEAL_BROADCAST_POLL_MS   poll interval, default 120000
//   DEAL_BROADCAST_BATCH     deals per tenant per pass, default 25
//   DEAL_BROADCAST_ROWS      raw message rows read per pass, default 500
//   DEAL_BROADCAST_CHAT_ID   Telegram group, default -1002858056428
//   TELEGRAM_BOT_TOKEN       required for --commit (driver-bot's token)
//   GOOGLE_SA_CLIENT_EMAIL + GOOGLE_SA_PRIVATE_KEY or GOOGLE_SA_KEY_FILE
//                            optional — without them the sheet is skipped
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
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import { discoverOpportunityFields } from "@/platform/integrations/callgear/twenty-relay";
import { getAIProviderForTenant } from "@/platform/ai";
import {
  createFileSentKeys,
  resolveTelegramChatIdByPhoneTail,
  sendTelegramDm,
} from "@/platform/notify/manager-events";
import {
  BABEK_SHEET_ID,
  appendSheetRow,
  loadServiceAccount,
} from "@/platform/integrations/gsheets/writer";
import {
  createDrizzleDealBroadcastSource,
  runDealBroadcastPass,
} from "@/platform/ai/deal-confirmation";

/** The team's Deliveries Control Group. */
const CHAT_ID = process.env.DEAL_BROADCAST_CHAT_ID?.trim() || "-1002858056428";

/** Rental board only — the sales desk has no delivery flow. */
const RENTAL_SLUGS = ["cardiwan", "easyrent", "etm"];

// Rail-failure nudges DM the manager (Core Job 1) — same resolution as
// manager-notify (telegram_link by phone tail9).
const MANAGER_TAIL = process.env.MANAGER_PHONE_TAIL9?.trim() || "581417020"; // Ayham
const NUDGE_KEYS_PATH =
  process.env.DEAL_BROADCAST_NUDGE_KEYS?.trim() ||
  resolve(dirname(import.meta.filename), ".deal-broadcast-nudge-keys.json");

// The sheet's E/C column convention (import-babek-fleet.ts companyFor): E* =
// ETM (trading as EasyRent), C* = Cardiwan.
const BRAND_DISPLAY: Record<string, string> = { cardiwan: "Cardiwan", easyrent: "EasyRent", etm: "EasyRent" };
const BRAND_KEY: Record<string, string> = { cardiwan: "C", easyrent: "E", etm: "E" };

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

const POLL_MS = envInt("DEAL_BROADCAST_POLL_MS", 120_000);
const BATCH = envInt("DEAL_BROADCAST_BATCH", 25);
const ROWS = envInt("DEAL_BROADCAST_ROWS", 500);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");
const requestedSlugs = flagValues("tenant");
const sinceRaw = flagValues("since")[0];
const SINCE = sinceRaw ? new Date(sinceRaw) : undefined;
if (sinceRaw && Number.isNaN(SINCE!.getTime())) {
  console.error(`[deal-broadcast] --since '${sinceRaw}' is not a parseable date`);
  process.exit(1);
}

/**
 * Post the card to the Deliveries Control Group. Plain Bot API (fetch,
 * bounded) — sendMessage ONLY, never getUpdates: the driver-bot owns polling
 * on this token. Resolves the message_id for the Twenty protocol note.
 */
async function sendDealCard(text: string): Promise<string> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}: ${body.slice(0, 300)}`);
  const data = JSON.parse(body) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!data.ok) throw new Error(`Telegram ok=false: ${data.description ?? "unknown"}`);
  return String(data.result?.message_id ?? "");
}

/** completeJson capability check — the heuristic provider has none. */
type JsonCompleter = (system: string, user: string) => Promise<string>;

async function main() {
  console.log(
    `[deal-broadcast] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE}` +
      (SINCE ? ` since=${SINCE.toISOString()}` : "")
  );

  if (COMMIT && !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    // Fail loudly at boot, not after the first deal is halfway written.
    console.error("[deal-broadcast] TELEGRAM_BOT_TOKEN is not set — cannot broadcast. Exiting.");
    process.exit(1);
  }

  // The sheet is a follower, never a gate: no SA creds → every row is
  // "skipped" and the broadcast proceeds (spec: log and continue).
  const sa = loadServiceAccount();
  if (!sa) console.log("[deal-broadcast] no Google SA creds — sheet rows will be skipped");
  const sheet = {
    append: async (row: string[]): Promise<"ok" | "skipped"> => {
      if (!sa) return "skipped";
      await appendSheetRow(sa, BABEK_SHEET_ID, row);
      return "ok";
    },
  };

  // Nudge dedupe sidecar + the manager DM (shared sender, §3). The chat is
  // re-resolved every pass — the moment Ayham links the bot, nudges land.
  const nudgeKeys = createFileSentKeys(NUDGE_KEYS_PATH);
  const managerDm = {
    resolveChatId: () => resolveTelegramChatIdByPhoneTail(db, MANAGER_TAIL),
    send: (chatId: string, text: string) => sendTelegramDm(chatId, text),
  };

  // Field discovery ONCE per instance (rental for every tenant here), not per
  // pass — the metadata crawl is paginated and rate-limited.
  const fieldsByInstance = new Map<TwentyInstanceKey, ReadonlySet<string>>();

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[deal-broadcast] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
    const targets = requestedSlugs.length > 0
      ? tenants.filter((t) => requestedSlugs.includes(t.slug))
      : tenants.filter((t) => RENTAL_SLUGS.includes(t.slug));

    for (const t of targets) {
      if (stopping) break;
      try {
        const key = twentyInstanceForTenantSlug(t.slug);
        if (!resolveTwentyInstance(key).configured) {
          console.warn(`[deal-broadcast] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        let fields = fieldsByInstance.get(key);
        if (!fields) {
          fields = await discoverOpportunityFields(getTwentyClientForInstance(key));
          fieldsByInstance.set(key, fields);
        }
        // One strict-JSON completion per deal. getAIProviderForTenant's
        // interface has no completeJson — only the local provider implements
        // it, so a heuristic fallback tenant gets no analysis (its deals sit
        // until a real provider is configured, never a guessed broadcast).
        const provider = await getAIProviderForTenant(t.id);
        const maybe = provider as unknown as { completeJson?: unknown };
        const complete: JsonCompleter | null =
          typeof maybe.completeJson === "function"
            ? (system, user) => (maybe.completeJson as JsonCompleter).call(provider, system, user)
            : null;
        if (!complete) {
          console.warn(`[deal-broadcast] ${t.slug}: provider '${provider.name}' has no completeJson — skipped`);
          continue;
        }
        const brandLine = brandLineForTenantSlug(t.slug);
        const counts = await runDealBroadcastPass(
          {
            client: getTwentyClientForInstance(key),
            instance: key,
            tenantSlug: t.slug,
            brandLine,
            brandDisplay: BRAND_DISPLAY[t.slug] ?? t.slug,
            brandKey: BRAND_KEY[t.slug] ?? "C",
            opportunityFields: fields,
            source: createDrizzleDealBroadcastSource(db, t.id, brandLine),
            complete,
            telegram: { send: sendDealCard },
            sheet,
            managerDm,
            nudgeKeys,
          },
          { commit: COMMIT, since: SINCE, batch: BATCH, rowLimit: ROWS, logger: (line) => console.log(line) }
        );
        if (counts.threads > 0 || ONCE) {
          console.log(`[deal-broadcast] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        // A pass-level failure (DB down, Twenty down, model endpoint down)
        // must not kill the loop — the next poll retries. Per-deal failures
        // are counted inside the pass.
        console.error(
          `[deal-broadcast] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
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
