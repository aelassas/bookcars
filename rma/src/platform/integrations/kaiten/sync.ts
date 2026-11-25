import type { db } from "@/platform/db/client";
import { integrationEvent, vehicle } from "@/platform/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createKaitenClient } from "./client";

// The tenant-scoped Drizzle handle (a transaction) that the caller opened with
// `SET LOCAL app.tenant_id` set. All DB work MUST run on this handle so it
// stays on the connection that carries the tenant context and RLS applies.
type Db = typeof db;
import {
  isDocumentCard,
  mapColumnToStatus,
  mapColumnToDivision,
  normalizePlate,
  parseCardPlate,
  parseVehicleTitle,
  extractCardPhotos,
} from "./mappings";
import type { KaitenCardDetail } from "./client";

// Error → message, without assuming everything thrown is an Error.
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Fetch full detail for many cards with a small concurrency pool. The board
// LIST payload drops `description` and `files`, so the sales spec and photos
// only arrive from the per-card GET — one call per car. A pool keeps ~160
// cards from either serialising into a slow crawl or stampeding the API.
async function fetchCardDetails(
  client: ReturnType<typeof createKaitenClient>,
  ids: number[],
  poolSize = 6
): Promise<Map<number, KaitenCardDetail>> {
  const out = new Map<number, KaitenCardDetail>();
  let cursor = 0;
  async function worker() {
    while (cursor < ids.length) {
      const id = ids[cursor++];
      try {
        out.set(id, await client.getCard(id));
      } catch {
        // A single unreadable card must not sink the whole sync; it just keeps
        // the make/model/status it already had, without notes/photos.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(poolSize, ids.length) }, worker));
  return out;
}

export interface KaitenSyncResult {
  vehiclesSynced: number;
  vehiclesSkipped: number;
  /** Cards that describe no plated car, so no `vehicle` row was created. */
  cardsWithoutPlate: number;
  /** Cards whose plate already belongs to a vehicle we did not create. */
  vehiclesMatched: number;
  docsSkipped: number;
  errors: string[];
}

export async function syncKaitenBoard(
  db: Db,
  tenantId: string,
  apiKey: string,
  spaceId?: number
): Promise<KaitenSyncResult> {
  const client = createKaitenClient(apiKey);
  const result: KaitenSyncResult = {
    vehiclesSynced: 0,
    vehiclesSkipped: 0,
    cardsWithoutPlate: 0,
    vehiclesMatched: 0,
    docsSkipped: 0,
    errors: [],
  };

  try {
    // Discover spaces if not provided
    let targetSpaceId = spaceId;
    if (!targetSpaceId) {
      const spaces = await client.getSpaces();
      const space = spaces.find((s) => s.title.toLowerCase().includes("takeauto"));
      if (!space) {
        throw new Error("No Kaiten space matching 'takeauto' found.");
      }
      targetSpaceId = space.id;
    }

    const spaces = await client.getSpaces();
    const space = spaces.find((s) => s.id === targetSpaceId);
    if (!space || !space.boards?.length) {
      throw new Error(`No board found in Kaiten space ${targetSpaceId}`);
    }

    const boardId = space.boards[0].id;
    const board = await client.getBoard(boardId);

    const columnMap = new Map<number, string>();
    for (const col of board.columns ?? []) {
      columnMap.set(col.id, col.title);
    }

    // Filter vehicle cards
    const vehicleCards = (board.cards ?? []).filter((card) => {
      const columnTitle = columnMap.get(card.column_id ?? card.columnId ?? 0) ?? "";
      return !isDocumentCard(columnTitle, card.title);
    });

    result.docsSkipped = (board.cards ?? []).length - vehicleCards.length;

    if (vehicleCards.length === 0) {
      return result;
    }

    // Batch insert integration events
    const eventValues = vehicleCards.map((card) => ({
      tenantId,
      provider: "kaiten",
      providerEventId: String(card.id),
      signatureValid: true,
      rawPayload: card,
      normalizedType: "kaiten.card",
      processingStatus: "done" as const,
      processedAt: new Date(),
    }));

    await db.insert(integrationEvent).values(eventValues).onConflictDoNothing({
      target: [integrationEvent.tenantId, integrationEvent.provider, integrationEvent.providerEventId],
    });

    // Find existing vehicles in one query
    const externalIds = vehicleCards.map((c) => String(c.id));
    const existingRows = await db
      .select({ id: vehicle.id, externalId: vehicle.externalId })
      .from(vehicle)
      .where(
        and(
          eq(vehicle.tenantId, tenantId),
          eq(vehicle.externalSource, "kaiten"),
          inArray(vehicle.externalId, externalIds)
        )
      );

    const existingMap = new Map(existingRows.map((r) => [r.externalId, r.id]));

    // Plate → id for every car this tenant already owns, whatever created it.
    // Built lazily: in practice no Kaiten card carries a plate, so the common
    // case must not pay for a full fleet scan.
    const plateIndex = new Map<string, string>();
    let plateIndexLoaded = false;
    const plateOwner = async (plate: string): Promise<string | undefined> => {
      if (!plateIndexLoaded) {
        const rows = await db
          .select({ id: vehicle.id, plate: vehicle.plate })
          .from(vehicle)
          .where(eq(vehicle.tenantId, tenantId));
        for (const r of rows) {
          if (r.plate?.trim()) plateIndex.set(normalizePlate(r.plate), r.id);
        }
        plateIndexLoaded = true;
      }
      return plateIndex.get(normalizePlate(plate));
    };

    // Pull full detail for every vehicle card so the sales spec (description)
    // and showroom photos (files) — both absent from the board LIST payload —
    // land alongside make/model/status instead of being dropped.
    const details = await fetchCardDetails(
      client,
      vehicleCards.map((c) => c.id)
    );

    const toInsert: (typeof vehicle.$inferInsert)[] = [];
    const toUpdate: { id: string; data: Partial<typeof vehicle.$inferInsert> }[] = [];

    for (const card of vehicleCards) {
      try {
        const parsed = parseVehicleTitle(card.title);
        const columnTitle = columnMap.get(card.column_id ?? card.columnId ?? 0) ?? "";
        const detail = details.get(card.id);
        const photos = extractCardPhotos(detail?.files);
        const base = {
          make: parsed.make || "Unknown",
          model: parsed.model || "Unknown",
          year: parsed.year,
          status: mapColumnToStatus(columnTitle),
          division: mapColumnToDivision(columnTitle),
          externalId: String(card.id),
          externalSource: "kaiten" as const,
          kaitenColumn: columnTitle || null,
          // Carry-through for the finder / profile. Only written when the
          // per-card detail actually came back, so a transient fetch failure
          // leaves the car's existing spec and gallery untouched rather than
          // blanking them.
          ...(detail ? { kaitenNotes: detail.description?.trim() || null } : {}),
          ...(photos.length ? { photos } : {}),
          updatedAt: new Date(),
        };

        const existingId = existingMap.get(String(card.id));
        if (existingId) {
          // Already ours by external key — keep it in step with the board.
          toUpdate.push({ id: existingId, data: base });
          result.vehiclesSynced++;
          continue;
        }

        // No plate, no car. A Kaiten card is a board item; without a plate there
        // is nothing here that identifies a physical vehicle, and materialising
        // one produces a plate-less ghost that inflates the fleet and can never
        // be reconciled with the real car. The card is still recorded as an
        // integration_event above, so no board state is lost.
        const plate = parseCardPlate(card.title, card.description);
        if (!plate) {
          result.cardsWithoutPlate++;
          continue;
        }

        // The card names a real plate. If that car already exists — and the
        // sheet import is authoritative for it — link nothing and change
        // nothing: a second row for the same plate is exactly the duplication
        // we are trying to stop. (We also cannot stamp external_source='kaiten'
        // onto a babek-sheet row without destroying its own external key, which
        // the 0042 unique index makes single-valued.)
        if (await plateOwner(plate)) {
          result.vehiclesMatched++;
          continue;
        }

        toInsert.push({
          tenantId,
          ...base,
          plate,
          odometer: 0,
          dailyRate: 0,
        });
        // Claim the plate now so a second card naming the same car in this same
        // run matches instead of inserting a twin.
        plateIndex.set(normalizePlate(plate), "pending-insert");
        result.vehiclesSynced++;
      } catch (cardErr) {
        result.errors.push(`Card ${card.id} (${card.title}): ${errMsg(cardErr)}`);
        result.vehiclesSkipped++;
      }
    }

    // Batch insert new vehicles
    if (toInsert.length > 0) {
      await db.insert(vehicle).values(toInsert);
    }

    // Batch update existing vehicles
    for (const { id, data } of toUpdate) {
      await db.update(vehicle).set(data).where(eq(vehicle.id, id));
    }
  } catch (e) {
    result.errors.push(`Sync failed: ${errMsg(e)}`);
  }

  return result;
}
