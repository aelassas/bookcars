// TARS (tars.rta.ae — Dubai RTA "Transport Activities Rental System") API client.
//
// Reverse-engineered and verified live on 2026-10-23 (see scripts/tars-probe-login.ts
// for the login probe and /tmp/probe-*.json for captured responses):
//
//   - Auth is cookie-based ONLY. RTA SSO (login.rta.ae, Oracle Access Manager
//     OAuth2) sets `access_token` (JWT, 1h TTL), `session` and F5 WAF cookies
//     (TS*) on tars.rta.ae. Every API call is a same-origin GET/POST carrying
//     those cookies — there is no Authorization header.
//   - When the cookies lapse, the API answers with a redirect chain into
//     login.rta.ae (or a bare 401/403 from the WAF). We surface all three as
//     TarsSessionExpiredError so callers know to re-login, not to retry.
//
// Endpoints (org DID like "did:rta:51646245", from TARS_ORG_DID):
//   GET /api/agencies/{orgDid}                    agency profile (permit, license)
//   GET /api/agencies/{orgDid}/vehicles           fleet; meta {hits, page, size}.
//                                                 Query-string paging was IGNORED
//                                                 in probes — the frontend sizes
//                                                 via the path on other resources
//                                                 (rentals/500), so we try
//                                                 /vehicles/{size} first and fall
//                                                 back to plain /vehicles + paging,
//                                                 deduping by did and trusting
//                                                 meta.hits as the target count.
//   GET /api/agencies/{orgDid}/vehicle/{vin}      single vehicle detail
//   GET /api/agencies/{orgDid}/rentals/{size}?p={page}&q={search}&s={status}
//                                                 rental contracts; size is a PATH
//                                                 segment, p is the 1-based page.

// Node's undici has no total-response timeout; bound every call (AGENTS.md #11).
const REQUEST_TIMEOUT_MS = 30_000;

const DEFAULT_BASE_URL = "https://tars.rta.ae";

// A real desktop UA — tars.rta.ae sits behind F5 BigIP, which is content with
// a scripted client but expects a browser-shaped User-Agent.
const TARS_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

/** The cookies lapsed (or were never valid) — the caller must re-login. */
export class TarsSessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TarsSessionExpiredError";
  }
}

// ---- Response shapes (only the fields the sync reads) ----------------------
// Field shapes below are taken from the verified probe payloads, not guessed.

export interface TarsLocalized {
  en?: string | null;
  ar?: string | null;
}

export interface TarsListMeta {
  hits: number;
  page: number;
  size: number;
}

export interface TarsVehicle {
  did: string; // "did:rta:{VIN}"
  sourceKey: string; // the VIN
  vin?: string;
  status?: string; // "AVAILABLE" | "RENTED"
  allowReservation?: boolean;
  modelYear?: number;
  capacity?: number;
  vehicleMake?: { name?: TarsLocalized };
  vehicleModel?: { name?: TarsLocalized };
  plate?: {
    number?: string;
    code?: TarsLocalized;
    source?: TarsLocalized; // issuing emirate, e.g. {en:"DXB"}
    category?: TarsLocalized;
  };
  color?: { name?: TarsLocalized };
  details?: {
    fuelType?: { name?: TarsLocalized };
    engineCapacity?: number;
    registration?: {
      issuedDate?: string | null; // "2026-09-30"
      expiryDate?: string | null; // "2027-09-27"
    };
  };
}

export interface TarsDriver {
  did?: string; // "did:eid:784198565684887"
  isCustomer?: boolean;
  isDriver?: boolean;
  customerType?: string; // "INDIVIDUAL"
  nationality?: string; // ISO-3, e.g. "AZE"
  name?: {
    en?: { firstName?: string; lastName?: string };
    ar?: { firstName?: string; lastName?: string };
  };
  emiratesId?: { id?: string; expiryDate?: string };
  contact?: {
    phones?: { countryCode?: string; phone?: string; preferred?: boolean }[];
    emails?: { email?: string; preferred?: boolean }[];
  };
  driverLicense?: { id?: string; expiryDate?: string };
}

export interface TarsRental {
  documentNumber: string; // "55606-3350" — the upsert key
  did: string;
  kind?: string; // "B2C"
  status?: string; // "ACTIVE" | "CLOSED"
  documentDateTime?: string;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  details?: {
    startDate?: string;
    expectedReturnDate?: string;
    isCurrent?: boolean;
    drivers?: TarsDriver[];
    vehicle?: TarsVehicle; // embedded snapshot — same full shape as the fleet list
    readings?: {
      readAt?: string;
      fuelLevel?: { value?: number; unit?: string };
      odometer?: { value?: number; unit?: string };
    }[];
  }[];
  attachments?: { label?: string; url?: string; hash?: string }[];
}

export interface TarsAgency {
  did: string;
  sourceKey?: string;
  name?: TarsLocalized;
  tradeLicenseNumber?: string;
}

