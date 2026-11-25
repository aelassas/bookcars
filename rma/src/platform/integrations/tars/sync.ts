// TARS → CRM sync: maps the TARS fleet registry and rental contracts onto the
// vehicle / customer / rental tables and upserts them.
//
// Identity rules (mirroring the probe data, verified 2026-10-23):
//   vehicle  — match by VIN FIRST, then normalized plate. Each existing CRM
//              vehicle can be claimed only once per plan, so a reassigned UAE
//              plate can never merge two physical cars into one rental history.
//   customer — the contract driver with isCustomer=true (fallback: drivers[0]).
//              Match by Emirates ID first, then phone tail-9.
//   rental   — match by rental.tars_document_number ("55606-3350"), unique per
//              tenant (0080).
//
// TARS exposes no money on the contract list payload, so the NOT NULL price
// columns (daily_rate / total / balance_due / deposit) are written as 0 —
// a synced contract is the legal record, not the invoice. total_days is
// derived from start→expectedReturn.
//
// Import-safe: no env reads, no DB connects, no side effects at module load —
// every entry point takes its inputs as arguments. (pg-boss registration comes
// later; until then scripts/tars-sync.ts is the only caller.)

import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { customer, rental, vehicle } from "@/platform/db/schema";
import type { TarsDriver, TarsRental, TarsVehicle } from "./client";

// ---- Mapped shapes ---------------------------------------------------------

export interface MappedVehicle {
  plate: string; // "Q 51353"
  vin: string;
  make: string;
  model: string;
  year: number | null;
  status: string | null; // CRM status, null = unrecognized → leave untouched
  registrationExpiry: string | null; // date "2027-09-27"
  tarsDid: string;
}

export interface MappedCustomer {
  name: string;
  phone: string | null; // "+971544672498"
  email: string | null;
  emiratesId: string | null; // "784-1985-6568488-7"
  tarsDid: string | null; // "did:eid:784198565684887"
}

export interface MappedRental {
  documentNumber: string;
  status: string | null; // CRM status
  channel: string; // b2c | b2b
  startDate: Date;
  returnDate: Date;
  totalDays: number;
  startOdometer: number | null;
  vehicleVin: string;
  customer: MappedCustomer;
  /** Embedded vehicle snapshot — full TarsVehicle, for orphan-contract cars. */
  vehicleSnapshot: TarsVehicle | null;
}

// ---- Mappers (pure) --------------------------------------------------------

/** vehicle.status enum: available | on_rent | reserved | in_service | overdue | sold. */
const VEHICLE_STATUS: Record<string, string> = {
  AVAILABLE: "available",
  RENTED: "on_rent",
};

/** rental.status enum: reserved | active | returned | completed | cancelled. */
const RENTAL_STATUS: Record<string, string> = {
  ACTIVE: "active",
  CLOSED: "completed",
};

function en(v: { en?: string | null } | undefined): string | null {
  const s = v?.en?.trim();
  return s ? s : null;
}

