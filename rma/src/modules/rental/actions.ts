"use server";

import { rental, vehicle, auditEvent, deal, payment, lease, customer } from "@/platform/db/schema";
import { normalizePhone, PG_NON_DIGIT_RE, MIN_PHONE_MATCH_DIGITS } from "@/platform/messaging/phone";
import { quoteRental, booking as legacyBooking, type Channel } from "@/platform/db/rental-extras";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { assertNotPreviewMode } from "@/platform/tenancy/guard";
import { eq, and, asc, lte, gte, inArray, sql } from "drizzle-orm";
import type { db } from "@/platform/db/client";

// Transaction handle passed through by withDrizzleTenant.
type DbTx = typeof db;
import { revalidatePath } from "next/cache";
import { canManageRentalsForTenant } from "./policies";
import { requireAuth } from "@/platform/auth/authorization";
import { requireFleetHomeTenantId } from "@/modules/fleet/fleet-home";
import { insertPurposeChangeEvent } from "@/modules/fleet/purpose-events";
import { computeDepositResolution, depositNotification, type DepositOutcome } from "./deposit";
import { isBookingBasis } from "./booking";
import { parseTarsDocumentNumber } from "@/platform/integrations/tars/handoff";

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// Legacy createRental removed (swarm audit 2026-07-29): dead export that wrote
// rentals into the brand tenant with a client-trusted actor. The ONLY create
// path is createRentalFromQuote below.

export async function startRental(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  // Audit integrity (swarm audit): actor from the session, never the client.
  void actorId;
  const trustedActorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx.select({ status: rental.status, vehicleId: rental.vehicleId }).from(rental).where(eq(rental.id, id)).limit(1);
    if (!current) throw new Error("Rental not found");
    if (current.status !== "reserved") throw new Error(`Cannot start rental with status ${current.status}`);

    const [row] = await tx
      .update(rental)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(rental.id, id))
      .returning();

    await tx
      .update(vehicle)
      .set({ status: "on_rent", updatedAt: new Date() })
      .where(eq(vehicle.id, row.vehicleId));

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.start",
      entityType: "rental",
      entityId: id,
      intent: "Rental started, vehicle handed over",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/rentals`);
    return row;
  });
}

export async function confirmTarsUpload(
  tenantId: string,
  rentalId: string,
  documentNumber: string,
  tenantSlug: string,
  signatureConfirmed: boolean,
) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  const trustedActorId = await requireAuth();
  if (!signatureConfirmed) throw new Error("Confirm the required signatures before recording the TARS upload");
  const normalizedDocument = parseTarsDocumentNumber(documentNumber);

  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx
      .select({ contractUrl: rental.contractUrl, tarsDocumentNumber: rental.tarsDocumentNumber, dealId: rental.dealId })
      .from(rental)
      .where(eq(rental.id, rentalId))
      .limit(1);
    if (!current) throw new Error("Rental not found");
    if (!current.contractUrl) throw new Error("Generate the rental contract before recording the TARS upload");
    if (current.tarsDocumentNumber && current.tarsDocumentNumber !== normalizedDocument) {
      throw new Error(`This rental is already linked to TARS document ${current.tarsDocumentNumber}`);
    }

    const rows = await tx
      .update(rental)
      .set({ tarsDocumentNumber: normalizedDocument, updatedAt: new Date() })
      .where(eq(rental.id, rentalId))
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;

    if (current.dealId) {
      await tx
        .update(deal)
        .set({ stage: "tars", updatedAt: new Date(), lastActivityAt: new Date() })
        .where(and(eq(deal.id, current.dealId), inArray(deal.stage, ["inquiry", "quote", "contract"])));
    }

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.tars.confirmed",
      entityType: "rental",
      entityId: rentalId,
      intent: `Staff confirmed signed contract upload to TARS as ${normalizedDocument}`,
    });

    revalidatePath(`/${tenantSlug}/rentals/${rentalId}`);
    revalidatePath(`/${tenantSlug}/deals`);
    return row;
  });
}

export interface ReturnInspectionInput {
  actualReturnDate?: Date;
  finalOdometer?: number;
  fuelLevel?: number;
  damageNotes?: string;
  extraChargeAmount?: number;
  extraChargeReason?: string;
}

function extraDays(returnDate: Date, actualReturnDate: Date): number {
  const ms = actualReturnDate.getTime() - returnDate.getTime();
  return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
}

export async function processReturn(
  tenantId: string,
  actorId: string | undefined,
  id: string,
  data: ReturnInspectionInput,
  tenantSlug?: string
) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  void actorId;
  const trustedActorId = await requireAuth();
  // Shared fleet: rental + vehicle + audit rows live in fleet-home.
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx.select().from(rental).where(eq(rental.id, id)).limit(1);
    if (!current) throw new Error("Rental not found");
    if (current.status !== "active") throw new Error(`Cannot process return for rental with status ${current.status}`);

    const actualReturnDate = data.actualReturnDate ?? new Date();
    const lateFee = extraDays(current.returnDate, actualReturnDate) * current.dailyRate;
    const manualExtra = data.extraChargeAmount ?? 0;
    const totalExtra = lateFee + manualExtra;

    const [row] = await tx
      .update(rental)
      .set({
        status: "returned",
        actualReturnDate,
        finalOdometer: data.finalOdometer ?? null,
        fuelLevel: data.fuelLevel ?? null,
        damageNotes: data.damageNotes ?? null,
        extraChargeAmount: manualExtra,
        extraChargeReason: data.extraChargeReason ?? null,
        total: current.total + totalExtra,
        balanceDue: current.balanceDue + totalExtra,
        returnedBy: trustedActorId,
        updatedAt: new Date(),
      })
      .where(eq(rental.id, id))
      .returning();

    await tx
      .update(vehicle)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(vehicle.id, row.vehicleId));

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.return",
      entityType: "rental",
      entityId: id,
      intent: `Vehicle returned. Late fee ${lateFee} AED, extra charges ${manualExtra} AED.`,
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/rentals`);
    return row;
  });
}

