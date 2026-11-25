import { describe, expect, it } from "vitest";
import { selectTarsContractAttachment, type TarsRental } from "./client";

function rental(attachments: TarsRental["attachments"]): TarsRental {
  return { documentNumber: "2026-1116-1", did: "did:rta:test", attachments };
}

describe("selectTarsContractAttachment", () => {
  it("selects the labelled contract PDF, not a customer document", () => {
    const selected = selectTarsContractAttachment(rental([
      { label: "Emirates ID", url: "https://tars.rta.ae/files/eid.pdf" },
      { label: "Signed rental contract", url: "https://tars.rta.ae/files/contract.pdf" },
    ]));
    expect(selected?.url).toBe("https://tars.rta.ae/files/contract.pdf");
  });

  it("accepts one unambiguous PDF and rejects ambiguous attachments", () => {
    expect(selectTarsContractAttachment(rental([{ url: "/files/only.pdf?download=1" }]))?.url).toBe("/files/only.pdf?download=1");
    expect(selectTarsContractAttachment(rental([{ url: "/files/a.pdf" }, { url: "/files/b.pdf" }]))).toBeNull();
    expect(selectTarsContractAttachment(rental([{ label: "Mulkiya", url: "/files/mulkiya.jpg" }]))).toBeNull();
  });
});
