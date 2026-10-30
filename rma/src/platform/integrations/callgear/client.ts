// CallGear REST client.
//
// CallGear exposes a JSON-RPC 2.0 REST API on the same base URL as their
// dashboard. Methods we expect to use early:
//   - call.list       → list recent calls
//   - call.recording  → fetch the recording URL for a call ID
//
// `getCallGearClient()` returns a Live client when CALLGEAR_API_KEY is set,
// otherwise a Mock that returns canned data so the platform always boots.

export interface CallGearClient {
  mode: "live" | "mock";
  fetchRecordingUrl(callId: string): Promise<string | null>;
}

// undici (Node's fetch) has no total-response timeout, so a stalled CallGear
// would hold this call open forever. 15s: this is a single JSON-RPC metadata
// lookup that returns one URL — it either answers immediately or it is wedged.
const CALLGEAR_TIMEOUT_MS = 15_000;

class LiveClient implements CallGearClient {
  readonly mode = "live" as const;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  async fetchRecordingUrl(callId: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call.recording",
          params: { callId },
          id: callId,
        }),
        signal: AbortSignal.timeout(CALLGEAR_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: { url?: string } };
      return data.result?.url ?? null;
    } catch (err) {
      // Surface a hung remote as a named error (a transport failure already
      // rejected here before this change); only `!res.ok` maps to null.
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error(
          `CallGear call.recording timed out after ${CALLGEAR_TIMEOUT_MS}ms (call ${callId})`,
          { cause: err }
        );
      }
      throw err;
    }
  }
}

class MockClient implements CallGearClient {
  readonly mode = "mock" as const;
  async fetchRecordingUrl(callId: string): Promise<string | null> {
    return `https://example.invalid/recordings/${callId}.mp3`;
  }
}

let cached: CallGearClient | null = null;

export function getCallGearClient(): CallGearClient {
  if (cached) return cached;
  const apiKey = process.env.CALLGEAR_API_KEY;
  const baseUrl = process.env.CALLGEAR_BASE_URL ?? "https://api.callgear.com";
  cached = apiKey ? new LiveClient(baseUrl, apiKey) : new MockClient();
  return cached;
}
