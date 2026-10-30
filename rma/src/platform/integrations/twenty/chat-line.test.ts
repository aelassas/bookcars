// chat-line.ts — the one-line-per-message rendering the normalization pass
// (scripts/merge-wa-conversation-notes.ts) rewrites every historic note into.
// These tests pin the contract the owner reviewed on 2026-08-29: media is ONE
// compact line, links only for files that exist, and every historic writer's
// shape parses back to the same identity (that is what makes the pass
// idempotent).
import { describe, expect, it } from "vitest";
import {
  canonText,
  dubaiMinute,
  parseMediaText,
  renderMediaLine,
  splitSpeaker,
} from "./chat-line";

describe("parseMediaText — every historic shape → kind + words + link", () => {
  const cases: [string, string, string][] = [
    // [input, expected kind, expected core text]
    ["[voice/audio] [voice] بعد حدا بعد حدا", "voice", "بعد حدا بعد حدا"],
    ["[voice/audio]", "voice", ""],
    ["🎙 Voice — Yeah sure [▶️ Listen](https://h/api/media/v1.abc.def)", "voice", "Yeah sure"],
    ["🎙 Voice message (no transcript) [▶️ Listen](https://h/api/media/v1.a.b)", "voice", ""],
    ["🎙 Voice note (unrecoverable — line was offline)", "voice", ""],
    ["[image] BMW i4 (blue), well-maintained interior.", "image", "BMW i4 (blue), well-maintained interior."],
    ["🖼 Photo — Toyota Camry, white [🔗 View](https://h/api/media/v1.a.b)", "image", "Toyota Camry, white"],
    ["📷 Photo (unrecoverable)", "image", ""],
    ["📄 Document — Emirates ID [🔗 View](https://h/api/media/v1.a.b)", "document", "Emirates ID"],
    ["[no message]", "nomessage", ""],
    ["[sticker]", "sticker", ""],
    ["[non-text]", "nontext", ""],
    ["plain text here", "text", "plain text here"],
  ];
  for (const [input, kind, text] of cases) {
    it(JSON.stringify(input.slice(0, 44)), () => {
      const p = parseMediaText(input);
      expect(p.kind).toBe(kind);
      expect(p.text).toBe(text);
    });
  }

  it("extracts the carried link", () => {
    expect(parseMediaText("🎙 Voice — hi [▶️ Listen](https://h/api/media/v1.abc.def)").link).toBe(
      "https://h/api/media/v1.abc.def"
    );
  });
});

describe("renderMediaLine — one compact line, honest when the file is gone", () => {
  it("voice with a file renders clickable, not transcribed (Ayham 2026-08-30)", () => {
    expect(renderMediaLine({ kind: "voice", text: "hi", link: "U" }, "U", false)).toBe(
      "🎙 Voice · [🔗 Listen](U)"
    );
  });
  it("voice with neither file nor transcript — the counted honest stub", () => {
    expect(renderMediaLine({ kind: "voice", text: "", link: null }, null, true)).toBe(
      "🎙 Voice note (unrecoverable — line was offline)"
    );
    expect(renderMediaLine({ kind: "voice", text: "", link: null }, null, false)).toBe(
      "🎙 Voice note (unrecoverable)"
    );
  });
  it("photo with no file keeps the description, truncated to 80", () => {
    expect(renderMediaLine({ kind: "image", text: "d".repeat(100), link: null }, null, false)).toBe(
      `📷 Photo — ${"d".repeat(79)}…`
    );
  });
  it("[no message] is dropped, not rendered", () => {
    expect(renderMediaLine({ kind: "nomessage", text: "", link: null }, null, false)).toBeNull();
  });
  it("round-trips through parseMediaText — the LINK is the identity now", () => {
    const line = renderMediaLine({ kind: "voice", text: "hello", link: "U" }, "U", false)!;
    const p = parseMediaText(line);
    expect(p).toMatchObject({ kind: "voice", link: "U" });
    // Re-rendering the parse yields the same line: the pipe is idempotent even
    // though the transcript no longer travels in the card.
    expect(renderMediaLine(p, "U", false)).toBe(line);
  });

  it("two different voice files stay two lines", () => {
    expect(canonText("🎙 Voice · [🔗 Listen](https://h/api/media/v1.a.b)")).not.toBe(
      canonText("🎙 Voice · [🔗 Listen](https://h/api/media/v1.c.d)")
    );
  });
});

describe("canonText — the cross-format dedupe identity", () => {
  it("the same voice message in three writers' clothes is one line", () => {
    const a = canonText("[voice/audio] [voice] بعد حدا");
    const b = canonText("🎙 Voice — بعد حدا · [🔗 Listen](https://h/api/media/v1.a.b)");
    const c = canonText("🎙 Voice message (no transcript)"); // empty == bare voice
    expect(a).toBe("بعد حدا");
    expect(b).toBe(a);
    expect(c).toBe("");
  });
});

