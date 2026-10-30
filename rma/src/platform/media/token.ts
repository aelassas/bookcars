/**
 * Opaque, stateless tokens for serving locally-stored media (WhatsApp voice
 * notes / images, call recordings) to CRM readers — Mohamd 2026-08-18: the QC
 * team must LISTEN to audio, and the CallGear links bounce off their SSO.
 *
 * A token is `v1.<b64url(relpath)>.<b64url(hmac-sha256(relpath))>`. The
 * relpath's first segment picks a whitelisted root ("wa" = observer media,
 * "rec" = call recordings, "ig" = Meta Instagram/Messenger attachments) — the
 * server never receives a filesystem path, so there is nothing to traverse.
 * Same trust model as the wa_outbox opaque upload tokens: unguessable beats
 * enumerable.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const MEDIA_ROOTS: Record<string, string> = {
  wa:
    process.env.WA_MEDIA_ROOT?.trim() ||
    "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer/media",
  rec:
    process.env.RECORDINGS_ROOT?.trim() ||
    "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/recordings",
  ig:
    process.env.IG_MEDIA_ROOT?.trim() ||
    "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/ig-media",
};

function secret(): string {
  const s = process.env.MEDIA_TOKEN_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!s) throw new Error("MEDIA_TOKEN_SECRET/AUTH_SECRET is not set");
  return s;
}

const b64u = (buf: Buffer): string => buf.toString("base64url");

function sign(relpath: string): Buffer {
  return createHmac("sha256", secret()).update(relpath).digest();
}

/** relpath like "wa/babek-rent/2A00F7….ogg" or "rec/cardiwan/ast-….wav". */
export function mintMediaToken(relpath: string): string {
  return `v1.${b64u(Buffer.from(relpath, "utf8"))}.${b64u(sign(relpath))}`;
}

/** Returns the verified relpath, or null for anything malformed/forged. */
export function verifyMediaToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  let relpath: string;
  let mac: Buffer;
  try {
    relpath = Buffer.from(parts[1], "base64url").toString("utf8");
    mac = Buffer.from(parts[2], "base64url");
  } catch {
    return null;
  }
  const expected = sign(relpath);
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
  // Defense in depth — the HMAC already pins the exact string, but a signed
  // path must still be a plain relative one inside a known root.
  if (relpath.includes("..") || relpath.startsWith("/") || relpath.includes("\0")) return null;
  const root = relpath.split("/")[0];
  if (!(root in MEDIA_ROOTS)) return null;
  return relpath;
}

/** Absolute filesystem path for a VERIFIED relpath. */
export function mediaFilePath(relpath: string): string {
  const [root, ...rest] = relpath.split("/");
  return `${MEDIA_ROOTS[root]}/${rest.join("/")}`;
}

export function mediaContentType(relpath: string): string {
  const ext = relpath.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    ogg: "audio/ogg", opus: "audio/ogg", mp3: "audio/mpeg", m4a: "audio/mp4",
    wav: "audio/wav", aiff: "audio/aiff",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    pdf: "application/pdf", mp4: "video/mp4",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Public base for media links in notes (the Funnel host serves mycrm). */
export function mediaPublicBase(): string {
  return (
    process.env.MEDIA_PUBLIC_BASE_URL?.trim() ||
    "https://takes-mac-studio.tail4de2d7.ts.net"
  );
}

export function mediaUrl(relpath: string): string {
  return `${mediaPublicBase()}/api/media/${mintMediaToken(relpath)}`;
}
