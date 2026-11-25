import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(), auth: vi.fn(), home: vi.fn(), transaction: vi.fn(), revalidate: vi.fn(),
  limit: vi.fn(), returning: vi.fn(), set: vi.fn(), where: vi.fn(), values: vi.fn(),
}));
vi.mock("@/platform/auth/authorization", () => ({ requireRoleForTenant: mocks.role, requireAuth: mocks.auth }));
vi.mock("@/modules/fleet/fleet-home", () => ({ requireFleetHomeTenantId: mocks.home }));
vi.mock("@/platform/tenancy/rls", () => ({ withDrizzleTenant: mocks.transaction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("./policies", () => ({ canManageRentalsForTenant: vi.fn() }));
vi.mock("@/platform/tenancy/guard", () => ({ assertNotPreviewMode: vi.fn() }));

import { rejectPayment } from "./payment-actions";

describe("rejectPayment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue("user-1");
    mocks.home.mockResolvedValue("home-1");
    mocks.limit.mockResolvedValue([{ id: "payment-1", rentalId: "rental-1", amount: 3780, status: "pending" }]);
    mocks.returning.mockResolvedValue([{ id: "payment-1", status: "rejected" }]);
    mocks.where.mockResolvedValue([]);
    mocks.values.mockResolvedValue([]);
    mocks.set.mockImplementation((values) => ({
      where: values.status === "rejected" ? () => ({ returning: mocks.returning }) : mocks.where,
    }));
    mocks.transaction.mockImplementation(async (_tenantId, fn) => fn({
      select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
      update: () => ({ set: mocks.set }),
      insert: () => ({ values: mocks.values }),
    }));
  });

  it("rejects a pending payment without changing the rental balance", async () => {
    const result = await rejectPayment("tenant-1", "payment-1", "rma");
    expect(result).toEqual({ id: "payment-1", status: "rejected" });
    expect(mocks.set).toHaveBeenCalledWith({ status: "rejected" });
    expect(mocks.set).toHaveBeenCalledWith({ status: "done", updatedAt: expect.any(Date) });
    expect(mocks.set).not.toHaveBeenCalledWith(expect.objectContaining({ balanceDue: expect.anything() }));
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "payment.rejected",
      intent: expect.stringContaining("balance unchanged"),
    }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/rma/rentals/rental-1");
  });

  it("does not reject a confirmed payment", async () => {
    mocks.limit.mockResolvedValueOnce([{ id: "payment-1", status: "confirmed" }]);
    await expect(rejectPayment("tenant-1", "payment-1")).rejects.toThrow("cannot be rejected");
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("is idempotent for an already rejected payment", async () => {
    mocks.limit.mockResolvedValueOnce([{ id: "payment-1", status: "rejected" }]);
    await expect(rejectPayment("tenant-1", "payment-1")).resolves.toEqual({ id: "payment-1", status: "rejected" });
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
