// Contract tests for the Twenty client: rate limiting, batch slicing,
// Retry-After backoff, mock mode, and secret hygiene.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTwentyClient } from "./client";
import { bootstrapTwentySchema } from "./schema-bootstrap";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

const LIVE = { baseUrl: "http://twenty.internal", apiKey: "test-key", mode: "live" as const };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("rate limiting (100 req/min token bucket)", () => {
  it("allows a burst of 10, then paces ~1 request per 600ms", async () => {
    vi.useFakeTimers();
    const callTimes: number[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        callTimes.push(Date.now());
        return jsonResponse({ data: { companies: [] } });
      })
    );
    const client = createTwentyClient(LIVE);

    const pending = Array.from({ length: 15 }, () => client.get("companies"));
    await vi.advanceTimersByTimeAsync(0);
    expect(callTimes).toHaveLength(10); // burst capacity

    // 100/min = one token every 600ms; 3000ms refills exactly 5 tokens.
    await vi.advanceTimersByTimeAsync(3000);
    expect(callTimes).toHaveLength(15);
    await Promise.all(pending);

    // Post-burst spacing proves the 100/min ceiling: no two requests closer
    // than one token interval.
    expect(callTimes[10]).toBeGreaterThanOrEqual(599);
    for (let i = 11; i < callTimes.length; i++) {
      expect(callTimes[i] - callTimes[i - 1]).toBeGreaterThanOrEqual(599);
    }
  });
});

describe("batchCreate", () => {
  it("slices records into ≤60-record batch calls", async () => {
    const calls: { url: string; body: unknown[] }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>[];
        calls.push({ url: String(input), body });
        return jsonResponse({
          data: { createWidgets: body.map((r, i) => ({ id: `w${i}`, ...r })) },
        });
      })
    );
    const client = createTwentyClient(LIVE);

    const records = Array.from({ length: 130 }, (_, i) => ({ name: `w${i}` }));
    const created = await client.batchCreate("widgets", records);

    expect(calls).toHaveLength(3); // 60 + 60 + 10
    expect(calls.every((c) => c.url === "http://twenty.internal/rest/batch/widgets")).toBe(true);
    expect(calls.map((c) => c.body.length)).toEqual([60, 60, 10]);
    expect(created).toHaveLength(130);
  });
});

describe("backoff", () => {
  it("honors Retry-After on 429 before retrying", async () => {
    vi.useFakeTimers();
    const times: number[] = [];
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        times.push(Date.now());
        n += 1;
        if (n === 1) {
          return new Response("rate limited", { status: 429, headers: { "Retry-After": "2" } });
        }
        return jsonResponse({ data: { companies: [] } });
      })
    );
    const client = createTwentyClient(LIVE);

    const p = client.get("companies");
    await vi.advanceTimersByTimeAsync(0);
    expect(n).toBe(1); // first attempt fired immediately

    await vi.advanceTimersByTimeAsync(1999);
    expect(n).toBe(1); // still inside the Retry-After window

    await vi.advanceTimersByTimeAsync(1);
    expect(n).toBe(2); // retried exactly after 2s
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(2000);
    await p;
  });

  it("does not retry non-retryable 4xx", async () => {
    const fetchMock = vi.fn(async () => new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTwentyClient(LIVE);

    await expect(client.get("companies")).rejects.toThrow("HTTP 400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("mock mode", () => {
  it("serves plausible data without network or api key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network must not be used in mock mode");
      })
    );
    const client = createTwentyClient({ mode: "mock" });
    expect(client.mode).toBe("mock");

    const people: { id: string; name: { firstName: string } }[] = [];
    for await (const person of client.listAll<{ id: string; name: { firstName: string } }>("people")) {
      people.push(person);
    }
    expect(people.length).toBeGreaterThan(0);
    expect(people[0].name.firstName).toBeTruthy();

    const companies: Record<string, unknown>[] = [];
    for await (const company of client.listAll("companies")) companies.push(company);
    expect(companies.length).toBeGreaterThan(0);

    const created = await client.batchCreate<{ id: string; name: string }>("companies", [
      { name: "Acme LLC" },
    ]);
    expect(created[0].name).toBe("Acme LLC");
    expect(created[0].id).toBeTruthy();

    const objects = await client.metadata.listObjects();
    expect(objects.map((o) => o.nameSingular)).toEqual(
      expect.arrayContaining(["person", "company", "opportunity"])
    );
  });
});

describe("secret hygiene", () => {
  it("never leaks the API key into error messages", async () => {
    const KEY = "test-secret-key-9f8e7d6c";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid request body", { status: 400 })));
    const client = createTwentyClient({ ...LIVE, apiKey: KEY });

    const err = await client.get("companies").then(
      () => null,
      (e: unknown) => e as Error
    );
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toContain("HTTP 400");
    expect(err?.message).not.toContain(KEY);
  });

  it("rejects credentials embedded in the base URL", () => {
    expect(() =>
      createTwentyClient({ baseUrl: "http://user:pass@twenty.internal", apiKey: "k", mode: "live" })
    ).toThrow(/credentials/);
  });
});

describe("bootstrapTwentySchema (against mock)", () => {
  it("is idempotent: the second run creates nothing", async () => {
    const client = createTwentyClient({ mode: "mock" });

    const first = await bootstrapTwentySchema(client);
    expect(first.objectsCreated).toEqual(
      expect.arrayContaining(["vehicle", "booking", "rental", "lease", "leaseDeal", "rentDeal", "stageEvent"])
    );
    expect(first.objectsCreated).toHaveLength(7);
    expect(first.fieldsCreated.length).toBeGreaterThan(0);

    const second = await bootstrapTwentySchema(client);
    expect(second.objectsCreated).toHaveLength(0);
    expect(second.fieldsCreated).toHaveLength(0);
  });
});
