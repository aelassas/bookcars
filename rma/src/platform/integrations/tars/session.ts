// TARS session management.
//
// A TARS "session" is the cookie jar the RTA SSO login (login.rta.ae, Oracle
// Access Manager OAuth2 + OTP) sets on tars.rta.ae: `access_token` (JWT, 1h
// TTL), `session`, plus F5 WAF cookies (TS*). The jar is persisted to a
// gitignored file so repeat syncs within the hour reuse it instead of
// re-logging in (every login costs an SMS/email OTP).
//
// SECURITY: this module NEVER logs passwords, tokens, or cookie values — only
// cookie NAMES and expiry timestamps. The session file itself is gitignored
// and outside the repo's served roots.
//
// The OTP step is deliberately pluggable: `getOtp` is a callback so a future
// email-OTP poller (the code lands in the operator's mailbox) can replace the
// manual file flow without touching the login sequence. The default provider
// polls a file the operator writes by hand.

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Minimal cookie record — structurally compatible with Playwright's Cookie. */
export interface TarsCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
}

interface SessionFile {
  savedAt: string;
  url?: string;
  cookies: TarsCookie[];
}

/** Reuse the jar while the access_token JWT has more than this much life left. */
const MIN_TTL_MS = 5 * 60_000;

const DEFAULT_OTP_FILE = "/tmp/tars-otp.txt";
const OTP_WAIT_TIMEOUT_MS = 10 * 60_000;

function repoRoot(): string {
  // src/platform/integrations/tars/session.ts → rma/
  return resolve(import.meta.dirname, "../../../..");
}

/** Session jar path: TARS_SESSION_FILE, else the gitignored repo-local file. */
export function sessionFilePath(): string {
  return process.env.TARS_SESSION_FILE?.trim() || resolve(repoRoot(), ".tars-session.json");
}

