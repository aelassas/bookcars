// Renders the sales-pipeline PDF guide from the screenshots in
// docs/sales-pipeline-guide/. Run from platform/:  node scripts/sales-guide-pdf.mjs
// Output: docs/sales-pipeline-guide/TAKE-AUTO-Sales-Pipelines-Guide.pdf

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "..", "docs", "sales-pipeline-guide");

async function img(name) {
  const b64 = await readFile(resolve(OUT, name), "base64");
  return `data:image/png;base64,${b64}`;
}

const html = (s) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 0; font-size: 13.5px; line-height: 1.55; }
  .page { padding: 44px 52px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 30px; margin: 0 0 6px; letter-spacing: -0.5px; }
  h2 { font-size: 19px; margin: 0 0 12px; color: #1d4ed8; }
  .sub { color: #64748b; font-size: 14px; margin: 0; }
  img.shot { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; margin: 12px 0 4px; }
  img.shot.small { width: 88%; display: block; margin-left: auto; margin-right: auto; }
  .cap { color: #64748b; font-size: 12px; margin: 2px 0 14px; }
  ul { margin: 8px 0; padding-left: 20px; }
  li { margin-bottom: 7px; }
  .title-page { display: flex; flex-direction: column; justify-content: center; min-height: 1000px; }
  .title-bar { width: 72px; height: 6px; background: #1d4ed8; border-radius: 3px; margin-bottom: 26px; }
  .flow { margin: 14px 0; }
  .step { display: flex; gap: 14px; align-items: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 13px 16px; margin-bottom: 12px; }
  .num { flex: 0 0 30px; height: 30px; border-radius: 50%; background: #1d4ed8; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 15px; }
  .step p { margin: 3px 0 0; }
  .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 11px 15px; margin: 14px 0; }
  .rules li { margin-bottom: 12px; font-size: 14.5px; }
  .contact { margin-top: 26px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px 18px; font-size: 15px; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 12.5px; }
</style></head><body>

<div class="page title-page">
  <div class="title-bar"></div>
  <h1>TAKE Auto — Your New Sales Workspace</h1>
  <p class="sub" style="font-size:17px; margin-top:10px;">11 September 2026</p>
  <p class="sub" style="font-size:17px;">Prepared for the leasing team</p>
  <p style="margin-top:34px; max-width:560px;">This is a short guide to the new CRM. It replaces the Bitrix boards you used before.
  Read it once — it takes about 3 minutes. Log in at <code>app.takeauto.tech</code> with your work email and your password.</p>
</div>

<div class="page">
  <h2>Two pipelines, same as Bitrix</h2>
  <ul>
    <li>Your pipeline is the <b>same one you had in Bitrix</b>. Same stages, same order. Nothing to re-learn.</li>
    <li><b>Girls</b> work the <b>Primary processing</b> board. <b>Guys</b> work the <b>Sales Department</b> board.</li>
    <li>To open your board: go to <b>Opportunities</b>, click the <b>board name at the top</b> of the list, and pick your board from the menu. Twenty remembers your choice.</li>
  </ul>
  <img class="shot small" src="${s.menu}" alt="View menu">
  <p class="cap">Click the board name at the top to open this menu and switch boards.</p>
  <img class="shot" src="${s.primary}" alt="Primary processing board">
  <p class="cap">The girls' board — <b>Primary processing</b>: New application → Unanswered → Identifying the need → Repeated touch 1 → Re-touch 2.</p>
</div>

<div class="page">
  <h2>The guys' board</h2>
  <img class="shot" src="${s.sales}" alt="Sales Department board">
  <p class="cap">The guys' board — <b>Sales Department</b>: Identifying the need → CP sent → Gearbox warm-up → Meeting scheduled → Meeting held → Approved.</p>
  <div class="note">The boards look empty today — the system went live today. New cards appear on them <b>automatically</b> as customers write in.</div>
</div>

<div class="page">
  <h2>How a lead travels</h2>
  <div class="flow">
    <div class="step"><div class="num">1</div><p>A customer writes on <b>WhatsApp or Telegram</b>. A card appears by itself in <b>New application</b>, assigned to <b>Bayan or Maria</b> — they take turns automatically. Nobody creates cards by hand.</p></div>
    <div class="step"><div class="num">2</div><p>The girl <b>qualifies the customer</b> and moves the card along her stages, same as in Bitrix.</p></div>
    <div class="step"><div class="num">3</div><p>The girl <b>hands the card to a sales guy</b> — reassign the owner or set a Sales stage. The card leaves her board by itself and appears in the guy's <b>Identifying the need</b> column within a minute.</p></div>
    <div class="step"><div class="num">4</div><p>When the customer <b>writes again</b>, the responsible guy gets a <b>Telegram message with a link</b> to the card. You never miss a reply.</p></div>
    <div class="step"><div class="num">5</div><p>An <b>old customer</b> (won or lost before) who writes again goes <b>back to the girls automatically</b> for re-qualification.</p></div>
  </div>
</div>

<div class="page">
  <h2>The fleet board</h2>
  <ul>
    <li>Every car from the <b>Kaiten</b> fleet board is here, with its photo. Same columns as Kaiten.</li>
    <li>The board <b>re-syncs from Kaiten every 30 minutes</b>. Keep Kaiten updated — Twenty follows by itself.</li>
    <li>Cars archived in Kaiten do not show here. Right now there are <b>8 live cars</b>.</li>
  </ul>
  <img class="shot" src="${s.fleet}" alt="Fleet board">
  <p class="cap">Cars → <b>Fleet board</b>. Each card is one car, in the same column as in Kaiten.</p>
</div>

<div class="page">
  <h2>Every car keeps its photo</h2>
  <p>Open a car card to see its details — plate, status, Kaiten notes — and its photo under <b>Files</b>. Click the photo to see it full size.</p>
  <img class="shot" src="${s.car}" alt="Car photo">
  <p class="cap">The Mercedes GLC 300E card, photo opened full size. The photo came from Kaiten by itself.</p>
</div>

<div class="page">
  <h2>House rules</h2>
  <ul class="rules">
    <li><b>Work only from your own board.</b> Girls — Primary processing. Guys — Sales Department. If you look at someone else's board, look, but don't move cards there.</li>
    <li><b>Never delete a card.</b> You can't — only a manager can. If a card looks wrong or doubled, tell a manager, don't try to clean it up yourself.</li>
    <li><b>When you hand a lead to a guy, write one line in the card first</b> — what the customer wants, budget, timing — so he knows the context before he calls.</li>
  </ul>
  <div class="contact"><b>Questions?</b> Something looks broken, a lead didn't appear, you can't log in — contact <b>Omar</b>.</div>
</div>

</body></html>`;

async function main() {
  const shots = {
    primary: await img("01-kanban-primary.png"),
    menu: await img("02-view-menu-crop.png"),
    sales: await img("03-kanban-sales.png"),
    fleet: await img("04-fleet-board.png"),
    car: await img("05-car-card.png"),
  };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html(shots), { waitUntil: "load" });
    await page.pdf({
      path: resolve(OUT, "TAKE-AUTO-Sales-Pipelines-Guide.pdf"),
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await browser.close();
  }
  console.log("pdf →", resolve(OUT, "TAKE-AUTO-Sales-Pipelines-Guide.pdf"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