describe("splitSpeaker — names only when known", () => {
  const known = new Set(["Khalil", "Ali (EasyRent)"]);
  it("strips a known client/officer prefix", () => {
    expect(splitSpeaker("Khalil: معلم انا مسافر", known)).toEqual({
      speaker: "Khalil",
      text: "معلم انا مسافر",
    });
    expect(splitSpeaker("Ali (EasyRent): تمام", known).speaker).toBe("Ali (EasyRent)");
  });
  it("never mangles a customer text that merely contains a colon", () => {
    expect(splitSpeaker("note: pay at 5", known)).toEqual({ speaker: null, text: "note: pay at 5" });
  });
  it("tolerates pushname whitespace drift between import eras", () => {
    // The note line was written when the profile read "Gt4  Rent A Car Ahmad"
    // (double space); today's row says "Gt4 Rent A Car Ahmad". Same speaker.
    const drifted = new Set(["Gt4 Rent A Car Ahmad"]);
    expect(splitSpeaker("Gt4  Rent A Car Ahmad: Tomorrow morning", drifted)).toEqual({
      speaker: "Gt4 Rent A Car Ahmad",
      text: "Tomorrow morning",
    });
  });
  it("handles long multilingual business names (>45 chars)", () => {
    const dragon = "DRAGON CAR RENTAL L.L.C. دراجون لتأجير السيارات ذ.م.م ｜龙城租车行";
    expect(splitSpeaker(`${dragon}: salam`, new Set([dragon]))).toEqual({
      speaker: dragon,
      text: "salam",
    });
  });
});

describe("dubaiMinute", () => {
  it("renders the office wall clock", () => {
    expect(dubaiMinute(Date.UTC(2026, 7, 29, 12, 29))).toBe("2026-08-29 16:29");
  });
});

// Ayham, 2026-08-30: "do not transcribe photos or audio — just make them
// clickable to view or listen". So when the file IS on disk the line carries
// only the label and the link; the description stays in `message.body` (it is
// what lets a photo-only enquiry qualify as a lead) but never reaches the card.
//
// When there is NO file the description is kept: with nothing to click, a bare
// "📷 Photo" would erase the message from the conversation entirely — and every
// such line would render identically, which the note dedupe reads as one line.
describe("renderMediaLine — clickable, not transcribed (Ayham 2026-08-30)", () => {
  it("voice with a file: label + Listen, no transcript", () => {
    expect(renderMediaLine({ kind: "voice", text: "بعد حدا", link: "U" }, "U", false)).toBe(
      "🎙 Voice · [🔗 Listen](U)"
    );
  });

  it("photo with a file: label + View, no description", () => {
    expect(
      renderMediaLine({ kind: "image", text: "Cadillac Escalade, black", link: "U" }, "U", false)
    ).toBe("📷 Photo · [🔗 View](U)");
  });

  it("document with a file: label + View, no OCR text", () => {
    expect(renderMediaLine({ kind: "document", text: "licence no 123", link: "U" }, "U", false)).toBe(
      "📄 Document · [🔗 View](U)"
    );
  });

  it("no file: the description is the only trace, so it stays", () => {
    expect(renderMediaLine({ kind: "image", text: "Cadillac Escalade", link: null }, null, false)).toBe(
      "📷 Photo — Cadillac Escalade"
    );
  });

  it("no file and no description is still the honest stub", () => {
    expect(renderMediaLine({ kind: "voice", text: "", link: null }, null, false)).toBe(
      "🎙 Voice note (unrecoverable)"
    );
  });
});

// Cards created just after midnight were named "2026-09-01 24:28" and every
// note line between 00:00 and 00:59 read "24:15 ← …". Ayham reads both.
//
// `hour12: false` is NOT the same as a 24-hour clock: in V8 it selects the h24
// cycle, which numbers the midnight hour 24 instead of 00. Only `hourCycle:
// "h23"` gives the office wall clock. Found in production 2026-09-01 in the
// relay's own CREATE log.
describe("dubaiMinute — the midnight hour is 00, never 24", () => {
  it("00:28 Dubai is 00:28, not 24:28", () => {
    // Dubai is UTC+4 year-round.
    expect(dubaiMinute(Date.parse("2026-08-31T20:28:00Z"))).toBe("2026-09-01 00:28");
  });

  it("the last minute before midnight still belongs to the old day", () => {
    expect(dubaiMinute(Date.parse("2026-08-31T19:59:00Z"))).toBe("2026-08-31 23:59");
  });

  it("midday is unaffected", () => {
    expect(dubaiMinute(Date.parse("2026-09-01T08:05:00Z"))).toBe("2026-09-01 12:05");
  });
});
