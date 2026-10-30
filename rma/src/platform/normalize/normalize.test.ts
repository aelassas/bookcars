import { describe, expect, it } from "vitest";

import { normalizePhone, splitE164 } from "./phone";
import { normalizeName, normalizeOwnerName, detectScript } from "./name";
import { buildDedupeKey, findDuplicates, mergeRecords, type DedupeRecord } from "./dedupe";
import {
  normalizeBitrixContact,
  normalizeBitrixLead,
  normalizeBitrixDeal,
  toDedupeInput,
  isRoleAddress,
} from "./record";
import type { BitrixCrmRecord } from "../integrations/bitrix24/mappings";

// These tests are the CONTRACT of the migration: every row below is a format
// or failure mode that already occurred in the three Bitrix portals. If a rule
// here changes, the business owner must sign off — the summary table in the
// migration report is generated from these cases.

// ─── phone ──────────────────────────────────────────────────────────────────

describe("normalizePhone — UAE formats", () => {
  // All of these are THE SAME subscriber, as seen across the portals.
  const cases: Array<[raw: string, e164: string]> = [
    ["+971 50 123 4567", "+971501234567"],
    ["+971501234567", "+971501234567"],
    ["971501234567", "+971501234567"],
    ["00971501234567", "+971501234567"],
    ["0971501234567", "+971501234567"],
    ["0501234567", "+971501234567"],
    ["050 123 4567", "+971501234567"],
    ["050-123-4567", "+971501234567"],
    ["501234567", "+971501234567"],
    ["9710501234567", "+971501234567"], // trunk zero glued after country code
  ];

  it.each(cases)("%s → %s", (raw, e164) => {
    const r = normalizePhone(raw);
    expect(r.valid).toBe(true);
    expect(r.e164).toBe(e164);
    expect(r.reason).toBeNull();
  });

  it.each(cases)("every format of %s shares the same tail9", (raw) => {
    // The tail9 is the dedupe key and the SAME key the messaging layer uses
    // to link WhatsApp chats — all formats must collapse to it.
    expect(normalizePhone(raw).tail9).toBe("501234567");
  });

  it("normalizes a UAE landline (8 national digits)", () => {
    expect(normalizePhone("+971 4 123 4567").e164).toBe("+97141234567");
    expect(normalizePhone("04 123 4567").e164).toBe("+97141234567");
  });
});

describe("normalizePhone — other Gulf countries", () => {
  const cases: Array<[raw: string, e164: string]> = [
    ["+966 50 123 4567", "+966501234567"], // Saudi Arabia
    ["966501234567", "+966501234567"],
    ["00966501234567", "+966501234567"],
    ["+968 9123 4567", "+96891234567"], // Oman
    ["+965 5123 4567", "+96551234567"], // Kuwait
  ];

  it.each(cases)("%s → %s", (raw, e164) => {
    const r = normalizePhone(raw);
    expect(r.valid).toBe(true);
    expect(r.e164).toBe(e164);
  });
});

describe("normalizePhone — invalid inputs carry a reason, never throw", () => {
  const cases: Array<[raw: string | null | undefined, reason: string]> = [
    [null, "empty"],
    [undefined, "empty"],
    ["", "empty"],
    ["   ", "empty"],
    ["1234567", "too_short"], // < 8 digits
    ["9715012345678901234", "too_long"], // > 15 digits (two numbers glued)
    ["120363144795618235@g.us", "group_jid"], // WhatsApp GROUP, not a person
    ["184729384710293@lid", "opaque_lid"], // opaque device id, not a number
    ["+971 50 123", "bad_national"], // known cc, national part too short
    ["123456789", "unrecognized_format"], // 9 digits but not a UAE number shape
  ];

  it.each(cases)("%s → invalid (%s)", (raw, reason) => {
    const r = normalizePhone(raw);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe(reason);
    expect(r.e164).toBeNull();
    expect(r.tail9).toBeNull();
  });

  it("keeps a non-Gulf number only when the caller wrote an explicit +", () => {
    expect(normalizePhone("+44 20 7946 0958").e164).toBe("+442079460958");
    expect(normalizePhone("+7 916 123 4567").valid).toBe(true);
  });
});

// ─── name ───────────────────────────────────────────────────────────────────

