// Probe the AI judge on a real NOISE thread: what does the local model actually
// answer, and does parseLeadVerdict accept it?
import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import { buildLeadPrompt, parseLeadVerdict, verdictQualifies } from "@/platform/integrations/twenty/wa-lead-relay";
import { createLocalCompleter } from "@/platform/ai/resolver";
import { tenant } from "@/platform/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  // Grab a few recent inbound threads that the bar rejected (no card exists).
  const rows = await db.execute(sql`
    SELECT "from", body, created_at FROM message
    WHERE direction = 'inbound' AND channel = 'whatsapp'
      AND created_at > now() - interval '3 days'
      AND body NOT LIKE '[%' AND length(body) > 12
    ORDER BY created_at DESC LIMIT 400`);
  // group crude by sender, keep senders with 2+ lines
  const bySender = new Map<string, { body: string; at: Date }[]>();
  for (const r of rows.rows as any[]) {
    const k = String(r.from);
    if (!bySender.has(k)) bySender.set(k, []);
    bySender.get(k)!.push({ body: String(r.body), at: new Date(r.created_at) });
  }
  const [t] = await db.select().from(tenant).where(eq(tenant.slug, "easyrent")).limit(1);
  if (!t) throw new Error("no tenant");
  const complete = await createLocalCompleter(t.id);
  if (!complete) throw new Error("no completer");

  let tested = 0;
  for (const [sender, lines] of bySender) {
    if (lines.length < 2) continue;
    if (tested >= 4) break;
    tested++;
    const thread: any = {
      key: sender.slice(-9),
      digits: sender.replace(/\D/g, ""),
      channel: "whatsapp",
      lines: lines.reverse(),
    };
    const prompt = buildLeadPrompt(thread);
    console.log("=== sender", sender, "| lines:", lines.length);
    console.log("PROMPT (first 400):", prompt.user.slice(0, 400).replace(/\n/g, " | "));
    const t0 = Date.now();
    const raw = await complete(prompt.system, prompt.user);
    console.log(`MODEL (${Date.now() - t0}ms):`, raw.slice(0, 500));
    const verdict = parseLeadVerdict(raw, prompt.sourceText);
    console.log("PARSED:", verdict ? JSON.stringify(verdict).slice(0, 300) : "null (rejected)");
    console.log("QUALIFIES:", verdict ? verdictQualifies(verdict) : false);
    console.log();
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