export async function completeRental(
  tenantId: string,
  actorId: string | undefined,
  id: string,
  tenantSlug?: string,
  // Completing a rental clears any remaining balance. When money is still
  // owed, that is a debt write-off and MUST be an explicit decision — the
  // caller has to pass writeOffConfirmed:true (surfaced via the client
  // confirm dialog). Without it, a rental with an outstanding balance cannot
  // be completed and no silent write-off happens.
  writeOffConfirmed = false
) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  void actorId;
  const trustedActorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx
      .select({ status: rental.status, balanceDue: rental.balanceDue })
      .from(rental)
      .where(eq(rental.id, id))
      .limit(1);
    if (!current) throw new Error("Rental not found");
    if (current.status !== "returned") throw new Error(`Cannot complete rental with status ${current.status}`);

    const balanceDue = Number(current.balanceDue) || 0;
    if (balanceDue > 0 && !writeOffConfirmed) {
      throw new Error(
        `Rental has an outstanding balance of ${balanceDue}. Record the payment first, or confirm the write-off to complete.`
      );
    }
    const writtenOff = balanceDue > 0;

    const [row] = await tx
      .update(rental)
      .set({ status: "completed", balanceDue: 0, updatedAt: new Date() })
      .where(eq(rental.id, id))
      .returning();

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.complete",
      entityType: "rental",
      entityId: id,
      intent: writtenOff
        ? `Rental completed; outstanding balance of ${balanceDue} written off (confirmed)`
        : "Rental completed",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/rentals`);
    return row;
  });
}

export async function cancelRental(tenantId: string, actorId: string | undefined, id: string, tenantSlug?: string) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  void actorId;
  const trustedActorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx.select({ status: rental.status, vehicleId: rental.vehicleId }).from(rental).where(eq(rental.id, id)).limit(1);
    if (!current) throw new Error("Rental not found");
    if (!["reserved", "active"].includes(current.status)) throw new Error(`Cannot cancel rental with status ${current.status}`);

    const [row] = await tx
      .update(rental)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(rental.id, id))
      .returning();

    await tx
      .update(vehicle)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(vehicle.id, row.vehicleId));

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.cancel",
      entityType: "rental",
      entityId: id,
      intent: "Rental cancelled",
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/rentals`);
    return row;
  });
}

