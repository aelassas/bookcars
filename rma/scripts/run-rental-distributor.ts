// RENTAL DISTRIBUTOR runner (nohup/pm2-friendly CLI, same shape as
// run-rental-automations.ts / run-sales-automations.ts).
//
// RENTAL instance ONLY (:3002, "rental"). Polls the assignment records the
// wa-lead relay writes for main-line leads (twenty_mirror_state, entity
// rental_distribution) and enforces the acceptance window: reassign to the
// next available agent, mark the previous one ignored, notify the manager on
// every transition. All WhatsApp traffic goes through wa_outbox
// (enqueueDistributorWhatsApp — the main line's own observer bridge drains it,
// with its ban-safety guards). Nothing here talks to Baileys.
//
// DRY-RUN BY DEFAULT — zero Twenty writes, zero outbox rows, and the state
// does not move until --commit is passed.
//
// Usage (from platform/):
//   npx tsx scripts/run-rental-distributor.ts                  # poll forever, dry-run
//   npx tsx scripts/run-rental-distributor.ts --once           # single dry-run pass
//   npx tsx scripts/run-rental-distributor.ts --once --commit  # single LIVE pass
//
// Env (see modules/rental/rotation.ts loadRentalDistributorConfig):
//   RENTAL_DISTRIBUTOR=off        kill-switch — the sweeper exits immediately
//                                 (the relay then never records assignments)
//   RENTAL_ROTATION_ETM / RENTAL_ROTATION_CARDIWAN   "Ali:9715…,Babek:9715…"
//   MANAGER_WA_ETM / MANAGER_WA_CARDIWAN             manager WhatsApp digits
//   RENTAL_MANAGER_ETM / RENTAL_MANAGER_CARDIWAN     manager display name (def. Ayham)
//   RENTAL_ACCEPT_TIMEOUT_MIN     acceptance window, default 10
//   RENTAL_BOT_REPLY_LOOKBACK_MIN first-run lookback for the reply reader
//                                 (agent accept/decline + manager steering),
//                                 default 60 — afterwards the cursor rules
//   RENTAL_BUSY_TTL_MIN           Busy toggle lifetime, default 60
//   RENTAL_AUTOREPLY_TEXT, RENTAL_TEXT_*             message text overrides
//   RENTAL_DISTRIBUTOR_POLL_MS    poll interval, default 60000
//   TWENTY_RENTAL_API_KEY / TWENTY_RENTAL_BASE_URL, DATABASE_URL as usual.
import { config } from "dotenv";
config({ path: ".env.local" });
import { sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
} from "@/platform/integrations/twenty/instance";
import {
  createRentalDistributionStore,
  pruneRentalAssignments,
} from "@/platform/integrations/twenty/wa-lead-relay";
import { discoverOpportunityFields } from "@/platform/integrations/callgear/twenty-relay";
import { matchMemberForAgent, type MemberRef } from "@/platform/integrations/callgear/agent-name";
import { MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";
import { tenantSlugForLine } from "@/modules/messaging/lines";
import { loadRentalDistributorConfig, RENTAL_MAIN_LINES, applyPhoneOverrides, type RentalRotationKey } from "@/modules/rental/rotation";
import { loadAvailabilityMap, loadPhoneOverrides } from "@/modules/availability/store";
import { dedupeUuid, enqueueDistributorWhatsApp, tenantIdForSlug } from "@/modules/rental/outbox";
import { runRentalDistributorPass, type BotReplyRow } from "@/platform/notify/rental-distributor";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const POLL_MS = envInt("RENTAL_DISTRIBUTOR_POLL_MS", 60_000);
const ONCE = process.argv.includes("--once");
const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log(`[rental-distributor] starting mode=${COMMIT ? "COMMIT" : "dry-run"} pollMs=${POLL_MS} once=${ONCE}`);

  const cfg = loadRentalDistributorConfig(process.env);
  if (!cfg.enabled) {
    console.log("[rental-distributor] RENTAL_DISTRIBUTOR=off — kill-switch is on, exiting (line-owner behaviour)");
    return;
  }
  for (const d of cfg.dropped) {
    console.warn(`[rental-distributor] roster entry dropped as malformed: "${d}" (expected Name:9715…)`);
  }

  if (!resolveTwentyInstance("rental").configured) {
    console.error("[rental-distributor] rental instance has no API key — cannot run. Exiting.");
    process.exit(1);
  }
  const client = getTwentyClientForInstance("rental");
  const opportunityFields = await discoverOpportunityFields(client);
  for (const f of ["assignedAt", "acceptedAt", "ignoredCount"]) {
    if (!opportunityFields.has(f)) {
      console.warn(`[rental-distributor] rental workspace has no '${f}' field — stamps for it are silently dropped (Ops creates it via the metadata API)`);
    }
  }

  // The canonical rental tenant binds the shared state row — every
  // rental-bound tenant shares the rotations (the sales-desk precedent).
  const tenants = await db.select({ id: tenant.id, slug: tenant.slug }).from(tenant);
  const canonical = tenants
    .filter((t) => twentyInstanceForTenantSlug(t.slug) === "rental")
    .sort((a, b) => a.slug.localeCompare(b.slug))[0];
  if (!canonical) {
    console.error("[rental-distributor] no rental tenant found — cannot run. Exiting.");
    process.exit(1);
  }
  const store = createRentalDistributionStore(db, canonical.id);

  // Roster names → rental workspaceMember ids (the relay's owner resolution —
  // matchMemberForAgent). An unresolvable name is dropped LOUD, never guessed.
  const members: MemberRef[] = [];
  for await (const m of client.listAll<Record<string, unknown>>("workspaceMembers")) {
    const id = typeof m.id === "string" ? m.id : null;
    const name = (m.name ?? {}) as { firstName?: unknown; lastName?: unknown };
    const firstName = typeof name.firstName === "string" ? name.firstName : "";
    const lastName = typeof name.lastName === "string" ? name.lastName : "";
    if (id && firstName) members.push({ id, firstName, lastName });
  }
  const resolveMember = (name: string | null): string | null =>
    name ? matchMemberForAgent(name, members) : null;

  const rosters = {
    etm: cfg.rosters.etm.map((a) => ({ ...a, memberId: resolveMember(a.name) })),
    cardiwan: cfg.rosters.cardiwan.map((a) => ({ ...a, memberId: resolveMember(a.name) })),
  };
  for (const brand of ["etm", "cardiwan"] as RentalRotationKey[]) {
    for (const a of cfg.rosters[brand]) {
      if (!rosters[brand].find((r) => r.name === a.name)?.memberId) {
        console.warn(`[rental-distributor] ${brand} agent "${a.name}" is not a rental workspace member — excluded from the rotation`);
      }
    }
    rosters[brand] = rosters[brand].filter((a) => a.memberId !== null);
    if (cfg.rosters[brand].length > 0 && rosters[brand].length === 0) {
      console.warn(`[rental-distributor] ${brand} rotation resolved EMPTY — its cards park in the manager queue`);
    }
  }
  const managerMemberIdFor = (brand: RentalRotationKey) => resolveMember(cfg.managerNames[brand]);

  // Outbound acceptance probe: any outbound WhatsApp row to the customer's
  // tail9 since the assignment — same tail-match identity as the relay's
  // loadRecentTwoWay (from_pn / from-JID / to-digits).
  //
  // Deliberately CROSS-TENANT. The card lives on the main line's tenant
  // (cardiwan line → tenant "cardiwan") but every agent line writes on
  // "easyrent" — scoping the probe to the assignment's tenant made it blind
  // to the agent's reply, so EVERY cardiwan lead aged out and got reassigned
  // while the agent was already talking to the customer (Ayham, 2026-09-18:
  // "CRM is not reading when the agent is accepting the lead"; card #1015 had
  // 41 outbound rows from Babek and still ping-ponged through 9 agents).
  // "Acted" = anyone from the team contacted the customer; matching the exact
  // agent is unreliable (@lid senders, wa_identity lag) and a teammate's reply
  // means the lead is handled either way. tail9 + direction + the minutes-wide
  // window since assignment keeps a cross-tenant false positive theoretical.
  const hasOutboundTo = async (_tenantSlug: string, tail9: string, since: Date): Promise<boolean> => {
    const res = await db.execute(sql`
      SELECT 1 FROM message
       WHERE channel = 'whatsapp'
         AND direction = 'outbound'
         AND created_at > ${since}
         AND (
           right(coalesce(from_pn, ''), ${MIN_PHONE_MATCH_DIGITS}) = ${tail9}
           OR right(regexp_replace(coalesce("from", ''), '[^0-9]', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail9}
           OR right(regexp_replace(coalesce("to", ''), '[^0-9]', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail9}
         )
       LIMIT 1
    `);
    return ((res as unknown as { rows?: unknown[] })?.rows ?? []).length > 0;
  };

  // 👍 acceptance probe (Ayham, 2026-09-19: "if the agent reacts thumbs up to
  // the assignment message, that counts as accepting the lead — do not
  // reassign"). The chain: wa_reaction.message_id = the WA id the observer
  // drain stored on wa_outbox at send time; wa_outbox.board_item_id =
  // dedupeUuid of the assignment dedupeKey — `assign:<oppId>` for the relay's
  // initial ping, `assign:<oppId>:<Name>` for a reassign ping, so BOTH are
  // probed. The reactor must be the ASSIGNED agent: phone tail9 direct, with a
  // wa_identity fallback for @lid reactors (the same lag the outbound probe
  // lives with). A reaction from anyone else does NOT accept. Pinned emoji
  // set — 👍 minimum, plus the three other common "yes" taps; a removed
  // reaction lands with emoji '' and never matches. The pinned set is inlined
  // in the SQL below — an interpolated JS array binds as ONE text param in a
  // drizzle sql template (the ANY(($1)) wa-push outage, 2026-08-24).
  const hasAcceptanceReaction = async (
    oppId: string,
    agentName: string,
    agentPhoneDigits: string | null,
    since: Date
  ): Promise<boolean> => {
    const tail9 = (agentPhoneDigits ?? "").replace(/\D/g, "").slice(-MIN_PHONE_MATCH_DIGITS);
    if (tail9.length < MIN_PHONE_MATCH_DIGITS) return false; // never accept on a guess
    const keyInitial = dedupeUuid(`assign:${oppId}`);
    const keyNamed = dedupeUuid(`assign:${oppId}:${agentName}`);
    // Emoji literals inlined on purpose: see the comment above.
    const res = await db.execute(sql`
      SELECT 1
        FROM wa_reaction r
        JOIN wa_outbox o ON o.wa_message_id = r.message_id
        LEFT JOIN wa_identity wi ON wi.lid = r.reactor_jid
       WHERE o.board_item_id IN (${keyInitial}, ${keyNamed})
         AND r.created_at >= ${since}
         AND r.emoji IN ('👍', '👌', '✅', '❤️')
         AND (
           right(coalesce(r.reactor_phone, ''), ${MIN_PHONE_MATCH_DIGITS}) = ${tail9}
           OR right(regexp_replace(coalesce(wi.phone, ''), '[^0-9]', '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail9}
         )
       LIMIT 1
    `);
    return ((res as unknown as { rows?: unknown[] })?.rows ?? []).length > 0;
  };

  // Bot-inbox reader (Ayham, 2026-09-19): the agent accept/decline replies and
  // the manager's steering commands arrive as ORDINARY inbound rows. Watched
  // inboxes: the ONE bot line (RENTAL_NOTIFY_LINE — the manager's chat) AND
  // the brand main lines (agent pings leave from the main line, so an agent's
  // "1" lands there). Cross-tenant like the outbound probe above: the bot
  // line's tenant is not the main lines'. Sender digits come from from_pn /
  // the plain JID, with ONE wa_identity batch for @lid senders (a per-row
  // lookup would N+1; the relay's lid resolution is the same shape). Who the
  // sender IS (agent / manager / stranger) is decided by the pass, not here.
  const REPLY_LINES = [
    ...new Set(
      [cfg.notifyLine, ...Object.keys(RENTAL_MAIN_LINES)].filter((x): x is string => !!x)
    ),
  ];
  const digitsOrNull = (s: string | null | undefined): string | null => {
    const d = (s ?? "").replace(/\D/g, "");
    return d.length >= MIN_PHONE_MATCH_DIGITS ? d : null;
  };
  const loadBotReplies = async (since: Date): Promise<BotReplyRow[]> => {
    const res = await db.execute(sql`
      SELECT "from", from_pn, body, created_at
        FROM message
       WHERE channel = 'whatsapp'
         AND direction = 'inbound'
         AND "to" IN (${sql.join(REPLY_LINES.map((l) => sql`${l}`), sql`, `)})
         AND created_at > ${since}
       ORDER BY created_at ASC
       LIMIT 500
    `);
    const rows = ((res as unknown as { rows?: unknown[] })?.rows ?? []) as {
      from: string | null;
      from_pn: string | null;
      body: string | null;
      created_at: string | Date;
    }[];
    const lids = [...new Set(rows.filter((r) => (r.from ?? "").endsWith("@lid")).map((r) => r.from!))];
    const lidPhone = new Map<string, string>();
    if (lids.length > 0) {
      const ires = await db.execute(sql`
        SELECT lid, phone FROM wa_identity
         WHERE lid IN (${sql.join(lids.map((l) => sql`${l}`), sql`, `)})
      `);
      for (const r of (((ires as unknown as { rows?: unknown[] })?.rows ?? []) as { lid: string; phone: string | null }[])) {
        if (r.phone) lidPhone.set(r.lid, r.phone);
      }
    }
    const out: BotReplyRow[] = [];
    for (const r of rows) {
      const at = r.created_at instanceof Date ? r.created_at : new Date(r.created_at);
      if (!Number.isFinite(at.getTime())) continue;
      const from = r.from ?? "";
      const senderPhone =
        digitsOrNull(r.from_pn) ??
        (from.endsWith("@lid") ? digitsOrNull(lidPhone.get(from)) : digitsOrNull(from));
      out.push({ senderPhone, senderJid: from, body: r.body ?? "", at });
    }
    return out;
  };

  // WhatsApp sender: the MAIN LINE the lead arrived on, so the customer (and
  // the agents) hear from the number they know. The line's tenant scopes the
  // outbox row (RLS); the observer bridge drains by brand_line.
  const lineTenantIds = new Map<string, string | null>();
  const sendWhatsApp = async (input: { line: string; toDigits: string; text: string; dedupeKey: string }) => {
    const slug = tenantSlugForLine(input.line);
    if (!lineTenantIds.has(input.line)) {
      lineTenantIds.set(input.line, await tenantIdForSlug(slug, db));
    }
    const tenantId = lineTenantIds.get(input.line);
    if (!tenantId) {
      console.error(`[rental-distributor] tenant "${slug}" (line ${input.line}) not found — notification dropped`);
      return false;
    }
    return enqueueDistributorWhatsApp({ ...input, tenantId });
  };

  let stopping = false;
  const stop = (signal: string) => {
    console.log(`[rental-distributor] ${signal} received — finishing current pass`);
    stopping = true;
  };
  process.on("SIGTERM", () => stop("SIGTERM"));
  process.on("SIGINT", () => stop("SIGINT"));

  while (!stopping) {
    try {
      // DB phone overrides (agent_availability.phone, 0077) win over the env
      // roster — loaded PER PASS so a manager's /availability edit reaches the
      // next pass without a restart. A failed load keeps the env phones.
      let liveRosters = rosters;
      try {
        const phoneOverrides = await loadPhoneOverrides(db);
        if (Object.keys(phoneOverrides).length > 0) {
          liveRosters = {
            etm: applyPhoneOverrides(rosters.etm, phoneOverrides),
            cardiwan: applyPhoneOverrides(rosters.cardiwan, phoneOverrides),
          };
        }
      } catch (e) {
        console.error(`[rental-distributor] phone overrides load failed (env phones in use): ${e instanceof Error ? e.message : String(e)}`);
      }
      const counts = await runRentalDistributorPass(
        {
          client,
          opportunityFields,
          rosters: liveRosters,
          managerMemberIdFor,
          managerPhoneFor: (brand) => cfg.managerPhones[brand],
          managerNameFor: (brand) => cfg.managerNames[brand],
          notifyLine: cfg.notifyLine,
          texts: cfg.texts,
          acceptWindowMs: cfg.acceptWindowMs,
          store: {
            loadCursors: store.loadCursors,
            saveCursors: store.saveCursors,
            loadAssignments: store.loadAssignments,
            saveAssignments: (map) => store.saveAssignments(pruneRentalAssignments(map, new Date())),
            loadReplyCursor: store.loadReplyCursor,
            saveReplyCursor: store.saveReplyCursor,
          },
          loadAvailability: () => loadAvailabilityMap(db),
          hasOutboundTo,
          hasAcceptanceReaction,
          sendWhatsApp,
          loadBotReplies,
          replyLookbackMs: envInt("RENTAL_BOT_REPLY_LOOKBACK_MIN", 60) * 60_000,
          cardBaseUrl: process.env.TWENTY_RENTAL_URL?.trim() || "https://rent.takeauto.tech",
          now: new Date(),
        },
        { commit: COMMIT, logger: (line) => console.log(line) }
      );
      if (counts.scanned > 0 || counts.replies > 0 || ONCE) {
        console.log(`[rental-distributor] pass: ${JSON.stringify(counts)}`);
      }
    } catch (err) {
      // A pass-level failure (DB down, Twenty down) must not kill the loop.
      console.error(
        `[rental-distributor] pass failed: ${err instanceof Error ? err.message : String(err)}`
      );
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
