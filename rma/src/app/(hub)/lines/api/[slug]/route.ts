import { execFile } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { canManageLines } from "@/modules/lines/access";
import { auditLineAction } from "@/modules/lines/audit";
import {
  isKnownLine,
  isValidLineName,
  isValidOwnerKey,
  observerDir,
  retireOverlayLine,
  setLineDisplayName,
  tenantForLine,
  updateOverlayLine,
  PAIR_PHONE_RE,
} from "@/modules/lines/registry";

export const dynamic = "force-dynamic";

// PATCH /lines/api/[slug] — edit a line: display name (wa_line_name row),
// number and owner (overlay registry). The slug must be a mapped line; an
// unknown one is a 404 like any unmapped route — the roster is not advertised
// to outsiders. Tenant is NOT editable here on purpose: re-tenanting re-files
// the line's whole archive (importer dedupes on tenant+external id).
export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { slug } = await params;
  if (!isKnownLine(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { name?: unknown; phone?: unknown; ownerKey?: unknown; ownerName?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const hasName = typeof body.name === "string";
  const hasPhone = typeof body.phone === "string" || body.phone === null;
  const hasOwner = typeof body.ownerKey === "string" || typeof body.ownerName === "string";
  const hasNote = typeof body.note === "string";
  if (!hasName && !hasPhone && !hasOwner && !hasNote) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const changes: string[] = [];

  if (hasName) {
    const name = (body.name as string).trim();
    if (!isValidLineName(name)) {
      return NextResponse.json({ error: "name must be 1-60 characters" }, { status: 400 });
    }
    await setLineDisplayName(slug, name);
    changes.push(`name="${name}"`);
  }

  if (hasPhone || hasOwner || hasNote) {
    const patch: Parameters<typeof updateOverlayLine>[1] = { actor: access.name ?? access.userId };
    if (hasPhone) {
      const phone = body.phone === null ? null : (body.phone as string).replace(/\D/g, "");
      if (phone && !PAIR_PHONE_RE.test(phone)) {
        return NextResponse.json({ error: "phone must be 10-15 digits (empty clears it)" }, { status: 400 });
      }
      patch.phone = phone;
      changes.push(phone ? `phone=+${phone}` : "phone cleared");
    }
    if (hasOwner) {
      const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim().toLowerCase() : "";
      const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
      if (!isValidOwnerKey(ownerKey) || !isValidLineName(ownerName)) {
        return NextResponse.json(
          { error: "owner needs a slug key and a 1-60 char name — a line is never unowned" },
          { status: 400 }
        );
      }
      patch.ownerKey = ownerKey;
      patch.ownerName = ownerName;
      changes.push(`owner=${ownerName} (${ownerKey})`);
    }
    if (hasNote) {
      patch.note = body.note as string;
    }
    try {
      updateOverlayLine(slug, patch);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "update failed" }, { status: 409 });
    }
  }

  try {
    await auditLineAction(access, "wa_line_edit", tenantForLine(slug), `edited ${slug}: ${changes.join(", ")}`);
  } catch (e) {
    console.error(`[lines] edit audit failed for ${slug}: ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({ ok: true, slug });
}

// DELETE /lines/api/[slug] — retire a line. Body MUST echo the slug back as
// confirmSlug (the UI makes the operator type it). Retirement:
//   · overlay marks the slug retired — hidden from the roster, refused by
//     every relink path, tenant/owner/phone mapping KEPT for historic rows
//   · wa-observer/retire-line.sh stops + disables the systemd observer and
//     ARCHIVES the session dir (archives/retired-session-<slug>-<ts>)
//   · message history (DB rows + observed-<slug>.jsonl) is never touched
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { slug } = await params;
  if (!isKnownLine(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: { confirmSlug?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (body.confirmSlug !== slug) {
    return NextResponse.json({ error: "confirmSlug must equal the line slug" }, { status: 400 });
  }

  try {
    retireOverlayLine(slug, access.name ?? access.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "retire failed" }, { status: 409 });
  }

  try {
    await auditLineAction(access, "wa_line_retire", tenantForLine(slug), `retired line ${slug}`);
  } catch (e) {
    console.error(`[lines] retire audit failed for ${slug}: ${e instanceof Error ? e.message : e}`);
  }

  // Retire the session safely (stop observer, archive session dir). The
  // mapping is already retired, so a script failure is reported, not fatal.
  const script = path.join(observerDir(), "retire-line.sh");
  const { ok, output } = await new Promise<{ ok: boolean; output: string }>((resolve) => {
    execFile(
      "/bin/sh",
      [script, slug],
      { timeout: 60_000, maxBuffer: 1024 * 1024, env: process.env },
      (error, stdout, stderr) => resolve({ ok: !error, output: `${stdout}${stderr}`.trim() })
    );
  });

  return NextResponse.json({ ok, output }, { status: ok ? 200 : 207 });
}
