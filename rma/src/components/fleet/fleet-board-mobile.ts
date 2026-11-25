export type FleetBoardMobileEvent = {
  resource: string | number;
  tags: { startYmd: string; endYmd: string; status: string };
};

export function nextDays(today: string, count = 14): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(`${today}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

export function groupUpcomingEvents<T extends FleetBoardMobileEvent>(events: T[], today: string): Map<string, T[]> {
  const byCar = new Map<string, T[]>();
  for (const event of events) {
    if (event.tags.endYmd < today && event.tags.status !== "overdue") continue;
    const key = String(event.resource);
    const list = byCar.get(key) ?? [];
    list.push(event);
    byCar.set(key, list);
  }
  for (const list of byCar.values()) list.sort((a, b) => a.tags.startYmd.localeCompare(b.tags.startYmd));
  return byCar;
}

export function currentEvent<T extends FleetBoardMobileEvent>(events: T[], today: string): T | undefined {
  return events.find(
    (event) =>
      event.tags.startYmd <= today && (event.tags.endYmd >= today || event.tags.status === "overdue"),
  );
}

export function eventOnDay<T extends FleetBoardMobileEvent>(events: T[], day: string): T | undefined {
  return events.find((event) => event.tags.startYmd <= day && day <= event.tags.endYmd);
}
