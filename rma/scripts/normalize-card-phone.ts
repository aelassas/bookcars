/**
 * normalize-card-phone.ts — make a hand-typed phone on a sales card usable as
 * the identity key.
 *
 * CallGear was switched off (unpaid, token dead since 2026-09-16), so the
 * leasing team now enters calls by hand: they open the Primary processing
 * board, add a card in a column and type the customer's number. The field they
 * type into is `phoneTail9` (shown as "Customer phone" since 2026-09-28).
 *
 * But `phoneTail9` is not a display field — it is the JOIN KEY. The wa-lead
 * relay finds a customer's existing card with it
 * (`fetchOpportunitiesForTails`), and it only ever matches the last NINE
 * digits, no plus, no spaces. A human typing "+971 50 258 3434" therefore
 * creates a card the relay cannot see, and the customer's first WhatsApp
 * message mints a SECOND card for the same person — the duplicate-cards
 * complaint, re-created by hand.
 *
 * This pass rewrites anything that is not exactly nine digits into the last
 * nine digits of what was typed. "+971502583434" → "502583434", which is what
 * the relay would have written itself.
 *
 * Candidates are found by reading the workspace Postgres directly (a count
 * that is almost always zero, so this is cheap enough to ride the minute beat);
 * the write goes through the REST API so Twenty's own hooks and cache run.
 *
 * SALES ONLY. The rental workspace is a separate container and is not touched.
 *
 * Dry-run by default; --commit writes.
 *
 *   npx tsx scripts/normalize-card-phone.ts            # report
 *   npx tsx scripts/normalize-card-phone.ts --commit   # fix
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { execFileSync } from "node:child_process";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

/** Sales deployment coordinates — same pattern as migrate-bitrix-sales-deals.ts. */
const SALES_DB_CONTAINER = process.env.TWENTY_SALES_DB_CONTAINER ?? "twenty-db-1";
const SALES_SCHEMA = process.env.TWENTY_SALES_SCHEMA ?? "workspace_8fj54z04p0s0zrognxhkd2f0a";

const COMMIT = process.argv.includes("--commit");

/** Last nine digits of whatever a human typed; null when there are fewer. */
export function tail9(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
}

/** Already a clean key — nothing to do. */
export function isCleanTail9(raw: string): boolean {
  return /^\d{9}$/.test(raw);
}

function psql(sql: string): string {
  return execFileSync(
    "docker",
    ["exec", "-i", SALES_DB_CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "\t", "-c", sql],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
}

async function main() {
  const twenty = getTwentyClientForInstance("default");
  if (twenty.mode === "mock") throw new Error("sales Twenty in MOCK mode — refusing to run");

  // Anything set but not exactly nine digits. Postgres does the filtering so a
  // clean workspace costs one cheap query and no REST traffic at all.
  const out = psql(
    `select id, "phoneTail9", coalesce(name,'') from ${SALES_SCHEMA}.opportunity
      where "deletedAt" is null and "phoneTail9" is not null and "phoneTail9" !~ '^[0-9]{9}$'`
  ).trim();

  const rows = out
    ? out.split("\n").map((l) => {
        const [id, phone, name] = l.split("\t");
        return { id, phone: phone ?? "", name: name ?? "" };
      })
    : [];

  if (rows.length === 0) {
    console.log("[normalize-card-phone] nothing to fix");
    return;
  }

  const fixable = rows.filter((r) => tail9(r.phone) !== null);
  const tooShort = rows.filter((r) => tail9(r.phone) === null);

  console.log(`[normalize-card-phone] ${rows.length} card(s) with a non-key phone`);
  for (const r of fixable.slice(0, 20)) {
    console.log(`  ${r.name.slice(0, 40).padEnd(40)} "${r.phone}" → ${tail9(r.phone)}`);
  }
  for (const r of tooShort) {
    console.log(`  SKIP (under 9 digits) ${r.name.slice(0, 40)} "${r.phone}"`);
  }

  if (!COMMIT) {
    console.log(`DRY-RUN — nothing written (${fixable.length} would be fixed).`);
    return;
  }

  let done = 0;
  let failed = 0;
  for (const r of fixable) {
    try {
      await twenty.patch(`opportunities/${r.id}`, { phoneTail9: tail9(r.phone) });
      done++;
    } catch (e) {
      failed++;
      console.error(`  ${r.id}: ${(e as Error).message.slice(0, 140)}`);
    }
  }
  console.log(`[normalize-card-phone] fixed ${done}; ${failed} failed; ${tooShort.length} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
