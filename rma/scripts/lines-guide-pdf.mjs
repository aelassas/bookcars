// Renders the English PDF guide for the /lines page from the screenshots in
// docs/lines-guide/. Run from platform/:  node scripts/lines-guide-pdf.mjs
// Output: docs/lines-guide/TAKE-AUTO-Lines-Guide.pdf

import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "..", "docs", "lines-guide");

async function img(name) {
  const b64 = await readFile(resolve(OUT, name), "base64");
  return `data:image/png;base64,${b64}`;
}

const html = (shots) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; color: #0f172a; margin: 40px 48px; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 26px 0 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
  .sub { color: #64748b; margin: 0 0 8px; }
  img.shot { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; margin: 10px 0 4px; }
  table.status { border-collapse: collapse; width: 100%; margin: 8px 0; }
  table.status td { border: 1px solid #e2e8f0; padding: 5px 8px; vertical-align: top; }
  table.status td:first-child { font-weight: 700; white-space: nowrap; width: 130px; }
  ol, ul { margin: 6px 0; padding-left: 22px; }
  li { margin-bottom: 4px; }
  .warn { background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
  .ok { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 10px 14px; margin: 10px 0; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  .pagebreak { page-break-before: always; }
</style></head><body>

<h1>WhatsApp Lines — Status &amp; Re-pairing Guide</h1>
<p class="sub">TAKE Auto · rental &amp; leasing desks · September 2026</p>

<p>Every WhatsApp number the company works with is connected to the CRM through an "observer line".
If a line's session dies (WhatsApp logs it out, phone was offline too long, app reinstalled), messages
stop reaching the CRM — <b>even though the phone itself looks fine</b>. This page lets you see every
line's real status and reconnect it yourself in about a minute. No technician needed.</p>

<h2>1 · Where to find it</h2>
<ol>
  <li>Open <code>https://hub.takeauto.tech/lines</code> — works from any office computer or phone browser, no VPN.</li>
  <li>Tap <b>your name</b>, then enter your 4-digit PIN.</li>
</ol>
<img class="shot" src="${shots[0]}" alt="Login screen">

<h2>2 · What you see</h2>
<img class="shot" src="${shots[1]}" alt="Lines table">
<ul>
  <li><b>Name</b> — what the line is called. Tap it to rename (e.g. when a phone changes hands). The <b>Number</b> next to it never changes — that is the line's real phone number.</li>
  <li><b>Status</b> — the line's actual health (see table below). <b>Last activity</b> — when the line last received a message.</li>
  <li><b>Pair</b> — reconnects the line.</li>
</ul>
<table class="status">
  <tr><td>online</td><td>Working. Nothing to do.</td></tr>
  <tr><td>silent</td><td><b>Act.</b> Linked but no messages for 6+ hours while other lines receive — the session is dead. Re-pair it (section 3).</td></tr>
  <tr><td>reconnecting</td><td>Temporary network drop. Wait 1–2 minutes — it recovers by itself.</td></tr>
  <tr><td>QR / code pending</td><td>A pairing is waiting for the phone to confirm. Finish it on the phone.</td></tr>
  <tr><td>dormant</td><td>Safety lockout after WhatsApp rejected the session twice. Re-pair it (section 3).</td></tr>
  <tr><td>no session</td><td>Never paired, or archived mid-pairing. Pair it.</td></tr>
</table>
<p>Numbers WhatsApp has banned and lines that were replaced are not listed at all — every row
you see is a live line you can act on.</p>

<div class="pagebreak"></div>
<h2>3 · Re-pairing a line</h2>
<p>Click <b>Pair</b> on the line's row. A window opens with two ways to connect — pick whichever fits:</p>

<h3>Option A — QR code (the phone is in your hand)</h3>
<img class="shot" src="${shots[2]}" alt="QR pairing">
<ol>
  <li>On the line's phone open <b>WhatsApp → Settings → Linked Devices → Link a Device</b>.</li>
  <li>Click <b>Start QR pairing</b>. A live QR code appears in the window within seconds.</li>
  <li>Scan it with the phone immediately — the code refreshes every few seconds.</li>
  <li>The window shows <b>linked</b> and the line's status turns <b>online</b>. Done.</li>
</ol>

<h3>Option B — Phone code (the phone is somewhere else)</h3>
<img class="shot" src="${shots[3]}" alt="Phone-code pairing">
<ol>
  <li>Call the person holding the phone. Ask them to open <b>WhatsApp → Linked Devices → Link a Device → "Link with phone number instead"</b> — and wait on that screen.</li>
  <li>Check the number shown in the window is the line's own number, then click <b>Request pairing code</b>.</li>
  <li>An 8-character code appears (e.g. <code>ABCD-1234</code>). Read it to them; they type it in.</li>
  <li>The window shows <b>linked</b> and the line turns <b>online</b>. Done.</li>
</ol>

<div class="warn"><b>Rules that keep the number from being banned by WhatsApp:</b>
<ul>
  <li><b>One attempt, then wait.</b> After you start a pairing, the button locks for 5 minutes — this is on purpose. Do not try to get around it; repeated attempts are exactly what gets a number banned.</li>
  <li><b>The phone must be ready BEFORE you start</b> — on the "Link a device" screen. An unused code counts against the number.</li>
  <li>If two attempts in a row fail — stop and call Omar. Something else is wrong.</li>
</ul></div>

<div class="ok"><b>After a successful re-pair:</b> messages start flowing into the CRM again within a minute,
and missed messages from the phone's own history sync in automatically. Cards, notes and the board
continue exactly where they left off — nothing is lost by re-pairing.</div>

</body></html>`;

async function main() {
  const shots = await Promise.all([
    img("01-login.png"),
    img("02-lines-page.png"),
    img("03-pair-modal.png"),
    img("04-code-tab.png"),
  ]);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html(shots), { waitUntil: "load" });
    await page.pdf({
      path: resolve(OUT, "TAKE-AUTO-Lines-Guide.pdf"),
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await browser.close();
  }
  console.log("pdf →", resolve(OUT, "TAKE-AUTO-Lines-Guide.pdf"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
