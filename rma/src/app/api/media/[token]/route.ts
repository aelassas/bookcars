import { NextResponse } from "next/server";
import { stat, open } from "fs/promises";
import {
  verifyMediaToken,
  mediaFilePath,
  mediaContentType,
} from "@/platform/media/token";

/**
 * GET /api/media/[token] — serve one locally-stored media file (WhatsApp
 * voice/image, call recording) by opaque HMAC token; see platform/media/token.
 * Range requests are honored so <audio> seeking works in the browser.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const relpath = verifyMediaToken(token);
  if (!relpath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = mediaFilePath(relpath);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const type = mediaContentType(relpath);
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  let start = 0;
  let end = size - 1;
  let status = 200;
  if (range && (range[1] || range[2])) {
    start = range[1] ? parseInt(range[1], 10) : Math.max(0, size - parseInt(range[2], 10));
    end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), size - 1) : end;
    if (start > end || start >= size) {
      return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    status = 206;
  }

  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(end - start + 1);
    await fh.read(buf, 0, buf.length, start);
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Content-Length": String(buf.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${relpath.split("/").pop()}"`,
    };
    if (status === 206) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
    return new NextResponse(new Uint8Array(buf), { status, headers });
  } finally {
    await fh.close();
  }
}