// Deposit-contract: resolve the held deposit at end of rental — returned in
// full, partially returned, or withheld with a reason. Raises a deposit
// notification (audit event). Sales-gated. Only valid once the vehicle is back
// (status returned/completed) and not already resolved.
export async function resolveDeposit(
  tenantId: string,
  actorId: string | undefined,
  id: string,
  data: { outcome: DepositOutcome; refundedAmount?: number; reason?: string },
  tenantSlug?: string
) {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  void actorId;
  const trustedActorId = await requireAuth();
  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [current] = await tx.select().from(rental).where(eq(rental.id, id)).limit(1);
    if (!current) throw new Error("Rental not found");
    if (!["returned", "completed"].includes(current.status)) {
      throw new Error(`Deposit can only be resolved after the vehicle is returned (current status: ${current.status})`);
    }
    if (current.depositStatus !== "held") throw new Error("Deposit has already been resolved");

    const res = computeDepositResolution(current.deposit, data.outcome, data.refundedAmount, data.reason);

    const [row] = await tx
      .update(rental)
      .set({
        depositStatus: res.depositStatus,
        depositRefunded: res.depositRefunded,
        depositWithheldReason: res.depositWithheldReason,
        depositResolvedAt: new Date(),
        depositResolvedBy: trustedActorId,
        updatedAt: new Date(),
      })
      .where(eq(rental.id, id))
      .returning();

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action:
        res.depositStatus === "returned"
          ? "deposit.returned"
          : res.depositStatus === "partial"
            ? "deposit.partial"
            : "deposit.withheld",
      entityType: "rental",
      entityId: id,
      intent: depositNotification(res, current.deposit),
    });

    if (tenantSlug) {
      revalidatePath(`/${tenantSlug}/rentals/${id}`);
      revalidatePath(`/${tenantSlug}/rentals`);
    }
    return row;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Money-flow bridge (canonical create path).
//
// Canonical model: `rental` is the business table (customer/deal/lead FKs,
// deposit lifecycle, payments FK, status machine). `booking` is the legacy
// read-only import of Babek's sheet — the calendar still shows those rows, but
// nothing new is ever written to it. This action is the ONLY way the UI
// creates a rental: price comes from the real `price_tier` data via
// quoteRental(), never hand-typed (manual rate is a clearly-flagged fallback
// for the vehicles that have no tiers yet).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rent brands (cardiwan/easyrent) keep their own customers, but rentals live in
 * the shared fleet-home tenant and `rental.customer_id` FKs the fleet-home
 * customer table. So a rent-brand booking must mirror the chosen customer into
 * fleet-home: match an existing home customer by phone (last 9 digits), else
 * create one. Returns the fleet-home customer id to store on the rental. No-op
 * (returns the id unchanged) when the caller already IS fleet-home (sales).
 *
 * Split in two so the mirror runs INSIDE the caller's fleet-home transaction:
 * a mirrored customer used to commit in a separate transaction before the
 * rental — a failed booking left an orphaned home customer behind.
 */
async function readBrandCustomer(
  brandTenantId: string,
  customerId: string,
): Promise<{ id: string; name: string; phone: string | null; email: string | null; source: string | null }> {
  const src = await withDrizzleTenant(brandTenantId, async (tx) => {
    const [c] = await tx
      .select({ id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, source: customer.source })
      .from(customer)
      .where(eq(customer.id, customerId))
      .limit(1);
    return c ?? null;
  });
  if (!src) throw new Error("Customer not found");
  return src;
}

// Unique-violation code from node-pg — defensive: fires only once the tail9
// index becomes UNIQUE (blocked on customer-table dedupe; see migration
// 0061). Until then mirror races are serialized by the advisory lock below.
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

