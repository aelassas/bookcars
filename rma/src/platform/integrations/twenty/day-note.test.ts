// The note's line-level idempotency. The case that matters: on 2026-08-30 the
// media rendering dropped its transcript (Ayham: "make them clickable, don't
// transcribe"), so a photo/voice already filed under the OLD shape must not be
// appended a second time under the new one. The file token is the bridge.
import { describe, expect, it } from "vitest";
import {
  lineAlreadyPresent,
  lineIdentity,
  missingNoteTargets,
  noteLine,
  sortNoteBody,
} from "./day-note";

const URL = "https://hub.takeauto.tech/api/media/v1.abc.def";

describe("lineAlreadyPresent", () => {
  it("plain text still matches literally", () => {
    expect(lineAlreadyPresent("09:00 ← Need a Camry", "09:00 ← Need a Camry")).toBe(true);
    expect(lineAlreadyPresent("09:00 ← Need a Camry", "09:00 ← Need a Tesla")).toBe(false);
  });

  it("the new clickable line finds its own older transcribed shape", () => {
    const note = `08:00 ← 🎙 Voice — بعد حدا · [🔗 Listen](${URL})`;
    const now = `08:00 ← 🎙 Voice · [🔗 Listen](${URL})`;
    expect(lineAlreadyPresent(note, now)).toBe(true);
  });

  it("a photo already filed with its description is not re-appended", () => {
    const note = `08:00 ← 📷 Photo — Cadillac Escalade, black · [🔗 View](${URL})`;
    const now = `08:00 ← 📷 Photo · [🔗 View](${URL})`;
    expect(lineAlreadyPresent(note, now)).toBe(true);
  });

  it("a different file is still a new line", () => {
    const note = `08:00 ← 📷 Photo · [🔗 View](${URL})`;
    const other = "08:00 ← 📷 Photo · [🔗 View](https://hub.takeauto.tech/api/media/v1.zzz.yyy)";
    expect(lineAlreadyPresent(note, other)).toBe(false);
  });

  it("media with no file falls back to the literal line", () => {
    const note = "08:00 ← 🎙 Voice note (unrecoverable)";
    expect(lineAlreadyPresent(note, "08:00 ← 🎙 Voice note (unrecoverable)")).toBe(true);
    expect(lineAlreadyPresent(note, "09:30 ← 🎙 Voice note (unrecoverable)")).toBe(false);
  });
});

// Speaker labels arrived in stages: bare lines (before 2026-08-29), then
// `HH:MM ← Name: text`, then `C:`/`A:` (owner, 2026-08-30). The note dedupe
// compares whole lines, so each change would have re-appended every historic
// line into all 1172 conversation notes. The identity of a text line is
// therefore time + direction + words — the speaker label is presentation.
describe("lineIdentity — the speaker label is not part of the message", () => {
  it("reads a bare line", () => {
    expect(lineIdentity("14:38 ← Salam alaikum")).toBe("14:38|←|Salam alaikum");
  });

  it("a bare line and the same line labelled C: are one message", () => {
    expect(lineIdentity("14:38 ← C: Salam alaikum")).toBe(lineIdentity("14:38 ← Salam alaikum"));
  });

  it("every historic labelling of the same reply agrees", () => {
    const bare = lineIdentity("14:38 → I'm Babek");
    expect(lineIdentity("14:38 → A: I'm Babek")).toBe(bare);
    expect(lineIdentity("14:38 → Babek: I'm Babek")).toBe(bare);
    expect(lineIdentity("14:38 → Ali (EasyRent): I'm Babek")).toBe(bare);
  });

  it("direction is part of the identity — the same words each way are two messages", () => {
    expect(lineIdentity("14:38 → C: ok")).not.toBe(lineIdentity("14:38 ← C: ok"));
  });

  it("time is part of the identity", () => {
    expect(lineIdentity("14:38 ← C: ok")).not.toBe(lineIdentity("14:39 ← C: ok"));
  });

  it("a day header or anything unparseable has no identity", () => {
    expect(lineIdentity("**— 2026-08-28 —**")).toBeNull();
    expect(lineIdentity("")).toBeNull();
  });
});

describe("lineAlreadyPresent — survives a change of speaker label", () => {
  it("does not re-append a line already filed without its label", () => {
    const note = "**— 2026-08-28 —**\n14:38 ← Salam alaikum\n14:38 → I'm Babek";
    expect(lineAlreadyPresent(note, "14:38 ← C: Salam alaikum")).toBe(true);
    expect(lineAlreadyPresent(note, "14:38 → A: I'm Babek")).toBe(true);
  });

  it("a genuinely new line is still new", () => {
    const note = "14:38 ← C: Salam alaikum";
    expect(lineAlreadyPresent(note, "14:39 ← C: Tomorrow I need it")).toBe(false);
    expect(lineAlreadyPresent(note, "14:38 → A: Hi")).toBe(false);
  });
});

// Owner, 2026-08-30, looking at a real Dubizzle conversation rendered with bare
// arrows: "this is not right — there is at least client C and our sales agent
// A, how to differ who said what". Arrows alone were too subtle to read.
describe("noteLine — C: for the client, A: for us", () => {
  const AT = new Date(2026, 7, 28, 14, 38);

  it("labels an inbound line C:", () => {
    expect(noteLine("inbound", AT, "Salam alaikum")).toBe("14:38 ← C: Salam alaikum");
  });

  it("labels an outbound line A:", () => {
    expect(noteLine("outbound", AT, "I'm Babek")).toBe("14:38 → A: I'm Babek");
  });

  it("labels regardless of whether a name was resolved", () => {
    // Outbound rows carry the customer's phone in `to` and no line slug, so the
    // agent frequently cannot be named — the side must still be obvious.
    expect(noteLine("outbound", AT, "Sure", null)).toBe("14:38 → A: Sure");
    expect(noteLine("inbound", AT, "Ok", "♾️")).toBe("14:38 ← C: Ok");
  });
});

