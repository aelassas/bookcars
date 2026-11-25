import { execFile } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { auditEvent, tenant } from "@/platform/db/schema";
import { canManageLines, type LinesAccess } from "@/modules/lines/access";
import {
  isKnownLine,
  isRelinkableLine,
  observerDir,
  relinkCooldownOk,
  relinkCooldownUntil,
  tenantForLine,
  PAIR_PHONE_RE,
} from "@/modules/lines/registry";

export const dynamic = "force-dynamic";

// POST /lines/api/[slug]/relink — restart one observer line for re-pairing.
//
// The actual work is wa-observer/relink-web.sh (archives the session, clears
// the 2-strike lockout, pm2-starts the line with --restart-delay 300000).
// This route is a gate, not a shell: every argument is validated here and
// passed to execFile as an argv array — no shell interpolation anywhere.

const EXEC_TIMEOUT_MS = 60_000;

function runRelinkScript(slug: string, mode: "qr" | "code", phone: string | null, label: string) {
  const script = path.join(observerDir(), "relink-web.sh");
  const args = [script, slug, mode, ...(mode === "code" && phone ? [phone] : [])];
  return new Promise<{ ok: boolean; output: string }>((resolve) => {
    execFile(
      "/bin/sh",
      args,
      {
        timeout: EXEC_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, BRAND_LABEL: label },
      },
      (error, stdout, stderr) => {
        resolve({ ok: !error, output: `${stdout}${stderr}`.trim() });
      }
    );
  });
}

/**
 * Record who/when before the script runs — same shape as
 * modules/admin/actions.ts (audit insert inside a transaction with the tenant
 * GUC set). audit_event.entityId is uuid NOT NULL, so the line's TENANT id
 * stands in as the entity and the slug rides in intent. If the audit write
 * fails the relink is aborted: an unlogged re-pair is worse than a failed one.
 */
async function auditRelink(access: LinesAccess, slug: string, mode: string, phone: string | null) {
  // tenantForLine re-reads the overlay registry — a page-added line is
  // auditable even when this process predates its addition.
  const tenantSlug = tenantForLine(slug);
  const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, tenantSlug)).limit(1);
  if (!t) {
    // The line is mapped but its tenant row is missing (broken seed) — the
    // relink is legitimate ops work; log loudly and proceed unlogged rather
    // than leaving a dead line dead.
    console.error(`[lines] relink audit skipped — no tenant row for slug "${tenantSlug}"`);
    return;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL app.tenant_id = '${t.id}'`));
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId: access.userId,
      action: "wa_line_relink",
      entityType: "wa_line",
      entityId: t.id,
      intent:
        `[lines page] ${access.name ?? access.userId} relinked wa-${slug} ` +
        `(mode=${mode}${phone ? `, phone=+${phone}` : ""})`,
    });
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = await canManageLines();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { slug } = await params;
  if (!isKnownLine(slug)) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Banned numbers stay dark; a retired slug's handset pairs under another
  // line — re-pairing it would resurrect a duplicate session (AGENTS.md).
  if (!isRelinkableLine(slug)) {
    return NextResponse.json({ error: "line is banned or retired — never re-pair it" }, { status: 409 });
  }

  let body: { mode?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const mode = body.mode === "qr" || body.mode === "code" ? body.mode : null;
  if (!mode) return NextResponse.json({ error: "mode must be qr|code" }, { status: 400 });

  const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : null;
  if (mode === "code" && (!phone || !PAIR_PHONE_RE.test(phone))) {
    return NextResponse.json({ error: "phone must be 10-15 digits" }, { status: 400 });
  }

  // Cooldown: one fresh pairing attempt per line per 5 min (echoes the
  // --restart-delay 300000 ban rule; the script re-checks the stamp itself).
  if (!relinkCooldownOk(slug)) {
    return NextResponse.json(
      { error: "cooldown", cooldownUntil: relinkCooldownUntil(slug) },
      { status: 429 }
    );
  }

  const label = access.name ?? slug;
  try {
    await auditRelink(access, slug, mode, phone);
  } catch (e) {
    return NextResponse.json(
      { error: `audit write failed — relink aborted: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }

  const { ok, output } = await runRelinkScript(slug, mode, phone, label);
  return NextResponse.json(
    { ok, output, cooldownUntil: relinkCooldownUntil(slug) },
    { status: ok ? 200 : 409 }
  );
}
