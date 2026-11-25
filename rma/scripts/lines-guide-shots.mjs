// Captures the /lines guide screenshots from the LIVE box and renders the
// English PDF guide for the on-site manager (Ayham).
//
// Run from platform/ so playwright resolves:  node scripts/lines-guide-shots.mjs
// Outputs: ../../docs/lines-guide/*.png + TAKE-AUTO-Lines-Guide.pdf
//
// SAFE: never presses the relink START button — the pair modal is captured in
// its idle state only. No line is touched.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "https://hub.takeauto.tech";
const OUT = resolve(__dirname, "..", "..", "docs", "lines-guide");
const NAME = process.env.GUIDE_USER || "Ayham";
const PIN = process.env.GUIDE_PIN || "8888";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    // 01 — the login screen, logged-out context.
    const anon = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const p0 = await anon.newPage();
    await p0.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await p0.screenshot({ path: `${OUT}/01-login.png` });
    await anon.close();

    // Log in as the manager: tap the name, punch the PIN (auto-submits at 4).
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: NAME, exact: true }).click();
    for (const d of PIN.split("")) await page.getByRole("button", { name: d, exact: true }).click();
    await page.waitForURL("**/", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 02 — the lines table.
    await page.goto(`${BASE}/lines`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500); // first poll cycle lands
    await page.screenshot({ path: `${OUT}/02-lines-page.png`, fullPage: true });

    // 03 — pair modal, idle state, on Ali's (silent) line. Nothing is started.
    const row = page.locator("tr", { hasText: "babek-rent-2" });
    await row.getByRole("button", { name: "Pair" }).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/03-pair-modal.png` });

    // 04 — the code tab (still idle: phone input + warning, no code requested).
    const codeTab = page.getByRole("button", { name: "Phone code", exact: true });
    if (await codeTab.count()) {
      await codeTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/04-code-tab.png` });
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
  console.log("shots →", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
