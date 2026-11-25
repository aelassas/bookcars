// rotation.ts — the rental main-line DISTRIBUTION logic (pure).
//
// Pins: roster parsing from env (config, not code), the kill-switch, the
// busy/off-duty skipping round-robin with its persisted cursor, busy
// auto-expiry at read time, and the message text rendering.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTOREPLY_TEXT,
  DEFAULT_TEXTS,
  RENTAL_MAIN_LINES,
  applyPhoneOverrides,
  dubaiWeekday,
  effectiveStatus,
  loadRentalDistributorConfig,
  mainLineRotation,
  mergeRosterAgents,
  nextAvailableAgent,
  normalizePhoneOverride,
  parseRoster,
  planReturningPick,
  renderText,
  type AgentAvailability,
  type RotationAgent,
} from "./rotation";

const NOW = new Date("2026-09-16T12:00:00.000Z");

function agent(name: string, phone = "971501234567"): RotationAgent {
  return { name, phone, memberId: `${name.toLowerCase()}-id` };
}

describe("mainLineRotation — only the two main lines distribute", () => {
  it("maps the main lines to their brand rotation", () => {
    expect(mainLineRotation("etm-website")).toBe("etm");
    expect(mainLineRotation("cardiwan")).toBe("cardiwan");
  });

  it("every other line is NOT a main line (line-owner behaviour, unchanged)", () => {
    expect(mainLineRotation("babek-rent")).toBeNull();
    expect(mainLineRotation("ayham-rent")).toBeNull();
    expect(mainLineRotation(null)).toBeNull();
    expect(mainLineRotation(undefined)).toBeNull();
    expect(RENTAL_MAIN_LINES["etm-website"]).toBe("etm");
  });
});

describe("parseRoster — config, not code", () => {
  it("parses 'Name:9715…, Name2:9715…' into agents", () => {
    const { agents, dropped } = parseRoster("Ali:971542445835, Babek: 971529965085");
    expect(agents.map((a) => [a.name, a.phone])).toEqual([
      ["Ali", "971542445835"],
      ["Babek", "971529965085"],
    ]);
    expect(dropped).toEqual([]);
  });

  it("an empty roster parses to nothing — the caller falls back, logged loud", () => {
    expect(parseRoster(undefined).agents).toEqual([]);
    expect(parseRoster("").agents).toEqual([]);
    expect(parseRoster("  , ,").agents).toEqual([]);
  });

  it("malformed entries are dropped + reported, never fatal", () => {
    const { agents, dropped } = parseRoster("Ali:971542445835, nope, NoPhone:, :9715, Short:1234");
    expect(agents.map((a) => a.name)).toEqual(["Ali"]);
    expect(dropped).toEqual(["nope", "NoPhone:", ":9715", "Short:1234"]);
  });
});

