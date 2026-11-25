/**
 * Put an agent on every card that has none.
 *
 * Ayham, 2026-08-31: "brand and agent to be mentioned in all leads (taken by
 * whom)". New cards carry the agent now; this heals the ones created while the
 * relay was reading a stale owner list (Abdullah's line was in no map at all,
 * so everything he took was created unowned).
 *
 * The agent is decided by the LINE the customer first wrote to — the same rule
 * the relay uses — via modules/board/owners.ts. Cards whose customer never
 * wrote on WhatsApp (call cards, imports) are left alone rather than guessed at.
 *
 * Dry-run by default; --commit to write. Idempotent: an owned card is skipped.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";
import { resolveOwnerForLine } from "@/modules/board/owners";
import { matchMemberForAgent } from "@/platform/integrations/callgear/agent-name";

type Opp = {
  id: string; deletedAt: string | null; phoneTail9: string | null;
  leadNumber: string | null; ownerId: string | null; brandLine: string | null;
};

const COMMIT = process.argv.includes("--commit");

async function main() {
  const twenty = getTwentyClientForInstance("rental");
  if (twenty.mode === "mock") throw new Error("rental Twenty in MOCK mode — refusing to run");

  const members: { id: string; firstName: string; lastName: string }[] = [];
  for await (const m of twenty.listAll<Record<string, unknown>>("workspaceMembers")) {
    const id = typeof m.id === "string" ? m.id : null;
    const name = (m.name ?? {}) as { firstName?: unknown; lastName?: unknown };
    const firstName = typeof name.firstName === "string" ? name.firstName : "";
    const lastName = typeof name.lastName === "string" ? name.lastName : "";
    if (id && firstName) members.push({ id, firstName, lastName });
  }
  console.log(`${members.length} workspace members`);

  const opps: Opp[] = [];
  for await (const o of twenty.listAll<Opp>("opportunities")) opps.push(o);
  const unowned = opps.filter((o) => !o.deletedAt && !o.ownerId && o.phoneTail9);
  console.log(`${unowned.length} cards without an agent\n`);

  // tail9 -> the line that customer FIRST wrote to (the relay's own rule).
  const r = await pool.query<{ tail: string; line: string }>(
    `select distinct on (tail) tail, line from (
       select right(regexp_replace(coalesce(nullif(from_pn,''), "from", ''), '[^0-9]', '', 'g'), 9) as tail,
              nullif("to", '') as line, created_at
         from message
        where channel = 'whatsapp' and direction = 'inbound' and "from" not like '%@g.us'
     ) x where tail is not null and line is not null order by tail, created_at`
  );
  const lineOf = new Map(r.rows.map((x) => [x.tail, x.line]));
  console.log(`${lineOf.size} customers with a known first line\n`);

  const counts: Record<string, number> = {};
  let set = 0, noLine = 0, noMember = 0, failed = 0;

  for (const o of unowned) {
    const line = lineOf.get(o.phoneTail9!);
    if (!line) { noLine++; continue; }
    const owner = resolveOwnerForLine(line);
    const memberId = owner ? matchMemberForAgent(owner.name, members) : null;
    if (!memberId) { noMember++; continue; }

    counts[owner!.key] = (counts[owner!.key] ?? 0) + 1;
    if (!COMMIT) { set++; continue; }
    try {
      await twenty.patch(`opportunities/${o.id}`, { ownerId: memberId });
      set++;
    } catch (e) {
      failed++;
      console.error(`  #${o.leadNumber ?? o.id}: ${(e as Error).message.slice(0, 120)}`);
    }
  }

  console.log(`${COMMIT ? "SET" : "WOULD SET"} an agent on ${set} cards`);
  for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(10)} ${n}`);
  console.log(`no WhatsApp line for the customer: ${noLine} · line has no matching member: ${noMember} · failed: ${failed}`);
  if (!COMMIT) console.log("\ndry run — pass --commit to write");
  process.exit(0);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
