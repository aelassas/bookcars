import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(), preview: vi.fn(), transaction: vi.fn(), revalidate: vi.fn(),
  returning: vi.fn(), values: vi.fn(), set: vi.fn(),
}));
vi.mock("./policies", () => ({ canManageCRMForTenant: mocks.authorize }));
vi.mock("@/platform/tenancy/guard", () => ({ assertNotPreviewMode: mocks.preview }));
vi.mock("@/platform/tenancy/rls", () => ({ withDrizzleTenant: mocks.transaction }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/platform/auth/authorization", () => ({ requireAuth: vi.fn() }));

import { createCustomer, updateCustomer } from "./customer-actions";

describe("customer edits", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.returning.mockResolvedValue([{ id: "customer-1", name: "Amina" }]);
    mocks.set.mockReturnValue({ where: () => ({ returning: mocks.returning }) });
    mocks.values.mockReturnValue({ returning: mocks.returning });
    mocks.transaction.mockImplementation(async (_tenantId, fn) => fn({
      update: () => ({ set: mocks.set }), insert: () => ({ values: mocks.values }),
    }));
  });
  it("authorizes the supplied tenant before any database access", async () => {
    mocks.authorize.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(updateCustomer("other-tenant", "customer-1", { name: "Changed" })).rejects.toThrow("Forbidden");
    expect(mocks.authorize).toHaveBeenCalledWith("other-tenant");
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects blank names before inserting a customer", async () => {
    await expect(createCustomer("tenant-1", { name: "  " })).rejects.toThrow("name");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("keeps preview workspaces read-only", async () => {
    mocks.preview.mockRejectedValueOnce(new Error("Preview mode"));
    await expect(updateCustomer("tenant-1", "customer-1", { name: "Amina" })).rejects.toThrow("Preview mode");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("reports a missing record instead of claiming an edit succeeded", async () => {
    mocks.returning.mockResolvedValueOnce([]);
    await expect(updateCustomer("tenant-1", "missing", { name: "Amina" })).rejects.toThrow("no longer exists");
    expect(mocks.values).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("saves only allowed fields and refreshes actual customer routes", async () => {
    await updateCustomer("tenant-1", "customer-1", { name: " Amina ", email: "", tenantId: "other" } as Parameters<typeof updateCustomer>[2]);
    expect(mocks.set).toHaveBeenCalledWith({ name: "Amina", email: "", updatedAt: expect.any(Date) });
    expect(mocks.transaction).toHaveBeenCalledWith("tenant-1", expect.any(Function));
    expect(mocks.revalidate).toHaveBeenCalledWith("/[tenantSlug]/customers", "page");
    expect(mocks.revalidate).toHaveBeenCalledWith("/[tenantSlug]/customers/[id]", "page");
  });
});
