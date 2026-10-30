import { describe, it, expect } from "vitest";
import { leadFromMessage, qualifiesAsLead, WA_LEAD_SOURCE, WA_B2B_LEAD_SOURCE, waLeadExternalId } from "./lead-from-whatsapp";

/**
 * Bitrix is being switched off for cost. Today 25,361 of 25,387 leads are born
 * in Bitrix and 26 are born here — and the single biggest intake channel (33%)
 * is WhatsApp arriving through Bitrix's own open lines. We already receive the
 * same traffic on our own observers; what is missing is the step that turns a
 * stranger's first message into a lead somebody can work.
 *
 * The rules below are what keeps that from becoming a junk generator.
 */
const msg = (over: Partial<Parameters<typeof leadFromMessage>[0]> = {}) => ({
  id: "m1",
  tenantId: "t1",
  direction: "inbound" as const,
  channel: "whatsapp",
  from: "971501234567@s.whatsapp.net",
  fromPn: null as string | null,
  to: "babek-rent-2",
  customerName: "Ahmed",
  body: "Hi, do you have a Patrol for 3 days?",
  createdAt: new Date("2026-08-07T10:00:00Z"),
  ...over,
});

describe("leadFromMessage", () => {
  it("makes a lead from a stranger's first message", () => {
    const lead = leadFromMessage(msg());
    expect(lead).not.toBeNull();
    expect(lead!.phone).toBe("971501234567");
    expect(lead!.customerName).toBe("Ahmed");
    expect(lead!.source).toBe(WA_LEAD_SOURCE);
    expect(lead!.notes).toContain("Patrol");
  });

  it("refuses outbound — our own reply is not a lead", () => {
    expect(leadFromMessage(msg({ direction: "outbound" }))).toBeNull();
  });

  it("refuses group chats", () => {
    // @g.us is a group. Rent desks live in supplier groups all day; every one
    // of those would become a fake customer.
    expect(leadFromMessage(msg({ from: "12345-6789@g.us" }))).toBeNull();
  });

  it("refuses broadcasts and status posts", () => {
    expect(leadFromMessage(msg({ from: "status@broadcast" }))).toBeNull();
  });

  it("refuses a message with no usable phone", () => {
    // Half of WhatsApp traffic arrives as @lid with no phone behind it. Such a
    // lead could never be deduped, called back, or matched to a customer — a
    // record nobody can act on is worse than no record.
    expect(leadFromMessage(msg({ from: "160288615739622@lid", fromPn: null }))).toBeNull();
  });

  it("uses from_pn when the JID hides the number", () => {
    const lead = leadFromMessage(msg({ from: "160288615739622@lid", fromPn: "971509998877" }));
    expect(lead).not.toBeNull();
    expect(lead!.phone).toBe("971509998877");
  });

  it("refuses a message from one of our own lines", () => {
    // Staff lines message each other; that is coordination, not demand.
    const lead = leadFromMessage(msg({ from: "971529965085@s.whatsapp.net" }), {
      ownNumbers: new Set(["971529965085"]),
    });
    expect(lead).toBeNull();
  });

  it("refuses an empty or media-only message", () => {
    // "[image]" alone tells a salesperson nothing and is usually a forward.
    expect(leadFromMessage(msg({ body: "" }))).toBeNull();
    expect(leadFromMessage(msg({ body: "[image]" }))).toBeNull();
  });

  it("falls back to the phone when WhatsApp gives no name", () => {
    const lead = leadFromMessage(msg({ customerName: null }));
    expect(lead!.customerName).toContain("971501234567");
  });

  it("keys the lead by phone so the same person never doubles", () => {
    // Two messages, two JID spellings, one human.
    const a = leadFromMessage(msg({ from: "971501234567@s.whatsapp.net" }));
    const b = leadFromMessage(msg({ from: "00971501234567@s.whatsapp.net", id: "m2" }));
    expect(a!.externalId).toBe(b!.externalId);
  });

  it("refuses another shop's auto-reply", () => {
    // We message a supplier, their bot answers. That is our own outbound
    // coming back, not somebody asking to rent a car.
    expect(leadFromMessage(msg({
      customerName: "Super Cars",
      body: "Thank you for contacting Super Cars! Please let us know how we can help.",
    }))).toBeNull();
  });

  it("refuses a competitor fleet broadcast", () => {
    expect(leadFromMessage(msg({
      body: "MERCEDES\nG63 2026\nS500 2024\nE200 2025\nPATROL 2025",
    }))).toBeNull();
  });

  it("KEEPS a rental company that is actually asking, but tags it B2B", () => {
    // Sub-rental between shops is real revenue — memory of this business says
    // treat B2B as a channel, not as junk. Labelled so the desk can filter,
    // never silently dropped.
    const lead = leadFromMessage(msg({
      customerName: "Gmz Car Rental",
      body: "Do you have M8 available for 2 months?",
    }));
    expect(lead).not.toBeNull();
    expect(lead!.source).toBe(WA_B2B_LEAD_SOURCE);
  });

  it("stamps an external id the Twenty mirror can carry", () => {
    // The mirror pages leads by external_id and skips NULLs entirely, so a
    // lead without one is invisible in Twenty — the desk would never see it.
    const lead = leadFromMessage(msg());
    expect(lead!.externalId).toBe(waLeadExternalId("971501234567"));
    expect(lead!.externalId).toMatch(/^wa:/);
    expect(lead!.externalSource).toBe(WA_LEAD_SOURCE);
  });
});

describe("qualifiesAsLead — the bar for putting a card on the board", () => {
  it("admits a reachable number that asked for something", () => {
    expect(qualifiesAsLead("971501234567", { car: "Nissan Sunny" })).toBe(true);
    expect(qualifiesAsLead("971501234567", { intent: "rent" })).toBe(true);
    expect(qualifiesAsLead("971501234567", { termMonths: 3 })).toBe(true);
    expect(qualifiesAsLead("971501234567", { priceAed: 2500 })).toBe(true);
  });

  it("refuses a greeting: reachable, but wants nothing we can name", () => {
    expect(qualifiesAsLead("971501234567", {})).toBe(false);
    expect(qualifiesAsLead("971501234567", { car: "   ", intent: "", termMonths: 0, priceAed: 0 })).toBe(false);
  });

  it("refuses an unreachable sender however clear the ask", () => {
    // @lid traffic with no phone behind it: nobody can call this back.
    expect(qualifiesAsLead("1234", { car: "G63", priceAed: 9000 })).toBe(false);
    expect(qualifiesAsLead("", { intent: "buy" })).toBe(false);
  });
});

describe("qualifiesAsLead — marketplace enquiries", () => {
  it("admits a Dubizzle enquiry with no phone: the listing IS the reach", () => {
    // Dubizzle's notification names the inquirer and the listing but never a
    // number; the answer goes back through the listing's own chat. Refusing
    // these for want of a phone throws away the leads we pay to advertise for.
    expect(qualifiesAsLead("", { marketplaceListingUrl: "https://dubizzle.com/s/NwBlH" })).toBe(true);
  });

  it("still refuses a bare greeting from a real number", () => {
    expect(qualifiesAsLead("971501234567", { marketplaceListingUrl: null })).toBe(false);
  });
});
