/**
 * create-promo-view.mjs — the "Won — for promo" segment on the RENTAL instance.
 *
 * Babek, 2026-08-07: «Или складывать успешные лиды в категорию, чтобы потом
 * слать промо.» This is that category — a saved view of the deals that closed
 * successfully, so the desk has a list to work from.
 *
 *   TWENTY_BASE_URL=http://localhost:3002 TWENTY_API_KEY=<rental key> \
 *     node scripts/create-promo-view.mjs           # dry run
 *   … --commit                                     # writes
 *
 * Then give it columns (it is created without any, like every Twenty view):
 *   node scripts/fix-brand-view-columns.mjs --commit
 * and flush: docker exec twenty-rental-server-1 sh -c 'yarn command:prod cache:flush'
 *            docker restart twenty-rental-server-1
 *
 * ── DELIBERATELY NOT A CAMPAIGN ─────────────────────────────────────────────
 * This builds a LIST and stops there. No bulk sending is wired to it and none
 * should be: blasting WhatsApp gets the number banned, and Moe's line is
 * already banned and dark from exactly that. Whoever runs a promo works this
 * list by hand, or through a channel that permits broadcast.
 *
 * ── THE FILTER SHAPE, AND WHY THERE IS A psql STEP ──────────────────────────
 * A SELECT filter is ONE viewFilter row whose value is a JSON ARRAY of option
 * values — `["COMPLETED"]`. One row per value, or a bare string instead of an
 * array, and the view does not filter.
 *
 * The metadata API cannot express that: `CreateViewFilterInput.value` is a
 * String, so whatever is sent lands in the jsonb column as a QUOTED STRING —
 * `"[\"COMPLETED\"]"`, measured here on 2026-08-07. That is correct for the
 * TEXT/CONTAINS brand filters next door and wrong for a SELECT. The value is
 * therefore normalised straight in the DB afterwards, the same way
 * fix-brand-view-columns.mjs reaches past the API for viewField rows.
 *
 * Idempotent: an existing view of the same name that already has a correctly
 * shaped filter is left alone; a missing or mis-shaped filter is repaired.
 */
import { execFileSync } from "child_process";

const COMMIT = process.argv.includes("--commit");
const BASE = process.env.TWENTY_BASE_URL ?? "http://localhost:3002";
const KEY = (process.env.TWENTY_API_KEY ?? "").trim();
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";
if (!KEY) throw new Error("set TWENTY_API_KEY (the RENTAL key — the sales key 401s here)");

const psql = (sql) =>
  execFileSync(
    "docker",
    ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-c", sql],
    { encoding: "utf8", maxBuffer: 1 << 24 }
  ).trim();

const VIEW_NAME = "Won — for promo";
/** Must match stageVocabulary("rental").won in src/…/twenty/stages.ts. */
const WON_STAGE = "COMPLETED";

async function gql(query, variables = {}) {
  const res = await fetch(`${BASE}/metadata`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors).slice(0, 1200));
  return body.data;
}

async function main() {
  console.log(`[promo-view] mode=${COMMIT ? "COMMIT" : "DRY-RUN"} base=${BASE}`);

  const meta = await gql(
    `{ objects(paging: { first: 200 }) {
         edges { node { id nameSingular
           fields(paging: { first: 300 }) { edges { node { id name options } } } } } } }`
  );
  const opportunity = meta.objects.edges
    .map((e) => e.node)
    .find((n) => n.nameSingular === "opportunity");
  if (!opportunity) throw new Error("no opportunity object — wrong instance?");
  const stage = opportunity.fields.edges.map((f) => f.node).find((f) => f.name === "stage");
  if (!stage) throw new Error("opportunity has no stage field");

  // Fail loudly rather than create a view filtered on a value the board does
  // not have — that renders as an empty tab and reads as lost data.
  const values = (stage.options ?? []).map((o) => o.value);
  if (!values.includes(WON_STAGE)) {
    throw new Error(
      `stage has no "${WON_STAGE}" option (has: ${values.join(", ") || "none"}). ` +
        `Run scripts/rental-stage-funnel.ts first.`
    );
  }

  const views = (await gql(`{ getViews { id name objectMetadataId viewFilters { id } } }`)).getViews ?? [];
  const existing = views.find((v) => v.name === VIEW_NAME && v.objectMetadataId === opportunity.id);

  // "Has a filter" is not enough — a filter of the wrong SHAPE silently shows
  // every deal under a name that promises only the won ones.
  const shapeOk =
    existing &&
    psql(
      `select jsonb_typeof(value) from core."viewFilter" ` +
        `where "viewId" = '${existing.id}' and "fieldMetadataId" = '${stage.id}' and "deletedAt" is null limit 1`
    ) === "array";

  if (shapeOk) {
    console.log(`[promo-view] "${VIEW_NAME}" already exists with a correct array filter — nothing to do`);
    return;
  }
  if (!COMMIT) {
    console.log(
      existing
        ? `[promo-view] would REPAIR the filter on "${VIEW_NAME}" (stage IS ["${WON_STAGE}"])`
        : `[promo-view] would create "${VIEW_NAME}" (stage IS ["${WON_STAGE}"])`
    );
    console.log("dry run — nothing written. Re-run with --commit.");
    return;
  }

  const viewId =
    existing?.id ??
    (
      await gql(
        `mutation ($input: CreateViewInput!) { createView(input: $input) { id } }`,
        { input: { name: VIEW_NAME, objectMetadataId: opportunity.id, icon: "IconTrophy", type: "TABLE" } }
      )
    ).createView.id;

  const hasFilter =
    psql(
      `select count(*) from core."viewFilter" ` +
        `where "viewId" = '${viewId}' and "fieldMetadataId" = '${stage.id}' and "deletedAt" is null`
    ) !== "0";

  if (!hasFilter) {
    await gql(
      `mutation ($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id } }`,
      { input: { viewId, fieldMetadataId: stage.id, operand: "IS", value: JSON.stringify([WON_STAGE]) } }
    );
  }
  // The shape the API cannot produce — see the header note.
  psql(
    `update core."viewFilter" set value = '${JSON.stringify([WON_STAGE])}'::jsonb, ` +
      `operand = 'IS', "updatedAt" = now() ` +
      `where "viewId" = '${viewId}' and "fieldMetadataId" = '${stage.id}' and "deletedAt" is null`
  );
  const kind = psql(
    `select jsonb_typeof(value) from core."viewFilter" ` +
      `where "viewId" = '${viewId}' and "fieldMetadataId" = '${stage.id}' and "deletedAt" is null limit 1`
  );
  if (kind !== "array") throw new Error(`filter value is ${kind}, expected array`);

  console.log(`[promo-view] ${existing ? "repaired" : "created"} "${VIEW_NAME}" — stage IS ["${WON_STAGE}"] (jsonb array)`);
  console.log("[promo-view] next: node scripts/fix-brand-view-columns.mjs --commit, then cache:flush + restart");
}

main().catch((e) => {
  console.error(String(e.message ?? e));
  process.exit(1);
});
