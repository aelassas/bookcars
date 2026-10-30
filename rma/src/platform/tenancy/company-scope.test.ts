import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { tenant, company, customer } from "@/platform/db/schema";
import {
  hasTestDatabase,
  hasAppRole,
  createTestTenant,
  createTestCompany,
  createTestCustomer,
  readCustomersScoped,
  resetPool,
} from "@/test/db";

// Company/brand-scope RLS (migration 0033): a scoped user sees only the rows of
// the companies in their scope; a cross-brand user sees all; an unscoped
// context (no company_ids) sees all (system/jobs). Requires DB_APP_ROLE — the
// owner role bypasses RLS — so it is skipped without a non-BYPASSRLS app role.
describe.skipIf(!hasTestDatabase() || !hasAppRole())("RLS company/brand scoping", () => {
  const ids = { tenant: "", rentalCo: "", leasingCo: "", rentalCust: "", leasingCust: "" };

  beforeAll(async () => {
    const t = await createTestTenant("cscope-tenant", "Company Scope Tenant");
    ids.tenant = t.id;
    const rental = await createTestCompany(t.id, "cscope-rental", "Rental Co", "rental");
    const leasing = await createTestCompany(t.id, "cscope-leasing", "Leasing Co", "leasing");
    ids.rentalCo = rental.id;
    ids.leasingCo = leasing.id;
    ids.rentalCust = (await createTestCustomer(t.id, rental.id, "Rental Customer", "rent")).id;
    ids.leasingCust = (await createTestCustomer(t.id, leasing.id, "Leasing Customer", "lease")).id;
  });

  afterAll(async () => {
    await db.delete(customer).where(eq(customer.tenantId, ids.tenant));
    await db.delete(company).where(eq(company.tenantId, ids.tenant));
    await db.delete(tenant).where(eq(tenant.id, ids.tenant));
    await resetPool();
  });

  it("a rental-scoped user sees only rental-company rows", async () => {
    const rows = await readCustomersScoped(ids.tenant, [ids.rentalCo], false);
    expect(rows.some((r) => r.id === ids.rentalCust)).toBe(true);
    expect(rows.some((r) => r.id === ids.leasingCust)).toBe(false);
  });

  it("a leasing-scoped user sees only leasing-company rows", async () => {
    const rows = await readCustomersScoped(ids.tenant, [ids.leasingCo], false);
    expect(rows.some((r) => r.id === ids.leasingCust)).toBe(true);
    expect(rows.some((r) => r.id === ids.rentalCust)).toBe(false);
  });

  it("a cross-brand user (is_cross) sees both lines", async () => {
    const rows = await readCustomersScoped(ids.tenant, [ids.rentalCo], true);
    expect(rows.some((r) => r.id === ids.rentalCust)).toBe(true);
    expect(rows.some((r) => r.id === ids.leasingCust)).toBe(true);
  });

  it("an unscoped context (no company_ids) sees both lines", async () => {
    const rows = await readCustomersScoped(ids.tenant, [], false);
    expect(rows.some((r) => r.id === ids.rentalCust)).toBe(true);
    expect(rows.some((r) => r.id === ids.leasingCust)).toBe(true);
  });
});
