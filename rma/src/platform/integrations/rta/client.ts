// RTA Dubai public traffic-fines connector.
//
// The Dubai RTA "Fines Inquiry and Payment" page (ums.rta.ae/violations/
// public-fines/fines-search) exposes a genuinely anonymous, no-login,
// no-captcha per-plate fines lookup behind the comgw.rta.ae gateway. This
// module reproduces its call sequence from plain Node — no browser needed.
//
// How it works (reverse-engineered 2026-08-10, see the take-auto-rta-fines
// memory + docs-ingest/rta-integration-map.md):
//   1. Every request/response body is AES-128-CBC encrypted and wrapped as
//      { "_data": "<base64>" }. Key = base64-decode of a client-side constant
//      shipped in the SPA bundle; the IV is the same 16 bytes. See RTA_AES_KEY.
//   2. POST /auth/anonymous/login  { channelCode, apiKey }  -> a guest JWT
//      (ROLE_ANONYMOUS, ~30 min). We cache it and re-mint on expiry.
//   3. POST /comgw/cvs/api/public/payable-fines  { plate fields, paging }
//      -> the list of payable fines for that plate, across all emirates.
//
// The key and apiKey are client-side constants baked into a public web bundle
// (not secrets, not our data) but they CAN rotate on an RTA redeploy. If
// decryption suddenly fails, re-pull them (see refreshConstants notes in the
// memory file) and update the env overrides below. Everything is overridable
// via env so a rotation is a config change, not a code change.

import crypto from "node:crypto";

// ---- Client-side constants (overridable via env on rotation) -------------

// Base64 form of the AES key constant (`P0`) from SPA chunk 299, module 0xd7ea.
const RTA_AES_KEY_B64 = process.env.RTA_AES_KEY_B64 ?? "WGckN3lQXnEyWiFuUjU+aw==";
// The anonymous-login apiKey constant carried in the login request body.
const RTA_API_KEY =
  process.env.RTA_API_KEY ?? "Ry79>YA(-]-x}`%yC}[-.ct%HR>;3y-M)8W^r7)ewt7Rp5R6U;";

const RTA_GATEWAY = process.env.RTA_GATEWAY ?? "https://comgw.rta.ae";
const RTA_ORIGIN = "https://ums.rta.ae";
// A real desktop UA — the gateway sits behind F5 BigIP ASM, which is content
// with a scripted client but expects a browser-shaped User-Agent.
const RTA_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

const RTA_KEY = Buffer.from(RTA_AES_KEY_B64, "base64"); // 16 bytes

// Node's undici has no total-response timeout; bound every call (AGENTS.md #11).
const REQUEST_TIMEOUT_MS = 30_000;
// The gateway occasionally times out under load; one retry clears it.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      // Retry transient upstream failures; return anything else to the caller.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e; // timeout / network reset
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("RTA request failed");
}

// ---- Crypto envelope ------------------------------------------------------

function encrypt(obj: unknown): string {
  const c = crypto.createCipheriv("aes-128-cbc", RTA_KEY, RTA_KEY);
  return Buffer.concat([
    c.update(Buffer.from(JSON.stringify(obj), "utf8")),
    c.final(),
  ]).toString("base64");
}

function decrypt(b64: string): string {
  const d = crypto.createDecipheriv("aes-128-cbc", RTA_KEY, RTA_KEY);
  return Buffer.concat([d.update(Buffer.from(b64, "base64")), d.final()]).toString("utf8");
}

/** Unwrap a `{_data: <cipher>}` response; pass plain JSON straight through. */
function unwrap(text: string): unknown {
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && "_data" in parsed) {
    return JSON.parse(decrypt((parsed as { _data: string })._data));
  }
  return parsed;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "User-Agent": RTA_UA,
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    Origin: RTA_ORIGIN,
    Referer: `${RTA_ORIGIN}/`,
    ...extra,
  };
}

// ---- Types ----------------------------------------------------------------

/** The four fields RTA needs to identify a plate. */
export interface PlateQuery {
  /** Issuing-emirate source code, e.g. "DXB" (Dubai), "AUH", "SHJ". */
  sourceCode: string;
  /** dxPlateCategoryCode, e.g. "PRIVATE". */
  plateCategory: string;
  /** dxPlateCode — the plate letter/code, e.g. "M", "K". "" if none. */
  plateCode: string;
  /** The numeric part of the plate, e.g. "50154". */
  plateNo: string;
}

/** One localized string as RTA returns it. */
interface LocalizedText {
  en: string;
  ar: string;
}

