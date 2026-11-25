import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
  locale: "en-GB",
});
const page = await ctx.newPage();
await page.goto("https://customers.salik.ae/connect/login?lang=en", { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.locator("#username").fill(process.env.SALIK_USERNAME);
await page.locator("#password").fill(process.env.SALIK_PASSWORD);
await page.locator('input[type="submit"]').click();
await page.waitForTimeout(8000);
console.log("after login:", page.url(), "| title:", await page.title());
const text = await page.locator("body").innerText().catch(() => "?");
console.log("page text head:", text.slice(0, 500));
await page.screenshot({ path: "/tmp/salik-after-login.png" });
await browser.close();
