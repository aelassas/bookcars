/**
 * capture-twenty-guide.mjs — build a rental manager's "where is my work" guide
 * from the LIVE Twenty: real screenshots, arrows drawn on the real UI, and
 * counts read out of the database at capture time.
 *
 *   node scripts/capture-twenty-guide.mjs --brand "EasyRent (ETM)" --out /tmp/guide-easyrent
 *   node scripts/capture-twenty-guide.mjs --brand "Cardiwan"       --out /tmp/guide-cardiwan
 *
 * Runs ON THE BOX on purpose. The Twenty frontend is built with
 * SERVER_URL=http://10.255.254.12:3002 (the office LAN address), so it only
 * reaches its own backend from a browser that can resolve that address. The box
 * IS 10.255.254.12; the same page opened anywhere else dies on "Unable to Reach
 * Back-end".
 *
 * Every number that reaches the PDF is queried HERE, at capture time, and
 * written into steps.json. Hand-typed numbers drift from the database within
 * days — an audit of the first draft caught three of them (900 vs 910 deals,
 * 3,784 vs 3,783 contacts, "all amounts blank" when 23 were filled).
 *
 * Credentials: ~/twenty-doc-login.txt (line 1 email, line 2 password). Never printed.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const BRAND = arg("brand", "EasyRent (ETM)");
const OUT = arg("out", "/tmp/twenty-guide");
const BASE = process.env.TWENTY_UI_URL || "http://10.255.254.12:3002";
const SCHEMA = process.env.TWENTY_SCHEMA || "workspace_7tkxm1eeqb4iopvi5ica5vos4";
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";
/** The brand key stored on each row, derived from the view name shown in the UI. */
const BRAND_KEY = /cardiwan/i.test(BRAND) ? "cardiwan" : "easyrent";

const creds = readFileSync(join(homedir(), "twenty-doc-login.txt"), "utf8").split(/\r?\n/);
const EMAIL = creds[0]?.trim();
const PASSWORD = creds[1] ?? "";
if (!EMAIL || !PASSWORD) throw new Error("~/twenty-doc-login.txt needs email on line 1, password on line 2");

mkdirSync(OUT, { recursive: true });

const sql = (q) =>
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-c", q],
    { encoding: "utf8" }).trim();
const num = (n) => Number(n).toLocaleString("en-US");

/* Counts, read now — never typed by hand. */
const F = {
  deals: sql(`select count(*) from "${SCHEMA}".opportunity where "brandLine"='${BRAND_KEY}'`),
  people: sql(`select count(*) from "${SCHEMA}".person where "brandLine"='${BRAND_KEY}'`),
  peopleAll: sql(`select count(*) from "${SCHEMA}".person`),
  companies: sql(`select count(*) from "${SCHEMA}".company`),
  autoCompanies: sql(`select count(*) from "${SCHEMA}".company where "createdBySource"='WORKFLOW'`),
  callTitled: sql(`select count(*) from "${SCHEMA}".person where "nameFirstName" ~ '^(Новый лид|Пропущенный|Сделка|Гость)'`),
  dealsWithAmount: sql(`select count(*) from "${SCHEMA}".opportunity where "amountAmountMicros" is not null`),
  dealsTotal: sql(`select count(*) from "${SCHEMA}".opportunity`),
  notes: sql(`select count(*) from "${SCHEMA}".note`),
};

/* ── annotation ───────────────────────────────────────────────────────────
 * Arrows are drawn INTO the page before the screenshot rather than painted on
 * the PNG afterwards: the browser already knows exactly where every element
 * is, so an arrow can never drift out of alignment when the UI shifts.      */