function jwtExpiryMs(jwt: string): number {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export interface LoadedSession {
  cookieHeader: string;
  /** Epoch ms when the access_token JWT expires (0 = unknown → treat as expired). */
  expiresAtMs: number;
}

/**
 * Read the saved cookie jar. Returns null when the file is missing/malformed
 * or the access_token expires within MIN_TTL_MS. Never throws.
 */
export function loadSession(path = sessionFilePath()): LoadedSession | null {
  let parsed: SessionFile;
  try {
    if (!existsSync(path)) return null;
    parsed = JSON.parse(readFileSync(path, "utf8")) as SessionFile;
  } catch {
    return null;
  }
  const cookies = Array.isArray(parsed.cookies) ? parsed.cookies : [];
  if (cookies.length === 0) return null;

  const token = cookies.find((c) => c.name === "access_token");
  if (!token) return null;
  const expiresAtMs = jwtExpiryMs(token.value);
  if (!expiresAtMs || expiresAtMs - Date.now() < MIN_TTL_MS) return null;

  return {
    cookieHeader: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
    expiresAtMs,
  };
}

/** Persist a fresh cookie jar (mode 0600 — it IS the logged-in session). */
export function saveSession(cookies: TarsCookie[], url?: string, path = sessionFilePath()): void {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const payload: SessionFile = { savedAt: new Date().toISOString(), url, cookies };
  writeFileSync(path, JSON.stringify(payload), { mode: 0o600 });
}

/** Drop the jar — call after a TarsSessionExpiredError so the next run re-logs in. */
export function clearSession(path = sessionFilePath()): void {
  try {
    unlinkSync(path);
  } catch {
    /* already gone */
  }
}

/**
 * Default OTP provider: polls a file (TARS_OTP_FILE, default /tmp/tars-otp.txt)
 * until the operator writes the SMS/email code into it. Manual-run friendly;
 * swap for an email poller when the OTP mailbox is automated.
 */
export function fileOtpProvider(
  file = process.env.TARS_OTP_FILE?.trim() || DEFAULT_OTP_FILE,
  timeoutMs = OTP_WAIT_TIMEOUT_MS,
): () => Promise<string> {
  return async () => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (existsSync(file)) {
        const code = readFileSync(file, "utf8").trim();
        if (/^\d{4,8}$/.test(code)) return code;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error(`OTP timeout — no code appeared in ${file} within ${timeoutMs / 60000} min`);
  };
}

export interface TarsLoginOptions {
  username: string;
  password: string;
  /** Called once the SSO page has dispatched the OTP. */
  getOtp: () => Promise<string>;
  /** Which channel to request the OTP on (default email). */
  otpChannel?: "email" | "mobile";
  headless?: boolean;
}

/**
 * Full SSO login via real Chrome (F5 WAF fingerprinting makes a headless-shell
 * client unreliable). Refactored from scripts/tars-probe-login.ts, which proved
 * this sequence live on 2026-10-23. Returns the tars.rta.ae cookie jar.
 *
 * Playwright is imported dynamically so this module stays import-safe for the
 * Next.js server bundle and for workers that never log in.
 */
export async function loginWithPlaywright(opts: TarsLoginOptions): Promise<TarsCookie[]> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: opts.headless ?? true, channel: "chrome" });
  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();

    await page.goto("https://tars.rta.ae/apps/business/en/rentals", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(3000);
    await page.locator('a:has-text("Login")').first().click();
    await page.waitForTimeout(4000);

    const credForm = page.locator('form[action*="auth_cred_submit"]').first();
    await credForm.locator('input[name="username"]').fill(opts.username);
    await credForm.locator('input[name="password"]').fill(opts.password);
    const submitBtn = credForm
      .locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign")')
      .first();
    await submitBtn.click().catch(async () => {
      await credForm.locator('input[name="password"]').press("Enter");
    });
    await page.waitForTimeout(6000);

    const text = await page.locator("body").innerText();
    if (!text.includes("Send OTP")) {
      throw new Error(
        `TARS login: unexpected page after credentials (${page.url()}): ${text.slice(0, 200)}`,
      );
    }

    const channel = opts.otpChannel ?? process.env.TARS_OTP_CHANNEL ?? "email";
    await page
      .locator(`text=/Send OTP to ${channel === "email" ? "email" : "mobile"}/i`)
      .first()
      .click()
      .catch(() => {});
    await page.locator('button:has-text("Send OTP"), input[value*="Send OTP"]').first().click();

    const otp = await opts.getOtp();
    const otpInput = page
      .locator('input[type="text"]:visible, input[name*="otp" i], input[id*="otp" i]')
      .first();
    await otpInput.fill(otp);
    await page
      .locator('button[type="submit"]:visible, button:has-text("Verify"), button:has-text("Submit"), input[type="submit"]:visible')
      .first()
      .click();
    await page.waitForTimeout(8000);

    // Consent page, if shown.
    for (let i = 0; i < 3 && !page.url().includes("tars.rta.ae"); i++) {
      const approve = page
        .locator('button:has-text("Allow"), button:has-text("Approve"), input[type="submit"]:visible')
        .first();
      if (await approve.count()) {
        await approve.click().catch(() => {});
        await page.waitForTimeout(5000);
      } else break;
    }
    await page.waitForTimeout(3000);

    if (!page.url().includes("tars.rta.ae")) {
      throw new Error(`TARS login: ended on ${page.url()} instead of tars.rta.ae — login failed`);
    }

    const cookies = (await ctx.cookies("https://tars.rta.ae")) as TarsCookie[];
    if (!cookies.some((c) => c.name === "access_token")) {
      throw new Error("TARS login completed but no access_token cookie was set");
    }
    return cookies;
  } finally {
    await browser.close();
  }
}

export interface EnsureSessionOptions {
  getOtp?: () => Promise<string>;
  otpChannel?: "email" | "mobile";
  headless?: boolean;
}

/**
 * Hand the caller a valid cookie header: reuse the saved jar when the
 * access_token has >5 min left, otherwise run the full SSO login (needs
 * TARS_USERNAME / TARS_PASSWORD in env) and persist the fresh jar.
 */
export async function ensureSession(opts: EnsureSessionOptions = {}): Promise<LoadedSession> {
  const cached = loadSession();
  if (cached) return cached;

  const username = process.env.TARS_USERNAME;
  const password = process.env.TARS_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "TARS session expired/absent and TARS_USERNAME / TARS_PASSWORD are not set — cannot re-login.",
    );
  }

  console.log(
    `[tars] No usable session — starting SSO login. When the OTP arrives, ` +
      `write it to ${process.env.TARS_OTP_FILE?.trim() || DEFAULT_OTP_FILE}`,
  );
  const cookies = await loginWithPlaywright({
    username,
    password,
    getOtp: opts.getOtp ?? fileOtpProvider(),
    otpChannel: opts.otpChannel,
    headless: opts.headless,
  });
  saveSession(cookies);

  const fresh = loadSession();
  if (!fresh) throw new Error("TARS login succeeded but the saved session did not validate");
  return fresh;
}
