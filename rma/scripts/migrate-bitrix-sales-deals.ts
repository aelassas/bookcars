// migrate-bitrix-sales-deals.ts — Bitrix24 → Twenty (SALES) open-deals migration.
//
// Pulls the OPEN deals of the two sales pipelines — cat 0 "Primary processing"
// and cat 6 "Sales department" (Отдел Продаж) — off the take-auto Bitrix
// portal and re-creates them as proper pipeline cards on the sales Twenty
// (localhost:3001): primaryStage / salesStage, owner, amount, phoneTail9,
// externalId `bitrix-deal:<ID>`, externalSource 'bitrix24', comments as a
// note. The 1,788 "husk" cards from the old naive mirror are archived
// separately (--archive-husks).
//
// DRY-RUN BY DEFAULT; --commit writes.
//
//   npx tsx scripts/migrate-bitrix-sales-deals.ts                     # dry-run
//   npx tsx scripts/migrate-bitrix-sales-deals.ts --commit            # write cards
//   npx tsx scripts/migrate-bitrix-sales-deals.ts --archive-husks     # dry-run husk count
//   npx tsx scripts/migrate-bitrix-sales-deals.ts --archive-husks --commit
//   npx tsx scripts/migrate-bitrix-sales-deals.ts --ensure-sb-option  # add SENT_TO_SB only
//   npx tsx scripts/migrate-bitrix-sales-deals.ts --source db         # force archive source
//
// SOURCE: the Bitrix REST API when it answers; the portal currently rejects
// EVERY method with ACCESS_DENIED "Исчерпан выделенный дисковый ресурс"
// (self-hosted disk quota, observed 2026-09-16), so the script falls back to
// the mycrm archive (deal table, last synced 2026-09-13) with a loud banner.
// The archive has no category column, so deals sitting in a stage name that
// exists in BOTH pipelines ("Новая заявка", "Выявление потребности") are
// classified by the OWNER'S TEAM and counted as ambiguous in the report.
//
// IDEMPOTENT: cards key on externalId `bitrix-deal:<ID>`; a re-run after
// --commit skips every already-imported deal and writes nothing.
import { execSync } from "node:child_process";
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { createBitrix24Client, type Bitrix24Client } from "@/platform/integrations/bitrix24/client";
import { createStageCatalog } from "@/platform/integrations/bitrix24/mappings";
import { getTwentyClient, type TwentyClient } from "@/platform/integrations/twenty/client";
import {
  buildNoteBody,
  classifyStage,
  decideDedupe,
  matchOwner,
  phoneTail9,
  SALES_MEMBERS,
  type ExistingCard,
} from "@/platform/integrations/bitrix24/sales-deal-migration";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const ARCHIVE_HUSKS = args.includes("--archive-husks");
const ENSURE_SB_OPTION = args.includes("--ensure-sb-option");
const sourceIdx = args.indexOf("--source");
const sourceArg = sourceIdx >= 0 ? (args[sourceIdx + 1] ?? "auto") : "auto";
if (!["auto", "bitrix", "db"].includes(sourceArg)) {
  console.error(`unknown --source '${sourceArg}' (auto|bitrix|db)`);
  process.exit(1);
}

// Twenty workspace coordinates for the sales deployment (docker exec psql
// pattern from merge-wa-direct-notes.ts — used ONLY by --archive-husks).
const SALES_DB_CONTAINER = "twenty-db-1";
const SALES_SCHEMA = "workspace_8fj54z04p0s0zrognxhkd2f0a";

const NOTE_TITLE = "Bitrix comments";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Deal shape both sources normalize into ─────────────────────────────────

interface MigrationDeal {
  bitrixId: string;
  title: string;
  stageName: string | null;
  /** Bitrix CATEGORY_ID; null when the source (mycrm archive) lost it. */
  categoryId: string | null;
  ownerName: string | null;
  valueAed: number | null;
  phone: string | null;
  comments: string | null;
}

// ─── Bitrix source ──────────────────────────────────────────────────────────

