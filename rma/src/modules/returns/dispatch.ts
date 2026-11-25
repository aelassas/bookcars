export interface DispatchStop {
  rentalId: string;
  customerName: string;
  customerPhone: string | null;
  vehiclePlate: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  returnDate: Date;
  location: string; // placeholder — future: actual address from customer/vehicle
}

export interface DispatchPlan {
  totalStops: number;
  estimatedDurationMinutes: number;
  stops: DispatchStop[];
}

/**
 * Build a simple morning dispatch plan from today's returns.
 *
 * For now: sort by return time (earliest first). When PostGIS addresses
 * are available, this becomes a real travelling-salesman route.
 */
export function buildDispatchPlan(returns: DispatchStop[]): DispatchPlan {
  const sorted = [...returns].sort(
    (a, b) => new Date(a.returnDate).getTime() - new Date(b.returnDate).getTime()
  );

  // Rough estimate: 15 min per stop + 20 min travel between stops
  const estimatedDurationMinutes = sorted.length * 15 + Math.max(0, sorted.length - 1) * 20;

  return {
    totalStops: sorted.length,
    estimatedDurationMinutes,
    stops: sorted,
  };
}
