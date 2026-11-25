export interface RecognizedCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  nationality?: string;
  emiratesId?: string;
  emiratesIdExpiry?: string;
  passportNumber?: string;
  driverLicenseNumber?: string;
  driverLicenseExpiry?: string;
}

const FIELDS = [
  "name", "phone", "email", "dateOfBirth", "nationality", "emiratesId",
  "emiratesIdExpiry", "passportNumber", "driverLicenseNumber", "driverLicenseExpiry",
] as const;

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

export function parseRecognizedCustomerData(value: unknown): RecognizedCustomerData {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Document recognition returned invalid data");
  const input = value as Record<string, unknown>;
  const output: RecognizedCustomerData = {};
  for (const field of FIELDS) {
    const cleaned = field.toLowerCase().includes("date") || field.endsWith("Expiry")
      ? cleanDate(input[field])
      : cleanText(input[field]);
    if (cleaned) Object.assign(output, { [field]: cleaned });
  }
  if (output.emiratesId) {
    const digits = output.emiratesId.replace(/\D/g, "");
    if (!/^784\d{12}$/.test(digits)) delete output.emiratesId;
    else output.emiratesId = digits;
  }
  if (output.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) delete output.email;
  return output;
}
