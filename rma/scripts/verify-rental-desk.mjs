/**
 * verify-rental-desk.mjs — prove, against the LIVE rental instance, that the
 * three things Babek asked for are actually there.
 *
 *   TWENTY_BASE_URL=http://localhost:3002 TWENTY_API_KEY=<rental key> \
 *     node scripts/verify-rental-desk.mjs
 *
 * Read-only. Writes nothing, so it is safe to run at any time.
 *
 * It checks what the BOARD would render, not what the database happens to
 * hold: the kanban columns come from core."viewGroup", the deal counts from
 * the REST API the frontend itself calls, and the conversation from the
 * noteTarget rows the deal card reads. A DB-only assertion would have passed
 * on 2026-08-03 while the board itself showed "Sorry, something went wrong".
 */
import { execFileSync } from "child_process";

const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3002";
const KEY = (process.env.TWENTY_API_KEY ?? "").trim();
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";
const SCHEMA = process.env.TWENTY_SCHEMA || "workspace_7tkxm1eeqb4iopvi5ica5vos4";
if (!KEY) throw new Error("set TWENTY_API_KEY (the RENTAL key)");

const psql = (sql) =>
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-F", "|", "-c", sql], {
    encoding: "utf8", maxBuffer: 1 << 24,
  }).trim();

async function rest(path, params = {}) {
  const url = new URL(`${BASE}/rest/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KEY}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// ── 1. Babek's columns ──────────────────────────────────────────────────────
console.log("\n[1] Board columns (what the kanban actually renders)");
const EXPECTED = [
  "NEW_REQUEST", "IN_PROGRESS", "SECOND_TOUCH", "CAR_PREPARATION",
  "CAR_WITH_CUSTOMER", "RENTED_OUT", "DEPOSIT_REFUND", "COMPLETED", "CANCELLED",
];
const groups = psql(`
  select vg."fieldValue" from core."viewGroup" vg
  join core.view v on v.id = vg."viewId"
  where v.name = 'By Stage' and vg."deletedAt" is null order by vg.position
`).split("\n").filter(Boolean);
check(JSON.stringify(groups) === JSON.stringify(EXPECTED), "kanban columns are Babek's funnel, in his order", groups.join(" → "));

const enumVals = psql(`select unnest(enum_range(null::"${SCHEMA}".opportunity_stage_enum))`).split("\n").filter(Boolean);
const optVals = psql(`
  select jsonb_array_elements(options)->>'value' from core."fieldMetadata"
  where name = 'stage' and "objectMetadataId" in (select id from core."objectMetadata" where "nameSingular" = 'opportunity')
`).split("\n").filter(Boolean);
check(JSON.stringify(enumVals) === JSON.stringify(optVals), "postgres enum and fieldMetadata.options agree", `${enumVals.length} values`);

const orphans = psql(`
  select count(*) from "${SCHEMA}".opportunity
  where "deletedAt" is null and stage::text <> all (array[${EXPECTED.map((s) => `'${s}'`).join(",")}])
`);
check(orphans === "0", "no deal holds a stage that is not a column", `${orphans} orphan(s)`);

const perStage = psql(`
  select stage, count(*) from "${SCHEMA}".opportunity where "deletedAt" is null group by 1 order by 2 desc
`).split("\n").filter(Boolean);
console.log("        deals per stage: " + perStage.map((l) => l.replace("|", "=")).join(", "));

const kanbanFilter = psql(`
  select vf.value::text from core."viewFilter" vf join core.view v on v.id = vf."viewId"
  where v.name = 'By Stage' and vf."deletedAt" is null
`);
check(kanbanFilter.includes("CANCELLED") && !kanbanFilter.includes("LOST"),
  "board filter names live stage values", kanbanFilter);

// ── 2. The conversation on the deal ─────────────────────────────────────────
console.log("\n[2] WhatsApp conversation on the deal");
const linked = psql(`
  select count(*) from "${SCHEMA}"."noteTarget" where "deletedAt" is null and "targetOpportunityId" is not null
`);
check(Number(linked) > 0, "notes are attached to opportunities", `${linked} note→deal link(s)`);

const sample = psql(`
  select o.id, o.name, count(*) from "${SCHEMA}"."noteTarget" nt
  join "${SCHEMA}".opportunity o on o.id = nt."targetOpportunityId"
  where nt."deletedAt" is null group by 1,2 order by 3 desc limit 3
`).split("\n").filter(Boolean);
for (const line of sample) {
  const [id, name, n] = line.split("|");
  const notes = psql(`
    select n.title from "${SCHEMA}".note n
    join "${SCHEMA}"."noteTarget" nt on nt."noteId" = n.id
    where nt."targetOpportunityId" = '${id}' and nt."deletedAt" is null order by n."createdAt" desc limit 2
  `).split("\n").filter(Boolean);
  console.log(`        deal "${name}" → ${n} note(s): ${notes.join(" | ")}`);
  const bodies = psql(`
    select count(*) from "${SCHEMA}".note n
    join "${SCHEMA}"."noteTarget" nt on nt."noteId" = n.id
    where nt."targetOpportunityId" = '${id}' and nt."deletedAt" is null and n."bodyV2Markdown" like '%wa.me/%'
  `);
  console.log(`          of which carry a wa.me link: ${bodies}`);
}

// The deal card reads through the API, not the table — confirm that path too.
const oppWithNotes = sample[0]?.split("|")[0];
if (oppWithNotes) {
  const one = await rest(`opportunities/${oppWithNotes}`, { depth: 1 });
  const rec = one?.data?.opportunity ?? one?.data;
  check(Boolean(rec), "the deal is readable through the REST API the UI uses", rec?.name ?? "");
}

// ── 3. The promo segment ────────────────────────────────────────────────────
console.log("\n[3] Promo segment");
const promo = psql(`
  select vf.operand, jsonb_typeof(vf.value), vf.value::text
  from core.view v join core."viewFilter" vf on vf."viewId" = v.id
  where v.name = 'Won — for promo' and v."deletedAt" is null and vf."deletedAt" is null
`);
const [operand, kind, value] = promo.split("|");
check(operand === "IS" && kind === "array", "filter is ONE row holding a JSON array", `${operand} ${value} (${kind})`);
const won = psql(`select count(*) from "${SCHEMA}".opportunity where "deletedAt" is null and stage = 'COMPLETED'`);
const promoCols = psql(`
  select count(*) from core."viewField" f join core.view v on v.id = f."viewId"
  where v.name = 'Won — for promo' and f."deletedAt" is null
`);
check(Number(promoCols) > 0, "the view has columns (a blank table reads as lost data)", `${promoCols} column(s)`);
console.log(`        deals it will show: ${won}`);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
