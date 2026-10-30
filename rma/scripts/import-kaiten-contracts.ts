/**
 * Pull the company's legal documents off the Kaiten sales board into the CRM.
 *
 * The board "ОП TakeAuto" keeps the paperwork the business actually runs on in
 * two columns the vehicle sync deliberately skips:
 *
 *   "Договоры"            — the lease / sale-and-purchase / deposit agreements
 *                           (card "Договор (11.2024)": "ДОГОВОР ЛИЗИНГА +
 *                           ДОГОВОР ВЫКУПА ТС, ОБНОВЛЕНИЕ 11.2024")
 *   "Важная информация"   — the trade licence, sales scripts
 *
 * These are TEMPLATES and company papers, not per-car signed contracts, so they
 * are filed against the tenant rather than a vehicle or a rental. That matters:
 * attaching a blank lease template to a specific car would be a lie the archive
 * would then repeat.
 *
 * Files land in the same private store as every other document
 * (.private-uploads/documents/<uuid>-<name>, served only through the
 * authenticated /api/files/<id> route) — never under public/.
 *
 * Idempotent: a file already imported (same tenant, same category, same
 * filename) is skipped, so re-running after the board is updated only brings in
 * what is new. Nothing is written back to Kaiten; this is read-only there.
 *
 * Run:  npx tsx scripts/import-kaiten-contracts.ts          (dry run)
 *       npx tsx scripts/import-kaiten-contracts.ts --commit
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db, pool } from "@/platform/db/client";
import { tenant, document, auditEvent } from "@/platform/db/schema";
import { and, eq } from "drizzle-orm";

const TENANT_SLUG = process.env.KAITEN_DOCS_TENANT ?? "take-auto";
const COMMIT = process.argv.includes("--commit");

// Columns whose cards are paperwork rather than cars. Kept in sync with
// KAITEN_DOC_COLUMNS in integrations/kaiten/mappings.ts, which is what makes the
// vehicle sync skip them.
const DOC_COLUMNS = new Set(["Договоры", "Договор", "Важная информация", "График оплат"]);

/**
 * Decide what a file IS.
 *
 * The card title is the reliable signal and the filename is not: the trade
 * licence is filed as "take auot 2024-2025.pdf" — a typo, no mention of a
 * licence — while "TA.AE Sales script.pdf" contains the word "sale" and is not
 * a sale agreement at all. So the card decides the kind, and the filename only
 * distinguishes siblings inside a card that holds several agreements.
 */
function categoryFor(column: string, cardTitle: string, filename: string): string {
  const card = cardTitle.toLowerCase();
  const f = filename.toLowerCase();

  if (card.includes("лицензи") || card.includes("licen")) return "trade_licence";
  if (card.includes("скрипт") || card.includes("script")) return "sales_script";
  if (card.includes("график оплат")) return "payment_schedule";

  // Inside the contracts card, the filename separates the three agreements.
  if (card.includes("договор") || column === "Договоры" || column === "Договор") {
    if (f.includes("lease")) return "lease_agreement_template";
    if (f.includes("purchase") || f.includes("sale")) return "sale_agreement_template";
    if (f.includes("deposit")) return "deposit_contract_template";
    return "contract_template";
  }

  return "company_document";
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "doc") return "application/msword";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
}

// Same shape the app's own uploader produces, so these files are indistinguishable
// from ones uploaded through the UI.
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/__+/g, "_").slice(0, 100);
}

const BASE = process.env.KAITEN_BASE_URL;
const KEY = process.env.KAITEN_API_KEY;

// Minimal shapes of the Kaiten API responses — only the fields this script reads.
interface KaitenSpace { id: number }
interface KaitenColumn { id: number; title: string }
interface KaitenBoard { id: number; columns?: KaitenColumn[] }
interface KaitenCard { id: number; title: string; column_id: number }
interface KaitenFile {
  name: string;
  size?: number;
  url?: string;
  external_url?: string;
  download_url?: string;
}

async function api<T>(p: string): Promise<T> {
  const res = await fetch(`${BASE!.replace(/\/$/, "")}/api/latest${p}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`kaiten ${p} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function main() {
  if (!BASE || !KEY) throw new Error("KAITEN_BASE_URL / KAITEN_API_KEY not set");

  const [t] = await db.select().from(tenant).where(eq(tenant.slug, TENANT_SLUG)).limit(1);
  if (!t) throw new Error(`tenant ${TENANT_SLUG} not found`);

  const spaces = await api<KaitenSpace[]>("/spaces");
  const found: { column: string; card: string; file: KaitenFile }[] = [];

  for (const s of spaces) {
    const boards = await api<KaitenBoard[]>(`/spaces/${s.id}/boards`).catch(() => []);
    for (const b of boards) {
      const cols = await api<KaitenColumn[]>(`/boards/${b.id}/columns`).catch(() => b.columns ?? []);
      const docCols = cols.filter((c) => DOC_COLUMNS.has(String(c.title).trim()));
      if (!docCols.length) continue;

      const cards = await api<KaitenCard[]>(`/cards?board_id=${b.id}&limit=300`).catch(() => []);
      for (const card of cards) {
        const col = docCols.find((c) => c.id === card.column_id);
        if (!col) continue;
        const files = await api<KaitenFile[]>(`/cards/${card.id}/files`).catch(() => []);
        for (const f of files) found.push({ column: String(col.title).trim(), card: card.title, file: f });
      }
    }
  }

  console.log(`Found ${found.length} file(s) in the document columns:\n`);
  for (const { column, card, file } of found) {
    console.log(`  [${column}] ${card} → ${file.name} (${file.size ?? "?"} bytes) → ${categoryFor(column, card, file.name)}`);
  }

  if (!COMMIT) {
    console.log("\n— DRY RUN — nothing written. Re-run with --commit to import.\n");
    return;
  }

  const dir = path.join(process.cwd(), ".private-uploads", "documents");
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  let imported = 0, skipped = 0, failed = 0;
  for (const { column, card, file } of found) {
    const category = categoryFor(column, card, file.name);
    const existing = await db
      .select({ id: document.id })
      .from(document)
      .where(and(
        eq(document.tenantId, t.id),
        eq(document.category, category),
        eq(document.filename, file.name),
      ))
      .limit(1);
    if (existing.length) { skipped++; continue; }

    try {
      // Kaiten file URLs are absolute and already authenticated by the token.
      const url = file.url ?? file.external_url ?? file.download_url;
      if (!url) throw new Error("file has no url field");
      const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      const key = `${randomUUID()}-${sanitizeFilename(file.name)}`;
      await writeFile(path.join(dir, key), buf);

      const [row] = await db
        .insert(document)
        .values({
          tenantId: t.id,
          entityType: "tenant",
          entityId: t.id,
          category,
          filename: file.name,
          mimeType: mimeFor(file.name),
          sizeBytes: buf.length,
          storageKey: key,
          publicUrl: `/api/files/documents/${key}`,
          uploadedBy: null,
        })
        .returning({ id: document.id });

      await db.insert(auditEvent).values({
        tenantId: t.id,
        actorId: null,
        action: "document.import",
        entityType: "document",
        entityId: row.id,
        intent: `Imported "${file.name}" from Kaiten card "${card}" [${column}]`,
      });

      console.log(`  ✅ ${file.name} → ${category} (${buf.length} bytes)`);
      imported++;
    } catch (e) {
      console.log(`  ❌ ${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log(`\n─── done ───\n  imported ${imported} · already present ${skipped} · failed ${failed}`);
}

main().then(async () => { await pool.end(); process.exit(0); })
  .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
