/**
 * listing-match.ts — is this marketplace listing actually the car that was asked for?
 *
 * The Dubizzle enricher (scripts/run-dubizzle-enrich.ts) answers a customer's
 * "I'm looking for X" with purchasable cars, so the manager sees the client and
 * the buyable car in one thread. The search itself is a loose keyword query
 * with a price cap, and the enricher printed the top three results without ever
 * checking they were X. On 2026-08-06 a request for "Mercedes-Benz G63 2025"
 * came back as a 2022 Nissan and a 2020 Land Rover, and the sales team archived
 * the whole feed. Not because the topic was wrong — because the answers were.
 *
 * For a proactive assistant, a wrong answer costs far more than no answer: it
 * teaches the reader to ignore the channel, and then the good ones go unread
 * too. So this filter is deliberately strict and stays silent when unsure.
 */

export type Listing = { title: string; price: number; year: string; km: string; url: string };

/** Lowercase, digits and letters only — "G 63 AMG" and "G63" must compare equal. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Words that describe the transaction, not the car. */
const NOISE = new Set([
  "car", "cars", "vehicle", "auto", "motors", "rent", "rental", "lease", "leasing",
  "buy", "sale", "sell", "used", "new", "model", "edition", "any", "need", "want",
  "looking", "for", "the", "and", "with", "please", "aed", "year", "month", "monthly",
]);

/**
 * The parts of a request specific enough to identify a car.
 *
 * A four-digit year is excluded on purpose: it narrows a search but does not
 * name a car, and letting it count made "2025" match a 2025 Nissan for a G63
 * request. Tokens containing a digit (G63, M8, X5, 918) count from two
 * characters, since those ARE the model; pure words need four, so "gmc" style
 * noise and short prepositions cannot carry a match on their own.
 */
export function distinctiveTokens(request: string): string[] {
  return request
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((t) => !NOISE.has(t))
    .filter((t) => !/^(19|20)\d{2}$/.test(t))          // a year is a filter, not a car
    .filter((t) => (/\d/.test(t) ? t.length >= 2 : t.length >= 4));
}

/**
 * Keep only listings whose title contains at least one distinctive token of the
 * request. Input order is preserved, so a cheapest-first search stays
 * cheapest-first.
 *
 * Returns [] when the request has no distinctive token at all ("a car", "suv"):
 * with nothing to check against, every cheap listing would qualify, which is
 * the noise this exists to remove.
 */
export function relevantListings(request: string, listings: Listing[]): Listing[] {
  const tokens = distinctiveTokens(request);
  if (tokens.length === 0) return [];
  return listings.filter((l) => {
    const title = norm(l.title);
    return tokens.some((t) => title.includes(norm(t)));
  });
}
