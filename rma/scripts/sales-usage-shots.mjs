// Captures the screenshots for the leasing-team usage-guide PDF from the LIVE
// sales Twenty (https://app.takeauto.tech), logged in as Moe.
//
// Run from platform/ so playwright resolves:  node scripts/sales-usage-shots.mjs
// Outputs: ../../docs/sales-usage-guide/*.png
//
// Read-only: never creates/edits a record. The password is the standard staff
// password and is never written into the shots or the PDF.

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "..", "docs", "sales-usage-guide");
const BASE = "https://app.takeauto.tech";
const EMAIL = "moe@takeauto.ae";
const PASSWORD = "12345678";

const VIEW_PRIMARY = "5274ca22-5442-4b88-ae1a-cd2c53447842"; // Primary processing
const VIEW_SALES = "7ffda7c9-01cc-4715-8985-aa653fad18d8";   // Sales Department
const VIEW_FLEET = "cafd94fb-9f61-4485-8819-e154964f96aa";   // Fleet board
const CAR_WITH_PHOTO = "1edee9cf-b0e4-4c47-8dae-e9dd0a9f95f7"; // Mercedes GLC 300E 2021
const LEAD_NO = process.env.LEAD_NO || "93"; // real card on Primary processing

async function snap(page, file) {
  await page.mouse.move(1430, 890);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${file}` });
  console.log("captured", file);
}

async function login(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await snap(page, "00-login.png"); // login form, nothing typed in yet
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  if (await email.count()) {
    await email.fill(EMAIL);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(3000);
  }
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) {
    await pw.fill(PASSWORD);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(9000);
  }
  if (/sign|login|verify/i.test(page.url())) throw new Error("login not accepted: " + page.url());
  // X-App-Version mismatch guard: hard-reload once if the app asks for it.
  const body = await page.locator("body").innerText();
  if (/refresh the page/i.test(body)) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);
  }
}

async function waitForColumn(page, name) {
  const col = page.getByText(name, { exact: false }).first();
  try {
    await col.waitFor({ state: "visible", timeout: 60000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    page.setDefaultTimeout(30_000);
    await login(page);

    // 01 — Opportunities, kanban "Primary processing" (real cards #89–#93).
    await page.goto(`${BASE}/objects/opportunities?viewId=${VIEW_PRIMARY}`, { waitUntil: "domcontentloaded" });
    console.log("primary columns:", await waitForColumn(page, "New application"));
    await page.waitForTimeout(3000);
    await snap(page, "01-kanban-primary.png");

    // 02 — open one real lead card (the continuous conversation note inside).
    const href = await page.evaluate((leadNo) => {
      const a = [...document.querySelectorAll("a")].find((x) =>
        new RegExp(`#${leadNo}\\b`).test(x.textContent || ""));
      return a ? a.getAttribute("href") : null;
    }, LEAD_NO);
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(9000); // notes + timeline settle
      await snap(page, "02-lead-card.png");
      // Open the Notes TAB in the right panel (not the sidebar Notes entry).
      const tabs = page.locator(':text-is("Notes")');
      const tabN = await tabs.count();
      for (let i = 0; i < tabN; i++) {
        const el = tabs.nth(i);
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        if (box && box.x > 500 && box.y < 200) {
          await el.click({ force: true });
          break;
        }
      }
      await page.waitForTimeout(6000);
      await snap(page, "03-lead-card-note.png");
      await page.goBack();
      await page.waitForTimeout(4000);
    } else {
      console.log(`WARN: no card matching #${LEAD_NO} on the board`);
    }
    // 04 — the view switcher dropdown open (shows where boards are picked).
    await page.goto(`${BASE}/objects/opportunities?viewId=${VIEW_PRIMARY}`, { waitUntil: "domcontentloaded" });
    await waitForColumn(page, "New application");
    await page.waitForTimeout(2000);
    const chip = page.getByText("Primary processing", { exact: false }).first();
    if (await chip.count()) {
      await chip.click();
      await page.waitForTimeout(2500);
      await snap(page, "04-view-menu.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
    }

    // 05 — Opportunities, kanban "Sales Department".
    await page.goto(`${BASE}/objects/opportunities?viewId=${VIEW_SALES}`, { waitUntil: "domcontentloaded" });
    console.log("sales columns:", await waitForColumn(page, "CP sent"));
    await page.waitForTimeout(2500);
    await snap(page, "05-kanban-sales.png");

    // 06 — Cars, kanban "Fleet board".
    await page.goto(`${BASE}/objects/cars?viewId=${VIEW_FLEET}`, { waitUntil: "domcontentloaded" });
    console.log("fleet columns:", await waitForColumn(page, "Stock"));
    await page.waitForTimeout(4000); // card covers/photos settle
    await snap(page, "06-fleet-board.png");

    // 07 — one car card with its photo attachment.
    await page.goto(`${BASE}/object/car/${CAR_WITH_PHOTO}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(8000);
    // Open the Files tab (the tab label exists twice — a hidden hover layer and
    // the real one; click the first VISIBLE candidate, force through the layer).
    const tabEls = page.locator(':text-is("Files")');
    const tabCount = await tabEls.count();
    for (let i = 0; i < tabCount; i++) {
      if (await tabEls.nth(i).isVisible()) {
        await tabEls.nth(i).click({ force: true });
        break;
      }
    }
    await page.waitForTimeout(5000);
    // Open the photo preview so the shot shows the actual picture.
    const file = page.getByText(/photo_.*\.jpe?g/i).first();
    if (await file.count()) {
      await file.click();
      await page.waitForTimeout(4000);
    }
    await snap(page, "07-car-card.png");
  } finally {
    await browser.close();
  }
  console.log("shots →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
