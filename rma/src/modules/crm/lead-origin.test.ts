// Every fixture here is a VERBATIM message from the live stream (mycrm.message,
// read 2026-08-10). The point of this file is that four things which all say
// "dubizzle" mean four different things, and only two of them are a lead.
import { describe, expect, it } from "vitest";
import { detectLeadOrigin, leadOriginNotes } from "./lead-origin";

const CUSTOMER_ENQUIRY = `Hello! I'm interested in this vehicle advertised by CARDIWAN FOR CAR RENTAL CO. L.L.C on dubizzle.

Link: https://dubizzle.com/s/NwBlH
Reference key: 5072/6765
Ad ID: d9085ab9dc5e46d78bb041679691b6b7

*Kindly do not edit this message`;

const ETM_ENQUIRY = `Hello! I'm interested in this vehicle advertised by E T M CAR RENTAL CO on dubizzle.

Link: https://dubizzle.com/s/NwCON
Reference key: 4670/8569`;

const INQUIRY_NOTIFICATION = `Hi CARDIWAN FOR CAR RENTAL CO. L.L.C,
You have received a new inquiry on dubizzle for your listing. Kindly contact them.

Inquirer Details:
Name: MKcustoms
Listing Link: https://dubizzle.com/s/NwBlH

Have a good day!`;

/** Our OWN reply to an inquirer — 16 of these in the stream, all outbound. */
const OUR_REPLY = `Hello,
The team at dubizzle has shared your interest in the vehicle listed below:

Listing Reference: _W8a3WgCcjEo
Listing Link: https://dubizzle.com/s/NwBl2

How can I help?`;

/** Our arbitrage bot. 166 messages like this — the reason detection cannot
 *  key on the word "dubizzle". */
const OUR_ARBITRAGE_BOT = `🛒 For Abdul Rehman's request ("toyota prado") — found on Dubizzle:

• Toyota Prado 2014 silver color GCc Calen car — 66,000 AED
  https://sharjah.dubizzle.com/motors/used-cars/toyota/prado/2026/8/9/x`;

describe("detectLeadOrigin", () => {
  it("reads the customer's own prefilled enquiry", () => {
    const o = detectLeadOrigin(CUSTOMER_ENQUIRY);
    expect(o).toMatchObject({
      channel: "dubizzle",
      kind: "customer",
      advertiser: "CARDIWAN FOR CAR RENTAL CO. L.L.C",
      listingUrl: "https://dubizzle.com/s/NwBlH",
      referenceKey: "5072/6765",
    });
    expect(o?.label).toBe("Dubizzle · CARDIWAN FOR CAR RENTAL CO. L.L.C");
  });

  it("names the brand the ad belongs to, so the lead can be routed", () => {
    expect(detectLeadOrigin(ETM_ENQUIRY)?.advertiser).toBe("E T M CAR RENTAL CO");
  });

  it("reads the marketplace's notification, and keeps that it carries no phone", () => {
    const o = detectLeadOrigin(INQUIRY_NOTIFICATION);
    expect(o).toMatchObject({
      kind: "notification",
      inquirerName: "MKcustoms",
      listingUrl: "https://dubizzle.com/s/NwBlH",
      advertiser: "CARDIWAN FOR CAR RENTAL CO. L.L.C",
    });
    // The card must say how to answer — there is no number to call.
    expect(leadOriginNotes(o!, INQUIRY_NOTIFICATION)).toContain("reply inside Dubizzle");
  });

  it("is not fooled by our own outbound reply", () => {
    expect(detectLeadOrigin(OUR_REPLY)).toBeNull();
  });

  it("is not fooled by our own arbitrage bot", () => {
    // 166 of these would become phantom leads on a naive "dubizzle" match.
    expect(detectLeadOrigin(OUR_ARBITRAGE_BOT)).toBeNull();
  });

  it("says nothing about ordinary conversation", () => {
    expect(detectLeadOrigin("hi brother, is the Patrol available tomorrow?")).toBeNull();
    expect(detectLeadOrigin("")).toBeNull();
    expect(detectLeadOrigin(null)).toBeNull();
  });
});
