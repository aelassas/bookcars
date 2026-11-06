import { describe, expect, it } from "vitest";
import { dealStageLabel, dealStageOptions, isDealStage, RMA_RENTAL_STAGES, statusForDealStage } from "./stages";

describe("RMA rental stages", () => {
  it("keeps the exact meeting sequence and maps existing stages without a rewrite", () => {
    expect(RMA_RENTAL_STAGES).toEqual([
      { key: "inquiry", label: "Incoming" },
      { key: "quote", label: "In progress" },
      { key: "contract", label: "Signed" },
      { key: "tars", label: "Uploaded to TARS" },
      { key: "handover", label: "Active rental" },
      { key: "closed", label: "Closed" },
    ]);
    expect(dealStageLabel("rma", "inquiry")).toBe("Incoming");
    expect(dealStageLabel("rma", "quote")).toBe("In progress");
    expect(dealStageLabel("rma", "handover")).toBe("Active rental");
  });

  it("does not change other tenants' funnels", () => {
    expect(dealStageOptions("take-auto").map((stage) => stage.key)).toEqual([
      "inquiry", "quote", "contract", "handover", "closed",
    ]);
  });

  it("validates the new stage at the server-action boundary", () => {
    expect(isDealStage("tars")).toBe(true);
    expect(isDealStage("uploaded-to-tars")).toBe(false);
  });
});

describe("statusForDealStage", () => {
  it("closes a completed rental as won and preserves a lost outcome", () => {
    expect(statusForDealStage("closed", "open")).toBe("won");
    expect(statusForDealStage("closed", "lost")).toBe("lost");
  });

  it("reopens a deal moved out of Closed", () => {
    expect(statusForDealStage("handover", "won")).toBe("open");
    expect(statusForDealStage("inquiry", "lost")).toBe("open");
  });
});