/** "2027-09-27" or "2027-05-10T00:00:00.000Z" (embedded snapshots) → "YYYY-MM-DD". */
function dateOnly(s: string | null | undefined): string | null {
  const m = s?.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** TARS plate → stored form "Q 51353" (code + number, number-only if no code). */
function plateLabel(v: TarsVehicle): string | null {
  const number = v.plate?.number?.trim();
  if (!number) return null;
  const code = en(v.plate?.code);
  return code ? `${code} ${number}` : number;
}

/** Returns null when the car has no plate — a plateless row is a sticky note, not a car. */
export function mapTarsVehicle(v: TarsVehicle): MappedVehicle | null {
  const plate = plateLabel(v);
  const vin = (v.vin ?? v.sourceKey ?? "").trim();
  if (!plate || !vin) return null;
  return {
    plate,
    vin,
    make: en(v.vehicleMake?.name) ?? "Unknown",
    model: en(v.vehicleModel?.name) ?? "Unknown",
    year: typeof v.modelYear === "number" ? v.modelYear : null,
    status: (v.status && VEHICLE_STATUS[v.status]) || null,
    registrationExpiry: dateOnly(v.details?.registration?.expiryDate),
    tarsDid: v.did,
  };
}

function driverName(d: TarsDriver): string {
  const n = [d.name?.en?.firstName, d.name?.en?.lastName]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  return n || "Unknown";
}

function driverPhone(d: TarsDriver): string | null {
  const phones = d.contact?.phones ?? [];
  const p = phones.find((x) => x.preferred) ?? phones[0];
  if (!p?.phone) return null;
  const digits = p.phone.replace(/\D/g, "");
  const cc = (p.countryCode ?? "").replace(/\D/g, "");
  return `+${cc}${digits}`;
}

export function mapTarsDriverToCustomer(d: TarsDriver): MappedCustomer {
  const emails = d.contact?.emails ?? [];
  const email = (emails.find((x) => x.preferred) ?? emails[0])?.email?.trim() || null;
  return {
    name: driverName(d),
    phone: driverPhone(d),
    email,
    emiratesId: d.emiratesId?.id?.trim() || null,
    tarsDid: d.did ?? null,
  };
}

/** Returns null when the contract is unusable (no detail block / dates / VIN / driver). */
export function mapTarsRental(r: TarsRental): MappedRental | null {
  const detail = r.details?.find((d) => d.isCurrent) ?? r.details?.[0];
  const driver = detail?.drivers?.find((d) => d.isCustomer) ?? detail?.drivers?.[0];
  const vin = (detail?.vehicle?.vin ?? detail?.vehicle?.sourceKey ?? "").trim();
  const start = detail?.startDate ?? r.documentDateTime;
  const end = detail?.expectedReturnDate;
  if (!r.documentNumber || !detail || !driver || !vin || !start || !end) return null;

  const startDate = new Date(start);
  const returnDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(returnDate.getTime())) return null;

  const totalDays = Math.max(1, Math.round((returnDate.getTime() - startDate.getTime()) / 86_400_000));
  const kind = (r.kind ?? "").toUpperCase();
  const readings = detail.readings ?? [];
  const odometer = readings[readings.length - 1]?.odometer?.value;
  const startOdometer = typeof odometer === "number" && Number.isFinite(odometer) && odometer >= 0
    ? Math.round(odometer)
    : null;

  return {
    documentNumber: r.documentNumber,
    status: (r.status && RENTAL_STATUS[r.status]) || null,
    channel: kind === "B2B" ? "b2b" : "b2c",
    startDate,
    returnDate,
    totalDays,
    startOdometer,
    vehicleVin: vin,
    customer: mapTarsDriverToCustomer(driver),
    vehicleSnapshot: detail.vehicle ?? null,
  };
}

// ---- Matching (pure) -------------------------------------------------------

