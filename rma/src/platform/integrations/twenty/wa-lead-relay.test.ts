// buildThreadNote — the note IDENTITY the lead relay writes under.
//
// Two regressions this file pins:
//
// 1. The title used to be `WhatsApp direct · …501234567 · 3 msg · 26 Aug 2026
//    · 14:09` — a message count and a wall-clock stamp INSIDE the dedupe key,
//    so every pass minted a brand-new note (owner, 2026-08-26: "one continuous
//    note not hundreds").
// 2. The relay then kept its OWN "WhatsApp direct · …" note next to the
//    day-note pipe's "WhatsApp · +<digits>" note — two notes per card, each
//    holding the same messages in different line formats (owner, 2026-08-27,
//    Ayham's #539 photo). A plain direct WhatsApp thread now writes under the
//    day-note identity (title AND `HH:MM ← text` lines), so the line-level
//    dedupe merges both producers into ONE note. Since 2026-08-29 (Ayham,
//    card #593) MARKETPLACE-origin direct threads fold in too — their
//    "Dubizzle · <advertiser> · …<tail>" note was a third writer of the same
//    conversation. Groups and Telegram keep the relay's own title — the
//    day-note pipe does not cover those streams.
import { describe, expect, it } from "vitest";
import type { LeadOrigin } from "../../../modules/crm/lead-origin";
import {
  buildThreadNote,
  buildThreads,
  checkpointAdvance,
  qualifyThreadBySignals,
  returningCustomerQualifies,
  shouldSweep,
  passSince,
  threadStartedAt,
  customerLinesOnly,
  idDocumentSent,
  judgeThreadWithEscalation,
  parseLeadVerdict,
  verdictQualifies,
  rowLimitFor,
  blockedBroadcastSender,
  waLeadOpportunityExternalId,
  metaKeyParts,
  metaLeadOpportunityExternalId,
  threadKeyFor,
  nextGirlOwnerId,
  planOwnerAttachPing,
  pruneAttachPings,
  buildAttachPingText,
  planLeadProjection,
  returningAssignGate,
  runWaLeadRelayPass,
  type LeadPlanInput,
  type LeadRelayRow,
  type LeadThread,
  type RentalAssignment,
  type RentalDeskRouting,
  type SalesDeskRouting,
  type WaLeadRelayDeps,
  type WaLeadRelaySource,
} from "./wa-lead-relay";
import { DEFAULT_TEXTS } from "../../../modules/rental/rotation";
import type { TwentyClient } from "./client";
import type { RelayTwenty } from "../callgear/twenty-relay";

function thread(over: Partial<LeadThread> = {}): LeadThread {
  return {
    key: "501234567",
    digits: "971501234567",
    channel: "whatsapp",
    participantName: "Ahmed",
    sourceContext: null,
    contextChannel: null,
    lineSlug: "babek-rent",
    lines: [{ body: "Need a Camry tomorrow", at: new Date("2026-08-26T10:00:00.000Z") }],
    lastActivityAt: new Date("2026-08-26T10:00:00.000Z"),
    ...over,
  };
}

describe("buildThreadNote — direct WhatsApp folds into the ONE day note", () => {
  it("uses the day-note title: WhatsApp · +<digits>, no count, no stamp", () => {
    const { title } = buildThreadNote(thread(), null);
    expect(title).toBe("WhatsApp · +971501234567");
    expect(title).not.toMatch(/msg/); // no message count
    expect(title).not.toMatch(/\d{2}:\d{2}/); // no clock
    expect(title).not.toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/); // no date
  });

  it("writes day-note-format lines (day header + HH:MM ← C: text) so dedupe merges producers", () => {
    const { lines, digits } = buildThreadNote(thread(), null);
    expect(digits).toBe("971501234567");
    expect(lines[0]).toBe("**— 2026-08-26 —**");
    // Owner 2026-08-30: the side, not the name — C: client, A: us.
    expect(lines[1]).toMatch(/^\d{2}:\d{2} ← C: Need a Camry tomorrow$/);
  });

  it("the SAME thread keeps its title as lines accumulate", () => {
    const one = buildThreadNote(thread(), null);
    const grown = buildThreadNote(
      thread({
        lines: [
          { body: "Need a Camry tomorrow", at: new Date("2026-08-26T10:00:00.000Z") },
          { body: "Actually make it a Corolla", at: new Date("2026-08-27T08:30:00.000Z") },
        ],
        lastActivityAt: new Date("2026-08-27T08:30:00.000Z"),
      }),
      null
    );
    // Same note, more lines — this is what lets ensureContinuousNote append
    // instead of creating. A day change inserts a fresh day header.
    expect(grown.title).toBe(one.title);
    expect(grown.lines).toHaveLength(4); // header, line, header, line
    expect(grown.lines[1]).toBe(one.lines[1]);
  });

  it("different participants get different notes", () => {
    const a = buildThreadNote(thread(), null);
    const b = buildThreadNote(thread({ key: "529876543", digits: "971529876543" }), null);
    expect(a.title).not.toBe(b.title);
  });

  it("a MARKETPLACE-origin direct thread folds in too (2026-08-29, card #593)", () => {
    // The relay used to give Dubizzle/Meta enquiries their own
    // "Dubizzle · <advertiser> · …<tail>" note — a third writer of the same
    // conversation next to the day note and the QC transcript. The origin
    // still shows on the card (callSource); the NOTE is the one day note.
    const origin: LeadOrigin = {
      channel: "dubizzle",
      kind: "customer",
      listingUrl: "https://dubizzle.com/s/NwCOQ",
      referenceKey: "3743/8572",
      advertiser: "E T M CAR RENTAL CO",
      inquirerName: null,
      label: "Dubizzle · E T M CAR RENTAL CO",
    };
    const { title, lines, digits } = buildThreadNote(thread(), origin);
    expect(title).toBe("WhatsApp · +971501234567");
    expect(digits).toBe("971501234567");
    expect(lines[0]).toBe("**— 2026-08-26 —**");
    expect(lines[1]).toMatch(/^\d{2}:\d{2} ← /);
  });
});

describe("buildThreadNote — streams the day note does not cover keep the relay title", () => {
  it("telegram threads", () => {
    const { title } = buildThreadNote(thread({ channel: "telegram" }), null);
    expect(title).toBe("Telegram · …501234567");
    expect(title).not.toMatch(/msg/);
    expect(title).not.toMatch(/\d{2}:\d{2}/);
  });

  it("whatsapp GROUP threads (sourceContext set)", () => {
    const { title } = buildThreadNote(
      thread({ sourceContext: "120363@g.us", contextChannel: "whatsapp" }),
      null
    );
    expect(title).toMatch(/^WhatsApp group: .+ · …501234567$/);
  });
});

// ── Checkpoint advance: a truncated pass must NOT move past what it dropped ──
//
// Owner, 2026-08-30: "no batches, they shall come the moment they arrived —
// why keep them not posted". A pass reads at most `rowLimit` rows and keeps at
// most `batch` threads. Overflow was dropped SILENTLY while the checkpoint
// still advanced to the pass start, so those customers had no card until they
// happened to message again — the observed 3-to-6 hour "lead appears late",
// and for one Dubizzle enquiry a 4h26m gap with no reply at all.
//
// Model failures already held the checkpoint (audit 2026-08-14). Truncation is
// the same class of loss and now holds it too.
describe("checkpointAdvance — never step over an undecided thread", () => {
  const passStart = new Date("2026-08-30T09:00:00.000Z");
  const held = new Date("2026-08-30T08:55:00.000Z");

  it("advances on a clean, complete pass", () => {
    expect(checkpointAdvance(passStart, { failed: 0, truncated: false })).toEqual(passStart);
  });

  it("holds when a thread failed (existing rule)", () => {
    expect(checkpointAdvance(passStart, { failed: 1, truncated: false })).toBeNull();
  });

  it("holds when the batch cap dropped threads", () => {
    expect(checkpointAdvance(passStart, { failed: 0, truncated: true })).toBeNull();
  });

  it("holds when both happened", () => {
    expect(checkpointAdvance(passStart, { failed: 2, truncated: true })).toBeNull();
  });

  it("holding means the NEXT pass re-reads from the old checkpoint", () => {
    const next = checkpointAdvance(passStart, { failed: 0, truncated: true }) ?? held;
    expect(next).toEqual(held);
  });
});

// Media in a relay-written line. The relay used to push the RAW body into the
// note ("[voice/audio] [voice] Sir, when do you need this car"), while the
// day-note pipe wrote the compact clickable form for the very same message —
// two lines, same message, and the raw one had no Listen link at all. Ayham,
// 2026-08-31: "some audio messages are not showing transcription or the option
// to listen… and again same messages down showing the description… it is being
// duplicated".
//
// Both producers must emit the SAME line, so the note's link-based dedupe sees
// one message. That means the relay has to render through the media renderer,
// with the file link, exactly like push-message.ts does.
describe("buildThreadNote — media renders compact, never raw", () => {
  const AT = new Date("2026-08-26T19:23:00.000Z");

  function mediaThread(body: string, mediaPath: string | null): LeadThread {
    return thread({
      lines: [{ body, at: AT, direction: "outbound", mediaPath }],
      lastActivityAt: AT,
    });
  }

  it("a voice note with a file becomes one clickable line", () => {
    const { lines } = buildThreadNote(mediaThread("[voice/audio] [voice] Sir, when do you need this car", "wa/babek-rent/x.ogg"), null);
    const media = lines.filter((l) => !l.startsWith("**—"));
    expect(media).toHaveLength(1);
    expect(media[0]).toContain("🎙 Voice · [🔗 Listen](");
    expect(media[0]).not.toContain("[voice/audio]");
    expect(media[0]).not.toContain("Sir, when do you need this car");
  });

  it("a photo with a file becomes one clickable line, no description", () => {
    const { lines } = buildThreadNote(mediaThread("[image] BMW 8 Series convertible, white, plate 29114", "wa/babek-rent/y.jpg"), null);
    const media = lines.filter((l) => !l.startsWith("**—"));
    expect(media[0]).toContain("📷 Photo · [🔗 View](");
    expect(media[0]).not.toContain("BMW 8 Series");
  });

  it("without a file it stays honest rather than inventing a link", () => {
    const { lines } = buildThreadNote(mediaThread("[voice/audio] [voice] hello", null), null);
    const media = lines.filter((l) => !l.startsWith("**—"));
    expect(media[0]).not.toContain("🔗 Listen");
  });

  it("plain text is untouched", () => {
    const { lines } = buildThreadNote(mediaThread("Need a Camry tomorrow", null), null);
    const media = lines.filter((l) => !l.startsWith("**—"));
    expect(media[0]).toMatch(/^\d{2}:\d{2} → A: Need a Camry tomorrow$/);
  });
});

// Why a real customer never became a lead (Ayham, 2026-08-31: "Abdullah leads
// not in the system still").
//
// A customer on Abdullah's line wrote across 35 minutes: asked whether the car
// was free, said where he lives, asked the weekly price, agreed, then sent his
// Emirates ID and driving licence. No card was ever created.
//
// The qualifier was not wrong — it never saw the conversation. The relay reads
// rows since its checkpoint, so it judged FRAGMENTS: the log shows this thread
// evaluated four times, with 1, 6, 1 and 1 lines. Intent that builds over half
// an hour is never present in a single two-minute window.
describe("qualifyThreadBySignals — a fragment is not a conversation", () => {
  const AT = new Date("2026-08-31T09:11:00.000Z");

  function withLines(bodies: string[]): LeadThread {
    return thread({
      key: "545505888",
      digits: "971545505888",
      lineSlug: "cardiwan",
      lines: bodies.map((body, i) => ({ body, at: new Date(AT.getTime() + i * 60_000) })),
      lastActivityAt: AT,
    });
  }

  // The real messages, in the order they arrived, 13:11 -> 13:49.
  const CONVERSATION = [
    "إنزين أخوي متوفره حاليا",              // is it available now?
    "انا ساكن في دبي الورقاء",               // I live in Dubai, Al Warqa
    "كم إيجارها لمدة أسبوع من اليوم",        // how much to rent it for a week from today?
    "وشو المطلوب",                          // and what do you need from me?
    "أخوي أتصل عليك ماترد",                  // I am calling you, you do not answer
    "تمام أخوي توكلنا على الله",             // fine brother, let us go ahead
    "[image] This is an Emirates ID document. Key text: Card Number 137225352",
    "[image] UAE driving licence; key text: This license should be with you",
    "تمام على خير إن شاء الله",
  ];

  it("the whole conversation IS a lead", () => {
    const r = qualifyThreadBySignals(withLines(CONVERSATION));
    expect(r.qualified).toBe(true);
    expect(r.signals.intent).toBe("rent");
    expect(r.signals.language).toBe("ar");
  });

  it("but the window the relay actually saw is not", () => {
    // One line on its own — the shape the log recorded three times.
    expect(qualifyThreadBySignals(withLines(["وشو المطلوب"])).qualified).toBe(false);
  });

  it("the burst of documents that followed now qualifies ON ITS OWN (rule changed 2026-09-04)", () => {
    // Written 2026-08-31 as "docs alone are a fragment, not a conversation" —
    // a debugging note from the window-judgement era, not a business rule.
    // Lead 155 (2026-09-03) proved the opposite: a B2B partner forwarding his
    // customer's Emirates ID + licence IS the deal closing; that thread was
    // filed NOISE twelve passes in a row and saved only by Ali's manual entry.
    // The asymmetry decides it: a false positive costs one glance at a card;
    // a false negative costs a rental.
    const docs = qualifyThreadBySignals(
      withLines([
        "[image] This is an Emirates ID document. Key text: Card Number 137225352",
        "[image] UAE driving licence; key text: This license should be with you",
      ])
    );
    expect(docs.qualified).toBe(true);
  });
});

