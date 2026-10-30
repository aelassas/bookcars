export interface KaitenCard {
  id: number;
  title: string;
  description?: string;
  boardId?: number;
  columnId?: number;
  column_id?: number; // API camelCase vs snake_case compatibility
  laneId?: number;
  typeId?: number;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  assigneeId?: number;
  ownerId?: number;
}

// One file attached to a card. `type: 1` is an image; `url` is a public
// files.kaiten.ru link that loads without the API key, so the UI can point an
// <img> straight at it.
export interface KaitenFile {
  id: number;
  url: string;
  name?: string | null;
  type?: number;
  mime_type?: string | null;
  deleted?: boolean;
  sort_order?: number;
  card_cover?: boolean;
}

// The single-card GET (`/cards/{id}`) payload — the board LIST endpoint omits
// `description` and `files`, so those only arrive here. Only the fields the
// sync reads are typed; the rest of the (large) card object is left open.
export interface KaitenCardDetail extends KaitenCard {
  description?: string;
  files?: KaitenFile[];
  column?: { id: number; title: string } | null;
  [key: string]: unknown;
}

export interface KaitenSpace {
  id: number;
  title: string;
  boards?: KaitenBoard[];
}

export interface KaitenBoard {
  id: number;
  title: string;
  spaceId?: number;
  cards?: KaitenCard[];
}

export interface KaitenColumn {
  id: number;
  title: string;
  boardId?: number;
}

// Node's fetch (undici) has no total-response timeout, so a wedged Kaiten
// would pin this client forever. That matters most inside the pg-boss
// `kaiten.sync.cards` worker: the job then outlives its `expireInSeconds` and
// pg-boss starts a duplicate sync against the same board.
//
// 30s: Kaiten answers a 100-card page or a single-card detail in well under a
// second; 30s is generous headroom for a slow board, and the sync fetches
// cards one by one, so a longer bound would multiply across every card.
const KAITEN_TIMEOUT_MS = 30_000;

export class KaitenClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async req<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/latest${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(KAITEN_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(`Kaiten ${path} failed: ${res.status} ${await res.text()}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      // AbortSignal.timeout() rejects with a DOMException named "TimeoutError".
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error(`Kaiten ${path} timed out after ${KAITEN_TIMEOUT_MS}ms`, { cause: err });
      }
      throw err;
    }
  }

  async getSpaces(): Promise<KaitenSpace[]> {
    return this.req("/spaces");
  }

  async getBoards(spaceId?: number): Promise<KaitenBoard[]> {
    return this.req("/boards", spaceId ? { space_id: spaceId } : undefined);
  }

  async getBoard(boardId: number): Promise<KaitenBoard & { columns?: KaitenColumn[] }> {
    return this.req(`/boards/${boardId}`);
  }

  async getColumns(boardId?: number): Promise<KaitenColumn[]> {
    return this.req("/columns", boardId ? { board_id: boardId } : undefined);
  }

  async* listCards(boardId?: number, limit = 100): AsyncGenerator<KaitenCard, void, unknown> {
    let page = 1;
    while (true) {
      const cards: KaitenCard[] = await this.req("/cards", {
        board_id: boardId,
        limit,
        offset: (page - 1) * limit,
      });
      for (const c of cards) yield c;
      if (cards.length < limit) break;
      page++;
    }
  }

  // Full single-card detail — the ONLY endpoint that returns `description`
  // (the sales spec) and `files` (the showroom photos). The board LIST payload
  // drops both, which is why the sync has to fetch cards one by one to carry
  // them through.
  async getCard(cardId: number): Promise<KaitenCardDetail> {
    return this.req(`/cards/${cardId}`);
  }

  async getCardComments(cardId: number): Promise<Array<{ id: number; text: string; createdAt: string }>> {
    return this.req(`/cards/${cardId}/comments`);
  }
}

export function getKaitenClient(): KaitenClient | null {
  const baseUrl = process.env.KAITEN_BASE_URL;
  const apiKey = process.env.KAITEN_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return new KaitenClient(baseUrl, apiKey);
}

export function createKaitenClient(baseUrlOrApiKey: string, apiKey?: string): KaitenClient {
  // Backward compatibility: if only 1 arg, treat as apiKey and read baseUrl from env
  if (apiKey === undefined) {
    const baseUrl = process.env.KAITEN_BASE_URL;
    if (!baseUrl) throw new Error("KAITEN_BASE_URL not set");
    return new KaitenClient(baseUrl, baseUrlOrApiKey);
  }
  return new KaitenClient(baseUrlOrApiKey, apiKey);
}
