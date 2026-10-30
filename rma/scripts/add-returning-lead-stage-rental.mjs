// Add a "Returning Lead" stage to the RENTAL opportunity funnel (idempotent).
//
// The stage column is a Postgres enum, so the option MUST be added through the
// metadata API (updateOneField alters the enum AND keeps fieldMetadata.options
// in sync) — never by hand in the DB. Same mechanics as the sales
// add-returning-lead-stage.mjs, retargeted to rental (:3002, TWENTY_RENTAL_*).
//
// Why: the 2026-08-25/26 rental meetings require that a NEW opportunity created
// for a person who already has a closed (Successful/Lost) opportunity is
// auto-staged as "Returning Lead" so the agent sees the prior history instead
// of a cold lead (see src/platform/notify/rental-automations.ts).
//
// DRY-RUN BY DEFAULT. Pass --commit to write.
//   node scripts/add-returning-lead-stage-rental.mjs
//   node scripts/add-returning-lead-stage-rental.mjs --commit
import { readFileSync } from "node:fs";

const COMMIT = process.argv.includes("--commit");
const BASE = process.env.TWENTY_RENTAL_BASE_URL ?? "http://localhost:3002";

const OPTION = {
  value: "RETURNING_LEAD",
  label: "Returning Lead",
  color: "turquoise",
};

function apiKey() {
  if (process.env.TWENTY_RENTAL_API_KEY?.trim()) return process.env.TWENTY_RENTAL_API_KEY.trim();
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = env.split("\n").find((l) => l.startsWith("TWENTY_RENTAL_API_KEY="));
  if (!line) throw new Error("TWENTY_RENTAL_API_KEY missing from .env.local");
  return line.slice("TWENTY_RENTAL_API_KEY=".length).trim().replace(/^"|"$/g, "");
}

const KEY = apiKey();

async function gql(query, variables = {}) {
  const res = await fetch(`${BASE}/metadata`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 400));
  return body.data;
}

async function main() {
  console.log(`[add-returning-lead-stage-rental] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} base=${BASE}`);

  const d = await gql(
    `{ objects(paging: { first: 200 }) {
         edges { node { nameSingular fields(paging: { first: 200 }) { edges { node { id name type options } } } } }
       } }`
  );
  const opp = d.objects.edges.find((e) => e.node.nameSingular === "opportunity");
  if (!opp) throw new Error("opportunity object not found");
  const field = opp.node.fields.edges.map((e) => e.node).find((f) => f.name === "stage");
  if (!field) throw new Error("opportunity.stage field not found");

  const options = field.options ?? [];
  console.log("current stages:", options.map((o) => `${o.value}(${o.position})`).join(", "));

  if (options.some((o) => o.value === OPTION.value)) {
    console.log(`stage "${OPTION.value}" already exists — nothing to add`);
    return;
  }

  if (!COMMIT) {
    console.log(`would ADD stage ${OPTION.value} ("${OPTION.label}") at position ${options.length}`);
    return;
  }

  // updateOneField REPLACES the options array — every existing option is sent
  // back verbatim so no record is orphaned.
  const next = [
    ...options.map((o) => ({ id: o.id, value: o.value, label: o.label, color: o.color, position: o.position })),
    { ...OPTION, position: options.length, id: crypto.randomUUID() },
  ];
  await gql(
    `mutation ($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id name options } }`,
    { input: { id: field.id, update: { options: next } } }
  );
  console.log(`added stage ${OPTION.value} ("${OPTION.label}") at position ${options.length}`);
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
