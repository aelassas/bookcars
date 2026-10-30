import { describe, expect, it } from "vitest";
import { displayAgentName } from "./agent-name";

describe("displayAgentName", () => {
  it("maps the known roster to English", () => {
    expect(displayAgentName("(bitrix24) Садыгов Бабек")).toBe("Babek Sadygov");
    expect(displayAgentName("(bitrix24) sohiel Ali")).toBe("Ali Sohiel");
  });

  it("marks former staff on historical cards", () => {
    expect(displayAgentName("(bitrix24) Зазалаев Асхаб")).toBe("Askhab Zazalaev (former)");
  });

  it("maps Abdullah's FreePBX extension to his name", () => {
    expect(displayAgentName("ext-1002")).toBe("Abdullah");
    // The server-side test extension stays anonymous — never borrow a name.
    expect(displayAgentName("ext-1001")).toBe("ext-1001");
  });

  it("cleans multi-agent dumps per name and dedupes", () => {
    expect(
      displayAgentName("(bitrix24) L.L.C CARDIWAN, (bitrix24) sohiel Ali, (bitrix24) Садыгов Бабек")
    ).toBe("Cardiwan LLC, Ali Sohiel, Babek Sadygov");
    expect(displayAgentName("(bitrix24) sohiel Ali, (bitrix24) sohiel Ali")).toBe("Ali Sohiel");
  });

  it("strips the prefix on unknown names but never invents", () => {
    expect(displayAgentName("(bitrix24) Новый Агент")).toBe("Новый Агент");
    expect(displayAgentName("Mariam Saleh")).toBe("Mariam Saleh");
  });

  it("returns null on empty input", () => {
    expect(displayAgentName(null)).toBeNull();
    expect(displayAgentName("")).toBeNull();
    expect(displayAgentName("(bitrix24)")).toBeNull();
  });
});

import { matchMemberForAgent } from "./agent-name";

describe("matchMemberForAgent (the responsible on the card)", () => {
  const members = [
    { id: "m-babek", firstName: "Babek", lastName: "Sadygov" },
    { id: "m-ali", firstName: "Ali", lastName: "" },
    { id: "m-abdullah", firstName: "Abdullah", lastName: "" },
    { id: "m-moe", firstName: "Moe", lastName: "" },
  ];

  it("matches the full name exactly", () => {
    expect(matchMemberForAgent("Babek Sadygov", members)).toBe("m-babek");
  });

  it("falls back to a unique first name", () => {
    expect(matchMemberForAgent("Ali Sohiel", members)).toBe("m-ali");
    expect(matchMemberForAgent("Abdullah", members)).toBe("m-abdullah");
  });

  it("never guesses: unknown or ambiguous names stay unowned", () => {
    expect(matchMemberForAgent("Cardiwan LLC", members)).toBeNull();
    expect(matchMemberForAgent("Askhab Zazalaev (former)", members)).toBeNull();
    expect(matchMemberForAgent(null, members)).toBeNull();
    expect(
      matchMemberForAgent("Ali Sohiel", [...members, { id: "m-ali2", firstName: "Ali", lastName: "K" }])
    ).toBeNull();
  });
});