// A conversation note is created the first time a customer writes; the CARD is
// often created later, by the lead relay, once the thread qualifies. Nothing
// ever went back to link the two, so those cards opened on "Notes 0" while the
// whole conversation sat one table away — Ayham, 2026-08-31, card #619: "this
// lead has no messages", and it was far from the only one.
//
// `missingNoteTargets` is that gap in one testable place: given what the note
// is already attached to, it returns only the links that still have to be made.
describe("missingNoteTargets — link an existing note to a card made later", () => {
  const NOTE = "note-1";

  it("adds the opportunity when the note only reached the person", () => {
    expect(
      missingNoteTargets(NOTE, { personId: "p1", opportunityId: "o1" }, [{ targetPersonId: "p1" }])
    ).toEqual([{ noteId: NOTE, targetOpportunityId: "o1" }]);
  });

  it("adds nothing when both links already exist", () => {
    expect(
      missingNoteTargets(NOTE, { personId: "p1", opportunityId: "o1" }, [
        { targetPersonId: "p1" },
        { targetOpportunityId: "o1" },
      ])
    ).toEqual([]);
  });

  it("adds both when the note is attached to nothing", () => {
    expect(missingNoteTargets(NOTE, { personId: "p1", opportunityId: "o1" }, [])).toEqual([
      { noteId: NOTE, targetPersonId: "p1" },
      { noteId: NOTE, targetOpportunityId: "o1" },
    ]);
  });

  it("never invents a link the caller did not ask for", () => {
    expect(missingNoteTargets(NOTE, { personId: null, opportunityId: "o1" }, [])).toEqual([
      { noteId: NOTE, targetOpportunityId: "o1" },
    ]);
    expect(missingNoteTargets(NOTE, { personId: null, opportunityId: null }, [])).toEqual([]);
  });

  it("is not confused by links to OTHER records", () => {
    expect(
      missingNoteTargets(NOTE, { personId: "p1", opportunityId: "o1" }, [
        { targetPersonId: "someone-else" },
        { targetOpportunityId: "another-card" },
      ])
    ).toEqual([
      { noteId: NOTE, targetPersonId: "p1" },
      { noteId: NOTE, targetOpportunityId: "o1" },
    ]);
  });
});

// Lines must read in the order they were SPOKEN, not the order we learned them.
//
// WhatsApp hides a sender behind an @lid, so an agent's reply arrives with the
// LINE slug in `to` and no phone at all; it can only be attributed once
// wa_identity learns the mapping — which happens when the customer writes
// again. 208 of 1,554 outbound rows over two days were in that state.
//
// The note only ever appended, so such a reply landed at the END. Ayham,
// 2026-08-31, on card #640 (+971585126076):
//
//     15:25 ← C: Thanks Abdullah. The Model Y at 270/day…
//     15:26 ← C: One more thing before I commit…
//     15:11 → A: And if you need it with 0 deposit…     ← spoken FIRST
//     15:28 → A: Let me confirm the car will be available…
//
// The content was right and correctly attributed; the reading order was not.
describe("sortNoteBody — a late-resolved line takes its rightful place", () => {
  const HEADER = "[💬 WhatsApp +971585126076](https://web.whatsapp.com/send?phone=971585126076)";

  it("puts an out-of-order reply back where it was spoken", () => {
    const body = [
      HEADER,
      "**— 2026-08-31 —**",
      "15:25 ← C: Thanks Abdullah",
      "15:26 ← C: One more thing",
      "15:11 → A: And if you need it with 0 deposit",
      "15:28 → A: Let me confirm",
    ].join("\n");
    expect(sortNoteBody(body).split("\n")).toEqual([
      HEADER,
      "**— 2026-08-31 —**",
      "15:11 → A: And if you need it with 0 deposit",
      "15:25 ← C: Thanks Abdullah",
      "15:26 ← C: One more thing",
      "15:28 → A: Let me confirm",
    ]);
  });

  it("keeps days apart and in order", () => {
    const body = [
      HEADER,
      "**— 2026-08-30 —**",
      "09:00 ← C: yesterday",
      "**— 2026-08-31 —**",
      "10:00 ← C: today",
      "08:00 → A: today, learned late",
    ].join("\n");
    expect(sortNoteBody(body).split("\n")).toEqual([
      HEADER,
      "**— 2026-08-30 —**",
      "09:00 ← C: yesterday",
      "**— 2026-08-31 —**",
      "08:00 → A: today, learned late",
      "10:00 ← C: today",
    ]);
  });

  it("is idempotent — a sorted note is unchanged", () => {
    const body = [HEADER, "**— 2026-08-31 —**", "10:00 ← C: a", "11:00 → A: b"].join("\n");
    expect(sortNoteBody(body)).toBe(body);
  });

  it("never drops a line it cannot place", () => {
    const body = [HEADER, "some stray prose", "**— 2026-08-31 —**", "10:00 ← C: a"].join("\n");
    const out = sortNoteBody(body);
    expect(out).toContain("some stray prose");
    expect(out).toContain("10:00 ← C: a");
    expect(out.split("\n").length).toBe(4);
  });

  it("leaves a note with no day header exactly as it is", () => {
    const body = [HEADER, "10:00 ← C: a"].join("\n");
    expect(sortNoteBody(body)).toBe(body);
  });
});
