// Google Sheets access for Babek's booking sheet — hand-rolled service-account
// auth (no new npm deps): a JWT (RS256, node:crypto) is signed locally and
// exchanged at Google's oauth endpoint for an access token, then plain
// Sheets v4 REST calls (values.append / values.get) do the work.
//
// Env (either form):
//   GOOGLE_SA_CLIENT_EMAIL + GOOGLE_SA_PRIVATE_KEY  (PEM, \n-escaped)
//   GOOGLE_SA_KEY_FILE                              (path to the SA JSON file)
//
// Absent creds are NOT an error: loadServiceAccount() returns null and the
// caller logs "sheet skipped (no SA)" and moves on — the sheet must never
// gate the deal broadcast.

import { createSign } from "crypto";
import { readFileSync } from "fs";

/** Babek's daily rental sheet (gid=0) — the broadcast appends bookings here
 *  and import-babek-fleet.ts reads the same spreadsheet back. */
export const BABEK_SHEET_ID = "1jgPLQ8KAWLYKVL16ocAzpG_n-LU29wRMh5D75C_lJ64";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const REQUEST_TIMEOUT_MS = 15_000;

export interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
}

/** Creds from env, or null when none are configured (the skip path). */
export function loadServiceAccount(
  env: Record<string, string | undefined> = process.env
): ServiceAccount | null {
  const file = env.GOOGLE_SA_KEY_FILE?.trim();
  if (file) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
      }
    } catch {
      // Fall through to the env pair; a bad file path is a config error the
      // caller sees as "no SA" rather than a crash.
    }
  }
  const clientEmail = env.GOOGLE_SA_CLIENT_EMAIL?.trim();
  const privateKey = env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return { clientEmail, privateKey };
}

const b64url = (input: string | Buffer): string => Buffer.from(input).toString("base64url");

// Access tokens live an hour; cache per service account and refresh a minute
// early so a long-running relay mints one token per hour, not one per row.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

/** A Google oauth access token for the Sheets scope, minted from the SA JWT. */
export async function sheetsAccessToken(sa: ServiceAccount): Promise<string> {
  const hit = tokenCache.get(sa.clientEmail);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const assertion = `${header}.${payload}.${signer.sign(sa.privateKey, "base64url")}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`google oauth token HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("google oauth token response carried no access_token");
  tokenCache.set(sa.clientEmail, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

/** Append ONE row to the sheet (values.append, RAW — what we write is what
 *  the cell shows; their dates are typed d/m/yyyy and stay text). */
export async function appendSheetRow(
  sa: ServiceAccount,
  spreadsheetId: string,
  row: (string | number)[],
  range = "A1"
): Promise<void> {
  const token = await sheetsAccessToken(sa);
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append` +
      `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row.map((c) => String(c))] }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (!res.ok) {
    throw new Error(`sheets append HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** Read a range (values.get) — the service-account replacement for the dead
 *  public-CSV fetch in import-babek-fleet.ts. Empty cells come back absent. */
export async function getSheetValues(
  sa: ServiceAccount,
  spreadsheetId: string,
  range = "A1:ZZ100000"
): Promise<string[][]> {
  const token = await sheetsAccessToken(sa);
  const res = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
  );
  if (!res.ok) {
    throw new Error(`sheets get HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}
