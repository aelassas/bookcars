import { describe, expect, it } from "vitest";
import { stageAfterWhatsappReply } from "./whatsapp-contacted";

describe("stageAfterWhatsappReply", () => {
  it("moves an incoming request to in progress after the first reply", () => {
    expect(stageAfterWhatsappReply("inquiry")).toBe("quote");
  });

  it("never skips later stages or moves a deal backwards", () => {
    for (const stage of ["quote", "contract", "tars", "handover", "closed"]) {
      expect(stageAfterWhatsappReply(stage)).toBe(stage);
    }
  });
});