describe("loadRentalDistributorConfig — env is the contract", () => {
  it("kill-switch: RENTAL_DISTRIBUTOR=off disables", () => {
    expect(loadRentalDistributorConfig({ RENTAL_DISTRIBUTOR: "off" }).enabled).toBe(false);
    expect(loadRentalDistributorConfig({}).enabled).toBe(true);
  });

  it("reads both rosters, the managers, and the tunables", () => {
    const cfg = loadRentalDistributorConfig({
      RENTAL_ROTATION_ETM: "Ali:971542445835",
      RENTAL_ROTATION_CARDIWAN: "Abdullah:971569808087",
      MANAGER_WA_ETM: "+971 58 141 7020",
      MANAGER_WA_CARDIWAN: "971581417020",
      RENTAL_MANAGER_ETM: "Ayham",
      RENTAL_ACCEPT_TIMEOUT_MIN: "7",
      RENTAL_BUSY_TTL_MIN: "45",
      RENTAL_AUTOREPLY_TEXT: "Shukran!",
    });
    expect(cfg.rosters.etm.map((a) => a.name)).toEqual(["Ali"]);
    expect(cfg.rosters.cardiwan.map((a) => a.name)).toEqual(["Abdullah"]);
    expect(cfg.managerPhones.etm).toBe("971581417020");
    expect(cfg.managerPhones.cardiwan).toBe("971581417020");
    expect(cfg.managerNames.etm).toBe("Ayham");
    expect(cfg.managerNames.cardiwan).toBe("Ayham"); // default
    expect(cfg.acceptWindowMs).toBe(7 * 60_000);
    expect(cfg.busyTtlMs).toBe(45 * 60_000);
    expect(cfg.autoReplyText).toBe("Shukran!");
  });

  it("notifyLine: RENTAL_NOTIFY_LINE picks ONE sender for internal pings, default null", () => {
    expect(loadRentalDistributorConfig({}).notifyLine).toBeNull();
    expect(loadRentalDistributorConfig({ RENTAL_NOTIFY_LINE: "  " }).notifyLine).toBeNull();
    expect(
      loadRentalDistributorConfig({ RENTAL_NOTIFY_LINE: " takeauto-leasing-dept " }).notifyLine
    ).toBe("takeauto-leasing-dept");
  });

  it("defaults: 10-minute acceptance window, 60-minute busy, Ayham manages both", () => {
    const cfg = loadRentalDistributorConfig({});
    expect(cfg.acceptWindowMs).toBe(10 * 60_000);
    expect(cfg.busyTtlMs).toBe(60 * 60_000);
    expect(cfg.managerNames).toEqual({ etm: "Ayham", cardiwan: "Ayham" });
    expect(cfg.managerPhones).toEqual({ etm: null, cardiwan: null });
    expect(cfg.autoReplyText).toBe(DEFAULT_AUTOREPLY_TEXT);
    expect(cfg.texts).toEqual(DEFAULT_TEXTS);
  });

  it("returning preferences, gap and autoreply: env-driven, sane defaults", () => {
    const cfg = loadRentalDistributorConfig({
      RENTAL_RETURNING_PREFERRED_ETM: " Babek ",
      RENTAL_RETURNING_PREFERRED_CARDIWAN: "Ali,Abdullah",
      RENTAL_RETURNING_GAP_HOURS: "6",
      RENTAL_RETURNING_AUTOREPLY: "on",
    });
    expect(cfg.returningPreferred).toEqual({ etm: ["Babek"], cardiwan: ["Ali", "Abdullah"] });
    expect(cfg.returningGapMs).toBe(6 * 3600_000);
    expect(cfg.returningAutoReplyEnabled).toBe(true);
    // Defaults: no preference, a 12h gap, NO customer greeting on a return.
    const def = loadRentalDistributorConfig({});
    expect(def.returningPreferred).toEqual({ etm: [], cardiwan: [] });
    expect(def.returningGapMs).toBe(12 * 3600_000);
    expect(def.returningAutoReplyEnabled).toBe(false);
    expect(def.texts.agentReturning).toContain("Returning customer");
  });
});

describe("effectiveStatus — busy expires at READ time, no janitor", () => {
  it("no row = available", () => {
    expect(effectiveStatus(null, NOW)).toBe("available");
    expect(effectiveStatus(undefined, NOW)).toBe("available");
  });

  it("busy with a future busyUntil is busy; past it, available", () => {
    const busy: AgentAvailability = { status: "busy", busyUntil: new Date(NOW.getTime() + 10 * 60_000) };
    expect(effectiveStatus(busy, NOW)).toBe("busy");
    const expired: AgentAvailability = { status: "busy", busyUntil: new Date(NOW.getTime() - 1) };
    expect(effectiveStatus(expired, NOW)).toBe("available");
  });

  it("off never expires on its own", () => {
    expect(effectiveStatus({ status: "off", busyUntil: null }, NOW)).toBe("off");
  });
});

