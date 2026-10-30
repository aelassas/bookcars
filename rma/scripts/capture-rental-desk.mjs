/**
 * capture-rental-desk.mjs — screenshot the three things Babek asked for, from
 * the real UI, as a real rent-desk user.
 *
 *   printf 'babek@easyrent.com\n<password>\n' > ~/twenty-rental-login.txt
 *   chmod 600 ~/twenty-rental-login.txt
 *   node scripts/capture-rental-desk.mjs --out /tmp/rental-desk
 *
 * Shots: the "By Stage" board (Babek's columns), one deal card carrying its
 * WhatsApp conversation, and the "Won — for promo" view.
 *
 * ── WHY IT RUNS ON THE BOX ──────────────────────────────────────────────────
 * The Twenty frontend is built with SERVER_URL=http://10.255.254.12:3002, the
 * office-LAN address. The box IS that address; the same page opened over
 * Tailscale or from a laptop renders a blank screen because every API call
 * goes to an address the browser cannot reach. Verified 2026-08-07.
 *
 * ── CREDENTIALS ─────────────────────────────────────────────────────────────
 * Read from ~/twenty-rental-login.txt (line 1 email, line 2 password), the
 * same shape capture-twenty-guide.mjs uses. Never printed, never passed on the
 * command line, never committed. Create the file yourself — this script exists
 * so that the password stays between you and the box.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg("out", "/tmp/rental-desk");
const BASE = process.env.TWENTY_UI_URL || "http://10.255.254.12:3002";
const CREDS = arg("creds", join(homedir(), "twenty-rental-login.txt"));

const lines = readFileSync(CREDS, "utf8").split(/\r?\n/);
const EMAIL = lines[0]?.trim();
const PASSWORD = lines[1] ?? "";
if (!EMAIL || !PASSWORD) throw new Error(`${CREDS} needs email on line 1, password on line 2`);

mkdirSync(OUT, { recursive: true });

const shot = async (page, name) => {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  saved ${path}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

try {
  console.log(`[capture] ${BASE} as ${EMAIL}`);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60_000 });

  // Twenty's sign-in is a two-step form: email → Continue → password → Sign in.
  await page.getByPlaceholder(/email/i).fill(EMAIL);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByPlaceholder(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForLoadState("networkidle", { timeout: 60_000 });
  console.log("  signed in");

  // 1 — the board, with Babek's columns.
  await page.getByRole("link", { name: /opportunit|deals/i }).first().click();
  await page.waitForLoadState("networkidle");
  await page.getByText("By Stage", { exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, "1-board-by-stage");

  // 2 — a deal card with its conversation.
  const firstCard = page.locator('[data-testid*="record"], [class*="RecordBoardCard"]').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    await shot(page, "2-deal-with-conversation");
  } else {
    console.warn("  no board card found — skipping the deal shot");
  }

  // 3 — the promo segment.
  await page.goBack();
  await page.waitForLoadState("networkidle");
  await page.getByText("Won — for promo", { exact: false }).first().click();
  await page.waitForTimeout(3000);
  await shot(page, "3-won-for-promo");

  console.log("[capture] done");
} finally {
  await browser.close();
}
