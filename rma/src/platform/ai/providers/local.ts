// SPEC §4.4 — LocalProvider: OpenAI-compatible HTTP client.
//
// Talks to the customer's on-prem model over Tailscale (e.g. a Mac Studio
// running Qwen2.5 14B on MLX behind LM Studio, or Ollama / llama.cpp).
// Uses plain fetch against the OpenAI-compatible REST surface
// (`POST {baseURL}/chat/completions`, `GET {baseURL}/models`) so we add
// no SDK dependency and stay runtime-agnostic.
//
// Selling point in MENA: customer message data never leaves the customer
// site.

import type {
  AIProvider,
  ClassifyResult,
  DraftReplyResult,
  ThreadMessage,
  VehicleSuggestion,
} from "../types";

export interface LocalProviderConfig {
  baseURL: string;
  model: string;
  /** Per-request timeout. AutoFailoverProvider passes a tighter value. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

const CLASSIFY_SYSTEM =
  `You are a classifier for a UAE car rental company. Given an inbound ` +
  `customer message, respond with ONLY a JSON object (no prose, no markdown) ` +
  `with exactly these fields:\n` +
  `- intent: short label describing what the customer wants\n` +
  `- urgency: one of "low" | "medium" | "high"\n` +
  `- language: detected language code ("en", "ru", "ar", etc.)\n` +
  `- customer_segment: one of "retail" | "corporate" | "vip" | "walk_in"\n` +
  `- vehicle_class_hint: one of "economy" | "suv" | "luxury" | "sports" | "ultra_luxury" or null`;

const DRAFT_SYSTEM =
  `You are Kimberly, AI assistant for TAKE Auto Car Rental in Dubai. ` +
  `Reply in the customer's language (Russian / Arabic / English). ` +
  `Confirm vehicle make+model+plate, dates, total price in AED. ` +
  `Never invent a vehicle — only suggest from the list provided. ` +
  `Be warm, concise, and professional. Use 2-4 sentences max.`;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Is this worth asking the model again?
 *
 * One single-threaded MLX server answers both the lead qualifier and the media
 * describer. On 2026-09-01 that cost four hours of leads: 714 inbound messages,
 * zero cards, and a brain that answered a test call in 0.14s because it had
 * never been down — it was BUSY describing photos, so every qualifier call came
 * back "fetch failed" and the thread was dropped.
 *
 * A customer must not be missed because a picture was being looked at. So a
 * refusal to CONNECT is retried, while an answer the model actually gave —
 * even a useless one — is not, because retrying that only spends the model
 * twice for the same wrong result.
 */
export function isTransientModelError(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  if (name === "AbortError" || name === "TimeoutError") return true;  // our own timeout
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!msg) return false;
  if (/fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up|network|aborted/i.test(msg)) return true;
  // Server admitting it cannot take the call right now.
  return /returned (429|500|502|503|504)\b/.test(msg);
}

/** Backoff between attempts. A vision call on the shared brain runs a few
 *  seconds, so the last wait has to outlast one. */
const MODEL_RETRY_DELAYS_MS = [400, 1_500, 4_000];

export class LocalProvider implements AIProvider {
  name = "local" as const;
  private readonly baseURL: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(cfg: LocalProviderConfig) {
    // Normalize: strip a single trailing slash so `${baseURL}/chat/...` is clean.
    this.baseURL = cfg.baseURL.replace(/\/+$/, "");
    this.model = cfg.model;
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** GET {baseURL}/models — used by the health check and /settings/ai test. */
  async listModels(): Promise<string[]> {
    const res = await this.fetchWithTimeout(`${this.baseURL}/models`, {
      method: "GET",
    });
    if (!res.ok) {
      throw new Error(`LocalProvider /models returned ${res.status}`);
    }
    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    return (json.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id));
  }