describe("effectiveStatus — weekly day off (Dubai day) wins over the toggle", () => {
  // NOW = 2026-09-16T12:00Z = 16:00 Dubai, a Wednesday (dubaiWeekday 3).
  it("agent reads off the whole Dubai day of their dayOff, whatever the toggle", () => {
    expect(dubaiWeekday(NOW)).toBe(3);
    expect(effectiveStatus({ status: "available", busyUntil: null, dayOff: 3 }, NOW)).toBe("off");
    expect(effectiveStatus({ status: "busy", busyUntil: new Date(NOW.getTime() + 60_000), dayOff: 3 }, NOW)).toBe("off");
  });

  it("any other weekday the toggle rules", () => {
    expect(effectiveStatus({ status: "available", busyUntil: null, dayOff: 6 }, NOW)).toBe("available");
    expect(effectiveStatus({ status: "off", busyUntil: null, dayOff: 6 }, NOW)).toBe("off");
  });

  it("the Dubai boundary: Friday 21:00 UTC is already Saturday off in Dubai", () => {
    const fri21utc = new Date("2026-09-18T21:00:00.000Z"); // Sat 01:00 Dubai
    expect(dubaiWeekday(fri21utc)).toBe(6);
    expect(effectiveStatus({ status: "available", busyUntil: null, dayOff: 6 }, fri21utc)).toBe("off");
    expect(effectiveStatus({ status: "available", busyUntil: null, dayOff: 5 }, fri21utc)).toBe("available");
  });

  it("null/undefined dayOff = no schedule enforcement", () => {
    expect(effectiveStatus({ status: "available", busyUntil: null, dayOff: null }, NOW)).toBe("available");
    expect(effectiveStatus({ status: "available", busyUntil: null }, NOW)).toBe("available");
  });

  it("day-off agents are skipped by the round-robin", () => {
    const roster = [agent("Ali"), agent("Babek"), agent("Abdullah")];
    const availability: Record<string, AgentAvailability> = {
      ali: { status: "available", busyUntil: null, dayOff: 3 }, // Wednesday — off today
    };
    expect(nextAvailableAgent(roster, availability, 0, NOW)?.agent.name).toBe("Babek");
  });
});

describe("nextAvailableAgent — the availability-aware round-robin", () => {
  const roster = [agent("Ali"), agent("Babek"), agent("Abdullah")];

  it("rotates in roster order from the cursor, unbounded cursor wraps", () => {
    expect(nextAvailableAgent(roster, {}, 0, NOW)?.agent.name).toBe("Ali");
    expect(nextAvailableAgent(roster, {}, 1, NOW)?.agent.name).toBe("Babek");
    const pick = nextAvailableAgent(roster, {}, 5, NOW);
    expect(pick?.agent.name).toBe("Abdullah"); // 5 mod 3 = 2
    expect(pick?.nextCursor).toBe(3); // unbounded, points PAST the pick (mod on read)
  });

  it("null cursor starts at 0; empty roster yields null", () => {
    expect(nextAvailableAgent(roster, {}, null, NOW)?.agent.name).toBe("Ali");
    expect(nextAvailableAgent([], {}, 0, NOW)).toBeNull();
  });

  it("skips busy and off-duty agents", () => {
    const availability: Record<string, AgentAvailability> = {
      ali: { status: "busy", busyUntil: new Date(NOW.getTime() + 30 * 60_000) },
      babek: { status: "off", busyUntil: null },
    };
    const pick = nextAvailableAgent(roster, availability, 0, NOW);
    expect(pick?.agent.name).toBe("Abdullah");
    expect(pick?.nextCursor).toBe(3); // idx 2 + 1, unbounded — taken mod on read
  });

  it("an EXPIRED busy agent is available again", () => {
    const availability: Record<string, AgentAvailability> = {
      ali: { status: "busy", busyUntil: new Date(NOW.getTime() - 60_000) },
    };
    expect(nextAvailableAgent(roster, availability, 0, NOW)?.agent.name).toBe("Ali");
  });

  it("availability is keyed by the lowercased roster name (the store's agent_key)", () => {
    const availability: Record<string, AgentAvailability> = {
      ali: { status: "off", busyUntil: null },
    };
    expect(nextAvailableAgent(roster, availability, 0, NOW)?.agent.name).toBe("Babek");
  });

  it("ALL busy/off → null (the manager queue fallback)", () => {
    const availability: Record<string, AgentAvailability> = {
      ali: { status: "busy", busyUntil: new Date(NOW.getTime() + 30 * 60_000) },
      babek: { status: "busy", busyUntil: new Date(NOW.getTime() + 30 * 60_000) },
      abdullah: { status: "off", busyUntil: null },
    };
    expect(nextAvailableAgent(roster, availability, 0, NOW)).toBeNull();
  });

  it("excludeNames skips even an available agent (the one who ignored the card)", () => {
    // Roster of one: the ignoring agent excluded → null, not a self-reassignment.
    expect(nextAvailableAgent([agent("Ali")], {}, 0, NOW, new Set(["ali"]))).toBeNull();
    expect(nextAvailableAgent(roster, {}, 0, NOW, new Set(["ali"]))?.agent.name).toBe("Babek");
  });
});

