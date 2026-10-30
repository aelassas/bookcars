// Renders the leasing-team usage-guide PDF from the screenshots in
// docs/sales-usage-guide/. Run from platform/:  node scripts/sales-usage-pdf.mjs
// Output: docs/sales-usage-guide/TAKE-AUTO-Leasing-System-Guide.pdf

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "..", "docs", "sales-usage-guide");

async function img(name) {
  const b64 = await readFile(resolve(OUT, name), "base64");
  return `data:image/png;base64,${b64}`;
}

const html = (s) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 0; font-size: 14px; line-height: 1.55; }
  .page { padding: 44px 52px; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  h1 { font-size: 31px; margin: 0 0 6px; letter-spacing: -0.5px; }
  h2 { font-size: 20px; margin: 0 0 12px; color: #1d4ed8; }
  .sub { color: #64748b; font-size: 14px; margin: 0; }
  img.shot { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; margin: 12px 0 4px; }
  img.shot.small { width: 82%; display: block; margin-left: auto; margin-right: auto; }
  .cap { color: #64748b; font-size: 12px; margin: 2px 0 12px; }
  ul { margin: 8px 0; padding-left: 20px; }
  li { margin-bottom: 8px; }
  .title-page { display: flex; flex-direction: column; justify-content: center; min-height: 1000px; }
  .title-bar { width: 72px; height: 6px; background: #1d4ed8; border-radius: 3px; margin-bottom: 26px; }
  .step { display: flex; gap: 14px; align-items: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 13px 16px; margin-bottom: 11px; }
  .num { flex: 0 0 30px; height: 30px; border-radius: 50%; background: #1d4ed8; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 15px; }
  .step p { margin: 3px 0 0; }
  .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
  .warn { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; margin: 12px 0; }
  .cols li { margin-bottom: 6px; }
  .rules li { margin-bottom: 13px; font-size: 14.5px; }
  .contact { margin-top: 26px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 14px 18px; font-size: 15px; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
  b.k { color: #1d4ed8; }
</style></head><body>

<div class="page title-page">
  <div class="title-bar"></div>
  <h1>TAKE Auto — Leasing Team System Guide</h1>
  <p class="sub" style="font-size:17px; margin-top:10px;">14 September 2026</p>
  <p class="sub" style="font-size:17px;">Everything your new workspace does, and how to work in it</p>
  <p style="margin-top:34px; max-width:580px;">This guide is for everyone on the leasing team — Bayan, Maria, and the sales guys.
  Read it once. It takes about 5 minutes. Keep it nearby for your first week.</p>
  <p style="max-width:580px;">The system is already live and working. Cards from real customers are already on the boards.</p>
</div>

<div class="page">
  <h2>What the system does for you</h2>
  <p>Four things. That's it.</p>
  <ul style="margin-top:14px;">
    <li><b>Leads appear by themselves.</b> A customer writes to the leasing WhatsApp (<b>+971&nbsp;56&nbsp;723&nbsp;5539</b>) or to our Telegram number. A card for that customer appears on your board on its own.</li>
    <li><b>The whole conversation is saved inside the card.</b> Messages, photos, even voice messages — written out as text. You read everything in one place.</li>
    <li><b>Nobody types leads in by hand.</b> If a customer wrote to us, the card already exists. Never create it yourself.</li>
    <li><b>Managers see who works on what.</b> Every card shows its owner. Your work is visible — and nobody else's work lands on you.</li>
  </ul>
  <div class="note">You keep talking to customers on WhatsApp exactly as before. The system only watches and files everything into the right card.</div>
</div>

<div class="page">
  <h2>How to log in</h2>
  <div class="step"><div class="num">1</div><p>Open <code>https://app.takeauto.tech</code> in your browser.</p></div>
  <div class="step"><div class="num">2</div><p>Enter your <b>work email</b> — it ends with <code>@takeauto.ae</code>.</p></div>
  <div class="step"><div class="num">3</div><p>Enter the <b>password your manager gave you</b>.</p></div>
  <div class="step"><div class="num">4</div><p>If anything looks old or broken, press <b>Cmd+Shift+R</b> (Mac) or <b>Ctrl+Shift+R</b> (Windows) to reload the page fully.</p></div>
  <img class="shot small" src="${s.login}" alt="Login page">
  <p class="cap">The login page. Work email in, password in — you're on the board.</p>
</div>

<div class="page">
  <h2>The girls — Primary processing</h2>
  <img class="shot" src="${s.primary}" alt="Primary processing board">
  <p class="cap">The girls' board. Real customer cards are already here.</p>
  <p>The five columns, left to right:</p>
  <ul class="cols">
    <li><b class="k">New application</b> — the customer just wrote to us. The card arrived here by itself.</li>
    <li><b class="k">Unanswered</b> — you replied, but the customer didn't answer yet.</li>
    <li><b class="k">Identifying the need</b> — you are finding out what the customer wants.</li>
    <li><b class="k">Repeated touch 1</b> and <b class="k">Re-touch 2</b> — follow-ups. The customer went quiet; you check in again.</li>
  </ul>
</div>

<div class="page">
  <h2>How to work your board</h2>
  <ul>
    <li><b>New cards arrive already assigned.</b> Bayan and Maria take turns automatically. You don't pick cards — the next one is yours when it's your turn.</li>
    <li><b>Open the card.</b> Read the conversation inside.</li>
    <li><b>Reply to the customer on WhatsApp</b>, as you always do. Your reply is saved into the card too.</li>
    <li><b>Move the card to the right column</b> as the conversation moves forward — drag it, or change the stage inside the card.</li>
  </ul>
  <div class="warn"><b>Do not work from someone else's board, and do not take cards assigned to the other girl.</b> If a card looks wrong, tell your manager.</div>
  <h2 style="margin-top:22px;">An old customer comes back to you</h2>
  <p>A customer who wrote to us before — whether we won or lost that deal — comes <b>back to the girls automatically</b> when he writes again. The card already shows his whole history. Read it before you reply, so you don't ask him things he already told us.</p>
</div>

<div class="page">
  <h2>Inside a lead card</h2>
  <p>Open any card. Everything about this customer is inside.</p>
  <img class="shot" src="${s.lead}" alt="An open lead card">
  <p class="cap">A real lead card. The whole conversation lives in <b>ONE note</b> — newest messages at the bottom. Photos and voice messages appear inside it too; voice messages are written out as text.</p>
</div>

<div class="page">
  <h2>Handing a customer to the sales guys</h2>
  <p>The customer is qualified — he wants a car and you know what he needs. Time for a sales guy to take over.</p>
  <div class="step"><div class="num">1</div><p><b>Write one line in the card first.</b> What the customer wants, budget, timing. This is mandatory — the guy reads it before he calls.</p></div>
  <div class="step"><div class="num">2</div><p><b>Set the card's owner to the guy</b> (or set the card's stage to a Sales stage).</p></div>
  <div class="step"><div class="num">3</div><p><b>Done.</b> The card leaves your board by itself within a minute and appears in the guy's <b>Identifying the need</b> column. Nothing else to do — no messages, no calls to tell him.</p></div>
</div>

<div class="page">
  <h2>The guys — Sales Department</h2>
  <img class="shot" src="${s.sales}" alt="Sales Department board">
  <p class="cap">The guys' board. Cards handed over by the girls appear here by themselves.</p>
  <ul class="cols">
    <li><b class="k">Identifying the need</b> — a fresh qualified customer. Read the girl's note, then call.</li>
    <li><b class="k">CP sent</b> — you sent the commercial offer.</li>
    <li><b class="k">Gearbox warm-up</b> — the customer is thinking; keep him warm.</li>
    <li><b class="k">Meeting scheduled</b> / <b class="k">Meeting held</b> — showroom visits, booked and done.</li>
    <li><b class="k">Approved</b> — the deal is approved. Well done.</li>
  </ul>
  <h2 style="margin-top:20px;">Set up your Telegram pings — once</h2>
  <div class="warn" style="margin:8px 0;">
    <b>Every sales guy must do this one time:</b>
    open <b>Telegram</b>, find the <b>@takeauto bot</b>, press <b>Start</b> and send it <b>any message</b>.
  </div>
  <p>From that moment on: when <b>your</b> customer writes to us, you get a <b>Telegram message with a link straight to the card</b>. You never miss a reply again.</p>
  <div class="note" style="margin:8px 0;"><b>Moe:</b> also give Omar your phone number. Without it, the pings cannot reach you.</div>
</div>

<div class="page">
  <h2>The fleet board</h2>
  <img class="shot" src="${s.fleet}" alt="Fleet board">
  <p class="cap">Cars → <b>Fleet board</b>. Each card is one car, in the same column as in Kaiten.</p>
  <ul>
    <li><b>Every car from Kaiten is here, with its photo.</b></li>
    <li>The board <b>refreshes itself from Kaiten every 30 minutes</b>. Move a car in Kaiten and Twenty follows by itself.</li>
    <li>Cars archived in Kaiten disappear here. That is why you see <b>8 cars, not 170</b> — only the live fleet shows.</li>
  </ul>
</div>

<div class="page">
  <h2>Every car keeps its photo</h2>
  <p>Open a car card to see its details — plate, status, notes — and its photo under <b>Files</b>. Click the photo to see it full size.</p>
  <img class="shot" src="${s.car}" alt="A car card with its photo">
  <p class="cap">A real car card, photo opened full size. The photo came from Kaiten by itself.</p>
</div>

<div class="page">
  <h2>Finding things</h2>
  <img class="shot" src="${s.menu}" alt="The view menu">
  <p class="cap">Click the board name next to <b>Opportunities</b> to open this menu and switch boards.</p>
  <ul>
    <li><b>Switch boards</b> from the view menu next to "Opportunities" (shown above). Twenty remembers your last choice.</li>
    <li><b>See one person's cards:</b> use <b>Filter → Responsible / Owner</b> at the top of the board and pick the person.</li>
    <li><b>Find a customer:</b> type a name or a phone number into the <b>search bar</b> at the top of the page.</li>
  </ul>
</div>

<div class="page">
  <h2>House rules</h2>
  <ul class="rules">
    <li><b>Work only from your own board.</b> Girls — Primary processing. Guys — Sales Department. Look at other boards if you need to, but don't move cards there.</li>
    <li><b>Never create a card by hand</b> when the customer wrote on WhatsApp or Telegram. The system already made it. Hand-made cards don't get automatic assignment and don't get the conversation — they only make doubles.</li>
    <li><b>You cannot delete cards.</b> If something looks wrong or doubled, tell your manager — don't try to clean it up yourself.</li>
    <li><b>Handing over? One line of context in the card is mandatory.</b> What the customer wants, budget, timing. Every time.</li>
    <li><b>Questions → Omar.</b> Something looks broken, a lead didn't appear, you can't log in — contact Omar.</li>
  </ul>
  <div class="contact"><b>That's all.</b> Log in, open your board, and the work comes to you. Good luck — and welcome to the new system.</div>
</div>

</body></html>`;

async function main() {
  const shots = {
    login: await img("00-login.png"),
    primary: await img("01-kanban-primary.png"),
    lead: await img(process.env.LEAD_SHOT || "03-lead-card-note.png"),
    sales: await img("05-kanban-sales.png"),
    fleet: await img("06-fleet-board.png"),
    car: await img("07-car-card.png"),
    menu: await img("04-view-menu-crop.png"),
  };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html(shots), { waitUntil: "load" });
    await page.pdf({
      path: resolve(OUT, "TAKE-AUTO-Leasing-System-Guide.pdf"),
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await browser.close();
  }
  console.log("pdf →", resolve(OUT, "TAKE-AUTO-Leasing-System-Guide.pdf"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
