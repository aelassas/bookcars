import { describe, expect, it } from "vitest";
import { bitrixDealContactId, mapBitrixDealToDeal, mapBitrixLeadToLead } from "./mappings";
import type { BitrixCrmRecord } from "./mappings";

// These mappers are spread straight into the UPDATE payload in sync.ts, so any
// key they emit overwrites that column on every sync pass — every 60 seconds
// for anything touched in Bitrix recently, and unconditionally on the nightly
// reconcile.
//
// That makes "which keys are absent" a correctness property, not a style
// detail. `mapBitrixDealToDeal` used to return a hardcoded `notes: null`, which
// erased every note a salesperson typed on a deal while importing nothing in
// return — Bitrix deal COMMENTS is not even read here. The tests below pin the
// distinction that caused it: a field Bitrix genuinely owns may be written,
// a field it has nothing to say about must be left alone.

const deal: BitrixCrmRecord = {
  ID: 4211,
  TITLE: "Rental — Kia K5",
  CATEGORY_ID: "2",
  STAGE_ID: "C2:NEW",
  DATE_MODIFY: "2026-07-25T10:00:00+04:00",
  COMMENTS: "something a human wrote in Bitrix",
};

describe("mapBitrixDealToDeal", () => {
  it("never emits `notes` — the platform owns deal notes", () => {
    // Absent, not null: `notes: null` would wipe the column, and even Bitrix's
    // own COMMENTS must not win here, because DealEditor is the only writer.
    expect("notes" in mapBitrixDealToDeal(deal)).toBe(false);
  });

  it("emits only the fields Bitrix is authoritative for", () => {
    // `createdAt` joined the set 2026-07-29: Bitrix owns the intake date
    // (DATE_CREATE is immutable, so writing it every pass is idempotent and
    // backfills the true date onto rows imported before the mapping).
    expect(Object.keys(mapBitrixDealToDeal(deal)).sort()).toEqual(
      ["createdAt", "externalId", "ref", "sourceModifiedAt", "stage", "status", "type"].sort(),
    );
  });

  it("still carries the identity and stage Bitrix does own", () => {
    const mapped = mapBitrixDealToDeal(deal);
    expect(mapped.externalId).toBe("4211");
    expect(mapped.ref).toBe("Rental — Kia K5");
    expect(mapped.sourceModifiedAt).toBeInstanceOf(Date);
  });

  it("leaves sourceModifiedAt null when Bitrix gives no timestamp", () => {
    expect(mapBitrixDealToDeal({ ...deal, DATE_MODIFY: undefined }).sourceModifiedAt).toBeNull();
  });
});

describe("mapBitrixLeadToLead", () => {
  const lead: BitrixCrmRecord = {
    ID: 991,
    NAME: "Ahmed",
    LAST_NAME: "Al Rashid",
    STATUS_ID: "NEW",
    COMMENTS: "asked about a Kia",
  };

  it("does map notes, because Bitrix genuinely owns lead COMMENTS", () => {
    // The mirror image of the deal case, and the reason this is not a blanket
    // "never sync notes" rule: here the field is read from Bitrix, there is no
    // lead editor writing it locally, so mirroring loses nothing.
    expect(mapBitrixLeadToLead(lead).notes).toBe("asked about a Kia");
  });

  it("falls back to the record title when there is no personal name", () => {
    expect(
      mapBitrixLeadToLead({ ID: 1, TITLE: "Website enquiry" }).customerName,
    ).toBe("Website enquiry");
  });

  it("never yields an empty customer name", () => {
    expect(mapBitrixLeadToLead({ ID: 1 }).customerName).toBe("Unknown");
  });

  // status is spread into the UPDATE, so an unmapped code must be NULL (→ omitted
  // by sync.ts), never a blind "new". Returning "new" for foreign-portal UC_*
  // codes reset cardiwan/easyrent's every lead to "new" every 60s and skewed the
  // status='new' load metric that routes leads to Azat/Firuz.
  it("maps known take-auto status codes", () => {
    expect(mapBitrixLeadToLead({ ID: 1, STATUS_ID: "WON" }).status).toBe("qualified");
    expect(mapBitrixLeadToLead({ ID: 1, STATUS_ID: "LOSE" }).status).toBe("lost");
    expect(mapBitrixLeadToLead({ ID: 1, STATUS_ID: "NEW" }).status).toBe("new");
  });

  it("returns null status for an unmapped (foreign-portal) code — never a blind 'new'", () => {
    expect(mapBitrixLeadToLead({ ID: 1, STATUS_ID: "UC_CARDIWAN_XYZ" }).status).toBeNull();
    expect(mapBitrixLeadToLead({ ID: 1 }).status).toBeNull();
  });
});

describe("bitrixDealContactId", () => {
  // The deal → customer link (0067). Bitrix deals on the rental portals name
  // a CONTACT, not a lead — without this id the platform deal stays phoneless
  // and the AI resolver's evidence gate skips every one of them.

  it("reads CONTACT_ID as a string, number or numeric string alike", () => {
    expect(bitrixDealContactId({ ID: 1, CONTACT_ID: 777 })).toBe("777");
    expect(bitrixDealContactId({ ID: 1, CONTACT_ID: "888" })).toBe("888");
  });

  it("falls back to the first CONTACT_IDS entry when CONTACT_ID is absent", () => {
    expect(bitrixDealContactId({ ID: 1, CONTACT_IDS: [555, 556] })).toBe("555");
    expect(bitrixDealContactId({ ID: 1, CONTACT_IDS: ["901"] })).toBe("901");
  });

  it("treats Bitrix's empty placeholders ('0', '') as no contact", () => {
    expect(bitrixDealContactId({ ID: 1, CONTACT_ID: "0" })).toBeNull();
    expect(bitrixDealContactId({ ID: 1, CONTACT_ID: "0", CONTACT_IDS: [555] })).toBe("555");
    expect(bitrixDealContactId({ ID: 1, CONTACT_IDS: ["0", ""] })).toBeNull();
  });

  it("is null when the deal names no contact at all", () => {
    expect(bitrixDealContactId({ ID: 1 })).toBeNull();
    expect(bitrixDealContactId({ ID: 1, CONTACT_ID: null })).toBeNull();
    expect(bitrixDealContactId({ ID: 1, CONTACT_IDS: [] })).toBeNull();
  });
});
