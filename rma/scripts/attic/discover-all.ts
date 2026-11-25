#!/usr/bin/env tsx
/**
 * Unified discovery script for TAKE Auto migration analysis.
 * Probes Bitrix24 + Kaiten and outputs a structured audit report.
 *
 * Usage:
 *   BITRIX24_WEBHOOK_URL="..." KAITEN_API_KEY="..." KAITEN_BASE_URL="..." \
 *   npx tsx scripts/discover-all.ts
 */

// ─── Config ────────────────────────────────────────────────────────────────

const BX_URL = process.env.BITRIX24_WEBHOOK_URL;
const KAITEN_KEY = process.env.KAITEN_API_KEY;
const KAITEN_BASE = (process.env.KAITEN_BASE_URL ?? "https://takeauto.kaiten.ru").replace(/\/$/, "");

// ─── Bitrix24 Client (inline for standalone run) ───────────────────────────

function bxUrl(method: string): string {
  const base = (BX_URL ?? "").replace(/\/$/, "");
  return `${base}/${method}.json`;
}

async function bxCall<T = unknown>(method: string, params?: Record<string, unknown>) {
  const res = await fetch(bxUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: params ? JSON.stringify(params) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ result?: T; error?: string; error_description?: string; total?: number; next?: number }>;
}

async function* bxList<T>(method: string, params?: Record<string, unknown>, pageSize = 50) {
  let start = 0;
  while (true) {
    const res = await bxCall<{ items?: T[] } & T[]>(method, { ...params, start, limit: pageSize });
    const items: T[] = Array.isArray(res.result) ? (res.result as T[]) : ((res.result as unknown) as { items?: T[] })?.items ?? [];
    for (const item of items) yield item;
    if (!res.next || items.length < pageSize) break;
    start = res.next;
  }
}

// ─── Kaiten Client ─────────────────────────────────────────────────────────

