/**
 * Booking calendar + pricing engine — Drizzle defs + helpers over the `price_tier`
 * and `booking` tables (created in drizzle/autonomous/0002_booking_pricing.sql,
 * populated from Babek's real sheet). Wires the app to real fleet/booking/pricing data.
 *
 * Authored via orchestration (claude2), integrated + adjusted (nullable deposit/cardoo/dates
 * to match the imported data). Contract Module 3 (booking calendar + pricing).
 */
import { uuid, text, integer, date, index, type ExtraConfigColumn } from "drizzle-orm/pg-core";
import { and, eq, lte, gte, isNull, or, desc, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { tenantTable } from "./tenant-table";
import { tenant, vehicle } from "./schema";
import type * as fullSchema from "./schema";

/** Column map handed to tenantTable's extras callback (same shape pgTable
 * passes to its third argument — indexable config columns). */
type TenantExtraColumns = Record<string, ExtraConfigColumn>;

/** The app database handle (what withDrizzleTenant passes to its callback). */
type Db = NodePgDatabase<typeof fullSchema>;

export type Channel = "b2c" | "b2b";
export type BookingStatus = "booked" | "active" | "returned" | "cancelled";

export const priceTier = tenantTable(
  "price_tier",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    channel: text("channel").$type<Channel>().notNull(),
    minDays: integer("min_days").notNull(),
    maxDays: integer("max_days"),
    dailyRate: integer("daily_rate").notNull(),
    deposit: integer("deposit"),
    cardoo: integer("cardoo"),
  },
  (t: TenantExtraColumns) => [
    index("price_tier_lookup_idx").on(t.tenantId, t.vehicleId, t.channel, t.minDays),
  ],
  { companyScoped: false },
);

export const booking = tenantTable(
  "booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenant.id),
    vehicleId: uuid("vehicle_id").notNull().references(() => vehicle.id),
    customerName: text("customer_name"),
    channel: text("channel").$type<Channel>().notNull(),
    dateFrom: date("date_from"),
    dateTo: date("date_to"),
    status: text("status").$type<BookingStatus>().notNull(),
    deposit: integer("deposit"),
    cardoo: integer("cardoo"),
    manager: text("manager"),
    source: text("source"),
    externalId: text("external_id"),
  },
  (t: TenantExtraColumns) => [
    index("booking_range_lookup_idx").on(t.tenantId, t.dateFrom, t.dateTo),
  ],
  { companyScoped: false },
);

export type PriceTier = typeof priceTier.$inferSelect;
export type Booking = typeof booking.$inferSelect;

export interface Quote {
  dailyRate: number;
  days: number;
  subtotal: number;
  deposit: number | null;
  cardoo: number | null;
}

/** Pick the tier where min_days <= days AND (max_days IS NULL OR days <= max_days); most-specific wins. */
export async function quoteRental(
  db: Db,
  tenantId: string,
  vehicleId: string,
  days: number,
  channel: Channel,
): Promise<Quote> {
  if (!Number.isInteger(days) || days <= 0) throw new Error(`quoteRental: days must be a positive integer, got ${days}`);
  const [tier] = await db
    .select()
    .from(priceTier)
    .where(
      and(
        eq(priceTier.tenantId, tenantId),
        eq(priceTier.vehicleId, vehicleId),
        eq(priceTier.channel, channel),
        lte(priceTier.minDays, days),
        or(isNull(priceTier.maxDays), gte(priceTier.maxDays, days)),
      ),
    )
    .orderBy(desc(priceTier.minDays))
    .limit(1);
  if (!tier) throw new Error(`No price tier for vehicle=${vehicleId} channel=${channel} days=${days}`);
  return { dailyRate: tier.dailyRate, days, subtotal: tier.dailyRate * days, deposit: tier.deposit, cardoo: tier.cardoo };
}

export interface FleetCalendarEntry {
  vehicle: { id: string; make: string; model: string; plate: string; status: string; dailyRate: number | null };
  bookings: Array<{ customerName: string | null; dateFrom: string | null; dateTo: string | null; status: string; manager: string | null; channel: string }>;
  tiers: PriceTier[];
}

/** One tenant-scoped snapshot for the calendar UI. Three flat queries, no N+1. */
export async function getFleetCalendar(db: Db, tenantId: string): Promise<FleetCalendarEntry[]> {
  const vehicles = await db
    .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, plate: vehicle.plate, status: vehicle.status, dailyRate: vehicle.dailyRate })
    .from(vehicle)
    .where(eq(vehicle.tenantId, tenantId));
  if (vehicles.length === 0) return [];
  const vehicleIds = vehicles.map((v) => v.id);

  const [bookings, tiers] = await Promise.all([
    db.select({
      vehicleId: booking.vehicleId, customerName: booking.customerName, dateFrom: booking.dateFrom,
      dateTo: booking.dateTo, status: booking.status, manager: booking.manager, channel: booking.channel,
    }).from(booking).where(and(eq(booking.tenantId, tenantId), inArray(booking.vehicleId, vehicleIds))),
    db.select().from(priceTier).where(and(eq(priceTier.tenantId, tenantId), eq(priceTier.channel, "b2c"), inArray(priceTier.vehicleId, vehicleIds))),
  ]);

  const bByV = new Map<string, FleetCalendarEntry["bookings"]>();
  for (const b of bookings) {
    const list = bByV.get(b.vehicleId) ?? [];
    list.push({ customerName: b.customerName, dateFrom: b.dateFrom, dateTo: b.dateTo, status: b.status, manager: b.manager, channel: b.channel });
    bByV.set(b.vehicleId, list);
  }
  const tByV = new Map<string, PriceTier[]>();
  for (const t of tiers) { const list = tByV.get(t.vehicleId) ?? []; list.push(t); tByV.set(t.vehicleId, list); }

  return vehicles.map((v) => ({ vehicle: v, bookings: bByV.get(v.id) ?? [], tiers: tByV.get(v.id) ?? [] }));
}