async function annotate(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll("[data-guide-mark]").forEach((n) => n.remove());
    const layer = document.createElement("div");
    layer.setAttribute("data-guide-mark", "1");
    Object.assign(layer.style, {
      position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "none",
      font: "700 15px -apple-system, Segoe UI, sans-serif",
    });
    for (const m of marks) {
      const el = document.querySelector(m.sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute", left: `${r.left - 4}px`, top: `${r.top - 4}px`,
        width: `${r.width + 8}px`, height: `${r.height + 8}px`,
        border: "3px solid #E11D48", borderRadius: "8px",
        boxShadow: "0 0 0 4px rgba(225,29,72,.18)",
      });
      layer.appendChild(box);
      const lab = document.createElement("div");
      lab.textContent = m.text;
      // Flip the label to the other side when it would run off screen — a
      // caption cut in half teaches nobody anything.
      const toLeft = r.right + 290 > window.innerWidth;
      Object.assign(lab.style, {
        position: "absolute", top: `${Math.max(4, r.top + r.height / 2 - 17)}px`,
        [toLeft ? "right" : "left"]: toLeft ? `${window.innerWidth - r.left + 18}px` : `${r.right + 18}px`,
        maxWidth: "290px", background: "#E11D48", color: "#fff",
        padding: "8px 12px", borderRadius: "8px", lineHeight: "1.35",
        boxShadow: "0 6px 18px rgba(0,0,0,.25)",
      });
      layer.appendChild(lab);
      const arrow = document.createElement("div");
      Object.assign(arrow.style, {
        position: "absolute", top: `${r.top + r.height / 2 - 7}px`,
        [toLeft ? "right" : "left"]: toLeft ? `${window.innerWidth - r.left + 4}px` : `${r.right + 4}px`,
        width: "0", height: "0", borderTop: "7px solid transparent", borderBottom: "7px solid transparent",
        [toLeft ? "borderLeft" : "borderRight"]: "14px solid #E11D48",
      });
      layer.appendChild(arrow);
    }
    document.body.appendChild(layer);
  }, marks);
}
const clearMarks = (page) => page.evaluate(() => {
  document.querySelectorAll("[data-guide-mark]").forEach((n) => n.remove());
  document.querySelectorAll("[data-guide-target]").forEach((n) => n.removeAttribute("data-guide-target"));
});

/** Tag a Playwright locator so the in-page annotator can find it with plain CSS
 *  — Playwright selectors like :has-text() are not valid DOM selectors. */
async function target(locator, id) {
  if (!(await locator.count())) return null;
  await locator.first().evaluate((el, id) => el.setAttribute("data-guide-target", id), id);
  return `[data-guide-target="${id}"]`;
}
const menuItem = (page, label) =>
  page.getByRole("link", { name: label, exact: true }).or(page.getByText(label, { exact: true })).first();

const steps = [];
/** `clip` crops to the control the reader must look at: a full 1440x900 page
 *  shrunk to A4 width makes every label unreadable on paper. */
