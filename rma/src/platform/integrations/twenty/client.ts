// Twenty CRM REST API client (self-hosted instance — Core API + Metadata API).
// https://docs.twenty.com/developers/extend/api
//
// Core API:      /rest/<objects>          — CRUD on records, cursor pagination
// Batch:         /rest/batch/<objects>    — up to 60 records per call
// Metadata API:  /rest/metadata/...       — schema management (objects/fields)
// Auth:          Authorization: Bearer <TWENTY_API_KEY>
// Rate limit:    100 requests/minute per workspace.
import { QUEUE_DEFINITIONS, TWENTY_SYNC_QUEUE } from "../../jobs/queues";
import {
  resolveTwentyInstance,
  twentyInstanceForTenantSlug,
  type TwentyInstanceKey,
} from "./instance";

// Node's fetch (undici) has NO total-response timeout: a server that accepts
// the socket and then never answers pins the caller forever. This client runs
// inside pg-boss workers, so "forever" means the job outlives its
// `expireInSeconds`, pg-boss re-queues it, and a SECOND sync starts against
// the same workspace. Every request is therefore bounded. 30s is generous for
// a LAN-local self-hosted instance where a healthy page answers in ms.
const REQUEST_TIMEOUT_MS = 30_000;

// Wall-clock ceiling for ONE request including its retries. pg-boss fails an
// active job at `started_on + expire_seconds` (plans.failJobsByTimeout) —
// heartbeats do NOT extend that — so a retry budget above the queue expiry
// guarantees duplicate workers. Derived from the queue registry so the two
// can never drift apart (same principle as bitrix24/client.ts).
const TWENTY_QUEUE_NAMES: readonly string[] = [TWENTY_SYNC_QUEUE];
const QUEUE_EXPIRIES_MS = QUEUE_DEFINITIONS.filter((q) => TWENTY_QUEUE_NAMES.includes(q.name)).map(
  (q) => (q.expireInSeconds ?? 900) * 1000
);
const TIGHTEST_EXPIRY_MS = QUEUE_EXPIRIES_MS.length ? Math.min(...QUEUE_EXPIRIES_MS) : 1_800_000;
// Ten minutes of the (30 min) job expiry are left over for the DB writes that
// follow the last page; past this point a throttled/failed request throws and
// pg-boss retries the whole job on its own schedule.
const RETRY_BUDGET_MS = TIGHTEST_EXPIRY_MS - 600_000;

// Twenty rate limit: 100 requests/minute per workspace. Token bucket at
// 100/60 ≈ 1.67 rps with a burst of 10 so short metadata/bootstrap runs are
// not needlessly serialized but a long crawl can never exceed the limit.
const RATE_LIMIT_RPS = 100 / 60;
const RATE_LIMIT_BURST = 10;

// Twenty hard cap: 60 records per batch call.
const BATCH_LIMIT = 60;

// Page size for listAll crawls (Twenty's own max `limit`).
const PAGE_LIMIT = 60;

const MAX_RETRY_ATTEMPTS = 6;

// AbortSignal.timeout() rejects with a DOMException named "TimeoutError";
// a caller-supplied abort surfaces as "AbortError".
function isAbort(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Token-bucket rate limiter (same shape as jobs/bitrix-discovery.ts) ─────

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private rate: number,
    private capacity: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  async consume(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const waitMs = Math.ceil((1 - this.tokens) * (1000 / this.rate));
    await sleep(waitMs);
    return this.consume();
  }
  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
  }
}

// ─── Public types ───────────────────────────────────────────────────────────

export interface TwentyObjectMetadata {
  id: string;
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  isCustom?: boolean;
  [key: string]: unknown;
}

export interface TwentyFieldMetadata {
  id: string;
  objectMetadataId: string;
  name: string;
  label: string;
  type: string;
  [key: string]: unknown;
}

export interface TwentyCreateObjectInput {
  nameSingular: string;
  namePlural: string;
  labelSingular: string;
  labelPlural: string;
  description?: string;
  icon?: string;
}

export interface TwentySelectOption {
  label: string;
  value: string;
  color?: string;
  position: number;
}

