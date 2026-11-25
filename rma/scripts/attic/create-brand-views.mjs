// Per-company views in the rental instance.
//
// The rental instance holds Cardiwan, EasyRent and ETM together — the owner's
// call, so Babek and Ali get one login each instead of two. That trade needs
// something in its place: a manager must still be able to see at a glance
// whose customer is whose. These views are that something.
//
// They are NOT a permission boundary and are not pretended to be: anyone in
// this instance can clear the filter. Row-level enforcement is a paid Twenty
// Enterprise feature — see the visibility design doc. This is navigation.
//
//   TWENTY_BASE_URL=http://localhost:3002 TWENTY_API_KEY=… node scripts/create-brand-views.mjs
//   … --commit   to write
//
// Idempotent: a view with the same name on the same object is left alone.
const COMMIT = process.argv.includes("--commit");
const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3002";
const KEY = (process.env.TWENTY_API_KEY ?? "").trim();
if (!KEY) throw new Error("set TWENTY_API_KEY");

const BRANDS = [
  { brand: "cardiwan", label: "Cardiwan", icon: "IconCar" },
  // ETM is the legal entity, EasyRent its brand — ONE company, shown under
  // both names so neither is a mystery. There is deliberately no separate ETM
  // view: a permanently empty tab named after a real company reads as lost
  // data, which is worse than no tab.
  { brand: "easyrent", label: "EasyRent (ETM)", icon: "IconKey" },
];

const OBJECTS = ["person", "opportunity", "company"];

async function gql(endpoint, query, variables = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  // Wide on purpose: Twenty puts the useful part of a validation failure
  // (which operands a field type actually accepts) near the end of the blob.
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 1200));
  return body.data;
}

async function metadata() {
  const d = await gql(
    "/metadata",
    `{ objects(paging: { first: 200 }) {
         edges { node {
           id nameSingular
           fields(paging: { first: 300 }) { edges { node { id name } } }
         } }
       } }`
  );
  const out = {};
  for (const e of d.objects.edges) {
    const node = e.node;
    if (!OBJECTS.includes(node.nameSingular)) continue;
    const brandField = node.fields.edges
      .map((f) => f.node)
      .find((f) => f.name === "brandLine");
    if (brandField) out[node.nameSingular] = { objectId: node.id, brandFieldId: brandField.id };
  }
  return out;
}

async function existingViews() {
  const d = await gql(
    "/metadata",
    `{ getViews { id name objectMetadataId viewFilters { id } } }`
  );
  return d.getViews ?? [];
}

/**
 * A view without its filter shows EVERYTHING under a company's name — worse
 * than no view at all, because it looks authoritative. Creating the view and
 * creating its filter are two calls, so the first can land and the second
 * fail (it did: the operand enum wants IS, not is). Existing views are
 * therefore checked for a filter, not just for existence.
 */
async function addFilter(viewId, brandFieldId, brand) {
  await gql(
    "/metadata",
    `mutation ($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id } }`,
    {
      input: {
        viewId,
        fieldMetadataId: brandFieldId,
        // TEXT fields do not accept IS — Twenty offers CONTAINS for them. The
        // three brand values share no substring, so CONTAINS is exact here.
        operand: "CONTAINS",
        value: brand,
      },
    }
  );
}

async function main() {
  console.log(`[create-brand-views] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} base=${BASE}`);
  const meta = await metadata();
  const found = Object.keys(meta);
  console.log("objects with a brand field:", found.join(", ") || "(none)");
  if (found.length === 0) throw new Error("no brandLine field anywhere — wrong instance?");

  const views = await existingViews();
  let made = 0;

  for (const objectName of found) {
    const { objectId, brandFieldId } = meta[objectName];
    for (const { brand, label, icon } of BRANDS) {
      const name = label;
      const existing = views.find(
        (v) => v.name === name && v.objectMetadataId === objectId
      );

      if (existing && (existing.viewFilters ?? []).length > 0) {
        console.log(`  ${objectName}: "${name}" already filtered`);
        continue;
      }
      if (!COMMIT) {
        console.log(
          existing
            ? `  ${objectName}: would ADD the missing filter to "${name}" (brandLine = ${brand})`
            : `  ${objectName}: would create "${name}" (brandLine = ${brand})`
        );
        continue;
      }

      if (existing) {
        await addFilter(existing.id, brandFieldId, brand);
        console.log(`  ${objectName}: repaired "${name}" — filter added (brandLine = ${brand})`);
        made++;
        continue;
      }

      const created = await gql(
        "/metadata",
        `mutation ($input: CreateViewInput!) { createView(input: $input) { id name } }`,
        { input: { name, objectMetadataId: objectId, icon, type: "TABLE" } }
      );
      await addFilter(created.createView.id, brandFieldId, brand);
      console.log(`  ${objectName}: created "${name}" (brandLine = ${brand})`);
      made++;
    }
  }

  if (!COMMIT) console.log("\ndry run — nothing written. Re-run with --commit.");
  else console.log(`\ncreated ${made} views`);
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
