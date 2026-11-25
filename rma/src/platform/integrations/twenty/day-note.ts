/**
 * day-note.ts — the aggregated WhatsApp note: ONE Twenty note per
 * (person, calendar day), replacing one-note-per-message.
 *
 * Owner, 2026-08-21: «each note separate… can he just add into the notes
 * without creating hundreds of inputs». A busy customer day was 40+ notes on
 * the card; now it is one note with chronological lines:
 *
 *   [💬 WhatsApp +971501234567](https://web.whatsapp.com/send?phone=971501234567)
 *
 *   14:32 ← 7th September - 14th september
 *   14:35 → конечно, вот наличные…
 *
 * ── TITLE FORMAT (the dedupe key — do not change casually) ──────────────────
 *
 *   WhatsApp · +<digits>            and, past NOTE_MAX_CHARS, · #2, · #3 …
 *
 * e.g. "WhatsApp · +971501234567". The " · " separator follows the old
 * noteTitle() convention. The key is PHONE-ONLY, deliberately: an earlier
 * draft included the customer name, but outbound observer rows carry no
 * pushName (name → 'клиент') while inbound rows do — a name in the key would
 * split one customer into two notes ("Sheraz" vs "клиент"). The phone is what
 * the person match itself keyed on, so it cannot disagree with itself across
 * row directions.
 *
 * 2026-08-26 (owner): the DAY was dropped from the key. One note per day
 * still meant ~180 notes for a six-month customer — the same "hundreds of
 * inputs" complaint, one order of magnitude down. The day moved into the body
 * as a dayHeader() separator, so the chronology survives the merge. Notes
 * written under the old per-day titles are left where they are: they remain
 * on the card, and the continuous note simply starts alongside them.
 *
 * ── LINE-LEVEL IDEMPOTENCY ──────────────────────────────────────────────────
 * A line is `HH:MM <arrow> <text>` — deterministic per message. Appends skip
 * lines already present in the note body, so a crash between append and
 * checkpoint (or a backfill re-run over the same range) does not duplicate
 * the conversation; at worst it re-reads. The accepted residue: two genuinely
 * different messages with identical text in the same minute collapse to one
 * line.
 */
import { bodyWithWaLink } from "./deal-link";
import { parseMediaText, renderMediaLine } from "./chat-line";
import { mediaUrl } from "@/platform/media/token";
import type { TwentyClient } from "./client";

/** Server-local calendar day, YYYY-MM-DD (box = Dubai time). */
export function dayKey(at: Date): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The aggregated-note title. ONE note per customer, forever — the 2026-08-26
 * step of the same complaint that produced the per-day note ("not hundreds"):
 * a customer of six months still ended up with a wall of ~180 day notes on
 * the card. Part numbers appear only after a note outgrows NOTE_MAX_CHARS.
 *
 *   WhatsApp · +971501234567          (part 1)
 *   WhatsApp · +971501234567 · #2     (rollover)
 */
export function waNoteTitle(digits: string, part = 1): string {
  return part <= 1 ? `WhatsApp · +${digits}` : `WhatsApp · +${digits} · #${part}`;
}

/**
 * Day separator inside a continuous note. Without it every line reads
 * "14:32 ←" with no way to tell September from March — the date used to live
 * in the title, and dropping the title date has to put it back in the body.
 * Deterministic, so the line-level idempotency filter dedupes it like any
 * other line.
 */
export function dayHeader(at: Date): string {
  return `**— ${dayKey(at)} —**`;
}

/**
 * Roll over to a new part past this body size. Twenty stores the markdown
 * fine, but its editor turns to treacle on a megabyte of text, and a card
 * nobody can open is no better than the hundreds of notes we just merged.
 */
export const NOTE_MAX_CHARS = 60_000;

/** Runaway guard: 200 full parts is ~12MB of chat — a bug, not a customer. */
export const MAX_PARTS = 200;

/** One chronological line: `14:32 ← text`. Newlines collapse — one message, one line. */
export function noteLine(direction: string, at: Date, text: string, who?: string | null): string {
  const arrow = direction === "outbound" ? "→" : "←";
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  const flat = text.replace(/\s+/g, " ").trim().slice(0, 1000);
  // Owner, 2026-08-30, reading a real conversation: "there is at least client
  // C and our sales agent A — how to differ who said what". Arrows alone were
  // too subtle, and names could not be relied on: a customer's WhatsApp
  // pushname is often junk (one is literally "♾️") and an OUTBOUND row carries
  // the customer's phone in `to` with no line slug, so the agent frequently
  // cannot be named at all. The SIDE is always knowable, so the side is what
  // is printed — every line is labelled, none is bare.
  //
  // `who` is kept in the signature: callers still resolve it, and naming the
  // individual agent ("A (Babek)") is a one-line change if asked for.
  const side = direction === "outbound" ? "A" : "C";
  return `${hh}:${mm} ${arrow} ${side}: ${flat}`;
}