describe("normalizeName — scripts and case", () => {
  const cases: Array<[
    raw: string,
    display: string,
    script: "latin" | "cyrillic" | "arabic" | "mixed",
  ]> = [
    // Latin gets Title Case; whitespace collapses.
    ["  ahmed   al rashid ", "Ahmed Al Rashid", "latin"],
    ["JOHN SMITH", "John Smith", "latin"],
    ["o'brien-smith", "O'Brien-Smith", "latin"],
    // Cyrillic: case is NEVER touched (particles, transliteration capitals).
    ["ИВАН петров", "ИВАН петров", "cyrillic"],
    ["Бабек Садыгов", "Бабек Садыгов", "cyrillic"],
    // Arabic: no case exists; leave verbatim.
    ["محمد بن راشد", "محمد بن راشد", "arabic"],
    // Mixed scripts: leave case alone, just collapse whitespace.
    ["Ivan  Петров", "Ivan Петров", "mixed"],
  ];

  it.each(cases)("%s → %s (%s)", (raw, display, script) => {
    const r = normalizeName(raw);
    expect(r.empty).toBe(false);
    expect(r.display).toBe(display);
    expect(r.script).toBe(script);
    expect(r.sortKey).toBe(display.toLowerCase());
  });
});

describe("normalizeName — junk stays empty, NEVER becomes 'Unknown'", () => {
  const junk: Array<string | null | undefined> = [
    null,
    undefined,
    "",
    "   ",
    "—",
    "-",
    ".",
    "test",
    "TEST",
    "Test Test",
    "test  test",
    "n/a",
    "N/A",
    "unknown",
    "Unknown",
    "971501234567", // a phone typed into the name field — no letters, not a name
  ];

  it.each(junk)("%j → empty", (raw) => {
    const r = normalizeName(raw);
    expect(r.empty).toBe(true);
    expect(r.display).toBeNull();
    expect(r.sortKey).toBe("");
    expect(r.script).toBe("none");
  });

  it("detectScript is exposed for callers that need the raw classification", () => {
    expect(detectScript("Ahmed")).toBe("latin");
    expect(detectScript("!!!")).toBe("none");
  });
});

describe("normalizeOwnerName — reuses canonicalName from monitor/people", () => {
  it("collapses known owner variants to the canonical person", () => {
    expect(normalizeOwnerName("Бабек Садыгов").display).toBe("Babek");
    expect(normalizeOwnerName("babek").display).toBe("Babek");
    expect(normalizeOwnerName("Azat Yagdyyev").display).toBe("Azat");
  });

  it("maps the CallGear catch-all to empty (= unassigned), not a person", () => {
    expect(normalizeOwnerName("Test Test").empty).toBe(true);
  });
});

// ─── dedupe ─────────────────────────────────────────────────────────────────

describe("buildDedupeKey — priority phone → email → name+brandLine", () => {
  it("prefers the phone tail9 over everything", () => {
    const key = buildDedupeKey({
      externalId: "1",
      phones: ["+971 50 123 4567"],
      emails: ["a@x.com"],
      name: "ahmed",
      brandLine: "takeauto",
    });
    expect(key).toEqual({ kind: "phone", value: "501234567" });
  });

  it("falls back to the lowercased email", () => {
    const key = buildDedupeKey({ externalId: "1", emails: ["  A@X.com "] });
    expect(key).toEqual({ kind: "email", value: "a@x.com" });
  });

  it("falls back to name+brandLine (brand scopes the name)", () => {
    const key = buildDedupeKey({ externalId: "1", name: "ahmed", brandLine: "Cardiwan" });
    expect(key).toEqual({ kind: "name", value: "ahmed|cardiwan" });
  });

  it("returns null when there is no usable identity at all", () => {
    expect(buildDedupeKey({ externalId: "1" })).toBeNull();
    expect(buildDedupeKey({ externalId: "1", phones: ["123"] })).toBeNull();
  });
});