describe("renderText — the configurable message templates", () => {
  it("substitutes known placeholders, leaves unknown ones literal", () => {
    expect(renderText("Lead {lead} → {agent} ({brand}) {bogus}", { lead: "#12", agent: "Ali", brand: "etm" })).toBe(
      "Lead #12 → Ali (etm) {bogus}"
    );
  });

  it("null/undefined values stay literal (never the string 'null')", () => {
    expect(renderText("{agent}", { agent: null })).toBe("{agent}");
  });
});

// ─── Phone overrides + the merged roster view (Ayham, 2026-09-19) ───────────

describe("normalizePhoneOverride", () => {
  it("keeps digits, strips formatting", () => {
    expect(normalizePhoneOverride("+971 54 244 5835")).toBe("971542445835");
    expect(normalizePhoneOverride("971542445835")).toBe("971542445835");
  });

  it("rejects a guess — fewer than 9 digits is null, never a partial number", () => {
    expect(normalizePhoneOverride("12345")).toBeNull();
    expect(normalizePhoneOverride("")).toBeNull();
    expect(normalizePhoneOverride(null)).toBeNull();
    expect(normalizePhoneOverride(undefined)).toBeNull();
  });
});

describe("applyPhoneOverrides — the DB phone wins where the roster SENDS", () => {
  it("overrides by agent_key, leaves the rest on env phones", () => {
    const roster = [agent("Ali", "971542445835"), agent("Babek", "971529965085")];
    const out = applyPhoneOverrides(roster, { ali: "971500000001" });
    expect(out[0]!.phone).toBe("971500000001");
    expect(out[1]!.phone).toBe("971529965085");
    expect(roster[0]!.phone).toBe("971542445835"); // the input is not mutated
  });

  it("override keys are canonical agent_keys (the store writes trimmed+lowercase) — anything else is ignored", () => {
    const roster = [agent("Ali", "971542445835")];
    expect(applyPhoneOverrides(roster, { ali: "971500000001" })[0]!.phone).toBe("971500000001");
    // A non-canonical key ("ALI", " ali ") never occurs from the store and
    // must NOT silently match.
    expect(applyPhoneOverrides(roster, { ALI: "971500000002" })[0]!.phone).toBe("971542445835");
  });
});

