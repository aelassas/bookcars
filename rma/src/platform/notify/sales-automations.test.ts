// Handover normalizer — the girls'-queue → guys'-pipeline sweep (2026-09
// leasing restructure, SALES instance only).
//
// The pins below are the two business rules plus the field-presence gate:
// while salesStage/primaryStage do not exist on the live workspace the
// normalizer must be a NO-OP, and once they exist a card must never carry
// both stages, nor sit stageless on the girls' board while a closer owns it.
import { describe, expect, it } from "vitest";
import { SALES_CLOSER_IDS, SALES_PRIMARY_IDS } from "../../modules/board/owners";
import { planHandoverNormalization, SALES_STAGE_HANDOVER } from "./sales-automations";

const MOE = "f78d1e10-0be5-4d5f-b0c7-ec461a41cc5c";
const BAYAN = "fa7be172-60c9-4b54-a7ad-336e89cf2b1e";

function input(over: Partial<Parameters<typeof planHandoverNormalization>[0]> = {}) {
  return {
    ownerId: BAYAN,
    salesStage: null as string | null,
    primaryStage: "NEW_APPLICATION" as string | null,
    closerIds: SALES_CLOSER_IDS,
    fieldsPresent: true,
    ...over,
  };
}

describe("planHandoverNormalization", () => {
  it("a card with BOTH stages leaves the girls' board (salesStage wins)", () => {
    expect(planHandoverNormalization(input({ salesStage: "NEGOTIATION" }))).toEqual({
      primaryStage: null,
    });
  });

  it("a closer-owned card with no salesStage is handed over anyway", () => {
    // The girl reassigned but forgot the stage — the handover still completes.
    expect(planHandoverNormalization(input({ ownerId: MOE }))).toEqual({
      salesStage: SALES_STAGE_HANDOVER,
      primaryStage: null,
    });
    expect(SALES_STAGE_HANDOVER).toBe("IDENTIFYING_THE_NEED");
  });

  it("a girl-owned fresh card is UNTOUCHED — the relay's creation write is never fought", () => {
    expect(planHandoverNormalization(input())).toBeNull();
  });

  it("a closer-owned card with no primaryStage needs nothing", () => {
    expect(planHandoverNormalization(input({ ownerId: MOE, primaryStage: null }))).toBeNull();
  });

  it("a card with no stages at all needs nothing", () => {
    expect(planHandoverNormalization(input({ primaryStage: null }))).toBeNull();
  });

  it("the field-presence gate: absent fields → always a no-op", () => {
    expect(
      planHandoverNormalization(input({ salesStage: "NEGOTIATION", fieldsPresent: false }))
    ).toBeNull();
    expect(planHandoverNormalization(input({ ownerId: MOE, fieldsPresent: false }))).toBeNull();
  });

  it("the girls and the guys are distinct pools (config sanity)", () => {
    for (const id of SALES_PRIMARY_IDS) expect(SALES_CLOSER_IDS.has(id)).toBe(false);
    expect(SALES_CLOSER_IDS.has(MOE)).toBe(true);
    expect(SALES_PRIMARY_IDS.has(BAYAN)).toBe(true);
  });
});