async function matchHomeCustomerByPhone(
  tx: DbTx,
  phone: string | null,
): Promise<string | null> {
  const digits = normalizePhone(phone);
  if (digits.length >= MIN_PHONE_MATCH_DIGITS) {
    const tail = digits.slice(-MIN_PHONE_MATCH_DIGITS);
    // Deterministic pick on tail collisions (several home rows can share a
    // tail: a sales customer and an old rent one): the OLDEST record is the
    // canonical one the mirror has been attaching to all along.
    const [match] = await tx
      .select({ id: customer.id })
      .from(customer)
      .where(
        sql`right(regexp_replace(coalesce(${customer.phone}, ''), ${PG_NON_DIGIT_RE}, '', 'g'), ${MIN_PHONE_MATCH_DIGITS}) = ${tail}`,
      )
      .orderBy(asc(customer.createdAt), asc(customer.id))
      .limit(1);
    if (match) return match.id;
  } else if (digits.length > 0 && phone) {
    // Short but present phone: exact-string match, so a repeat booking of the
    // same customer doesn't mint a duplicate every time.
    const [match] = await tx.select({ id: customer.id }).from(customer).where(eq(customer.phone, phone)).limit(1);
    if (match) return match.id;
  }
  return null;
}

async function mirrorCustomerIntoHome(
  tx: DbTx,
  home: string,
  src: { id: string; name: string; phone: string | null; email: string | null; source: string | null },
): Promise<string> {
  // Serialize mirror attempts for the same brand customer: the customer table
  // has no usable unique key yet (duplicate tails from repeat imports block
  // one — see migration 0061), so without this two concurrent bookings of the
  // same customer on different cars would both miss the match and insert a
  // duplicate each. Keyed by the brand customer id (stable even when the
  // phone is empty or changes). Transaction-scoped: released on commit/rollback.
  const lockKey = `${home}|${src.id}`;
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

  // 1) Exact mirror link: a home row previously mirrored FROM this brand
  // customer carries externalSource="mirror" + externalId=<brand customer id>.
  // This is the only branch that works for phone-less customers — without it
  // every repeat booking of a customer with an empty phone minted a duplicate.
  const [linked] = await tx
    .select({ id: customer.id })
    .from(customer)
    .where(and(eq(customer.externalSource, "mirror"), eq(customer.externalId, src.id)))
    .limit(1);
  if (linked) return linked.id;

  // 2) Phone-based matches (legacy mirrors without the link, natural matches).
  const existing = await matchHomeCustomerByPhone(tx, src.phone);
  if (existing) return existing;

  const digits = normalizePhone(src.phone);
  if (digits.length >= MIN_PHONE_MATCH_DIGITS) {
    // Race backstop, live since customer_tenant_phone_tail9_uidx: upsert keyed
    // on the same (tenant_id, tail9) expression. A thrown 23505 would abort
    // the whole booking transaction (Postgres kills the tx on any error) —
    // ON CONFLICT DO UPDATE never throws and returns the winner's id. The
    // arbiter is fully literal on purpose: index inference must match the
    // partial index expression exactly (a bound param would not infer).
    const res = (await tx.execute(sql`
      INSERT INTO customer (tenant_id, name, phone, email, division, source, external_source, external_id)
      VALUES (${home}, ${src.name}, ${src.phone ?? null}, ${src.email ?? null}, 'rent', ${src.source ?? "walk_in"}, 'mirror', ${src.id})
      ON CONFLICT (tenant_id, (right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9)))
      WHERE length(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) >= 9
      DO UPDATE SET updated_at = now()
      RETURNING id
    `)) as unknown as { rows: { id: string }[] };
    return res.rows[0].id;
  }

  // Short/empty phone: the partial index doesn't apply — plain insert (the
  // brand-id mirror link above is what dedupes these).
  try {
    const rows = await tx
      .insert(customer)
      .values({
        tenantId: home,
        name: src.name,
        phone: src.phone ?? null,
        email: src.email ?? null,
        division: "rent",
        source: src.source ?? "walk_in",
        externalSource: "mirror",
        externalId: src.id,
      })
      .returning({ id: customer.id });
    const created = Array.isArray(rows) ? rows[0] : rows;
    return created.id;
  } catch (e) {
    if (isUniqueViolation(e)) {
      const winner = await matchHomeCustomerByPhone(tx, src.phone);
      if (winner) return winner;
    }
    throw e;
  }
}