interface TarsListResponse<T> {
  meta?: TarsListMeta;
  data?: T[];
}

export interface TarsClientOptions {
  /** Agency DID, e.g. "did:rta:51646245" (TARS_ORG_DID). */
  orgDid: string;
  /** Serialized "name=value; …" cookie header from session.ts. Never logged. */
  cookieHeader: string;
  /** Defaults to https://tars.rta.ae (TARS_BASE_URL). */
  baseUrl?: string;
  timeoutMs?: number;
}

export class TarsClient {
  private readonly orgDid: string;
  private readonly cookieHeader: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: TarsClientOptions) {
    this.orgDid = opts.orgDid;
    this.cookieHeader = opts.cookieHeader;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  /** Agency profile (permit, trade license). */
  async getAgency(): Promise<TarsAgency> {
    return this.get<TarsAgency>(`/api/agencies/${this.orgDid}`);
  }

  /**
   * Full fleet. Query-string paging was ignored in probes, so this asks for a
   * large page via the path segment (as the frontend does for rentals), falls
   * back to the bare endpoint if the path form 404s, then keeps paging and
   * dedupes by did until meta.hits is satisfied or a page adds nothing new.
   */
  async listVehicles(size = 500): Promise<TarsVehicle[]> {
    let first: TarsListResponse<TarsVehicle>;
    try {
      first = await this.get<TarsListResponse<TarsVehicle>>(
        `/api/agencies/${this.orgDid}/vehicles/${size}`,
      );
    } catch (e) {
      if (e instanceof TarsSessionExpiredError) throw e;
      // Path-style sizing unsupported → bare endpoint (probe default: 10/page).
      first = await this.get<TarsListResponse<TarsVehicle>>(`/api/agencies/${this.orgDid}/vehicles`);
    }

    const seen = new Map<string, TarsVehicle>();
    for (const v of first.data ?? []) seen.set(v.did ?? v.sourceKey, v);
    const hits = first.meta?.hits ?? seen.size;

    // If the first page already satisfied hits, done. Otherwise page defensively:
    // even though probes showed paging params ignored, follow meta.hits and stop
    // as soon as a page contributes nothing new (ignored params → same page).
    for (let page = 2; seen.size < hits && page <= 50; page++) {
      const before = seen.size;
      const res = await this.get<TarsListResponse<TarsVehicle>>(
        `/api/agencies/${this.orgDid}/vehicles/${size}?p=${page}`,
      );
      for (const v of res.data ?? []) seen.set(v.did ?? v.sourceKey, v);
      if (seen.size === before) break;
    }
    return [...seen.values()];
  }

  /** One vehicle by VIN (TARS sourceKey). */
  async getVehicle(vinOrSourceKey: string): Promise<TarsVehicle> {
    return this.get<TarsVehicle>(
      `/api/agencies/${this.orgDid}/vehicle/${encodeURIComponent(vinOrSourceKey)}`,
    );
  }

  /**
   * Rental contracts. `size` is a PATH segment (verified: /rentals/500),
   * `page` is the 1-based `p` query param. Follows meta.hits across pages.
   */
  async listRentals(opts: { size?: number; page?: number; q?: string; s?: string } = {}): Promise<TarsRental[]> {
    const size = opts.size ?? 500;
    const startPage = opts.page ?? 1;
    const out = new Map<string, TarsRental>();

    for (let page = startPage, guard = 0; guard < 100; page++, guard++) {
      const params = new URLSearchParams({ p: String(page) });
      if (opts.q) params.set("q", opts.q);
      if (opts.s) params.set("s", opts.s);
      const res = await this.get<TarsListResponse<TarsRental>>(
        `/api/agencies/${this.orgDid}/rentals/${size}?${params}`,
      );
      const before = out.size;
      for (const r of res.data ?? []) out.set(r.did ?? r.documentNumber, r);
      const hits = res.meta?.hits ?? out.size;
      if (out.size >= hits || out.size === before) break;
    }
    return [...out.values()];
  }

  // ---- internals -----------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      redirect: "manual", // an auth lapse is a redirect into login.rta.ae
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        "User-Agent": TARS_UA,
        Accept: "application/json, text/plain, */*",
        Cookie: this.cookieHeader,
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      if (/login|oauth|sso/i.test(location) || location.includes("login.rta.ae")) {
        throw new TarsSessionExpiredError(`TARS redirected to login (${res.status}) — session expired`);
      }
      throw new Error(`TARS ${path}: unexpected redirect ${res.status} → ${location}`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new TarsSessionExpiredError(`TARS ${path}: HTTP ${res.status} — session expired`);
    }
    if (!res.ok) {
      throw new Error(`TARS ${path}: HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      // The SPA's index.html instead of JSON = bounced back to the login app.
      throw new TarsSessionExpiredError(`TARS ${path}: non-JSON response (${contentType}) — session expired`);
    }
    return (await res.json()) as T;
  }
}
