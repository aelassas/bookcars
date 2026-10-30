import { describe, expect, it } from "vitest";
import { resolveOwnerForLine } from "./owners";


// Every line that is actually paired must resolve to a person, or its leads
// land on nobody's board. Ayham, 2026-08-31, asked for "brand and agent to be
// mentioned in all leads (taken by whom)" — and at that moment Abdullah's
// `cardiwan` line was in NO owner map the relay consulted, so his cards were
// created unowned, while Ali's `babek-rent-2` was labelled Babek.
//
// The slugs below are the lines carrying live traffic (checked against the
// message table on 2026-08-31). Adding a line without adding it here is the
// mistake this test exists to catch.
describe("every live WhatsApp line has an owner", () => {
  const LIVE_LINES = [
    "cardiwan",        // Abdullah
    "babek-rent",      // Babek
    "babek-rent-2",    // Ali
    "babek-rent-3",    // Babek
    "ayham-rent",      // Ayham
    "mohamed-etm",     // Mohamed
    "etm-website",     // Babek — ETM website line
    "azat-takeauto",   // Azat   (leasing)
    "firuz-takeauto",  // Firuz  (leasing)
  ];

  for (const line of LIVE_LINES) {
    it(line, () => {
      const owner = resolveOwnerForLine(line);
      expect(owner, `${line} resolves to nobody — its leads would be unowned`).not.toBeNull();
      expect(owner!.name.trim().length).toBeGreaterThan(0);
      expect(owner!.key.trim().length).toBeGreaterThan(0);
    });
  }

  it("Ali's line is Ali, not Babek", () => {
    expect(resolveOwnerForLine("babek-rent-2")!.key).toBe("ali");
    expect(resolveOwnerForLine("babek-rent")!.key).toBe("babek");
  });

  it("Abdullah's line is Abdullah", () => {
    expect(resolveOwnerForLine("cardiwan")!.key).toBe("abdullah");
  });
});