/**
 * Reschedule a rental by dragging/resizing it on the fleet board. Authz on the
 * caller's brand, data in fleet-home (like the rest of the rental lifecycle).
 * Validates on drop (Lite has no during-drag validation): rejects overlaps with
 * other reserved/active rentals and imported bookings on the same car, and
 * refuses to move a completed/cancelled rental. `startYmd`/`endYmd` are the
 * board's day edges — `endYmd` is the EXCLUSIVE right edge (DayPilot), so the
 * stored return date is endYmd − 1 day.
 */
export async function moveRentalDates(
  tenantId: string,
  actorId: string | undefined,
  rentalId: string,
  startYmd: string,
  endYmd: string,
): Promise<{ ok: boolean; error?: string }> {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  // Audit integrity: this action is called from the client (the fleet board),
  // so derive the actor from the authenticated session — never trust the
  // client-supplied actorId. (`actorId` param kept for call-site symmetry with
  // the other lifecycle actions but ignored for the audit record.)
  void actorId;
  const trustedActorId = await requireAuth();

  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const endExcl = new Date(`${endYmd}T00:00:00.000Z`);
  const returnDate = new Date(endExcl);
  returnDate.setUTCDate(returnDate.getUTCDate() - 1);
  returnDate.setUTCHours(23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(returnDate.getTime()) || returnDate.getTime() <= start.getTime()) {
    return { ok: false, error: "Invalid date range" };
  }

  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [r] = await tx
      .select({
        id: rental.id,
        vehicleId: rental.vehicleId,
        status: rental.status,
        dailyRate: rental.dailyRate,
        deposit: rental.deposit,
        startDate: rental.startDate,
        returnDate: rental.returnDate,
        total: rental.total,
        balanceDue: rental.balanceDue,
      })
      .from(rental)
      .where(eq(rental.id, rentalId))
      .limit(1);
    if (!r) return { ok: false, error: "Rental not found" };
    if (!["reserved", "active"].includes(r.status)) {
      return { ok: false, error: `Can't move a ${r.status} rental` };
    }
    // A reserved (not yet started) rental must not be dragged into the past —
    // that would fake a backdated contract. Active rentals keep their start.
    if (r.status === "reserved") {
      const todayYmd = new Date().toISOString().slice(0, 10);
      if (startYmd < todayYmd) return { ok: false, error: "Can't move a reserved booking into the past" };
    }

    // Lock the vehicle row so two concurrent moves (or a move + New Booking)
    // on the same car serialize; the overlap guards below then can't be raced
    // (the rental_no_overlap_active exclusion constraint is the DB backstop).
    await tx.select({ id: vehicle.id }).from(vehicle).where(eq(vehicle.id, r.vehicleId)).for("update").limit(1);

    // Overlap guard (excluding this rental) — canonical rentals…
    const clashRental = await tx
      .select({ id: rental.id })
      .from(rental)
      .where(
        and(
          eq(rental.vehicleId, r.vehicleId),
          inArray(rental.status, ["reserved", "active"]),
          sql`${rental.id} <> ${rentalId}`,
          lte(rental.startDate, returnDate),
          gte(rental.returnDate, start),
        ),
      )
      .limit(1);
    if (clashRental.length > 0) return { ok: false, error: "Overlaps another booking on this car" };

    // …and legacy imported bookings.
    const clashLegacy = await tx
      .select({ id: legacyBooking.id })
      .from(legacyBooking)
      .where(
        and(
          eq(legacyBooking.vehicleId, r.vehicleId),
          inArray(legacyBooking.status, ["booked", "active"]),
          lte(legacyBooking.dateFrom, endYmd),
          gte(legacyBooking.dateTo, startYmd),
        ),
      )
      .limit(1);
    if (clashLegacy.length > 0) return { ok: false, error: "Overlaps an imported (sheet) booking" };

    const totalDays = Math.max(1, Math.round((returnDate.getTime() - start.getTime()) / 86_400_000));
    const total = r.dailyRate * totalDays + (r.deposit ?? 0);
    // Keep the amount already paid fixed and re-derive the debt — before this,
    // a drag changed `total` but left `balanceDue` stale.
    const alreadyPaid = r.total - r.balanceDue;
    const balanceDue = total - alreadyPaid;
    await tx
      .update(rental)
      .set({ startDate: start, returnDate, totalDays, total, balanceDue, updatedAt: new Date() })
      .where(eq(rental.id, rentalId));

    const oldStartYmd = r.startDate.toISOString().slice(0, 10);
    const oldReturnYmd = r.returnDate.toISOString().slice(0, 10);
    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.reschedule",
      entityType: "rental",
      entityId: rentalId,
      intent: `Rescheduled on fleet board ${oldStartYmd} → ${oldReturnYmd} to ${startYmd} → ${returnDate.toISOString().slice(0, 10)} (${totalDays}d, total ${total} AED, balance ${balanceDue} AED)`,
    });
    return { ok: true };
  });
}

