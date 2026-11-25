export const PARKING_OPERATORS = ["parkin", "parkonic"] as const;
export type ParkingOperator = (typeof PARKING_OPERATORS)[number];

export interface ParkingEvent {
  reference: string;
  plate: string;
  occurredAt: Date;
  amount: number;
  location?: string;
  description?: string;
}

export interface ParkingConnector {
  pull(from: Date, to: Date): Promise<ParkingEvent[]>;
}

export function normalizeParkingPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" && typeof value !== "number") throw new Error(`${field} is required`);
  const result = String(value).trim();
  if (!result || result.length > max) throw new Error(`${field} is required and must be at most ${max} characters`);
  return result;
}

export function parseParkingEvent(value: unknown): ParkingEvent {
  if (!value || typeof value !== "object") throw new Error("Parking event must be an object");
  const row = value as Record<string, unknown>;
  const timestamp = requiredText(row.occurredAt, "occurredAt", 80);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp)) throw new Error("occurredAt must be an ISO timestamp with a timezone");
  const occurredAt = new Date(timestamp);
  if (Number.isNaN(occurredAt.getTime())) throw new Error("occurredAt must be a valid timestamp");
  const amount = Number(row.amount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
    throw new Error("amount must be positive with no more than two decimal places");
  }
  const plate = requiredText(row.plate, "plate", 30);
  if (!normalizeParkingPlate(plate)) throw new Error("plate is required");
  return {
    reference: requiredText(row.reference, "reference", 160),
    plate,
    occurredAt,
    amount,
    location: row.location == null ? undefined : String(row.location).trim().slice(0, 300) || undefined,
    description: row.description == null ? undefined : String(row.description).trim().slice(0, 1000) || undefined,
  };
}

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function parseParkingCsv(input: string): ParkingEvent[] {
  const rows = csvRows(input.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  const required = ["reference", "plate", "occurredAt", "amount"];
  for (const field of required) if (!headers.includes(field)) throw new Error(`CSV column ${field} is required`);
  return rows.slice(1).map((cells, index) => {
    const value = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
    try {
      return parseParkingEvent(value);
    } catch (error) {
      throw new Error(`CSV row ${index + 2}: ${error instanceof Error ? error.message : "invalid parking event"}`);
    }
  });
}

export function parkingApiEvents(value: unknown): ParkingEvent[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { events?: unknown[] }).events)
      ? (value as { events: unknown[] }).events
      : null;
  if (!rows) throw new Error("Parking API response must be an array or an object with an events array");
  return rows.map(parseParkingEvent);
}

export function httpParkingConnector(operator: ParkingOperator, env: Record<string, string | undefined> = process.env): ParkingConnector | null {
  const prefix = operator.toUpperCase();
  const endpoint = env[`${prefix}_API_URL`]?.trim();
  if (!endpoint) return null;
  return {
    async pull(from, to) {
      const token = env[`${prefix}_API_TOKEN`]?.trim();
      if (!token) throw new Error(`${prefix}_API_TOKEN is required when ${prefix}_API_URL is configured`);
      const url = new URL(endpoint);
      if (url.protocol !== "https:") throw new Error(`${prefix}_API_URL must use HTTPS`);
      url.searchParams.set("from", from.toISOString());
      url.searchParams.set("to", to.toISOString());
      const response = await fetch(url, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${operator} API returned HTTP ${response.status}`);
      return parkingApiEvents(await response.json());
    },
  };
}
