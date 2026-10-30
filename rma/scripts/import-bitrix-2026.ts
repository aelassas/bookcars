// import-bitrix-2026.ts — active 2026 Bitrix book (deals + leads) → SALES Twenty.
//
// Moe's rule: import EVERYTHING active from 2026 — all tenants, deals AND
// leads; only "Сделка провалена"/"Сделка успешна" are excluded (they never
// reach the query: deal.status='open' only). This replaces Bitrix for the
// sales team, so cards must land in the views they work in:
//   primaryStage set  → "Primary processing" kanban (filter: IS_NOT_NULL)
//   salesStage set    → "Sales Department" kanban (grouped by it)
//   stage LOST        → "Archive" view (junk buckets: SPAM, rejections, …)
// Pure mapping/owner/note logic: integrations/bitrix24/bitrix-2026-import.ts
// (tested). Card conventions match the live bitrix24 cards already on the
// board (externalId `bitrix-deal:<id>` / `bitrix-lead:<id>`, externalSource
// 'bitrix24', bare customer-name title, no leadNumber — the sequence numbers
// new system leads only).
//
// DRY-RUN BY DEFAULT; --commit writes. Runs ON THE BOX from platform/ (the
// createdAt backdate uses docker exec psql, same pattern as
// migrate-bitrix-sales-deals.ts --archive-husks).
//
//   npx tsx scripts/import-bitrix-2026.ts                    # dry-run, full report
//   npx tsx scripts/import-bitrix-2026.ts --limit 5 --commit # probe
//   npx tsx scripts/import-bitrix-2026.ts --commit           # full import
//   npx tsx scripts/import-bitrix-2026.ts --only leads       # one entity
//
// IDEMPOTENT: externalId dedupe against live cards (incl. soft-delete-hidden
// check via REST, which hides deleted rows) + intra-run set; a re-run after
// --commit skips everything already imported. NEVER touches an existing row.
import { execSync } from "node:child_process";
import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { getTwentyClient, type TwentyClient } from "@/platform/integrations/twenty/client";
import {
  decideDedupe,
  matchOwner,
  phoneTail9,
  SALES_MEMBERS,
  type ExistingCard,
} from "@/platform/integrations/bitrix24/sales-deal-migration";
import {
  buildImportNoteBody,
  buildOpportunityBody,
  cardName,
  classifyDealStage,
  classifyLeadStage,
  dealExternalId,
  leadExternalId,
  resolveOwner,
  type ImportClassification,
} from "@/platform/integrations/bitrix24/bitrix-2026-import";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const onlyIdx = args.indexOf("--only");
const ONLY = onlyIdx >= 0 ? args[onlyIdx + 1] : "all";
if (!["all", "deals", "leads"].includes(ONLY)) {
  console.error(`unknown --only '${ONLY}' (all|deals|leads)`);
  process.exit(1);
}
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0;
const SINCE = "2026-01-01";

const SALES_DB_CONTAINER = "twenty-db-1";
const SALES_SCHEMA = "workspace_8fj54z04p0s0zrognxhkd2f0a";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function psql(sql: string): string {
  return execSync(`docker exec -i ${SALES_DB_CONTAINER} psql -U postgres -d default -t -A -v ON_ERROR_STOP=1`, {
    input: sql,
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
  }).trim();
}

// ─── Source rows ────────────────────────────────────────────────────────────

interface SourceRow {
  kind: "deal" | "lead";
  bitrixId: string; // trimmed external_id; empty = seed row, skipped
  title: string | null;
  customerName: string | null;
  phone: string | null;
  email?: string | null;
  stageName: string | null;
  ownerName: string | null;
  valueAed: number | null;
  carModels: string | null;
  lossReasonText: string | null;
  sourceLabel: string | null;
  notes: string | null;
  description: string | null;
  tenantSlug: string;
  createdAt: Date;
}

async function pullDeals(pool: Pool): Promise<SourceRow[]> {
  const res = await pool.query(
    `select d.external_id, d.ref, d.stage_detail, d.value, d.loss_reason,
            d.source_comments, d.source_description, d.car_models, d.created_at,
            u.name as owner_name, t.slug as tenant_slug,
            coalesce(nullif(l.phone, ''), c.phone) as phone,
            coalesce(nullif(l.customer_name, ''), c.name) as customer_name
       from deal d
       join tenant t on t.id = d.tenant_id
       left join "user" u on u.id = d.owner_id
       left join lead l on l.id = d.lead_id
       left join customer c on c.id = d.customer_id
      where d.created_at > $1 and d.status = 'open'
      order by d.created_at`,
    [SINCE]
  );
  return res.rows.map((r) => ({
    kind: "deal" as const,
    bitrixId: (r.external_id ?? "").trim(),
    title: r.ref,
    customerName: r.customer_name,
    phone: r.phone,
    stageName: r.stage_detail,
    ownerName: r.owner_name,
    valueAed: r.value != null ? Number(r.value) : null,
    carModels: r.car_models,
    lossReasonText: r.loss_reason,
    sourceLabel: null,
    notes: r.source_comments,
    description: r.source_description,
    tenantSlug: r.tenant_slug,
    createdAt: r.created_at,
  }));
}

