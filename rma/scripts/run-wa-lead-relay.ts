// WhatsApp/Telegram lead relay runner (nohup/pm2-friendly CLI, same shape as
// run-stage-progression.ts).
//
// Polls the `message` table for inbound WhatsApp/Telegram activity (GROUPS
// INCLUDED — Dubizzle/Meta leads and Yango bookings land in group chats) and
// runs the lead pass (src/platform/integrations/twenty/wa-lead-relay.ts)
// against each tenant's OWN Twenty deployment (sales :3001 / rental :3002 —
// routing comes from twentyInstanceForTenantSlug, never a shared client). All
// decision logic lives in the module; this file is only wiring: env, the
// per-tenant loop, and signal handling.
//
// DRY-RUN BY DEFAULT — nothing is written to Twenty and the checkpoint does
// not move until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-wa-lead-relay.ts                          # poll forever, dry-run
//   npx tsx scripts/run-wa-lead-relay.ts --once                   # single dry-run pass
//   npx tsx scripts/run-wa-lead-relay.ts --once --commit          # single LIVE pass
//   npx tsx scripts/run-wa-lead-relay.ts --tenant cardiwan --once # one tenant only
//   npx tsx scripts/run-wa-lead-relay.ts --since 2026-08-01 --once # backfill window
//
// Env:
//   WA_LEAD_RELAY_POLL_MS   poll interval, default 120000
//   WA_LEAD_RELAY_BATCH     threads per tenant per pass, default 50
//   WA_LEAD_RELAY_ROWS      raw message rows read per pass, default 500
//   WA_SALES_GIRL_ROUTING=off  kill-switch: NEW sales cards fall back to the
//                              line owner instead of the girls' round-robin
//                              (the attach pings are unaffected)
//   DATABASE_URL, TWENTY_BASE_URL, TWENTY_API_KEY, TWENTY_RENTAL_* as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "@/platform/integrations/twenty/instance";
import { brandLineForTenantSlug } from "@/platform/integrations/twenty/mirror";
import {
  resolveOwnerForLine,
  SALES_CLOSERS,
  SALES_CLOSER_IDS,
  SALES_PRIMARY_POOL,
} from "@/modules/board/owners";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import {
  resolveTelegramChatIdByPhoneTail,
  sendTelegramDm,
} from "@/platform/notify/manager-events";
import {
  createTwentyRelay,
  discoverOpportunityFields,
  type RelayTwenty,
} from "@/platform/integrations/callgear/twenty-relay";
import { matchMemberForAgent, type MemberRef } from "@/platform/integrations/callgear/agent-name";
import { createLocalCompleter, createDeepseekCompleter } from "@/platform/ai/resolver";
import { createLeadNumberSource } from "@/platform/integrations/twenty/lead-number";
import {
  createDrizzleWaLeadSource,
  createRentalDistributionStore,
  createSalesDeskRoutingStore,
  runWaLeadRelayPass,
  type RentalDeskRouting,
  type SalesDeskRouting,
} from "@/platform/integrations/twenty/wa-lead-relay";
import { loadRentalDistributorConfig, applyPhoneOverrides, type RentalRotationKey, type RotationAgent } from "@/modules/rental/rotation";
import { loadAvailabilityMap, loadPhoneOverrides } from "@/modules/availability/store";
import { enqueueDistributorWhatsApp, tenantIdForSlug } from "@/modules/rental/outbox";
import { tenantSlugForLine } from "@/modules/messaging/lines";

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

/**
 * WA line slug → the agent who runs that line (Ayham 2026-08-17: every card
 * needs "agent name who got the lead"). Names resolve to workspace members via
 * matchMemberForAgent — ambiguity yields an unowned card, never a guess.
 * `cardiwan` is deliberately absent: Ali AND Abdullah both work that line.
 * Override/extend with WA_LINE_OWNERS="slug:Name,slug2:Name2".
 */
/**
 * Line -> the agent whose name goes on the card.
 *
 * This used to be a hardcoded list right here, and it had drifted: Abdullah's
 * `cardiwan` line was absent entirely, so every lead he took was created
 * UNOWNED, and `babek-rent-2` — Ali's handset since the 2026-08-29 re-pairing —
 * still said "Babek", putting Ali's leads on Babek's name. Ayham, 2026-08-31:
 * "brand and agent to be mentioned in all leads (taken by whom)".
 *
 * modules/board/owners.ts is the map that is actually maintained (it decides
 * whose board a card lands on and who gets the SLA nudge), so the relay reads
 * that instead of keeping a second copy to fall out of date. WA_LINE_OWNERS
 * stays as a per-deploy override.
 */
