#!/usr/bin/env tsx
/**
 * Bitrix24 Discovery Script
 *
 * Probes a Bitrix24 instance via incoming webhook and reports:
 * - Which CRM entities exist and how many records
 * - Pipeline / deal category structure
 * - Deal status definitions
 * - Sample records from each entity
 * - Custom fields (UF_*) used
 *
 * Usage:
 *   BITRIX24_WEBHOOK_URL="https://takeauto-bx24.com/rest/95150/0w5s40c6gan3w2zv/" \
 *   npx tsx scripts/discover-bitrix24.ts
 */

import {
  callBitrix24,
  listAll,
  countRecords,
} from "../src/platform/integrations/bitrix24/client";

// ─── Helpers ───────────────────────────────────────────────────────────────

function banner(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

function section(title: string) {
  console.log("\n─── " + title + " " + "─".repeat(60 - title.length));
}

async function safeProbe<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    console.log(`  ⚠️  ${label}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
}

// ─── Discovery probes ──────────────────────────────────────────────────────

async function probeProfile() {
  banner("BITRIX24 CONNECTION");
  const profile = await callBitrix24<{
    ID: string;
    ADMIN: boolean;
    NAME: string;
    LAST_NAME: string;
    EMAIL: string;
  }>("profile");

  if (profile.error) {
    console.log("❌ FAILED:", profile.error, profile.error_description);
    process.exit(1);
  }

  console.log("✅ Connected as:", profile.result?.NAME, profile.result?.LAST_NAME);
  console.log("   Admin:", profile.result?.ADMIN);
  console.log("   Email:", profile.result?.EMAIL);
}

async function probeCRMEntities() {
  banner("CRM ENTITIES");

  const entities = [
    { method: "crm.contact.list", label: "Contacts" },
    { method: "crm.company.list", label: "Companies" },
    { method: "crm.lead.list", label: "Leads" },
    { method: "crm.deal.list", label: "Deals" },
    { method: "crm.product.list", label: "Products" },
    { method: "crm.invoice.list", label: "Invoices" },
    { method: "crm.activity.list", label: "Activities" },
  ];

  for (const e of entities) {
    const count = await safeProbe(e.label, () => countRecords(e.method));
    if (count !== undefined) {
      console.log(`  ${e.label}: ${count.toLocaleString()} records`);
    }
  }
}

async function probePipelines() {
  section("DEAL PIPELINES (Categories)");

  const cats = await safeProbe("deal categories", () =>
    callBitrix24<Array<{
        ID: string;
        NAME: string;
        SORT: number;
        IS_DEFAULT: string;
      }>>("crm.dealcategory.list", { limit: 50 })
  );

  if (!cats?.result) return;

  for (const c of cats.result) {
    console.log(`  [${c.ID}] ${c.NAME} (default=${c.IS_DEFAULT})`);
  }
}

async function probeDealStatuses() {
  section("DEAL STATUSES");

  const statuses = await safeProbe("deal statuses", () =>
    callBitrix24<Array<{
        STATUS_ID: string;
        NAME: string;
        SORT: number;
        COLOR: string;
        CATEGORY_ID?: string;
      }>>("crm.status.list", {
      filter: { ENTITY_ID: "DEAL_STAGE" },
      limit: 100,
    })
  );

  if (!statuses?.result) return;

  for (const s of statuses.result) {
    console.log(
      `  [${s.STATUS_ID}] ${s.NAME} (sort=${s.SORT}, color=${s.COLOR}, category=${s.CATEGORY_ID ?? "default"})`
    );
  }
}

async function probeContactFields() {
  section("CONTACT FIELDS (custom fields)");

  const fields = await safeProbe("contact fields", () =>
    callBitrix24<Record<string, { title: string; type: string; isRequired?: boolean; list?: unknown[] }>>(
      "crm.contact.fields"
    )
  );

  if (!fields?.result) return;

  const custom = Object.entries(fields.result).filter(([k]) => k.startsWith("UF_"));
  console.log(`  Found ${custom.length} custom fields:`);
  for (const [key, f] of custom.slice(0, 20)) {
    console.log(`    ${key}: ${f.title} (${f.type})`);
  }
  if (custom.length > 20) console.log(`    ... and ${custom.length - 20} more`);
}

async function probeDealFields() {
  section("DEAL FIELDS (custom fields)");

  const fields = await safeProbe("deal fields", () =>
    callBitrix24<Record<string, { title: string; type: string; isRequired?: boolean; list?: unknown[] }>>(
      "crm.deal.fields"
    )
  );

  if (!fields?.result) return;

  const custom = Object.entries(fields.result).filter(([k]) => k.startsWith("UF_"));
  console.log(`  Found ${custom.length} custom fields:`);
  for (const [key, f] of custom.slice(0, 20)) {
    console.log(`    ${key}: ${f.title} (${f.type})`);
  }
  if (custom.length > 20) console.log(`    ... and ${custom.length - 20} more`);
}

async function probeSampleContacts() {
  section("SAMPLE CONTACTS (first 3)");

  const samples: unknown[] = [];
  for await (const c of listAll("crm.contact.list", { select: ["*", "UF_*"] }, 3)) {
    samples.push(c);
  }

  for (const c of samples) {
    console.log(JSON.stringify(c, null, 2));
    console.log("---");
  }
}

async function probeSampleDeals() {
  section("SAMPLE DEALS (first 3)");

  const samples: unknown[] = [];
  for await (const d of listAll("crm.deal.list", { select: ["*", "UF_*"] }, 3)) {
    samples.push(d);
  }

  for (const d of samples) {
    console.log(JSON.stringify(d, null, 2));
    console.log("---");
  }
}

async function probeSampleLeads() {
  section("SAMPLE LEADS (first 3)");

  const samples: unknown[] = [];
  for await (const l of listAll("crm.lead.list", { select: ["*", "UF_*"] }, 3)) {
    samples.push(l);
  }

  for (const l of samples) {
    console.log(JSON.stringify(l, null, 2));
    console.log("---");
  }
}

async function probeProducts() {
  section("SAMPLE PRODUCTS (first 3)");

  const samples: unknown[] = [];
  for await (const p of listAll("crm.product.list", {}, 3)) {
    samples.push(p);
  }

  for (const p of samples) {
    console.log(JSON.stringify(p, null, 2));
    console.log("---");
  }
}

async function probeTasks() {
  section("TASKS");

  const count = await safeProbe("task count", () => countRecords("tasks.task.list"));
  if (count !== undefined) {
    console.log(`  Total tasks: ${count.toLocaleString()}`);
  }

  const samples: unknown[] = [];
  for await (const t of listAll("tasks.task.list", {}, 3)) {
    samples.push(t);
  }

  for (const t of samples) {
    console.log(JSON.stringify(t, null, 2));
    console.log("---");
  }
}

async function probeUsers() {
  section("USERS / EMPLOYEES");

  const count = await safeProbe("user count", () => countRecords("user.get"));
  if (count !== undefined) {
    console.log(`  Total users: ${count.toLocaleString()}`);
  }

  const samples: unknown[] = [];
  for await (const u of listAll("user.get", {}, 5)) {
    samples.push(u);
  }

  for (const u of samples) {
    console.log(JSON.stringify(u, null, 2));
    console.log("---");
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.BITRIX24_WEBHOOK_URL) {
    console.error("Usage: BITRIX24_WEBHOOK_URL=\"...\" npx tsx scripts/discover-bitrix24.ts");
    console.error("");
    console.error("Your webhook URL looks like:");
    console.error("  https://takeauto-bx24.com/rest/95150/0w5s40c6gan3w2zv/");
    process.exit(1);
  }

  console.log("🔍 Bitrix24 Discovery");
  console.log("   Webhook:", process.env.BITRIX24_WEBHOOK_URL);

  await probeProfile();
  await probeCRMEntities();
  await probePipelines();
  await probeDealStatuses();
  await probeContactFields();
  await probeDealFields();
  await probeSampleContacts();
  await probeSampleDeals();
  await probeSampleLeads();
  await probeProducts();
  await probeTasks();
  await probeUsers();

  banner("DISCOVERY COMPLETE");
  console.log("Copy the output above and share it — I'll map everything to TAKE Auto schema.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