interface CategoryInfo {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

async function discoverCategories(bx: Bitrix24Client): Promise<CategoryInfo[]> {
  let cats: { id: string; name: string }[] = [];
  try {
    const res = await bx.call<{ categories?: { id: string | number; name: string }[] }>("crm.category.list", {
      entityTypeId: 2,
    });
    cats = (res.result?.categories ?? []).map((c) => ({ id: String(c.id), name: c.name }));
  } catch {
    cats = [];
  }
  if (cats.length === 0) {
    for await (const c of bx.listAll<{ ID: string; NAME: string }>("crm.dealcategory.list")) {
      cats.push({ id: String(c.ID), name: c.NAME });
    }
  }
  if (!cats.some((c) => c.id === "0")) cats.unshift({ id: "0", name: "(general / Primary processing)" });

  const out: CategoryInfo[] = [];
  for (const c of cats) {
    const entityId = c.id === "0" ? "DEAL_STAGE" : `DEAL_STAGE_${c.id}`;
    const res = await bx.call<Record<string, { STATUS_ID: string; NAME: string; SORT?: string }>>(
      "crm.status.list",
      { order: { SORT: "ASC" }, filter: { ENTITY_ID: entityId } }
    );
    const stages = Object.values(res.result ?? {})
      .sort((a, b) => Number(a.SORT ?? 0) - Number(b.SORT ?? 0))
      .map((s) => ({ id: s.STATUS_ID, name: s.NAME }));
    out.push({ id: c.id, name: c.name, stages });
    await sleep(500); // Bitrix politeness, ~2 req/s
  }
  return out;
}

/** Category ids whose stage list contains ≥2 names of one expected pipeline. */
const EXPECTED_PRIMARY = ["Новая заявка", "Заявки без ответа", "Выявление потребности", "Повторное касание 1", "Повторное касание 2"];
const EXPECTED_SALES = ["Выявление потребности", "КП отправлено", "Прогрев КП", "Встреча назначена", "Встреча проведена", "Одобрено СБ"];

function pipelineHits(cat: CategoryInfo, expected: string[]): number {
  const names = new Set(cat.stages.map((s) => s.name));
  return expected.filter((n) => names.has(n)).length;
}

async function pullFromBitrix(bx: Bitrix24Client): Promise<{ deals: MigrationDeal[]; categories: CategoryInfo[] }> {
  const categories = await discoverCategories(bx);
  console.log("\n== DISCOVERY: deal categories & stages (live Bitrix) ==");
  for (const c of categories) {
    const p = pipelineHits(c, EXPECTED_PRIMARY);
    const s = pipelineHits(c, EXPECTED_SALES);
    const tag = p >= 2 ? "PRIMARY processing" : s >= 2 ? "SALES department" : "(not a sales pipeline — skipped)";
    console.log(`category ${c.id} "${c.name}" → ${tag}`);
    for (const st of c.stages) console.log(`    ${st.id}  ${st.name}`);
  }
  const wanted = categories.filter((c) => pipelineHits(c, EXPECTED_PRIMARY) >= 2 || pipelineHits(c, EXPECTED_SALES) >= 2);
  if (wanted.length !== 2) {
    console.warn(`!! expected exactly 2 sales pipelines, matched ${wanted.length} — check the table above`);
  }

  const catalog = createStageCatalog(bx);
  const ownerCache = new Map<string, string | null>();
  const contactCache = new Map<string, string | null>();

  async function ownerName(id: string | number | undefined): Promise<string | null> {
    const key = String(id ?? "");
    if (!key || key === "0") return null;
    if (ownerCache.has(key)) return ownerCache.get(key)!;
    let name: string | null = null;
    try {
      const res = await bx.call<{ NAME?: string; LAST_NAME?: string }[]>("user.get", { ID: key });
      const u = (res.result ?? [])[0];
      name = [u?.NAME, u?.LAST_NAME].filter(Boolean).join(" ") || null;
    } catch (e) {
      console.warn(`  [user.get ${key}] ${errMsg(e).slice(0, 120)}`);
    }
    ownerCache.set(key, name);
    await sleep(500);
    return name;
  }

  async function contactPhone(id: string | null): Promise<string | null> {
    if (!id) return null;
    if (contactCache.has(id)) return contactCache.get(id)!;
    let phone: string | null = null;
    try {
      const res = await bx.call<{ PHONE?: { VALUE?: string }[] }>("crm.contact.get", { ID: id });
      phone = res.result?.PHONE?.find((p) => p.VALUE)?.VALUE ?? null;
    } catch (e) {
      console.warn(`  [crm.contact.get ${id}] ${errMsg(e).slice(0, 120)}`);
    }
    contactCache.set(id, phone);
    await sleep(500);
    return phone;
  }

  const deals: MigrationDeal[] = [];
  for (const cat of wanted) {
    let n = 0;
    for await (const d of bx.listAll<{
      ID: string;
      TITLE?: string;
      STAGE_ID?: string;
      ASSIGNED_BY_ID?: string;
      CONTACT_ID?: string;
      OPPORTUNITY?: string;
      COMMENTS?: string;
    }>("crm.deal.list", { filter: { CATEGORY_ID: cat.id, STAGE_SEMANTIC_ID: "P" } })) {
      n++;
      const stageName = (await catalog.nameFor(cat.id, d.STAGE_ID)) ?? null;
      deals.push({
        bitrixId: String(d.ID),
        title: d.TITLE || `BX-${d.ID}`,
        stageName,
        categoryId: cat.id,
        ownerName: await ownerName(d.ASSIGNED_BY_ID),
        valueAed: d.OPPORTUNITY ? Number(d.OPPORTUNITY) : null,
        phone: await contactPhone(d.CONTACT_ID != null ? String(d.CONTACT_ID) : null),
        comments: d.COMMENTS ?? null,
      });
    }
    console.log(`pulled ${n} open deals from category ${cat.id} "${cat.name}"`);
  }
  return { deals, categories };
}

// ─── mycrm archive source (fallback while the portal denies REST) ───────────

async function pullFromArchive(): Promise<MigrationDeal[]> {
  const url = (process.env.DATABASE_URL ?? "").replace(/^"|"$/g, "");
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    const res = await pool.query<{
      external_id: string;
      ref: string | null;
      stage_detail: string | null;
      value: number | null;
      owner_name: string | null;
      phone: string | null;
      source_comments: string | null;
      freshness: string;
    }>(
      `select d.external_id, d.ref, d.stage_detail, d.value,
              u.name as owner_name, c.phone, d.source_comments,
              (select max(d2.updated_at) from deal d2 join tenant t2 on t2.id = d2.tenant_id where t2.slug = 'take-auto') as freshness
         from deal d
         join tenant t on t.id = d.tenant_id
         left join "user" u on u.id = d.owner_id
         left join customer c on c.id = d.customer_id
        where t.slug = 'take-auto' and d.status = 'open'
        order by d.created_at`
    );
    if (res.rows.length > 0) {
      console.log(`[archive] mycrm deal table, last sync: ${res.rows[0].freshness}`);
    }
    return res.rows.map((r) => ({
      bitrixId: String(r.external_id),
      title: r.ref || `BX-${r.external_id}`,
      stageName: r.stage_detail,
      categoryId: null,
      ownerName: r.owner_name,
      valueAed: r.value != null ? Number(r.value) : null,
      phone: r.phone,
      comments: r.source_comments,
    }));
  } finally {
    await pool.end();
  }
}