// A customer who comes back must become a NEW lead, not vanish into the closed
// one. Ayham asked for this on 25.08 ("returning lead… with the history"), and
// on 31.08 four of twelve customers on Abdullah's line were writing straight
// into cards already stamped COMPLETED, UNSUCCESSFUL_DEAL or NOT_A_LEAD.
//
// The relay already decides "a closed-only match gets a fresh card" — but every
// card was keyed `wa-lead:<tenant>:<tail9>`, ONE key per customer for all time.
// The "fresh" card carried the key of the old one, so Twenty's upsert found the
// closed card and updated it. The enquiry landed on a dead deal and never
// showed up as a lead.
//
// The key now carries the day of the new enquiry when a closed card already
// exists: retries within the pass still find their own card (idempotent), and a
// customer returning months later gets a card of their own.
describe("waLeadOpportunityExternalId — a returning customer gets their own key", () => {
  const DAY = new Date("2026-08-31T10:15:00.000Z");

  it("a first-time customer keeps the plain key", () => {
    expect(waLeadOpportunityExternalId("cardiwan", "505960056")).toBe("wa-lead:cardiwan:505960056");
  });

  it("a returning customer's key is distinct from the closed card's", () => {
    const first = waLeadOpportunityExternalId("cardiwan", "505960056");
    const again = waLeadOpportunityExternalId("cardiwan", "505960056", DAY);
    expect(again).not.toBe(first);
    expect(again).toBe("wa-lead:cardiwan:505960056:2026-08-31");
  });

  it("is stable within the day, so a retry finds its own card", () => {
    // Both are the same DUBAI day (the box runs +04) — 10:00 and 19:00.
    const a = waLeadOpportunityExternalId("cardiwan", "505960056", new Date("2026-08-31T06:00:00Z"));
    const b = waLeadOpportunityExternalId("cardiwan", "505960056", new Date("2026-08-31T15:00:00Z"));
    expect(a).toBe(b);
  });

  it("a later return is a different lead again", () => {
    const aug = waLeadOpportunityExternalId("cardiwan", "505960056", new Date("2026-08-31T10:00:00Z"));
    const oct = waLeadOpportunityExternalId("cardiwan", "505960056", new Date("2026-10-02T10:00:00Z"));
    expect(oct).not.toBe(aug);
  });
});

// A customer who already bought (or was lost) and comes back is not a stranger,
// and the stranger test does not apply to them. Two real threads on Abdullah's
// line, 2026-08-31, both filed as NOISE and both invisible to the manager:
//
//   #285 COMPLETED          "Which car you will send",
//                           "And do i need to pay more for these car's"
//   #312 UNSUCCESSFUL_DEAL  "Can you plz confirm Car's exact details before"
//
// Neither contains a rent keyword, so the deterministic bar rejects them —
// correctly, for a first contact. For someone whose deal is already closed, the
// fact that they are writing again IS the signal. Ayham asked for exactly this
// on 25.08 ("returning lead… with the history") and again on 31.08 ("nothing
// silently dropped").
//
// The guard is `substantiveLine`: a real sentence, not a sticker or a bare
// "thanks", so a closed deal does not sprout a lead from an emoji.
describe("returningCustomerQualifies — a closed deal writing again is a lead", () => {
  const AT = new Date("2026-08-31T10:43:00.000Z");
  const t = (bodies: string[]) =>
    thread({ lines: bodies.map((body, i) => ({ body, at: new Date(AT.getTime() + i * 1000) })), lastActivityAt: AT });

  it("a real message from a closed deal qualifies", () => {
    expect(
      returningCustomerQualifies(t(["Which car you will send", "And do i need to pay more for these car's"]), {
        id: "o1", open: false, updatedAt: 0,
      })
    ).toBe(true);
  });

  it("an OPEN deal is not a return — it attaches, as before", () => {
    expect(
      returningCustomerQualifies(t(["Which car you will send"]), { id: "o1", open: true, updatedAt: 0 })
    ).toBe(false);
  });

  it("a customer with no card at all is still judged as a stranger", () => {
    expect(returningCustomerQualifies(t(["Which car you will send"]), null)).toBe(false);
  });

  it("a bare thanks does not resurrect a finished deal", () => {
    expect(returningCustomerQualifies(t(["ok"]), { id: "o1", open: false, updatedAt: 0 })).toBe(false);
    expect(returningCustomerQualifies(t(["👍"]), { id: "o1", open: false, updatedAt: 0 })).toBe(false);
  });

  it("nor does a lone photo", () => {
    expect(
      returningCustomerQualifies(t(["[image] Mercedes-Benz G-Class, black"]), { id: "o1", open: false, updatedAt: 0 })
    ).toBe(false);
  });
});

// The system must heal itself. Owner, 2026-08-31: "we need to make sure it does
// not stall — the system shall do it automatically, I thought it was a live
// system".
//
// Every fault found today ended the same way: the relay skipped something, the
// checkpoint moved past it, and the lead was gone until a human re-ran the pass
// by hand. The checkpoint is the right mechanism for keeping up; it is the
// wrong one for catching up.
//
// So a SWEEP runs on a slow cadence over a look-back window, ignoring the
// checkpoint entirely. It cannot double-create — cards are keyed by externalId
// and note lines dedupe — so the only thing it can do is surface what a normal
// pass missed. The relay is spawned with `--once` every two minutes, so the
// decision has to survive process death: it is taken from a stored timestamp,
// not a counter in memory.
describe("shouldSweep — the catch-up pass", () => {
  const NOW = new Date("2026-08-31T20:00:00.000Z");
  const EVERY = 30 * 60_000; // 30 minutes

  it("sweeps when it has never swept", () => {
    expect(shouldSweep(null, NOW, EVERY)).toBe(true);
  });

  it("does not sweep again straight away", () => {
    expect(shouldSweep(new Date(NOW.getTime() - 60_000), NOW, EVERY)).toBe(false);
  });

  it("sweeps once the interval has passed", () => {
    expect(shouldSweep(new Date(NOW.getTime() - EVERY - 1), NOW, EVERY)).toBe(true);
  });

  it("a clock that jumped backwards does not wedge it", () => {
    expect(shouldSweep(new Date(NOW.getTime() + 86_400_000), NOW, EVERY)).toBe(true);
  });
});

// Owner, 2026-08-31, on a 30-minute catch-up: "that's too slow — it's a CRM for
// a business, do you understand?" He is right, and the fix is not a faster
// sweep. It is that the NORMAL pass must never depend on the sweep for speed.
//
// A checkpoint window only re-reads what is newer than the last pass, so a row
// skipped once is not looked at again for however long the sweep interval is.
// Every pass now re-reads a FLOOR of recent history instead — nothing that goes
// wrong inside that floor waits longer than one 2-minute pass to be retried.
//
// The checkpoint still matters for the opposite case: after an outage it is
// older than the floor, and the gap must not be skipped.
describe("passSince — every pass re-reads a floor of recent history", () => {
  const NOW = new Date("2026-08-31T20:00:00.000Z");
  const OPTS = { minLookbackMs: 5 * 60_000, bootstrapMs: 3 * 86_400_000 };

  it("re-reads the floor even when the checkpoint is two minutes old", () => {
    const checkpoint = new Date(NOW.getTime() - 2 * 60_000);
    expect(passSince(NOW, checkpoint, OPTS)).toEqual(new Date("2026-08-31T19:55:00.000Z"));
  });

  it("after an outage the checkpoint wins — the gap is not skipped", () => {
    const checkpoint = new Date(NOW.getTime() - 5 * 3600_000);
    expect(passSince(NOW, checkpoint, OPTS)).toEqual(checkpoint);
  });

  it("a checkpoint exactly on the floor is not moved forward", () => {
    const checkpoint = new Date(NOW.getTime() - 5 * 60_000);
    expect(passSince(NOW, checkpoint, OPTS)).toEqual(checkpoint);
  });

  it("bootstrap with no checkpoint reaches back days, not minutes", () => {
    expect(passSince(NOW, null, OPTS)).toEqual(new Date("2026-08-28T20:00:00.000Z"));
  });
});

// Caught in production 20:30, minutes after shipping the sweep: only the BUSIEST
// tenant (easyrent) was sweeping on every 2-minute pass while every other tenant
// swept once. The sweep read more than the runner's 500-row limit, counted
// itself truncated, and a truncated sweep deliberately does not mark itself
// done — so it swept again, forever.
//
// The cause was `opts.rowLimit ?? SWEEP_ROW_LIMIT`: the runner ALWAYS passes a
// rowLimit, so the wider sweep limit was dead code. A sweep covers a window
// ~180x wider than a normal pass and must be allowed the rows to match.
describe("rowLimitFor — a sweep is never capped by the normal pass limit", () => {
  it("a normal pass uses what the runner asked for", () => {
    expect(rowLimitFor(false, 500)).toBe(500);
  });

  it("a sweep raises the runner's limit rather than obeying it", () => {
    expect(rowLimitFor(true, 500)).toBeGreaterThan(500);
  });

  it("a runner asking for MORE than the sweep limit still gets it", () => {
    expect(rowLimitFor(true, 9000)).toBe(9000);
  });

  it("falls back to the defaults when the runner asks for nothing", () => {
    expect(rowLimitFor(false, undefined)).toBe(500);
    expect(rowLimitFor(true, undefined)).toBeGreaterThan(500);
  });
});

// Ayham, 2026-09-01: "the lead came at 1, you write at 3."
//
// He was right, and it was not a rounding error. Card #23's customer first
// wrote at 11:26; the card is named "… 15:05" because it was stamped with the
// PASS that made it, not with the customer. The gap is however long the
// conversation took to show its intent — three and a half hours in that case.
//
// A lead's time is when the CUSTOMER arrived. Anything else turns the board
// into a log of when our own machinery happened to look.
describe("threadStartedAt — the lead's time is the customer's, not ours", () => {
  const line = (iso: string, body = "hi") => ({
    at: new Date(iso),
    body,
    direction: "inbound" as const,
    mediaPath: null,
    speaker: null,
  });

  it("takes the first line of the conversation, not the pass", () => {
    const thread = {
      lines: [line("2026-09-01T07:26:00Z"), line("2026-09-01T11:01:00Z")],
      lastActivityAt: new Date("2026-09-01T11:01:00Z"),
    };
    expect(threadStartedAt(thread).toISOString()).toBe("2026-09-01T07:26:00.000Z");
  });

  it("is not fooled by lines arriving out of order", () => {
    const thread = {
      lines: [line("2026-09-01T11:01:00Z"), line("2026-09-01T07:26:00Z")],
      lastActivityAt: new Date("2026-09-01T11:01:00Z"),
    };
    expect(threadStartedAt(thread).toISOString()).toBe("2026-09-01T07:26:00.000Z");
  });

  it("falls back to last activity when a thread somehow has no lines", () => {
    const thread = { lines: [], lastActivityAt: new Date("2026-09-01T11:01:00Z") };
    expect(threadStartedAt(thread).toISOString()).toBe("2026-09-01T11:01:00.000Z");
  });
});

