// Simulator for demo / testing: inject a fake WhatsApp inbound message
// without needing real Meta credentials or a public webhook endpoint.
//
// POST /api/integrations/whatsapp/simulate
// Body: { tenantSlug: string, from: string, name: string, body: string }
//
// Gated: requires a signed-in session that is a member of the target tenant
// with a role allowed to manage messaging — same policy as the messaging
// server actions (modules/messaging/actions.ts).

import { NextResponse } from "next/server";
import { auth } from "@/platform/auth";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageMessagingForTenant } from "@/modules/messaging/policies";
import { projectWhatsAppInbound } from "@/platform/integrations/whatsapp/projector";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const tenantSlug = typeof body?.tenantSlug === "string" ? body.tenantSlug.trim() : "";
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : from;
  const messageBody = typeof body?.body === "string" ? body.body.trim() : "";

  if (!tenantSlug || !from || !messageBody) {
    return NextResponse.json(
      { ok: false, reason: "tenantSlug, from and body are required" },
      { status: 400 }
    );
  }

  const t = await getTenantBySlug(tenantSlug);
  if (!t) {
    return NextResponse.json({ ok: false, reason: "tenant not found" }, { status: 404 });
  }

  try {
    await canManageMessagingForTenant(t.id);
  } catch {
    return NextResponse.json({ ok: false, reason: "Forbidden" }, { status: 403 });
  }

  const result = await projectWhatsAppInbound({ tenantId: t.id, from, name, body: messageBody });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ ...result });
}
