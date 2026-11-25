// ─── Deterministic inbound-message routing ─────────────────────────────────
//
// Given an inbound message + sender, decide WHO should own it. The owner's
// vision: routing driven by conversation logic, not manual pushing. Three
// deterministic signals, in strict precedence:
//
//   (a) name_match   — the customer names a manager in the body ("Hi Azat").
//                      An EXACT, SINGLE match to a sales member → APPLY (write).
//                      Two+ names, or a name nobody on the team has → PROPOSE.
//   (b) open_thread  — this customer already has an owner (an open thread /
//                      prior deal). Continuity beats everything downstream →
//                      APPLY (write): the re-thread returns to its owner.
//   (c) brand_default— the car brand maps to a business line (e.g. exotic →
//                      lux desk, everyday → rent). No hard owner, just a line,
//                      so this only ever PROPOSES a shortlist — never auto-writes.
//
// Everything here except `resolveOwnerLine` (thin DB helper) is PURE and
// dependency-free so the decision is unit-testable against real message text.
// The DB-backed orchestration + audit_event write lives in routing-apply.ts.

export type RoutingRule = "name_match" | "open_thread" | "brand_default" | "none";
// apply  = safe to write deal.owner_id automatically (audit-logged)
// propose = surface a suggestion only; a human confirms
export type RoutingAction = "apply" | "propose";

export type BusinessLine = "rent" | "lease" | "lux";

export interface RoutingMember {
  userId: string;
  /** Display name, e.g. "Azat Yagdyyev". */
  name: string;
  roles: string[];
  /** Which desk this member works, when known. Drives brand_default. */
  line?: BusinessLine | null;
}

export interface RoutingContext {
  body: string;
  /** The active sales pool (first names derived from `name`). */
  members: RoutingMember[];
  /** Owner of this customer's existing open thread/deal, if any. */
  existingOwner?: { userId: string; name: string } | null;
}

export interface RoutingDecision {
  rule: RoutingRule;
  action: RoutingAction;
  ownerId: string | null;
  ownerName: string | null;
  /** For brand_default (and ambiguous name_match): the shortlist proposed. */
  candidates: { userId: string; name: string }[];
  /** Detected car brand, when any (for display + audit). */
  brand: string | null;
  reason: string;
  confidence: number;
}

// ─── Brand → line dictionary ───────────────────────────────────────────────
// Deliberately small and explicit. Exotic/supercar brands go to the lux desk;
// everyday brands to the rent desk. Unknown brands yield a null line (the
// engine then proposes the general sales pool). Extend as the fleet grows.
const BRAND_LINE: { brand: string; line: BusinessLine; aliases: string[] }[] = [
  { brand: "Lamborghini", line: "lux", aliases: ["lamborghini", "aventador", "huracan", "urus", "ламборг", "авентадор"] },
  { brand: "Ferrari", line: "lux", aliases: ["ferrari", "феррари"] },
  { brand: "Rolls-Royce", line: "lux", aliases: ["rolls royce", "rolls-royce", "cullinan", "роллс"] },
  { brand: "Bentley", line: "lux", aliases: ["bentley", "bentayga", "бентли"] },
  { brand: "McLaren", line: "lux", aliases: ["mclaren", "макларен"] },
  { brand: "Toyota", line: "rent", aliases: ["toyota", "fj cruiser", "fj-cruiser", "land cruiser", "prado", "corolla", "camry", "тойота", "прадо"] },
  { brand: "Nissan", line: "rent", aliases: ["nissan", "patrol", "patrol", "xterra", "ниссан", "патрол"] },
  { brand: "BYD", line: "rent", aliases: ["byd", "song plus", "atto", "бид"] },
  { brand: "Kia", line: "rent", aliases: ["kia", "kia k5", "sportage", "киа"] },
  { brand: "Hyundai", line: "rent", aliases: ["hyundai", "elantra", "sonata", "хендай", "хёндай"] },
  { brand: "Mercedes", line: "lease", aliases: ["mercedes", "mercedes-benz", "g-class", "gle", "мерседес"] },
  { brand: "BMW", line: "lease", aliases: ["bmw", "бмв", "x5", "x6"] },
];