// ─── Twenty side ────────────────────────────────────────────────────────────

interface TwentyOpp {
  id: string;
  name?: string;
  externalId?: string | null;
  externalSource?: string | null;
  phoneTail9?: string | null;
  stage?: string | null;
}

async function loadExistingCards(twenty: TwentyClient): Promise<{
  byExternalId: Set<string>;
  byTail9: Map<string, ExistingCard[]>;
  total: number;
}> {
  const byExternalId = new Set<string>();
  const byTail9 = new Map<string, ExistingCard[]>();
  let total = 0;
  // REST list hides soft-deleted rows, so everything seen here is live.
  for await (const o of twenty.listAll<TwentyOpp>("opportunities")) {
    total++;
    if (o.externalId) byExternalId.add(o.externalId);
    if (o.phoneTail9) {
      const list = byTail9.get(o.phoneTail9) ?? [];
      list.push({ externalSource: o.externalSource, stage: o.stage });
      byTail9.set(o.phoneTail9, list);
    }
  }
  return { byExternalId, byTail9, total };
}

interface GqlSelectOption {
  id: string;
  value: string;
  label: string;
  color?: string;
  position: number;
}
interface GqlObjectsData {
  objects: {
    edges: {
      node: {
        nameSingular: string;
        fields: { edges: { node: { id: string; name: string; options?: GqlSelectOption[] } }[] };
      };
    }[];
  };
}

