import { describe, it, expect } from "vitest";
import { relevantListings, distinctiveTokens } from "./listing-match";

const L = (title: string, price = 100000) => ({ title, price, year: "", km: "", url: "https://x" });

/**
 * The failure this exists to stop, taken verbatim from what Azat and Firuz
 * received on 2026-08-06:
 *
 *   🛒 For Operation Gk's request ("Mercedes-Benz G63 2025") — found on Dubizzle:
 *      • 2022 NISSAN …
 *      • 2020 Land Rover …
 *
 * Dubizzle's keyword search is loose and the enricher printed the top three
 * results without ever checking they were the car that was asked for. Sales
 * archived the whole feed — not because the topic was wrong, but because the
 * answers were junk. Silence is strictly better than a wrong car.
 */
describe("relevantListings", () => {
  it("drops results that are not the requested car", () => {
    const out = relevantListings("Mercedes-Benz G63 2025", [
      L("2022 NISSAN PATROL PLATINUM"),
      L("2020 Land Rover Range Rover"),
    ]);
    expect(out).toEqual([]);
  });

  it("keeps the requested car even when the title is spaced differently", () => {
    // "G63" vs "G 63 AMG" — normalising away spaces and punctuation is what
    // makes the model token comparable at all.
    const out = relevantListings("Mercedes-Benz G63 2025", [
      L("Mercedes-Benz G 63 AMG 2021"),
      L("2022 NISSAN PATROL"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain("G 63");
  });

  it("matches short alphanumeric models like M8 or X5", () => {
    expect(relevantListings("M8", [L("GAC M8 Master Edition 2023")])).toHaveLength(1);
    expect(relevantListings("BMW X5", [L("BMW X5 xDrive40i")])).toHaveLength(1);
    expect(relevantListings("M8", [L("Toyota Land Cruiser")])).toEqual([]);
  });

  it("matches on a model word alone, without the make", () => {
    expect(relevantListings("range velar", [L("Land Rover Range Rover Velar 2021")])).toHaveLength(1);
  });

  it("sends nothing when the request is too vague to check", () => {
    // "a car", "any suv" — anything we cannot pin to a model would let every
    // cheap listing through, which is exactly the noise being removed.
    expect(relevantListings("car", [L("Nissan Patrol")])).toEqual([]);
    expect(relevantListings("", [L("Nissan Patrol")])).toEqual([]);
  });

  it("ignores the year in the request — it is a filter, not the car", () => {
    // 2025 must not make a 2025-plated Nissan a valid answer for a G63 ask.
    expect(distinctiveTokens("Mercedes-Benz G63 2025")).not.toContain("2025");
    expect(relevantListings("Mercedes-Benz G63 2025", [L("2025 Nissan Patrol")])).toEqual([]);
  });

  it("preserves the order it was given, so cheapest-first stays cheapest-first", () => {
    const out = relevantListings("Patrol", [
      L("Nissan Patrol SE", 90000),
      L("Nissan Patrol Platinum", 150000),
    ]);
    expect(out.map((l) => l.price)).toEqual([90000, 150000]);
  });
});
