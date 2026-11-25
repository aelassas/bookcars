import { randomUUID } from "crypto";
import { mkdir, writeFile, realpath, stat } from "fs/promises";
import path from "path";

export type MediaKind = "image" | "video" | "audio" | "document";

/**
 * Where outbound WhatsApp attachments live on disk. bridge.js (the wa-observer
 * Baileys drain) reads the ABSOLUTE path we compute from a token, so this only
 * has to be a directory BOTH the Next.js process and the observer can reach.
 * Defaults to <repo>/wa-observer/outbox-media, next to the inbound media/ dir.
 */
export function mediaDir(): string {
  return (
    process.env.WA_OUTBOX_MEDIA_DIR ||
    path.resolve(process.cwd(), "..", "wa-observer", "outbox-media")
  );
}

// Extension → (mime, kind). The stored filename carries the extension, so the
// server re-derives type from disk instead of trusting the client. Anything not
// listed is treated as a document with a generic mime.
const EXT: Record<string, { mime: string; kind: MediaKind }> = {
  ".jpg": { mime: "image/jpeg", kind: "image" },
  ".jpeg": { mime: "image/jpeg", kind: "image" },
  ".png": { mime: "image/png", kind: "image" },
  ".gif": { mime: "image/gif", kind: "image" },
  ".webp": { mime: "image/webp", kind: "image" },
  ".mp4": { mime: "video/mp4", kind: "video" },
  ".mov": { mime: "video/quicktime", kind: "video" },
  ".3gp": { mime: "video/3gpp", kind: "video" },
  ".webm": { mime: "video/webm", kind: "video" },
  ".ogg": { mime: "audio/ogg", kind: "audio" },
  ".opus": { mime: "audio/ogg", kind: "audio" },
  ".mp3": { mime: "audio/mpeg", kind: "audio" },
  ".m4a": { mime: "audio/mp4", kind: "audio" },
  ".aac": { mime: "audio/aac", kind: "audio" },
  ".wav": { mime: "audio/wav", kind: "audio" },
  ".pdf": { mime: "application/pdf", kind: "document" },
};

function typeForExt(ext: string): { mime: string; kind: MediaKind } {
  return EXT[ext.toLowerCase()] ?? { mime: "application/octet-stream", kind: "document" };
}

// Extensions allowed on stored uploads (WhatsApp-reasonable attachments).
// Anything else is stored as .bin, which typeForExt maps to
// application/octet-stream + document — so a client-supplied name like
// "x.html" or "x.exe" can never dictate the served type.
const ALLOWED_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".mp4", ".mov", ".3gp",
  ".mp3", ".ogg", ".oga", ".m4a", ".aac", ".opus", ".wav",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
]);

/** Keep only a safe extension; the stored name is a fresh UUID. */
function safeExt(name: string, mime: string): string {
  const fromName = path.extname(name).replace(/[^.a-z0-9]/gi, "").toLowerCase().slice(0, 12);
  if (ALLOWED_EXT.has(fromName)) return fromName;
  const sub = mime.split("/")[1]?.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12);
  const fromMime = sub ? `.${sub}` : "";
  return ALLOWED_EXT.has(fromMime) ? fromMime : ".bin";
}

/**
 * Persist an uploaded file and return an OPAQUE token (the stored filename).
 * The token — never a filesystem path — is what crosses the client boundary.
 */
export async function storeUpload(
  file: File,
): Promise<{ token: string; kind: MediaKind; name: string; size: number }> {
  const mime = file.type || "application/octet-stream";
  const dir = mediaDir();
  await mkdir(dir, { recursive: true });
  const token = `${randomUUID()}${safeExt(file.name, mime)}`;
  await writeFile(path.join(dir, token), Buffer.from(await file.arrayBuffer()));
  return { token, kind: typeForExt(path.extname(token)).kind, name: file.name, size: file.size };
}

/**
 * Resolve a client-supplied token to an on-disk attachment, with type derived
 * from the file — NEVER from the client. Rejects anything that isn't a plain
 * filename inside mediaDir() (path-traversal / arbitrary-file-read guard), so a
 * forged token like "../../etc/passwd" cannot be sent over WhatsApp.
 */
export async function resolveMediaToken(
  token: string,
): Promise<{ path: string; mime: string; kind: MediaKind }> {
  // Must be a bare filename — no separators, no traversal, no absolute path.
  if (!token || token !== path.basename(token) || token.includes("..")) {
    throw new Error("Invalid attachment");
  }
  const base = mediaDir();
  const abs = path.join(base, token);

  // Canonicalize both sides and require abs to live strictly under base.
  const [realBase, realAbs] = await Promise.all([realpath(base), realpath(abs)]);
  if (realAbs !== realBase && !realAbs.startsWith(realBase + path.sep)) {
    throw new Error("Forbidden attachment path");
  }
  const st = await stat(realAbs);
  if (!st.isFile()) throw new Error("Attachment not found");

  const { mime, kind } = typeForExt(path.extname(realAbs));
  return { path: realAbs, mime, kind };
}
