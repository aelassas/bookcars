import { describe, expect, it } from "vitest";
import { automaticCustomerNotificationPolicy } from "./notification-policy";

describe("automatic customer notification safety", () => {
  it("is disabled by default", () => {
    expect(automaticCustomerNotificationPolicy({})).toEqual({ enabled: false, after: null });
  });

  it("requires an explicit backlog cutoff when enabled", () => {
    expect(() => automaticCustomerNotificationPolicy({ RMA_OPERATIONS_NOTIFICATIONS_ENABLED: "true" })).toThrow("NOTIFICATIONS_AFTER");
    expect(() => automaticCustomerNotificationPolicy({ RMA_OPERATIONS_NOTIFICATIONS_ENABLED: "true", RMA_OPERATIONS_NOTIFICATIONS_AFTER: "not-a-date" })).toThrow("valid ISO");
  });

  it("returns the approved cutoff", () => {
    const result = automaticCustomerNotificationPolicy({ RMA_OPERATIONS_NOTIFICATIONS_ENABLED: "true", RMA_OPERATIONS_NOTIFICATIONS_AFTER: "2026-11-21T00:00:00Z" });
    expect(result.enabled).toBe(true);
    expect(result.after?.toISOString()).toBe("2026-11-21T00:00:00.000Z");
  });
});
