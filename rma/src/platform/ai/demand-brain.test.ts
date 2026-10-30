import { describe, it, expect } from "vitest";
import { parseStructuredDemand } from "./demand-brain";

describe("parseStructuredDemand", () => {
  it("parses a clean JSON object", () => {
    const r = parseStructuredDemand(
      '{"make":"Nissan","model":"Patrol","dateFrom":"2026-08-13","dateTo":"2026-08-15","budgetAed":4000,"channel":"b2c","intent":"rent"}',
    );
    expect(r).toEqual({
      make: "Nissan", model: "Patrol", dateFrom: "2026-08-13", dateTo: "2026-08-15",
      budgetAed: 4000, channel: "b2c", intent: "rent",
    });
  });

  it("tolerates prose / code fences around the JSON", () => {
    const r = parseStructuredDemand('Sure! ```json\n{"make":"Rolls Royce","model":"Ghost"}\n``` hope this helps');
    expect(r?.make).toBe("Rolls Royce");
    expect(r?.model).toBe("Ghost");
  });

  it("coerces a string budget with currency to a number", () => {
    expect(parseStructuredDemand('{"make":"BMW","budgetAed":"AED 3,500/mo"}')?.budgetAed).toBe(3500);
  });

  it("normalises channel and treats 'null' string as null", () => {
    expect(parseStructuredDemand('{"make":"Kia","channel":"B2B"}')?.channel).toBe("b2b");
    expect(parseStructuredDemand('{"make":"Kia","model":"null","channel":"weird"}')?.model).toBeNull();
    expect(parseStructuredDemand('{"make":"Kia","channel":"weird"}')?.channel).toBeNull();
  });

  it("returns null when there is no car / date / budget signal", () => {
    expect(parseStructuredDemand('{"make":null,"model":null,"dateFrom":null,"budgetAed":null,"intent":"hi"}')).toBeNull();
  });

  it("returns null on garbage / no JSON", () => {
    expect(parseStructuredDemand("not json at all")).toBeNull();
    expect(parseStructuredDemand("")).toBeNull();
    expect(parseStructuredDemand("{broken")).toBeNull();
  });
});
