// Outbound `to` resolution helpers (phone.ts) — the fix for the 35,039 agent
// replies dropped as noPerson because `to` held the brand slug and `from`
// held a @lid privacy JID (owner report 2026-08-22).
import { describe, expect, it } from "vitest";
import {
  isLidJid,
  phoneFromPhoneJid,
  planOutboundToFix,
  resolveOutboundCustomerPhone,
} from "./phone";

const IDENTITY = new Map([["184486545334403@lid", "971543900294"]]);

describe("phoneFromPhoneJid", () => {
  it("extracts digits from a plain phone JID", () => {
    expect(phoneFromPhoneJid("971501234567@s.whatsapp.net")).toBe("971501234567");
    expect(phoneFromPhoneJid(" 971501234567@s.whatsapp.net ")).toBe("971501234567");
  });

  it("refuses a @lid — a lid is NOT a phone", () => {
    expect(phoneFromPhoneJid("184486545334403@lid")).toBeNull();
  });

  it("refuses brand slugs, group JIDs, junk and null", () => {
    expect(phoneFromPhoneJid("cardiwan")).toBeNull();
    expect(phoneFromPhoneJid("120363xxx@g.us")).toBeNull();
    expect(phoneFromPhoneJid("1234@s.whatsapp.net")).toBeNull(); // too short to be a phone
    expect(phoneFromPhoneJid(null)).toBeNull();
    expect(phoneFromPhoneJid(undefined)).toBeNull();
  });
});

describe("isLidJid", () => {
  it("spots the privacy JID shape", () => {
    expect(isLidJid("184486545334403@lid")).toBe(true);
    expect(isLidJid("971501234567@s.whatsapp.net")).toBe(false);
    expect(isLidJid(null)).toBe(false);
  });
});

describe("resolveOutboundCustomerPhone (the importer's outbound `to` rule)", () => {
  it("phone JID → the digits, no lookup needed", () => {
    expect(resolveOutboundCustomerPhone("971501234567@s.whatsapp.net", new Map())).toBe("971501234567");
  });

  it("resolvable @lid → the wa_identity phone", () => {
    expect(resolveOutboundCustomerPhone("184486545334403@lid", IDENTITY)).toBe("971543900294");
  });

  it("unresolvable @lid → null (caller keeps the brand slug and counts it)", () => {
    expect(resolveOutboundCustomerPhone("999999999999999@lid", IDENTITY)).toBeNull();
  });

  it("non-JID from → null", () => {
    expect(resolveOutboundCustomerPhone("cardiwan", IDENTITY)).toBeNull();
    expect(resolveOutboundCustomerPhone(null, IDENTITY)).toBeNull();
  });
});

describe("planOutboundToFix (the backfill's selection rule)", () => {
  it("plans the update for a brand-slug row with a phone JID", () => {
    expect(
      planOutboundToFix({ from: "971501234567@s.whatsapp.net", to: "cardiwan" }, new Map())
    ).toBe("971501234567");
  });

  it("plans the update for a resolvable lid", () => {
    expect(planOutboundToFix({ from: "184486545334403@lid", to: "babek-rent" }, IDENTITY)).toBe(
      "971543900294"
    );
  });

  it("plans nothing for an unresolvable lid", () => {
    expect(planOutboundToFix({ from: "999999999999999@lid", to: "cardiwan" }, IDENTITY)).toBeNull();
  });

  it("plans nothing when the row is already correct (idempotent re-run)", () => {
    expect(
      planOutboundToFix({ from: "971501234567@s.whatsapp.net", to: "971501234567" }, new Map())
    ).toBeNull();
    expect(planOutboundToFix({ from: "184486545334403@lid", to: "971543900294" }, IDENTITY)).toBeNull();
  });
});
