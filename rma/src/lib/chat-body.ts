// WhatsApp message bodies arrive tagged by the observer/media-processor:
//   "[voice/audio] [voice] <transcript>"  — voice note, whisper transcript
//   "[image] <OCR / vision description>"   — photo, qwen-vl description
//   "[video] …", "[document] …"            — other media
//   "[non-text]"                            — media we couldn't transcribe
// The raw media file is NOT stored, only this text. parseChatBody turns the
// tag into a clean {kind, text} so the UI can show an icon + the transcript
// instead of the raw markers.
export type ChatBodyKind = "text" | "voice" | "image" | "video" | "file";

const MEDIA_PREFIXES: { re: RegExp; kind: ChatBodyKind }[] = [
  { re: /^\[voice\/audio\]\s*(?:\[voice\]\s*)?/i, kind: "voice" },
  { re: /^\[audio\]\s*/i, kind: "voice" },
  { re: /^\[image\]\s*/i, kind: "image" },
  { re: /^\[video\]\s*/i, kind: "video" },
  { re: /^\[(?:document|file|sticker|non-text|media)\]\s*/i, kind: "file" },
];

export function parseChatBody(body: string | null | undefined): { kind: ChatBodyKind; text: string } {
  const b = (body ?? "").trim();
  for (const p of MEDIA_PREFIXES) {
    if (p.re.test(b)) return { kind: p.kind, text: b.replace(p.re, "").trim() };
  }
  return { kind: "text", text: b };
}