function lineOwnerName(lineSlug: string): string | null {
  for (const pair of (process.env.WA_LINE_OWNERS ?? "").split(",")) {
    const [slug, name] = pair.split(":").map((s) => s.trim());
    if (slug === lineSlug && name) return name;
  }
  return resolveOwnerForLine(lineSlug)?.name ?? null;
}

const POLL_MS = envInt("WA_LEAD_RELAY_POLL_MS", 120_000);
const BATCH = envInt("WA_LEAD_RELAY_BATCH", 50);
const ROWS = envInt("WA_LEAD_RELAY_ROWS", 500);
// Recency floor every pass re-reads (see `passSince`) and the slow deep sweep
// behind it. Tunable without a deploy: this is the lead latency, and the owner
// is the one who gets to say what is fast enough for a sales floor.
const LOOKBACK_MIN = envInt("WA_LEAD_RELAY_LOOKBACK_MIN", 5);
const SWEEP_MIN = envInt("WA_LEAD_RELAY_SWEEP_MIN", 10);
const SWEEP_HOURS = envInt("WA_LEAD_RELAY_SWEEP_HOURS", 6);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");

// Every conversation opened on a PUBLIC main line (etm-website, cardiwan)
// becomes a lead, whatever the customer typed — Ayham's ask of 2026-09-28,
// relayed by the owner. Those two numbers are the ones on the websites and in
// the paid ads, so a bare "Hi" or an untouched Instagram ad template is still
// somebody who came to rent. Default ON; MAINLINE_QUALIFY_ALL=off restores the
// qualifier's verdict on those lines too.
const MAINLINE_QUALIFY_ALL = process.env.MAINLINE_QUALIFY_ALL?.trim().toLowerCase() !== "off";
const requestedSlugs = flagValues("tenant");
const sinceRaw = flagValues("since")[0];
const SINCE = sinceRaw ? new Date(sinceRaw) : undefined;
if (sinceRaw && Number.isNaN(SINCE!.getTime())) {
  console.error(`[wa-lead-relay] --since '${sinceRaw}' is not a parseable date`);
  process.exit(1);
}

