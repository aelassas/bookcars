export type CardAttention = "new" | "stale" | null;

export const STALE_DAYS = 3;

export function daysSince(value: Date | string | null, now = Date.now()): number | null {
  if (!value) return null;
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / 86_400_000));
}

export function cardAttention(
  deal: { stage: string; status: string; lastActivityAt: Date | string | null },
  now = Date.now(),
): CardAttention {
  if (deal.status !== "open") return null;
  if (deal.stage === "inquiry") return "new";
  const days = daysSince(deal.lastActivityAt, now);
  return days === null || days >= STALE_DAYS ? "stale" : null;
}

export function rentalWindow(from: string | null, to: string | null): string | null {
  if (!from && !to) return null;
  const format = (iso: string) => {
    const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, month - 1, day)));
  };
  return from && to ? `${format(from)} – ${format(to)}` : `From ${format(from ?? to!)}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}
