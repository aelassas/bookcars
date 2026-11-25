// Dead-simple one-thing-per-page quickstart for the agents.
//   cd platform && node scripts/agent-quickstart-pdf.mjs
//   → docs/sales-pipeline-guide/TAKE-AUTO-Agent-Quickstart.pdf
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, "..", "..", "docs", "sales-pipeline-guide");
const img = async (n) => `data:image/png;base64,${await readFile(resolve(DIR, n), "base64")}`;
const board = await img("01-kanban-primary.png");

const html = `<!doctype html><html><head><meta charset="utf-8"><title>TAKE Auto — Agent Quickstart</title><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0f172a; }
  .page { width: 210mm; height: 296mm; padding: 20mm 20mm; page-break-after: always; position: relative; }
  .page:last-child { page-break-after: avoid; }
  .num { font-size: 15pt; font-weight: 700; color: #fff; background: #0f2a43; width: 16mm; height: 16mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  h1 { font-size: 30pt; margin: 6mm 0 3mm; line-height: 1.1; }
  p { font-size: 15pt; color: #334155; line-height: 1.5; margin-bottom: 4mm; }
  .big { font-size: 19pt; font-weight: 700; color: #0f2a43; }
  .pill { display: inline-block; background: #fef3c7; color: #92400e; font-weight: 700; padding: 1mm 3mm; border-radius: 4mm; font-size: 15pt; }
  img { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; margin-top: 4mm; }
  .stop { background: #fef2f2; border: 2px solid #dc2626; color: #7f1d1d; padding: 5mm; border-radius: 8px; font-size: 15pt; font-weight: 600; margin-top: 5mm; }
  .ok { background: #f0fdf4; border: 2px solid #16a34a; color: #14532d; padding: 5mm; border-radius: 8px; font-size: 15pt; margin-top: 5mm; }
  .band { background: #0f2a43; color: #fff; margin: -20mm -20mm 8mm; padding: 22mm 20mm 12mm; }
  .band .brand { font-size: 9pt; letter-spacing: 3px; text-transform: uppercase; color: #7fb3d5; }
  .band h1 { font-size: 34pt; margin-top: 3mm; }
  .band .sub { color: #cbd5e1; font-size: 14pt; margin-top: 3mm; }
  .foot { position: absolute; bottom: 12mm; left: 20mm; right: 20mm; font-size: 9pt; color: #94a3b8; }
</style></head><body>

<div class="page">
  <div class="band">
    <div class="brand">TAKE Auto</div>
    <h1>Your leads — the 1-page guide</h1>
    <div class="sub">app.takeauto.tech · 4 steps · nothing else to learn</div>
  </div>
  <p class="big">Everything you need is 4 steps. Do these and you are done.</p>
  <p>1️⃣&nbsp; Open <b>your own board</b> — the star with your name.</p>
  <p>2️⃣&nbsp; A <b>🔴 red dot</b> means answer that customer now.</p>
  <p>3️⃣&nbsp; <b>Drag a card</b> to the next column when you move it forward.</p>
  <p>4️⃣&nbsp; Never open <b>“All Opportunities”</b> — it is slow and it is not your list.</p>
  <div class="ok">You do not need filters. You do not need settings. Your star board is already set up for you.</div>
  <div class="foot">TAKE Auto — Agent Quickstart · 29.09.2026</div>
</div>

<div class="page">
  <div class="num">1</div>
  <h1>Open your own board</h1>
  <p>Top-left, click the view name and pick the one with the <span class="pill">⭐ your name</span> — for example <b>“⭐ Azat — my leads”</b>.</p>
  <p class="big">That board shows only YOUR leads. Nobody else's. Only the ones still open.</p>
  <p>When you come back later, open it again the same way. It remembers everything — you never set filters.</p>
  <div class="stop">Do NOT use “All Opportunities”. It loads 78,000 old records, it is slow, and it is not your work.</div>
  <div class="foot">TAKE Auto — Agent Quickstart · 29.09.2026</div>
</div>

<div class="page">
  <div class="num">2</div>
  <h1>Read a card without opening it</h1>
  <p>Each card already shows what you need: the customer, <b>🔴 if they are waiting</b>, the phone, which car they want, and the stage.</p>
  <img src="${board}">
  <p style="margin-top:4mm"><span class="pill">🔴 = reply now</span> &nbsp; The customer wrote and nobody answered yet. Clear it by replying on WhatsApp — the dot goes away by itself.</p>
  <div class="foot">TAKE Auto — Agent Quickstart · 29.09.2026</div>
</div>

<div class="page">
  <div class="num">3</div>
  <h1>Move a lead forward</h1>
  <p class="big">Hold the card with the mouse and drag it to the next column. That's it.</p>
  <p>Just like moving a car on the cars board. You do <b>not</b> open the lead. You do <b>not</b> change any setting. Hold, drag, drop.</p>
  <div class="ok">The columns are your stages: New application → Unanswered → Identifying the need → follow-ups, and for the sales board: CP sent → Proposal warm-up → Meeting → Approved.</div>
  <div class="foot">TAKE Auto — Agent Quickstart · 29.09.2026</div>
</div>

<div class="page">
  <div class="num">4</div>
  <h1>When a lead is dead</h1>
  <p>Do not delete it — you can't, and you shouldn't. Set it to <b>Lost</b> and pick the reason from the list.</p>
  <p>That is how the boss sees which adverts bring real customers. A lead left sitting with no reply and no “Lost” just looks like you forgot it.</p>
  <div class="stop">If something looks broken, do not say “the system is not working”. Send one thing: the <b>customer's phone number</b> and the <b>time</b>. That gets a real answer in minutes.</div>
  <div class="foot">TAKE Auto — Agent Quickstart · 29.09.2026</div>
</div>

</body></html>`;

const h = resolve(DIR, "agent-quickstart.html");
const pdf = resolve(DIR, "TAKE-AUTO-Agent-Quickstart.pdf");
await writeFile(h, html, "utf8");
execFileSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless","--disable-gpu","--no-pdf-header-footer",`--print-to-pdf=${pdf}`,`file://${h}`],{stdio:"ignore"});
console.log("guide →", pdf);
