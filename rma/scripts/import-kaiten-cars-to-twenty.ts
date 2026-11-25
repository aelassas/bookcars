// import-kaiten-cars-to-twenty.ts — one-way Kaiten → Twenty (SALES) fleet import.
//
// Board 882686 ("ОП TakeAuto", space 377770) → `car` records on the sales
// Twenty (localhost:3001). One car per card in the seven car columns; the two
// document columns (Важная информация / Договоры) are skipped. Dedupe key is
// kaitenCardId, so re-runs are idempotent: an unchanged board produces zero
// writes.
//
// DRY-RUN by default; --commit writes. Runs on the box from the platform dir:
//   npx tsx scripts/import-kaiten-cars-to-twenty.ts [--commit]
//
// This is deliberately SEPARATE from integrations/kaiten/sync.ts (the old
// vehicle-table flow): that one dropped every card without a plate in the
// title; here every card becomes a car, plate or not.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createKaitenClient, type KaitenCard, type KaitenCardDetail } from "@/platform/integrations/kaiten/client";
import { parseCardPlate, extractCardPhotos } from "@/platform/integrations/kaiten/mappings";
import { getTwentyClient } from "@/platform/integrations/twenty/client";

// Same rule as twenty/day-note.ts filterSafe — strip the characters that break
// Twenty's REST filter parser. Inlined so this script's module graph stays tiny.
function filterSafe(value: string): string {
  return value.replace(/[",()]/g, " ");
}

const COMMIT = process.argv.includes("--commit");
const BOARD_ID = 882686;

// Column id → car.status. Column titles are logged verbatim so the per-column
// counts read like the board.
const COLUMN_STATUS: Record<number, { status: string; title: string }> = {
  3133619: { status: "STOCK", title: "Stock" },
  3413507: { status: "STOCK_LUX", title: "Stock (lux)" },
  3133621: { status: "AP_TORQUE", title: "In Ap / Torque point Showroom" },
  3133620: { status: "BOOKED", title: "BOOKED" },
  3395364: { status: "WITH_PARTNERS", title: "WITH EASYRENT OR CARDIVAN" },
  3133622: { status: "FOR_SALE", title: "For sale" },
  6362023: { status: "PRP", title: "Prp (DONT OFFER TO CLIENTS)" },
};
// 3133623 "Важная информация" and 3133624 "Договоры" are documents — skipped.

const NOTES_MAX_CHARS = 2000;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Kaiten key failover, same pattern as run-kaiten-sync.ts: try each key with
// one light call (getBoard) and keep the first that answers.
async function buildKaitenClient() {
  const keys = [process.env.KAITEN_API_KEY, process.env.KAITEN_API_KEY_2].filter(Boolean) as string[];
  if (!keys.length) throw new Error("No KAITEN_API_KEY / KAITEN_API_KEY_2 in env");
  let lastErr: unknown;
  for (let i = 0; i < keys.length; i++) {
    const client = createKaitenClient(keys[i]);
    try {
      await client.getBoard(BOARD_ID);
      console.log(`[kaiten] connected via key#${i + 1} (...${keys[i].slice(-6)})`);
      return client;
    } catch (e) {
      console.warn(`[kaiten] key#${i + 1} failed: ${errMsg(e).slice(0, 200)}`);
      lastErr = e;
    }
  }
  throw new Error(`All Kaiten keys failed: ${errMsg(lastErr)}`);
}

// Per-card detail pool (description + files live only on the single-card GET).
// Small pool + politeness delay, same approach as the old sync.
async function fetchCardDetails(
  client: ReturnType<typeof createKaitenClient>,
  ids: number[],
  poolSize = 4
): Promise<Map<number, KaitenCardDetail>> {
  const out = new Map<number, KaitenCardDetail>();
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        out.set(id, await client.getCard(id));
      } catch (e) {
        console.warn(`  [kaiten] card ${id} detail failed: ${errMsg(e).slice(0, 150)}`);
      }
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: Math.min(poolSize, ids.length) }, worker));
  return out;
}

interface TwentyCar {
  id: string;
  name?: string;
  plate?: string | null;
  status?: string;
  kaitenCardId?: string;
  kaitenNotes?: string | null;
  photo?: { primaryLinkLabel?: string; primaryLinkUrl?: string } | null;
}