/** One payable fine, distilled from a payable-fines `content[]` row. */
export interface RtaFine {
  referenceNo: string; // trafficFineReferenceNo
  amount: number; // totalFine, AED
  blackPoints: number;
  description: string; // finesDescription.en
  ticketDate: string; // ISO, e.g. "2026-06-05T14:51:59"
  source: string; // sourceDetails.en, e.g. "Abu Dhabi Traffic"
  plate: string; // plateDetails.en, human-readable
  car?: string; // carDetails.en (make/model/year/colour) when present
}

/** The result of a plate lookup. */
export interface RtaFinesResult {
  query: PlateQuery;
  fines: RtaFine[];
  totalAmount: number; // sum of amount across fines
  totalBlackPoints: number;
  fetchedAt: string; // ISO timestamp
}

// ---- Auth (guest token, cached) ------------------------------------------

let cachedToken: { jwt: string; cookie: string; expMs: number } | null = null;

function jwtExpiryMs(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function getGuestAuth(): Promise<{ jwt: string; cookie: string }> {
  // Re-use while >60s of life remains.
  if (cachedToken && cachedToken.expMs - Date.now() > 60_000) {
    return { jwt: cachedToken.jwt, cookie: cachedToken.cookie };
  }

  const res = await fetchWithRetry(`${RTA_GATEWAY}/auth/anonymous/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ _data: encrypt({ channelCode: "PORTAL", apiKey: RTA_API_KEY }) }),
  });
  if (!res.ok) {
    throw new Error(`RTA anonymous login failed: HTTP ${res.status}`);
  }

  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");

  const body = unwrap(await res.text()) as { access_token?: string; accessToken?: string };
  const jwt = body.access_token ?? body.accessToken;
  if (!jwt) throw new Error("RTA anonymous login returned no access_token");

  cachedToken = { jwt, cookie, expMs: jwtExpiryMs(jwt) || Date.now() + 25 * 60_000 };
  return { jwt, cookie };
}

// ---- Public API -----------------------------------------------------------

/**
 * Look up payable traffic fines for one plate. Returns every fine RTA reports
 * for the plate (all emirates), already summed. Throws on transport / auth
 * failure so callers (workers, the bot) can log and retry.
 */
export async function lookupFines(query: PlateQuery): Promise<RtaFinesResult> {
  const { jwt, cookie } = await getGuestAuth();

  const requestBody = {
    sortBy: "CREATION_DATE",
    sortDirection: "DESC",
    rtaUnifiedNo: null,
    pageSize: 50,
    pageNo: 0,
    plateCategory: query.plateCategory,
    plateNo: query.plateNo,
    plateCode: query.plateCode,
    searchKey: "",
    sourceCode: query.sourceCode,
    source: query.sourceCode,
    sourceType: "UAE",
    licenseSource: null,
    driverLicenseNumber: null,
    fineNumber: null,
    fineYear: null,
    fineSource: null,
    countryId: null,
    searchFilter: false,
  };

  const res = await fetchWithRetry(`${RTA_GATEWAY}/comgw/cvs/api/public/payable-fines`, {
    method: "POST",
    headers: headers({ Authorization: `Bearer ${jwt}`, Cookie: cookie }),
    body: JSON.stringify({ _data: encrypt(requestBody) }),
  });
  if (!res.ok) {
    throw new Error(`RTA payable-fines failed: HTTP ${res.status}`);
  }

  const body = unwrap(await res.text()) as { content?: RawFine[] };
  const rows = Array.isArray(body.content) ? body.content : [];
  const fines: RtaFine[] = rows.map(toFine);

  return {
    query,
    fines,
    totalAmount: fines.reduce((sum, f) => sum + f.amount, 0),
    totalBlackPoints: fines.reduce((sum, f) => sum + f.blackPoints, 0),
    fetchedAt: new Date().toISOString(),
  };
}

// Raw payable-fines row shape (only the fields we surface).
interface RawFine {
  trafficFineReferenceNo?: string;
  totalFine?: number;
  blackPoints?: number;
  finesDescription?: LocalizedText;
  ticketDate?: string;
  sourceDetails?: LocalizedText;
  plateDetails?: LocalizedText;
  carDetails?: LocalizedText;
}

function toFine(r: RawFine): RtaFine {
  return {
    referenceNo: r.trafficFineReferenceNo ?? "",
    amount: typeof r.totalFine === "number" ? r.totalFine : 0,
    blackPoints: typeof r.blackPoints === "number" ? r.blackPoints : 0,
    description: r.finesDescription?.en ?? "",
    ticketDate: r.ticketDate ?? "",
    source: r.sourceDetails?.en ?? "",
    plate: r.plateDetails?.en ?? "",
    car: r.carDetails?.en,
  };
}

/** Test/diagnostic hook: expose the envelope so a rotation can be verified. */
export const __rtaInternals = { encrypt, decrypt, unwrap };
