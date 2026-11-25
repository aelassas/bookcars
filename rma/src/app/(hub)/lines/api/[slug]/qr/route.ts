import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { canManageLines } from "@/modules/lines/access";
import { isKnownLine, observerDir } from "@/modules/lines/registry";

export const dynamic = "force-dynamic";

// GET /lines/api/[slug]/qr — pairing artifacts for the Pair modal (polled
// every 2.5s while the modal is open).
//
// The QR payload IS a device-pairing credential: it is read off the 0600 file
// the observer writes and rendered to SVG ON THIS BOX (qrcode.toString) —
// never handed to a third-party QR image service. Both artifacts are deleted
// by the observer the moment pairing succeeds, which is what flips the modal
// to "linked".
function readText(file: string): string | null {
  try {
    return readFileSync(file, "utf8").trim() || null;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { slug } = await params;
  if (!isKnownLine(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const dir = observerDir();
  const statusRaw = readText(path.join(dir, `status-${slug}.json`));
  let state: string | null = null;
  let at: string | null = null;
  try {
    const s = statusRaw ? JSON.parse(statusRaw) : null;
    state = typeof s?.state === "string" ? s.state : null;
    at = typeof s?.at === "string" ? s.at : null;
  } catch {
    /* malformed status file — report no state rather than 500 */
  }

  const payload = readText(path.join(dir, `qr-${slug}.txt`));
  const qrSvg = payload ? await QRCode.toString(payload, { type: "svg" }) : null;

  const rawCode = readText(path.join(dir, `pair-code-${slug}.txt`));
  const pairCode = rawCode
    ? (rawCode.replace(/[^A-Za-z0-9]/g, "").match(/.{1,4}/g) ?? []).join("-") || rawCode
    : null;

  return NextResponse.json({ state, at, qrSvg, pairCode });
}
