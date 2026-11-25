import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { lead } from "@/platform/db/schema";
import { withDrizzleTenant } from "./rls";
import {
  hasTestDatabase,
  createTestUser,
  createTestTenant,
  addTestMember,
  createTestLead,
  cleanupTestEntities,
  resetPool,
} from "@/test/db";


describe.skipIf(!hasTestDatabase())("RLS tenant isolation", () => {
  const entities: { users: string[]; tenants: string[] } = { users: [], tenants: [] };

  beforeAll(async () => {
    const owner = await createTestUser("rls-owner@takeauto.test");
    const intruder = await createTestUser("rls-intruder@takeauto.test");
    const tenantA = await createTestTenant("rls-tenant-a", "Tenant A");
    const tenantB = await createTestTenant("rls-tenant-b", "Tenant B");
    entities.users = [owner.id, intruder.id];
    entities.tenants = [tenantA.id, tenantB.id];

    await addTestMember(tenantA.id, owner.id, ["tenant_admin"]);
    await addTestMember(tenantB.id, intruder.id, ["tenant_admin"]);

    await createTestLead(tenantA.id, "Alice");
  });

  afterAll(async () => {
    await cleanupTestEntities(entities);
    await resetPool();
  });

  it("lets a tenant read its own rows", async () => {
    const rows = await withDrizzleTenant(entities.tenants[0], async (tx) =>
      tx.select().from(lead)
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => r.customerName === "Alice")).toBe(true);
  });

  it("blocks another tenant from reading the rows", async () => {
    const rows = await withDrizzleTenant(entities.tenants[1], async (tx) =>
      tx.select().from(lead)
    );
    expect(rows.some((r) => r.customerName === "Alice")).toBe(false);
  });

  it("prevents cross-tenant inserts", async () => {
    await expect(
      withDrizzleTenant(entities.tenants[1], async (tx) =>
        tx
          .insert(lead)
          .values({
            tenantId: entities.tenants[0],
            customerName: "Cross-tenant lead",
            status: "new",
          })
          .returning()
      )
    ).rejects.toThrow();
  });
});

describe("withDrizzleTenant validation", () => {
  it("rejects invalid tenant id format", async () => {
    await expect(
      withDrizzleTenant("not-a-uuid", async () => "ok")
    ).rejects.toThrow("Invalid tenantId format");
  });
});
