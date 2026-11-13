import { afterEach, describe, expect, it, vi } from "vitest";
import { LivePilotClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("LivePilotClient.blockEngine", () => {
  it("sends only the configured engine-block template to the selected IMEI", async () => {
    vi.stubEnv("PILOT_ENGINE_BLOCK_TEMPLATE", "engine_block");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ token: "token", node_id: 7, expires_in: 3600 }))
      .mockResolvedValueOnce(json({ code: 0, command_id: 42 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new LivePilotClient("test-user", "test-password");
    await expect(client.blockEngine("860111000000001")).resolves.toEqual({ commandId: 42, accepted: true });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://pilot-gps.com/api/v3/vehicles/commands?imei=860111000000001");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ template_name: "engine_block" });
    expect(init.headers.Authorization).toBe("Bearer token");
    expect(init.headers["X-Node-Id"]).toBe("7");
  });

  it("rejects a response without a command id", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ token: "token", node_id: 7 }))
      .mockResolvedValueOnce(json({ code: 1, msg: "Unknown template" }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new LivePilotClient("test-user", "test-password");
    await expect(client.blockEngine("860111000000001")).rejects.toThrow("Unknown template");
  });
});
