import { describe, expect, it } from "vitest";
import { linesForOwnerKey } from "@/modules/board/owners";

// «Мой день» "who am I → my lines" arithmetic. The SQL reads need a DB and are
// exercised in the app; here we lock the line-ownership mapping the cockpit
// filters on. (isSalesLineOnly lives in authorization.ts, which pulls the auth
// stack that can't load under vitest — it's covered by the tsc build instead.)
describe("linesForOwnerKey", () => {
  it("returns every BRAND_OWNERS line slug that shares the key", () => {
    // Babek has THREE lines, not the three the "babek-rent*" slugs suggest:
    // babek-rent (he signs "This is Babek, from EasyRent") and babek-rent-3
    // (customers write "Hi babek") — plus etm-website, the ETM website line
    // he answers ("I'm Babek", 2026-09-07 — see owners.ts). babek-rent-2 is
    // Ali's — see below.
    expect(linesForOwnerKey("babek").sort()).toEqual(["babek-rent", "babek-rent-3", "etm-website"]);
  });

  it("maps a single-line owner to exactly their line", () => {
    expect(linesForOwnerKey("firuz")).toEqual(["firuz-takeauto"]);
  });

  it("gives Ali his working line as well as his personal one", () => {
    // babek-rent-2 (971564048816) is where Ali actually works — he signs
    // "Hi sir, this is Ali from Easy Rent" ×16 in 30 days. Its slug says
    // "babek", which is how every card and SLA escalation of the busiest rent
    // line used to land on Babek while Ali's own day looked empty.
    // babek-rent-4 is his personal phone (971542445835), where customers greet
    // him by name ("السلام عليك علي").
    expect(linesForOwnerKey("ali").sort()).toEqual(["babek-rent-2", "babek-rent-4"]);
  });

  it("gives Abdullah his one remaining line", () => {
    // 971569808087. His duplicate pairing "abdullah-takeauto" was retired
    // 2026-08-05 — it had captured nothing since Jul 16.
    expect(linesForOwnerKey("abdullah")).toEqual(["cardiwan"]);
  });

  it("returns [] for an unknown key", () => {
    expect(linesForOwnerKey("nobody")).toEqual([]);
  });
});
