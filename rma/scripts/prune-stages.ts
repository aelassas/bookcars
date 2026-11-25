/**
 * Drop the seven retired stage options from the picklist.
 *
 * Safe only because remap-stages.ts emptied them first — this refuses to run if
 * a single live card still points at one, since removing an option a record
 * uses leaves that record with a value the UI cannot render.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { getTwentyClientForInstance } from "@/platform/integrations/twenty/client";

const RETIRE = new Set([
  "SECOND_TOUCH", "CAR_PREPARATION", "A_CAR_THAT_WE_DON_T_HAVE",
  "NOT_A_LEAD", "UNDER_INVESTIGATION", "THE_CLIENT_WILL_REACH_OUT_AGAIN", "B2B_INQUIRY",
]);
const COMMIT = process.argv.includes("--commit");

type Field = { id: string; name: string; options?: { id?: string; value: string; label: string; position: number; color?: string }[]; object?: { nameSingular?: string } };

async function allFields(base: string, h: Record<string, string>): Promise<Field[]> {
  const out: Field[] = [];
  let cursor = "";
  for (let page = 0; page < 30; page++) {
    const url = `${base}/rest/metadata/fields?limit=200${cursor ? `&starting_after=${cursor}` : ""}`;
    const r = await fetch(url, { headers: h });
    if (!r.ok) throw new Error(`fields HTTP ${r.status}`);
    const b = await r.json() as { data?: Field[]; pageInfo?: { endCursor?: string; hasNextPage?: boolean } };
    const rows = b.data ?? [];
    out.push(...rows);
    if (!b.pageInfo?.hasNextPage || !b.pageInfo.endCursor) break;
    cursor = b.pageInfo.endCursor;
  }
  return out;
}

async function main() {
  const base = (process.env.TWENTY_RENTAL_BASE_URL || "").replace(/\/$/, "");
  const key = process.env.TWENTY_RENTAL_API_KEY || "";
  const h = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const fields = await allFields(base, h);
  const stage = fields.find((f) => f.name === "stage" && (f.options ?? []).some((o) => o.value === "NEW_REQUEST"));
  if (!stage) throw new Error("opportunity.stage field not found");
  const opts = stage.options ?? [];
  console.log(`stage field ${stage.id}: ${opts.length} options`);

  // Refuse if anything still lives on a retired stage.
  const t = getTwentyClientForInstance("rental");
  const stuck: string[] = [];
  for await (const o of t.listAll<{ stage: string | null; deletedAt: string | null; name: string | null }>("opportunities")) {
    if (!o.deletedAt && o.stage && RETIRE.has(o.stage)) stuck.push(`${o.name} (${o.stage})`);
  }
  if (stuck.length) {
    console.error(`REFUSING: ${stuck.length} live card(s) still on a retired stage, e.g. ${stuck[0]}`);
    process.exit(1);
  }
  console.log("no live card left on any retired stage");

  const keep = opts.filter((o) => !RETIRE.has(o.value)).map((o, i) => ({ ...o, position: i }));
  console.log(`keeping ${keep.length}: ${keep.map((o) => o.label).join(" · ")}`);
  if (!COMMIT) { console.log("\ndry run — pass --commit"); process.exit(0); }

  const res = await fetch(`${base}/rest/metadata/fields/${stage.id}`, {
    method: "PATCH", headers: h, body: JSON.stringify({ options: keep }),
  });
  console.log("PATCH ->", res.status, res.ok ? "DONE" : (await res.text()).slice(0, 300));
  process.exit(res.ok ? 0 : 1);
}
main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