// The window bug, and the trap inside fixing it.
//
// The relay judged whichever lines happened to fall in one pass, so a customer
// who opens with "Hi good morning" and asks the price three hours later was
// filed NOISE twice and never became a lead (Ayham, 2026-09-01: real misses
// included "What is best price" and "Hi bro I'm coming to the showroom").
// The cure is to judge the CONVERSATION — the customer's whole recent history.
//
// The trap: that history is two-way, and our own side is full of price lists
// ("Available today: Mercedes CLE 450 …"). Judged on those, every thread
// qualifies and the board fills with our own broadcasts. So the note keeps the
// whole conversation and the VERDICT hears only the customer.
describe("customerLinesOnly — judge what the customer said, not what we sent", () => {
  const l = (dir: "inbound" | "outbound", body: string, iso = "2026-09-01T08:00:00Z") => ({
    at: new Date(iso),
    body,
    direction: dir,
    mediaPath: null,
    speaker: null,
  });

  it("keeps the customer's words", () => {
    const thread = { lines: [l("inbound", "hi"), l("inbound", "what is best price")] };
    expect(customerLinesOnly(thread).lines.map((x) => x.body)).toEqual(["hi", "what is best price"]);
  });

  it("drops our own replies, price lists included", () => {
    const thread = {
      lines: [
        l("inbound", "hi"),
        l("outbound", "Available today: Mercedes CLE 450, 1200 AED per day"),
        l("inbound", "what is best price"),
      ],
    };
    expect(customerLinesOnly(thread).lines.map((x) => x.body)).toEqual(["hi", "what is best price"]);
  });

  it("treats a line with no direction as the customer's — inbound is the old default", () => {
    const thread: { lines: { at: Date; body: string; direction?: string; mediaPath: null; speaker: null }[] } = {
      lines: [{ at: new Date(), body: "need a car", mediaPath: null, speaker: null }],
    };
    expect(customerLinesOnly(thread).lines).toHaveLength(1);
  });

  it("a thread of nothing but our own replies has nothing to judge", () => {
    const thread = { lines: [l("outbound", "Available today"), l("outbound", "still available?")] };
    expect(customerLinesOnly(thread).lines).toEqual([]);
  });
});


// The strongest buying signal carries no keywords: the customer sends their
// identity DOCUMENT (lead 155, 2026-09-03 — licence + EID filed NOISE twelve
// passes in a row until Ali keyed the deal in by hand).
describe("idDocumentSent — identity documents close deals, keywords never see them", () => {
  it("an Emirates ID PDF filename qualifies", () => {
    expect(idDocumentSent([{ body: "EID_784197922876145_290326180919.pdf" }])).toBe(true);
  });

  it("a vision-described driving licence photo qualifies", () => {
    expect(
      idDocumentSent([{ body: "[image] Driving License (UAE). Name: Sherif Abdelhamid, License No. 5061803" }])
    ).toBe(true);
  });

  it("a passport document qualifies", () => {
    expect(idDocumentSent([{ body: "[document] passport_scan.pdf" }])).toBe(true);
  });

  it("the same words in PROSE do not — talk is not a document", () => {
    expect(idDocumentSent([{ body: "habibi my driving license is at home, send me prices first" }])).toBe(false);
  });

  it("ordinary media stays out — a car photo is not an ID", () => {
    expect(idDocumentSent([{ body: "[image] White Nissan Patrol, 2018, plate 90131" }])).toBe(false);
  });

  it("qualifyThreadBySignals clears the bar on documents alone (the lead-155 thread)", () => {
    const t = thread({
      lines: [
        { body: "[location] 24.8668098, 55.1389849", at: new Date("2026-09-03T16:37:00Z") },
        { body: "EID_784197922876145_290326180919.pdf", at: new Date("2026-09-03T16:51:00Z") },
        { body: "[image] Driving License (UAE). Name: Sherif Abdelhamid Mohamed Fouad Adl", at: new Date("2026-09-03T16:51:25Z") },
      ],
    });
    expect(qualifyThreadBySignals(t).qualified).toBe(true);
  });
});


// The mlx model corrupts JSON KEYS (".isRentRequest", ", "), never the values —
// and every correctly-judged verdict was thrown away on the mangled key, which
// is why qualifiedAI read 0 for the relay's entire life (found 2026-09-06 by
// probing live NOISE threads: the model judged all four correctly).
describe("parseLeadVerdict — mlx-mangled keys still parse", () => {
  const SRC = "[2026-09-05T14:45:42Z] Need Audi rs3 tomorrow for 10 days best price";

  it("a dotted key parses and qualifies", () => {
    const v = parseLeadVerdict(
      '{".isRentRequest": true, "confidence": 1.0, "evidence": ["Need Audi rs3 tomorrow for 10 days best price"]}',
      SRC
    );
    expect(v).not.toBeNull();
    expect(verdictQualifies(v)).toBe(true);
  });

  it("a clean verdict still parses (unchanged happy path)", () => {
    const v = parseLeadVerdict(
      '{"isRentRequest": true, "confidence": 0.9, "evidence": ["Need Audi rs3 tomorrow for 10 days best price"]}',
      SRC
    );
    expect(verdictQualifies(v)).toBe(true);
  });

  it("a key stripped to nothing means the field was lost — rejected", () => {
    const v = parseLeadVerdict('{", ": true, "confidence": 0.95, "evidence": ["Need Audi rs3 tomorrow for 10 days best price"]}', SRC);
    expect(v).toBeNull();
  });

  it("an invented quote is still rejected, mangled keys or not", () => {
    const v = parseLeadVerdict(
      '{".isRentRequest": true, "confidence": 0.9, "evidence": ["the model made this up"]}',
      SRC
    );
    expect(v).toBeNull();
  });
});

// ── Hybrid escalation (option B): local Qwen first, DeepSeek second opinion ──
//
// The local model is a 4-bit mlx checkpoint; it works but on borderline
// threads it is mediocre and sometimes mangles output. So the three cases
// where a lead is otherwise lost — the local call throws, parseLeadVerdict
// returns null, or the local verdict says NOT qualified — are escalated to
// DeepSeek, whose verdict is final. DeepSeek failing = local failing: skip,
// never invent a lead (the pass then does counts.failed++ and continues, so no
// card is ever created).
describe("judgeThreadWithEscalation — DeepSeek is the second opinion, not the main judge", () => {
  const SRC = "Need a Camry tomorrow for a week, best price please";
  const prompt = { system: "sys", user: `messages:\n${SRC}`, sourceText: SRC };
  const qualified = (conf = 0.95) =>
    JSON.stringify({ isRentRequest: true, confidence: conf, evidence: [SRC] });
  const notQualified = () =>
    JSON.stringify({ isRentRequest: false, confidence: 0.9, evidence: [SRC] });

  it("local throws → DeepSeek decides (qualified)", async () => {
    const complete = async () => {
      throw new Error("fetch failed");
    };
    const completeDeepseek = async () => qualified();
    const o = await judgeThreadWithEscalation(prompt, complete, completeDeepseek);
    expect(o.escalated).toBe(true);
    expect(o.failed).toBe(false);
    expect(o.engine).toBe("deepseek");
    expect(verdictQualifies(o.verdict)).toBe(true);
  });

  it("local returns unparseable (null verdict) → DeepSeek decides", async () => {
    const complete = async () => "definitely not json";
    const completeDeepseek = async () => qualified();
    const o = await judgeThreadWithEscalation(prompt, complete, completeDeepseek);
    expect(o.escalated).toBe(true);
    expect(o.failed).toBe(false);
    expect(o.engine).toBe("deepseek");
    expect(verdictQualifies(o.verdict)).toBe(true);
  });

  it("local says NOT qualified → DeepSeek overrides (qualified)", async () => {
    const complete = async () => notQualified();
    const completeDeepseek = async () => qualified();
    const o = await judgeThreadWithEscalation(prompt, complete, completeDeepseek);
    expect(o.escalated).toBe(true);
    expect(o.failed).toBe(false);
    expect(o.engine).toBe("deepseek");
    expect(verdictQualifies(o.verdict)).toBe(true);
  });

  it("deepseek fails → skip, no card (failed, never invent a lead)", async () => {
    const complete = async () => notQualified();
    const completeDeepseek = async () => {
      throw new Error("DeepseekProvider chat returned 429");
    };
    const o = await judgeThreadWithEscalation(prompt, complete, completeDeepseek);
    expect(o.escalated).toBe(true);
    expect(o.failed).toBe(true);
    expect(o.verdict).toBeNull();
    expect(o.engine).toBeNull();
  });

  it("local qualified → no escalation, DeepSeek never consulted", async () => {
    let deepseekCalled = false;
    const complete = async () => qualified();
    const completeDeepseek = async () => {
      deepseekCalled = true;
      return qualified();
    };
    const o = await judgeThreadWithEscalation(prompt, complete, completeDeepseek);
    expect(o.escalated).toBe(false);
    expect(o.failed).toBe(false);
    expect(o.engine).toBe("local");
    expect(verdictQualifies(o.verdict)).toBe(true);
    expect(deepseekCalled).toBe(false);
  });

  it("no DeepSeek configured + local throws → failed (skip), unchanged behaviour", async () => {
    const complete = async () => {
      throw new Error("fetch failed");
    };
    const o = await judgeThreadWithEscalation(prompt, complete, null);
    expect(o.escalated).toBe(false);
    expect(o.failed).toBe(true);
    expect(o.verdict).toBeNull();
    expect(o.engine).toBeNull();
  });

  it("no DeepSeek configured + local negative → no escalation, falls through", async () => {
    const complete = async () => notQualified();
    const o = await judgeThreadWithEscalation(prompt, complete, null);
    expect(o.escalated).toBe(false);
    expect(o.failed).toBe(false);
    expect(o.engine).toBe("local");
    expect(verdictQualifies(o.verdict)).toBe(false);
  });
});

describe("blockedBroadcastSender — a supplier advertising TO us is never a lead", () => {
  it("blocks the known rental-broadcast numbers by tail9", () => {
    expect(blockedBroadcastSender("526068986")).toBe(true); // KINGS AUTO
    expect(blockedBroadcastSender("508363335")).toBe(true); // DREAMRIDES
  });

  it("never blocks an ordinary customer", () => {
    expect(blockedBroadcastSender("501234567")).toBe(false);
  });

  it("extends at runtime via WA_LEAD_BLOCKLIST", () => {
    process.env.WA_LEAD_BLOCKLIST = "+971 50 999 8877";
    try {
      expect(blockedBroadcastSender("509998877")).toBe(true);
    } finally {
      delete process.env.WA_LEAD_BLOCKLIST;
    }
    expect(blockedBroadcastSender("509998877")).toBe(false);
  });
});

// ── The sales desk (2026-09 leasing restructure, SALES instance only) ───────
//
// NEW sales cards are owned by the two primary-processing girls, round-robin;
// a closer whose client writes gets a Telegram DM. The rental instance must
// not see ANY of it — the isolation tests below are the pin.

describe("nextGirlOwnerId — the round-robin cursor", () => {
  const POOL = ["bayan-id", "maria-id"];

  it("a null cursor starts at the first girl", () => {
    expect(nextGirlOwnerId(POOL, null)).toEqual({ ownerId: "bayan-id", nextCursor: 1 });
  });

  it("alternates as the cursor advances", () => {
    expect(nextGirlOwnerId(POOL, 1).ownerId).toBe("maria-id");
    expect(nextGirlOwnerId(POOL, 2).ownerId).toBe("bayan-id");
    expect(nextGirlOwnerId(POOL, 3).ownerId).toBe("maria-id");
  });

  it("the persisted cursor is the NEXT index (unbounded — mod at use)", () => {
    // What survives process death: saveCursor(nextCursor) after a successful
    // create, loadCursor() at the next pass start.
    const first = nextGirlOwnerId(POOL, null);
    const second = nextGirlOwnerId(POOL, first.nextCursor);
    expect(second.ownerId).toBe("maria-id");
    expect(nextGirlOwnerId(POOL, second.nextCursor).ownerId).toBe("bayan-id");
  });

  it("a stale cursor larger than the pool wraps instead of wedging", () => {
    expect(nextGirlOwnerId(POOL, 97).ownerId).toBe("maria-id"); // 97 % 2
  });

  it("an empty pool (kill-switch / unresolved members) assigns nobody", () => {
    expect(nextGirlOwnerId([], 0)).toEqual({ ownerId: null, nextCursor: 0 });
  });
});

