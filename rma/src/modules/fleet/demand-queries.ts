"use server";

// INTELLIGENCE LAYER — the HOT-CAR demand model.
//
// Owner directive: "Bitrix sums are BS; truth lives in conversations." A car is
// "hot" not because a Bitrix funnel says so, but because customers are asking
// for it RIGHT NOW in WhatsApp. This module ranks the fleet by live demand,
// built from three signals, strongest first:
//
//   1. deal.vehicle_id       — a salesperson attached this exact car to an open
//                              deal (the car-finder). Direct, unambiguous.
//   2. deal.vouched_car      — the car a customer named on an open deal, rolled
//                              up from message extraction (see messaging/vouch).
//   3. message.extracted_car_text — every recent inbound line that named a car,
//                              matched to the fleet by make+model.
//
// NOTE on prod reality (2026-07): deal.vehicle_id is populated ZERO times — the
// finder shipped but nobody attaches cars yet (the chat↔record gap). So signals
// 2+3 (text extraction) carry the model today; signal 1 lights up as the finder
// gets used. The ranking degrades gracefully across all three.
//
// The aggregation core (matchesVehicle / rankHotCars) is pure and unit-tested
// in demand-queries.test.ts; getHotCars is the DB orchestration on top.

import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { deal, message, user, vehicle } from "@/platform/db/schema";
import { canManageFleetForTenant } from "./policies";
import {
  matchesVehicle,
  rankHotCars,
  snippet,
  type DemandSignal,
  type HotCar,
} from "./demand-model";

// Re-export the pure core so callers can import the whole model from one place.
export {
  matchesVehicle,
  rankHotCars,
  type DemandSignal,
  type DemandVehicle,
  type HotCar,
} from "./demand-model";

// ─── DB orchestration ───────────────────────────────────────────────────────

export interface HotCarsOptions {
  /** Look back this many days for inbound-message demand. Default 30. */
  windowDays?: number;
  /** Max hot cars to return. Default 20. */
  limit?: number;
}

/**
 * Rank the tenant's fleet by live demand. Loads the fleet + open-deal signals +
 * recent inbound-message car mentions, maps free-text mentions onto vehicles
 * with matchesVehicle, and folds them with rankHotCars.
 */
export async function getHotCars(
  tenantId: string,
  opts: HotCarsOptions = {}
): Promise<HotCar[]> {
  await canManageFleetForTenant(tenantId);
  const windowDays = opts.windowDays ?? 30;
  const limit = opts.limit ?? 20;
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);

  return withDrizzleTenant(tenantId, async (tx) => {
    const vehicles = await tx
      .select({ id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year })
      .from(vehicle);

    // Open deals carrying a demand signal: a directly-attached car, or a
    // customer-vouched car string.
    const deals = await tx
      .select({
        dealId: deal.id,
        vehicleId: deal.vehicleId,
        vouchedCar: deal.vouchedCar,
        ownerName: user.name,
        at: sql<Date>`coalesce(${deal.lastActivityAt}, ${deal.updatedAt})`,
      })
      .from(deal)
      .leftJoin(user, eq(user.id, deal.ownerId))
      .where(
        and(
          eq(deal.status, "open"),
          or(isNotNull(deal.vehicleId), isNotNull(deal.vouchedCar))
        )
      );

    // Recent inbound lines that named a car (extraction populated car_text).
    const lines = await tx
      .select({
        carText: message.extractedCarText,
        body: message.body,
        at: message.createdAt,
      })
      .from(message)
      .where(
        and(
          eq(message.direction, "inbound"),
          isNotNull(message.extractedCarText),
          gte(message.createdAt, since)
        )
      )
      .orderBy(desc(message.createdAt))
      .limit(4000);

    // Index vehicles by id and by a quick lookup for text-matching.
    const signals: DemandSignal[] = [];

    for (const d of deals) {
      if (d.vehicleId) {
        signals.push({
          vehicleId: d.vehicleId,
          kind: "deal",
          dealId: d.dealId,
          ownerName: d.ownerName ?? null,
          at: d.at instanceof Date ? d.at : new Date(d.at as unknown as string),
        });
        continue;
      }
      // Text-match the vouched car onto matching fleet vehicles.
      for (const v of vehicles) {
        if (matchesVehicle(d.vouchedCar, v)) {
          signals.push({
            vehicleId: v.id,
            kind: "deal",
            dealId: d.dealId,
            ownerName: d.ownerName ?? null,
            at: d.at instanceof Date ? d.at : new Date(d.at as unknown as string),
          });
        }
      }
    }

    for (const ln of lines) {
      for (const v of vehicles) {
        if (matchesVehicle(ln.carText, v)) {
          signals.push({
            vehicleId: v.id,
            kind: "message",
            customerLine: snippet(ln.body),
            at: ln.at instanceof Date ? ln.at : new Date(ln.at as unknown as string),
          });
        }
      }
    }

    return rankHotCars(vehicles, signals).slice(0, limit);
  });
}
