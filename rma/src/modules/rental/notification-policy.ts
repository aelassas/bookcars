export function automaticCustomerNotificationPolicy(env: Record<string, string | undefined> = process.env): { enabled: false; after: null } | { enabled: true; after: Date } {
  if (env.RMA_OPERATIONS_NOTIFICATIONS_ENABLED !== "true") return { enabled: false, after: null };
  const raw = env.RMA_OPERATIONS_NOTIFICATIONS_AFTER?.trim();
  const after = raw ? new Date(raw) : null;
  if (!after || Number.isNaN(after.getTime())) {
    throw new Error("RMA_OPERATIONS_NOTIFICATIONS_AFTER must be a valid ISO timestamp before automatic customer notifications can be enabled");
  }
  return { enabled: true, after };
}
