import { describe, expect, it } from "vitest";
import { leadSequenceName } from "./lead-number";

// The two Twenty deployments shared ONE sequence, so a lead carded on the sales
// board consumed a number the rental board never used. Within an hour of the
// 1 September renumbering Ayham's board read 1…8, then 11, 12 — to a manager
// that is two leads that went missing, which is exactly the anxiety the clean
// restart was meant to end.
//
// Each deployment counts for itself now. Sales keeps climbing from where it is;
// rental is contiguous.
describe("leadSequenceName — one counter per deployment, never shared", () => {
  it("names a sequence per instance", () => {
    expect(leadSequenceName("rental")).toBe("twenty_lead_seq_rental");
    // "default" IS the sales deployment — the router's own name for it.
    expect(leadSequenceName("default")).toBe("twenty_lead_seq_default");
  });

  it("gives the two deployments different counters", () => {
    expect(leadSequenceName("rental")).not.toBe(leadSequenceName("default"));
  });

  // The guard that matters, learned the hard way. A caller passed `undefined`,
  // which stringifies to "undefined" — a perfectly valid SQL identifier — so a
  // pattern check waved it through and `twenty_lead_seq_undefined` was created
  // starting at 1. The next lead came out as a SECOND #1 on a board that
  // already had one. An unknown deployment must stop the pass.
  it("refuses an unknown deployment rather than inventing a counter for it", () => {
    expect(() => leadSequenceName(undefined as never)).toThrow(/unknown deployment/);
    expect(() => leadSequenceName("undefined" as never)).toThrow(/unknown deployment/);
    expect(() => leadSequenceName("sales" as never)).toThrow(/unknown deployment/);
    expect(() => leadSequenceName("rental; DROP TABLE x" as never)).toThrow();
    expect(() => leadSequenceName("" as never)).toThrow();
  });
});