/** Strip everything that is not a letter or digit — same rule as kaiten/mappings. */
export function normalizePlate(plate: string): string {
  return plate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function phoneTail9(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits || null;
}

export interface ExistingVehicleRow {
  id: string;
  plate: string;
  vin: string | null;
  externalId: string | null;
  externalSource: string | null;
}

export interface ExistingCustomerRow {
  id: string;
  phone: string | null;
  emiratesId: string | null;
  externalId: string | null;
  externalSource: string | null;
}

export interface ExistingRentalRow {
  id: string;
  vehicleId: string;
  startDate: Date;
  returnDate: Date;
  status: string;
  tarsDocumentNumber: string | null;
  extensionStatus?: string | null;
}

export interface ExistingState {
  vehicles: ExistingVehicleRow[];
  customers: ExistingCustomerRow[];
  rentals: ExistingRentalRow[];
}

export type PlanAction = "insert" | "update" | "unknown"; // unknown = offline dry-run, no DB read

export interface VehiclePlanItem {
  action: PlanAction;
  mapped: MappedVehicle;
  existingId: string | null;
  matchedBy: "plate" | "vin" | null;
}

export interface CustomerPlanItem {
  action: PlanAction;
  mapped: MappedCustomer;
  existingId: string | null;
  matchedBy: "emirates_id" | "phone" | null;
}

export interface RentalPlanItem {
  action: PlanAction;
  mapped: MappedRental;
  existingId: string | null;
  preserveLocalExtension: boolean;
}

export interface SyncPlan {
  vehicles: VehiclePlanItem[];
  customers: CustomerPlanItem[];
  rentals: RentalPlanItem[];
  skipped: string[]; // human-readable reasons
}

export function matchVehicle(m: MappedVehicle, existing: ExistingVehicleRow[]): {
  row: ExistingVehicleRow | null;
  matchedBy: "plate" | "vin" | null;
} {
  const byVin = existing.find(
    (r) => r.vin === m.vin || (r.externalSource === "tars" && r.externalId === m.vin),
  );
  if (byVin) return { row: byVin, matchedBy: "vin" };
  const plate = normalizePlate(m.plate);
  const byPlate = existing.find((r) => normalizePlate(r.plate) === plate);
  if (byPlate) return { row: byPlate, matchedBy: "plate" };
  return { row: null, matchedBy: null };
}

export function matchCustomer(m: MappedCustomer, existing: ExistingCustomerRow[]): {
  row: ExistingCustomerRow | null;
  matchedBy: "emirates_id" | "phone" | null;
} {
  if (m.emiratesId) {
    const byEid = existing.find((r) => r.emiratesId === m.emiratesId);
    if (byEid) return { row: byEid, matchedBy: "emirates_id" };
  }
  const tail = phoneTail9(m.phone);
  if (tail) {
    const byPhone = existing.find((r) => phoneTail9(r.phone) === tail);
    if (byPhone) return { row: byPhone, matchedBy: "phone" };
  }
  const byExternal = existing.find(
    (r) => r.externalSource === "tars" && m.tarsDid && r.externalId === m.tarsDid,
  );
  if (byExternal) return { row: byExternal, matchedBy: "emirates_id" };
  return { row: null, matchedBy: null };
}

/**
 * Build the full insert/update plan. `existing` of null means OFFLINE dry-run
 * (no DB reachable) — every action then comes out "unknown" instead of a
 * false "insert".
 */
export function buildPlan(
  tarsVehicles: TarsVehicle[],
  tarsRentals: TarsRental[],
  existing: ExistingState | null,
): SyncPlan {
  const offline = existing === null;
  const existingVehicles = existing?.vehicles ?? [];
  const existingCustomers = existing?.customers ?? [];
  const existingRentals = existing?.rentals ?? [];
  const remainingVehicles = [...existingVehicles];
  const usedRentalIds = new Set<string>();
  const plan: SyncPlan = { vehicles: [], customers: [], rentals: [], skipped: [] };
  const action = (matched: unknown): PlanAction => (offline ? "unknown" : matched ? "update" : "insert");

  const plannedVehicles = new Map<string, MappedVehicle>(); // vin → mapped
  const addVehicle = (mapped: MappedVehicle) => {
    if (plannedVehicles.has(mapped.vin)) return;
    const { row, matchedBy } = matchVehicle(mapped, remainingVehicles);
    if (row) remainingVehicles.splice(remainingVehicles.findIndex((r) => r.id === row.id), 1);
    plannedVehicles.set(mapped.vin, mapped);
    plan.vehicles.push({ action: action(row), mapped, existingId: row?.id ?? null, matchedBy });
  };

  // Vehicles — fleet endpoint.
  for (const raw of tarsVehicles) {
    const mapped = mapTarsVehicle(raw);
    if (!mapped) {
      plan.skipped.push(`vehicle ${raw.did ?? raw.sourceKey ?? "?"}: no plate or VIN`);
      continue;
    }
    addVehicle(mapped);
  }

  // Rentals — contracts; their embedded vehicles/customers join the plan.
  const plannedCustomers = new Map<string, CustomerPlanItem>(); // eid|phone|did → item
  for (const raw of tarsRentals) {
    const mapped = mapTarsRental(raw);
    if (!mapped) {
      plan.skipped.push(`rental ${raw.documentNumber ?? raw.did ?? "?"}: missing detail/driver/VIN/dates`);
      continue;
    }

    // Contract car not in the fleet list (sold/transferred since) — still sync it.
    if (!plannedVehicles.has(mapped.vehicleVin) && mapped.vehicleSnapshot) {
      const snap = mapTarsVehicle(mapped.vehicleSnapshot);
      if (snap) addVehicle(snap);
    }

    const custKey = mapped.customer.emiratesId ?? phoneTail9(mapped.customer.phone) ??
      mapped.customer.tarsDid ?? mapped.customer.name;
    if (!plannedCustomers.has(custKey)) {
      const { row, matchedBy } = matchCustomer(mapped.customer, existingCustomers);
      plannedCustomers.set(custKey, {
        action: action(row),
        mapped: mapped.customer,
        existingId: row?.id ?? null,
        matchedBy,
      });
    }

    const vehicleId = plan.vehicles.find((v) => v.mapped.vin === mapped.vehicleVin)?.existingId;
    const day = (value: Date) => value.toISOString().slice(0, 10);
    const existingRental = existingRentals.find((r) => r.tarsDocumentNumber === mapped.documentNumber)
      ?? existingRentals.find((r) =>
        !r.tarsDocumentNumber && !usedRentalIds.has(r.id) && r.vehicleId === vehicleId && r.status === mapped.status &&
        day(r.startDate) === day(mapped.startDate) && day(r.returnDate) === day(mapped.returnDate)
      );
    if (existingRental) usedRentalIds.add(existingRental.id);
    plan.rentals.push({
      action: action(existingRental),
      mapped,
      existingId: existingRental?.id ?? null,
      preserveLocalExtension: ["extension_confirmed", "long_term"].includes(existingRental?.extensionStatus ?? ""),
    });
  }

  plan.customers = [...plannedCustomers.values()];
  return plan;
}

// ---- Apply (DB) ------------------------------------------------------------

export interface SyncCounts {
  vehiclesInserted: number;
  vehiclesUpdated: number;
  customersInserted: number;
  customersUpdated: number;
  rentalsInserted: number;
  rentalsUpdated: number;
  skipped: string[];
}

/** Read the rows the matcher needs, tenant-scoped (AGENTS.md rule 1). */
export async function loadExisting(tenantId: string): Promise<ExistingState> {
  return withDrizzleTenant(tenantId, async (tx) => ({
    vehicles: await tx
      .select({
        id: vehicle.id,
        plate: vehicle.plate,
        vin: vehicle.vin,
        externalId: vehicle.externalId,
        externalSource: vehicle.externalSource,
      })
      .from(vehicle),
    customers: await tx
      .select({
        id: customer.id,
        phone: customer.phone,
        emiratesId: customer.emiratesId,
        externalId: customer.externalId,
        externalSource: customer.externalSource,
      })
      .from(customer),
    rentals: await tx
      .select({
        id: rental.id,
        vehicleId: rental.vehicleId,
        startDate: rental.startDate,
        returnDate: rental.returnDate,
        status: rental.status,
        tarsDocumentNumber: rental.tarsDocumentNumber,
        extensionStatus: rental.extensionStatus,
      })
      .from(rental),
  }));
}

/**
 * Write a plan to the database. Vehicles → customers → rentals, so the rental
 * rows resolve their FKs from the upserts that just ran. One transaction per
 * sync via withDrizzleTenant: a half-applied sync is worse than a failed one.
 */
export async function applyPlan(tenantId: string, plan: SyncPlan): Promise<SyncCounts> {
  const counts: SyncCounts = {
    vehiclesInserted: 0,
    vehiclesUpdated: 0,
    customersInserted: 0,
    customersUpdated: 0,
    rentalsInserted: 0,
    rentalsUpdated: 0,
    skipped: plan.skipped,
  };

  await withDrizzleTenant(tenantId, async (tx) => {
    const vehicleIdByVin = new Map<string, string>();
    const customerIdByKey = new Map<string, string>();

    // ── Vehicles ────────────────────────────────────────────────────────────
    for (const item of plan.vehicles) {
      const m = item.mapped;
      const data = {
        make: m.make,
        model: m.model,
        year: m.year,
        plate: m.plate,
        vin: m.vin,
        registrationExpiry: m.registrationExpiry,
        updatedAt: new Date(),
        ...(m.status ? { status: m.status } : {}),
      };
      if (item.existingId) {
        await tx
          .update(vehicle)
          // Never clobber an existing external link (kaiten/pilot) — TARS
          // identity lives in vehicle.vin for rows born elsewhere.
          .set(data)
          .where(eq(vehicle.id, item.existingId));
        vehicleIdByVin.set(m.vin, item.existingId);
        counts.vehiclesUpdated++;
      } else {
        const rows = await tx
          .insert(vehicle)
          .values({
            tenantId,
            ...data,
            status: m.status ?? "available",
            externalId: m.vin,
            externalSource: "tars",
          })
          .returning({ id: vehicle.id });
        const row = Array.isArray(rows) ? rows[0] : rows;
        vehicleIdByVin.set(m.vin, (row as { id: string }).id);
        counts.vehiclesInserted++;
      }
    }

    // ── Customers ───────────────────────────────────────────────────────────
    for (const item of plan.customers) {
      const m = item.mapped;
      const key = m.emiratesId ?? phoneTail9(m.phone) ?? m.tarsDid ?? m.name;
      const data = {
        name: m.name,
        phone: m.phone,
        email: m.email,
        emiratesId: m.emiratesId,
        updatedAt: new Date(),
      };
      if (item.existingId) {
        await tx.update(customer).set(data).where(eq(customer.id, item.existingId));
        customerIdByKey.set(key, item.existingId);
        counts.customersUpdated++;
      } else {
        const rows = await tx
          .insert(customer)
          .values({
            tenantId,
            ...data,
            source: "tars",
            externalId: m.tarsDid,
            externalSource: m.tarsDid ? "tars" : null,
          })
          .returning({ id: customer.id });
        const row = Array.isArray(rows) ? rows[0] : rows;
        customerIdByKey.set(key, (row as { id: string }).id);
        counts.customersInserted++;
      }
    }

    // ── Rentals ─────────────────────────────────────────────────────────────
    for (const item of plan.rentals) {
      const m = item.mapped;
      const vehicleId = vehicleIdByVin.get(m.vehicleVin);
      const custKey = m.customer.emiratesId ?? phoneTail9(m.customer.phone) ??
        m.customer.tarsDid ?? m.customer.name;
      const customerId = customerIdByKey.get(custKey);
      if (!vehicleId || !customerId) {
        counts.skipped.push(
          `rental ${m.documentNumber}: unresolved ${!vehicleId ? `vehicle ${m.vehicleVin}` : `customer ${custKey}`}`,
        );
        continue;
      }
      const data = {
        customerId,
        vehicleId,
        startDate: m.startDate,
        returnDate: m.returnDate,
        totalDays: m.totalDays,
        channel: m.channel,
        updatedAt: new Date(),
        ...(m.status ? { status: m.status } : {}),
        ...(m.startOdometer !== null ? { startOdometer: m.startOdometer } : {}),
      };
      try {
        if (item.existingId) {
          const updateData = item.preserveLocalExtension
            ? { customerId, vehicleId, startDate: m.startDate, channel: m.channel, updatedAt: data.updatedAt,
                ...(m.status ? { status: m.status } : {}),
                ...(m.startOdometer !== null ? { startOdometer: m.startOdometer } : {}) }
            : data;
          await tx.update(rental).set({ ...updateData, tarsDocumentNumber: m.documentNumber }).where(eq(rental.id, item.existingId));
          counts.rentalsUpdated++;
        } else {
          await tx.insert(rental).values({
            tenantId,
            ...data,
            // TARS exposes no money on the contract payload — the NOT NULL price
            // columns stay 0 until someone records the real numbers in the CRM.
            dailyRate: 0,
            total: 0,
            status: m.status ?? "reserved",
            tarsDocumentNumber: m.documentNumber,
          });
          counts.rentalsInserted++;
        }
      } catch (error) {
        const root = error instanceof Error && error.cause instanceof Error ? error.cause : error;
        throw new Error(`TARS rental ${m.documentNumber}: ${root instanceof Error ? root.message : root}`);
      }
    }
  });

  return counts;
}

export interface SyncTarsOptions {
  tenantId: string;
  tarsVehicles: TarsVehicle[];
  tarsRentals: TarsRental[];
  /** false = plan only, no writes. */
  commit: boolean;
  /** Pre-loaded existing state; null = offline (plan-only). Omitted = read tenant-scoped. */
  existing?: ExistingState | null;
}

export async function syncTars(opts: SyncTarsOptions): Promise<{ plan: SyncPlan; counts: SyncCounts | null }> {
  const existing = opts.existing !== undefined ? opts.existing : await loadExisting(opts.tenantId);
  const plan = buildPlan(opts.tarsVehicles, opts.tarsRentals, existing);
  if (!opts.commit) return { plan, counts: null };
  if (existing === null) throw new Error("syncTars: cannot --commit without a database read");
  const counts = await applyPlan(opts.tenantId, plan);
  return { plan, counts };
}
