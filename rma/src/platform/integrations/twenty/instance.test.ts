// Which Twenty instance a tenant's records live in.
//
// The rental brands and the sales line are SEPARATE self-hosted Twenty
// deployments (:3002 and :3001) with separate workspaces and separate API
// keys. Before 2026-08-05 the integration held ONE cached client pointed at
// the sales instance, so every rental brand's WhatsApp was looked up against
// the sales workspace, matched nobody, and was silently dropped as `noPerson`
// — the rental Twenty had 0 notes in its entire life. These tests exist so
// that never silently regresses.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { twentyInstanceForTenantSlug, resolveTwentyInstance } from "./instance";

const ENV_KEYS = [
  "TWENTY_BASE_URL",
  "TWENTY_API_KEY",
  "TWENTY_RENTAL_BASE_URL",
  "TWENTY_RENTAL_API_KEY",
  "TWENTY_RENTAL_TENANTS",
];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("twentyInstanceForTenantSlug", () => {
  it("routes every rental brand to the rental instance", () => {
    expect(twentyInstanceForTenantSlug("cardiwan")).toBe("rental");
    expect(twentyInstanceForTenantSlug("easyrent")).toBe("rental");
    // ETM is EasyRent's legal name — same rental deployment.
    expect(twentyInstanceForTenantSlug("etm")).toBe("rental");
  });

  it("routes the sales line to the default instance", () => {
    expect(twentyInstanceForTenantSlug("take-auto")).toBe("default");
  });

  it("routes an unknown or missing tenant to the default instance", () => {
    // Fail toward the sales instance, which is the one that has always been
    // configured — an unknown tenant must not silently land in rental.
    expect(twentyInstanceForTenantSlug("who-is-this")).toBe("default");
    expect(twentyInstanceForTenantSlug(null)).toBe("default");
    expect(twentyInstanceForTenantSlug(undefined)).toBe("default");
  });

  it("lets ops re-point the rental set without a deploy", () => {
    process.env.TWENTY_RENTAL_TENANTS = "cardiwan";
    expect(twentyInstanceForTenantSlug("cardiwan")).toBe("rental");
    expect(twentyInstanceForTenantSlug("easyrent")).toBe("default");
  });
});

describe("resolveTwentyInstance", () => {
  it("gives each instance its own base URL and key", () => {
    process.env.TWENTY_BASE_URL = "http://localhost:3001";
    process.env.TWENTY_API_KEY = "sales-key";
    process.env.TWENTY_RENTAL_BASE_URL = "http://localhost:3002";
    process.env.TWENTY_RENTAL_API_KEY = "rental-key";

    expect(resolveTwentyInstance("default")).toEqual({
      baseUrl: "http://localhost:3001",
      apiKey: "sales-key",
      configured: true,
    });
    expect(resolveTwentyInstance("rental")).toEqual({
      baseUrl: "http://localhost:3002",
      apiKey: "rental-key",
      configured: true,
    });
  });

  it("reports the rental instance as unconfigured rather than borrowing the sales key", () => {
    // Borrowing would write rental records into the SALES workspace — the
    // exact cross-brand leak the sales/rent separation forbids. An
    // unconfigured instance must be visibly unconfigured.
    process.env.TWENTY_BASE_URL = "http://localhost:3001";
    process.env.TWENTY_API_KEY = "sales-key";

    const rental = resolveTwentyInstance("rental");
    expect(rental.configured).toBe(false);
    expect(rental.apiKey).toBeUndefined();
    expect(rental.baseUrl).not.toBe("http://localhost:3001");
  });

  it("never hands the sales key to the rental base URL", () => {
    process.env.TWENTY_API_KEY = "sales-key";
    process.env.TWENTY_RENTAL_BASE_URL = "http://localhost:3002";
    // Key missing for rental → unconfigured, not "rental URL + sales key".
    const rental = resolveTwentyInstance("rental");
    expect(rental.configured).toBe(false);
    expect(rental.apiKey).toBeUndefined();
  });
});