describe("findDuplicates", () => {
  it("matches the same number across raw formats (tail9)", () => {
    const groups = findDuplicates([
      { externalId: "a", phones: ["+971501234567"] },
      { externalId: "b", phones: ["0501234567"] },
      { externalId: "c", phones: ["+971509998887"] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].records.map((r) => r.externalId).sort()).toEqual(["a", "b"]);
  });

  it("merges transitively: A=phone→B, B=email→C ⇒ one group", () => {
    // Duplicates are transitive; key-grouping would split this chain and the
    // migration would import C as a separate person.
    const groups = findDuplicates([
      { externalId: "a", phones: ["+971501234567"] },
      { externalId: "b", phones: ["0501234567"], emails: ["x@y.com"] },
      { externalId: "c", emails: ["X@y.com"] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].records).toHaveLength(3);
  });

  it("does NOT merge the same name across different brands", () => {
    const groups = findDuplicates([
      { externalId: "a", name: "ahmed", brandLine: "takeauto" },
      { externalId: "b", name: "ahmed", brandLine: "cardiwan" },
    ]);
    expect(groups).toHaveLength(0);
  });

  it("merges the same name within one brand", () => {
    const groups = findDuplicates([
      { externalId: "a", name: "ahmed", brandLine: "takeauto" },
      { externalId: "b", name: "  Ahmed ", brandLine: "takeauto" },
    ]);
    expect(groups).toHaveLength(1);
  });

  it("ignores records with no keys", () => {
    expect(findDuplicates([{ externalId: "a" }, { externalId: "b" }])).toHaveLength(0);
  });
});

describe("mergeRecords", () => {
  it("non-empty beats empty; fresher beats stale on conflict", () => {
    const stale: DedupeRecord = {
      externalId: "old",
      name: "ahmed",
      brandLine: "takeauto",
      updatedAt: "2026-01-01T00:00:00Z",
      customFields: { UF_CAR: "Kia" },
    };
    const fresh: DedupeRecord = {
      externalId: "new",
      name: "Ahmed Al Rashid",
      brandLine: "takeauto",
      updatedAt: "2026-07-01T00:00:00Z",
      customFields: { UF_CAR: "", UF_VIP: true },
    };
    const m = mergeRecords(stale, fresh);
    expect(m.name).toBe("Ahmed Al Rashid"); // both set → fresher wins
    expect(m.brandLine).toBe("takeauto");
    expect(m.customFields).toEqual({ UF_CAR: "Kia", UF_VIP: true }); // empty never wins
    expect(m.updatedAt).toBe("2026-07-01T00:00:00Z");
  });

  it("keeps EVERY phone and email — the tail is never thrown away", () => {
    const m = mergeRecords(
      { externalId: "a", phones: ["+971501234567", "+971507771112"], emails: ["a@x.com"] },
      { externalId: "b", phones: ["0501234567", "+971553334444"], emails: ["A@x.com", "b@y.com"] },
    );
    // "0501234567" is the same number as "+971501234567" (tail9) → collapsed;
    // the rest are preserved in order. E-mail dedupe is case-insensitive.
    expect(m.phones).toEqual(["+971501234567", "+971507771112", "+971553334444"]);
    expect(m.emails).toEqual(["a@x.com", "b@y.com"]);
  });

  it("accumulates every externalId for re-run traceability", () => {
    const m = mergeRecords(
      { externalId: "111", externalIds: ["111", "222"] } as DedupeRecord,
      { externalId: "222" },
    );
    expect(m.externalIds).toEqual(["111", "222"]);
    expect(m.externalId).toBe("111");
  });
});

// ─── record ─────────────────────────────────────────────────────────────────

const baseContact: BitrixCrmRecord = {
  ID: 123,
  NAME: "ahmed",
  LAST_NAME: "al rashid",
  SOURCE_ID: "WEBFORM",
  DATE_MODIFY: "2026-07-20T10:00:00+04:00",
  DATE_CREATE: "2026-01-05T09:00:00+04:00",
  PHONE: [{ VALUE: "+971 50 123 4567" }, { VALUE: "050 999 8887" }, { VALUE: "junk" }],
  EMAIL: [{ VALUE: "Ahmed@X.com" }, { VALUE: "ahmed@x.com" }, { VALUE: "second@y.com" }],
  UF_CRM_CAR: "Kia K5",
  UF_CRM_EMPTY: "",
};

describe("normalizeBitrixContact", () => {
  it("keeps ALL phones and emails — primary + additional, nothing dropped", () => {
    const r = normalizeBitrixContact(baseContact);
    expect(r).not.toBeNull();
    expect(r!.person.phones.primaryPhoneNumber).toBe("+971501234567");
    expect(r!.person.phones.additionalPhones).toEqual(["+971509998887"]);
    // The invalid entry is not lost — it stays visible with its verdict.
    expect(r!.allPhones).toHaveLength(3);
    expect(r!.allPhones[2].valid).toBe(false);
    expect(r!.person.emails.primaryEmail).toBe("Ahmed@X.com");
    expect(r!.person.emails.additionalEmails).toEqual(["second@y.com"]); // case-dup collapsed
    expect(r!.allEmails).toHaveLength(2);
  });

  it("maps name, source, dates and UF_* custom fields", () => {
    const r = normalizeBitrixContact(baseContact)!;
    expect(r.person.name).toEqual({ firstName: "Ahmed", lastName: "Al Rashid" });
    expect(r.nameInfo.script).toBe("latin");
    expect(r.source).toBe("website");
    expect(r.sourceModifiedAt).toBeInstanceOf(Date);
    expect(r.createdAt).toBeInstanceOf(Date);
    expect(r.customFields).toEqual({ UF_CRM_CAR: "Kia K5" }); // empty UF skipped
  });

  it("refuses DELETED='Y' rows — the recycle bin is not migrated", () => {
    expect(normalizeBitrixContact({ ...baseContact, DELETED: "Y" })).toBeNull();
    expect(normalizeBitrixLead({ ...baseContact, DELETED: "Y" })).toBeNull();
    expect(normalizeBitrixDeal({ ...baseContact, DELETED: "Y" })).toBeNull();
  });

  it("applies the cutoff on last activity; dateless rows are kept", () => {
    const cutoff = "2026-06-01T00:00:00Z";
    expect(normalizeBitrixContact(baseContact, { cutoff })).not.toBeNull();
    const stale = { ...baseContact, DATE_MODIFY: "2020-01-01T00:00:00Z", DATE_CREATE: "2019-01-01T00:00:00Z" };
    expect(normalizeBitrixContact(stale, { cutoff })).toBeNull();
    const dateless = { ...baseContact, DATE_MODIFY: undefined, DATE_CREATE: undefined };
    expect(normalizeBitrixContact(dateless, { cutoff })).not.toBeNull();
  });

  it("empty/junk names stay empty — never 'Unknown'", () => {
    const r = normalizeBitrixContact({ ID: 1, NAME: "—", LAST_NAME: "" })!;
    expect(r.nameInfo.empty).toBe(true);
    expect(r.person.name).toEqual({ firstName: null, lastName: null });
  });

  it("handles empty multi-fields without crashing", () => {
    const r = normalizeBitrixContact({ ID: 2, NAME: "Sara", PHONE: [], EMAIL: [] })!;
    expect(r.person.phones).toEqual({ primaryPhoneNumber: null, additionalPhones: [] });
    expect(r.person.emails).toEqual({ primaryEmail: null, additionalEmails: [] });
  });
});

describe("normalizeBitrixLead", () => {
  it("falls back to TITLE when there is no personal name (a real label, not a placeholder)", () => {
    const r = normalizeBitrixLead({ ID: 7, TITLE: "Website enquiry — Kia K5" })!;
    expect(r.nameInfo.display).toBe("Website Enquiry — Kia K5");
    expect(r.person.name.firstName).toBe("Website Enquiry — Kia K5");
  });

  it("keeps the raw STATUS_ID — funnel codes differ per portal", () => {
    const r = normalizeBitrixLead({ ID: 8, NAME: "Sara", STATUS_ID: "UC_CARDIWAN_XYZ" })!;
    expect(r.statusId).toBe("UC_CARDIWAN_XYZ");
  });
});

describe("normalizeBitrixDeal", () => {
  it("returns the opportunity form with raw stage/category", () => {
    const r = normalizeBitrixDeal({
      ID: 42,
      TITLE: "Rental — Kia K5",
      STAGE_ID: "C6:UC_FLL5Y2",
      CATEGORY_ID: "6",
      DATE_MODIFY: "2026-07-25T10:00:00+04:00",
    })!;
    expect(r.kind).toBe("deal");
    expect(r.name).toBe("Rental — Kia K5");
    expect(r.stageId).toBe("C6:UC_FLL5Y2");
    expect(r.categoryId).toBe("6");
  });
});

describe("toDedupeInput — bridge to the dedupe layer", () => {
  it("exposes only valid phones, the name sortKey and the freshness stamp", () => {
    const rec = normalizeBitrixContact(baseContact, { brandLine: "takeauto" })!;
    const d = toDedupeInput(rec);
    expect(d.externalId).toBe("123");
    expect(d.phones).toEqual(["+971501234567", "+971509998887"]); // "junk" excluded
    expect(d.name).toBe("ahmed al rashid");
    expect(d.brandLine).toBe("takeauto");
    expect(d.updatedAt).toEqual(rec.sourceModifiedAt);
  });

  it("feeds findDuplicates end-to-end: two portals, one person", () => {
    const portalA = normalizeBitrixContact(
      { ...baseContact, ID: 1, NAME: "ahmed", LAST_NAME: "al rashid" },
      { brandLine: "takeauto" },
    )!;
    const portalB = normalizeBitrixContact(
      { ...baseContact, ID: 2, NAME: "AHMED", LAST_NAME: "AL RASHID", PHONE: [{ VALUE: "0501234567" }] },
      { brandLine: "cardiwan" },
    )!;
    const groups = findDuplicates([toDedupeInput(portalA), toDedupeInput(portalB)]);
    expect(groups).toHaveLength(1); // matched by phone tail9 despite brand/name differences
  });
});

describe("splitE164 — country code handed to Twenty separately", () => {
  it("splits a UAE mobile into +971 / national / AE", () => {
    expect(splitE164("+971501234567")).toEqual({
      callingCode: "+971",
      nationalNumber: "501234567",
      regionCode: "AE",
    });
  });

  it("splits the Egyptian mobile that Twenty rejected on the first import", () => {
    // Live failure, 2026-08-01: "Provided phone number is invalid
    // 201060622228" — sent as a bare 12-digit national number.
    expect(splitE164("+201060622228")).toEqual({
      callingCode: "+20",
      nationalNumber: "1060622228",
      regionCode: "EG",
    });
  });

  it("prefers the LONGEST matching calling code", () => {
    // "971" and "97…" style prefixes must not shadow each other.
    expect(splitE164("+97455512345")?.callingCode).toBe("+974");
    expect(splitE164("+880171234567")?.callingCode).toBe("+880");
  });

  it("separates countries that SHARE a calling code, by national prefix", () => {
    // +7 spans Russia and Kazakhstan. The old hand-rolled table could only
    // shrug and return null here; libphonenumber tells them apart properly.
    expect(splitE164("+79161234567")?.regionCode).toBe("RU");
    expect(splitE164("+77012345678")?.regionCode).toBe("KZ");
  });

  it("splits the countries the hand-rolled table used to drop", () => {
    // All real numbers from the take-auto book that Twenty rejected on the
    // 2026-08-02 run because we could not split them (793 in total).
    expect(splitE164("+905534862145")).toEqual({
      callingCode: "+90",
      nationalNumber: "5534862145",
      regionCode: "TR",
    });
    expect(splitE164("+380671234567")?.regionCode).toBe("UA");
    expect(splitE164("+996555123456")?.regionCode).toBe("KG");
  });

  it("returns null for unknown codes and junk — the caller must not guess", () => {
    expect(splitE164("+9991234567")).toBeNull(); // no such calling code in our tables
    expect(splitE164(null)).toBeNull();
    expect(splitE164("+971abc")).toBeNull();
  });
});

describe("isRoleAddress — a robot's address is not a client's", () => {
  it("refuses the addresses the rental portals are full of", () => {
    // noreply@oneclickdrive.com sits on 41 EasyRent leads and
    // mailer-daemon@… on 31. Twenty holds a UNIQUE index on the primary
    // email, so writing them costs every record after the first.
    for (const e of [
      "noreply@oneclickdrive.com",
      "no-reply@x.com",
      "donotreply@newsletter.rockstargames.com",
      "mailer-daemon@sm9.hosting.reg.ru",
      "postmaster@x.ae",
      "support@dealer.ae",
      "info@rentacar.ae",
    ]) {
      expect(isRoleAddress(e)).toBe(true);
    }
  });

  it("keeps real people, including lookalikes", () => {
    for (const e of [
      "emmanuelandar45@gmail.com",
      "nomaanrentacar@gmail.com", // a person at a rental firm, not a role
      "infosys.raj@gmail.com", // starts with "info" but is not "info@"
      "supportive.ali@x.ae",
      null,
      undefined,
    ]) {
      expect(isRoleAddress(e)).toBe(false);
    }
  });
});