async function shot(page, name, caption, note = "", clip = null) {
  await page.mouse.move(1430, 890);           // park the cursor: a hovered row pops a tooltip into the shot
  await page.waitForTimeout(600);
  const file = `${String(steps.length + 1).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: join(OUT, file), ...(clip ? { clip } : {}) });
  steps.push({ file, caption, note });
  console.log("  captured", file);
}

/**
 * Click the view switcher and pick this guide's brand. Optionally captures the
 * two teaching screenshots on the way.
 *
 * People needs this exactly as much as Opportunities does — the first version
 * of this script navigated to People and screenshotted immediately, so the page
 * showed "All People · 21,622" under a caption telling the reader to switch to
 * their own brand. The picture contradicted the instruction on the very page
 * that teaches the instruction.
 */
async function switchToBrand(page, chipLabel, shots = {}) {
  const chip = page.getByText(chipLabel, { exact: true }).first();
  const chipSel = await target(chip, "viewchip");
  if (!chipSel) { console.warn(`  ! switcher "${chipLabel}" not found — brand not applied`); return false; }
  if (shots.switcherStep) {
    await annotate(page, [{ sel: chipSel, text: "Click this name — it is a SWITCH, not a title" }]);
    await shot(page, "view-switcher", shots.switcherStep[0], shots.switcherStep[1], { x: 0, y: 0, width: 900, height: 300 });
    await clearMarks(page);
  }
  await chip.click();
  await page.waitForTimeout(2500);
  const opt = page.getByText(BRAND, { exact: true }).first();
  if (shots.pickStep) {
    const optSel = await target(opt, "brandopt");
    if (optSel) await annotate(page, [{ sel: optSel, text: `Choose ${BRAND} — that is your company` }]);
    await shot(page, "view-menu-open", shots.pickStep[0], shots.pickStep[1], { x: 0, y: 0, width: 900, height: 340 });
    await clearMarks(page);
  }
  if (!(await opt.count())) { console.warn(`  ! brand "${BRAND}" not in the switcher menu`); await page.keyboard.press("Escape"); return false; }
  await opt.click();
  await page.waitForTimeout(6000);
  return true;
}

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(45_000);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  // ── 0. The sign-in screen itself: the first thing they will meet.
  await shot(page, "sign-in", "Step 1 — open Twenty and sign in",
    `In the office, open ${BASE} in Chrome. Type your work e-mail, press Enter, then your password.`,
    { x: 380, y: 120, width: 680, height: 560 });

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  if (await email.count()) { await email.fill(EMAIL); await page.keyboard.press("Enter"); await page.waitForTimeout(3000); }
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) { await pw.fill(PASSWORD); await page.keyboard.press("Enter"); await page.waitForTimeout(9000); }
  if (/sign|login/i.test(page.url())) throw new Error("still on the sign-in page — credentials rejected");

  // ── 1. Where Twenty drops them, and why it is not their work.
  const companiesSel = await target(menuItem(page, "Companies"), "companies");
  if (companiesSel) await annotate(page, [{ sel: companiesSel, text: "Twenty opens HERE by itself — this is not your work" }]);
  await shot(page, "lands-on-companies", "Step 2 — ignore the screen that opens first",
    `Twenty opens "Companies" on its own. Those ${num(F.companies)} rows are website names, not customers: ${num(F.autoCompanies)} of them were made automatically by the system. Do not edit or delete them.`);
  await clearMarks(page);

  // ── 2. The one click that matters.
  const oppSel = await target(menuItem(page, "Opportunities"), "opps");
  if (oppSel) await annotate(page, [{ sel: oppSel, text: "Click OPPORTUNITIES — your deals are here" }]);
  await shot(page, "click-opportunities", "Step 3 — click “Opportunities” in the left menu",
    "Deals are called “Opportunities” here. Not “Rent Deals” — that tab is still empty.",
    { x: 0, y: 0, width: 720, height: 560 });
  await clearMarks(page);

  await menuItem(page, "Opportunities").click();
  await page.waitForTimeout(5000);

  // ── 3. The view switcher — the control nobody finds alone.
  await switchToBrand(page, "All Opportunities", {
    switcherStep: ["Step 4 — click the list name at the top",
      "Right now you are looking at every brand mixed together. This small name decides which deals you see."],
    pickStep: [`Step 5 — choose “${BRAND}”`,
      "Pick your own company. The other name in this list belongs to the other rental company — leave it alone."],
  });
  await shot(page, "brand-opportunities", `★ Step 6 — this is your deal list: ${BRAND}`,
    `${num(F.deals)} deals. Twenty remembers this choice, so next time it opens here. Click any row to open the deal and read its full name.`);

  // ── 4. Contacts. Do the same switch here BEFORE the screenshot, or the page
  //    shows every brand mixed together under a caption that says otherwise.
  await menuItem(page, "People").click();
  await page.waitForTimeout(5000);
  const peopleSwitched = await switchToBrand(page, "All People");
  await shot(page, "people",
    peopleSwitched ? `Step 7 — your customers are in “People”` : `Step 7 — your customers are in “People” (switch to ${BRAND} first)`,
    peopleSwitched
      ? `Switch the list at the top to ${BRAND}, exactly like you did for the deals — that is your ${num(F.people)} customers, already selected here. To find one person, click the magnifying glass at the top left and type their PHONE NUMBER — more reliable than the name.`
      : `Use the same switch at the top and choose ${BRAND} to see your ${num(F.people)} customers. To find one person, click the magnifying glass at the top left and type their PHONE NUMBER — more reliable than the name.`);

  // ── 5. WhatsApp arrives as Notes.
  await menuItem(page, "Notes").click();
  await page.waitForTimeout(5000);
  await shot(page, "notes-whatsapp", "Step 8 — WhatsApp messages appear as “Notes”",
    `${num(F.notes)} messages so far, each attached to the customer who sent it. Open a customer to see their chat under the record.`);

  writeFileSync(join(OUT, "steps.json"), JSON.stringify({ brand: BRAND, base: BASE, facts: F, steps }, null, 2));
  await browser.close();
  console.log(`${steps.length} screenshots + steps.json → ${OUT}  (brand: ${BRAND})`);
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
