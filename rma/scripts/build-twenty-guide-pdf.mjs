/**
 * build-twenty-guide-pdf.mjs — turn a captured guide into one printable PDF.
 *
 *   node scripts/build-twenty-guide-pdf.mjs --in /tmp/guide-easyrent --out /tmp/EasyRent-Guide.pdf
 *
 * Reads steps.json + the PNGs from capture-twenty-guide.mjs, embeds every image
 * as a data: URI (no external dependencies, so the file survives being e-mailed
 * or dropped in WhatsApp), and prints it with the same headless Chromium that
 * took the shots.
 *
 * Every number here comes from steps.json, which was queried from the live
 * database at capture time. Nothing in this file is typed by hand.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg("in", "/tmp/twenty-guide");
if (!existsSync(join(IN, "steps.json"))) throw new Error(`no steps.json in ${IN} — run capture-twenty-guide.mjs first`);

const { brand, base, facts: F, steps } = JSON.parse(readFileSync(join(IN, "steps.json"), "utf8"));
const OUT = arg("out", join(IN, `Twenty-Guide-${brand.replace(/[^A-Za-z]/g, "")}.pdf`));
const dataUri = (f) => `data:image/png;base64,${readFileSync(join(IN, f)).toString("base64")}`;
const n = (v) => Number(v).toLocaleString("en-US");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* Things staff WILL ask about. Every figure interpolated from live counts. */
const ODDITIES = [
  [`“Companies” is a list of website names`,
   `${n(F.companies)} rows such as playstation.com or uber.com. ${n(F.autoCompanies)} of them were created automatically by the system from customer e-mail addresses. They are not your customers. Please do not edit or delete them.`],
  [`Seven menu items show nothing`,
   `Vehicles, Bookings, Rentals, Leases, Lease Deals, Rent Deals and Stage Events are all empty. Those screens are not connected yet. Your deals are in “Opportunities”.`],
  [`Some names look like “Новый лид по звонку…”`,
   `${n(F.callTitled)} of ${n(F.peopleAll)} contacts carry the phone-call title instead of the person's name — that is all our phone system sent over. The phone number on the record is correct. Rename them as you work through them.`],
  [`Most deals have no Amount or Close date`,
   `Only ${n(F.dealsWithAmount)} of ${n(F.dealsTotal)} deals arrived with a value. The deal itself is real; the empty columns are missing data from the old system, not a mistake you made.`],
  [`A few English deals nobody recognises`,
   `“AI Model Training”, “Workspace Expansion” and a handful more are sample records that came with the software. They will be removed.`],
  [`It does not open from home or on mobile data`,
   `Twenty currently works only inside the office network. From outside you get “Unable to Reach Back-end”. That is our configuration, not your phone — we are fixing it.`],
];

const html = `
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 12.5px/1.55 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; }
  .cover { padding-top: 8mm; }
  h1 { font-size: 30px; margin: 0 0 2px; letter-spacing: -.4px; }
  .sub { color: #6B7280; font-size: 14px; margin: 0 0 20px; }
  .kpis { display: flex; gap: 10px; margin: 0 0 18px; }
  .kpi { flex: 1; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 14px; }
  .kpi b { display: block; font-size: 24px; line-height: 1.1; }
  .kpi span { color: #6B7280; font-size: 11.5px; }
  .box { border-radius: 10px; padding: 13px 15px; margin: 0 0 12px; }
  .ok { background: #ECFDF5; border: 1px solid #A7F3D0; }
  .warn { background: #FFF7ED; border: 1px solid #FED7AA; }
  .step { page-break-inside: avoid; }
  .step + .step { page-break-before: always; }
  .cap { font-size: 17px; font-weight: 700; margin: 0 0 3px; }
  .num { display: inline-block; background: #E11D48; color: #fff; border-radius: 999px;
         width: 25px; height: 25px; text-align: center; line-height: 25px; font-size: 13px;
         margin-right: 9px; vertical-align: 2px; }
  .note { color: #374151; margin: 0 0 10px; }
  img { max-width: 100%; border: 1px solid #D1D5DB; border-radius: 8px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 9px 10px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  td.k { font-weight: 700; width: 33%; }
  h2 { font-size: 20px; margin: 0 0 4px; }
  .foot { margin-top: 14px; color: #6B7280; font-size: 11.5px; }
</style>

<div class="cover">
  <h1>Twenty — where your work is</h1>
  <p class="sub">${esc(brand)} · rental CRM · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

  <div class="kpis">
    <div class="kpi"><b>${n(F.deals)}</b><span>your deals</span></div>
    <div class="kpi"><b>${n(F.people)}</b><span>your customers</span></div>
    <div class="kpi"><b>${n(F.notes)}</b><span>WhatsApp messages</span></div>
  </div>

  <div class="box ok">
    <b>In one line:</b> your deals are under <b>Opportunities</b> — not under “Rent Deals” — and you must
    switch the list at the top to <b>${esc(brand)}</b>. Do it once; Twenty remembers.
  </div>

  <div class="box warn">
    <b>Nothing is lost.</b> Empty columns and strange names are data still coming across from the old system.
    That is on us, not on you. If a customer or a deal is genuinely missing, send the phone number to Muhammed.
  </div>
</div>

${steps.map((s, i) => `
  <div class="step">
    <p class="cap"><span class="num">${i + 1}</span>${esc(s.caption)}</p>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
    <img src="${dataUri(s.file)}" alt="">
  </div>`).join("")}

<div class="step">
  <h2>Things that look broken but are normal</h2>
  <p class="note">All of these are known and none of them mean your data was lost.</p>
  <table>${ODDITIES.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
  <p class="foot">Address inside the office: <b>${esc(base)}</b> · Counts in this guide were read from the system on the day it was printed.</p>
</div>
`;

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: OUT, format: "A4", printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font:9px -apple-system,sans-serif;color:#9CA3AF;padding:0 12mm;display:flex;justify-content:space-between">
        <span>${esc(brand)} — Twenty guide</span><span class="pageNumber"></span></div>`,
  });
  await browser.close();
  console.log("PDF →", OUT);
};
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
