/**
 * lead-origin.ts — read WHERE a lead came from out of the message itself.
 *
 * The marketplaces do not call an API of ours. They put the origin in plain
 * text and drop it into a WhatsApp line we already observe, and we have been
 * throwing that text away: measured 2026-08-09, 23 real Dubizzle enquiries
 * were sitting in `message` and 87% never became a customer record at all.
 *
 * Two shapes arrive from Dubizzle, and they are NOT interchangeable:
 *
 *   A. The customer taps "WhatsApp" on our listing. Their own number carries
 *      the message, so this is a lead we can call back today:
 *
 *        Hello! I'm interested in this vehicle advertised by CARDIWAN FOR CAR
 *        RENTAL CO. L.L.C on dubizzle. Link: https://dubizzle.com/s/NwCXZ
 *        Reference key: 5076/9139 A
 *
 *   B. Dubizzle notifies the COMPANY that someone enquired. It names the
 *      inquirer and the listing but never their phone — the only way to answer
 *      is inside Dubizzle's own chat:
 *
 *        Hi CARDIWAN FOR CAR RENTAL CO. L.L.C,
 *        You have received a new inquiry on dubizzle for your listing.
 *        Inquirer Details:
 *        Name: MKcustoms
 *        Listing Link: https://dubizzle.com/s/NwBlH
 *
 * THE TRAP: 166 messages in the same stream contain the word "dubizzle" and
 * are OUR OWN output — the arbitrage enricher posting "🛒 found on Dubizzle".
 * Detection keys on the two shapes above, never on the word, or every one of
 * those becomes a phantom lead.
 *
 * Pure — no DB, no clock, no network — so the judgement is testable and
 * cannot drift into a runner script.
 */

export type LeadOriginChannel = "dubizzle";

export type LeadOrigin = {
  channel: LeadOriginChannel;
  /**
   * "customer" — they wrote to us from their own number; we can call back.
   * "notification" — the marketplace told us about them; the only way to
   * reply is the listing's own chat, so `inboxUrl` IS the reachability.
   */
  kind: "customer" | "notification";
  /** The listing — which car they are asking about, and where to answer. */
  listingUrl: string | null;
  /** The dealer's own stock reference on the ad, when the shape carries one. */
  referenceKey: string | null;
  /** The advertiser name as printed — routes the lead to the right brand. */
  advertiser: string | null;
  /** The inquirer's name, when the marketplace names them. */
  inquirerName: string | null;
  /** One line for the card's Lead Source field. */
  label: string;
};

/** Shape A: the customer's own prefilled message. */
const CUSTOMER_ENQUIRY = /interested in this vehicle advertised by\s+(.+?)\s+on\s+dubizzle/i;
/** Shape B: Dubizzle's notification to the advertiser. */
const INQUIRY_NOTIFICATION = /new inquiry on dubizzle/i;

const LISTING_URL = /https?:\/\/(?:www\.)?dubizzle\.com\/\S+/i;
const REFERENCE_KEY = /reference key:\s*([^\n]+)/i;
const INQUIRER_NAME = /^\s*name:\s*(.+)$/im;
const NOTIFICATION_ADDRESSEE = /^\s*hi\s+(.+?),\s*$/im;

function clean(s: string | null | undefined, max = 200): string | null {
  const t = (s ?? "").trim().replace(/[.,;]+$/, "");
  return t ? t.slice(0, max) : null;
}

export function detectLeadOrigin(body: string | null | undefined): LeadOrigin | null {
  const text = (body ?? "").trim();
  if (!text) return null;

  const listingUrl = clean(text.match(LISTING_URL)?.[0], 300);

  const customer = text.match(CUSTOMER_ENQUIRY);
  if (customer) {
    const advertiser = clean(customer[1]);
    return {
      channel: "dubizzle",
      kind: "customer",
      listingUrl,
      referenceKey: clean(text.match(REFERENCE_KEY)?.[1], 60),
      advertiser,
      inquirerName: null, // their WhatsApp push name is the better source
      label: advertiser ? `Dubizzle · ${advertiser}` : "Dubizzle",
    };
  }

  if (INQUIRY_NOTIFICATION.test(text)) {
    // "Name:" appears only in the Inquirer Details block of this shape.
    const inquirerName = clean(text.match(INQUIRER_NAME)?.[1], 120);
    const advertiser = clean(text.match(NOTIFICATION_ADDRESSEE)?.[1]);
    return {
      channel: "dubizzle",
      kind: "notification",
      listingUrl,
      referenceKey: null,
      advertiser,
      inquirerName,
      label: advertiser ? `Dubizzle inquiry · ${advertiser}` : "Dubizzle inquiry",
    };
  }

  return null;
}

/**
 * Everything the desk needs written down, in the order a human reads it. The
 * notification shape gets an explicit instruction, because "call them back"
 * is impossible advice when no phone was ever sent.
 */
export function leadOriginNotes(origin: LeadOrigin, body: string): string {
  const lines = [
    origin.kind === "customer"
      ? `Dubizzle enquiry — the customer wrote to us`
      : `Dubizzle inquiry — reply inside Dubizzle (no phone was sent)`,
  ];
  if (origin.inquirerName) lines.push(`Inquirer: ${origin.inquirerName}`);
  if (origin.advertiser) lines.push(`Our listing: ${origin.advertiser}`);
  if (origin.listingUrl) lines.push(`Listing: ${origin.listingUrl}`);
  if (origin.referenceKey) lines.push(`Reference key: ${origin.referenceKey}`);
  lines.push("", "What they wrote:", `"${body.trim().slice(0, 500)}"`);
  return lines.join("\n");
}
