/**
 * store.ts — the agent_availability table (drizzle/0073_agent_availability.sql).
 *
 * ONE row per roster agent (agent_key = lowercased roster name). Written by
 * the /availability hub page; read by the wa-lead relay (assignment) and the
 * rental-distributor sweeper (reassignment). The status semantics — busy
 * auto-expiry at read time, no-row-means-available — live in
 * modules/rental/rotation.ts (effectiveStatus) so all three readers share one
 * implementation.
 */
import { db } from "@/platform/db/client";
import { agentAvailability } from "@/platform/db/schema";
import { eq } from "drizzle-orm";
import type { AgentAvailability, AvailabilityStatus } from "@/modules/rental/rotation";

export type AvailabilityRow = AgentAvailability & {
  agentKey: string;
  displayName: string;
  brand: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  leaveDaysRemaining: number | null;
  /** Manager-set phone override (0077); null = the env roster phone rules. */
  phone: string | null;
  updatedAt: Date;
  updatedBy: string | null;
};

/** name → availability, keyed by the lowercased roster name. */
export async function loadAvailabilityMap(
  database: typeof db = db
): Promise<Record<string, AgentAvailability>> {
  const rows = await database.select().from(agentAvailability);
  const out: Record<string, AgentAvailability> = {};
  for (const r of rows) {
    out[r.agentKey] = { status: r.status as AvailabilityStatus, busyUntil: r.busyUntil ?? null, dayOff: r.dayOff ?? null };
  }
  return out;
}

/** Full rows for the /availability page (display name, brand, timestamps). */
export async function listAvailability(database: typeof db = db): Promise<AvailabilityRow[]> {
  const rows = await database.select().from(agentAvailability);
  return rows.map((r) => ({
    agentKey: r.agentKey,
    displayName: r.displayName,
    brand: r.brand,
    status: r.status as AvailabilityStatus,
    busyUntil: r.busyUntil ?? null,
    dayOff: r.dayOff ?? null,
    shiftStart: r.shiftStart ?? null,
    shiftEnd: r.shiftEnd ?? null,
    leaveDaysRemaining: r.leaveDaysRemaining ?? null,
    phone: r.phone ?? null,
    updatedAt: r.updatedAt,
    updatedBy: r.updatedBy ?? null,
  }));
}

/**
 * agent_key → manager-set phone override (0077), only rows that have one.
 * Read by the distributor (per pass) and the relay (at roster build) — see
 * rotation.applyPhoneOverrides.
 */
export async function loadPhoneOverrides(
  database: typeof db = db
): Promise<Record<string, string>> {
  const rows = await database
    .select({ agentKey: agentAvailability.agentKey, phone: agentAvailability.phone })
    .from(agentAvailability);
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.phone) out[r.agentKey] = r.phone;
  }
  return out;
}

/**
 * Upsert one agent's toggle. `busyTtlMs` sets busy_until = now + ttl for the
 * busy status; available/off clear it. The agent must come from the roster
 * config — the caller (API route) validates that before calling.
 */
export async function setAvailability(
  input: {
    name: string;
    brand: string;
    status: AvailabilityStatus;
    updatedBy: string | null;
    busyTtlMs: number;
    now?: Date;
  },
  database: typeof db = db
): Promise<AvailabilityRow> {
  const now = input.now ?? new Date();
  const agentKey = input.name.trim().toLowerCase();
  const busyUntil = input.status === "busy" ? new Date(now.getTime() + input.busyTtlMs) : null;
  const values = {
    agentKey,
    displayName: input.name.trim(),
    brand: input.brand,
    status: input.status,
    busyUntil,
    updatedAt: now,
    updatedBy: input.updatedBy,
  };
  await database
    .insert(agentAvailability)
    .values(values)
    .onConflictDoUpdate({
      target: agentAvailability.agentKey,
      // NB: the schedule/HR columns are NOT touched here — a status toggle
      // must never wipe the manager's schedule edits.
      set: {
        displayName: values.displayName,
        brand: values.brand,
        status: values.status,
        busyUntil: values.busyUntil,
        updatedAt: values.updatedAt,
        updatedBy: values.updatedBy,
      },
    });
  const rows = await database.select().from(agentAvailability).where(eq(agentAvailability.agentKey, agentKey));
  const row = rows[0];
  return {
    ...values,
    dayOff: row?.dayOff ?? null,
    shiftStart: row?.shiftStart ?? null,
    shiftEnd: row?.shiftEnd ?? null,
    leaveDaysRemaining: row?.leaveDaysRemaining ?? null,
    phone: row?.phone ?? null,
  };
}

/**
 * Manager-only schedule edit (the /availability page). Updates ONLY the
 * schedule/HR/phone columns; the live toggle (status/busyUntil) is left
 * alone — same discipline as the toggle not wiping the schedule. Day-off
 * semantics: whole Dubai day off — see rotation.effectiveStatus.
 * `phone` is the normalized digits override (null clears it, back to env).
 */
export async function setSchedule(
  input: {
    name: string;
    brand: string;
    dayOff: number | null;
    shiftStart: string | null;
    shiftEnd: string | null;
    leaveDaysRemaining: number | null;
    phone: string | null;
    updatedBy: string | null;
    now?: Date;
  },
  database: typeof db = db
): Promise<void> {
  const now = input.now ?? new Date();
  const agentKey = input.name.trim().toLowerCase();
  await database
    .insert(agentAvailability)
    .values({
      agentKey,
      displayName: input.name.trim(),
      brand: input.brand,
      dayOff: input.dayOff,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      leaveDaysRemaining: input.leaveDaysRemaining,
      phone: input.phone,
      updatedAt: now,
      updatedBy: input.updatedBy,
    })
    .onConflictDoUpdate({
      target: agentAvailability.agentKey,
      set: {
        displayName: input.name.trim(),
        brand: input.brand,
        dayOff: input.dayOff,
        shiftStart: input.shiftStart,
        shiftEnd: input.shiftEnd,
        leaveDaysRemaining: input.leaveDaysRemaining,
        phone: input.phone,
        updatedAt: now,
        updatedBy: input.updatedBy,
      },
    });
}
