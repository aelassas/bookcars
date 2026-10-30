import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/platform/auth";
import { clientIp, macFor, recordDevice } from "@/platform/net/device";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });
  const h = await headers();
  const ip = clientIp(h);
  try {
    await recordDevice(session.user.id, session.user.email ?? "", ip, macFor(ip), h.get("user-agent") ?? "");
  } catch {
    // soft: never block the app on device capture
  }
  return NextResponse.json({ ok: true });
}
