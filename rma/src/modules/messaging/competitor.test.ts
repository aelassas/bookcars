import { describe, expect, it } from "vitest";
import { isBroadcast, parseCompetitorPost } from "./competitor";

// Verbatim production broadcasts pulled from the mycrm `message` table — the
// two shops that blast daily fleet lists into TAKE's customer chats.
const TOP_CAR = `⚜️ *AVAILABLE CARS !!*  ⚜️
⚜️ *TOP CAR RENT A CAR* ⚜️
📅 ** Available Vehicles ** – 22 July 2026

1. MERCEDES 🚘
      🛞 G63 2026⚫

2. Rang Rover 🚘
    🛞  VELAR 2021 🔵

3. NISSAN 🚘
      🛞  PATROL 2026 ⚫
      🛞  X-TERRA 2025 🩶

4. BMW 🚘
    🛞 X2 2021 ⚪
    🛞 430i 2020 🩶

5. VOLKSWAGEN 🚘
      🛞 JETTA 2021 🩶

6. MAZDA🚘
    🛞  MAZDA 6 2023  🩶

7. KIA 🚘
   🛞  PEGAS 2023 ⚪

8. GMC 🚘
   🛞 YUKON 2023⚫

9. AUDI 🚘
   🛞 A3 2025⚪`;

const ZORWAH = `🚗 ZORWAH Car Rental 🚗

🚘 Available Cars:                         Toyota Corolla Cross, Blue   2023                    Mercedes-Benz C300, luxurious black   2024              Mini Cooper green       2024        Nissan Patrol, white                  2026            Audi A4 , white, luxury, sedan                 2023        Ford Mustang Red Sports     2024      Genesis G80 Blue Sedan               2023
💸 Best Prices | Daily & Monthly Rental
📞 Book Now:
+971 55 737 8575`;

const CUSTOMER = "need lamborghini aventador from july 28 to july 31 send photo and price";

describe("isBroadcast", () => {
  it("flags a marker-bearing fleet list", () => {
    expect(isBroadcast(TOP_CAR)).toBe(true);
    expect(isBroadcast(ZORWAH)).toBe(true);
  });
  it("does not flag a single customer request", () => {
    expect(isBroadcast(CUSTOMER)).toBe(false);
  });
});

describe("parseCompetitorPost — TOP CAR", () => {
  const post = parseCompetitorPost(TOP_CAR);

  it("identifies the shop", () => {
    expect(post.source).toBe("TOP CAR RENT A CAR");
  });

  it("extracts a row per model (carries the make header down)", () => {
    const cars = post.rows.map((r) => r.carText.toLowerCase());
    expect(cars).toContain("mercedes g63 2026");
    expect(cars).toContain("nissan patrol 2026");
    expect(cars).toContain("bmw 430i 2020");
    expect(post.rows.length).toBeGreaterThanOrEqual(9);
  });

  it("captures model years", () => {
    const g63 = post.rows.find((r) => r.carText.toLowerCase().includes("g63"));
    expect(g63?.year).toBe(2026);
  });
});

describe("parseCompetitorPost — ZORWAH (space-padded)", () => {
  const post = parseCompetitorPost(ZORWAH);

  it("identifies the shop", () => {
    expect(post.source).toBe("ZORWAH Car Rental");
  });

  it("splits space-padded rows and skips the phone/CTA chrome", () => {
    const cars = post.rows.map((r) => r.carText.toLowerCase());
    expect(cars.some((c) => c.includes("patrol"))).toBe(true);
    expect(cars.some((c) => c.includes("mustang"))).toBe(true);
    // The phone number line must not become a car row.
    expect(cars.some((c) => c.includes("971"))).toBe(false);
    expect(post.rows.length).toBeGreaterThanOrEqual(5);
  });
});
