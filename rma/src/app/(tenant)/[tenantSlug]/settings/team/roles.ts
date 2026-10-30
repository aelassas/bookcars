// Assignable tenant roles (SPEC §2). Kept in a plain module so it can be
// imported by both the "use server" actions file and the page — a
// "use server" file may only export async functions.

export const ASSIGNABLE_ROLES = [
  "tenant_admin",
  "sales",
  "sales_manager",
  "general_manager",
  "primary",
  "security",
  "programs_department",
  "driver",
  "fleet",
  "hr",
  "finance",
  "technical",
] as const;