describe("planOwnerAttachPing — every gate, in order", () => {
  const NOW = new Date("2026-09-10T12:00:00.000Z");
  const GUYS = new Set(["moe-id", "firuz-id", "azat-id"]);
  const base = {
    instance: "default" as const,
    commit: true,
    wroteNewLines: true,
    ownerId: "moe-id",
    pingableOwnerIds: GUYS,
    lastPingAt: null as Date | null,
    now: NOW,
  };

  it("a closer with a fresh line is due", () => {
    expect(planOwnerAttachPing(base)).toEqual({ ping: true, reason: "due" });
  });

  it("RENTAL never pings — byte-identical behaviour there", () => {
    expect(planOwnerAttachPing({ ...base, instance: "rental" }).ping).toBe(false);
    expect(planOwnerAttachPing({ ...base, instance: "rental" }).reason).toBe("not-sales");
  });

  it("dry-run never pings", () => {
    expect(planOwnerAttachPing({ ...base, commit: false }).reason).toBe("dry-run");
  });

  it("a no-op pass (note gained no lines) never pings", () => {
    expect(planOwnerAttachPing({ ...base, wroteNewLines: false }).reason).toBe("no-new-lines");
  });

  it("an unowned card pings nobody", () => {
    expect(planOwnerAttachPing({ ...base, ownerId: null }).reason).toBe("no-owner");
  });

  it("the GIRLS are excluded — their whole job is the queue", () => {
    const r = planOwnerAttachPing({ ...base, ownerId: "bayan-id" });
    expect(r.ping).toBe(false);
    expect(r.reason).toBe("owner-not-closer");
  });

  it("one ping per card per 45 minutes", () => {
    const recent = new Date(NOW.getTime() - 10 * 60_000);
    expect(planOwnerAttachPing({ ...base, lastPingAt: recent }).reason).toBe("throttled");
    const old = new Date(NOW.getTime() - 46 * 60_000);
    expect(planOwnerAttachPing({ ...base, lastPingAt: old }).ping).toBe(true);
  });
});

describe("pruneAttachPings — the throttle map cannot grow forever", () => {
  const NOW = new Date("2026-09-10T12:00:00.000Z");

  it("drops entries older than 24h, keeps fresh ones", () => {
    const pruned = pruneAttachPings(
      {
        fresh: new Date(NOW.getTime() - 3600_000).toISOString(),
        stale: new Date(NOW.getTime() - 25 * 3600_000).toISOString(),
      },
      NOW
    );
    expect(Object.keys(pruned)).toEqual(["fresh"]);
  });

  it("drops unparseable timestamps rather than crashing", () => {
    expect(pruneAttachPings({ bad: "not-a-date" }, NOW)).toEqual({});
  });
});

describe("buildAttachPingText — card label, the client's words, deep link", () => {
  it("uses the lead number when the card has one", () => {
    const text = buildAttachPingText({
      leadNumber: "42",
      name: "#42 WhatsApp direct +971501234567",
      customerLine: "what is your best price for the week?",
      opportunityId: "opp-1",
      cardBaseUrl: "https://app.takeauto.tech",
    });
    expect(text).toContain("card #42: what is your best price");
    expect(text).toContain("https://app.takeauto.tech/object/opportunity/opp-1");
  });

  it("falls back to the card name and cuts the line at 120 chars", () => {
    const text = buildAttachPingText({
      leadNumber: null,
      name: "WhatsApp direct +971501234567",
      customerLine: "x".repeat(200),
      opportunityId: "opp-2",
      cardBaseUrl: "https://app.takeauto.tech/",
    });
    expect(text).toContain("card WhatsApp direct +971501234567: ");
    expect(text).toContain("x".repeat(120));
    expect(text).not.toContain("x".repeat(121));
    expect(text).toContain("https://app.takeauto.tech/object/opportunity/opp-2");
  });
});

describe("planLeadProjection — primaryStage is a SALES-only write", () => {
  function planInput(instance: "default" | "rental", fields: string[]): LeadPlanInput {
    return {
      thread: thread(),
      qualifiedBy: "bar",
      match: null,
      existingLeadCardId: null,
      existingPersonId: null,
      opportunityFields: new Set([
        "name", "stage", "externalId", "externalSource", "pointOfContact", ...fields,
      ]),
      instance,
      tenantSlug: instance === "rental" ? "cardiwan" : "take-auto",
      brandLine: null,
      signals: { carText: null, intent: null, termMonths: null, priceAed: null } as unknown as LeadPlanInput["signals"],
      origin: null,
      now: new Date("2026-09-10T10:00:00.000Z"),
    };
  }

  it("sales with the field → NEW_APPLICATION on the create body", () => {
    const plan = planLeadProjection(planInput("default", ["primaryStage"]));
    if (plan.action !== "create") throw new Error("expected create");
    expect(plan.opportunity.primaryStage).toBe("NEW_APPLICATION");
  });

  it("sales without the field → skipped, same as the brand chip", () => {
    const plan = planLeadProjection(planInput("default", []));
    if (plan.action !== "create") throw new Error("expected create");
    expect(plan.opportunity.primaryStage).toBeUndefined();
    expect(plan.skippedFields).toContain("primaryStage");
  });

  it("rental NEVER carries it — even if the workspace grew the field", () => {
    const plan = planLeadProjection(planInput("rental", ["primaryStage"]));
    if (plan.action !== "create") throw new Error("expected create");
    expect(plan.opportunity.primaryStage).toBeUndefined();
    expect(plan.skippedFields).not.toContain("primaryStage");
  });
});