  async classifyMessage(message: string): Promise<ClassifyResult> {
    const content = await this.chat(
      [
        { role: "system", content: CLASSIFY_SYSTEM },
        { role: "user", content: message },
      ],
      { jsonObject: true, maxTokens: 512 }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = {};
    try {
      parsed = JSON.parse(extractJson(content));
    } catch {
      throw new Error("LocalProvider: model did not return valid JSON for classify");
    }

    const urgency = ["low", "medium", "high"].includes(parsed.urgency)
      ? parsed.urgency
      : "medium";
    const segment = ["retail", "corporate", "vip", "walk_in"].includes(parsed.customer_segment)
      ? parsed.customer_segment
      : "retail";

    return {
      intent: String(parsed.intent ?? "general enquiry"),
      urgency,
      language: String(parsed.language ?? "en"),
      customer_segment: segment,
      vehicle_class_hint: parsed.vehicle_class_hint || null,
      engine: "llm",
    };
  }

  async draftReply(
    thread: ThreadMessage[],
    availableVehicles: VehicleSuggestion[]
  ): Promise<DraftReplyResult> {
    const lastMessage = thread[thread.length - 1];
    const vehicleList =
      availableVehicles.length > 0
        ? availableVehicles
            .map((v) => `- ${v.make} ${v.model} (plate ${v.plate}, AED ${v.dailyRate}/day)`)
            .join("\n")
        : "No specific vehicles currently available.";

    const context = `Customer: ${lastMessage?.customerName ?? "Unknown"}\nChannel: ${
      lastMessage?.channel ?? "unknown"
    }\n\nAvailable vehicles:\n${vehicleList}\n\nConversation history:\n${thread
      .map((m) => `${m.customerName ?? "Customer"}: ${m.body}`)
      .join("\n")}`;

    const reply = await this.chat(
      [
        { role: "system", content: DRAFT_SYSTEM },
        {
          role: "user",
          content: `Draft a reply to the latest customer message.\n\n${context}\n\nReply directly with the message text only — no headers, no markdown.`,
        },
      ],
      { maxTokens: 1024 }
    );

    return {
      reply: reply.trim() || "Thank you for reaching out! We'll get back to you shortly.",
      engine: "local",
    };
  }

  /**
   * Free-form JSON completion for callers whose output shape is not one of the
   * two canned tasks above (e.g. the AI resolver's case-enrichment prompt).
   * Returns the RAW content string — parsing and schema validation belong to
   * the caller, which knows the contract it asked for.
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
      // Disable "thinking" on reasoning-capable local models (e.g. Qwen3.x via
      // Ollama). Without this they spend the whole token budget on hidden
      // reasoning and return empty content (classify fails, ~12-38s latency).
      // Ollama honours reasoning_effort:"none"; LM Studio / other OpenAI-
      // compatible servers ignore the unknown field. Cuts classify to ~1s.
      reasoning_effort: "none",
      // mlx_lm.server (the prod brain since the Qwen3-30B swap) IGNORES
      // reasoning_effort — measured 2026-08-25: it still emitted a `reasoning`
      // block and burned ~150 of the 512-token budget before any content, and
      // a caller with a smaller budget got a message with NO content field at
      // all. It DOES honour the chat template flag, which drops the same call
      // from 1.4s to 0.17s. Both fields are sent so either server obeys.
      chat_template_kwargs: { enable_thinking: false },
    };
    if (opts.jsonObject) {
      body.response_format = { type: "json_object" };
    }

    // Retry only a busy or unreachable server — see isTransientModelError.
    let res: Response | null = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MODEL_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const r = await this.fetchWithTimeout(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text().catch(() => "");
          throw new Error(`LocalProvider chat returned ${r.status}: ${text.slice(0, 200)}`);
        }
        res = r;
        break;
      } catch (e) {
        lastErr = e;
        const delay = MODEL_RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !isTransientModelError(e)) throw e;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    if (!res) throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LocalProvider: response missing choices[0].message.content");
    }
    return content;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        // Local key is conventional ("local") — endpoints behind Tailscale
        // generally ignore it, but LM Studio/Ollama accept it.
        headers: { Authorization: "Bearer local", ...(init.headers ?? {}) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Models sometimes wrap JSON in ```json fences or add a stray prefix.
 * Pull the first balanced {...} object out of the string.
 */
function extractJson(s: string): string {
  const trimmed = s.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return trimmed;
  return trimmed.slice(start, end + 1);
}
