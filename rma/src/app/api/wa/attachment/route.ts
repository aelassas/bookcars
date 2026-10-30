import { NextResponse } from "next/server";
import { requireAuth } from "@/platform/auth/authorization";
import { getTenantBySlug } from "@/platform/auth/tenant";
import { canManageMessagingForTenant } from "@/modules/messaging/policies";
import { storeUpload } from "@/platform/outbox/media-store";

const MAX_BYTES = 16 * 1024 * 1024; // WhatsApp caps most media at 16 MB

/**
 * POST /api/wa/attachment — multipart upload of a single outbound WhatsApp
 * attachment. Auth-gated to a messaging manager of the posted tenant. The file
 * is written to the observer-readable media dir and an OPAQUE token (never a
 * filesystem path) is returned, to be passed into queueThreadReply(...). The
 * server resolves the token back to a path inside the media dir at send time,
 * so the client can never point the sender at an arbitrary file. This route
 * only STORES — sending stays the single wa_outbox → bridge.js path.
 */
export async function POST(req: Request): Promise<Response> {
  await requireAuth();

  const form = await req.formData();
  const slug = form.get("slug");
  const file = form.get("file");

  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ ok: false, error: "Missing tenant" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ ok: false, error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "File too large (max 16 MB)" }, { status: 413 });
  }

  const t = await getTenantBySlug(slug);
  if (!t) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  // Same authz as sending a text reply on this tenant. requireRoleForTenant
  // (behind this helper) THROWS on failure — Next surfaces it as a 500 and no
  // file is returned; it is not a fail-open boolean.
  await canManageMessagingForTenant(t.id);

  const stored = await storeUpload(file);
  return NextResponse.json({
    ok: true,
    token: stored.token,
    kind: stored.kind,
    name: stored.name,
    size: stored.size,
  });
}