/**
 * One chat line for a message row. Media rows render COMPACT with the
 * /api/media link (🎙 Voice — transcript · 🔗 Listen) — the shape the
 * 2026-08-29 historical normalization wrote, so live lines and merged lines
 * are identical and dedupe holds. "[no message]" artefacts return null:
 * skip the line, don't render junk.
 */
export function messageNoteLine(
  m: { direction?: string | null; createdAt: Date; body: string | null; mediaPath?: string | null },
  who?: string | null
): string | null {
  const body = (m.body ?? "").slice(0, 8000);
  if (m.mediaPath) {
    const rendered = renderMediaLine(parseMediaText(body), mediaUrl(m.mediaPath), false);
    if (rendered === null) return null;
    return noteLine(m.direction ?? "inbound", m.createdAt, rendered, who);
  }
  return noteLine(m.direction ?? "inbound", m.createdAt, body, who);
}

/**
 * Twenty's filter grammar uses commas and quotes as syntax; a customer name
 * or filename containing one would parse as a second condition. Stripping is
 * safe here because the comparison target is our own deterministic title /
 * our own uploaded basename — a stripped needle can only MISS an exotic row,
 * and a miss costs a skipped duplicate check, never a wrong record.
 */
export function filterSafe(value: string): string {
  return value.replace(/[",()]/g, " ");
}

/** First row of a GET /rest/<objects> page, tolerating the data key. */
function firstRow(page: unknown): Record<string, unknown> | null {
  const data = (page as { data?: Record<string, unknown> })?.data ?? {};
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) return value[0] as Record<string, unknown>;
  }
  return null;
}

/** All rows of a GET /rest/<objects> page, tolerating the data key. */
function rowsOf(page: unknown): Record<string, unknown>[] {
  const data = (page as { data?: Record<string, unknown> })?.data ?? {};
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) return value as Record<string, unknown>[];
  }
  return [];
}

export interface TwentyNoteHandle {
  id: string;
  /** Current bodyV2.markdown ("" when the record did not carry one). */
  markdown: string;
}

/** Exact-title note lookup — the ONLY note identity this subsystem trusts. */
export async function findNoteByTitle(client: TwentyClient, title: string): Promise<TwentyNoteHandle | null> {
  const page = await client.get("notes", { filter: `title[eq]:"${filterSafe(title)}"`, limit: 1 });
  const row = firstRow(page);
  if (!row || typeof row.id !== "string") return null;
  const bodyV2 = row.bodyV2 as { markdown?: unknown } | null | undefined;
  return { id: row.id, markdown: typeof bodyV2?.markdown === "string" ? bodyV2.markdown : "" };
}

export interface DayNoteResult {
  noteId: string | null;
  /** True when this call created the note (false = found and maybe appended). */
  created: boolean;
  /** Lines actually appended to an existing note (0 on create, 0 when all
   *  lines were already present — the re-run case). */
  appended: number;
}

/**
 * Find-or-create the (person, day) note and land `lines` on it.
 *
 * Missing → create with the wa.me header + all lines, noteTargets to person
 * (+ deal), the same ONE-batch two-target rule the per-message projector had.
 * Found → PATCH bodyV2.markdown with the lines that are not already there
 * (line-level idempotency, see header). With commit=false nothing is written
 * and the counts describe what WOULD happen (noteId is null when the note
 * does not exist yet).
 */
export async function ensureWaNote(
  client: TwentyClient,
  input: {
    /** Customer digits — the note identity AND the wa.me header link. */
    digits: string;
    lines: string[];
    /** null when the thread has no matched person — the note still lands on the deal. */
    personId: string | null;
    opportunityId?: string | null;
    commit: boolean;
  }
): Promise<DayNoteResult> {
  return ensureContinuousNote(client, { ...input, titleFor: (p) => waNoteTitle(input.digits, p) });
}

/**
 * Find-or-append against a STABLE title, rolling into "· #2" past
 * NOTE_MAX_CHARS. Every WhatsApp pipeline goes through here so that a card
 * accumulates ONE growing note per stream instead of one note per pass —
 * `wa-lead-relay` used to mint a fresh note every run (its title carried a
 * message count and a timestamp), which is what actually buried cards under
 * hundreds of notes.
 *
 * Streams keep SEPARATE titles on purpose: their line formats differ
 * ("14:32 ← text" vs "[26 Aug 2026 · 13:01] text"), so pointing both at one
 * title would file every message twice, once in each shape, with the
 * line-level dedupe unable to see they are the same message.
 */
