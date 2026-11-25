// INTELLIGENCE LAYER — HOT-CAR demand model, PURE CORE.
//
// The DB-free heart of the hot-car ranking: match free-text car mentions onto
// fleet vehicles, and fold demand signals into a ranked list. Kept separate
// from demand-queries.ts (which pulls in Drizzle + auth) so the aggregation
// logic is unit-testable with no database or Next runtime. See
// demand-model.test.ts.

export interface DemandVehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
}

/** One unit of demand pointing at a vehicle. */
export interface DemandSignal {
  vehicleId: string;
  kind: "deal" | "message";
  /** Deal id, for the DISTINCT open-deal demand count (deal signals only). */
  dealId?: string | null;
  /** Deal owner display name — the "last toucher" candidate. */
  ownerName?: string | null;
  /** A customer line snippet — the "last customer line" candidate. */
  customerLine?: string | null;
  /** Activity / message timestamp. */
  at: Date;
}

export interface HotCar {
  vehicleId: string;
  make: string;
  model: string;
  year: number | null;
  /** Distinct open deals demanding this car. */
  demandCount: number;
  /** Recent inbound lines that named this car. */
  messageCount: number;
  /** Owner of the deal with the newest activity (null if demand is message-only). */
  lastToucher: string | null;
  /** Newest customer line snippet mentioning this car. */
  lastCustomerLine: string | null;
  /** Most recent demand timestamp across all signals. */
  lastUpdateAt: Date | null;
}

/** Latin-ish normalisation: lowercase, strip punctuation to spaces. */
function norm(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function compact(s: string): string {
  return norm(s).replace(/\s+/g, "");
}

const MAKE_ALIASES: Record<string, string[]> = {
  mercedes: ["mercedes", "benz", "mercedesbenz", "merc"],
  // Keys are looked up by norm(make), which turns "Mercedes-Benz" into
  // "mercedes benz" and "Rolls-Royce" into "rolls royce" — so the KEYS must be
  // in that same hyphen-free form or the alias set (incl. "benz") is unreachable.
  "mercedes benz": ["mercedes", "benz", "mercedesbenz"],
  volkswagen: ["volkswagen", "vw"],
  chevrolet: ["chevrolet", "chevy"],
  "range rover": ["range", "rang", "rangerover"],
  "land rover": ["land", "landrover"],
  "rolls royce": ["rolls", "rollsroyce", "ghost", "cullinan", "phantom", "wraith", "spectre"],
};

/**
 * Does a free-text car mention refer to this fleet vehicle? True when the
 * vehicle's model token appears in the text AND either the make matches or the
 * model token is distinctive (≥4 chars). Pure — the DB layer uses it to map
 * extracted car_text / vouched_car onto real vehicles.
 */
export function matchesVehicle(
  carText: string | null | undefined,
  v: { make: string; model: string }
): boolean {
  if (!carText) return false;
  const text = norm(carText);
  const textCompact = compact(carText);
  // The model string may carry year/colour/trim ("Patrol 2022 black V6",
  // "430i (conv)"). Take the first meaningful word (skip a leading year) as the
  // token — otherwise the whole thing compacts into a garbage token that never
  // matches a customer's "nissan patrol". Distinctive alphanumerics (430i, g63)
  // survive the leading-token regex.
  const firstReal = norm(v.model).split(" ").filter(Boolean).find((w) => !/^(19|20)\d{2}$/.test(w)) ?? "";
  const modelTok = compact(firstReal).replace(/^([a-z]*\d+[a-z]*).*/, "$1") || compact(firstReal);
  if (!modelTok) return false;
  const modelHit = textCompact.includes(modelTok) || text.split(" ").includes(norm(v.model));
  if (!modelHit) return false;

  const makeKey = norm(v.make);
  const aliases = MAKE_ALIASES[makeKey] ?? [makeKey.replace(/\s+/g, "")];
  const makeHit = aliases.some((a) => textCompact.includes(a)) || text.includes(makeKey);

  return makeHit || modelTok.length >= 4;
}

/**
 * Fold demand signals into a ranked hot-car list. Distinct-deal demand first,
 * then message volume, then recency. Pure and deterministic.
 */
export function rankHotCars(vehicles: DemandVehicle[], signals: DemandSignal[]): HotCar[] {
  const byVehicle = new Map<string, DemandSignal[]>();
  for (const s of signals) {
    const list = byVehicle.get(s.vehicleId);
    if (list) list.push(s);
    else byVehicle.set(s.vehicleId, [s]);
  }

  const cars: HotCar[] = [];
  for (const v of vehicles) {
    const sigs = byVehicle.get(v.id);
    if (!sigs || sigs.length === 0) continue;

    const dealIds = new Set<string>();
    let messageCount = 0;
    let lastToucher: string | null = null;
    let toucherAt = -Infinity;
    let lastCustomerLine: string | null = null;
    let lineAt = -Infinity;
    let lastUpdateAt = -Infinity;

    for (const s of sigs) {
      const t = s.at.getTime();
      if (t > lastUpdateAt) lastUpdateAt = t;
      if (s.kind === "deal") {
        if (s.dealId) dealIds.add(s.dealId);
        if (s.ownerName && t > toucherAt) {
          toucherAt = t;
          lastToucher = s.ownerName;
        }
      } else {
        messageCount += 1;
      }
      if (s.customerLine && t > lineAt) {
        lineAt = t;
        lastCustomerLine = s.customerLine;
      }
    }

    cars.push({
      vehicleId: v.id,
      make: v.make,
      model: v.model,
      year: v.year,
      demandCount: dealIds.size,
      messageCount,
      lastToucher,
      lastCustomerLine,
      lastUpdateAt: lastUpdateAt === -Infinity ? null : new Date(lastUpdateAt),
    });
  }

  cars.sort((a, b) => {
    if (b.demandCount !== a.demandCount) return b.demandCount - a.demandCount;
    if (b.messageCount !== a.messageCount) return b.messageCount - a.messageCount;
    return (b.lastUpdateAt?.getTime() ?? 0) - (a.lastUpdateAt?.getTime() ?? 0);
  });
  return cars;
}

/** One-line snippet of a message body for the hot-car card. */
export function snippet(body: string | null | undefined, max = 140): string | null {
  if (!body) return null;
  const one = body.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1) + "…" : one;
}