async function pullLeads(pool: Pool): Promise<SourceRow[]> {
  const res = await pool.query(
    `select l.external_id, l.customer_name, l.phone, l.email, l.stage_detail,
            l.source, l.source_description, l.notes, l.created_at,
            u.name as owner_name, t.slug as tenant_slug
       from lead l
       join tenant t on t.id = l.tenant_id
       left join "user" u on u.id = l.assigned_to
      where l.created_at > $1
      order by l.created_at`,
    [SINCE]
  );
  const rows: SourceRow[] = res.rows.map((r) => ({
    kind: "lead" as const,
    bitrixId: (r.external_id ?? "").trim(),
    title: null,
    customerName: r.customer_name,
    phone: r.phone,
    email: r.email,
    stageName: r.stage_detail,
    ownerName: r.owner_name,
    valueAed: null,
    carModels: null,
    lossReasonText: null,
    sourceLabel: r.source,
    notes: r.notes,
    description: r.source_description,
    tenantSlug: r.tenant_slug,
    createdAt: r.created_at,
  }));
  // wa:* external ids recur (the lead table re-records a returning writer) —
  // keep the EARLIEST row per id, count the collapse.
  const seen = new Set<string>();
  let collapsed = 0;
  const out = rows.filter((r) => {
    if (!r.bitrixId) return true; // seeds — handled (and counted) downstream
    if (seen.has(r.bitrixId)) { collapsed++; return false; }
    seen.add(r.bitrixId);
    return true;
  });
  if (collapsed > 0) console.log(`[leads] collapsed ${collapsed} duplicate external_id rows (kept earliest)`);
  return out;
}

// ─── Existing Twenty cards ──────────────────────────────────────────────────

interface TwentyOpp {
  id: string;
  externalId?: string | null;
  externalSource?: string | null;
  phoneTail9?: string | null;
  stage?: string | null;
}