export interface TwentyCreateFieldInput {
  objectMetadataId: string;
  name: string;
  label: string;
  // LINKS is the only field type Twenty renders as a CLICKABLE anchor. A URL
  // in a TEXT field is dead text, which is worse than nothing on a card whose
  // whole point is "let me message this person without a second phone".
  type: "TEXT" | "NUMBER" | "DATE_TIME" | "BOOLEAN" | "SELECT" | "RELATION" | "RAW_JSON" | "LINKS";
  description?: string;
  icon?: string;
  isNullable?: boolean;
  defaultValue?: unknown;
  /** Required for SELECT fields. */
  options?: TwentySelectOption[];
  /** Required for RELATION fields. */
  relationCreationPayload?: {
    type: "MANY_TO_ONE" | "ONE_TO_MANY";
    targetObjectMetadataId: string;
    targetFieldLabel: string;
    targetFieldIcon?: string;
  };
}

/** Raw list page as returned by GET /rest/<objects>. */
export interface TwentyListPage<T> {
  data?: Record<string, T[] | undefined>;
  pageInfo?: {
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  totalCount?: number;
}

/** Result of a completed direct file upload (see uploadFile). */
export interface TwentyUploadedFile {
  fileId: string;
  /**
   * Storage path, e.g. "files-field/<fieldUid>/<fileId>.<ext>" — informational;
   * records reference the file by fileId, never by path.
   */
  path: string;
}

/**
 * universalIdentifier of the standard `attachment.file` FILES field. The
 * 20202020-* range is reserved for Twenty's standard objects, so the value is
 * identical on every workspace (verified live 2026-08-21 on BOTH the sales and
 * the rental deployment). createFileUpload needs it: a FilesField upload is
 * stored under the field's path and completeFileUpload refuses a file that was
 * not uploaded FOR this field.
 */
export const ATTACHMENT_FILE_FIELD_UID = "20202020-15db-460e-8166-c7b5d87ad4be";

export interface TwentyMetadataApi {
  listObjects(): Promise<TwentyObjectMetadata[]>;
  listFields(): Promise<TwentyFieldMetadata[]>;
  createObject(input: TwentyCreateObjectInput): Promise<TwentyObjectMetadata>;
  createField(input: TwentyCreateFieldInput): Promise<TwentyFieldMetadata>;
}

export interface TwentyClient {
  readonly mode: "live" | "mock";
  /** GET /rest/<path> — path is e.g. "companies" or "companies/<id>". */
  get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T>;
  post<T = unknown>(path: string, body: unknown): Promise<T>;
  patch<T = unknown>(path: string, body: unknown): Promise<T>;
  delete<T = unknown>(path: string): Promise<T>;
  /** Cursor-pagination traversal of GET /rest/<objectPath> (starting_after). */
  listAll<T = Record<string, unknown>>(
    objectPath: string,
    params?: Record<string, unknown>
  ): AsyncGenerator<T, void, unknown>;
  /** POST /rest/batch/<objectPath>, slicing `records` into ≤60-record calls. */
  batchCreate<T = Record<string, unknown>>(
    objectPath: string,
    records: Record<string, unknown>[]
  ): Promise<T[]>;
  /**
   * Direct file upload for a FILES field (verified live against v2.25 on
   * 2026-08-21): GraphQL `createFileUpload` on the /metadata schema →
   * `PUT <uploadUrl>` with the raw bytes → GraphQL `completeFileUpload`.
   * The record is then created via REST with `file: [{ fileId, label }]`.
   */
  uploadFile(input: { filename: string; bytes: Uint8Array }): Promise<TwentyUploadedFile>;
  /** /rest/metadata/ — schema management. */
  metadata: TwentyMetadataApi;
}

// ─── SSRF guard ─────────────────────────────────────────────────────────────

/**
 * assertSafeTwentyBaseUrl — SSRF guard for the Twenty base URL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️  ATTENTION — DELIBERATE DEVIATION FROM bitrix24/url-guard.ts  ⚠️
 * ═══════════════════════════════════════════════════════════════════════════
 * The Bitrix guard REJECTS loopback / RFC-1918 / link-local hosts. This one
 * EXPLICITLY ALLOWS them: Twenty is OUR OWN self-hosted instance on OUR OWN
 * network (http://localhost:3001 in dev, a docker or office-LAN IP in prod),
 * so blocking private ranges would forbid the exact deployment this
 * integration exists for. The URL is operator-supplied via the deployment env
 * (TWENTY_BASE_URL), NOT tenant- or admin-supplied at runtime, so the SSRF
 * surface the Bitrix guard defends against does not apply here.
 *
 * Still enforced: absolute http(s) URL, no userinfo (credentials must live in
 * TWENTY_API_KEY, never in the URL where they would leak into logs/errors).
 */
export function assertSafeTwentyBaseUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid Twenty base URL. Expected format: https://twenty.example.com");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Twenty base URL must be an http(s) URL.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Twenty base URL must not contain credentials — use TWENTY_API_KEY instead.");
  }
  return parsed;
}

