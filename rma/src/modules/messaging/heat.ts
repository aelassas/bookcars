// Deterministic heat rules for the Pulse board (spec §U1). No LLM in v1.
// Dubai has no DST — the workday window is a fixed UTC+4 arithmetic.

const WORK_START_H = 9;   // 09:00 Dubai
const WORK_END_H = 21;    // 21:00 Dubai
const DUBAI_OFFSET_MS = 4 * 3600 * 1000;

export function computeHeat(i: {
  inbound2h: number;
  carNamed: boolean;
  priceNamed: boolean;
  waitingMin: number | null;
}): "hot" | "warm" | "normal" {
  if (i.inbound2h >= 3) return "hot";
  if ((i.waitingMin ?? 0) >= 120) return "hot";
  if (i.carNamed || i.priceNamed) return "warm";
  return "normal";
}

/** Minutes of 09:00–21:00 Dubai time between two UTC instants. */
export function workMinutesBetween(fromUtc: Date, toUtc: Date): number {
  if (toUtc <= fromUtc) return 0;
  let total = 0;
  // Walk in Dubai-local time, day by day.
  let cur = fromUtc.getTime() + DUBAI_OFFSET_MS;
  const end = toUtc.getTime() + DUBAI_OFFSET_MS;
  while (cur < end) {
    const dayStart = Math.floor(cur / 86400000) * 86400000;
    const winStart = dayStart + WORK_START_H * 3600000;
    const winEnd = dayStart + WORK_END_H * 3600000;
    const sliceEnd = Math.min(end, dayStart + 86400000);
    const overlap = Math.min(sliceEnd, winEnd) - Math.max(cur, winStart);
    if (overlap > 0) total += overlap;
    cur = dayStart + 86400000;
  }
  return Math.round(total / 60000);
}