async function loadExistingCards(twenty: TwentyClient) {
  const byExternalId = new Set<string>();
  const byTail9 = new Map<string, ExistingCard[]>();
  let total = 0;
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

// ─── Main ───────────────────────────────────────────────────────────────────

interface PlannedCard {
  externalId: string;
  body: Record<string, unknown>;
  noteBody: string | null;
  noteTitle: string;
  createdAt: Date;
  reportLine: string;
}

async function main() {
  console.log(COMMIT ? "MODE: --commit (writes enabled)" : "MODE: DRY-RUN (no writes; pass --commit to write)");
  if (LIMIT > 0) console.log(`LIMIT: ${LIMIT} creates`);

  const twenty = getTwentyClient(); // sales deployment (default, :3001)
  if (twenty.mode !== "live") {
    throw new Error("Twenty sales client is MOCK — set TWENTY_API_KEY. Refusing to run against a mock.");
  }

  const url = (process.env.DATABASE_URL ?? "").replace(/^"|"$/g, "");
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url, max: 2 });

  let sources: SourceRow[] = [];
  try {
    if (ONLY !== "leads") sources.push(...(await pullDeals(pool)));
    if (ONLY !== "deals") sources.push(...(await pullLeads(pool)));
  } finally {
    await pool.end();
  }
  console.log(`source: ${sources.length} rows (deals+leads, since ${SINCE})`);

  const existing = await loadExistingCards(twenty);
  console.log(`twenty sales: ${existing.total} live opportunities indexed (${existing.byExternalId.size} with externalId)`);

  // ── Plan ──────────────────────────────────────────────────────────────────
  const perStage = new Map<string, number>();
  const perTenant = new Map<string, number>();
  const stats = {
    planned: 0, created: 0, alreadyImported: 0, liveCard: 0, seeds: 0,
    unmappedStage: 0, ambiguous: 0, ownerMatched: 0, ownerRoundRobin: 0,
    ownerFallbackMoe: 0, withNote: 0, errors: 0,
  };
  const unmappedStages = new Map<string, number>();
  const unmatchedOwners = new Map<string, number>();
  let rrCursor = 0;
  const planned: PlannedCard[] = [];

  for (const row of sources) {
    if (!row.bitrixId) {
      stats.seeds++; // demo-seed rows carry no Bitrix id — reported, never imported
      continue;
    }
    const externalId = row.kind === "deal" ? dealExternalId(row.bitrixId) : leadExternalId(row.bitrixId);
    // Owner team feeds the dual-pipeline tiebreak, so classify BEFORE resolving.
    const matchedKey = matchOwner(row.ownerName);
    const team = matchedKey ? SALES_MEMBERS[matchedKey].team : null;
    const classification: ImportClassification | null =
      row.kind === "deal" ? classifyDealStage(row.stageName, { ownerTeam: team }) : classifyLeadStage(row.stageName);
    if (!classification) {
      stats.unmappedStage++;
      const key = `${row.kind}:${row.stageName ?? "<empty>"}`;
      unmappedStages.set(key, (unmappedStages.get(key) ?? 0) + 1);
      continue;
    }
    if (classification.ambiguous) stats.ambiguous++;

    const tail9 = phoneTail9(row.phone);
    const decision = decideDedupe({ externalId, tail9 }, existing);
    if (decision === "already-imported") { stats.alreadyImported++; continue; }
    if (decision === "live-card") { stats.liveCard++; continue; }

    const { resolution, nextCursor } = resolveOwner(row.ownerName, classification.kind, rrCursor);
    rrCursor = nextCursor;
    if (resolution.via === "bitrix-owner") stats.ownerMatched++;
    else {
      if (resolution.via === "fallback-roundrobin") stats.ownerRoundRobin++;
      else stats.ownerFallbackMoe++;
      const key = row.ownerName ?? "<none>";
      unmatchedOwners.set(key, (unmatchedOwners.get(key) ?? 0) + 1);
    }

    const name = cardName({
      title: row.title,
      customerName: row.customerName,
      phone: row.phone,
      externalId,
    });
    const body = buildOpportunityBody({
      name,
      externalId,
      classification,
      ownerId: resolution.twentyId,
      stageDetail: (row.stageName ?? "").trim() || null,
      phoneTail9: tail9,
      valueAed: row.valueAed,
      carModels: row.carModels,
    });
    const noteTitle = row.kind === "deal" ? "Bitrix comments" : "Bitrix lead";
    // A note is created only for SUBSTANTIVE content — provenance (Bitrix id,
    // stage) already lives on the card as externalId/stageDetail, so a note
    // that repeats it is noise on 10k cards. Pure-numeric Bitrix source ids
    // ("19", "76") carry nothing a human can read either.
    const readableSource = row.sourceLabel && /[a-zA-Zа-яА-Я]/.test(row.sourceLabel) ? row.sourceLabel : null;
    const noteBody = buildImportNoteBody([
      [row.kind === "deal" ? "Bitrix comments" : "Notes", row.notes],
      ["Source", readableSource],
      ["Description", row.description],
      ["Loss reason (Bitrix)", row.lossReasonText],
      ["Email", row.email],
    ]);
    if (noteBody) stats.withNote++;

    const stageLabel =
      classification.kind === "lost"
        ? `LOST/${classification.lossReason}`
        : `${classification.kind}:${classification.value}${classification.ambiguous ? " (by owner team)" : ""}`;
    perStage.set(`${row.kind === "deal" ? "D" : "L"} ${stageLabel}`, (perStage.get(`${row.kind === "deal" ? "D" : "L"} ${stageLabel}`) ?? 0) + 1);
    perTenant.set(row.tenantSlug, (perTenant.get(row.tenantSlug) ?? 0) + 1);
    stats.planned++;
    planned.push({
      externalId,
      body,
      noteBody,
      noteTitle,
      createdAt: row.createdAt,
      reportLine: `${externalId} "${name}" [${stageLabel}] owner=${resolution.memberKey}(${resolution.via})${tail9 ? ` tail9=${tail9}` : ""}${row.valueAed ? ` aed=${row.valueAed}` : ""}`,
    });
  }

  const toCreate = LIMIT > 0 ? planned.slice(0, LIMIT) : planned;
  console.log(`\nplanned: ${stats.planned} creates${LIMIT > 0 ? ` (capped at ${toCreate.length})` : ""}`);
  if (!COMMIT) {
    for (const p of toCreate.slice(0, 40)) console.log(`  would CREATE ${p.reportLine}`);
    if (toCreate.length > 40) console.log(`  … and ${toCreate.length - 40} more`);
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  const createdExternalIds: { externalId: string; createdAt: Date }[] = [];
  if (COMMIT) {
    const CHUNK = 60;
    for (let i = 0; i < toCreate.length; i += CHUNK) {
      const chunk = toCreate.slice(i, i + CHUNK);
      let createdIds: string[] = [];
      try {
        const res = await twenty.batchCreate<{ id?: string }>("opportunities", chunk.map((c) => c.body));
        createdIds = res.map((r) => r?.id ?? "");
      } catch (e) {
        // One bad record must not sink 59 — fall back to per-record creates.
        console.warn(`  batch ${i / CHUNK + 1} failed (${errMsg(e).slice(0, 200)}) — retrying per-record`);
        for (const card of chunk) {
          try {
            const res = await twenty.post("opportunities", card.body);
            const data = (res as { data?: Record<string, { id?: string } | undefined> })?.data ?? {};
            createdIds.push(Object.values(data).find((v) => v && v.id)?.id ?? "");
          } catch (e2) {
            stats.errors++;
            createdIds.push("");
            console.error(`  ERROR ${card.externalId}: ${errMsg(e2).slice(0, 300)}`);
          }
        }
      }
      // Notes: one batch for the chunk, then noteTargets paired by position
      // (Twenty batch create answers in input order — verified by the sample
      // check after the run).
      const noteChunk = chunk
        .map((card, idx) => ({ card, oppId: createdIds[idx] }))
        .filter((x): x is { card: PlannedCard; oppId: string } => Boolean(x.oppId) && x.card.noteBody !== null);
      if (noteChunk.length > 0) {
        try {
          const notes = await twenty.batchCreate<{ id?: string }>(
            "notes",
            noteChunk.map((x) => ({
              title: x.card.noteTitle,
              bodyV2: { markdown: x.card.noteBody, blocknote: null },
            }))
          );
          const targets = noteChunk
            .map((x, idx) => ({ noteId: notes[idx]?.id, oppId: x.oppId }))
            .filter((t): t is { noteId: string; oppId: string } => Boolean(t.noteId))
            .map((t) => ({ noteId: t.noteId, targetOpportunityId: t.oppId }));
          if (targets.length > 0) await twenty.batchCreate("noteTargets", targets);
        } catch (e) {
          stats.errors++;
          console.error(`  ERROR notes for batch ${i / CHUNK + 1}: ${errMsg(e).slice(0, 300)}`);
        }
      }
      for (let j = 0; j < chunk.length; j++) {
        if (!createdIds[j]) continue;
        stats.created++;
        existing.byExternalId.add(chunk[j].externalId);
        createdExternalIds.push({ externalId: chunk[j].externalId, createdAt: chunk[j].createdAt });
      }
      console.log(`  wrote ${Math.min(i + CHUNK, toCreate.length)}/${toCreate.length}`);
    }

    // ── createdAt backdate: the customer clock, not import time. Only rows
    // THIS run created (their externalIds), never anything pre-existing. ──
    if (createdExternalIds.length > 0) {
      console.log(`\nbackdating createdAt on ${createdExternalIds.length} imported cards…`);
      const fmt = (d: Date) => d.toISOString();
      for (let i = 0; i < createdExternalIds.length; i += 500) {
        const slice = createdExternalIds.slice(i, i + 500);
        const values = slice
          .map((r) => `('${r.externalId.replace(/'/g, "''")}','${fmt(r.createdAt)}'::timestamptz)`)
          .join(",");
        psql(
          `update ${SALES_SCHEMA}.opportunity o set "createdAt" = v.ts
             from (values ${values}) as v(extid, ts)
            where o."externalId" = v.extid and o."deletedAt" is null;`
        );
      }
      console.log("createdAt backdate done");
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log("\n== REPORT ==");
  console.log("per target stage (D=deal, L=lead):");
  for (const [s, n] of [...perStage.entries()].sort()) console.log(`  ${s}: ${n}`);
  console.log("per tenant:");
  for (const [t, n] of [...perTenant.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${n}`);
  console.log(
    `owners: matched=${stats.ownerMatched} round-robin-fallback=${stats.ownerRoundRobin} moe-fallback=${stats.ownerFallbackMoe}`
  );
  if (unmatchedOwners.size) {
    console.log("unmatched Bitrix owners (fallback assigned):");
    for (const [n, c] of [...unmatchedOwners.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}: ${c}`);
  }
  if (unmappedStages.size) {
    console.log("UNMAPPED stages (NOT imported — fix the map and re-run):");
    for (const [s, c] of [...unmappedStages.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${c}`);
  }
  console.log(`ambiguous dual-pipeline classifications (owner-team tiebreak): ${stats.ambiguous}`);
  console.log(
    `TOTALS: planned=${stats.planned} created=${stats.created} already-imported=${stats.alreadyImported} ` +
      `live-card-skip=${stats.liveCard} seeds-skipped=${stats.seeds} unmapped-stage=${stats.unmappedStage} ` +
      `with-note=${stats.withNote} errors=${stats.errors}${COMMIT ? "" : " (DRY-RUN — nothing written)"}`
  );
}

main().catch((e) => {
  console.error("FATAL:", errMsg(e));
  process.exit(1);
});
