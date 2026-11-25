import { describe, expect, it } from "vitest";
import {
  allowlistPermits,
  ceoDigestKey,
  digestKey,
  dubaiDateKey,
  dubaiDayStartUtc,
  dubaiHour,
  hotDealKey,
  hotLeadKey,
  isQuietHours,
  perContactKey,
  maxPerUserPerDay,
  notifyEnabled,
  parseAllowlist,
  underRateCap,
  waitKey,
} from "./policy";

// Dubai = UTC+4, no DST. All fixtures are UTC instants.
const at = (iso: string) => new Date(iso);

describe("Dubai clock", () => {
  it("shifts UTC to Dubai wall time", () => {
    expect(dubaiHour(at("2026-07-22T05:00:00Z"))).toBe(9); // 09:00 Dubai
    expect(dubaiHour(at("2026-07-22T17:00:00Z"))).toBe(21); // 21:00 Dubai
    expect(dubaiHour(at("2026-07-22T20:30:00Z"))).toBe(0); // 00:30 Dubai next day
  });

  it("date key rolls over at Dubai midnight, not UTC midnight", () => {
    expect(dubaiDateKey(at("2026-07-22T19:59:00Z"))).toBe("2026-07-22"); // 23:59 Dubai
    expect(dubaiDateKey(at("2026-07-22T20:00:00Z"))).toBe("2026-07-23"); // 00:00 Dubai
  });

  it("day start is 20:00 UTC of the previous day", () => {
    expect(dubaiDayStartUtc(at("2026-07-22T12:00:00Z")).toISOString()).toBe(
      "2026-07-21T20:00:00.000Z",
    );
  });
});

describe("quiet hours 21:00–08:59 Dubai", () => {
  it("blocks the evening and the night", () => {
    expect(isQuietHours(at("2026-07-22T17:00:00Z"))).toBe(true); // 21:00 Dubai
    expect(isQuietHours(at("2026-07-22T23:00:00Z"))).toBe(true); // 03:00 Dubai
    expect(isQuietHours(at("2026-07-22T04:59:00Z"))).toBe(true); // 08:59 Dubai
  });

  it("allows the working day, including 09:00 sharp (digest hour)", () => {
    expect(isQuietHours(at("2026-07-22T05:00:00Z"))).toBe(false); // 09:00 Dubai
    expect(isQuietHours(at("2026-07-22T10:00:00Z"))).toBe(false); // 14:00 Dubai
    expect(isQuietHours(at("2026-07-22T16:59:00Z"))).toBe(false); // 20:59 Dubai
  });
});

describe("dedupe keys", () => {
  it("wait key changes per card and per Dubai day", () => {
    const d1 = at("2026-07-22T10:00:00Z");
    expect(waitKey("c1", d1)).toBe("wait:c1:2026-07-22");
    // Same UTC day, different Dubai day → different key.
    expect(waitKey("c1", at("2026-07-22T20:01:00Z"))).toBe("wait:c1:2026-07-23");
    expect(waitKey("c2", d1)).not.toBe(waitKey("c1", d1));
  });

  it("hot keys are once-ever per entity and don't collide across entity types", () => {
    expect(hotDealKey("x")).toBe("hot:deal:x");
    expect(hotLeadKey("x")).toBe("hot:lead:x");
    expect(hotDealKey("x")).not.toBe(hotLeadKey("x"));
  });

  it("digest keys are per recipient per Dubai day", () => {
    const d = at("2026-07-22T05:00:00Z");
    expect(digestKey("u1", d)).toBe("digest:u1:2026-07-22");
    expect(ceoDigestKey(d)).toBe("ceo:2026-07-22");
  });

  describe("per-contact key (Firuz: «зачем два раза?»)", () => {
    const d = at("2026-07-22T10:00:00Z"); // 14:00 Dubai

    it("collapses different rules for the same manager+client into one key", () => {
      // hot_inbound and a hunter both firing on the same client → same key,
      // so the second dedupes out. THIS is the fix.
      const fromHotInbound = perContactKey("firuz", "971509082870", d);
      const fromHunter = perContactKey("firuz", "509082870", d);
      expect(fromHotInbound).toBe(fromHunter);
      expect(fromHotInbound).toBe("pc:firuz:509082870:2026-07-22");
    });

    it("normalises @lid / @s.whatsapp.net contacts to the last 9 digits", () => {
      expect(perContactKey("azat", "971509082870@s.whatsapp.net", d)).toBe(
        perContactKey("azat", "241828871509082870@lid", d),
      );
    });

    it("still lets the same client reach two DIFFERENT managers", () => {
      expect(perContactKey("azat", "509082870", d)).not.toBe(
        perContactKey("firuz", "509082870", d),
      );
    });

    it("rolls over per Dubai day, not UTC day", () => {
      expect(perContactKey("firuz", "509082870", at("2026-07-22T20:01:00Z"))).toBe(
        "pc:firuz:509082870:2026-07-23",
      );
    });
  });
});

