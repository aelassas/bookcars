/**
 * chat-line.ts — the ONE rendering of a WhatsApp message inside a
 * conversation note, shared by the historical normalization
 * (scripts/merge-wa-conversation-notes.ts) and readable by every past
 * writer's shape.
 *
 * The line format the notes converge on (owner, 2026-08-29 — "the notes
 * should READ like WhatsApp"):
 *
 *   **— 2026-08-29 —**
 *   15:58 ← Khalil: معلم انا مسافر ليوم
 *   16:14 → Ali (EasyRent): 🎙 Voice — معلم السبعة واربعين… · [🔗 Listen](…)
 *
 * A media item is ONE compact line. The AI photo description stays (≤80
 * chars) with a clickable View; a voice note keeps its transcript with a
 * Listen link. The link exists only when the file is on disk — a dead link
 * is worse than no link, and what is gone says so honestly:
 * `🎙 Voice note (unrecoverable — line was offline)`.
 *
 * Everything here is PURE — no DB, no disk, no env. The script checks the
 * filesystem and passes the resulting link (or null) in.
 */

/** epoch ms → "YYYY-MM-DD HH:MM" in Dubai (the office wall clock). */
const DUBAI_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai",
  year: "numeric", month: "2-digit", day: "2-digit",
  // hourCycle, NOT `hour12: false`: on node@20 the latter numbers the midnight
  // hour 24, so every line spoken between 00:00 and 00:59 read "24:15 ← …".
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function dubaiMinute(ms: number): string {
  const parts = DUBAI_FMT.formatToParts(new Date(ms));
  const at = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${at("year")}-${at("month")}-${at("day")} ${at("hour")}:${at("minute")}`;
}

export const flatText = (text: string): string => text.replace(/\s+/g, " ").trim();

export type MediaKind =
  | "voice" | "image" | "document" | "video" | "sticker" | "nontext" | "nomessage" | "text";

export interface MediaParsed {
  kind: MediaKind;
  /** The words without any render prefix or link — the identity of the line. */
  text: string;
  /** A media link the line already carried (any historic label), if any. */
  link: string | null;
}

/** Historic + current link labels: qc wrote ▶️ Listen / 🔗 View, the
 *  normalized shape is 🔗 Listen / 🔗 View. */
const LINK_RE = /\s*(?:·\s*)?\[(?:▶️|🔗)\s*(?:Listen|View)\]\(([^)]*)\)/g;

/**
 * The placeholder/render prefixes a message line can wear, oldest importer
 * shape first. Emojis are literal alternations, never character classes —
 * without the u flag `[🖼📷]` matches lone surrogates and misses.
 */
const PLACEHOLDER_PREFIXES: { re: RegExp; kind: MediaKind }[] = [
  { re: /^\[voice\/audio\]\s*/i, kind: "voice" },
  { re: /^\[(?:voice|audio)\]\s*/i, kind: "voice" },
  { re: /^🎙\s*Voice(?:\s*message)?\s*—\s*/i, kind: "voice" },
  { re: /^🎙\s*Voice(?:\s*(?:message|note))?\s*\(no transcript\)\s*/i, kind: "voice" },
  { re: /^🎙\s*Voice\s*note\s*/i, kind: "voice" },
  // Bare label — the clickable shape written since 2026-08-30 ("🎙 Voice ·
  // [🔗 Listen](…)"), once LINK_RE has taken the link off the end. Must stay
  // AFTER the more specific voice patterns, which it would otherwise shadow.
  { re: /^🎙\s*Voice\s*/i, kind: "voice" },
  { re: /^\[image\]\s*/i, kind: "image" },
  { re: /^(?:🖼|📷)\s*Photo\s*—\s*/i, kind: "image" },
  { re: /^(?:🖼|📷)\s*Photo\s*/i, kind: "image" },
  { re: /^\[document\]\s*/i, kind: "document" },
  { re: /^📄\s*Document\s*—\s*/i, kind: "document" },
  { re: /^📄\s*Document\s*/i, kind: "document" },
  { re: /^\[video\]\s*/i, kind: "video" },
  { re: /^\[sticker\]\s*/i, kind: "sticker" },
  { re: /^\[(?:non-text|sticker)\]\s*/i, kind: "nontext" },
  { re: /^📎\s*Media message\s*/i, kind: "nontext" },
  { re: /^\[no message\]\s*/i, kind: "nomessage" },
];

/**
 * Read a message body OR a historic note line into kind + core text + link.
 * Idempotent: parseMediaText(renderMediaLine(x)) reproduces x.
 */
export function parseMediaText(rawIn: string): MediaParsed {
  let t = flatText(rawIn);
  let link: string | null = null;
  t = t
    .replace(LINK_RE, (_m, url: string) => {
      link = url;
      return "";
    })
    .trim();
  let kind: MediaKind = "text";
  for (;;) {
    const before = t;
    for (const { re, kind: k } of PLACEHOLDER_PREFIXES) {
      if (re.test(t)) {
        if (kind === "text" || kind === "nontext") kind = k;
        t = t.replace(re, "");
      }
    }
    t = t.trim();
    if (t === before) break;
  }
  // "(unrecoverable…)" suffixes are render, not content.
  t = t.replace(/\s*\(unrecoverable[^)]*\)\s*$/, "").trim();
  return { kind, text: t, link };
}

/** The cross-format identity of a line: the words, nothing else. */
export function canonText(text: string): string {
  const p = parseMediaText(text);
  // Transcript first — that is what makes the SAME message written by the
  // importer ("[voice/audio] بعد حدا", no link) and by the note pipe
  // ("🎙 Voice — بعد حدا · 🔗 Listen") one line. Since 2026-08-30 a linked
  // photo/voice renders without its description (Ayham), and those lines fall
  // back to the file token: without it every voice note would canonicalise to
  // "" and collapse into a single line.
  if (p.text) return p.text;
  // Textless media (the clickable shape) is identified by its file token, so
  // two different voice notes never collapse into one line.
  return p.link ?? "";
}

const trunc80 = (s: string): string => (s.length > 80 ? `${s.slice(0, 79)}…` : s);

/**
 * The ONE compact line for a media item. `link` only when the caller has
 * confirmed the file exists — never invented. Returns null for
 * `[no message]`: the line is dropped, not rendered.
 */
export function renderMediaLine(p: MediaParsed, link: string | null, deadWindow: boolean): string | null {
  switch (p.kind) {
    case "nomessage":
      return null;
    case "sticker":
      return "[sticker]";
    case "nontext":
      return "[non-text]";
    case "video":
      return "[video]";
    // Ayham, 2026-08-30: a photo or a voice note is CLICKABLE, not transcribed.
    // The description still exists in `message.body` — it is what lets a
    // photo-only enquiry qualify as a lead — it just never reaches the card.
    // With no file to open, the description is kept: it is the message's only
    // remaining trace, and bare labels would all render identically, which the
    // note's substring dedupe would read as one line.
    case "voice": {
      if (link) return `🎙 Voice · [🔗 Listen](${link})`;
      if (!p.text) return `🎙 Voice note (unrecoverable${deadWindow ? " — line was offline" : ""})`;
      return `🎙 Voice — ${p.text}`;
    }
    case "image": {
      if (link) return `📷 Photo · [🔗 View](${link})`;
      if (!p.text) return `📷 Photo (unrecoverable${deadWindow ? " — line was offline" : ""})`;
      return `📷 Photo — ${trunc80(p.text)}`;
    }
    case "document": {
      if (link) return `📄 Document · [🔗 View](${link})`;
      return p.text ? `📄 Document — ${trunc80(p.text)}` : "📄 Document";
    }
    default:
      return p.text;
  }
}

/** `Name: rest` split — only for names we KNOW (the group's client +
 * officers), so a customer text that merely contains ": " is never mangled.
 * Whitespace-tolerant: WhatsApp pushnames drift ("Gt4  Rent", double space)
 * between import eras, and a name that doesn't strip becomes part of the
 * dedupe identity — the one duplicate factory left. */
export function splitSpeaker(
  text: string,
  knownNames: ReadonlySet<string>
): { speaker: string | null; text: string } {
  const m = /^(.{1,80}?): ([\s\S]+)$/.exec(text);
  if (!m) return { speaker: null, text };
  const candidate = flatText(m[1]);
  for (const name of knownNames) {
    if (flatText(name) === candidate) return { speaker: name, text: m[2] };
  }
  return { speaker: null, text };
}
