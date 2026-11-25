// DeepSeek provider — OpenAI-compatible chat completions at api.deepseek.com.
//
// Two roles:
//  1. The SECOND-OPINION / fallback judge behind the local model (the
//     wa-lead-relay escalation) — completeJson only.
//  2. A full AIProvider (classifyMessage / draftReply) for deployments where
//     DeepSeek is THE classifier (RMA, 2026-10-31 — same setup takeauto ran).
//     The router (index.ts) picks it when the tenant's ai_provider_config says
//     provider="deepseek", or as the env default when DEEPSEEK_API_KEY is set
//     and no ANTHROPIC_API_KEY is.
//
// Same OpenAI-compatible REST surface as providers/local.ts
// (`POST {base}/chat/completions`, `GET {base}/models`) so we add no SDK
// dependency — the one difference is the auth key comes from DEEPSEEK_API_KEY,
// and the base URL is a fixed public endpoint rather than a per-tenant
// Tailscale address.

import type {
  AIProvider,
  ClassifyResult,
  DraftReplyResult,
  ThreadMessage,
  VehicleSuggestion,
} from "../types";

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

/** Mirrors ClaudeProvider's classify contract (JSON mode instead of tools). */
const CLASSIFY_SYSTEM =
  `You are a classifier for a UAE car rental company. ` +
  `Given an inbound customer message, analyze it and return structured JSON with these fields:\n` +
  `- intent: short label describing what the customer wants (e.g. "luxury rental inquiry", "payment issue", "breakdown report")\n` +
  `- urgency: "low" | "medium" | "high"\n` +
  `- language: detected language code ("en", "ru", "ar", etc.)\n` +
  `- customer_segment: "retail" | "corporate" | "vip" | "walk_in"\n` +
  `- vehicle_class_hint: "economy" | "suv" | "luxury" | "sports" | "ultra_luxury" | null if unclear`;

/** The draft persona carries the CLIENT's company name, not the platform's —
 *  AI_COMPANY_NAME on the box ("RMA Car Rental"); NEXT_PUBLIC_PLATFORM_NAME
 *  as a loose fallback. */
function draftSystem(): string {
  const company =
    (process.env.AI_COMPANY_NAME ?? "").trim() ||
    (process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "").trim() ||
    "the car rental company";
  return (
    `You are Kimberly, AI assistant for ${company} in Dubai. ` +
    `Reply in the customer's language (Russian / Arabic / English). ` +
    `Confirm vehicle make+model+plate, dates, total price in AED. ` +
    `Never invent a vehicle — only suggest from the list provided. ` +
    `Be warm, concise, and professional. Use 2-4 sentences max.`
  );
}

export class DeepseekProvider implements AIProvider {
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

  // ─── AIProvider (classifier + reply drafter) ─────────────────────────────

  /** Same contract as ClaudeProvider.classifyMessage, via JSON mode instead
   *  of tool-use. */
  async classifyMessage(message: string): Promise<ClassifyResult> {
    const raw = await this.completeJson(CLASSIFY_SYSTEM, message, 512);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let args: any;
    try {
      args = JSON.parse(raw);
    } catch {
      throw new Error(`DeepseekProvider classify: non-JSON response: ${raw.slice(0, 120)}`);
    }
    return {
      intent: String(args.intent ?? "general enquiry"),
      urgency: ["low", "medium", "high"].includes(args.urgency) ? args.urgency : "medium",
      language: String(args.language ?? "en"),
      customer_segment: ["retail", "corporate", "vip", "walk_in"].includes(args.customer_segment)
        ? args.customer_segment
        : "retail",
      vehicle_class_hint: args.vehicle_class_hint || null,
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
        { role: "system", content: draftSystem() },
        {
          role: "user",
          content: `Draft a reply to the latest customer message.\n\n${context}\n\nReply directly with the message text only — no headers, no markdown.`,
        },
      ],
      { maxTokens: 1024 }
    );

    return {
      reply: reply.trim() || "Thank you for reaching out! We'll get back to you shortly.",
      engine: "llm",
    };
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