// Pass-level pins: the rotation, the ping, and the rental isolation. Fakes
// cover the whole client surface the pass touches (opportunity index, note
// find-or-create, the attach-branch card read).
describe("runWaLeadRelayPass — the sales desk end to end", () => {
  const AT = new Date("2026-09-10T10:00:00.000Z");
  const FIELDS = new Set([
    "name", "stage", "externalId", "externalSource", "pointOfContact",
    "phoneTail9", "stageDetail", "callSource", "whatsapp", "brandLine",
    "primaryStage", "leadNumber",
  ]);

  function leadRow(tailDigits: string, id: string): LeadRelayRow {
    return {
      id,
      channel: "whatsapp",
      from: `${tailDigits}@s.whatsapp.net`,
      fromPn: tailDigits,
      to: "azat-takeauto",
      customerName: "Test Customer",
      body: "Need a Camry for a week, budget 2000 AED",
      createdAt: AT,
    };
  }

  function fakeSource(rows: LeadRelayRow[]): WaLeadRelaySource {
    return {
      loadCheckpoint: async () => null,
      saveCheckpoint: async () => {},
      loadRows: async () => rows,
      loadStaffTails: async () => new Set<string>(),
    };
  }

  function fakeClient(opts: {
    openOpps?: Record<string, unknown>[];
    existingCard?: Record<string, unknown>;
  } = {}) {
    return {
      mode: "mock",
      get: async (path: string) =>
        path.startsWith("opportunities/")
          ? { data: { opportunity: opts.existingCard ?? {} } }
          : { data: {} }, // notes lookup → never found → the note is CREATED
      post: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      listAll: async function* (_path: string, _params?: Record<string, unknown>) {
        for (const r of opts.openOpps ?? []) yield r;
      },
      batchCreate: async (_path: string, records: Record<string, unknown>[]) =>
        records.map((_, i) => ({ id: `note-${i}` })),
    } as unknown as TwentyClient;
  }

  function fakeTwenty() {
    const created: Record<string, unknown>[] = [];
    const twenty: RelayTwenty = {
      findPersonByTail9: async () => ({ id: "person-1" }),
      findOpportunityByExternalId: async () => null,
      createPerson: async () => ({ id: "person-1" }),
      createOpportunity: async (payload) => {
        created.push(payload);
        return { id: `opp-new-${created.length}` };
      },
      patchOpportunity: async () => {},
    };
    return { twenty, created };
  }

  function fakeDesk() {
    let cursor: number | null = null;
    let pings: Record<string, string> = {};
    const sent: { ownerId: string; text: string }[] = [];
    const desk: SalesDeskRouting = {
      girlPool: ["bayan-id", "maria-id"],
      pingableOwnerIds: new Set(["moe-id"]),
      loadCursor: async () => cursor,
      saveCursor: async (n) => {
        cursor = n;
      },
      loadPings: async () => pings,
      savePings: async (m) => {
        pings = m;
      },
      sendOwnerPing: async (ownerId, text) => {
        sent.push({ ownerId, text });
        return true;
      },
      cardBaseUrl: "https://app.takeauto.tech",
    };
    return { desk, sent, readCursor: () => cursor, readPings: () => pings };
  }

  function deps(over: Partial<WaLeadRelayDeps>): WaLeadRelayDeps {
    return {
      client: fakeClient(),
      twenty: fakeTwenty().twenty,
      instance: "default",
      tenantSlug: "take-auto",
      // Index scoping is brand-exact (brandLine !== undefined filters), so the
      // fake opps below carry the same brandLine.
      brandLine: "takeauto",
      opportunityFields: FIELDS,
      source: fakeSource([]),
      complete: null,
      ownerIdForLine: () => "line-owner-id",
      ...over,
    };
  }

  it("NEW sales cards rotate Bayan → Maria and are stamped NEW_APPLICATION", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, readCursor } = fakeDesk();
    const source = fakeSource([leadRow("971501111111", "r1"), leadRow("971502222222", "r2")]);
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source, salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(2);
    expect(counts.girlAssigned).toBe(2);
    expect(created.map((p) => p.ownerId)).toEqual(["bayan-id", "maria-id"]);
    expect(created.every((p) => p.primaryStage === "NEW_APPLICATION")).toBe(true);
    expect(readCursor()).toBe(2); // persisted AFTER the creates succeeded
  });

  it("the cursor survives process death — the next pass continues the rotation", async () => {
    const { desk, readCursor } = fakeDesk();
    const first = fakeTwenty();
    await runWaLeadRelayPass(
      deps({ twenty: first.twenty, source: fakeSource([leadRow("971501111111", "r1")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(readCursor()).toBe(1);
    // A FRESH pass (fresh relay process) reads the same store: Maria's turn.
    const second = fakeTwenty();
    await runWaLeadRelayPass(
      deps({ twenty: second.twenty, source: fakeSource([leadRow("971503333333", "r3")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(second.created[0]?.ownerId).toBe("maria-id");
    expect(readCursor()).toBe(2);
  });

  it("an empty girl pool (kill-switch) falls back to the line owner", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk } = fakeDesk();
    await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([leadRow("971501111111", "r1")]), salesDesk: { ...desk, girlPool: [] } }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(created[0]?.ownerId).toBe("line-owner-id");
  });

  it("a closer gets ONE Telegram DM when his client writes — throttled per card", async () => {
    const { desk, sent, readPings } = fakeDesk();
    const openOpp = { id: "opp-1", phoneTail9: "501111111", brandLine: "takeauto", stage: "NEW", updatedAt: "2026-09-10T09:00:00.000Z" };
    const client = fakeClient({
      openOpps: [openOpp],
      existingCard: { id: "opp-1", ownerId: "moe-id", leadNumber: "42", name: "#42 WhatsApp direct" },
    });
    const source = fakeSource([leadRow("971501111111", "r1")]);
    const counts = await runWaLeadRelayPass(
      deps({ client, source, salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.ownerPings).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.ownerId).toBe("moe-id");
    expect(sent[0]!.text).toContain("card #42: Need a Camry for a week");
    expect(sent[0]!.text).toContain("https://app.takeauto.tech/object/opportunity/opp-1");
    expect(readPings()["opp-1"]).toBeTruthy();

    // The NEXT pass (the client writes again inside 45 min) does NOT re-ping.
    const counts2 = await runWaLeadRelayPass(
      deps({ client, source, salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts2.attached).toBe(1);
    expect(counts2.ownerPings).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it("a girl-owned card never pings its owner", async () => {
    const { desk, sent } = fakeDesk();
    const client = fakeClient({
      openOpps: [{ id: "opp-9", phoneTail9: "501111111", brandLine: "takeauto", stage: "NEW", updatedAt: "2026-09-10T09:00:00.000Z" }],
      existingCard: { id: "opp-9", ownerId: "bayan-id", name: "WhatsApp direct" },
    });
    const counts = await runWaLeadRelayPass(
      deps({ client, source: fakeSource([leadRow("971501111111", "r1")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.ownerPings).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("RENTAL is byte-identical even if a salesDesk is miswired into it", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readCursor } = fakeDesk();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        instance: "rental",
        tenantSlug: "cardiwan",
        brandLine: "cardiwan",
        source: fakeSource([leadRow("971501111111", "r1")]),
        salesDesk: desk, // misconfiguration on purpose — the pass must ignore it
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.girlAssigned).toBe(0);
    expect(created[0]?.ownerId).toBe("line-owner-id"); // line routing, unchanged
    expect(created[0]?.primaryStage).toBeUndefined();
    expect(readCursor()).toBeNull(); // the rotation was never touched
    expect(sent).toHaveLength(0);
  });
});

// ── Instagram DM / Facebook Messenger threads (Meta webhook, 2026-09-15) ────
//
// Meta rows arrive from /api/webhooks/meta with `from` = `ig:<scopedId>` /
// `fb:<scopedId>` and channel instagram/messenger. The scoped id is pure
// digits but is NOT a phone — the prefix is what keeps it out of every tail9
// path. These threads are phone-less end to end: no phoneTail9, no whatsapp
// link, the card is found by its externalId root instead of the phone index.

describe("threadKeyFor — the ig:/fb: prefix is the identity", () => {
  const row = (from: string, channel = "instagram"): LeadRelayRow => ({
    id: "r1",
    channel,
    from,
    fromPn: null,
    to: "ig-takeauto",
    customerName: null,
    body: "Need a Camry for a week",
    externalId: "igmsg:ig-takeauto:m1",
    createdAt: new Date("2026-09-15T08:00:00.000Z"),
  });

  it("keys an instagram row on the whole prefixed scoped id, with no digits", () => {
    expect(threadKeyFor(row("ig:17841400123456789"))).toEqual({ key: "ig:17841400123456789", digits: "" });
  });

  it("keys a messenger row on fb:", () => {
    expect(threadKeyFor(row("fb:2395800100", "messenger"))).toEqual({ key: "fb:2395800100", digits: "" });
  });

  it("an empty scoped id is refused like any other dishonest key", () => {
    expect(threadKeyFor(row("ig:"))).toBeNull();
  });

  it("whatsapp rows are byte-identical to before", () => {
    expect(
      threadKeyFor({ ...row("971501234567@s.whatsapp.net", "whatsapp"), externalId: "waobs:x:1" })
    ).toEqual({ key: "501234567", digits: "971501234567" });
  });
});

describe("metaKeyParts / metaLeadOpportunityExternalId", () => {
  it("parses only prefixed keys", () => {
    expect(metaKeyParts("ig:17841400123")).toEqual({ prefix: "ig", id: "17841400123" });
    expect(metaKeyParts("fb:2395800100")).toEqual({ prefix: "fb", id: "2395800100" });
    expect(metaKeyParts("501234567")).toBeNull();
  });

  it("the card key is ig-lead:/fb-lead:, day-suffixed on a return like wa-lead:", () => {
    expect(metaLeadOpportunityExternalId("take-auto", "ig:17841400123")).toBe("ig-lead:take-auto:17841400123");
    expect(metaLeadOpportunityExternalId("take-auto", "fb:2395800100")).toBe("fb-lead:take-auto:2395800100");
    expect(metaLeadOpportunityExternalId("take-auto", "ig:17841400123", new Date("2026-09-15T10:00:00Z"))).toBe(
      "ig-lead:take-auto:17841400123:2026-09-15"
    );
  });

  it("refuses a non-meta key rather than minting a counter nobody meant to create", () => {
    expect(() => metaLeadOpportunityExternalId("take-auto", "501234567")).toThrow();
  });
});

describe("threadKeyFor — the jivo: prefix is the identity (with a phone escape hatch)", () => {
  const row = (from: string, fromPn: string | null = null): LeadRelayRow => ({
    id: "r1",
    channel: "jivo",
    from,
    fromPn,
    to: "jivo:460001",
    customerName: "Widget visitor",
    body: "Need a Camry for a week",
    externalId: "jivo:460001:evt:e1",
    createdAt: new Date("2026-09-19T08:00:00.000Z"),
  });

  it("keys a phone-less visitor on the whole jivo:<site>:<client> id, with no digits", () => {
    expect(threadKeyFor(row("jivo:460001:2198"))).toEqual({ key: "jivo:460001:2198", digits: "" });
  });

  it("a visitor who GAVE a phone keys on the tail9 — same card as their WhatsApp thread", () => {
    expect(threadKeyFor(row("jivo:460001:2198", "+971 50 123 4567"))).toEqual({
      key: "501234567",
      digits: "971501234567",
    });
  });

  it("a junk from_pn falls through to the pseudo-identity, never a short key", () => {
    expect(threadKeyFor(row("jivo:460001:2198", "123"))).toEqual({ key: "jivo:460001:2198", digits: "" });
  });

  it("metaKeyParts / metaLeadOpportunityExternalId cover jivo keys", () => {
    expect(metaKeyParts("jivo:460001:2198")).toEqual({ prefix: "jivo", id: "460001:2198" });
    expect(metaLeadOpportunityExternalId("easyrent", "jivo:460001:2198")).toBe("jivo-lead:easyrent:460001:2198");
    expect(metaLeadOpportunityExternalId("easyrent", "jivo:460001:2198", new Date("2026-09-19T10:00:00Z"))).toBe(
      "jivo-lead:easyrent:460001:2198:2026-09-19"
    );
  });

  it("whatsapp rows are still byte-identical (fromPn wins there too, as before)", () => {
    expect(
      threadKeyFor({ ...row("971501234567@s.whatsapp.net", null), channel: "whatsapp", externalId: "waobs:x:1" })
    ).toEqual({ key: "501234567", digits: "971501234567" });
  });
});

describe("buildThreads — ig/fb rows are direct threads with the account as lineSlug", () => {
  const igRow = (scopedId: string, id: string, body = "Need a Camry for a week"): LeadRelayRow => ({
    id,
    channel: "instagram",
    from: `ig:${scopedId}`,
    fromPn: null,
    to: "ig-takeauto",
    customerName: null,
    body,
    externalId: `igmsg:ig-takeauto:${id}`,
    createdAt: new Date("2026-09-15T08:00:00.000Z"),
  });

  it("threads by scoped id, direct (no sourceContext), lineSlug from the extid namespace", () => {
    const { threads, skippedNoKey } = buildThreads([igRow("17841400123", "m1"), igRow("17841400123", "m2")]);
    expect(skippedNoKey).toBe(0);
    expect(threads.size).toBe(1);
    const t = threads.get("ig:17841400123")!;
    expect(t.channel).toBe("instagram");
    expect(t.sourceContext).toBeNull();
    expect(t.lineSlug).toBe("ig-takeauto");
    expect(t.lines).toHaveLength(2);
  });

  it("messenger rows parse fbmsg: the same way", () => {
    const { threads } = buildThreads([
      { ...igRow("2395800100", "m1"), channel: "messenger", from: "fb:2395800100", to: "fb-takeauto", externalId: "fbmsg:fb-takeauto:m1" },
    ]);
    expect(threads.get("fb:2395800100")?.lineSlug).toBe("fb-takeauto");
  });
});

describe("qualifyThreadBySignals — the phone gate lifts for ig/fb, the bar does not", () => {
  const igThread = (bodies: string[]): LeadThread =>
    thread({
      key: "ig:17841400123",
      digits: "",
      channel: "instagram",
      lineSlug: "ig-takeauto",
      lines: bodies.map((body, i) => ({ body, at: new Date(Date.UTC(2026, 8, 15, 8, i)) })),
    });

  it("a car/intent line qualifies with NO phone at all", () => {
    expect(qualifyThreadBySignals(igThread(["Need a Camry for a week, budget 2000 AED"])).qualified).toBe(true);
  });

  it("small talk still fails the bar — phoneless is not a free pass", () => {
    expect(qualifyThreadBySignals(igThread(["hi", "hello?"])).qualified).toBe(false);
  });

  it("an identity document photo closes the deal on ig too", () => {
    expect(qualifyThreadBySignals(igThread(["[image] UAE driving licence; key text: License No. 5061803"])).qualified).toBe(true);
  });
});

describe("buildThreadNote — an ig note carries NO whatsapp link", () => {
  it("titles off the scoped-id tail6 and never prepends web.whatsapp.com", () => {
    const { title, body } = buildThreadNote(
      thread({ key: "ig:17841400123", digits: "", channel: "instagram", lineSlug: "ig-takeauto" }),
      null
    );
    expect(title).toBe("Instagram direct · …400123");
    expect(body).not.toContain("whatsapp.com");
    expect(body).not.toContain("wa.me");
  });

  it("messenger labels as Messenger direct", () => {
    const { title } = buildThreadNote(
      thread({ key: "fb:2395800100", digits: "", channel: "messenger", lineSlug: "fb-takeauto" }),
      null
    );
    expect(title).toBe("Messenger direct · …800100");
  });
});

describe("runWaLeadRelayPass — instagram leads end to end (sales desk)", () => {
  const AT = new Date("2026-09-10T10:00:00.000Z");
  const FIELDS = new Set([
    "name", "stage", "externalId", "externalSource", "pointOfContact",
    "phoneTail9", "stageDetail", "callSource", "whatsapp", "brandLine",
    "primaryStage", "leadNumber",
  ]);

  function igRow(scopedId: string, id: string, body = "Need a Camry for a week, budget 2000 AED"): LeadRelayRow {
    return {
      id,
      channel: "instagram",
      from: `ig:${scopedId}`,
      fromPn: null,
      to: "ig-takeauto",
      customerName: null,
      body,
      externalId: `igmsg:ig-takeauto:${id}`,
      createdAt: AT,
    };
  }

  function fakeSource(rows: LeadRelayRow[]): WaLeadRelaySource {
    return {
      loadCheckpoint: async () => null,
      saveCheckpoint: async () => {},
      loadRows: async () => rows,
      loadStaffTails: async () => new Set<string>(),
    };
  }

  function fakeClient(opts: { existingCard?: Record<string, unknown> } = {}) {
    const listAllCalls: string[] = [];
    return {
      listAllCalls,
      client: {
        mode: "mock",
        get: async (path: string) =>
          path.startsWith("opportunities/")
            ? { data: { opportunity: opts.existingCard ?? {} } }
            : { data: {} }, // notes lookup → never found → the note is CREATED
        post: async () => ({}),
        patch: async () => ({}),
        delete: async () => ({}),
        listAll: async function* (path: string) {
          listAllCalls.push(path);
        },
        batchCreate: async (_path: string, records: Record<string, unknown>[]) =>
          records.map((_, i) => ({ id: `note-${i}` })),
      } as unknown as TwentyClient,
    };
  }

  function fakeTwenty(opts: { byExternalId?: Record<string, Record<string, unknown> | null> } = {}) {
    const created: Record<string, unknown>[] = [];
    const persons: Record<string, unknown>[] = [];
    const patched: { id: string; patch: Record<string, unknown> }[] = [];
    const tail9Calls: string[] = [];
    const twenty: RelayTwenty = {
      findPersonByTail9: async (t) => {
        tail9Calls.push(t);
        return { id: "person-1" };
      },
      findOpportunityByExternalId: async (id) =>
        (opts.byExternalId?.[id] ?? null) as ({ id: string } & Record<string, unknown>) | null,
      createPerson: async (p) => {
        persons.push(p);
        return { id: `person-${persons.length}` };
      },
      createOpportunity: async (p) => {
        created.push(p);
        return { id: `opp-new-${created.length}` };
      },
      patchOpportunity: async (id, patch) => {
        patched.push({ id, patch });
      },
    };
    return { twenty, created, persons, patched, tail9Calls };
  }

  function fakeDesk() {
    let cursor: number | null = null;
    let pings: Record<string, string> = {};
    const sent: { ownerId: string; text: string }[] = [];
    const desk: SalesDeskRouting = {
      girlPool: ["bayan-id", "maria-id"],
      pingableOwnerIds: new Set(["moe-id"]),
      loadCursor: async () => cursor,
      saveCursor: async (n) => {
        cursor = n;
      },
      loadPings: async () => pings,
      savePings: async (m) => {
        pings = m;
      },
      sendOwnerPing: async (ownerId, text) => {
        sent.push({ ownerId, text });
        return true;
      },
      cardBaseUrl: "https://app.takeauto.tech",
    };
    return { desk, sent };
  }

  function deps(over: Partial<WaLeadRelayDeps>): WaLeadRelayDeps {
    return {
      client: fakeClient().client,
      twenty: fakeTwenty().twenty,
      instance: "default",
      tenantSlug: "take-auto",
      brandLine: "takeauto",
      opportunityFields: FIELDS,
      source: fakeSource([]),
      complete: null,
      ownerIdForLine: () => "line-owner-id",
      ...over,
    };
  }

  it("an ig text thread creates a phone-less card: ig-lead key, label, NEW_APPLICATION, a girl owns it", async () => {
    const tw = fakeTwenty();
    const { client, listAllCalls } = fakeClient();
    const { desk } = fakeDesk();
    const counts = await runWaLeadRelayPass(
      deps({ client, twenty: tw.twenty, source: fakeSource([igRow("17841400123", "r1")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.girlAssigned).toBe(1);
    const card = tw.created[0]!;
    expect(card.externalId).toBe("ig-lead:take-auto:17841400123");
    expect(card.externalSource).toBe("instagram");
    expect(card.callSource).toBe("Instagram direct");
    expect(card.stageDetail).toBe("Instagram lead");
    expect(card.stage).toBe("NEW");
    expect(card.primaryStage).toBe("NEW_APPLICATION");
    expect(card.ownerId).toBe("bayan-id");
    expect(card.name).toMatch(/^Instagram direct · 400123 \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    // Phone-less: none of the phone-shaped fields may exist on the card…
    expect(card.phoneTail9).toBeUndefined();
    expect(card.whatsapp).toBeUndefined();
    // …and none on the person.
    const person = tw.persons[0]!;
    expect(person.externalId).toBe("ig-lead-person:take-auto:17841400123");
    expect(person.name).toEqual({ firstName: "Instagram 400123", lastName: "" });
    expect(person.phones).toBeUndefined();
    expect(person.phoneTail9).toBeUndefined();
    // The phone paths were never touched: no tail9 person lookup, no phone
    // index fetch (the only listAll would be fetchOpportunitiesForTails).
    expect(tw.tail9Calls).toHaveLength(0);
    expect(listAllCalls).toHaveLength(0);
  });

  it("a second message from the same scoped id ATTACHES to the open card — no second card", async () => {
    const tw = fakeTwenty({
      byExternalId: { "ig-lead:take-auto:17841400123": { id: "opp-ig-1", stage: "NEW", updatedAt: "2026-09-10T09:00:00.000Z" } },
    });
    const { client } = fakeClient({ existingCard: { id: "opp-ig-1", name: "Instagram direct" } });
    const counts = await runWaLeadRelayPass(
      deps({ client, twenty: tw.twenty, source: fakeSource([igRow("17841400123", "r2")]) }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.created).toBe(0);
    expect(tw.created).toHaveLength(0);
    // The enrich patch must not invent phone fields on the ig card.
    for (const { patch } of tw.patched) {
      expect(patch.phoneTail9).toBeUndefined();
      expect(patch.whatsapp).toBeUndefined();
    }
  });

  it("an ig NOISE thread is filed as noise, exactly like whatsapp", async () => {
    const tw = fakeTwenty();
    const counts = await runWaLeadRelayPass(
      deps({ twenty: tw.twenty, source: fakeSource([igRow("17841400123", "r1", "hi there, hello?")]) }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.skippedNoise).toBe(1);
    expect(counts.created).toBe(0);
    expect(tw.created).toHaveLength(0);
  });

  it("a CLOSED ig card + a substantive new message → a fresh day-suffixed card to the girls", async () => {
    const tw = fakeTwenty({
      byExternalId: {
        "ig-lead:take-auto:17841400123": { id: "opp-old", stage: "COMPLETED", updatedAt: "2026-09-01T09:00:00.000Z" },
      },
    });
    const { desk } = fakeDesk();
    // No rent keyword — the returning-customer rule carries it (a closed deal
    // writing again is a lead by that fact alone).
    const counts = await runWaLeadRelayPass(
      deps({ twenty: tw.twenty, source: fakeSource([igRow("17841400123", "r3", "Which car you will send me today")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.girlAssigned).toBe(1);
    expect(tw.created[0]?.externalId).toBe("ig-lead:take-auto:17841400123:2026-09-10");
    expect(tw.created[0]?.ownerId).toBe("bayan-id");
  });

  it("the attach ping fires for an ig thread when a closer owns the open card", async () => {
    const tw = fakeTwenty({
      byExternalId: { "ig-lead:take-auto:17841400123": { id: "opp-ig-9", stage: "NEW", updatedAt: "2026-09-10T09:00:00.000Z" } },
    });
    const { client } = fakeClient({
      existingCard: { id: "opp-ig-9", ownerId: "moe-id", leadNumber: "7", name: "#7 Instagram direct" },
    });
    const { desk, sent } = fakeDesk();
    const counts = await runWaLeadRelayPass(
      deps({ client, twenty: tw.twenty, source: fakeSource([igRow("17841400123", "r4")]), salesDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.ownerPings).toBe(1);
    expect(sent[0]?.ownerId).toBe("moe-id");
    expect(sent[0]?.text).toContain("https://app.takeauto.tech/object/opportunity/opp-ig-9");
  });

  it("RENTAL instance: an ig card there follows rental rules byte-identically", async () => {
    const tw = fakeTwenty();
    const { desk, sent } = fakeDesk();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty: tw.twenty,
        instance: "rental",
        tenantSlug: "cardiwan",
        brandLine: "cardiwan",
        source: fakeSource([igRow("17841400123", "r1")]),
        salesDesk: desk, // miswired on purpose — the pass must ignore it
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.girlAssigned).toBe(0);
    const card = tw.created[0]!;
    expect(card.externalId).toBe("ig-lead:cardiwan:17841400123");
    expect(card.stage).toBe("NEW_REQUEST"); // rental vocabulary
    expect(card.primaryStage).toBeUndefined();
    expect(card.ownerId).toBe("line-owner-id");
    expect(card.phoneTail9).toBeUndefined();
    expect(sent).toHaveLength(0);
  });
});

// ── Rental main-line distribution (Ayham, 2026-09) ──────────────────────────
//
// The two rental MAIN lines (etm-website → etm rotation, cardiwan → cardiwan
// rotation) deal NEW cards round-robin over the AVAILABLE agents of the
// brand's roster; the customer gets ONE auto-reply from the same main line;
// the agent + manager get WhatsApp pings; the assignment is recorded for the
// sweeper. RENTAL_DISTRIBUTOR=off / empty roster → the line owner, unchanged.
// The SALES side must stay byte-identical — pinned below with a rentalDesk
// deliberately miswired into the default instance.
describe("runWaLeadRelayPass — the rental distributor end to end", () => {
  const AT = new Date("2026-09-16T10:00:00.000Z");
  const FIELDS = new Set([
    "name", "stage", "externalId", "externalSource", "pointOfContact",
    "phoneTail9", "stageDetail", "callSource", "whatsapp", "brandLine",
    "leadNumber", "assignedAt",
  ]);

  function mainLineRow(tailDigits: string, id: string, line = "etm-website"): LeadRelayRow {
    return {
      id,
      channel: "whatsapp",
      from: `${tailDigits}@s.whatsapp.net`,
      fromPn: tailDigits,
      to: line,
      customerName: "Test Customer",
      body: "Need a Camry for a week, budget 2000 AED",
      createdAt: AT,
    };
  }

  function fakeSource(rows: LeadRelayRow[]): WaLeadRelaySource {
    return {
      loadCheckpoint: async () => null,
      saveCheckpoint: async () => {},
      loadRows: async () => rows,
      loadStaffTails: async () => new Set<string>(),
    };
  }

  function fakeClient(opts: { existingCard?: Record<string, unknown> } = {}) {
    return {
      mode: "mock",
      get: async (path: string) =>
        path.startsWith("opportunities/")
          ? { data: { opportunity: opts.existingCard ?? {} } }
          : { data: {} },
      post: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      listAll: async function* (_path: string, _params?: Record<string, unknown>) {},
      batchCreate: async (_path: string, records: Record<string, unknown>[]) =>
        records.map((_, i) => ({ id: `note-${i}` })),
    } as unknown as TwentyClient;
  }

  function fakeTwenty(opts: { byExternalId?: Record<string, Record<string, unknown> | null> } = {}) {
    const created: Record<string, unknown>[] = [];
    const twenty: RelayTwenty = {
      findPersonByTail9: async () => ({ id: "person-1" }),
      findOpportunityByExternalId: async (id) =>
        (opts.byExternalId?.[id] ?? null) as ({ id: string } & Record<string, unknown>) | null,
      createPerson: async () => ({ id: "person-1" }),
      createOpportunity: async (payload) => {
        created.push(payload);
        return { id: `opp-new-${created.length}` };
      },
      patchOpportunity: async () => {},
    };
    return { twenty, created };
  }

  function fakeRentalDesk(opts: {
    etmRoster?: { name: string; phone: string; memberId: string | null }[];
    availability?: Record<string, { status: "available" | "busy" | "off"; busyUntil: Date | null }>;
    autoReplyEnabled?: boolean;
  } = {}) {
    let cursors: Record<string, number> = {};
    let autoReplied: Record<string, string> = {};
    let assignments: Record<string, RentalAssignment> = {};
    const sent: { line: string; toDigits: string; text: string; dedupeKey: string }[] = [];
    const roster = opts.etmRoster ?? [
      { name: "Ali", phone: "971542445835", memberId: "ali-id" },
      { name: "Babek", phone: "971529965085", memberId: "babek-id" },
    ];
    const desk: RentalDeskRouting = {
      rosterFor: (brand) => (brand === "etm" ? roster : [{ name: "Abdullah", phone: "971569808087", memberId: "abdullah-id" }]),
      managerMemberIdFor: () => "ayham-id",
      managerPhoneFor: () => "971581417020",
      managerNameFor: () => "Ayham",
      autoReplyText: "AUTO-REPLY-TEXT",
      autoReplyEnabled: opts.autoReplyEnabled,
      texts: DEFAULT_TEXTS,
      acceptWindowMs: 10 * 60_000,
      loadCursors: async () => ({ ...cursors }),
      saveCursors: async (c) => {
        cursors = c;
      },
      loadAvailability: async () => opts.availability ?? {},
      loadAutoReplied: async () => ({ ...autoReplied }),
      saveAutoReplied: async (m) => {
        autoReplied = m;
      },
      loadAssignments: async () => ({ ...assignments }),
      saveAssignments: async (m) => {
        assignments = m;
      },
      sendWhatsApp: async (input) => {
        sent.push(input);
        return true;
      },
    };
    return { desk, sent, readCursors: () => cursors, readAutoReplied: () => autoReplied, readAssignments: () => assignments };
  }

  function deps(over: Partial<WaLeadRelayDeps>): WaLeadRelayDeps {
    return {
      client: fakeClient(),
      twenty: fakeTwenty().twenty,
      instance: "rental",
      tenantSlug: "easyrent",
      brandLine: "easyrent",
      opportunityFields: FIELDS,
      source: fakeSource([]),
      complete: null,
      ownerIdForLine: () => "line-owner-id",
      nextLeadNumber: (() => {
        let n = 100;
        return async () => ++n;
      })(),
      ...over,
    };
  }

  it("a NEW main-line lead: rotation owner, assignedAt stamp, ONE auto-reply, agent + manager pings, assignment recorded", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readCursors, readAssignments } = fakeRentalDesk();
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(1);
    expect(counts.rentalAutoReplies).toBe(1);
    const card = created[0]!;
    expect(card.ownerId).toBe("ali-id"); // first in the ETM rotation
    expect(card.stage).toBe("NEW_REQUEST");
    expect(typeof card.assignedAt).toBe("string"); // the acceptance clock
    expect(card.leadNumber).toBe("101");
    expect(readCursors()).toEqual({ etm: 1 });
    // The three messages: customer auto-reply, agent ping, manager notice —
    // all FROM the main line the customer wrote to.
    expect(sent.map((s) => s.dedupeKey)).toEqual([
      "autoreply:etm-website:501111111",
      "assign:opp-new-1",
      "mgr-assigned:opp-new-1",
    ]);
    expect(sent.every((s) => s.line === "etm-website")).toBe(true);
    expect(sent[0]!.toDigits).toBe("971501111111"); // the customer
    expect(sent[0]!.text).toBe("AUTO-REPLY-TEXT");
    expect(sent[1]!.toDigits).toBe("971542445835"); // Ali
    expect(sent[1]!.text).toContain("+971501111111"); // customer phone
    expect(sent[1]!.text).toContain("Need a Camry for a week"); // original message
    expect(sent[1]!.text).toContain("#101"); // lead number
    expect(sent[2]!.toDigits).toBe("971581417020"); // the manager
    const a = readAssignments()["opp-new-1"]!;
    expect(a.agentName).toBe("Ali");
    expect(a.memberId).toBe("ali-id");
    expect(a.customerTail9).toBe("501111111");
    expect(a.done).toBe(false);
    expect(a.leadNumber).toBe("101");
  });

  it("the rotation advances ACROSS passes — the cursor is persisted, not in-process", async () => {
    const { desk, readCursors } = fakeRentalDesk();
    const first = fakeTwenty();
    await runWaLeadRelayPass(
      deps({ twenty: first.twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    const second = fakeTwenty();
    await runWaLeadRelayPass(
      deps({ twenty: second.twenty, source: fakeSource([mainLineRow("971502222222", "r2")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(first.created[0]!.ownerId).toBe("ali-id");
    expect(second.created[0]!.ownerId).toBe("babek-id");
    expect(readCursors()).toEqual({ etm: 2 });
  });

  it("a BUSY agent is skipped — the next available one gets the card", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent } = fakeRentalDesk({
      availability: { ali: { status: "busy", busyUntil: new Date(Date.now() + 30 * 60_000) } },
    });
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalAssigned).toBe(1);
    expect(created[0]!.ownerId).toBe("babek-id");
    expect(sent.find((s) => s.dedupeKey.startsWith("assign:"))!.toDigits).toBe("971529965085");
  });

  it("ALL agents busy/off → the card parks in the manager's queue + the manager is told", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readAssignments } = fakeRentalDesk({
      availability: {
        ali: { status: "busy", busyUntil: new Date(Date.now() + 30 * 60_000) },
        babek: { status: "off", busyUntil: null },
      },
    });
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalAssigned).toBe(0);
    expect(counts.rentalAllBusy).toBe(1);
    expect(created[0]!.ownerId).toBe("ayham-id"); // the brand manager
    // Customer still gets the auto-reply; NO agent ping; manager gets all-busy.
    expect(sent.map((s) => s.dedupeKey)).toEqual([
      "autoreply:etm-website:501111111",
      "mgr-allbusy:opp-new-1",
    ]);
    expect(sent[1]!.text).toContain("please assign manually");
    const a = readAssignments()["opp-new-1"]!;
    expect(a.done).toBe(true); // terminal for the sweeper — a human assigns it
    expect(a.managerQueue).toBe(true);
  });

  it("an EMPTY rotation falls back to the line owner — no distribution at all", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readAssignments } = fakeRentalDesk({ etmRoster: [] });
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(0);
    expect(counts.rentalAutoReplies).toBe(0);
    expect(created[0]!.ownerId).toBe("line-owner-id");
    expect(created[0]!.assignedAt).toBeUndefined();
    expect(sent).toHaveLength(0);
    expect(Object.keys(readAssignments())).toHaveLength(0);
  });

  it("the auto-reply fires ONCE per line+customer — a retry/attach never resends", async () => {
    const { desk, sent, readAutoReplied } = fakeRentalDesk();
    const first = fakeTwenty();
    await runWaLeadRelayPass(
      deps({ twenty: first.twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(readAutoReplied()["etm-website:501111111"]).toBeTruthy();
    // The customer writes again; their card now exists (the relay finds its
    // own card by externalId) → ATTACH, and the mark blocks a second reply.
    const second = fakeTwenty({
      byExternalId: { "wa-lead:easyrent:501111111": { id: "opp-new-1", stage: "NEW_REQUEST" } },
    });
    const counts2 = await runWaLeadRelayPass(
      deps({
        twenty: second.twenty,
        client: fakeClient({ existingCard: { id: "opp-new-1", ownerId: "ali-id", name: "#101 WhatsApp direct" } }),
        source: fakeSource([mainLineRow("971501111111", "r2")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts2.attached).toBe(1);
    expect(counts2.rentalAutoReplies).toBe(0);
    expect(sent).toHaveLength(3); // unchanged since pass 1
  });

  it("autoReplyEnabled:false (RENTAL_AUTOREPLY=off) — NO customer greeting, the rest of the flow intact", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent } = fakeRentalDesk({ autoReplyEnabled: false });
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(1); // the rotation still deals the card
    expect(counts.rentalAutoReplies).toBe(0);
    expect(sent.map((s) => s.dedupeKey)).toEqual(["assign:opp-new-1", "mgr-assigned:opp-new-1"]);
    expect(sent.some((s) => s.text === "AUTO-REPLY-TEXT")).toBe(false);
    expect(created[0]!.ownerId).toBe("ali-id");
  });

  it("a non-main rental line (babek-rent) keeps line-owner behaviour even with the desk wired", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent } = fakeRentalDesk();
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1", "babek-rent")]), rentalDesk: desk }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(0);
    expect(counts.rentalAutoReplies).toBe(0);
    expect(created[0]!.ownerId).toBe("line-owner-id");
    expect(sent).toHaveLength(0);
  });

  it("dry-run: the rotation decision is logged but NOTHING is sent or persisted", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readCursors, readAssignments } = fakeRentalDesk();
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]), rentalDesk: desk }),
      { commit: false, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(1); // decided…
    expect(created).toHaveLength(0); // …but nothing was created
    expect(sent).toHaveLength(0);
    expect(readCursors()).toEqual({}); // persisted only after a real create
    expect(Object.keys(readAssignments())).toHaveLength(0);
  });

  it("SALES is byte-identical even if a rentalDesk is miswired into it", async () => {
    const { twenty, created } = fakeTwenty();
    const { desk, sent, readCursors, readAssignments } = fakeRentalDesk();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        instance: "default",
        tenantSlug: "take-auto",
        brandLine: "takeauto",
        source: fakeSource([mainLineRow("971501111111", "r1")]),
        rentalDesk: desk, // misconfiguration on purpose — the pass must ignore it
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(0);
    expect(counts.rentalAutoReplies).toBe(0);
    expect(created[0]!.ownerId).toBe("line-owner-id"); // line routing, unchanged
    expect(created[0]!.assignedAt).toBeUndefined();
    expect(created[0]!.primaryStage).toBeUndefined(); // no salesDesk wired → absent
    expect(sent).toHaveLength(0);
    expect(readCursors()).toEqual({});
    expect(Object.keys(readAssignments())).toHaveLength(0);
  });

  it("without a rentalDesk (RENTAL_DISTRIBUTOR=off) the rental pass is today's behaviour", async () => {
    const { twenty, created } = fakeTwenty();
    const counts = await runWaLeadRelayPass(
      deps({ twenty, source: fakeSource([mainLineRow("971501111111", "r1")]) }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.created).toBe(1);
    expect(counts.rentalAssigned).toBe(0);
    expect(counts.rentalAutoReplies).toBe(0);
    expect(created[0]!.ownerId).toBe("line-owner-id");
    expect(created[0]!.assignedAt).toBeUndefined();
  });
});

// ── Returning-customer distribution on the rental main lines (Ayham, 2026-09-24) ──
//
// An ATTACH on a main line (a customer with an OPEN card writing again) used
// to append the note and ping NOBODY. Now it is dealt like a NEW lead: the
// brand's preferred agent(s) first (RENTAL_RETURNING_PREFERRED_*, a comma list
// round-robins), the plain rotation as the fallback, the manager queue when
// nobody is available. Anti-spam: never over a LIVE assignment, and a gap
// (RENTAL_RETURNING_GAP_HOURS, default 12) after the last one finished. NO
// customer auto-reply — a returning customer is mid-relationship.
describe("runWaLeadRelayPass — returning customers on the rental main lines", () => {
  const AT = new Date("2026-09-24T10:00:00.000Z");
  const FIELDS = new Set([
    "name", "stage", "externalId", "externalSource", "pointOfContact",
    "phoneTail9", "stageDetail", "callSource", "whatsapp", "brandLine",
    "leadNumber", "assignedAt",
  ]);
  // ETM rotation: Ali first (the rotation cursor would pick HIM), Babek second
  // — so a Babek pick proves the PREFERRED list, not the rotation, drove it.
  const ETM_ROSTER = [
    { name: "Ali", phone: "971542445835", memberId: "ali-id" },
    { name: "Babek", phone: "971529965085", memberId: "babek-id" },
  ];
  const CARDIWAN_ROSTER = [
    { name: "Ali", phone: "971542445835", memberId: "ali-id" },
    { name: "Abdullah", phone: "971585809747", memberId: "abdullah-id" },
  ];

  function mainLineRow(tailDigits: string, id: string, line = "etm-website"): LeadRelayRow {
    return {
      id,
      channel: "whatsapp",
      from: `${tailDigits}@s.whatsapp.net`,
      fromPn: tailDigits,
      to: line,
      customerName: "Test Customer",
      body: "Need a Camry for a week, budget 2000 AED",
      createdAt: AT,
    };
  }

  function fakeSource(rows: LeadRelayRow[]): WaLeadRelaySource {
    return {
      loadCheckpoint: async () => null,
      saveCheckpoint: async () => {},
      loadRows: async () => rows,
      loadStaffTails: async () => new Set<string>(),
    };
  }

  /** The OPEN card the tail9 index finds, and the read of that same card. */
  function fakeClient(opts: {
    openOpps?: Record<string, unknown>[];
    existingCard?: Record<string, unknown>;
  } = {}) {
    return {
      mode: "mock",
      get: async (path: string) =>
        path.startsWith("opportunities/")
          ? { data: { opportunity: opts.existingCard ?? {} } }
          : { data: {} },
      post: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      listAll: async function* (_path: string, _params?: Record<string, unknown>) {
        for (const r of opts.openOpps ?? []) yield r;
      },
      batchCreate: async (_path: string, records: Record<string, unknown>[]) =>
        records.map((_, i) => ({ id: `note-${i}` })),
    } as unknown as TwentyClient;
  }

  function fakeTwenty() {
    const created: Record<string, unknown>[] = [];
    const patched: { id: string; patch: Record<string, unknown> }[] = [];
    const twenty: RelayTwenty = {
      findPersonByTail9: async () => ({ id: "person-1" }),
      findOpportunityByExternalId: async () => null,
      createPerson: async () => ({ id: "person-1" }),
      createOpportunity: async (payload) => {
        created.push(payload);
        return { id: `opp-new-${created.length}` };
      },
      patchOpportunity: async (id, patch) => {
        patched.push({ id, patch });
      },
    };
    return { twenty, created, patched };
  }

  function fakeDesk(opts: {
    availability?: Record<string, { status: "available" | "busy" | "off"; busyUntil: Date | null }>;
    preferred?: Partial<Record<"etm" | "cardiwan", { name: string; phone: string; memberId: string | null }[]>>;
    assignments?: Record<string, RentalAssignment>;
    returningGapMs?: number;
    returningAutoReplyEnabled?: boolean;
  } = {}) {
    let cursors: Record<string, number> = {};
    let returningCursors: Record<string, number> = {};
    let autoReplied: Record<string, string> = {};
    let assignments: Record<string, RentalAssignment> = { ...(opts.assignments ?? {}) };
    const sent: { line: string; toDigits: string; text: string; dedupeKey: string }[] = [];
    const desk: RentalDeskRouting = {
      rosterFor: (brand) => (brand === "etm" ? ETM_ROSTER : CARDIWAN_ROSTER),
      managerMemberIdFor: () => "ayham-id",
      managerPhoneFor: () => "971581417020",
      managerNameFor: () => "Ayham",
      autoReplyText: "AUTO-REPLY-TEXT",
      texts: DEFAULT_TEXTS,
      acceptWindowMs: 10 * 60_000,
      returningPreferredFor: (brand) => opts.preferred?.[brand] ?? [],
      returningGapMs: opts.returningGapMs,
      returningAutoReplyEnabled: opts.returningAutoReplyEnabled,
      loadCursors: async () => ({ ...cursors }),
      saveCursors: async (c) => {
        cursors = c;
      },
      loadAvailability: async () => opts.availability ?? {},
      loadAutoReplied: async () => ({ ...autoReplied }),
      saveAutoReplied: async (m) => {
        autoReplied = m;
      },
      loadAssignments: async () => ({ ...assignments }),
      saveAssignments: async (m) => {
        assignments = m;
      },
      loadReturningCursors: async () => ({ ...returningCursors }),
      saveReturningCursors: async (c) => {
        returningCursors = c;
      },
      sendWhatsApp: async (input) => {
        sent.push(input);
        return true;
      },
    };
    return {
      desk,
      sent,
      readCursors: () => cursors,
      readReturningCursors: () => returningCursors,
      readAssignments: () => assignments,
    };
  }

  function deps(over: Partial<WaLeadRelayDeps>): WaLeadRelayDeps {
    return {
      client: fakeClient(),
      twenty: fakeTwenty().twenty,
      instance: "rental",
      tenantSlug: "easyrent",
      brandLine: "easyrent",
      opportunityFields: FIELDS,
      source: fakeSource([]),
      complete: null,
      ownerIdForLine: () => "line-owner-id",
      ...over,
    };
  }

  /** One open card (#923) that a main-line attach lands on. */
  function open923(tail = "528467790") {
    return {
      openOpp: { id: "opp-923", phoneTail9: tail, brandLine: "easyrent", stage: "RETURNING_LEAD", updatedAt: "2026-09-20T10:00:00.000Z" },
      existingCard: { id: "opp-923", ownerId: "babek-id", leadNumber: "923", name: "#923 WhatsApp direct" },
    };
  }

  it("attach on a main line, no live assignment → the PREFERRED agent, assignment recorded, NO auto-reply", async () => {
    const { twenty, created, patched } = fakeTwenty();
    const { desk, sent, readAssignments, readReturningCursors, readCursors } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] }, // Babek
    });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.created).toBe(0);
    expect(created).toHaveLength(0); // an attach never mints a card
    expect(counts.rentalReturningAssigned).toBe(1);
    expect(counts.rentalAssigned).toBe(0); // no NEW-card distribution happened
    // The card's owner is now the assignee, and the acceptance clock is stamped.
    expect(patched.some((p) => p.id === "opp-923" && p.patch.ownerId === "babek-id")).toBe(true);
    expect(patched.find((p) => p.id === "opp-923" && p.patch.ownerId === "babek-id")!.patch.assignedAt).toBeTruthy();
    // The assignment record — the sweeper enforces the window exactly like a NEW lead.
    const a = readAssignments()["opp-923"]!;
    expect(a.agentName).toBe("Babek");
    expect(a.memberId).toBe("babek-id");
    expect(a.leadNumber).toBe("923"); // the EXISTING lead number, not a new one
    expect(a.returning).toBe(true);
    expect(a.done).toBe(false);
    // NO customer greeting on a returning assignment…
    expect(counts.rentalAutoReplies).toBe(0);
    expect(sent.some((s) => s.text === "AUTO-REPLY-TEXT")).toBe(false);
    // …but the agent + manager pings went out, from the main line, returning worded.
    expect(sent.map((s) => s.dedupeKey)).toEqual(["assign:opp-923:Babek", "mgr-returning:opp-923:Babek"]);
    expect(sent[0]!.line).toBe("etm-website");
    expect(sent[0]!.toDigits).toBe("971529965085"); // Babek
    expect(sent[0]!.text).toContain("🔁 Returning customer");
    expect(sent[0]!.text).toContain("#923");
    expect(sent[0]!.text).toContain("+971528467790");
    expect(sent[1]!.text).toContain("🔁 Returning customer");
    expect(readReturningCursors()).toEqual({ etm: 1 });
    expect(readCursors()).toEqual({}); // the rotation cursor was NOT touched
  });

  it("preferred agent unavailable → the normal rotation takes over", async () => {
    const { twenty, patched } = fakeTwenty();
    const { desk, sent, readAssignments, readCursors } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] }, // Babek preferred…
      availability: { babek: { status: "off", busyUntil: null } }, // …but off
    });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalReturningAssigned).toBe(1);
    expect(readAssignments()["opp-923"]!.agentName).toBe("Ali"); // rotation's first available
    expect(patched.some((p) => p.patch.ownerId === "ali-id")).toBe(true);
    expect(sent.find((s) => s.dedupeKey.startsWith("assign:"))!.toDigits).toBe("971542445835");
    expect(readCursors()).toEqual({ etm: 1 }); // the ROTATION cursor moved
    expect(readAssignments()["opp-923"]!.returning).toBe(true);
  });

  it("a preferred LIST alternates across passes — the cursor is persisted, not in-process", async () => {
    const { desk, readAssignments, readReturningCursors } = fakeDesk({
      preferred: { cardiwan: CARDIWAN_ROSTER }, // Ali,Abdullah
    });
    for (const [i, tail] of ["971501111111", "971502222222"].entries()) {
      const card = {
        openOpp: { id: `opp-c${i}`, phoneTail9: tail.slice(-9), brandLine: "cardiwan", stage: "NEW_REQUEST", updatedAt: "2026-09-20T10:00:00.000Z" },
        existingCard: { id: `opp-c${i}`, ownerId: null, leadNumber: String(930 + i), name: `#${930 + i}` },
      };
      const { twenty } = fakeTwenty();
      await runWaLeadRelayPass(
        deps({
          twenty,
          tenantSlug: "cardiwan",
          brandLine: "cardiwan",
          client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
          source: fakeSource([mainLineRow(tail, `r${i}`, "cardiwan")]),
          rentalDesk: desk,
        }),
        { commit: true, sweepEveryMs: 0 }
      );
    }
    expect(readAssignments()["opp-c0"]!.agentName).toBe("Ali");
    expect(readAssignments()["opp-c1"]!.agentName).toBe("Abdullah");
    expect(readReturningCursors()).toEqual({ cardiwan: 2 });
  });

  it("a LIVE assignment suppresses re-distribution — the note lands, nobody is pinged", async () => {
    const live: RentalAssignment = {
      brand: "etm",
      line: "etm-website",
      tenantSlug: "easyrent",
      agentName: "Ali",
      memberId: "ali-id",
      phone: "971542445835",
      customerTail9: "528467790",
      customerPhone: "971528467790",
      leadNumber: "923",
      assignedAt: new Date().toISOString(),
      acceptedAt: null,
      ignoredNames: [],
      done: false,
    };
    const { twenty, patched } = fakeTwenty();
    const { desk, sent, readAssignments } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
      assignments: { "opp-923": live },
    });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1); // the note still lands
    expect(counts.rentalReturningAssigned).toBe(0);
    expect(sent).toHaveLength(0);
    expect(patched.some((p) => "ownerId" in p.patch)).toBe(false);
    expect(readAssignments()["opp-923"]!.agentName).toBe("Ali"); // untouched
  });

  it("the GAP: a finished assignment inside 12h suppresses; past it, the customer distributes again", async () => {
    const done2hAgo: RentalAssignment = {
      brand: "etm",
      line: "etm-website",
      tenantSlug: "easyrent",
      agentName: "Babek",
      memberId: "babek-id",
      phone: "971529965085",
      customerTail9: "528467790",
      customerPhone: "971528467790",
      leadNumber: "923",
      assignedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      acceptedAt: new Date(Date.now() - 2 * 3600_000).toISOString(), // 2h ago < 12h gap
      ignoredNames: [],
      done: true,
    };
    const card = open923();
    const { desk, sent } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
      assignments: { "opp-923": done2hAgo },
    });
    const counts = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.rentalReturningAssigned).toBe(0); // a chatty customer re-pings nobody
    expect(sent).toHaveLength(0);

    // 13h of quiet → a new visit → distribute again (same desk = same store).
    const quiet: RentalAssignment = {
      ...done2hAgo,
      assignedAt: new Date(Date.now() - 14 * 3600_000).toISOString(),
      acceptedAt: new Date(Date.now() - 13 * 3600_000).toISOString(),
    };
    const second = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
      assignments: { "opp-923": quiet },
    });
    const counts2 = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r2")]),
        rentalDesk: second.desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts2.rentalReturningAssigned).toBe(1);
    expect(second.readAssignments()["opp-923"]!.done).toBe(false); // live again
    expect(second.readAssignments()["opp-923"]!.agentName).toBe("Babek");
    expect(second.sent.map((s) => s.dedupeKey)).toEqual(["assign:opp-923:Babek", "mgr-returning:opp-923:Babek"]);
  });

  it("the #923 shape: newest row on an AGENT line, main-line visit earlier in the window → still distributes, pings leave from the main line", async () => {
    const { desk, sent, readAssignments } = fakeDesk({ preferred: { etm: [ETM_ROSTER[1]!] } });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([
          // 17:51 the customer wrote the ETM MAIN line…
          { ...mainLineRow("971528467790", "r1", "etm-website"), createdAt: new Date(AT.getTime() - 40 * 60_000) },
          // …18:34 he wrote Mohamed's personal line — the thread keys there.
          { ...mainLineRow("971528467790", "r2", "mohamed-etm") },
        ]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalReturningAssigned).toBe(1);
    expect(readAssignments()["opp-923"]!.agentName).toBe("Babek");
    expect(readAssignments()["opp-923"]!.line).toBe("etm-website");
    expect(sent.map((s) => s.line)).toEqual(["etm-website", "etm-website"]); // never mohamed-etm
    expect(sent[0]!.dedupeKey).toBe("assign:opp-923:Babek");
  });

  it("a NON-mainline attach (babek-rent) distributes nothing, exactly as before", async () => {    const { desk, sent, readAssignments } = fakeDesk({ preferred: { etm: [ETM_ROSTER[1]!] } });
    const card = {
      openOpp: { id: "opp-x", phoneTail9: "528467790", brandLine: "easyrent", stage: "NEW_REQUEST", updatedAt: "2026-09-20T10:00:00.000Z" },
      existingCard: { id: "opp-x", ownerId: "babek-id", leadNumber: "900", name: "#900" },
    };
    const counts = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1", "babek-rent")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.attached).toBe(1);
    expect(counts.rentalReturningAssigned).toBe(0);
    expect(sent).toHaveLength(0);
    expect(Object.keys(readAssignments())).toHaveLength(0);
  });

  it("nobody available on a returning attach → the manager queue, same as a NEW lead", async () => {
    const { twenty, patched } = fakeTwenty();
    const { desk, sent, readAssignments } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
      availability: {
        ali: { status: "busy", busyUntil: new Date(Date.now() + 30 * 60_000) },
        babek: { status: "off", busyUntil: null },
      },
    });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        twenty,
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalReturningAssigned).toBe(0);
    expect(counts.rentalAllBusy).toBe(1);
    expect(patched.some((p) => p.patch.ownerId === "ayham-id")).toBe(true);
    const a = readAssignments()["opp-923"]!;
    expect(a.done).toBe(true);
    expect(a.managerQueue).toBe(true);
    expect(a.returning).toBe(true);
    expect(sent.map((s) => s.dedupeKey)).toEqual(["mgr-allbusy:opp-923"]);
  });

  it("RENTAL_RETURNING_AUTOREPLY=on opts the customer greeting back in (once-only mark shared)", async () => {
    const { desk, sent } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
      returningAutoReplyEnabled: true,
    });
    const card = open923();
    const counts = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: true, sweepEveryMs: 0 }
    );
    expect(counts.rentalAutoReplies).toBe(1);
    expect(sent[0]!.dedupeKey).toBe("autoreply:etm-website:528467790");
  });

  it("dry-run: the decision is logged, NOTHING is sent or persisted", async () => {
    const { desk, sent, readAssignments, readReturningCursors } = fakeDesk({
      preferred: { etm: [ETM_ROSTER[1]!] },
    });
    const card = open923();
    const logs: string[] = [];
    const counts = await runWaLeadRelayPass(
      deps({
        client: fakeClient({ openOpps: [card.openOpp], existingCard: card.existingCard }),
        source: fakeSource([mainLineRow("971528467790", "r1")]),
        rentalDesk: desk,
      }),
      { commit: false, sweepEveryMs: 0, logger: (l) => logs.push(l) }
    );
    expect(counts.attached).toBe(1);
    expect(logs.some((l) => l.includes("returning→Babek(preferred)"))).toBe(true);
    expect(sent).toHaveLength(0);
    expect(readAssignments()["opp-923"]).toBeUndefined();
    expect(readReturningCursors()).toEqual({});
  });
});