/**
 * Is this line already in the note?
 *
 * Plain text: the literal substring, as before. Media: the FILE TOKEN, because
 * the same photo/voice can be sitting in the note under an older rendering.
 * Since 2026-08-30 a linked media line no longer carries its transcript
 * (Ayham), so a substring test alone would read every historic
 * `🎙 Voice — <transcript> · 🔗 Listen(U)` as absent and append a second copy
 * of it to every card that has one.
 */
/**
 * A message line reduced to what actually identifies it: the minute, the
 * direction, and the words. The speaker label is presentation and changes over
 * time — bare before 2026-08-29, then `Name:`, then `C:`/`A:` (owner,
 * 2026-08-30) — and each change would otherwise read the whole history as new
 * and append a second copy of it to all 1172 conversation notes.
 *
 * The label is bounded (no colon, ≤40 chars) so an ordinary message that
 * happens to start with a short word and a colon is the only ambiguity left;
 * such a collision needs the same minute AND direction AND remaining words,
 * which is the same message anyway.
 *
 * Returns null for anything that is not a message line — day headers, the
 * wa.me header, blanks.
 */
const MESSAGE_LINE_RE = /^(\d{2}:\d{2})\s+([←→])\s+(?:([^\s:][^:]{0,39}):\s+)?([\s\S]*)$/;

export function lineIdentity(line: string): string | null {
  const m = MESSAGE_LINE_RE.exec(line.trim());
  if (!m) return null;
  const words = (m[4] ?? "").replace(/\s+/g, " ").trim();
  return `${m[1]}|${m[2]}|${words}`;
}

export function lineAlreadyPresent(markdown: string, line: string): boolean {
  if (markdown.includes(line)) return true;
  // Media: the file token is the identity — the same photo can be sitting in
  // the note under an older rendering that still carried its description.
  const link = parseMediaText(line).link;
  if (link && markdown.includes(link)) return true;
  // Text: compare speaker-blind, so relabelling never duplicates a message.
  const id = lineIdentity(line);
  if (!id) return false;
  for (const existing of markdown.split("\n")) {
    if (lineIdentity(existing) === id) return true;
  }
  return false;
}

/** One row of `noteTargets` as the API returns it — only the ids matter here. */
export interface NoteTargetRow {
  targetPersonId?: string | null;
  targetOpportunityId?: string | null;
}

/**
 * The links a note still needs.
 *
 * A conversation note is created the first time a customer writes. The CARD is
 * usually created later, by the lead relay, once the thread qualifies — and
 * nothing ever went back to attach the existing note to it, so the card opened
 * on "Notes 0" while the whole conversation sat one table away (Ayham,
 * 2026-08-31, card #619: "this lead has no messages").
 *
 * Kept pure and separate from the IO so the "which links are missing" decision
 * is testable on its own; the caller batch-creates whatever comes back.
 */
export function missingNoteTargets(
  noteId: string,
  want: { personId: string | null; opportunityId?: string | null },
  existing: NoteTargetRow[]
): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const hasPerson = existing.some((t) => t.targetPersonId === want.personId);
  const hasOpp = existing.some((t) => t.targetOpportunityId === want.opportunityId);
  if (want.personId && !hasPerson) out.push({ noteId, targetPersonId: want.personId });
  if (want.opportunityId && !hasOpp) out.push({ noteId, targetOpportunityId: want.opportunityId });
  return out;
}

/** Attach an EXISTING note to the person/card it belongs to, idempotently. */
async function linkExistingNote(
  client: TwentyClient,
  noteId: string,
  want: { personId: string | null; opportunityId?: string | null },
  commit: boolean
): Promise<number> {
  if (!want.personId && !want.opportunityId) return 0;
  let existing: NoteTargetRow[] = [];
  try {
    const page = await client.get<unknown>("noteTargets", {
      filter: `noteId[eq]:"${noteId}"`,
      limit: 60,
    });
    existing = rowsOf(page) as NoteTargetRow[];
  } catch {
    // A failed read must never cost the message itself: the note is written
    // either way and the next pass re-tries the link.
    return 0;
  }
  const wanted = missingNoteTargets(noteId, want, existing);
  if (wanted.length === 0 || !commit) return wanted.length;
  await client.batchCreate("noteTargets", wanted);
  return wanted.length;
}

/**
 * Re-order a note so it reads in the order things were SAID.
 *
 * The note only ever appends, which is right for a live conversation and wrong
 * for a line we learn about late. WhatsApp hides a sender behind an `@lid`, so
 * an agent's reply arrives carrying the LINE slug and no phone; it can only be
 * attributed once `wa_identity` learns the mapping — which happens when the
 * customer writes again. Until then the reply cannot be filed, and when it
 * finally is, appending puts it at the END, minutes or hours after messages
 * that answered it. Ayham, 2026-08-31, card #640: a 15:11 reply sitting under
 * the 15:26 question it preceded.
 *
 * Sorting is by (day header, HH:MM) and STABLE, so two messages in the same
 * minute keep the order they were filed in. Anything that is not a message
 * line — the wa.me header, stray prose — keeps its position relative to the
 * block it sits in, and nothing is ever dropped: the output has exactly the
 * lines the input had.
 */
