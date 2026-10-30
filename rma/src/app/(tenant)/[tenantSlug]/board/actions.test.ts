// Cross-tenant authorization guard for the board server actions.
//
// The board actions (approve/dismiss/assign/updateDraft) are directly
// invocable server actions that take a tenantId argument. Before this guard,
// any signed-in user could pass ANOTHER tenant's id and approve/dismiss its
// cards — and approve queues a real WhatsApp send. Each action now calls
// canManageMessagingForTenant(tenantId) first, which verifies the caller's
// membership + role for THAT tenant.
//
// We mock only the two seams the real guard depends on — the session (auth)
// and the DB membership lookup — and exercise the real authorization code so
// a regression that drops the check fails this test.
import { describe, it, expect, vi } from "vitest";

// Signed-in user with no membership in the tenant they are targeting.
vi.mock("@/platform/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "attacker-user", email: "attacker@example.com" } })),
}));

// db.select(...).from(...).where(...).limit(1) → [] : the user is not a member
// of the target tenant, so getTenantRoles returns no roles.
vi.mock("@/platform/db/client", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.innerJoin = () => chain;
  chain.limit = () => Promise.resolve([]);
  return { db: { select: () => chain }, pool: {} };
});

import { approveItem, dismissItem, assignItem, updateDraft } from "./actions";

describe("board actions — cross-tenant authorization", () => {
  const OTHER_TENANT = "00000000-0000-0000-0000-000000000000";

  it("rejects approve of another tenant's card", async () => {
    await expect(approveItem(OTHER_TENANT, "card-1")).rejects.toThrow(/Forbidden/);
  });

  it("rejects dismiss of another tenant's card", async () => {
    await expect(dismissItem(OTHER_TENANT, "card-1")).rejects.toThrow(/Forbidden/);
  });

  it("rejects assign of another tenant's card", async () => {
    await expect(assignItem(OTHER_TENANT, "card-1")).rejects.toThrow(/Forbidden/);
  });

  it("rejects draft edit of another tenant's card", async () => {
    await expect(updateDraft(OTHER_TENANT, "card-1", "hi")).rejects.toThrow(/Forbidden/);
  });
});
