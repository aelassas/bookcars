export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  division?: string;
  source?: string;
  notes?: string;
};

/** Whitelist editable fields; empty optional fields deliberately clear them. */
export function normalizeCustomerInput(data: Partial<CustomerInput>) {
  const result: Partial<CustomerInput> = {};
  for (const key of ["name", "phone", "email", "division", "source", "notes"] as const) {
    if (data[key] !== undefined) {
      if (typeof data[key] !== "string") throw new Error(`Invalid ${key}.`);
      result[key] = data[key].trim();
    }
  }
  if (result.name !== undefined && !result.name) throw new Error("Enter the customer’s name.");
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
    throw new Error("Enter a valid email address.");
  }
  if (result.division !== undefined && !["rent", "lease"].includes(result.division)) {
    throw new Error("Choose Rental or Leasing.");
  }
  return result;
}
