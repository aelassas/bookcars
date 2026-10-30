export const MODULE_REGISTRY = [
  { id: "dashboard", label: "Overview", route: "" },
  { id: "crm", label: "CRM", route: "/crm" },
  { id: "customers", label: "Customers", route: "/customers" },
  { id: "messages", label: "Messages", route: "/messages" },
  { id: "fleet", label: "Fleet", route: "/fleet" },
  { id: "rentals", label: "Rentals", route: "/rentals" },
  { id: "leases", label: "Leases", route: "/leases" },
  { id: "returns", label: "Returns", route: "/returns" },
  { id: "collections", label: "Collections", route: "/collections" },
  { id: "tasks", label: "Tasks", route: "/tasks" },
] as const;

export type ModuleId = (typeof MODULE_REGISTRY)[number]["id"];

export const DEFAULT_MODULES: ModuleId[] = [
  "dashboard",
  "crm",
  "customers",
  "messages",
  "fleet",
  "rentals",
  "leases",
  "returns",
  "collections",
  "tasks",
];

export function isValidModuleId(id: string): id is ModuleId {
  return MODULE_REGISTRY.some((m) => m.id === id);
}

export function normalizeModules(modules?: string[] | null): ModuleId[] {
  if (!Array.isArray(modules) || modules.length === 0) return DEFAULT_MODULES;
  return modules.filter(isValidModuleId);
}
