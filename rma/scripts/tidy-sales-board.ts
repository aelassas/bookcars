/**
 * tidy-sales-board.ts — put ONLY the active book on the two sales pipelines.
 *
 * Owner's rule (2026-09-27, Moe via the owner): the Primary processing and
 * Sales Department boards must show the ACTIVE / on-going deals and nothing
 * else — "it's not much there" — with everything historical parked in the
 * Archive view instead of on the kanbans.
 *
 * What the boards hold today (live count, 2026-09-27):
 *   take-auto OPEN deals ....... 526  ← the real book, correct Bitrix stages
 *   take-auto historical leads . 6,551 ← the "Качественный лид" pile
 *   easyrent  deals + leads .... 2,306 ← the RENTAL desk's records
 *   cardiwan  deals + leads .... 1,316 ← the RENTAL desk's records
 * The last three inflated "Identifying the need" to 6,890 cards and put
 * "Гость — Insta Easy Rent" in front of the leasing team.
 *
 * WHAT THIS DOES: clears `primaryStage` and `salesStage` on every card that is
 * not a take-auto open deal. A card with neither field set drops off both
 * kanbans (Primary processing filters primaryStage IS_NOT_NULL) and keeps
 * everything else — owner, phone, notes, and `stageDetail`, which still holds
 * the verbatim Bitrix stage name. NOTHING IS DELETED and no card leaves the
 * workspace; the change is reversible from `stageDetail` alone.
 *
 * RENT SIDE IS NOT TOUCHED. This talks only to the "default" (sales) Twenty on
 * :3001. The rental workspace is a separate container and a separate database;
 * the rental cards cleared here are COPIES that the 2026 import placed on the
 * sales board, not the rental desk's own records.
 *
 * Attribution is by (Bitrix id + card name) against the mycrm archive, because
 * the `bitrix-deal:<id>` / `bitrix-lead:<id>` keys COLLIDE across the three
 * Bitrix portals — 608 deal ids exist in both take-auto and easyrent — so the
 * id alone cannot say whose card it is.
 *
 * Dry-run by default; --commit writes. Idempotent: a card already off the
 * boards is skipped, so a second run does nothing.
 *
 *   npx tsx scripts/tidy-sales-board.ts            # report only
 *   npx tsx scripts/tidy-sales-board.ts --commit   # write
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

type Opp = {
  id: string;
  deletedAt: string | null;
  name: string | null;
  externalId: string | null;
  primaryStage: string | null;
  salesStage: string | null;
  stageDetail: string | null;
};

const COMMIT = process.argv.includes("--commit");

/** `bitrix-deal:12345` → `12345`; anything else → null. */
function bitrixDealId(externalId: string | null): string | null {
  if (!externalId || !externalId.startsWith("bitrix-deal:")) return null;
  return externalId.slice("bitrix-deal:".length) || null;
}

/**
 * Cards born from a LIVE channel — today's WhatsApp leads and call cards. They
 * are the working flow ("the girls get it, then it goes to an agent"): 87 of
 * them sit on Primary processing as New application right now. They are active
 * by definition and never belong in the Archive, whatever the Bitrix archive
 * does or does not know about them.
 */
function isLiveChannelCard(externalId: string | null): boolean {
  if (!externalId) return false;
  return externalId.startsWith("wa-lead") || externalId.startsWith("callgear");
}

async function main() {
  const twenty = getTwentyClientForInstance("default");
  if (twenty.mode === "mock") throw new Error("sales Twenty in MOCK mode — refusing to run");

  // ── The keep-set: take-auto OPEN deals, keyed id+name (ids collide across
  //    portals, names do not).
  const active = await pool.query<{ external_id: string; ref: string | null }>(
    `select d.external_id, d.ref
       from deal d
       join tenant t on t.id = d.tenant_id
      where t.slug = 'take-auto' and d.status = 'open' and d.external_id is not null`
  );
  const keep = new Set(active.rows.map((r) => `${r.external_id} ${r.ref ?? ""}`));
  console.log(`take-auto open deals in the mycrm archive: ${keep.size}`);

  const opps: Opp[] = [];
  for await (const o of twenty.listAll<Opp>("opportunities")) opps.push(o);
  const live = opps.filter((o) => !o.deletedAt);
  console.log(`live cards on the sales workspace: ${live.length}\n`);

  const onBoard = live.filter((o) => o.primaryStage || o.salesStage);
  const toClear: Opp[] = [];
  let keptDeals = 0;
  let keptLive = 0;

  for (const o of onBoard) {
    if (isLiveChannelCard(o.externalId)) {
      keptLive++;
      continue;
    }
    const id = bitrixDealId(o.externalId);
    if (id && keep.has(`${id} ${o.name ?? ""}`)) {
      keptDeals++;
      continue;
    }
    toClear.push(o);
  }
  const kept = keptDeals + keptLive;

  // Report what leaves the boards, grouped by the Bitrix stage it came from —
  // so the change is legible before it is made.
  const byDetail = new Map<string, number>();
  for (const o of toClear) {
    const k = o.stageDetail?.trim() || "(no Bitrix stage)";
    byDetail.set(k, (byDetail.get(k) ?? 0) + 1);
  }

  console.log(`cards staying on the boards: ${kept} = ${keptDeals} active take-auto deal(s) + ${keptLive} live WhatsApp/call lead(s)`);
  console.log(`cards moving to Archive: ${toClear.length}`);
  console.log("\nmoving to Archive, by their Bitrix stage name:");
  for (const [k, n] of [...byDetail.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(n).padStart(6)}  ${k}`);
  }

  if (!COMMIT) {
    console.log(`\nDRY-RUN — nothing written. Re-run with --commit to apply.`);
    return;
  }

  let done = 0;
  let failed = 0;
  for (const o of toClear) {
    try {
      await twenty.patch(`opportunities/${o.id}`, { primaryStage: null, salesStage: null });
      done++;
      if (done % 500 === 0) console.log(`  ${done}/${toClear.length}…`);
    } catch (e) {
      failed++;
      if (failed <= 10) console.error(`  ${o.id}: ${(e as Error).message.slice(0, 140)}`);
    }
  }
  console.log(`\ncleared ${done} card(s); ${failed} failed.`);
  console.log(`boards now carry ${kept} active card(s).`);
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
