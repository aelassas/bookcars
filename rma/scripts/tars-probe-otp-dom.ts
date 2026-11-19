// Probe: reach the TARS OTP screen and dump the radio/button DOM so we can
// write the exact selector to pick EMAIL instead of the default (mobile).
import { chromium } from "playwright";
import { config } from "dotenv";
config({ path: ".env.local" });

const USER = process.env.TARS_USERNAME!;
const PASS = process.env.TARS_PASSWORD!;

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();
  await page.goto("https://tars.rta.ae/apps/business/en/rentals", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);
  await page.locator('a:has-text("Login")').first().click();
  await page.waitForTimeout(4000);
  const credForm = page.locator('form[action*="auth_cred_submit"]').first();
  await credForm.locator('input[name="username"]').fill(USER);
  await credForm.locator('input[name="password"]').fill(PASS);
  const submitBtn = credForm.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();
  await submitBtn.click().catch(async () => { await credForm.locator('input[name="password"]').press("Enter"); });
  await page.waitForTimeout(6000);

  const text = await page.locator("body").innerText();
  if (!text.includes("Send OTP")) {
    console.log("unexpected page:", page.url(), text.slice(0, 300));
    await page.screenshot({ path: "/tmp/tars-unexpected.png" });
    process.exit(1);
  }

  // Dump every input[type=radio] and the buttons on the OTP screen.
  const radios = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="radio"]')).map((r, i) => ({
      i,
      name: r.getAttribute("name"),
      id: r.getAttribute("id"),
      value: r.getAttribute("value"),
      checked: (r as HTMLInputElement).checked,
      labelText: (r.closest("label")?.textContent ?? "").trim().slice(0, 80),
      outer: r.outerHTML.slice(0, 200),
    }));
  });
  console.log("RADIOS:", JSON.stringify(radios, null, 2));

  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button, input[type=submit], input[type=button]")).map((b, i) => ({
      i,
      tag: b.tagName,
      type: b.getAttribute("type"),
      value: b.getAttribute("value"),
      text: (b.textContent ?? "").trim().slice(0, 60),
    })).filter(b => /otp|send|verify|submit|back/i.test((b.text ?? "") + (b.value ?? "")))
  );
  console.log("BUTTONS:", JSON.stringify(buttons, null, 2));

  // Try to select the email option via a few strategies and report checked state.
  const emailText = page.locator('text=/Send OTP to email/i').first();
  console.log("emailText count:", await emailText.count());
  await emailText.click().catch((e) => console.log("email click err:", String(e)));
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="radio"]')).map((r) => ({
      value: r.getAttribute("value"),
      checked: (r as HTMLInputElement).checked,
    }));
  });
  console.log("AFTER email click radios:", JSON.stringify(after));

  await page.screenshot({ path: "/tmp/tars-otp-screen.png", fullPage: true });
  console.log("screenshot saved /tmp/tars-otp-screen.png");
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
