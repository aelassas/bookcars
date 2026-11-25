import { NextResponse } from "next/server";
import { canUseAvailability } from "@/modules/availability/access";
import { listAvailability, setAvailability, setSchedule } from "@/modules/availability/store";
import {
  dubaiWeekday,
  effectiveStatus,
  loadRentalDistributorConfig,
  mergeRosterAgents,
  normalizePhoneOverride,
  type AvailabilityStatus,
} from "@/modules/rental/rotation";

export const dynamic = "force-dynamic";

// GET /availability/api — the rotation roster with each agent's CURRENT
// effective status (busy auto-expiry + weekly day off applied at read),
// polled by the page. ONE row per agent_key (Ayham, 2026-09-19): Ali and
// Abdullah sit in BOTH brand rotations and rendered twice; the row's brand
// cell shows "ETM + CARDIWAN", and the phone is the DB override when the
// manager set one, else the env-roster phone.
export async function GET() {
  const access = await canUseAvailability();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  const cfg = loadRentalDistributorConfig(process.env);
  const rows = await listAvailability();
  const byKey = new Map(rows.map((r) => [r.agentKey, r]));
  const now = new Date();

  const agents = mergeRosterAgents(cfg.rosters).map((m) => {
    const row = byKey.get(m.key);
    const status = effectiveStatus(row ?? null, now);
    return {
      name: m.name,
      brand: m.brands.map((b) => b.toUpperCase()).join(" + "),
      // DB override wins over the env roster phone (the same rule the
      // distributor/relay apply when SENDING — applyPhoneOverrides).
      phone: row?.phone ?? m.phone,
      phoneOverride: row?.phone ?? null,
      status,
      // Only meaningful while busy — when it passes, the status reads
      // "available" again (there is no janitor).
      busyUntil: row?.busyUntil?.toISOString() ?? null,
      dayOff: row?.dayOff ?? null,
      shiftStart: row?.shiftStart ?? null,
      shiftEnd: row?.shiftEnd ?? null,
      leaveDaysRemaining: row?.leaveDaysRemaining ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      editable: access.allowedNames.some((n) => n.trim().toLowerCase() === m.key),
    };
  });
  return NextResponse.json({
    agents,
    allowedNames: access.allowedNames,
    canPickAny: access.canPickAny,
    busyTtlMin: Math.round(cfg.busyTtlMs / 60_000),
    distributorEnabled: cfg.enabled,
    serverWeekday: dubaiWeekday(now),
    at: now.toISOString(),
  });
}

// POST /availability/api — two shapes:
//   { name, status }              set one roster agent's status (own row; manager any)
//   { name, schedule: {...} }     manager-only schedule/HR edit (canPickAny)
export async function POST(req: Request) {
  const access = await canUseAvailability();
  if (!access) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: {
    name?: unknown;
    status?: unknown;
    schedule?: {
      dayOff?: unknown;
      shiftStart?: unknown;
      shiftEnd?: unknown;
      leaveDaysRemaining?: unknown;
      phone?: unknown;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }

  const cfg = loadRentalDistributorConfig(process.env);
  const key = name.toLowerCase();
  const brand =
    (["etm", "cardiwan"] as const).find((b) =>
      cfg.rosters[b].some((a) => a.name.trim().toLowerCase() === key)
    ) ?? "";
  if (!brand) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // ── Schedule edit: managers only. The live toggle is untouched. ──
  if (body.schedule && typeof body.schedule === "object") {
    if (!access.canPickAny) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const s = body.schedule;
    const dayOff =
      s.dayOff === null ? null : typeof s.dayOff === "number" && s.dayOff >= 0 && s.dayOff <= 6 ? s.dayOff : undefined;
    if (dayOff === undefined) {
      return NextResponse.json({ error: "schedule.dayOff: null or 0..6 required" }, { status: 400 });
    }
    const shiftStart = typeof s.shiftStart === "string" ? s.shiftStart.trim() || null : null;
    const shiftEnd = typeof s.shiftEnd === "string" ? s.shiftEnd.trim() || null : null;
    const leaveDaysRemaining =
      typeof s.leaveDaysRemaining === "number" && s.leaveDaysRemaining >= 0
        ? Math.floor(s.leaveDaysRemaining)
        : s.leaveDaysRemaining === null
          ? null
          : undefined;
    if (leaveDaysRemaining === undefined) {
      return NextResponse.json({ error: "schedule.leaveDaysRemaining: non-negative number or null" }, { status: 400 });
    }
    // Phone override: empty string CLEARS it (back to the env roster phone);
    // a non-empty value must normalize to ≥9 digits, never a guess.
    const rawPhone = typeof s.phone === "string" ? s.phone : "";
    const phone = rawPhone.trim() === "" ? null : normalizePhoneOverride(rawPhone);
    if (rawPhone.trim() !== "" && !phone) {
      return NextResponse.json({ error: "schedule.phone: digits (≥9) or empty to clear" }, { status: 400 });
    }
    await setSchedule({
      name,
      brand,
      dayOff,
      shiftStart,
      shiftEnd,
      leaveDaysRemaining,
      phone,
      updatedBy: access.name ?? access.userId,
    });
    return NextResponse.json({ ok: true, name, schedule: { dayOff, shiftStart, shiftEnd, leaveDaysRemaining, phone } });
  }

  // ── Status toggle: the agent's own row, or any row for a manager. ──
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!["available", "busy", "off"].includes(status)) {
    return NextResponse.json({ error: "status (available|busy|off) or schedule required" }, { status: 400 });
  }
  const allowed = access.allowedNames.some((n) => n.trim().toLowerCase() === key);
  if (!allowed) {
    // Not the caller's row (or not in any roster) — same 404 shape as lines.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const row = await setAvailability({
    name,
    brand,
    status: status as AvailabilityStatus,
    updatedBy: access.name ?? access.userId,
    busyTtlMs: cfg.busyTtlMs,
  });
  return NextResponse.json({
    ok: true,
    name: row.displayName,
    status: effectiveStatus(row, new Date()),
    busyUntil: row.busyUntil?.toISOString() ?? null,
  });
}
