import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.RMA_BASE_URL ?? "https://crm.rma.network";
const email = "ruslan@rma.network";
const password = "Welcome1!";

function dayAfter(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function main() {
  await mkdir("verification", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("console", (message) => console.log(`Browser ${message.type()}: ${message.text()}`));
  page.on("response", (response) => {
    if (response.url().includes("/api/auth/") || response.url().includes("/api/device/")) {
      console.log(`Auth response ${response.status()}: ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => console.error(`Request failed: ${request.url()} — ${request.failure()?.errorText}`));

  try {
    await page.goto(`${baseUrl}/login/rma`, { waitUntil: "networkidle" });
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 }),
      page.locator("button[type='submit']").click(),
    ]);
    console.log(`Login passed: ${page.url()}`);

    if (process.env.RMA_CAPTURE_ONLY === "1") {
      await page.goto(`${baseUrl}/rma/fleet/availability`, { waitUntil: "networkidle" });
      await page.screenshot({ path: "verification/rma-board.png", fullPage: true });
      console.log("Calendar captured: verification/rma-board.png");
      return;
    }

    await page.goto(`${baseUrl}/rma/fleet/availability?view=month`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /new booking/i }).click();

    const customer = page.getByPlaceholder("Search customers…");
    await customer.click();
    await page.getByRole("button", { name: "John Smith (tourist)", exact: true }).click();
    await page.locator("select[name='vehicleId']").selectOption({ label: "DXB A 12101 — Nissan Sunny" });
    await page.locator("input[name='startDate']").fill(dayAfter(30));
    await page.locator("input[name='returnDate']").fill(dayAfter(33));

    await page.waitForFunction(() => {
      const button = Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.trim().startsWith("Confirm"));
      return button && !button.disabled;
    });
    const confirm = page.getByRole("button", { name: /^Confirm/ });
    console.log(`Quote: ${await confirm.innerText()}`);
    await confirm.click();

    await page.locator("select[name='vehicleId']").waitFor({ state: "detached", timeout: 20_000 });
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: "verification/rma-calendar.png", fullPage: true });
    console.log("Booking created and calendar captured: verification/rma-calendar.png");
  } catch (error) {
    console.error(`Verification failed at ${page.url()}`);
    console.error((await page.locator("body").innerText()).slice(0, 1200));
    await page.screenshot({ path: "verification/rma-error.png", fullPage: true });
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
