// outbox.ts — the distributor's wa_outbox enqueue side (pure part).
//
// Pins the contract bridge.js drains against: brand_line is the MAIN LINE slug
// (only that line's observer may send the row), to_jid is the recipient's
// digits + @s.whatsapp.net, board_item_id is a deterministic UUID minted from
// the dedupe key so the pending-unique index collapses re-queues.
import { describe, expect, it } from "vitest";
import { buildDistributorOutboxRow, dedupeUuid } from "./outbox";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("dedupeUuid — a deterministic, well-formed UUID per dedupe key", () => {
  it("is stable and UUID-shaped (the column is uuid NOT NULL)", () => {
    const a = dedupeUuid("autoreply:etm-website:501234567");
    expect(a).toMatch(UUID_RE);
    expect(a).toBe(dedupeUuid("autoreply:etm-website:501234567"));
    expect(a).not.toBe(dedupeUuid("assign:opp-1"));
  });
});

describe("buildDistributorOutboxRow — the guards, enforced at enqueue", () => {
  const base = {
    tenantId: "tenant-1",
    line: "etm-website",
    toDigits: "+971 50 123 4567",
    text: "Thank you! An agent will contact you shortly.",
    dedupeKey: "autoreply:etm-website:501234567",
  };

  it("builds a pending row on the MAIN LINE, to the customer's JID", () => {
    const row = buildDistributorOutboxRow(base)!;
    expect(row.brandLine).toBe("etm-website"); // only this line's bridge drains it
    expect(row.toJid).toBe("971501234567@s.whatsapp.net");
    expect(row.body).toBe(base.text);
    expect(row.approvedBy).toBe("rental-distributor");
    expect(row.boardItemId).toMatch(UUID_RE);
    expect(row.boardItemId).toBe(dedupeUuid(base.dedupeKey));
    expect(row.media).toBeUndefined(); // text-only: no attachment fields
  });

  it("refuses a recipient without 9+ digits — never send to a guess", () => {
    expect(buildDistributorOutboxRow({ ...base, toDigits: "12345" })).toBeNull();
    expect(buildDistributorOutboxRow({ ...base, toDigits: "" })).toBeNull();
  });

  it("refuses an empty body — a blank WhatsApp is worse than none", () => {
    expect(buildDistributorOutboxRow({ ...base, text: "   " })).toBeNull();
  });
});