export interface CreateRentalFromQuoteInput {
  customerId: string;
  vehicleId: string;
  startDate: Date;
  returnDate: Date;
  /** Pricing channel for the tier lookup. Defaults to b2c. */
  channel?: Channel;
  bookingBasis?: string;
  /** Deal this rental was created from (deal → rental link). */
  dealId?: string;
  /** Lead linkage; auto-resolved from the deal when omitted. */
  leadId?: string;
  notes?: string;
  salesAgentId?: string;
  /** Fallback ONLY for vehicles without price tiers; ignored when a tier matches. */
  manualDailyRate?: number;
  /** Overrides the tier deposit when provided. */
  manualDeposit?: number;
}

/**
 * Client-facing wrapper. Expected failures (overlap, no tier, deal not found,
 * validation) are business outcomes, not crashes — but a server action that
 * THROWS reaches the client as Next's generic production error (digest only),
 * which is how a double-booking refusal showed up as "An error occurred in
 * the Server Components render". So: impl throws, wrapper converts to the
 * { ok, error } result idiom (same as moveRentalDates).
 */
export async function createRentalFromQuote(
  tenantId: string,
  actorId: string | undefined,
  data: CreateRentalFromQuoteInput,
  tenantSlug?: string
): Promise<{ ok: true; rental: typeof rental.$inferSelect } | { ok: false; error: string }> {
  // Authz lives HERE (the exported entry point — action-guards.test.ts checks
  // exports, and a caller must never reach the impl unguarded).
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  try {
    const row = await createRentalFromQuoteImpl(tenantId, actorId, data, tenantSlug);
    return { ok: true, rental: row };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Failed to create rental" };
  }
}