describe("feature gates", () => {
  it("master switch is off unless exactly 'true'", () => {
    expect(notifyEnabled({})).toBe(false);
    expect(notifyEnabled({ NOTIFY_ENABLED: "1" })).toBe(false);
    expect(notifyEnabled({ NOTIFY_ENABLED: "true" })).toBe(true);
  });

  it("allowlist: unset or '*' permits everyone", () => {
    expect(allowlistPermits(parseAllowlist(undefined), { userId: "u1" })).toBe(true);
    expect(allowlistPermits(parseAllowlist("*"), { ownerKey: "azat" })).toBe(true);
  });

  it("allowlist matches user ids and owner keys, case-insensitively", () => {
    const list = parseAllowlist("Azat, 11111111-2222-3333-4444-555555555555");
    expect(allowlistPermits(list, { ownerKey: "azat" })).toBe(true);
    expect(allowlistPermits(list, { userId: "11111111-2222-3333-4444-555555555555" })).toBe(true);
    expect(allowlistPermits(list, { ownerKey: "babek" })).toBe(false);
    expect(allowlistPermits(list, {})).toBe(false);
    // Either identifier matching is enough (pilot lists name people, not both forms).
    expect(allowlistPermits(list, { userId: "other", ownerKey: "AZAT" })).toBe(true);
  });

  it("rate cap defaults to 10/day and rejects nonsense values", () => {
    expect(maxPerUserPerDay({})).toBe(10);
    expect(maxPerUserPerDay({ NOTIFY_MAX_PER_USER_PER_DAY: "3" })).toBe(3);
    expect(maxPerUserPerDay({ NOTIFY_MAX_PER_USER_PER_DAY: "0" })).toBe(10);
    expect(maxPerUserPerDay({ NOTIFY_MAX_PER_USER_PER_DAY: "abc" })).toBe(10);
    expect(underRateCap(9, {})).toBe(true);
    expect(underRateCap(10, {})).toBe(false);
  });
});

// WA fallback resolution (go-live 2026-07-24) — env-driven, no DB.
import { resolveWaPhone } from "./registry";
describe("resolveWaPhone", () => {
  it("resolves digits from NOTIFY_WA_PHONE_<KEY>", () => {
    expect(resolveWaPhone({ ownerKey: "azat" }, { NOTIFY_WA_PHONE_AZAT: "+971 50 123 4567" }))
      .toBe("971501234567");
  });
  it("null when unset or too short", () => {
    expect(resolveWaPhone({ ownerKey: "azat" }, {})).toBeNull();
    expect(resolveWaPhone({ ownerKey: "azat" }, { NOTIFY_WA_PHONE_AZAT: "12345" })).toBeNull();
  });
  it("normalizes dashed keys", () => {
    expect(resolveWaPhone({ ownerKey: "leasing-manager" }, { NOTIFY_WA_PHONE_LEASING_MANAGER: "971567235539" }))
      .toBe("971567235539");
  });
});
