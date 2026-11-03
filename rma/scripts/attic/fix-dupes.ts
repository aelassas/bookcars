/**
 * Give the duplicated call cards fresh numbers from the board's own counter.
 *
 * Ayham, 2026-09-01: "WhatsApp leads started from #1, now #30; inbound calls
 * also started from #1, now #16 — so there are duplicated numbers." Both series
 * live on the same board, so they must share its sequence. The relay is fixed;
 * this heals the four cards minted before the fix.
 *
 * The CALL card is the one renumbered: it drew from the wrong counter, and the
 * WhatsApp numbers are the ones already spoken about.
 *
 * Dry-run by default; --commit to write.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { pool } from "@/platform/db/client";

type Opp = { id: string; name: string | null; leadNumber: string | null; deletedAt: string | null; createdAt: string };

const COMMIT = process.argv.includes("--commit");

async function main() {
  const t = getTwentyClientForInstance("rental");
  if (t.mode === "mock") throw new Error("rental Twenty in MOCK mode");

  const live: Opp[] = [];
  for await (const o of t.listAll<Opp>("opportunities")) {
    if (!o.deletedAt && o.leadNumber && !o.leadNumber.startsWith("L-")) live.push(o);
  }
  const byNumber = new Map<string, Opp[]>();
  for (const o of live) byNumber.set(o.leadNumber!, [...(byNumber.get(o.leadNumber!) ?? []), o]);

  const clashes = [...byNumber.entries()].filter(([, v]) => v.length > 1);
  const toFix: Opp[] = [];
  for (const [num, cards] of clashes) {
    const call = cards.find((c) => /Inbound call|Outbound call/i.test(c.name ?? ""));
    const victim = call ?? cards.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
    console.log(`#${num}: ${cards.length} cards — renumbering "${(victim.name ?? "").slice(0, 44)}"`);
    toFix.push(victim);
  }
  if (!toFix.length) { console.log("no duplicates"); process.exit(0); }
  if (!COMMIT) { console.log(`\ndry run — ${toFix.length} card(s) would get fresh numbers`); process.exit(0); }

  let ok = 0;
  for (const o of toFix) {
    const r = await pool.query<{ n: string }>("SELECT nextval('twenty_lead_seq_rental') AS n");
    const n = Number(r.rows[0].n);
    const name = (o.name ?? "").replace(/^#\d+/, `#${n}`);
    await t.patch(`opportunities/${o.id}`, { leadNumber: String(n), name });
    console.log(`  ${o.leadNumber} → ${n}  ${name.slice(0, 50)}`);
    ok++;
  }
  await pool.end().catch(() => {});
  console.log(`\nrenumbered ${ok}`);
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