describe("returningAssignGate — the anti-spam decision", () => {
  const base: RentalAssignment = {
    brand: "etm",
    line: "etm-website",
    tenantSlug: "easyrent",
    agentName: "Babek",
    memberId: "babek-id",
    phone: "971529965085",
    customerTail9: "528467790",
    customerPhone: "971528467790",
    leadNumber: "923",
    assignedAt: "2026-09-24T08:00:00.000Z",
    acceptedAt: null,
    ignoredNames: [],
    done: true,
  };
  const NOW = new Date("2026-09-24T12:00:00.000Z");
  const GAP = 12 * 3600_000;

  it("no assignment → ok; a live one → live; a corrupt stamp → ok", () => {
    expect(returningAssignGate(undefined, NOW, GAP)).toBe("ok");
    expect(returningAssignGate({ ...base, done: false }, NOW, GAP)).toBe("live");
    expect(returningAssignGate({ ...base, assignedAt: "junk" }, NOW, GAP)).toBe("ok");
  });

  it("inside the gap → gap; past it → ok; acceptedAt wins over assignedAt", () => {
    expect(returningAssignGate(base, NOW, GAP)).toBe("gap"); // 4h < 12h
    expect(returningAssignGate({ ...base, assignedAt: "2026-09-23T23:00:00.000Z" }, NOW, GAP)).toBe("ok"); // 13h
    // Accepted 1h ago although assigned 20h ago — the LAST ping/accept time rules.
    expect(
      returningAssignGate(
        { ...base, assignedAt: "2026-09-23T16:00:00.000Z", acceptedAt: "2026-09-24T11:00:00.000Z" },
        NOW,
        GAP
      )
    ).toBe("gap");
  });
});