/** Add SENT_TO_SB to opportunity.salesStage via updateOneField — the metadata
 *  API rewrites the Postgres enum AND fieldMetadata.options together; never
 *  SQL on enums (the 2026-09-01 lesson). Idempotent. */
async function ensureSentToSbOption(twenty: TwentyClient, write: boolean): Promise<void> {
  void twenty; // the GraphQL metadata endpoint needs raw fetch (client has no gql-for-fields helper)
  const res = await fetch(`${process.env.TWENTY_BASE_URL?.trim() || "http://localhost:3001"}/metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(process.env.TWENTY_API_KEY ?? "").trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{ objects(paging: { first: 200 }) {
        edges { node { nameSingular fields(paging: { first: 200 }) { edges { node { id name type options } } } } }
      } }`,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await res.json()) as { data?: GqlObjectsData; errors?: unknown };
  if (body.errors) throw new Error(`metadata query failed: ${JSON.stringify(body.errors).slice(0, 300)}`);
  const opp = body.data!.objects.edges.find((e) => e.node.nameSingular === "opportunity");
  const field = opp?.node.fields.edges.map((e) => e.node).find((f) => f.name === "salesStage");
  if (!field) throw new Error("opportunity.salesStage field not found");
  const options = field.options ?? [];
  console.log(`salesStage options now: ${options.map((o) => o.value).join(" | ")}`);
  if (options.some((o) => o.value === "SENT_TO_SB")) {
    console.log("SENT_TO_SB already present — nothing to add");
    return;
  }
  if (!write) {
    console.log(`would ADD salesStage option SENT_TO_SB ("Sent to security (SB)") at position ${options.length}`);
    return;
  }
  // updateOneField REPLACES the options array — send every existing option
  // back verbatim so no record is orphaned (add-returning-lead-stage.mjs).
  const next = [
    ...options.map((o) => ({ id: o.id, value: o.value, label: o.label, color: o.color, position: o.position })),
    { id: crypto.randomUUID(), value: "SENT_TO_SB", label: "Sent to security (SB)", color: "orange", position: options.length },
  ];
  const up = await fetch(`${process.env.TWENTY_BASE_URL?.trim() || "http://localhost:3001"}/metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(process.env.TWENTY_API_KEY ?? "").trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `mutation ($input: UpdateOneFieldMetadataInput!) { updateOneField(input: $input) { id name } }`,
      variables: { input: { id: field.id, update: { options: next } } },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const upBody = (await up.json()) as { errors?: { message?: string }[] };
  if (upBody.errors?.length) throw new Error(`updateOneField failed: ${JSON.stringify(upBody.errors).slice(0, 300)}`);
  console.log(`ADDED salesStage option SENT_TO_SB at position ${options.length}`);
}

// ─── Husk archiving (soft-delete ONLY — Twenty REST DELETE destroys) ────────

function psql(container: string, sql: string): string {
  return execSync(`docker exec -i ${container} psql -U postgres -d default -t -A -v ON_ERROR_STOP=1`, {
    input: sql,
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
  }).trim();
}

async function archiveHusks(): Promise<void> {
  console.log(COMMIT ? "MODE: --archive-husks --commit" : "MODE: --archive-husks DRY-RUN (pass --commit to write)");
  const where = `"externalSource" = 'bitrix24' and ("externalId" is null or "externalId" not like 'bitrix-deal:%') and "deletedAt" is null`;
  const count = Number(psql(SALES_DB_CONTAINER, `select count(*) from ${SALES_SCHEMA}.opportunity where ${where};`));
  const byStage = psql(
    SALES_DB_CONTAINER,
    `select stage::text, count(*) from ${SALES_SCHEMA}.opportunity where ${where} group by stage order by count(*) desc;`
  );
  console.log(`husks matching (externalSource='bitrix24', externalId NOT LIKE 'bitrix-deal:%', not deleted): ${count}`);
  console.log("by stock stage:");
  console.log(byStage.split("\n").map((l) => `  ${l}`).join("\n"));
  if (!COMMIT) {
    console.log(`DRY-RUN — would set deletedAt=now() on ${count} opportunities. Nothing written.`);
    return;
  }
  psql(
    SALES_DB_CONTAINER,
    `begin;\nupdate ${SALES_SCHEMA}.opportunity set "deletedAt" = now() where ${where};\ncommit;`
  );
  const after = Number(psql(SALES_DB_CONTAINER, `select count(*) from ${SALES_SCHEMA}.opportunity where ${where};`));
  console.log(`archived ${count - after} opportunities (remaining: ${after})`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (ARCHIVE_HUSKS) {
    await archiveHusks();
    return;
  }

  console.log(COMMIT ? "MODE: --commit (writes enabled)" : "MODE: DRY-RUN (no writes; pass --commit to write)");

  const twenty = getTwentyClient(); // sales deployment (default, :3001)
  if (twenty.mode !== "live") {
    throw new Error("Twenty sales client is MOCK — set TWENTY_API_KEY. Refusing to run against a mock.");
  }

  // ── 0. salesStage option SENT_TO_SB (metadata write; approved standalone) ──
  await ensureSentToSbOption(twenty, COMMIT || ENSURE_SB_OPTION);
  if (ENSURE_SB_OPTION && !COMMIT) return;

  // ── 1. Pull deals ──────────────────────────────────────────────────────────
  let deals: MigrationDeal[] = [];
  let source: "bitrix" | "db" = "db";
  if (sourceArg !== "db") {
    const bxUrl = process.env.BITRIX24_WEBHOOK_URL;
    if (!bxUrl) throw new Error("BITRIX24_WEBHOOK_URL not set");
    const bx = createBitrix24Client(bxUrl);
    try {
      const pulled = await pullFromBitrix(bx);
      deals = pulled.deals;
      source = "bitrix";
    } catch (e) {
      if (sourceArg === "bitrix") throw e;
      console.warn(`\n!! Bitrix REST unusable (${errMsg(e).slice(0, 160)})`);
      console.warn("!! FALLING BACK to the mycrm archive — categories inferred, ambiguous stages resolved by owner team\n");
    }
  }
  if (source === "db") {
    deals = await pullFromArchive();
    console.log("\n== DISCOVERY (archive mode — stage names as stored, no live categories) ==");
    console.log('pipeline "Primary processing" (cat 0): Новая заявка / Заявки без ответа / Выявление потребности / Повторное касание 1 / Повторное касание 2');
    console.log('pipeline "Sales department" (cat 6): Выявление потребности / КП отправлено / Прогрев КП / Встреча назначена / Встреча проведена / Отправил на СБ / Одобрено СБ');
  }
  console.log(`\nsource=${source} — ${deals.length} open deals`);

  // ── 2. Existing Twenty cards (one pass; REST hides soft-deleted) ──────────
  const existing = await loadExistingCards(twenty);
  console.log(`twenty sales: ${existing.total} live opportunities indexed (${existing.byExternalId.size} with externalId)`);

  // ── 3. Plan + (maybe) write ────────────────────────────────────────────────
  const perStage = new Map<string, number>();
  const stats = {
    create: 0,
    alreadyImported: 0,
    liveCard: 0,
    unmappedStage: 0,
    ambiguous: 0,
    ownerMatched: 0,
    ownerUnmatched: 0,
    withPhone: 0,
    withNote: 0,
    withAmount: 0,
    errors: 0,
  };
  const unmatchedOwners = new Map<string, number>();
  const unmappedStages = new Map<string, number>();

  for (const deal of deals) {
    const memberKey = matchOwner(deal.ownerName);
    const member = memberKey ? SALES_MEMBERS[memberKey] : null;
    const classification = classifyStage(deal.stageName, {
      categoryId: deal.categoryId,
      ownerTeam: member?.team ?? null,
    });

    if (!classification) {
      stats.unmappedStage++;
      const key = deal.stageName ?? "<empty>";
      unmappedStages.set(key, (unmappedStages.get(key) ?? 0) + 1);
      console.log(`  SKIP stage  bitrix-deal:${deal.bitrixId} "${deal.title}" stage="${key}" — outside both pipelines`);
      continue;
    }
    if (classification.ambiguous) stats.ambiguous++;
    const stageLabel = `${classification.pipeline}:${classification.value}${classification.ambiguous ? " (by owner team)" : ""}`;
    perStage.set(stageLabel, (perStage.get(stageLabel) ?? 0) + 1);

    if (member) stats.ownerMatched++;
    else {
      stats.ownerUnmatched++;
      const key = deal.ownerName ?? "<none>";
      unmatchedOwners.set(key, (unmatchedOwners.get(key) ?? 0) + 1);
    }

    const tail9 = phoneTail9(deal.phone);
    if (tail9) stats.withPhone++;
    const externalId = `bitrix-deal:${deal.bitrixId}`;
    const decision = decideDedupe({ externalId, tail9 }, existing);
    if (decision === "already-imported") {
      stats.alreadyImported++;
      console.log(`  SKIP dupe   ${externalId} — card exists`);
      continue;
    }
    if (decision === "live-card") {
      stats.liveCard++;
      console.log(`  SKIP live   ${externalId} "${deal.title}" tail9=${tail9} — open relay card exists`);
      continue;
    }

    const note = buildNoteBody(deal.comments);
    if (note) stats.withNote++;
    if (deal.valueAed && deal.valueAed > 0) stats.withAmount++;

    const body: Record<string, unknown> = {
      name: deal.title,
      externalId,
      externalSource: "bitrix24",
    };
    if (classification.pipeline === "primary") body.primaryStage = classification.value;
    else body.salesStage = classification.value;
    if (member) body.ownerId = member.twentyId;
    if (tail9) body.phoneTail9 = tail9;
    if (deal.valueAed && deal.valueAed > 0) {
      body.amount = { amountMicros: Math.round(deal.valueAed * 1_000_000), currencyCode: "AED" };
    }

    const desc = `${externalId} "${deal.title}" [${stageLabel}] owner=${memberKey ?? "none"}${tail9 ? ` tail9=${tail9}` : ""}${deal.valueAed ? ` aed=${deal.valueAed}` : ""}${note ? " +note" : ""}`;
    if (!COMMIT) {
      console.log(`  would CREATE ${desc}`);
      stats.create++;
      continue;
    }
    try {
      const res = await twenty.post("opportunities", body);
      const created = (res as { data?: Record<string, { id?: string } | undefined> })?.data ?? {};
      const oppId = Object.values(created).find((v) => v && typeof v === "object" && v.id)?.id;
      console.log(`  CREATE ${desc}${oppId ? ` → ${oppId}` : ""}`);
      if (note && oppId) {
        const notes = await twenty.batchCreate<{ id?: string }>("notes", [
          { title: NOTE_TITLE, bodyV2: { markdown: note, blocknote: null } },
        ]);
        const noteId = notes[0]?.id;
        if (noteId) {
          await twenty.batchCreate("noteTargets", [{ noteId, targetOpportunityId: oppId }]);
        }
      }
      // Intra-run idempotency: a deal we just wrote must dedupe as imported.
      existing.byExternalId.add(externalId);
      stats.create++;
    } catch (e) {
      stats.errors++;
      console.error(`  ERROR ${externalId} "${deal.title}": ${errMsg(e).slice(0, 300)}`);
    }
  }

  // ── 4. Report ──────────────────────────────────────────────────────────────
  console.log("\n== REPORT ==");
  console.log(`source: ${source}`);
  console.log("per pipeline stage:");
  for (const [s, n] of [...perStage.entries()].sort()) console.log(`  ${s}: ${n}`);
  const ownerTotal = stats.ownerMatched + stats.ownerUnmatched;
  console.log(
    `owner match: ${stats.ownerMatched}/${ownerTotal} (${ownerTotal ? Math.round((stats.ownerMatched / ownerTotal) * 100) : 0}%)`
  );
  if (unmatchedOwners.size) {
    console.log("unmatched owners:");
    for (const [n, c] of [...unmatchedOwners.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}: ${c}`);
  }
  if (unmappedStages.size) {
    console.log("unmapped stages (skipped):");
    for (const [s, c] of [...unmappedStages.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${c}`);
  }
  console.log(`ambiguous stage classifications (owner-team tiebreak): ${stats.ambiguous}`);
  console.log(
    `TOTALS: create=${stats.create} already-imported=${stats.alreadyImported} live-card-skip=${stats.liveCard} ` +
      `unmapped-stage=${stats.unmappedStage} with-phone=${stats.withPhone} with-note=${stats.withNote} ` +
      `with-amount=${stats.withAmount} errors=${stats.errors}${COMMIT ? "" : " (DRY-RUN — nothing written)"}`
  );
}

main().catch((e) => {
  console.error("FATAL:", errMsg(e));
  process.exit(1);
});