// ─── Live client ────────────────────────────────────────────────────────────

/**
 * Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds.
 * Returns undefined when absent/unparseable so the caller falls back to
 * exponential backoff.
 */
function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/** Exponential backoff: 1s, 2s, 4s … capped at 30s, plus ≤25% jitter. */
function fallbackBackoffMs(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 30_000);
  return base * (1 + Math.random() * 0.25);
}

function createLiveClient(baseUrl: string, apiKey: string): TwentyClient {
  const parsed = assertSafeTwentyBaseUrl(baseUrl);
  const apiBase = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  const restBase = `${apiBase}/rest`;
  const bucket = new TokenBucket(RATE_LIMIT_RPS, RATE_LIMIT_BURST);

  // Deliberately no apiKey, no full URL in any error text: the path segment
  // (e.g. "metadata/objects") carries no secret, the key never appears.
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(`${restBase}/${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    }

    // One deadline for the WHOLE call including retries — see RETRY_BUDGET_MS.
    const deadline = Date.now() + RETRY_BUDGET_MS;

    for (let attempt = 0; ; attempt++) {
      // Pay for the request BEFORE making it — retries are requests too.
      await bucket.consume();

      let res: Response;
      try {
        res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          // Bounds headers AND body read — undici aborts the whole exchange.
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (err) {
        if (!isAbort(err)) throw err; // DNS/reset: not throttling, surface as-is
        // A wedged socket is the same failure class as a 5xx: back off and
        // retry within budget rather than failing the whole job on one hang.
        const backoffMs = fallbackBackoffMs(attempt);
        if (attempt < MAX_RETRY_ATTEMPTS && Date.now() + backoffMs + REQUEST_TIMEOUT_MS <= deadline) {
          await sleep(backoffMs);
          continue;
        }
        throw new Error(`Twenty ${method} ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`, {
          cause: err,
        });
      }

      if (res.ok) {
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      }

      if (res.status === 429 || res.status >= 500) {
        // Retry-After (when present) is honored EXACTLY — no jitter — so the
        // server's own throttle signal takes precedence over our backoff.
        const backoffMs = parseRetryAfterMs(res.headers.get("retry-after")) ?? fallbackBackoffMs(attempt);
        if (attempt < MAX_RETRY_ATTEMPTS && Date.now() + backoffMs + REQUEST_TIMEOUT_MS <= deadline) {
          await sleep(backoffMs);
          continue;
        }
      }

      // Error body comes from the server and may carry a useful message; the
      // apiKey is never echoed into it by us.
      const text = await res.text().catch(() => "");
      throw new Error(`Twenty ${method} ${path} HTTP ${res.status}: ${text}`.trim());
    }
  }

  function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return request<T>("GET", path, undefined, params);
  }
  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>("POST", path, body);
  }
  function patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  }
  function del<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  }

  async function* listAll<T>(
    objectPath: string,
    params: Record<string, unknown> = {}
  ): AsyncGenerator<T, void, unknown> {
    let cursor: string | undefined;
    while (true) {
      const page = await get<TwentyListPage<T>>(objectPath, {
        ...params,
        limit: PAGE_LIMIT,
        ...(cursor ? { starting_after: cursor } : {}),
      });
      // The data key mirrors the object path ("companies" -> data.companies);
      // fall back to the first array value for tolerance across versions.
      const key = objectPath.split("/").pop() ?? objectPath;
      const items =
        page.data?.[key] ??
        Object.values(page.data ?? {}).find((v): v is T[] => Array.isArray(v)) ??
        [];
      for (const item of items) yield item;
      if (!page.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
      cursor = page.pageInfo.endCursor;
    }
  }

  async function batchCreate<T>(objectPath: string, records: Record<string, unknown>[]): Promise<T[]> {
    const created: T[] = [];
    for (let i = 0; i < records.length; i += BATCH_LIMIT) {
      const chunk = records.slice(i, i + BATCH_LIMIT);
      const res = await post<{ data?: Record<string, T[] | undefined> }>(`batch/${objectPath}`, chunk);
      for (const value of Object.values(res.data ?? {})) {
        if (Array.isArray(value)) created.push(...value);
      }
    }
    return created;
  }

  // ─── Direct file upload (createFileUpload → PUT → completeFileUpload) ──────
  //
  // Not /rest: the upload handshake lives on the CORE GraphQL schema, which
  // this build serves at /metadata (the FileUploadResolver carries the
  // @MetadataResolver decorator). Verified live on the rental deployment
  // 2026-08-21. The PUT goes to whatever uploadUrl the server returns — for
  // local storage that is `${SERVER_URL}/file-upload/<fileId>?token=<jwt>`,
  // guarded by the FileUploadTokenGuard, so it needs NO api key.

  /** Same retry policy as request(): bucket, timeout, 429/5xx/abort backoff. */
  async function fetchBounded(label: string, url: string, init: RequestInit): Promise<Response> {
    const deadline = Date.now() + RETRY_BUDGET_MS;
    for (let attempt = 0; ; attempt++) {
      await bucket.consume();
      let res: Response;
      try {
        res = await fetch(url, {
          ...init,
          // Bounds headers AND body read — undici aborts the whole exchange.
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (err) {
        if (!isAbort(err)) throw err;
        const backoffMs = fallbackBackoffMs(attempt);
        if (attempt < MAX_RETRY_ATTEMPTS && Date.now() + backoffMs + REQUEST_TIMEOUT_MS <= deadline) {
          await sleep(backoffMs);
          continue;
        }
        throw new Error(`Twenty ${label} timed out after ${REQUEST_TIMEOUT_MS}ms`, { cause: err });
      }
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        const backoffMs = parseRetryAfterMs(res.headers.get("retry-after")) ?? fallbackBackoffMs(attempt);
        if (attempt < MAX_RETRY_ATTEMPTS && Date.now() + backoffMs + REQUEST_TIMEOUT_MS <= deadline) {
          await sleep(backoffMs);
          continue;
        }
      }
      const text = await res.text().catch(() => "");
      throw new Error(`Twenty ${label} HTTP ${res.status}: ${text}`.trim());
    }
  }

  async function graphqlMetadata<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetchBounded("POST /metadata", `${apiBase}/metadata`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as {
      data?: T;
      errors?: { message?: string }[];
    };
    if (json.errors?.length) {
      const msg = json.errors.map((e) => e.message ?? "unknown").join("; ").slice(0, 300);
      throw new Error(`Twenty POST /metadata GraphQL error: ${msg}`);
    }
    return json.data as T;
  }

  async function uploadFile(input: { filename: string; bytes: Uint8Array }): Promise<TwentyUploadedFile> {
    const target = await graphqlMetadata<{
      createFileUpload: { fileId: string; uploadUrl: string };
    }>(
      `mutation($filename: String!, $size: Float!, $fileFolder: FileFolder!, $fui: String) {
        createFileUpload(filename: $filename, size: $size, fileFolder: $fileFolder, fieldMetadataUniversalIdentifier: $fui) {
          fileId uploadUrl
        }
      }`,
      {
        filename: input.filename,
        size: input.bytes.byteLength,
        fileFolder: "FilesField",
        fui: ATTACHMENT_FILE_FIELD_UID,
      }
    );
    const { fileId, uploadUrl } = target.createFileUpload;
    // octet-stream keeps the body away from the server's json/text parsers;
    // the server streams it to storage and enforces the declared size itself.
    await fetchBounded("PUT file-upload", uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      // Undici takes a Uint8Array body fine; the DOM BodyInit type just does
      // not admit it in this TS version.
      body: input.bytes as unknown as BodyInit,
    });
    // The PUT only stores the bytes; the file stays PENDING — and unusable by
    // any record ("upload has not been completed") — until this mutation.
    const done = await graphqlMetadata<{ completeFileUpload: { id: string; path: string } }>(
      `mutation($fileId: String!) { completeFileUpload(fileId: $fileId) { id path } }`,
      { fileId }
    );
    return { fileId, path: done.completeFileUpload.path };
  }

  async function listAllMetadata<T>(path: string): Promise<T[]> {
    const out: T[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 25; page++) {
      const res: { data?: T[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } =
        await get<{ data?: T[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } }>(
          path + `?limit=200${cursor ? `&starting_after=${encodeURIComponent(cursor)}` : ""}`
        );
      out.push(...(res.data ?? []));
      if (!res.pageInfo?.hasNextPage || !res.pageInfo.endCursor) break;
      cursor = res.pageInfo.endCursor;
    }
    return out;
  }

  const metadata: TwentyMetadataApi = {
    async listObjects() {
      // Live shape (verified on the self-hosted instance 2026-07-30): lists
      // answer `{ data: [...], pageInfo }` and creates answer the BARE object.
      // Pages cap at 200 even when a bigger limit is asked, so we MUST walk
      // the cursor — a bootstrap that reads only page 1 re-creates existing
      // fields and gets NOT_AVAILABLE 400s (seen live).
      return listAllMetadata<TwentyObjectMetadata>("metadata/objects");
    },
    async listFields() {
      return listAllMetadata<TwentyFieldMetadata>("metadata/fields");
    },
    async createObject(input) {
      return post<TwentyObjectMetadata>("metadata/objects", input);
    },
    async createField(input) {
      return post<TwentyFieldMetadata>("metadata/fields", input);
    },
  };

  return { mode: "live", get, post, patch, delete: del, listAll, batchCreate, uploadFile, metadata };
}

// ─── Mock client ────────────────────────────────────────────────────────────

// Plausible built-in records so the platform boots and the UI is testable
// without a running Twenty or an API key (same role as the Twilio mock).
const MOCK_COMPANIES: Record<string, unknown>[] = [
  {
    id: "mock-company-1",
    name: "Cardiwan Rent a Car LLC",
    domainName: { primaryLinkUrl: "https://cardiwan.example" },
    employees: 12,
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "mock-company-2",
    name: "Take Auto FZE",
    domainName: { primaryLinkUrl: "https://takeauto.example" },
    employees: 8,
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-02-01T09:00:00.000Z",
  },
];

const MOCK_PEOPLE: Record<string, unknown>[] = [
  {
    id: "mock-person-1",
    name: { firstName: "Ahmed", lastName: "Al Mansoori" },
    emails: { primaryEmail: "ahmed@example.com" },
    phones: { primaryPhoneNumber: "501234567", primaryPhoneCountryCode: "AE" },
    phoneTail9: "501234567",
    createdAt: "2026-03-01T09:00:00.000Z",
    updatedAt: "2026-03-01T09:00:00.000Z",
  },
  {
    id: "mock-person-2",
    name: { firstName: "Maria", lastName: "Ivanova" },
    emails: { primaryEmail: "maria@example.com" },
    phones: { primaryPhoneNumber: "529876543", primaryPhoneCountryCode: "AE" },
    phoneTail9: "529876543",
    createdAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-03-05T09:00:00.000Z",
  },
];

const MOCK_BUILTIN_OBJECTS: TwentyObjectMetadata[] = [
  { id: "mock-obj-person", nameSingular: "person", namePlural: "people", labelSingular: "Person", labelPlural: "People", isCustom: false },
  { id: "mock-obj-company", nameSingular: "company", namePlural: "companies", labelSingular: "Company", labelPlural: "Companies", isCustom: false },
  { id: "mock-obj-opportunity", nameSingular: "opportunity", namePlural: "opportunities", labelSingular: "Opportunity", labelPlural: "Opportunities", isCustom: false },
];

const MOCK_BUILTIN_FIELDS: TwentyFieldMetadata[] = [
  { id: "mock-fld-person-name", objectMetadataId: "mock-obj-person", name: "name", label: "Name", type: "FULL_NAME" },
  { id: "mock-fld-person-emails", objectMetadataId: "mock-obj-person", name: "emails", label: "Emails", type: "EMAILS" },
  { id: "mock-fld-person-phones", objectMetadataId: "mock-obj-person", name: "phones", label: "Phones", type: "PHONES" },
  { id: "mock-fld-company-name", objectMetadataId: "mock-obj-company", name: "name", label: "Name", type: "TEXT" },
  { id: "mock-fld-opportunity-name", objectMetadataId: "mock-obj-opportunity", name: "name", label: "Name", type: "TEXT" },
  { id: "mock-fld-opportunity-stage", objectMetadataId: "mock-obj-opportunity", name: "stage", label: "Stage", type: "SELECT" },
];

function createMockClient(): TwentyClient {
  // In-memory record store: mock writes are readable back through listAll, so
  // a full sync/bootstrap dry-run behaves like the real thing minus network.
  const stores = new Map<string, Record<string, unknown>[]>([
    ["companies", MOCK_COMPANIES.map((r) => ({ ...r }))],
    ["people", MOCK_PEOPLE.map((r) => ({ ...r }))],
    ["opportunities", []],
  ]);
  const objects: TwentyObjectMetadata[] = MOCK_BUILTIN_OBJECTS.map((o) => ({ ...o }));
  const fields: TwentyFieldMetadata[] = MOCK_BUILTIN_FIELDS.map((f) => ({ ...f }));

  function storeFor(objectPath: string): Record<string, unknown>[] {
    let store = stores.get(objectPath);
    if (!store) {
      store = [];
      stores.set(objectPath, store);
    }
    return store;
  }

  function insert(objectPath: string, record: Record<string, unknown>): Record<string, unknown> {
    const now = new Date().toISOString();
    const row = { id: `mock-${crypto.randomUUID()}`, createdAt: now, updatedAt: now, ...record };
    storeFor(objectPath).push(row);
    return row;
  }

  function get<T>(path: string): Promise<T> {
    if (path === "metadata/objects") return Promise.resolve({ data: { objects } } as T);
    if (path === "metadata/fields") return Promise.resolve({ data: { fields } } as T);
    const key = path.split("/").pop() ?? path;
    const rows = storeFor(key);
    return Promise.resolve({
      data: { [key]: rows },
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      totalCount: rows.length,
    } as T);
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    if (path === "metadata/objects") {
      const input = body as TwentyCreateObjectInput;
      const created: TwentyObjectMetadata = {
        id: `mock-obj-${crypto.randomUUID()}`,
        isCustom: true,
        ...input,
      };
      objects.push(created);
      return Promise.resolve({ data: { createOneObject: created } } as T);
    }
    if (path === "metadata/fields") {
      const input = body as TwentyCreateFieldInput;
      const created: TwentyFieldMetadata = { id: `mock-fld-${crypto.randomUUID()}`, ...input };
      fields.push(created);
      return Promise.resolve({ data: { createOneField: created } } as T);
    }
    if (path.startsWith("batch/")) {
      const objectPath = path.slice("batch/".length);
      const rows = (body as Record<string, unknown>[]).map((r) => insert(objectPath, r));
      return Promise.resolve({ data: { [`create${objectPath}`]: rows } } as T);
    }
    return Promise.resolve({ data: { [`create${path}`]: insert(path, body as Record<string, unknown>) } } as T);
  }

  function patch<T>(path: string, body: unknown): Promise<T> {
    const [objectPath, id] = path.split("/");
    const row = storeFor(objectPath).find((r) => r.id === id);
    if (row) Object.assign(row, body as Record<string, unknown>, { updatedAt: new Date().toISOString() });
    return Promise.resolve({ data: { [`update${objectPath}`]: row ?? null } } as T);
  }

  function del<T>(path: string): Promise<T> {
    const [objectPath, id] = path.split("/");
    const store = storeFor(objectPath);
    const index = store.findIndex((r) => r.id === id);
    const removed = index >= 0 ? store.splice(index, 1)[0] : null;
    return Promise.resolve({ data: { [`delete${objectPath}`]: removed } } as T);
  }

  async function* listAll<T>(objectPath: string): AsyncGenerator<T, void, unknown> {
    for (const row of storeFor(objectPath)) yield row as T;
  }

  async function batchCreate<T>(objectPath: string, records: Record<string, unknown>[]): Promise<T[]> {
    const created: T[] = [];
    for (let i = 0; i < records.length; i += BATCH_LIMIT) {
      const chunk = records.slice(i, i + BATCH_LIMIT);
      for (const record of chunk) created.push(insert(objectPath, record) as T);
    }
    return created;
  }

  // Mirrors the live 3-step upload without the network: the returned fileId
  // is what a subsequent attachment create references via file: [{fileId,label}].
  function uploadFile(input: { filename: string; bytes: Uint8Array }): Promise<TwentyUploadedFile> {
    const fileId = `mock-file-${crypto.randomUUID()}`;
    const ext = input.filename.includes(".") ? (input.filename.split(".").pop() ?? "") : "";
    return Promise.resolve({
      fileId,
      path: `files-field/${ATTACHMENT_FILE_FIELD_UID}/${fileId}${ext ? `.${ext}` : ""}`,
    });
  }

  const metadata: TwentyMetadataApi = {
    listObjects: async () => objects.map((o) => ({ ...o })),
    listFields: async () => fields.map((f) => ({ ...f })),
    createObject: async (input) => {
      const res = await post<{ data: { createOneObject: TwentyObjectMetadata } }>("metadata/objects", input);
      return res.data.createOneObject;
    },
    createField: async (input) => {
      const res = await post<{ data: { createOneField: TwentyFieldMetadata } }>("metadata/fields", input);
      return res.data.createOneField;
    },
  };

  return { mode: "mock", get, post, patch, delete: del, listAll, batchCreate, uploadFile, metadata };
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a Twenty client.
 *
 * mode "live" requires `apiKey` (and validates `baseUrl` through the SSRF
 * guard). mode "mock" (or a missing apiKey without an explicit mode) returns
 * an in-memory client that needs no network and no secrets — the platform
 * always boots.
 */
export function createTwentyClient(
  opts: { baseUrl?: string; apiKey?: string; mode?: "live" | "mock" } = {}
): TwentyClient {
  if (opts.mode === "mock") return createMockClient();
  const apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    if (opts.mode === "live") {
      throw new Error("Twenty API key is required in live mode (set TWENTY_API_KEY).");
    }
    return createMockClient();
  }
  return createLiveClient(opts.baseUrl ?? "http://localhost:3001", apiKey);
}

// ─── Env-based singleton (Twilio-pattern entry point for the app) ───────────

// One cached client PER DEPLOYMENT. This used to be a single `cached` client,
// which is how every rental brand ended up talking to the sales workspace —
// see instance.ts for the full account.
const cached = new Map<TwentyInstanceKey, TwentyClient>();

/**
 * Client for one Twenty deployment. Live when that deployment has both a base
 * URL and its OWN api key; otherwise a mock that "succeeds" without touching
 * the network, so the platform always boots.
 *
 * A deployment with no key of its own falls back to the MOCK, never to another
 * deployment's credentials: writing rental records into the sales workspace
 * would be worse than writing them nowhere, because it is invisible.
 */
export function getTwentyClientForInstance(key: TwentyInstanceKey): TwentyClient {
  const hit = cached.get(key);
  if (hit) return hit;
  const { baseUrl, apiKey, configured } = resolveTwentyInstance(key);
  if (!configured) {
    // SAY IT. The mock "succeeds" at everything, so an unconfigured deployment
    // otherwise reports a clean `projected=0` run forever and reads as working.
    // That is precisely how the rental instance sat at zero records for its
    // whole life without a single error line. Cached per instance, so this
    // prints once per process, not once per call.
    console.warn(
      `[twenty] instance '${key}' (${baseUrl}) has NO API KEY — using the MOCK client. ` +
        `Nothing will be written to it. Set ${key === "rental" ? "TWENTY_RENTAL_API_KEY" : "TWENTY_API_KEY"} to make it live.`
    );
  }
  const client = configured
    ? createTwentyClient({ baseUrl, apiKey, mode: "live" })
    : createTwentyClient({ mode: "mock" });
  cached.set(key, client);
  return client;
}

/** Client for the deployment holding this tenant's workspace. */
export function getTwentyClientForTenantSlug(slug: string | null | undefined): TwentyClient {
  return getTwentyClientForInstance(twentyInstanceForTenantSlug(slug));
}

/**
 * The default (sales) deployment. Kept for callers with no tenant in hand;
 * anything that knows its tenant MUST use getTwentyClientForTenantSlug, or it
 * silently reads and writes the wrong brand's workspace.
 */
export function getTwentyClient(): TwentyClient {
  return getTwentyClientForInstance("default");
}

/** Test seam: drop cached clients so a new env takes effect. */
export function resetTwentyClientCache(): void {
  cached.clear();
}
