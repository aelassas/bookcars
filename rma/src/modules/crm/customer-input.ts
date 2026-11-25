export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  division?: string;
  source?: string;
  notes?: string;
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
};

export function normalizeCustomerInput(data: Partial<CustomerInput>) {
  const result: Partial<CustomerInput> = {};
  for (const key of [
    "name", "phone", "email", "division", "source", "notes", "dateOfBirth", "nationality", "address",
    "emiratesId", "emiratesIdIssue", "emiratesIdExpiry", "passportNumber", "passportIssue", "passportExpiry",
    "driverLicenseNumber", "driverLicenseIssue", "driverLicenseExpiry",
  ] as const) {
    if (data[key] !== undefined) {
      if (typeof data[key] !== "string") throw new Error(`Invalid ${key}.`);
      result[key] = data[key].trim();
    }
  }
  if (result.name !== undefined && !result.name) throw new Error("Enter the customer’s name.");
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error("Enter a valid email address.");
  if (result.division !== undefined && !["rent", "lease"].includes(result.division)) throw new Error("Choose Rental or Leasing.");
  for (const key of ["dateOfBirth", "emiratesIdIssue", "emiratesIdExpiry", "passportIssue", "passportExpiry", "driverLicenseIssue", "driverLicenseExpiry"] as const) {
    const value = result[key];
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)))) {
      throw new Error(`Enter a valid ${key}.`);
    }
  }
  if (result.emiratesId) {
    const digits = result.emiratesId.replace(/\D/g, "");
    if (!/^784\d{12}$/.test(digits)) throw new Error("Emirates ID must contain 15 digits and start with 784.");
    result.emiratesId = digits;
  }
  return result;
}
