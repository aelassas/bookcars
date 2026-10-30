// Add a "Проиграно" (Lost) stage to the opportunity funnel and move the dead
// deals into it.
//
// Why: 76% of the take-auto Bitrix book is "Сделка провалена" and Twenty's
// funnel had no column for it, so the mirror could not set an honest stage and
// Twenty fell back to its default — NEW. The result was 58,259 long-dead deals
// presented to the team as fresh leads, against 563 genuinely open ones.
//
// The stage column is a Postgres enum, so the option MUST be added through the
// metadata API (which alters the enum and keeps metadata in sync) — never by
// hand in the database.
//
// DRY-RUN BY DEFAULT. Pass --commit to write.
//   node scripts/add-lost-stage.mjs
//   node scripts/add-lost-stage.mjs --commit
//
// Idempotent: if the option already exists it is left alone, and the remap
// only touches rows still sitting in the wrong stage.
import { readFileSync } from "node:fs";

const COMMIT = process.argv.includes("--commit");
// Add the option and stop. The remap of ~58k rows is 58k sequential HTTP
// calls here (hours) versus one indexed UPDATE once the enum value exists —
// and it only exists BECAUSE the metadata mutation ran first, which is what
// makes the SQL safe rather than a shortcut around the API.
const OPTIONS_ONLY = process.argv.includes("--options-only");
const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3001";

// The exact Bitrix funnel name for a failed deal. Deliberately narrow: other
// stage names that also land in NEW ("Заявки без ответа", "Выявление
// потребности") are genuinely open and must NOT be swept into Lost.
const LOST_STAGE_DETAIL = "Сделка провалена";

const LOST_OPTION = {
  // UPPER_SNAKE is enforced by Twenty's metadata validation.
  value: "LOST",
  label: "Проиграно",
  color: "gray",
};

function apiKey() {
  // The env var wins: with one instance per brand, a script that always
  // read .env.local would aim the sales key at whichever brand's URL it was
  // pointed to and quietly do the wrong thing.
  if (process.env.TWENTY_API_KEY?.trim()) return process.env.TWENTY_API_KEY.trim();
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("TWENTY_API_KEY="));
  if (!line) throw new Error("TWENTY_API_KEY missing from .env.local");
  return line.slice("TWENTY_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

const KEY = apiKey();

async function gql(endpoint, query, variables = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 400));
  return body.data;
}

async function stageField() {
  const d = await gql(
    "/metadata",
    `{ objects(paging: { first: 200 }) {
         edges { node {
           nameSingular
           fields(paging: { first: 200 }) { edges { node { id name type options } } }
         } }
       } }`
  );
  const opp = d.objects.edges.find((e) => e.node.nameSingular === "opportunity");
  if (!opp) throw new Error("opportunity object not found");
  const field = opp.node.fields.edges.map((e) => e.node).find((f) => f.name === "stage");
  if (!field) throw new Error("opportunity.stage field not found");
  return field;
}

async function main() {
  console.log(`[add-lost-stage] mode=${COMMIT ? "COMMIT" : "DRY-RUN"}`);

  const field = await stageField();
  const options = field.options ?? [];
  console.log("current stages:", options.map((o) => o.value).join(", "));

  // Whether LOST is queryable at all. Until the option exists the value is not
  // in the Postgres enum, and filtering by it is a hard error rather than an
  // empty result — so the count below has to be phrased differently.
  let lostExists = options.some((o) => o.value === LOST_OPTION.value);

  if (lostExists) {
    console.log('stage "LOST" already exists — nothing to add');
  } else if (!COMMIT) {
    console.log(`would ADD stage ${LOST_OPTION.value} ("${LOST_OPTION.label}") at position ${options.length}`);
  } else {
    // updateOneField REPLACES the options array, so every existing option must
    // be sent back verbatim — dropping one would orphan every record on it.
    const next = [
      ...options,
      { ...LOST_OPTION, position: options.length, id: crypto.randomUUID() },
    ];
    await gql(
      "/metadata",
      `mutation ($input: UpdateOneFieldMetadataInput!) {
         updateOneField(input: $input) { id name options }
       }`,
      { input: { id: field.id, update: { options: next } } }
    );
    console.log(`added stage ${LOST_OPTION.value} ("${LOST_OPTION.label}")`);
    lostExists = true;
  }

  // ── Remap ────────────────────────────────────────────────────────────────
  const wrongFilter = lostExists
    ? { stageDetail: { eq: LOST_STAGE_DETAIL }, stage: { neq: "LOST" } }
    : { stageDetail: { eq: LOST_STAGE_DETAIL } };
  const countQuery = `query ($f: OpportunityFilterInput) { opportunities(filter: $f) { totalCount } }`;
  const wrong = await gql("/graphql", countQuery, { f: wrongFilter });
  const n = wrong.opportunities.totalCount;
  if (OPTIONS_ONLY) {
    console.log(`deals still to move into LOST: ${n} (remap left to the caller)`);
    return;
  }
  console.log(`deals marked "${LOST_STAGE_DETAIL}" but not in stage LOST: ${n}`);

  if (!COMMIT) {
    console.log("\ndry run — nothing written. Re-run with --commit to apply.");
    return;
  }
  if (n === 0) {
    console.log("nothing to remap");
    return;
  }

  // Deliberately NOT done with a bulk SQL UPDATE: the enum value has just been
  // added through the metadata layer, and going around it risks writing a
  // value the API layer does not yet know about.
  console.log("remapping via the API in pages…");
  let moved = 0;
  for (;;) {
    const page = await gql(
      "/graphql",
      `query ($f: OpportunityFilterInput) {
         opportunities(filter: $f, first: 200) { edges { node { id } } }
       }`,
      { f: wrongFilter }
    );
    const ids = page.opportunities.edges.map((e) => e.node.id);
    if (ids.length === 0) break;
    for (const id of ids) {
      await gql(
        "/graphql",
        `mutation ($id: UUID!) { updateOpportunity(idToUpdate: $id, input: { stage: LOST }) { id } }`,
        { id }
      );
      moved++;
    }
    console.log(`  ${moved}/${n}`);
  }
  console.log(`moved ${moved} deals into "Проиграно"`);
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