async function main() {
  console.log(
    `[wa-lead-relay] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} batch=${BATCH} once=${ONCE}` +
      (SINCE ? ` since=${SINCE.toISOString()} — BACKFILL: distribution OFF (attach/ingest only, agents NOT paged)` : "")
  );

  // DeepSeek second opinion (option B): a global fallback keyed off
  // DEEPSEEK_API_KEY, not per-tenant ai_provider_config. Resolved once per
  // process — the relay is spawned fresh each pass, so env is always current.
  const completeDeepseek = createDeepseekCompleter();
  if (!completeDeepseek) {
    console.warn(`[wa-lead-relay] no DEEPSEEK_API_KEY — no second opinion; local judge is final`);
  }

  // Field discovery happens ONCE per instance, not per pass: the metadata
  // crawl is paginated and rate-limited, and the workspace schema does not
  // change between polls. If it does, restart.
  const routed = new Map<
    TwentyInstanceKey,
    {
      twenty: RelayTwenty;
      opportunityFields: ReadonlySet<string>;
      ownerIdForLine?: (lineSlug: string) => string | null;
      salesDesk?: SalesDeskRouting;
      rentalDesk?: RentalDeskRouting;
    }
  >();
  // One counter per DEPLOYMENT: a lead carded on the sales board must not
  // consume a number the rental board never shows (Ayham's 1…8, then 11).
  const leadNumberFor = (() => {
    const cache = new Map<TwentyInstanceKey, ReturnType<typeof createLeadNumberSource>>();
    return (key: TwentyInstanceKey) => {
      let src = cache.get(key);
      if (!src) { src = createLeadNumberSource(db, key); cache.set(key, src); }
      return src;
    };
  })();

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[wa-lead-relay] ${signal} received — finishing current pass`);
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
          console.warn(`[wa-lead-relay] ${t.slug}: instance '${key}' has no API key — skipped`);
          continue;
        }
        let route = routed.get(key);
        if (!route) {
          const client = getTwentyClientForInstance(key);
          // Member directory once per instance (the callgear-relay pattern):
          // line slug → agent name → member id. Failure degrades to unowned
          // cards, never a crash.
          let ownerIdForLine: ((lineSlug: string) => string | null) | undefined;
          let salesDesk: SalesDeskRouting | undefined;
          let rentalDesk: RentalDeskRouting | undefined;
          try {
            const members: MemberRef[] = [];
            for await (const m of client.listAll<Record<string, unknown>>("workspaceMembers")) {
              const id = typeof m.id === "string" ? m.id : null;
              const name = (m.name ?? {}) as { firstName?: unknown; lastName?: unknown };
              const firstName = typeof name.firstName === "string" ? name.firstName : "";
              const lastName = typeof name.lastName === "string" ? name.lastName : "";
              if (id && firstName) members.push({ id, firstName, lastName });
            }
            ownerIdForLine = (lineSlug: string) => {
              const agent = lineOwnerName(lineSlug);
              return agent ? matchMemberForAgent(agent, members) : null;
            };
            console.log(`[wa-lead-relay] instance '${key}': ${members.length} workspace members for line-owner routing`);

            // Sales desk (SALES instance only, 2026-09 leasing restructure):
            // NEW cards round-robin between the primary-processing girls, and
            // a closer gets a Telegram DM when his client writes on his card.
            // The cursor + ping throttle live on ONE twenty_mirror_state row
            // bound to the canonical sales tenant, so every sales-bound
            // tenant rotates the SAME pool (a cursor per tenant would hand
            // one girl two leads in a row across lines).
            // WA_SALES_GIRL_ROUTING=off empties the pool — the pass then
            // falls back to line-owner behaviour (pings unaffected).
            if (key === "default") {
              const canonical = [...tenants]
                .filter((x) => twentyInstanceForTenantSlug(x.slug) === "default")
                .sort((a, b) => a.slug.localeCompare(b.slug))[0];
              const routingOff = process.env.WA_SALES_GIRL_ROUTING?.trim() === "off";
              if (routingOff) {
                console.log(`[wa-lead-relay] WA_SALES_GIRL_ROUTING=off — NEW sales cards keep line owners`);
              }
              const pool = routingOff
                ? []
                : SALES_PRIMARY_POOL.filter((g) => members.some((m) => m.id === g.id)).map((g) => g.id);
              for (const g of SALES_PRIMARY_POOL) {
                if (!routingOff && !pool.includes(g.id)) {
                  console.warn(
                    `[wa-lead-relay] sales girl ${g.name} (${g.id}) is not a sales workspace member — excluded from the rotation`
                  );
                }
              }
              if (!canonical) {
                console.warn(`[wa-lead-relay] no sales tenant found — sales desk routing disabled`);
              } else if (pool.length === 0 && !routingOff) {
                console.warn(`[wa-lead-relay] sales girl pool resolved EMPTY — cards keep line owners (never a guess)`);
              }
              if (canonical) {
                salesDesk = {
                  girlPool: pool,
                  pingableOwnerIds: SALES_CLOSER_IDS,
                  ...createSalesDeskRoutingStore(db, canonical.id),
                  cardBaseUrl: process.env.TWENTY_SALES_URL?.trim() || "https://app.takeauto.tech",
                  // Same mechanism as the sales-automations stack: phone tail9
                  // → telegram_link → staff-bot DM. An owner with no linked
                  // chat resolves to false and the pass logs + skips.
                  sendOwnerPing: async (ownerId, text) => {
                    const closer = SALES_CLOSERS.find((c) => c.id === ownerId);
                    const digits = closer ? normalizePhone(closer.phone) : "";
                    if (digits.length < MIN_PHONE_MATCH_DIGITS) return false;
                    const chatId = await resolveTelegramChatIdByPhoneTail(
                      db,
                      digits.slice(-MIN_PHONE_MATCH_DIGITS)
                    ).catch(() => null);
                    if (!chatId) return false;
                    await sendTelegramDm(chatId, text);
                    return true;
                  },
                };
              }
            }

            // Rental main-line distribution (RENTAL instance only, Ayham
            // 2026-09): NEW cards on the main lines (etm-website / cardiwan)
            // rotate over the AVAILABLE agents of the brand's roster
            // (RENTAL_ROTATION_*), the customer gets one auto-reply, agent +
            // manager get WhatsApp pings from the main line, and the sweeper
            // (run-rental-distributor.ts) enforces the acceptance window.
            // Cursors / auto-reply marks / assignments live on ONE
            // twenty_mirror_state row bound to the canonical rental tenant —
            // every rental-bound tenant rotates the SAME roster.
            // RENTAL_DISTRIBUTOR=off wires NOTHING — the pass then keeps
            // today's fixed line-owner behaviour, byte-identical.
            if (key === "rental") {
              const cfg = loadRentalDistributorConfig(process.env);
              const canonicalRental = [...tenants]
                .filter((x) => twentyInstanceForTenantSlug(x.slug) === "rental")
                .sort((a, b) => a.slug.localeCompare(b.slug))[0];
              if (!cfg.enabled) {
                console.log(`[wa-lead-relay] RENTAL_DISTRIBUTOR=off — main-line cards keep line owners`);
              } else if (!canonicalRental) {
                console.warn(`[wa-lead-relay] no rental tenant found — rental distribution disabled`);
              } else {
                for (const d of cfg.dropped) {
                  console.warn(`[wa-lead-relay] roster entry dropped as malformed: "${d}" (expected Name:9715…)`);
                }
                // Roster names → rental workspaceMember ids via
                // matchMemberForAgent; an unresolvable name is dropped LOUD,
                // never guessed (the owner-resolution rule). The DB phone
                // override (agent_availability.phone, 0077) wins over the env
                // roster phone — this process is spawned per pass, so a
                // manager's /availability edit applies within one beat.
                const phoneOverrides = await loadPhoneOverrides(db).catch((e) => {
                  console.warn(`[wa-lead-relay] phone overrides load failed (env phones in use): ${(e as Error).message.slice(0, 120)}`);
                  return {} as Record<string, string>;
                });
                const rosters = {
                  etm: applyPhoneOverrides(cfg.rosters.etm, phoneOverrides).map((a) => ({ ...a, memberId: matchMemberForAgent(a.name, members) })),
                  cardiwan: applyPhoneOverrides(cfg.rosters.cardiwan, phoneOverrides).map((a) => ({ ...a, memberId: matchMemberForAgent(a.name, members) })),
                };
                for (const brand of ["etm", "cardiwan"] as RentalRotationKey[]) {
                  for (const a of rosters[brand]) {
                    if (!a.memberId) {
                      console.warn(`[wa-lead-relay] rental ${brand} agent "${a.name}" is not a workspace member — excluded from the rotation`);
                    }
                  }
                  rosters[brand] = rosters[brand].filter((a) => a.memberId !== null);
                  if (cfg.rosters[brand].length > 0 && rosters[brand].length === 0) {
                    console.warn(`[wa-lead-relay] rental rotation '${brand}' resolved EMPTY — main-line leads keep line owners (never a guess)`);
                  }
                }
                // Returning-customer preferences (Ayham, 2026-09-24): names
                // resolve against the RESOLVED roster (member ids + phone
                // overrides already applied); an unknown name is dropped LOUD,
                // never guessed — the same discipline as the roster itself.
                const returningPreferred: Record<RentalRotationKey, RotationAgent[]> = { etm: [], cardiwan: [] };
                for (const brand of ["etm", "cardiwan"] as RentalRotationKey[]) {
                  for (const name of cfg.returningPreferred[brand]) {
                    const found = rosters[brand].find(
                      (a) => a.name.trim().toLowerCase() === name.trim().toLowerCase()
                    );
                    if (found) returningPreferred[brand].push(found);
                    else
                      console.warn(
                        `[wa-lead-relay] RENTAL_RETURNING_PREFERRED_${brand.toUpperCase()} entry "${name}" ` +
                          `is not in the resolved ${brand} rotation — dropped`
                      );
                  }
                }
                const store = createRentalDistributionStore(db, canonicalRental.id);
                // The sender line's tenant scopes the outbox row (RLS);
                // resolved once per line per process.
                const lineTenantIds = new Map<string, string | null>();
                rentalDesk = {
                  rosterFor: (brand) => rosters[brand],
                  managerMemberIdFor: (brand) => {
                    const name = cfg.managerNames[brand];
                    return name ? matchMemberForAgent(name, members) : null;
                  },
                  managerPhoneFor: (brand) => cfg.managerPhones[brand],
                  managerNameFor: (brand) => cfg.managerNames[brand],
                  autoReplyText: cfg.autoReplyText,
                  autoReplyEnabled: cfg.autoReplyEnabled,
                  notifyLine: cfg.notifyLine,
                  texts: cfg.texts,
                  acceptWindowMs: cfg.acceptWindowMs,
                  returningPreferredFor: (brand) => returningPreferred[brand],
                  returningGapMs: cfg.returningGapMs,
                  returningAutoReplyEnabled: cfg.returningAutoReplyEnabled,
                  ...store,
                  loadAvailability: () => loadAvailabilityMap(db),
                  sendWhatsApp: async (input) => {
                    const slug = tenantSlugForLine(input.line);
                    if (!lineTenantIds.has(input.line)) {
                      lineTenantIds.set(input.line, await tenantIdForSlug(slug, db));
                    }
                    const tenantId = lineTenantIds.get(input.line);
                    if (!tenantId) {
                      console.error(`[wa-lead-relay] tenant "${slug}" (line ${input.line}) not found — notification dropped`);
                      return false;
                    }
                    return enqueueDistributorWhatsApp({ ...input, tenantId });
                  },
                };
                console.log(
                  `[wa-lead-relay] rental distribution ON — etm: ${rosters.etm.map((a) => a.name).join(",") || "(empty)"} · cardiwan: ${rosters.cardiwan.map((a) => a.name).join(",") || "(empty)"}` +
                    ` · returning preferred — etm: ${returningPreferred.etm.map((a) => a.name).join(",") || "(none)"} · cardiwan: ${returningPreferred.cardiwan.map((a) => a.name).join(",") || "(none)"}`
                );
              }
            }
          } catch (err) {
            console.warn(
              `[wa-lead-relay] instance '${key}' member lookup failed — cards will be unowned: ${err instanceof Error ? err.message : String(err)}`
            );
          }
          route = {
            twenty: createTwentyRelay(client),
            opportunityFields: await discoverOpportunityFields(client),
            ownerIdForLine,
            salesDesk,
            rentalDesk,
          };
          routed.set(key, route);
        }
        // No local model configured → the deterministic bar still runs; the
        // threads it rejects count as noise instead of getting an AI verdict.
        const complete = await createLocalCompleter(t.id);
        if (!complete) {
          console.warn(`[wa-lead-relay] ${t.slug}: no local AI provider — deterministic bar only`);
        }
        const counts = await runWaLeadRelayPass(
          {
            client: getTwentyClientForInstance(key),
            twenty: route.twenty,
            instance: key,
            tenantSlug: t.slug,
            brandLine: brandLineForTenantSlug(t.slug),
            opportunityFields: route.opportunityFields,
            source: createDrizzleWaLeadSource(db, t.id),
            complete,
            completeDeepseek,
            nextLeadNumber: leadNumberFor(key),
            ownerIdForLine: route.ownerIdForLine,
            mainLineQualifyAll: MAINLINE_QUALIFY_ALL,
            // A --since backfill re-reads history to ATTACH messages and
            // restitch identities — it must NEVER page agents. On 2026-09-28 a
            // wide `--since 2026-09-26` catch-up re-distributed ~47 old,
            // already-contacted leads to everyone (Ayham). Distribution is the
            // job of the live minute-beat (no --since), which only ever sees
            // fresh messages. So a backfill wires the desks OFF: cards still
            // get created/attached, nobody gets pinged.
            salesDesk: SINCE ? undefined : route.salesDesk,
            rentalDesk: SINCE ? undefined : route.rentalDesk,
          },
          {
            commit: COMMIT,
            since: SINCE,
            batch: BATCH,
            rowLimit: ROWS,
            minLookbackMs: LOOKBACK_MIN * 60_000,
            sweepEveryMs: SWEEP_MIN * 60_000,
            sweepLookbackMs: SWEEP_HOURS * 3600_000,
            logger: (line) => console.log(line),
          }
        );
        if (counts.threads > 0 || ONCE) {
          console.log(`[wa-lead-relay] ${t.slug}: ${JSON.stringify(counts)}`);
        }
      } catch (err) {
        // A pass-level failure (DB down, Twenty down, model endpoint down)
        // must not kill the loop — the next poll retries. Per-thread failures
        // are counted inside the pass.
        console.error(
          `[wa-lead-relay] ${t.slug} pass failed: ${err instanceof Error ? err.message : String(err)}`
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
