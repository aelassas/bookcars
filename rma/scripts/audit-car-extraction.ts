/**
 * One-shot accuracy audit for extractSignals' carText (2026-08-28).
 * Scans recent inbound messages, reports messages where the deterministic
 * pass found NO car but the text probably names one. Read-only.
 *
 *   npx tsx /tmp/audit-car-extraction.ts            (from platform/, needs DATABASE_URL)
 */
import { extractCarText } from "@/modules/messaging/extract";
import pg from "pg";

// Broad "this message probably talks about a car" sieve: model-ish codes
// (mg5, t2, h6), car words in EN/RU/AR, and brand substrings not in the
// extractor dictionary — anything the anchor pass could have used.
const CAR_HINT = /\b(mg\s?\d|jetour|t\s?2\b|tank|haval|jolion|geely|coolray|monjaro|changan|cs\d|uni-[tk]|omoda|jaecoo|zeekr|exeed|rx\b|lx\b|vx\b|byd|atto|seal\b|dolphin|song|tang|han\b|h6|h9|dashing|x70|x90|traveller|suzuki|jimny|hummer|volvo|polestar|lotus|emeya|eletre|avatr|hongqi|gac|jac|dongfeng|bestune|kaiyi|forthing|suv|sedan|crossover|convertible|coupe|авто|машин|тачк|кроссовер|внедорожник|سيارة)/i;

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
  const { rows } = await pool.query(`
    SELECT tenant_id, body
    FROM message
    WHERE direction = 'inbound'
      AND created_at > now() - interval '60 days'
      AND body IS NOT NULL AND length(body) BETWEEN 3 AND 600
    ORDER BY created_at DESC
    LIMIT 30000`);
  console.log(`scanned ${rows.length} inbound messages (60d)`);

  const missedTokens = new Map<string, { count: number; examples: string[] }>();
  let caught = 0, noCar = 0, missed = 0;
  for (const r of rows) {
    const body = String(r.body);
    const car = extractCarText(body);
    if (car) { caught++; continue; }
    if (!CAR_HINT.test(body)) { noCar++; continue; }
    missed++;
    // tokenise and count the hint-matching tokens to rank what to add
    for (const tok of body.toLowerCase().split(/[^a-zа-я0-9]+/i)) {
      if (tok.length < 2) continue;
      if (CAR_HINT.test(tok) || /^[a-z]{1,5}\d{1,4}[a-z]{0,3}$/.test(tok)) {
        const e = missedTokens.get(tok) ?? { count: 0, examples: [] };
        e.count++;
        if (e.examples.length < 2 && !e.examples.includes(body)) e.examples.push(body.slice(0, 140));
        missedTokens.set(tok, e);
      }
    }
  }
  console.log(`car found: ${caught} · no car talk: ${noCar} · MISSED (car likely): ${missed}`);
  console.log(`\ntop missed tokens:`);
  [...missedTokens.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 35)
    .forEach(([tok, e]) => {
      console.log(`\n${tok}  ×${e.count}`);
      e.examples.forEach((x) => console.log(`   | ${x.replace(/\n/g, " ")}`));
    });
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
