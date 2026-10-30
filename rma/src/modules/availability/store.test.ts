// store.ts — the agent_availability table. DB-backed (skipped without
// DATABASE_URL, the house pattern from company-scope.test.ts): pins the
// phone-override round-trip (0077) — a manager's schedule edit writes ONLY
// the schedule/HR/phone columns, the live toggle survives, and vice versa.
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { agentAvailability } from "@/platform/db/schema";
import { hasTestDatabase, resetPool } from "@/test/db";
import { listAvailability, loadPhoneOverrides, setAvailability, setSchedule } from "./store";

const KEY = "__test-phone-agent";

describe.skipIf(!hasTestDatabase())("availability store — phone override round-trip", () => {
  afterAll(async () => {
    await db.delete(agentAvailability).where(eq(agentAvailability.agentKey, KEY));
    await resetPool();
  });

  it("setSchedule writes the phone override; loadPhoneOverrides and listAvailability read it back", async () => {
    await setSchedule({
      name: "__Test Phone Agent",
      brand: "etm",
      dayOff: 5,
      shiftStart: "10:00",
      shiftEnd: "20:00",
      leaveDaysRemaining: 3,
      phone: "971500000001",
      updatedBy: "test",
    });
    const overrides = await loadPhoneOverrides();
    expect(overrides[KEY]).toBe("971500000001");
    const row = (await listAvailability()).find((r) => r.agentKey === KEY);
    expect(row?.phone).toBe("971500000001");
    expect(row?.dayOff).toBe(5);

    // The toggle must NOT wipe the phone (the toggle/schedule discipline,
    // both directions).
    await setAvailability({ name: "__Test Phone Agent", brand: "etm", status: "off", updatedBy: "test", busyTtlMs: 60_000 });
    const after = (await listAvailability()).find((r) => r.agentKey === KEY);
    expect(after?.phone).toBe("971500000001");
    expect(after?.status).toBe("off");
    expect(after?.dayOff).toBe(5);

    // Clearing the override returns to null (the env roster phone rules again).
    await setSchedule({
      name: "__Test Phone Agent",
      brand: "etm",
      dayOff: 5,
      shiftStart: "10:00",
      shiftEnd: "20:00",
      leaveDaysRemaining: 3,
      phone: null,
      updatedBy: "test",
    });
    expect((await loadPhoneOverrides())[KEY]).toBeUndefined();
    // …and the schedule edit must not have wiped the toggle.
    const cleared = (await listAvailability()).find((r) => r.agentKey === KEY);
    expect(cleared?.status).toBe("off");
  });
});