function firstData<T>(res: unknown): T | undefined {
  const data = (res as { data?: Record<string, unknown> })?.data ?? {};
  for (const v of Object.values(data)) {
    if (Array.isArray(v)) return v[0] as T | undefined;
    if (v && typeof v === "object") return v as T;
  }
  return undefined;
}

async function main() {
  console.log(COMMIT ? "MODE: --commit (writes enabled)" : "MODE: DRY-RUN (no writes; pass --commit to write)");
  const kaiten = await buildKaitenClient();
  const twenty = getTwentyClient(); // sales deployment (default, :3001)

  // ── 1. Pull every card on the board (paginated) ──────────────────────────
  const all: KaitenCard[] = [];
  for await (const card of kaiten.listCards(BOARD_ID, 100)) all.push(card);
  console.log(`[kaiten] board ${BOARD_ID}: ${all.length} cards total`);

  const skippedDoc = all.filter((c) => !COLUMN_STATUS[c.column_id ?? c.columnId ?? 0]).length;
  const cards = all.filter((c) => {
    const col = c.column_id ?? c.columnId ?? 0;
    if (!COLUMN_STATUS[col]) return false; // documents/other columns
    if ((c as { archived?: boolean }).archived) return false;
    return true;
  });
  console.log(`[kaiten] ${cards.length} car cards, ${skippedDoc} skipped (document/other columns)`);

  // ── 2. Per-card detail: description + photos ─────────────────────────────
  const details = await fetchCardDetails(kaiten, cards.map((c) => c.id));

  // ── 3. Upsert each card into Twenty ──────────────────────────────────────
  const perColumn = new Map<string, { create: number; update: number; same: number; error: number }>();
  const bump = (col: string, k: "create" | "update" | "same" | "error") => {
    const row = perColumn.get(col) ?? { create: 0, update: 0, same: 0, error: 0 };
    row[k]++;
    perColumn.set(col, row);
  };
  const totals = { create: 0, update: 0, same: 0, error: 0, attach: 0 };
  // Attachments: probed once on the first eligible car; disabled for the rest
  // of the run if custom-object targets are rejected (then LINKS-only).
  let attachmentsUsable: boolean | null = null;

  for (const card of cards) {
    const colId = card.column_id ?? card.columnId ?? 0;
    const col = COLUMN_STATUS[colId];
    const detail = details.get(card.id);
    if (detail && (detail as { archived?: boolean }).archived) {
      console.log(`  skip ${card.id} "${card.title}" — archived`);
      bump(col.title, "same");
      continue;
    }
    const plate = parseCardPlate(card.title, detail?.description);
    const photos = extractCardPhotos(detail?.files);
    const photo = photos[0] ?? null;
    // Only carry notes when the detail fetch succeeded — a transient failure
    // must not blank an existing car's notes.
    const notes = detail ? (detail.description?.trim() || null) : undefined;
    const notesTrunc = notes ? notes.slice(0, NOTES_MAX_CHARS) : notes;

    try {
      const existingPage = await twenty.get("cars", {
        filter: `kaitenCardId[eq]:${card.id}`,
        limit: 2,
      });
      const existing = firstData<TwentyCar>(existingPage);

      // Desired state — only the fields we manage.
      const desired: Record<string, unknown> = { name: card.title, status: col.status };
      if (plate) desired.plate = plate;
      if (photo) {
        desired.photo = { primaryLinkLabel: "Kaiten photo", primaryLinkUrl: photo.url };
      }
      if (notesTrunc !== undefined) desired.kaitenNotes = notesTrunc;

      if (!existing) {
        const body: Record<string, unknown> = { ...desired, kaitenCardId: String(card.id) };
        if (COMMIT) {
          const res = await twenty.post("cars", body);
          const created = firstData<TwentyCar>(res);
          console.log(`  CREATE ${card.id} "${card.title}" [${col.status}]${plate ? ` plate=${plate}` : ""}${photo ? " +photo" : ""}`);
          if (created?.id && photo) {
            const n = await maybeAttach(twenty, created.id, card.id, photo.url, photo.name);
            if (n === "attached") totals.attach++;
            if (n === "unsupported") attachmentsUsable = false;
            if (n === "attached" || n === "duplicate") attachmentsUsable = attachmentsUsable ?? true;
          }
        } else {
          console.log(`  would CREATE ${card.id} "${card.title}" [${col.status}]${plate ? ` plate=${plate}` : ""}${photo ? " +photo" : ""}`);
        }
        bump(col.title, "create");
        totals.create++;
        continue;
      }

      // Diff — patch only what actually changed.
      const patch: Record<string, unknown> = {};
      if (existing.name !== card.title) patch.name = card.title;
      if (existing.status !== col.status) patch.status = col.status;
      // Never blank a plate the parser merely failed to find this time.
      if (plate && (existing.plate ?? null) !== plate) patch.plate = plate;
      if (photo && existing.photo?.primaryLinkUrl !== photo.url) {
        patch.photo = { primaryLinkLabel: "Kaiten photo", primaryLinkUrl: photo.url };
      }
      if (notesTrunc !== undefined && (existing.kaitenNotes ?? null) !== notesTrunc) {
        patch.kaitenNotes = notesTrunc;
      }

      if (Object.keys(patch).length === 0) {
        console.log(`  no changes ${card.id} "${card.title}"`);
        bump(col.title, "same");
        totals.same++;
      } else {
        if (COMMIT) {
          await twenty.patch(`cars/${existing.id}`, patch);
          console.log(`  UPDATE ${card.id} "${card.title}" fields: ${Object.keys(patch).join(", ")}`);
        } else {
          console.log(`  would UPDATE ${card.id} "${card.title}" fields: ${Object.keys(patch).join(", ")}`);
        }
        bump(col.title, "update");
        totals.update++;
      }

      // Attachment pass (commit only; photo present; one per car).
      if (COMMIT && photo && attachmentsUsable !== false) {
        const r = await maybeAttach(twenty, existing.id, card.id, photo.url, photo.name);
        if (r === "attached") {
          totals.attach++;
          attachmentsUsable = true;
        } else if (r === "duplicate") {
          attachmentsUsable = true;
        } else if (r === "unsupported") {
          attachmentsUsable = false;
          console.warn("  [attachments] custom-object targets rejected — LINKS-only for the rest of the run");
        }
      }
    } catch (e) {
      console.error(`  ERROR ${card.id} "${card.title}": ${errMsg(e).slice(0, 300)}`);
      bump(col.title, "error");
      totals.error++;
    }
  }

  // ── 4. Summary ───────────────────────────────────────────────────────────
  console.log("\nper-column:");
  for (const [title, c] of [...perColumn.entries()].sort()) {
    console.log(`  ${title}: create=${c.create} update=${c.update} no-change=${c.same} error=${c.error}`);
  }
  console.log(
    `TOTALS: create=${totals.create} update=${totals.update} no-change=${totals.same} ` +
      `error=${totals.error} attachments=${totals.attach}${COMMIT ? "" : " (DRY-RUN — nothing written)"}`
  );
}

