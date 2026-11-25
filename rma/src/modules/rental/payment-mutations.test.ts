import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(), auth: vi.fn(), home: vi.fn(), transaction: vi.fn(), revalidate: vi.fn(),
  limit: vi.fn(), aggregate: vi.fn(), returning: vi.fn(), set: vi.fn(), values: vi.fn(), deleteWhere: vi.fn(),
}));
vi.mock("@/platform/auth/authorization", () => ({ requireRoleForTenant: mocks.role, requireAuth: mocks.auth }));
vi.mock("@/modules/fleet/fleet-home", () => ({ requireFleetHomeTenantId: mocks.home }));
vi.mock("@/platform/tenancy/rls", () => ({ withDrizzleTenant: mocks.transaction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/platform/tenancy/guard", () => ({ assertNotPreviewMode: vi.fn() }));
vi.mock("./policies", () => ({ canManageRentalsForTenant: vi.fn() }));

import { deletePayment, updatePayment } from "./payment-actions";

const paymentRow = {
  id: "payment-1",
  rentalId: "rental-1",
  rentalChargeId: null,
  amount: 3780,
  method: "bank_transfer",
  status: "confirmed",
};

function queueRows(...rows: unknown[]) {
  for (const row of rows) mocks.limit.mockResolvedValueOnce([row]);
}

describe("payment editing and deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue("user-1");
    mocks.home.mockResolvedValue("home-1");
    mocks.aggregate.mockResolvedValue([{ total: 0 }]);
    mocks.returning.mockResolvedValue([{ id: "payment-1" }]);
    mocks.set.mockImplementation(() => ({ where: () => ({ returning: mocks.returning }) }));
    mocks.transaction.mockImplementation(async (_tenantId, fn) => fn({
      select: () => ({ from: () => ({ where: () => ({
        limit: mocks.limit,
        for: () => ({ limit: mocks.limit }),
        then: (resolve: (value: unknown) => unknown) => resolve(mocks.aggregate()),
      }) }) }),
      update: () => ({ set: mocks.set }),
      delete: () => ({ where: mocks.deleteWhere }),
      insert: () => ({ values: mocks.values }),
    }));
  });

  it("updates a pending payment with crypto and records an audit event", async () => {
    queueRows(
      { ...paymentRow, amount: 1000, method: "cash", status: "pending" },
      { id: "rental-1", balanceDue: 4000 },
      { ...paymentRow, amount: 1000, method: "cash", status: "pending" },
    );
    await updatePayment("tenant-1", "payment-1", { amount: 1200, method: "crypto", notes: "tx-ref" }, "rma");
    expect(mocks.role).toHaveBeenCalledWith("tenant-1", ["tenant_admin", "platform_admin"]);
    expect(mocks.set).toHaveBeenCalledWith({ amount: 1200, method: "crypto", notes: "tx-ref" });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ action: "payment.updated" }));
    expect(mocks.revalidate).toHaveBeenCalledWith("/rma/rentals/rental-1");
  });

  it("edits a confirmed payment and adjusts the rental balance by the difference", async () => {
    queueRows(paymentRow, { id: "rental-1", balanceDue: 2280 }, paymentRow);
    await updatePayment("tenant-1", "payment-1", { amount: 4000, method: "crypto" }, "rma");
    expect(mocks.set).toHaveBeenCalledWith({ balanceDue: 2060, updatedAt: expect.any(Date) });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "payment.updated",
      intent: expect.stringContaining("adjusted by -220 AED"),
    }));
  });

  it("rejects a confirmed edit that would overpay the rental", async () => {
    queueRows(paymentRow, { id: "rental-1", balanceDue: 0 }, paymentRow);
    await expect(updatePayment("tenant-1", "payment-1", { amount: 3781, method: "cash" })).rejects.toThrow("available balance of 3780");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("keeps a charge payment amount equal to its linked charge", async () => {
    const chargePayment = { ...paymentRow, rentalChargeId: "charge-1", amount: 100 };
    queueRows(chargePayment, { id: "rental-1", balanceDue: 0 }, chargePayment);
    await expect(updatePayment("tenant-1", "payment-1", { amount: 99, method: "cash" })).rejects.toThrow("must match");
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it("deletes a confirmed rental payment and restores its balance", async () => {
    queueRows(paymentRow, { id: "rental-1", balanceDue: 2280 }, paymentRow);
    await deletePayment("tenant-1", "payment-1", "rma");
    expect(mocks.set).toHaveBeenCalledWith({ balanceDue: 6060, updatedAt: expect.any(Date) });
    expect(mocks.deleteWhere).toHaveBeenCalled();
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "payment.deleted",
      intent: expect.stringContaining("balance increased"),
    }));
  });

  it("reopens a charge without changing the engine state", async () => {
    const chargePayment = { ...paymentRow, rentalChargeId: "charge-1", amount: 100, method: "cash" };
    queueRows(chargePayment, { id: "rental-1", balanceDue: 0 }, chargePayment);
    await deletePayment("tenant-1", "payment-1", "rma");
    expect(mocks.set).toHaveBeenCalledWith({ status: "unpaid", paidAt: null, updatedAt: expect.any(Date) });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "payment.deleted",
      intent: expect.stringContaining("engine state unchanged"),
    }));
  });
});