/** Detect the first car brand named in the text. Pure, case-insensitive. */
export function detectBrand(body: string): { brand: string; line: BusinessLine } | null {
  const t = ` ${body.toLowerCase()} `;
  for (const b of BRAND_LINE) {
    if (b.aliases.some((a) => t.includes(a))) return { brand: b.brand, line: b.line };
  }
  return null;
}

/** First name (lower-cased) from a display name — the token we match in a body. */
function firstName(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? "").toLowerCase();
}

// Word-boundary match that also works for Cyrillic (\b is ASCII-only in JS
// RegExp, so we build an explicit non-letter boundary on both sides).
function mentions(body: string, needle: string): boolean {
  if (needle.length < 3) return false; // too short → too many false positives
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^\\p{L}])${esc}([^\\p{L}]|$)`, "iu");
  return re.test(body);
}

/**
 * The core decision. Pure: same inputs → same output, no I/O. `apply` decisions
 * are safe to auto-write; `propose` decisions must be confirmed by a human.
 */
export function routeMessage(ctx: RoutingContext): RoutingDecision {
  const body = ctx.body ?? "";
  const brandHit = detectBrand(body);
  const brand = brandHit?.brand ?? null;
  const base = { candidates: [] as { userId: string; name: string }[], brand };

  // (a) NAME MATCH — highest precedence: the customer asked for someone.
  const named = ctx.members.filter((m) => mentions(body, firstName(m.name)));
  if (named.length === 1) {
    const m = named[0];
    return {
      ...base,
      rule: "name_match",
      action: "apply",
      ownerId: m.userId,
      ownerName: m.name,
      reason: `Customer named manager «${firstName(m.name)}» in the message — the only exact match on the sales team.`,
      confidence: 0.95,
    };
  }
  if (named.length > 1) {
    return {
      ...base,
      rule: "name_match",
      action: "propose",
      ownerId: null,
      ownerName: null,
      candidates: named.map((m) => ({ userId: m.userId, name: m.name })),
      reason: `Several managers named (${named.map((m) => firstName(m.name)).join(", ")}) — needs human confirmation.`,
      confidence: 0.5,
    };
  }

  // (b) OPEN THREAD — continuity: this customer already belongs to someone.
  if (ctx.existingOwner) {
    return {
      ...base,
      rule: "open_thread",
      action: "apply",
      ownerId: ctx.existingOwner.userId,
      ownerName: ctx.existingOwner.name,
      reason: `Customer already has an open chat/deal with ${ctx.existingOwner.name} — a repeat inquiry goes back to the owner.`,
      confidence: 0.9,
    };
  }

  // (c) BRAND DEFAULT — a line, not a person → propose a shortlist only.
  if (brandHit) {
    const lineMembers = ctx.members.filter((m) => m.line === brandHit.line);
    const shortlist = (lineMembers.length ? lineMembers : ctx.members).map((m) => ({
      userId: m.userId,
      name: m.name,
    }));
    const lineLabel = brandHit.line === "lux" ? "the lux line" : brandHit.line === "lease" ? "the lease line" : "the rent line";
    return {
      ...base,
      rule: "brand_default",
      action: "propose",
      ownerId: null,
      ownerName: null,
      candidates: shortlist,
      reason: `Brand «${brandHit.brand}» belongs to ${lineLabel}${
        lineMembers.length ? "" : " (no assigned manager — shared pool suggested)"
      }. Not auto-assigned — suggestion only.`,
      confidence: lineMembers.length ? 0.6 : 0.4,
    };
  }

  // Nothing fired — leave it for the coordinator inbox.
  return {
    ...base,
    rule: "none",
    action: "propose",
    ownerId: null,
    ownerName: null,
    reason: "No routing signals (name, open chat, brand) — sent to the coordinator's «For distribution» queue.",
    confidence: 0.2,
  };
}
