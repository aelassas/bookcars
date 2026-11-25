// Consistent UAE-friendly formatters for dates, currency, and numbers.
// One source of truth so the demo doesn't render half "5/31/2026" + half
// "31 May 2026" across pages.

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATETIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const NUMBER = new Intl.NumberFormat("en-AE");

// "31 May 2026". Accepts Date | string | null | undefined; renders an em
// dash for missing values so empty cells stay obvious in a column.
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE.format(d);
}

// "31 May 2026, 14:32"
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME.format(d).replace(",", " ·");
}

export function toDateTimeLocalValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

// "AED 21,140,154". Accepts number | string (Drizzle returns numeric/sum
// columns as strings in PG to preserve precision) | null. We coerce here
// once so callers don't have to remember.
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return `AED ${NUMBER.format(n)}`;
}

// "21,140,154" — for non-currency counts. Same string-coercion as above.
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return NUMBER.format(n);
}

// Title-case a single token: "in_progress" → "In progress".
export function humaniseStatus(value: string): string {
  if (!value) return value;
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
