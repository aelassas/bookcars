import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant } from "@/platform/db/schema";
import { canManageLines } from "@/modules/lines/access";
import { auditLineAction } from "@/modules/lines/audit";
import {
  addOverlayLine,
  isKnownLine,
  isValidLineSlug,
  isValidLineName,
  isValidOwnerKey,
  listLines,
  setLineDisplayName,
  PAIR_PHONE_RE,
} from "@/modules/lines/registry";

export const dynamic = "force-dynamic";

// GET /lines/api — roster + live status for the /lines table (polled every
// 10s). `tenants` feeds the Add-line form's tenant picker.
export async function GET() {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [lines, tenants] = await Promise.all([
    listLines(),
    db.select({ slug: tenant.slug }).from(tenant).orderBy(asc(tenant.slug)),
  ]);
  return NextResponse.json({
    lines,
    tenants: tenants.map((t) => t.slug),
    at: new Date().toISOString(),
  });
}

// POST /lines/api — add a new line (born unpaired; staff pair it later from
// the Pair modal). Writes the overlay registry (wa-observer/lines-registry.json)
// which lines.ts/owners.ts merge over the static maps, so the line is mapped
// AND owned from its first second — never routable-but-unmapped.
export async function POST(req: Request) {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!isValidLineSlug(slug)) {
    return NextResponse.json({ error: "slug must be 2-40 chars of a-z, 0-9, -" }, { status: 400 });
  }
  if (isKnownLine(slug)) {
    return NextResponse.json({ error: `slug "${slug}" already exists` }, { status: 409 });
  }

  const tenantSlug = typeof body.tenant === "string" ? body.tenant.trim() : "";
  // The tenant must be a REAL tenant row — the importer dedupes on
  // (tenant_id, external_message_id), so a typo here would file the line's
  // whole future archive nowhere.
  const known = await db.select({ slug: tenant.slug }).from(tenant);
  if (!known.some((r) => r.slug === tenantSlug)) {
    return NextResponse.json({ error: `unknown tenant "${tenantSlug}"` }, { status: 400 });
  }

  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
  if (!isValidLineName(ownerName)) {
    return NextResponse.json({ error: "owner name must be 1-60 characters" }, { status: 400 });
  }
  const ownerKey =
    typeof body.ownerKey === "string" && body.ownerKey.trim()
      ? body.ownerKey.trim().toLowerCase()
      : ownerName.toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!isValidOwnerKey(ownerKey)) {
    return NextResponse.json({ error: "owner key must be a lowercase slug" }, { status: 400 });
  }

  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.replace(/\D/g, "") : null;
  if (phone && !PAIR_PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "phone must be 10-15 digits" }, { status: 400 });
  }

  const actor = access.name ?? access.userId;
  try {
    addOverlayLine({ slug, tenant: tenantSlug, ownerKey, ownerName, phone, actor });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "add failed" }, { status: 409 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name && name !== ownerName && isValidLineName(name)) {
    await setLineDisplayName(slug, name);
  }

  try {
    await auditLineAction(
      access,
      "wa_line_add",
      tenantSlug,
      `added line ${slug} (tenant=${tenantSlug}, owner=${ownerName}${phone ? `, +${phone}` : ", no number yet"})`
    );
  } catch (e) {
    console.error(`[lines] add audit failed for ${slug}: ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ ok: true, slug });
}
