// Bitrix sync — the batched deal → customer resolution (0067). Fakes only:
// the db is a stub recording how many SELECT chains ran, so "one IN query
// per page" is a tested property, not a hope. No live Bitrix, no live DB.
import { describe, expect, it } from "vitest";
import { collectDealContactExternalIds, resolveCustomerIdsByExternalId } from "./sync";

function createFakeDb(rows: { id: string; externalId: string | null }[]) {
  const queries: unknown[] = [];
  const db = {
    select: (cols: unknown) => {
      queries.push(cols);
      return {
        from: () => ({
          where: () => Promise.resolve(rows),
        }),
      };
    },
  };
  return { db: db as unknown as Parameters<typeof resolveCustomerIdsByExternalId>[0], queries };
}

describe("collectDealContactExternalIds", () => {
  it("collects each distinct contact id of the page, CONTACT_IDS fallback included", () => {
    const ids = collectDealContactExternalIds([
      { ID: 1, CONTACT_ID: 777 },
      { ID: 2, CONTACT_ID: "777" }, // same contact, other dtype — deduped
      { ID: 3, CONTACT_IDS: [888, 889] },
      { ID: 4 }, // no contact — contributes nothing
    ]);
    expect(ids.sort()).toEqual(["777", "888"]);
  });
});

describe("resolveCustomerIdsByExternalId", () => {
  it("runs exactly ONE batched query for the whole page", async () => {
    const { db, queries } = createFakeDb([
      { id: "cust-uuid-1", externalId: "777" },
      { id: "cust-uuid-2", externalId: "888" },
    ]);
    const map = await resolveCustomerIdsByExternalId(db, "tenant-uuid", ["777", "888", "999"]);
    expect(queries).toHaveLength(1);
    expect(map.get("777")).toBe("cust-uuid-1");
    expect(map.get("888")).toBe("cust-uuid-2");
    // A contact not synced yet is simply absent — the deal keeps NULL and the
    // nightly reconcile heals it; the row must never fail over this.
    expect(map.has("999")).toBe(false);
  });

  it("never queries when the page names no contacts", async () => {
    const { db, queries } = createFakeDb([]);
    const map = await resolveCustomerIdsByExternalId(db, "tenant-uuid", []);
    expect(queries).toHaveLength(0);
    expect(map.size).toBe(0);
  });
});
