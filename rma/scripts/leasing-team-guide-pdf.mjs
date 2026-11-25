// Builds the leasing team's working guide for app.takeauto.tech.
// Screenshots come from docs/sales-pipeline-guide/ (refresh them first with
// `node scripts/sales-guide-shots.mjs`).
//
//   cd platform && node scripts/leasing-team-guide-pdf.mjs
//   → docs/sales-pipeline-guide/TAKE-AUTO-Leasing-Team-Guide.pdf

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, "..", "..", "docs", "sales-pipeline-guide");

async function img(name) {
  const b64 = await readFile(resolve(DIR, name), "base64");
  return `data:image/png;base64,${b64}`;
}

const shots = {
  primary: await img("01-kanban-primary.png"),
  sales: await img("03-kanban-sales.png"),
  views: await img("02-view-menu.png"),
};

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TAKE Auto — Leasing Team Guide</title><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #0f172a; font-size: 10.5pt; line-height: 1.5; }
  .page { width: 210mm; height: 296mm; padding: 16mm 15mm 14mm; page-break-after: always; position: relative; overflow: hidden; }
  .page:last-child { page-break-after: avoid; }
  .band { background: #0f2a43; color: #fff; margin: -16mm -15mm 7mm; padding: 16mm 15mm 11mm; }
  .band .brand { font-size: 8.5pt; letter-spacing: 3px; text-transform: uppercase; color: #7fb3d5; }
  .band h1 { font-size: 24pt; font-weight: 700; margin-top: 3mm; }
  .band .sub { margin-top: 3mm; color: #cbd5e1; font-size: 11pt; }
  .band .meta { margin-top: 5mm; font-size: 8.5pt; color: #94a3b8; }
  h2 { font-size: 14pt; color: #0f2a43; margin: 0 0 2.5mm; border-bottom: 2px solid #0f2a43; padding-bottom: 1.5mm; }
  h3 { font-size: 10.5pt; color: #0f2a43; margin: 4mm 0 1.5mm; }
  p { margin-bottom: 2.5mm; color: #334155; }
  ul, ol { margin: 1mm 0 3mm 5.5mm; color: #334155; }
  li { margin-bottom: 1mm; }
  img.shot { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; margin: 2mm 0 1mm; }
  .cap { color: #64748b; font-size: 8.5pt; margin-bottom: 3mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 3mm; }
  th { background: #f1f5f9; text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .5px; color: #475569; }
  th, td { padding: 1.8mm 2.2mm; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 9.5pt; }
  .note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 2.5mm 3mm; font-size: 9.5pt; color: #78350f; margin: 3mm 0; }
  .stop { background: #fef2f2; border-left: 3px solid #dc2626; padding: 2.5mm 3mm; font-size: 9.5pt; color: #7f1d1d; margin: 3mm 0; }
  .ok { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 2.5mm 3mm; font-size: 9.5pt; color: #14532d; margin: 3mm 0; }
  .foot { position: absolute; bottom: 9mm; left: 15mm; right: 15mm; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 2mm; display: flex; justify-content: space-between; }
  .steps { counter-reset: s; }
  .steps li { margin-bottom: 1.8mm; }
</style></head><body>

<!-- 1 -->
<div class="page">
  <div class="band">
    <div class="brand">TAKE Auto &nbsp;·&nbsp; Leasing &amp; Sales</div>
    <h1>Working in the new system</h1>
    <div class="sub">app.takeauto.tech — your Bitrix pipelines, rebuilt</div>
    <div class="meta">For Moe · Bayan · Maria · Azat · Firuz &nbsp;·&nbsp; 28 September 2026</div>
  </div>

  <h2>What this is</h2>
  <p>Bitrix is closed. Everything you worked on there now lives at <b>app.takeauto.tech</b>, with the same two pipelines and the same stage names you used. Your cards are in the columns you left them in.</p>

  <h3>What you will find</h3>
  <table>
    <tr><th style="width:36%">Board</th><th>Who works it</th><th>Cards</th></tr>
    <tr><td><b>Primary processing</b></td><td>Bayan, Maria</td><td>324</td></tr>
    <tr><td><b>Sales Department</b></td><td>Moe, Azat, Firuz</td><td>302</td></tr>
    <tr><td><b>Archive</b></td><td>everyone, read-only in practice</td><td>10,304</td></tr>
  </table>

  <p>The 10,304 in Archive are the old Bitrix history — closed deals, old leads, records from the rental desks. They are not lost and they are searchable. They are simply off the working boards so the boards show what is live.</p>

  <div class="ok">
    <b>Your active book is 536 deals.</b> Every one of them is in the same stage it was in when Bitrix froze — Unanswered, Re-touch 2, CP sent, Approved and the rest. Nothing was renamed and nothing was moved.
  </div>

  <h3>Signing in</h3>
  <p>Open <b>app.takeauto.tech</b> and sign in with your own e-mail and password. Each of you has a separate account — what you do is recorded under your name, which is what makes the reports work.</p>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 1 / 6</span></div>
</div>

<!-- 2 -->
<div class="page">
  <h2>Board 1 — Primary processing</h2>
  <p>The first-touch board. New enquiries land here and are worked until the customer is qualified or gives up.</p>
  <img class="shot" src="${shots.primary}">
  <div class="cap">Primary processing — the five columns carried over from Bitrix.</div>

  <table>
    <tr><th style="width:30%">Column</th><th>What it means</th></tr>
    <tr><td><b>New application</b></td><td>Just arrived. Nobody has spoken to them yet.</td></tr>
    <tr><td><b>Unanswered</b></td><td>We tried and got no reply.</td></tr>
    <tr><td><b>Identifying the need</b></td><td>Conversation is live — working out what they want.</td></tr>
    <tr><td><b>Repeated touch 1</b></td><td>Second attempt after silence.</td></tr>
    <tr><td><b>Re-touch 2</b></td><td>Third attempt. After this the card is closed as Lost.</td></tr>
  </table>

  <h3>Moving a card</h3>
  <p>Drag it to the next column. Nothing moves on its own — the card sits exactly where you put it until you move it. If you open the card instead, the same change can be made in the <b>Primary stage</b> field.</p>

  <h3>What is on a card</h3>
  <ul>
    <li><b>Lead №</b> — the card's number. Quote it when you ask about a card.</li>
    <li><b>Customer phone</b> — the number we reach them on.</li>
    <li><b>Owner</b> — whose card it is.</li>
    <li><b>Notes</b> — the whole conversation in one running note: text, photos, documents, voice messages written out as text, recorded calls you can play. It updates itself.</li>
  </ul>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 2 / 6</span></div>
</div>

<!-- 3 -->
<div class="page">
  <h2>Board 2 — Sales Department</h2>
  <p>The closing board. A qualified customer is handed over here and worked to the money.</p>
  <img class="shot" src="${shots.sales}">
  <div class="cap">Sales Department — each closer sees their own cards, in stage order.</div>

  <table>
    <tr><th style="width:30%">Column</th><th>What it means</th></tr>
    <tr><td><b>Identifying the need</b></td><td>Handed over, working out the deal.</td></tr>
    <tr><td><b>CP sent</b></td><td>Commercial proposal is with the customer.</td></tr>
    <tr><td><b>Proposal warm-up</b></td><td>Following up on the proposal.</td></tr>
    <tr><td><b>Meeting scheduled</b> / <b>Meeting held</b></td><td>Face to face.</td></tr>
    <tr><td><b>Approved</b></td><td>Security has approved the client.</td></tr>
    <tr><td><b>Sent to security</b></td><td>With the security check.</td></tr>
  </table>

  <div class="note">
    <b>This board shows only your own cards</b> — it is your working list, not the department's. For everyone's, open the view menu at the top and switch to <b>All Opportunities</b>.
  </div>

  <h3>Handing a customer over from the girls to a closer</h3>
  <p>Put the closer's name in the <b>Owner</b> field on the card. That is all. The card leaves Primary processing and appears on that closer's board at <b>Identifying the need</b> within a minute, with the whole conversation attached.</p>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 3 / 6</span></div>
</div>

<!-- 4 -->
<div class="page">
  <h2>Where cards come from</h2>

  <h3>WhatsApp — automatic</h3>
  <p>A customer writes to one of the company numbers and a card is created by itself, numbered, with the conversation attached, and put on Primary processing at <b>New application</b>. Nobody has to type anything. This runs all day, every day.</p>

  <h3>Phone calls — by hand</h3>
  <p>The call-tracking service was switched off, so calls no longer create cards on their own. Whoever takes the call enters it. It takes about twenty seconds.</p>

  <ol class="steps">
    <li>Open <b>Primary processing</b>.</li>
    <li>In the <b>New application</b> column, click <b>+ New</b> at the top of the column.</li>
    <li>Type what the customer wants as the card name — for example <i>“G63 2024, wants monthly”</i>. Write it the way you would tell a colleague.</li>
    <li>Open the card and fill <b>Customer phone</b>. Type the number however you like — <i>+971 50 258 3434</i>, <i>00971502583434</i>, with or without spaces. The system tidies it up.</li>
    <li>Set <b>Owner</b> — yourself if you will work it, or the closer if you are handing it straight over.</li>
  </ol>

  <div class="stop">
    <b>Always create the card from the board, never from the table view.</b> A card created in the table has no stage, so it goes straight to the Archive and nobody sees it.
  </div>

  <div class="ok">
    <b>Why the phone field matters.</b> It is what ties the call to the customer. Fill it in, and when that same person writes on WhatsApp later, their messages land on the card you already made. Leave it empty and you get two cards for one customer.
  </div>

  <h3>Instagram and Facebook</h3>
  <p>Built and waiting on Meta's approval of the company account. Until that comes through, messages from those two channels do not create cards. Nothing is being lost — they simply are not connected yet.</p>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 4 / 6</span></div>
</div>

<!-- 5 -->
<div class="page">
  <h2>What is not working, honestly</h2>
  <p>So that nobody wastes time hunting for something that is not there.</p>

  <table>
    <tr><th style="width:34%">Thing</th><th>State</th></tr>
    <tr><td><b>Phone calls into the CRM</b></td><td>Off. The call-tracking subscription ended, the last call reached the system on 16 September. Calls are entered by hand until a replacement is decided.</td></tr>
    <tr><td><b>Instagram &amp; Facebook messages</b></td><td>Built, waiting on Meta's approval. Not live.</td></tr>
    <tr><td><b>Mohammed's WhatsApp number</b></td><td>Blocked by WhatsApp in August. That line is dark and will not come back — use the other company numbers.</td></tr>
    <tr><td><b>Bitrix</b></td><td>Closed. Nothing new will ever arrive from it. Everything that was in it on the day it froze is in the system now.</td></tr>
    <tr><td><b>Deleting a lead</b></td><td>Not possible, deliberately. Close it as <b>Lost</b> with a reason instead. History cannot be made to disappear.</td></tr>
  </table>

  <h2>House rules</h2>
  <ul>
    <li><b>Close dead cards as Lost, with the reason.</b> Do not leave them sitting in a column and do not ignore them. The lost-reason report is how management sees which advertising actually brings customers.</li>
    <li><b>Fill the Successful Deal form</b> when a deal closes — dates, car, value, source. That form is where the revenue numbers come from. An unfilled form means your deal does not appear in the figures.</li>
    <li><b>One customer, one card.</b> If you spot the same person twice, say so rather than working both.</li>
    <li><b>Do not retype conversations into the notes.</b> They are already there and they update themselves.</li>
  </ul>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 5 / 6</span></div>
</div>

<!-- 6 -->
<div class="page">
  <h2>When something looks wrong</h2>
  <p>Most reports turn out to be one of three things, and each has a different answer. Knowing which one you are looking at saves everybody a day.</p>

  <table>
    <tr><th style="width:38%">What you see</th><th>What to do</th></tr>
    <tr><td><b>A customer wrote and there is no card</b></td><td>Send the <b>phone number</b> and the <b>time</b> they wrote. Those two things are enough to trace it end to end. Without them nothing can be checked.</td></tr>
    <tr><td><b>A card is on the wrong board or the wrong column</b></td><td>Send the <b>Lead №</b> and where you expected it.</td></tr>
    <tr><td><b>The same customer has two cards</b></td><td>Send both Lead numbers. Usually the phone field was left empty on one of them.</td></tr>
    <tr><td><b>A page is empty or will not load</b></td><td>Reload the page once first — after an update the browser sometimes holds the old version. If it is still empty, say which board and at what time.</td></tr>
  </table>

  <div class="note">
    <b>Please do not send "the system is not working".</b> It cannot be investigated. A number and a time can be traced through every step in minutes, and you will get a straight answer about what happened to that specific customer.
  </div>

  <h2>What changed this week</h2>
  <ul>
    <li>The boards were cleared of ten thousand old records; they now show only live work.</li>
    <li>The Sales Department board had no columns at all and piled every card into one heap — fixed. It now shows the proper stage columns.</li>
    <li>“Gearbox warm-up” was a bad translation and now reads <b>Proposal warm-up</b>.</li>
    <li>The phone field on a card is now called <b>Customer phone</b> and accepts any format.</li>
    <li>Ten deals that never made it across from Bitrix were found and restored.</li>
  </ul>

  <p style="margin-top:6mm; color:#64748b; font-size:9.5pt">If something in this guide does not match what you see on screen, the guide is wrong — tell us and it gets corrected.</p>

  <div class="foot"><span>TAKE Auto — Leasing Team Guide · 28.09.2026</span><span>Page 6 / 6</span></div>
</div>

</body></html>`;

const htmlPath = resolve(DIR, "leasing-team-guide.html");
const pdfPath = resolve(DIR, "TAKE-AUTO-Leasing-Team-Guide.pdf");
await writeFile(htmlPath, html, "utf8");

execFileSync(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`],
  { stdio: "ignore" }
);
console.log("guide →", pdfPath);