describe("mergeRosterAgents — one /availability row per agent", () => {
  const rosters = {
    etm: [agent("Ali", "971542445835"), agent("Babek", "971529965085")],
    cardiwan: [agent("Ali", "971542445835"), agent("Abdullah", "971585809747")],
  };

  it("Ali sits in BOTH rotations and renders ONCE, brands merged", () => {
    const out = mergeRosterAgents(rosters);
    expect(out.map((a) => a.name)).toEqual(["Ali", "Babek", "Abdullah"]);
    expect(out[0]).toMatchObject({ key: "ali", brands: ["etm", "cardiwan"] });
    expect(out[1]!.brands).toEqual(["etm"]);
    expect(out[2]!.brands).toEqual(["cardiwan"]);
  });

  it("phone = DB override when set, else the env roster phone", () => {
    const out = mergeRosterAgents(rosters, { ali: "971500000001" });
    expect(out[0]!.phone).toBe("971500000001"); // override
    expect(out[1]!.phone).toBe("971529965085"); // env
  });

  it("case differences in the roster collapse to one row", () => {
    const out = mergeRosterAgents({ etm: [agent("Ali")], cardiwan: [agent("ali", "971500000009")] });
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe("Ali"); // first spelling wins
  });
});

describe("planReturningPick — preferred first, rotation fallback (Ayham, 2026-09-24)", () => {
  const roster = [agent("Ali"), agent("Babek"), agent("Abdullah")];

  it("the preferred agent is picked even when the rotation cursor points elsewhere", () => {
    const pick = planReturningPick({
      preferred: [agent("Babek")],
      preferredCursor: 0,
      roster,
      rosterCursor: 0,
      availability: {},
      now: NOW,
    });
    expect(pick?.agent.name).toBe("Babek");
    expect(pick?.via).toBe("preferred");
  });

  it("a preferred LIST round-robins on its own cursor", () => {
    const preferred = [agent("Ali"), agent("Abdullah")];
    const first = planReturningPick({ preferred, preferredCursor: 0, roster, rosterCursor: 0, availability: {}, now: NOW });
    expect(first?.agent.name).toBe("Ali");
    expect(first?.nextCursor).toBe(1);
    const second = planReturningPick({
      preferred,
      preferredCursor: first!.nextCursor,
      roster,
      rosterCursor: 0,
      availability: {},
      now: NOW,
    });
    expect(second?.agent.name).toBe("Abdullah");
    expect(second?.nextCursor).toBe(2); // wraps on read, like the rotation cursor
  });

  it("an unavailable preferred agent yields the next AVAILABLE preferred, then the rotation", () => {
    const preferred = [agent("Ali"), agent("Abdullah")];
    // Ali off → Abdullah (still the preferred list, not the rotation).
    const pref = planReturningPick({
      preferred,
      preferredCursor: 0,
      roster,
      rosterCursor: 0,
      availability: { ali: { status: "off", busyUntil: null } },
      now: NOW,
    });
    expect(pref?.agent.name).toBe("Abdullah");
    expect(pref?.via).toBe("preferred");
    // BOTH preferred off → the rotation's first available (Babek).
    const rot = planReturningPick({
      preferred,
      preferredCursor: 0,
      roster,
      rosterCursor: 0,
      availability: {
        ali: { status: "off", busyUntil: null },
        abdullah: { status: "off", busyUntil: null },
      },
      now: NOW,
    });
    expect(rot?.agent.name).toBe("Babek");
    expect(rot?.via).toBe("rotation");
    expect(rot?.nextCursor).toBe(2);
  });

  it("no preferred configured → straight to the rotation; nobody available → null (manager queue)", () => {
    const pick = planReturningPick({ preferred: [], preferredCursor: 0, roster, rosterCursor: 1, availability: {}, now: NOW });
    expect(pick?.agent.name).toBe("Babek");
    expect(pick?.via).toBe("rotation");
    const nobody = planReturningPick({
      preferred: [agent("Ali")],
      preferredCursor: 0,
      roster,
      rosterCursor: 0,
      availability: {
        ali: { status: "off", busyUntil: null },
        babek: { status: "busy", busyUntil: new Date(NOW.getTime() + 30 * 60_000) },
        abdullah: { status: "off", busyUntil: null },
      },
      now: NOW,
    });
    expect(nobody).toBeNull();
  });
});