// Upload the first image as a real Twenty attachment on the car (4-step flow).
// Dedupes by (name + targetCarId) so re-runs never file a second copy.
// Returns "attached" | "duplicate" | "unsupported" | "failed".
async function maybeAttach(
  twenty: ReturnType<typeof getTwentyClient>,
  carId: string,
  cardId: number,
  url: string,
  name: string
): Promise<"attached" | "duplicate" | "unsupported" | "failed"> {
  try {
    const page = await twenty.get("attachments", {
      filter: `name[eq]:"${filterSafe(name)}",targetCarId[eq]:"${carId}"`,
      limit: 5,
    });
    const rows = Object.values((page as { data?: Record<string, unknown> })?.data ?? {}).flatMap((v) =>
      Array.isArray(v) ? v : []
    ) as Record<string, unknown>[];
    if (rows.some((r) => r.name === name && r.targetCarId === carId)) return "duplicate";

    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`image fetch HTTP ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.byteLength || buf.byteLength > MAX_IMAGE_BYTES) return "failed";

    const uploaded = await twenty.uploadFile({ filename: name, bytes: buf });
    await twenty.post("attachments", {
      name,
      file: [{ fileId: uploaded.fileId, label: name }],
      targetCarId: carId,
    });
    console.log(`  ATTACH card ${cardId}: ${name} (${buf.byteLength} bytes)`);
    return "attached";
  } catch (e) {
    const msg = errMsg(e);
    // A 400 naming the target field means attachments reject custom-object
    // targets entirely — not a transient error.
    if (/targetCarId|not.*(available|supported)|Unknown|Cannot/i.test(msg) && /400/.test(msg)) {
      return "unsupported";
    }
    console.warn(`  [attach] card ${cardId} failed: ${msg.slice(0, 200)}`);
    return "failed";
  }
}

main().catch((e) => {
  console.error("FATAL:", errMsg(e));
  process.exit(1);
});