async function createRentalFromQuoteImpl(
  tenantId: string,
  actorId: string | undefined,
  data: CreateRentalFromQuoteInput,
  tenantSlug?: string
) {
  // Audit integrity: called from the client (New Booking modal / fleet board),
  // so the actor comes from the authenticated session — never from the client.
  void actorId;
  const trustedActorId = await requireAuth();
  if (!(data.startDate instanceof Date) || isNaN(data.startDate.getTime())) throw new Error("Invalid start date");
  if (!(data.returnDate instanceof Date) || isNaN(data.returnDate.getTime())) throw new Error("Invalid return date");
  if (data.returnDate.getTime() <= data.startDate.getTime()) throw new Error("Return date must be after start date");
  if (!data.customerId) throw new Error("Customer is required");
  if (!data.vehicleId) throw new Error("Vehicle is required");
  const channel: Channel = data.channel === "b2b" ? "b2b" : "b2c";

  // Fleet + rentals + price_tier live in fleet-home; authz above is the caller's
  // own brand. Everything below runs in fleet-home so a rent-brand booking lands
  // where the calendar/returns/lifecycle read from — not orphaned in the brand
  // tenant. The chosen customer is mirrored into fleet-home for the FK.
  // requireFleetHomeTenantId() FAILS LOUDLY if the home tenant is unresolvable —
  // the old `?? tenantId` fallback silently recreated the orphan bug.
  const home = await requireFleetHomeTenantId();
  // Read the brand customer OUTSIDE the home tx (different tenant context on
  // the same connection), then mirror it INSIDE the booking transaction so a
  // failed booking can't leave an orphaned home customer behind.
  const brandCustomer = home === tenantId ? null : await readBrandCustomer(tenantId, data.customerId);
  // Deal/lead records live in the brand tenant, so they can't be FK-referenced
  // from a fleet-home rental — only link them on the sales (home) path.
  const linkDealLead = home === tenantId;

  return withDrizzleTenant(home, async (tx) => {
    // 0) Lock the vehicle row FIRST — serializes concurrent bookings on the
    // same car (board drag + New Booking). The overlap guards below and the
    // rental_no_overlap_active exclusion constraint then can't be raced.
    // The lock doubles as the company-inherit read.
    const [veh] = await tx
      .select({ companyId: vehicle.companyId, status: vehicle.status })
      .from(vehicle)
      .where(eq(vehicle.id, data.vehicleId))
      .for("update")
      .limit(1);
    if (!veh) throw new Error("Vehicle not found");
    // Sold cars have left operations — a stale board/modal must not book one.
    if (veh.status === "sold") throw new Error("This vehicle has been sold and can't be rented");

    // 0b) Mirror the customer into fleet-home (same tx — rolls back with the
    // booking if anything below fails).
    const homeCustomerId = brandCustomer ? await mirrorCustomerIntoHome(tx, home, brandCustomer) : data.customerId;

    // 1) Double-booking guard — canonical rentals (reserved + active)…
    const overlappingRental = await tx
      .select({ id: rental.id })
      .from(rental)
      .where(
        and(
          eq(rental.vehicleId, data.vehicleId),
          inArray(rental.status, ["reserved", "active"]),
          lte(rental.startDate, data.returnDate),
          gte(rental.returnDate, data.startDate)
        )
      )
      .limit(1);
    if (overlappingRental.length > 0) throw new Error("Vehicle already has a rental in this period");

    // …and the legacy imported booking rows, so we can't double-book over a
    // reservation that only exists in the old sheet data.
    const startStr = data.startDate.toISOString().slice(0, 10);
    const endStr = data.returnDate.toISOString().slice(0, 10);
    const overlappingLegacy = await tx
      .select({ id: legacyBooking.id })
      .from(legacyBooking)
      .where(
        and(
          eq(legacyBooking.vehicleId, data.vehicleId),
          inArray(legacyBooking.status, ["booked", "active"]),
          lte(legacyBooking.dateFrom, endStr),
          gte(legacyBooking.dateTo, startStr)
        )
      )
      .limit(1);
    if (overlappingLegacy.length > 0) throw new Error("Vehicle already has a booking (imported calendar) in this period");

    // 2) Price from the real tiers.
    const totalDays = daysBetween(data.startDate, data.returnDate);
    let dailyRate: number;
    let deposit: number;
    let pricedFromTier = true;
    try {
      const q = await quoteRental(tx, home, data.vehicleId, totalDays, channel);
      dailyRate = q.dailyRate;
      deposit = data.manualDeposit ?? q.deposit ?? 0;
    } catch {
      if (typeof data.manualDailyRate === "number" && data.manualDailyRate > 0) {
        pricedFromTier = false;
        dailyRate = data.manualDailyRate;
        deposit = data.manualDeposit ?? 0;
      } else {
        throw new Error(
          `No price tier for this vehicle (${channel}, ${totalDays} day${totalDays === 1 ? "" : "s"}) — set a manual rate or add tiers.`
        );
      }
    }
    const subtotal = dailyRate * totalDays;
    const total = subtotal + deposit;

    // 3) Deal → rental link: validate the deal and inherit its lead linkage.
    // Only on the sales/home path — deal/lead rows live in the brand tenant and
    // can't be FK-referenced from a fleet-home rental.
    const linkedDealId = linkDealLead ? (data.dealId ?? null) : null;
    let leadId = linkDealLead ? (data.leadId ?? null) : null;
    if (linkedDealId) {
      const [d] = await tx
        .select({ id: deal.id, leadId: deal.leadId })
        .from(deal)
        .where(eq(deal.id, linkedDealId))
        .limit(1);
      if (!d) throw new Error("Deal not found");
      if (!leadId) leadId = d.leadId;
    }

    const rows = await tx
      .insert(rental)
      .values({
        tenantId: home,
        companyId: veh.companyId ?? null,
        customerId: homeCustomerId,
        vehicleId: data.vehicleId,
        dealId: linkedDealId,
        leadId,
        // The booking manager is the session user — a client-supplied
        // salesAgentId would let anyone attribute a contract to anyone.
        salesAgentId: trustedActorId,
        bookingBasis: isBookingBasis(data.bookingBasis) ? data.bookingBasis : "booked",
        channel,
        startDate: data.startDate,
        returnDate: data.returnDate,
        dailyRate,
        totalDays,
        deposit,
        total,
        balanceDue: total,
        status: "reserved",
        notes: data.notes ?? null,
        // TODO(deposit): when the payment step lands, collect/hold `deposit`
        // here (payment row + gateway); depositStatus already defaults to "held".
        // TODO(contract): generate the rental-agreement PDF and set contractUrl —
        // the column exists (migration 0006) so the driver-bot/contract step can fill it.
        contractUrl: null,
      })
      .returning();
    const row = Array.isArray(rows) ? rows[0] : rows;

    await tx
      .update(vehicle)
      .set({ status: "reserved", updatedAt: new Date() })
      .where(eq(vehicle.id, data.vehicleId));

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "rental.create",
      entityType: "rental",
      entityId: row.id,
      // Mention the deal only when it was actually linked (sales/home path) —
      // on the rent path the column stays NULL and the audit must not claim it.
      intent: pricedFromTier
        ? `Created rental from live quote: ${dailyRate} AED × ${totalDays}d (${channel}) + deposit ${deposit} AED = ${total} AED${linkedDealId ? ` — from deal ${linkedDealId}` : ""}`
        : `Created rental with MANUAL rate (no price tier): ${dailyRate} AED × ${totalDays}d + deposit ${deposit} AED = ${total} AED${linkedDealId ? ` — from deal ${linkedDealId}` : ""}`,
    });

    if (tenantSlug) {
      revalidatePath(`/${tenantSlug}/rentals`);
      revalidatePath(`/${tenantSlug}/fleet/availability`);
    }
    return row;
  });
}

