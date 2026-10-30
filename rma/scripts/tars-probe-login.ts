/* Probe v4: full SSO login incl. OTP step.
 * OTP is read from /tmp/tars-otp.txt (write the code there when it arrives).
 *   npx tsx scripts/tars-probe-login.ts
 */
import { chromium } from "playwright";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import process from "node:process";

const USER = process.env.TARS_USERNAME!;
const PASS = process.env.TARS_PASSWORD!;

async function waitForOtpFile(timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync("/tmp/tars-otp.txt")) {
      const code = readFileSync("/tmp/tars-otp.txt", "utf8").trim();
      if (/^\d{4,8}$/.test(code)) return code;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("OTP timeout — /tmp/tars-otp.txt not provided");
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  await page.goto("https://tars.rta.ae/apps/business/en/rentals", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.locator('a:has-text("Login")').first().click();
  await page.waitForTimeout(4000);
  console.log("sso page:", page.url());

  const credForm = page.locator('form[action*="auth_cred_submit"]').first();
  await credForm.locator('input[name="username"]').fill(USER);
  await credForm.locator('input[name="password"]').fill(PASS);
  const submitBtn = credForm.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
  await submitBtn.click().catch(async () => { await credForm.locator('input[name="password"]').press("Enter"); });
  await page.waitForTimeout(6000);

  const text = await page.locator("body").innerText();
  if (!text.includes("Send OTP")) {
    console.log("unexpected page after creds:", page.url(), text.slice(0, 300));
    await page.screenshot({ path: "/tmp/tars-unexpected.png" });
    process.exit(1);
  }

  // Choose email OTP (goes to ab*****@gmail.com); fall back to mobile if asked.
  const channel = process.env.TARS_OTP_CHANNEL ?? "email";
  const radio = page.locator(`text=/Send OTP to ${channel === "email" ? "email" : "mobile"}/i`).first();
  await radio.click().catch(() => {});
  await page.locator('button:has-text("Send OTP"), input[value*="Send OTP"]').first().click();
  console.log(`OTP requested via ${channel}. Waiting for /tmp/tars-otp.txt …`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "/tmp/tars-otp-page.png" });

  const otp = await waitForOtpFile(10 * 60_000);
  console.log("got OTP, submitting…");
  const otpInput = page.locator('input[type="text"]:visible, input[name*="otp" i], input[id*="otp" i]').first();
  await otpInput.fill(otp);
  await page.locator('button[type="submit"]:visible, button:has-text("Verify"), button:has-text("Submit"), input[type="submit"]:visible').first().click();
  await page.waitForTimeout(8000);
  console.log("after OTP:", page.url());

  // Consent page, if shown.
  for (let i = 0; i < 3 && !page.url().includes("tars.rta.ae"); i++) {
    const approve = page.locator('button:has-text("Allow"), button:has-text("Approve"), input[type="submit"]:visible').first();
    if (await approve.count()) { await approve.click().catch(() => {}); await page.waitForTimeout(5000); }
    else break;
  }
  await page.waitForTimeout(5000);
  console.log("final:", page.url());

  const cookies = await ctx.cookies("https://tars.rta.ae");
  const names = cookies.map((c) => c.name);
  console.log("cookies:", names.join(", "));
  const token = cookies.find((c) => c.name === "access_token");
  console.log("access_token present:", Boolean(token));
  writeFileSync("/tmp/tars-session.json", JSON.stringify({ url: page.url(), cookies }, null, 1));

  if (token) {
    const probe = await page.evaluate(async () => {
      const get = async (p: string) => {
        const r = await fetch(p, { headers: { Accept: "application/json" } });
        const t = await r.text();
        try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t.slice(0, 200) }; }
      };
      return {
        rentals: await get("/api/agencies/did:rta:51646245/rentals/500"),
        vehicle: await get("/api/agencies/did:rta:51646245/vehicle/W1K5J4HB6SN516987"),
      };
    });
    console.log("rentals meta:", JSON.stringify((probe.rentals as { body?: { meta?: unknown } }).body?.meta));
    writeFileSync("/tmp/tars-vehicle-detail.json", JSON.stringify(probe.vehicle, null, 1));
    console.log("vehicle detail saved to /tmp/tars-vehicle-detail.json, status:", probe.vehicle.status);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