async function kaitenCall<T = unknown>(path: string, params?: Record<string, unknown>) {
  const url = new URL(path, KAITEN_BASE);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${KAITEN_KEY}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kaiten ${path} HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log("\n" + "=".repeat(70));
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

function section(title: string) {
  console.log("\n─── " + title + " " + "─".repeat(70 - title.length));
}

async function safeProbe<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    console.log(`  ⚠️  ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

// ─── Bitrix24 Probes ───────────────────────────────────────────────────────

async function probeBitrixProfile() {
  banner("BITRIX24");
  if (!BX_URL) {
    console.log("⚠️  BITRIX24_WEBHOOK_URL not set — skipping Bitrix24");
    return;
  }
  const profile = await bxCall("profile");
  if (profile.error) {
    console.log("❌ Bitrix24 failed:", profile.error);
    return;
  }
  console.log("✅ Connected:", JSON.stringify(profile.result));
}

async function probeBitrixEntities() {
  if (!BX_URL) return;
  section("CRM Entities");
  const entities = [
    ["crm.contact.list", "Contacts"],
    ["crm.company.list", "Companies"],
    ["crm.lead.list", "Leads"],
    ["crm.deal.list", "Deals"],
    ["crm.product.list", "Products"],
    ["crm.activity.list", "Activities"],
    ["tasks.task.list", "Tasks"],
    ["user.get", "Users"],
  ] as const;

  for (const [method, label] of entities) {
    const res = await safeProbe(label, async () => {
      const r = await bxCall(method, { limit: 1 });
      return r.total ?? 0;
    });
    if (res !== undefined) console.log(`  ${label}: ${res.toLocaleString()}`);
  }
}

async function probeBitrixPipelines() {
  if (!BX_URL) return;
  section("Deal Pipelines");
  const cats = await safeProbe("pipelines", () =>
    bxCall<Array<{ ID: string; NAME: string; SORT: number; IS_DEFAULT: string }>>("crm.dealcategory.list", { limit: 50 })
  );
  if (cats?.result) {
    for (const c of cats.result) console.log(`  [${c.ID}] ${c.NAME} (default=${c.IS_DEFAULT})`);
  }
}

async function probeBitrixDealStatuses() {
  if (!BX_URL) return;
  section("Deal Statuses");
  const statuses = await safeProbe("statuses", () =>
    bxCall<Array<{ STATUS_ID: string; NAME: string; SORT: number; COLOR: string; CATEGORY_ID?: string }>>(
      "crm.status.list",
      { filter: { ENTITY_ID: "DEAL_STAGE" }, limit: 100 }
    )
  );
  if (statuses?.result) {
    for (const s of statuses.result) {
      console.log(`  [${s.STATUS_ID}] ${s.NAME} (cat=${s.CATEGORY_ID ?? "default"}, color=${s.COLOR})`);
    }
  }
}

async function probeBitrixFields() {
  if (!BX_URL) return;
  section("Contact Custom Fields");
  const cf = await safeProbe("contact fields", () =>
    bxCall<Record<string, { title: string; type: string }>>("crm.contact.fields")
  );
  if (cf?.result) {
    const custom = Object.entries(cf.result).filter(([k]) => k.startsWith("UF_"));
    console.log(`  Found ${custom.length} custom fields`);
    for (const [k, v] of custom.slice(0, 15)) console.log(`    ${k}: ${v.title} (${v.type})`);
    if (custom.length > 15) console.log(`    ... and ${custom.length - 15} more`);
  }

  section("Deal Custom Fields");
  const df = await safeProbe("deal fields", () =>
    bxCall<Record<string, { title: string; type: string }>>("crm.deal.fields")
  );
  if (df?.result) {
    const custom = Object.entries(df.result).filter(([k]) => k.startsWith("UF_"));
    console.log(`  Found ${custom.length} custom fields`);
    for (const [k, v] of custom.slice(0, 15)) console.log(`    ${k}: ${v.title} (${v.type})`);
    if (custom.length > 15) console.log(`    ... and ${custom.length - 15} more`);
  }
}

async function probeBitrixSamples() {
  if (!BX_URL) return;
  for (const [method, label] of [
    ["crm.contact.list", "Contact"],
    ["crm.deal.list", "Deal"],
    ["crm.lead.list", "Lead"],
  ] as const) {
    section(`Sample ${label} (first 2)`);
    let count = 0;
    for await (const item of bxList(method, { select: ["*", "UF_*"] }, 2)) {
      console.log(JSON.stringify(item, null, 2));
      count++;
    }
    if (count === 0) console.log("  No records");
  }
}

// ─── Kaiten Probes ─────────────────────────────────────────────────────────

async function probeKaiten() {
  banner("KAITEN");
  if (!KAITEN_KEY) {
    console.log("⚠️  KAITEN_API_KEY not set — skipping Kaiten");
    return;
  }

  const me = await safeProbe("profile", () => kaitenCall<{ full_name: string; email: string }>("/api/v1/user"));
  if (me) console.log("✅ Connected as:", me.full_name, me.email);

  section("Boards");
  const boards = await safeProbe("boards", () =>
    kaitenCall<Array<{ id: number; title: string; description?: string; lane_count: number }>>("/api/v1/spaces")
  );
  if (!boards) return;
  for (const b of boards) {
    console.log(`  [${b.id}] ${b.title} (lanes=${b.lane_count})`);
  }

  for (const board of boards.slice(0, 5)) {
    section(`Board: ${board.title} [${board.id}]`);

    const lanes = await safeProbe("lanes", () =>
      kaitenCall<Array<{ id: number; title: string; cards_count?: number }>>(`/api/v1/spaces/${board.id}/lanes`)
    );
    if (lanes) {
      for (const l of lanes) console.log(`    Lane [${l.id}] ${l.title} (cards=${l.cards_count ?? "?"})`);
    }

    const cards = await safeProbe("cards", () =>
      kaitenCall<Array<{
        id: number; title: string; description?: string;
        lane_id: number; member_id?: number; type_id?: number;
        due_date?: string; created_at: string;
      }>>(`/api/v1/spaces/${board.id}/cards`, { limit: 10 })
    );
    if (cards) {
      console.log(`    Cards (first ${cards.length}):`);
      for (const c of cards) {
        console.log(`      [${c.id}] ${c.title} (lane=${c.lane_id}, due=${c.due_date ?? "none"})`);
      }
    }
  }

  section("Sample Card Detail (first card from first board)");
  if (boards[0]) {
    const cards = await safeProbe("cards", () =>
      kaitenCall<Array<{ id: number }>>(`/api/v1/spaces/${boards[0].id}/cards`, { limit: 1 })
    );
    if (cards?.[0]) {
      const detail = await safeProbe("card detail", () =>
        kaitenCall<Record<string, unknown>>(`/api/v1/cards/${cards[0].id}`)
      );
      if (detail) console.log(JSON.stringify(detail, null, 2));
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 TAKE Auto Migration Discovery");
  console.log("   Bitrix24:", BX_URL ? "✅ configured" : "❌ not set");
  console.log("   Kaiten:", KAITEN_KEY ? "✅ configured" : "❌ not set");

  await probeBitrixProfile();
  await probeBitrixEntities();
  await probeBitrixPipelines();
  await probeBitrixDealStatuses();
  await probeBitrixFields();
  await probeBitrixSamples();
  await probeKaiten();

  banner("COMPLETE");
  console.log("Copy this entire output and send it for analysis.");
}

main().catch((e) => { console.error(e); process.exit(1); });