// Record the manual deposit collection as a payment row (cash/transfer held
// as security deposit). Status = pending until sales confirms. The rental
// deposit_status already defaults to 'held' — this creates the matching
// payment trail so the money flow is auditable.
export async function takeDeposit(
  tenantId: string,
  actorId: string | undefined,
  rentalId: string,
  amount: number,
  method?: string,
  tenantSlug?: string
): Promise<typeof payment.$inferSelect> {
  await assertNotPreviewMode(tenantId);
  await canManageRentalsForTenant(tenantId);
  // Same contract as the rest of the lifecycle: actor from the session (never
  // the client), money rows in fleet-home where the rental + payments live.
  void actorId;
  const trustedActorId = await requireAuth();
  if (!rentalId) throw new Error("rentalId is required");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be a positive number");

  const home = await requireFleetHomeTenantId();
  return withDrizzleTenant(home, async (tx) => {
    const [r] = await tx
      .select({ id: rental.id, status: rental.status, deposit: rental.deposit, depositStatus: rental.depositStatus })
      .from(rental)
      .where(eq(rental.id, rentalId))
      .limit(1);
    if (!r) throw new Error("Rental not found");
    if (r.status === "cancelled") throw new Error("Cannot record deposit for a cancelled rental");

    const insRows = await tx
      .insert(payment)
      .values({
        tenantId: home,
        rentalId,
        amount,
        method: method ?? "cash",
        notes: "Deposit collected",
        status: "pending",
        recordedBy: trustedActorId,
      })
      .returning();
    const ins = Array.isArray(insRows) ? insRows[0] : insRows;

    await tx.insert(auditEvent).values({
      tenantId: home,
      actorId: trustedActorId,
      action: "deposit.collected",
      entityType: "rental",
      entityId: rentalId,
      intent: `Deposit collected: ${amount} AED via ${method ?? "cash"} (pending confirmation)`,
    });

    if (tenantSlug) revalidatePath(`/${tenantSlug}/rentals/${rentalId}`);
    return ins;
  });
}
