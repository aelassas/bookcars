import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const SLUG = "take-auto";
const OUT = path.join(process.cwd(), "qa-screenshots");
fs.mkdirSync(OUT, { recursive: true });

const ACCOUNTS = [
  { role: "admin", email: "admin.demo@takeauto.ae" },
  { role: "lease", email: "lease.demo@takeauto.ae" },
  { role: "rent", email: "rent.demo@cardiwan.ae" },
  { role: "security", email: "security.demo@takeauto.ae" },
];
const PW = "Demo1234!";

const ROUTES = [
  ["dashboard", ""],
  ["crm", "/crm"], ["customers", "/customers"], ["fleet", "/fleet"],
  ["fleet-availability", "/fleet/availability"], ["leases", "/leases"],
  ["rentals", "/rentals"], ["returns", "/returns"], ["collections", "/collections"],
  ["messages", "/messages"], ["tasks", "/tasks"], ["security", "/security"],
  ["settings-branding", "/settings/branding"], ["settings-team", "/settings/team"],
  ["settings-ai", "/settings/ai"], ["settings-integrations", "/settings/integrations"],
  ["settings-migration", "/settings/migration"], ["settings-support", "/settings/support"],
];

const report = [];
// NOTE: "could not be found" is excluded — Next bundles the not-found boundary
// text into every RSC payload, so it's a false positive on healthy 200 pages.
const ERR_MARKERS = ["This view isn’t available", "Workspace suspended", "Application error", "Internal Server Error", "Unhandled Runtime"];
const realConsole = (errs) => (errs || []).filter((e) => !/favicon|status of 404 \(Not Found\)/.test(e));

async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: true }).catch(() => {}); }

const browser = await chromium.launch();
for (const acct of ACCOUNTS) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));

  // login
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', acct.email);
  await page.fill('input[type="password"]', PW);
  await Promise.all([
    page.waitForURL((u) => !u.toString().includes("/login"), { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
  await shot(page, `${acct.role}_00_after-login`);

  for (const [name, route] of ROUTES) {
    consoleErrors.length = 0;
    let status = 0;
    const resp = await page.goto(`${BASE}/${SLUG}${route}`, { waitUntil: "networkidle", timeout: 20000 }).catch(() => null);
    status = resp ? resp.status() : 0;
    await page.waitForTimeout(400);
    const body = (await page.content()).slice(0, 200000);
    const marker = ERR_MARKERS.find((m) => body.includes(m)) || "";
    const finalUrl = page.url().replace(BASE, "");
    await shot(page, `${acct.role}_${name}`);
    report.push({ role: acct.role, screen: name, url: finalUrl, http: status, marker, consoleErrors: [...consoleErrors] });
  }

  // FLEET drawer test: list must NOT auto-open; opens on click; closes.
  try {
    await page.goto(`${BASE}/${SLUG}/fleet`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const drawerOnLoad = await page.locator("text=Pilot GPS · read-only").count();
    await shot(page, `${acct.role}_fleet_01_list`);
    // click a real vehicle card (its button shows the make/model)
    const vcard = page.locator("main button").filter({ hasText: /Huracán|Ghost|Series|C-Class|Vogue|X7|G-Class|Patrol|Range Rover|Land Cruiser|BMW|Mercedes|Rolls|Lamborghini/ }).first();
    await vcard.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    const drawerAfterClick = await page.locator("text=Pilot GPS · read-only").count();
    await shot(page, `${acct.role}_fleet_02_card`);
    await page.locator('button:has-text("Close")').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    const drawerAfterClose = await page.locator("text=Pilot GPS · read-only").count();
    await shot(page, `${acct.role}_fleet_03_closed`);
    report.push({ role: acct.role, screen: "fleet-drawer", drawerOnLoad, drawerAfterClick, drawerAfterClose,
      verdict: drawerOnLoad === 0 && drawerAfterClick >= 1 && drawerAfterClose === 0 ? "OK" : "CHECK" });
  } catch (e) { report.push({ role: acct.role, screen: "fleet-drawer", error: String(e).slice(0, 120) }); }

  // list → detail → back for customers / leases / rentals
  for (const [name] of [["customers"], ["leases"], ["rentals"]]) {
    try {
      const r = await page.goto(`${BASE}/${SLUG}/${name}`, { waitUntil: "networkidle" }).catch(() => null);
      if (!r || r.status() >= 400) continue;
      const link = page.locator(`main a[href*="/${name}/"]`).first();
      if (await link.count() === 0) { report.push({ role: acct.role, screen: `${name}-detail`, note: "no rows to open" }); continue; }
      await link.click({ timeout: 4000 });
      await page.waitForTimeout(700);
      await shot(page, `${acct.role}_${name}_detail`);
      const detailBody = await page.locator("body").innerText().catch(() => "");
      const detailMarker = ERR_MARKERS.find((m) => detailBody.includes(m)) || "";
      await page.goBack({ waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, `${acct.role}_${name}_back`);
      report.push({ role: acct.role, screen: `${name}-detail`, opened: true, detailUrl: page.url().replace(BASE, ""), marker: detailMarker });
    } catch (e) { report.push({ role: acct.role, screen: `${name}-detail`, error: String(e).slice(0, 120) }); }
  }

  await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
// summary
const bad = report.filter((r) => (r.http && (r.http === 404 || r.http >= 500)) || r.marker || realConsole(r.consoleErrors).length || r.verdict === "CHECK" || r.error);
console.log("TOTAL CHECKS:", report.length, "  PROBLEMS:", bad.length);
for (const b of bad) console.log("  ⚠", b.role, b.screen, b.http || "", b.marker || "", b.verdict || "", (b.consoleErrors && b.consoleErrors[0]) || "", b.error || "");
console.log("screens in", OUT);