export function sortNoteBody(body: string): string {
  const lines = body.split("\n");
  const dayAt = lines.findIndex((l) => /^\*\*—\s*\d{4}-\d{2}-\d{2}\s*—\*\*$/.test(l.trim()));
  if (dayAt === -1) return body; // no day blocks — nothing to order

  const head = lines.slice(0, dayAt);
  const blocks: { day: string; lines: string[] }[] = [];
  for (const line of lines.slice(dayAt)) {
    if (/^\*\*—\s*\d{4}-\d{2}-\d{2}\s*—\*\*$/.test(line.trim())) {
      blocks.push({ day: line, lines: [] });
    } else if (blocks.length > 0) {
      blocks[blocks.length - 1]!.lines.push(line);
    } else {
      head.push(line);
    }
  }

  blocks.sort((a, b) => a.day.localeCompare(b.day));
  const out = [...head];
  for (const block of blocks) {
    // Stable sort on HH:MM; a line without a time keeps its place by sorting
    // to the position it already had.
    const withIndex = block.lines.map((l, i) => ({ l, i, t: /^(\d{2}:\d{2})\s/.exec(l.trim())?.[1] ?? null }));
    withIndex.sort((a, b) => {
      if (a.t && b.t) return a.t === b.t ? a.i - b.i : a.t.localeCompare(b.t);
      if (a.t || b.t) return a.i - b.i; // don't move untimed lines across timed ones
      return a.i - b.i;
    });
    out.push(block.day, ...withIndex.map((x) => x.l));
  }
  return out.join("\n");
}

export async function ensureContinuousNote(
  client: TwentyClient,
  input: {
    titleFor: (part: number) => string;
    digits: string;
    lines: string[];
    personId: string | null;
    opportunityId?: string | null;
    commit: boolean;
  }
): Promise<DayNoteResult> {
  // Walk the parts in order. Idempotency is checked against EVERY part seen so
  // far, not just the one being written: a line that already landed in part 1
  // must not reappear in part 2 after a rollover.
  const seen: string[] = [];
  for (let part = 1; part <= MAX_PARTS; part++) {
    const title = input.titleFor(part);
    const found = await findNoteByTitle(client, title);
    const fresh = input.lines.filter((l) => !seen.some((md) => lineAlreadyPresent(md, l)));

    if (!found) {
      if (fresh.length === 0) return { noteId: null, created: false, appended: 0 };
      if (!input.commit) return { noteId: null, created: true, appended: 0 };
      const body = bodyWithWaLink(fresh.join("\n"), input.digits);
      const created = await client.batchCreate("notes", [
        { title, bodyV2: { markdown: body, blocknote: null } },
      ]);
      const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
      if (typeof noteId !== "string") throw new Error("note created without id in response");
      // Both targets in ONE batch call: a note that reached the person but not
      // the deal would look identical to the bug this pipe was built to fix.
      await client.batchCreate("noteTargets", [
        ...(input.personId ? [{ noteId, targetPersonId: input.personId }] : []),
        ...(input.opportunityId ? [{ noteId, targetOpportunityId: input.opportunityId }] : []),
      ]);
      return { noteId, created: true, appended: 0 };
    }

    seen.push(found.markdown);
    // The note existed before this card did — attach it now, or the card opens
    // on "Notes 0" with the whole conversation sitting one table away. Runs
    // BEFORE the early return: a thread with nothing new to append is exactly
    // the case where the card was created afterwards.
    await linkExistingNote(
      client,
      found.id,
      { personId: input.personId, opportunityId: input.opportunityId },
      input.commit
    );
    const stillFresh = fresh.filter((l) => !lineAlreadyPresent(found.markdown, l));
    if (stillFresh.length === 0) return { noteId: found.id, created: false, appended: 0 };

    const addition = stillFresh.join("\n");
    if (found.markdown.length + addition.length + 1 > NOTE_MAX_CHARS) continue; // full → next part
    if (input.commit) {
      // Sorted, not just appended: a reply we could only attribute after the
      // customer wrote again must land where it was SPOKEN, not at the end.
      const next = sortNoteBody(found.markdown ? `${found.markdown}\n${addition}` : addition);
      await client.patch(`notes/${found.id}`, { bodyV2: { markdown: next, blocknote: null } });
    }
    return { noteId: found.id, created: false, appended: stillFresh.length };
  }
  throw new Error(`ensureContinuousNote: "${input.titleFor(1)}" exceeded ${MAX_PARTS} parts`);
}
