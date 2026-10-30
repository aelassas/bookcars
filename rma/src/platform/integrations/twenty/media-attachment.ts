/**
 * media-attachment.ts — the last mile for WhatsApp document photos.
 *
 * Clients send Emirates IDs, driving licences and receipts as photos. The
 * observer downloads them to disk, the importer stores the relative locator
 * in message.media_path ("wa/<line>/<file>"), and the note projector carries
 * the AI text description into Twenty — but until now the FILE itself stayed
 * on this Mac. This module uploads it to the message's Twenty deployment and
 * files it as an ATTACHMENT on the same person (and deal) the note targets.
 *
 * Kind policy (owner, 2026-08): images, documents AND audio go up — voice
 * notes matter to the owner, and their transcript still lands as the note
 * line. Video is skipped (large, and nobody has asked for it in the CRM).
 */
import { readFile, stat } from "fs/promises";
import { mediaFilePath } from "@/platform/media/token";
import { filterSafe } from "./day-note";
import type { TwentyClient } from "./client";

const VIDEO_EXT = new Set(["mp4", "mov", "webm", "3gp", "mkv", "avi"]);
const UPLOAD_EXT = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp",
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt",
  // Voice notes (the observer saves them as .ogg) and other audio — the QC
  // desk listens to these from the card.
  "ogg", "opus", "mp3", "m4a", "wav", "aiff",
]);

export type WaMediaKind = "upload" | "video" | "unknown";

/** What to do with a message's media_path, decided by extension alone. */
export function classifyWaMedia(mediaPath: string): WaMediaKind {
  const ext = (mediaPath.toLowerCase().split(".").pop() ?? "").trim();
  if (UPLOAD_EXT.has(ext)) return "upload";
  if (VIDEO_EXT.has(ext)) return "video";
  return "unknown";
}

/** Basename the attachment is filed under (e.g. "2A00F7….jpg"). */
export function mediaFileName(mediaPath: string): string {
  return mediaPath.split("/").pop() ?? mediaPath;
}

// WhatsApp compresses photos to a few hundred KB; 25 MB only refuses files
// that were never WhatsApp media to begin with. Twenty's own
// maxDirectUploadFileSize applies on top, server-side.
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

/** Reads a media_path ("wa/<line>/<file>") from disk; null when unusable. */
export type MediaReader = (mediaPath: string) => Promise<Buffer | null>;

export const defaultMediaReader: MediaReader = async (mediaPath) => {
  try {
    // Same root table the /api/media token route resolves against — "wa"
    // maps to WA_MEDIA_ROOT (the observer media dir). A path that escapes
    // the "wa/<line>/<file>" shape simply does not resolve here.
    const abs = mediaFilePath(mediaPath);
    const st = await stat(abs);
    if (!st.isFile() || st.size === 0 || st.size > MAX_MEDIA_BYTES) return null;
    return await readFile(abs);
  } catch {
    return null; // missing file, unreadable dir — the note must not fail over this
  }
};

export interface AttachWaMediaResult {
  attached: boolean;
  /** Why nothing was attached: "video" | "unknown" | "unreadable" | "duplicate". */
  reason?: string;
}

/**
 * Upload one message's media to Twenty and create the attachment on the
 * person (+ deal and + the day's aggregated note when known, mirroring the
 * noteTargets rule — the attachment table carries all three targets at once,
 * so the file shows on the note AND the card). Throws only on Twenty-side
 * failure — a missing/oversized/skipped file is a result, never an exception,
 * so the note projection can never be broken by a disk problem.
 */
export async function attachWaMediaToTwenty(
  client: TwentyClient,
  input: {
    mediaPath: string;
    personId: string;
    opportunityId?: string | null;
    /** The aggregated day note this message's line landed on, when known. */
    noteId?: string | null;
    readMedia?: MediaReader;
  }
): Promise<AttachWaMediaResult> {
  const kind = classifyWaMedia(input.mediaPath);
  if (kind !== "upload") return { attached: false, reason: kind };
  const bytes = await (input.readMedia ?? defaultMediaReader)(input.mediaPath);
  if (!bytes) return { attached: false, reason: "unreadable" };
  const name = mediaFileName(input.mediaPath);
  // Re-walks (replay, checkpoint rewind, media backfill) hit the same media
  // row again — without this check every pass re-uploads and files a second
  // copy. Same dedupe key as the backfill: basename + target person. The
  // server-side filter narrows the page; the row-level re-check is what makes
  // it exact (and keeps the in-memory mock honest — it ignores filters).
  const page = await client.get("attachments", {
    filter: `name[eq]:"${filterSafe(name)}",targetPersonId[eq]:"${input.personId}"`,
    limit: 5,
  });
  const pageData = (page as { data?: Record<string, unknown> })?.data ?? {};
  const dupe = Object.values(pageData)
    .flatMap((v) => (Array.isArray(v) ? v : []))
    .some((r) => {
      const row = r as Record<string, unknown>;
      return row.name === name && row.targetPersonId === input.personId;
    });
  if (dupe) return { attached: false, reason: "duplicate" };
  const uploaded = await client.uploadFile({ filename: name, bytes });
  await client.post("attachments", {
    name,
    file: [{ fileId: uploaded.fileId, label: name }],
    targetPersonId: input.personId,
    ...(input.opportunityId ? { targetOpportunityId: input.opportunityId } : {}),
    ...(input.noteId ? { targetNoteId: input.noteId } : {}),
  });
  return { attached: true };
}
