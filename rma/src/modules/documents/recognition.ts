export interface RecognizedCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  emiratesId?: string;
  emiratesIdIssue?: string;
  emiratesIdExpiry?: string;
  passportNumber?: string;
  passportIssue?: string;
  passportExpiry?: string;
  driverLicenseNumber?: string;
  driverLicenseIssue?: string;
  driverLicenseExpiry?: string;
}

export interface RecognizedVehicleData {
  vin?: string;
  plate?: string;
  make?: string;
  model?: string;
  year?: string;
  colour?: string;
  registrationExpiry?: string;
}

const CUSTOMER_FIELDS = [
  "name", "phone", "email", "dateOfBirth", "nationality", "address", "emiratesId",
  "emiratesIdIssue", "emiratesIdExpiry", "passportNumber", "passportIssue", "passportExpiry",
  "driverLicenseNumber", "driverLicenseIssue", "driverLicenseExpiry",
] as const;
const VEHICLE_FIELDS = ["vin", "plate", "make", "model", "year", "colour", "registrationExpiry"] as const;
const DATE_FIELDS = new Set([
  "dateOfBirth", "emiratesIdIssue", "emiratesIdExpiry", "passportIssue", "passportExpiry",
  "driverLicenseIssue", "driverLicenseExpiry", "registrationExpiry",
]);

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text && text.toLowerCase() !== "null" ? text.slice(0, 300) : undefined;
}

function cleanDate(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))) return undefined;
  return text;
}

function parseFields(value: unknown, fields: readonly string[]): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Document recognition returned invalid data");
  const input = value as Record<string, unknown>;
  const output: Record<string, string> = {};
  for (const field of fields) {
    const cleaned = DATE_FIELDS.has(field) ? cleanDate(input[field]) : cleanText(input[field]);
    if (cleaned) output[field] = cleaned;
  }
  return output;
}

export function parseRecognizedCustomerData(value: unknown): RecognizedCustomerData {
  const output = parseFields(value, CUSTOMER_FIELDS);
  if (output.emiratesId) {
    const digits = output.emiratesId.replace(/\D/g, "");
    if (!/^784\d{12}$/.test(digits)) delete output.emiratesId;
    else output.emiratesId = digits;
  }
  if (output.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) delete output.email;
  return output;
}

export function parseRecognizedVehicleData(value: unknown): RecognizedVehicleData {
  const output = parseFields(value, VEHICLE_FIELDS);
  if (output.vin) {
    output.vin = output.vin.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(output.vin)) delete output.vin;
  }
  if (output.year && (!/^\d{4}$/.test(output.year) || Number(output.year) < 1900 || Number(output.year) > 2100)) delete output.year;
  return output;
}
