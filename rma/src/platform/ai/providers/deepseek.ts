// DeepSeek provider — OpenAI-compatible chat completions at api.deepseek.com.
//
// The SECOND-OPINION / fallback judge behind the local model (the wa-lead-relay
// escalation), not the primary classifier. Same OpenAI-compatible REST surface
// as providers/local.ts (`POST {base}/chat/completions`, `GET {base}/models`)
// so we add no SDK dependency — the one difference is the auth key comes from
// DEEPSEEK_API_KEY, and the base URL is a fixed public endpoint rather than a
// per-tenant Tailscale address.
//
// This class is intentionally narrower than LocalProvider: the second opinion
// only ever needs a strict-JSON completion (`completeJson`), so classifyMessage
// and draftReply are not implemented here. Wiring that needs one of those
// (i.e. the AIProvider router in index.ts) is out of scope for the escalation.

export interface DeepseekProviderConfig {
  apiKey: string;
  model?: string;
  /** Per-request timeout. */
  timeoutMs?: number;
}

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_TIMEOUT_MS = 60_000;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class DeepseekProvider {
  name = "deepseek" as const;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(cfg: DeepseekProviderConfig) {
    this.apiKey = cfg.apiKey;
    this.model = cfg.model ?? DEFAULT_MODEL;
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** GET {base}/models — for health checks / diagnostics. */
  async listModels(): Promise<string[]> {
    const res = await this.fetchWithTimeout(`${DEEPSEEK_BASE_URL}/models`, {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error(`DeepseekProvider /models returned ${res.status}`);
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    return (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  }

  /**
   * Free-form JSON completion. Returns the RAW content string — parsing and
   * schema validation belong to the caller (parseLeadVerdict knows the contract
   * it asked for).
   */
  async completeJson(system: string, user: string, maxTokens = 1024): Promise<string> {
    return this.chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { jsonObject: true, maxTokens }
    );
  }

  // ─── internals ────────────────────────────────────────────────────────────

  private async chat(
    messages: ChatMessage[],
    opts: { jsonObject?: boolean; maxTokens?: number }
  ): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = {
      model: this.model,
      messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: 0.3,
      stream: false,
    };
    if (opts.jsonObject) {
      body.response_format = { type: "json_object" };
    }

    const res = await this.fetchWithTimeout(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DeepseekProvider chat returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("DeepseekProvider: response missing choices[0].message.content");
    }
    return content;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        headers: { Authorization: `Bearer ${this.apiKey}`, ...(init.headers ?? {}) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
