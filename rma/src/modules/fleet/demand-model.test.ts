import { describe, expect, it } from "vitest";
import { matchesVehicle, rankHotCars, type DemandSignal, type DemandVehicle } from "./demand-model";

describe("matchesVehicle", () => {
  const patrol = { make: "Nissan", model: "Patrol" };
  const g63 = { make: "Mercedes", model: "G63" };

  it("matches make + model", () => {
    expect(matchesVehicle("need lamborghini aventador tomorrow", { make: "Lamborghini", model: "Aventador" })).toBe(true);
  });
  it("matches a compact model code across spacing", () => {
    expect(matchesVehicle("mercedes g 63 2026 black", g63)).toBe(true);
    expect(matchesVehicle("mercedes g63 2026", g63)).toBe(true);
  });
  it("matches a distinctive bare model without the make", () => {
    expect(matchesVehicle("do you have a patrol", patrol)).toBe(true);
  });
  it("matches when the fleet model carries year/colour/trim (sheet format)", () => {
    expect(matchesVehicle("need nissan patrol", { make: "Nissan", model: "Patrol 2022 black V6" })).toBe(true);
    expect(matchesVehicle("bmw 430i convertible", { make: "BMW", model: "430i (conv) 2025 blue" })).toBe(true);
    expect(matchesVehicle("mercedes g63", { make: "Mercedes-Benz", model: "G63 AMG 2023 grey" })).toBe(true);
  });
  it("resolves a make alias (benz → mercedes)", () => {
    expect(matchesVehicle("benz g63 please", g63)).toBe(true);
  });
  it("rejects a different car", () => {
    expect(matchesVehicle("need a bmw x5", patrol)).toBe(false);
    expect(matchesVehicle("range rover vogue", g63)).toBe(false);
  });
  it("is false for empty text", () => {
    expect(matchesVehicle(null, patrol)).toBe(false);
    expect(matchesVehicle("", patrol)).toBe(false);
  });
});

describe("rankHotCars", () => {
  const vehicles: DemandVehicle[] = [
    { id: "v-patrol", make: "Nissan", model: "Patrol", year: 2026 },
    { id: "v-g63", make: "Mercedes", model: "G63", year: 2025 },
    { id: "v-cold", make: "Kia", model: "Pegas", year: 2023 },
  ];
  const t = (iso: string) => new Date(iso);

  it("ranks by distinct open-deal demand, then message volume, then recency", () => {
    const signals: DemandSignal[] = [
      // Patrol: 2 distinct deals + 1 message
      { vehicleId: "v-patrol", kind: "deal", dealId: "d1", ownerName: "Babek", at: t("2026-07-20T10:00:00Z") },
      { vehicleId: "v-patrol", kind: "deal", dealId: "d2", ownerName: "Azat", at: t("2026-07-21T10:00:00Z") },
      { vehicleId: "v-patrol", kind: "message", customerLine: "need a patrol", at: t("2026-07-22T09:00:00Z") },
      // G63: 1 deal + 3 messages
      { vehicleId: "v-g63", kind: "deal", dealId: "d3", ownerName: "Mansur", at: t("2026-07-19T10:00:00Z") },
      { vehicleId: "v-g63", kind: "message", customerLine: "g63 price?", at: t("2026-07-22T11:00:00Z") },
      { vehicleId: "v-g63", kind: "message", customerLine: "g wagon black", at: t("2026-07-22T12:00:00Z") },
      { vehicleId: "v-g63", kind: "message", customerLine: "gt g63 available?", at: t("2026-07-22T08:00:00Z") },
    ];
    const ranked = rankHotCars(vehicles, signals);

    expect(ranked.map((c) => c.vehicleId)).toEqual(["v-patrol", "v-g63"]);
    // v-cold has no signals → dropped entirely.
    expect(ranked.find((c) => c.vehicleId === "v-cold")).toBeUndefined();
  });

  it("computes demandCount as DISTINCT deals (not signal rows)", () => {
    const signals: DemandSignal[] = [
      { vehicleId: "v-g63", kind: "deal", dealId: "d1", ownerName: "Azat", at: t("2026-07-20T10:00:00Z") },
      { vehicleId: "v-g63", kind: "deal", dealId: "d1", ownerName: "Azat", at: t("2026-07-21T10:00:00Z") },
    ];
    const [g63] = rankHotCars(vehicles, signals);
    expect(g63.demandCount).toBe(1);
  });

  it("last toucher = owner of the newest-activity deal", () => {
    const signals: DemandSignal[] = [
      { vehicleId: "v-patrol", kind: "deal", dealId: "d1", ownerName: "Babek", at: t("2026-07-20T10:00:00Z") },
      { vehicleId: "v-patrol", kind: "deal", dealId: "d2", ownerName: "Azat", at: t("2026-07-22T10:00:00Z") },
    ];
    const [patrol] = rankHotCars(vehicles, signals);
    expect(patrol.lastToucher).toBe("Azat");
  });

  it("last customer line + last update = the newest signal", () => {
    const signals: DemandSignal[] = [
      { vehicleId: "v-patrol", kind: "message", customerLine: "older ask", at: t("2026-07-18T10:00:00Z") },
      { vehicleId: "v-patrol", kind: "message", customerLine: "need patrol today", at: t("2026-07-22T10:00:00Z") },
    ];
    const [patrol] = rankHotCars(vehicles, signals);
    expect(patrol.lastCustomerLine).toBe("need patrol today");
    expect(patrol.lastUpdateAt?.toISOString()).toBe("2026-07-22T10:00:00.000Z");
    expect(patrol.messageCount).toBe(2);
    expect(patrol.demandCount).toBe(0); // message-only demand
    expect(patrol.lastToucher).toBeNull();
  });
});
