// Degenerate-model-reply guard for the board classifier.
//
// `parseClassifyResult` COERCES missing fields (summary → "(no summary)",
// intent → other, urgency → med, awaiting_reply → false). Before this guard, a
// reply that was valid JSON but semantically empty ({} or all-blank strings)
// therefore parsed "successfully", so classifyThread reported fallback=false
// and upsertBoardItem ran its full DO UPDATE arm — overwriting a real, possibly
// human-edited card with placeholder text and silently dropping it out of the
// "needs reply" queue (awaiting_reply=false).
//
// Only the pure parser is exercised here: the rest of the worker talks to
// Postgres and to the local model, which is not worth mocking.
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildChatRequestBody,
  classifyThread,
  extractChatContent,
  parseClassifyResult,
  resolveClassifyEndpoint,
  type ClassifyEndpoint,
  type MessageThread,
} from "./classify-inbox";

describe("parseClassifyResult — informativeness", () => {
  it("rejects an empty JSON object", () => {
    expect(() => parseClassifyResult("{}")).toThrow(/semantically empty/i);
  });

  it("rejects all-blank strings", () => {
    const raw = JSON.stringify({
      summary: "",
      intent: "",
      urgency: "",
      suggested_draft: "",
    });
    expect(() => parseClassifyResult(raw)).toThrow(/semantically empty/i);
  });

  it("rejects whitespace-only summary even when intent/urgency are valid", () => {
    const raw = JSON.stringify({ summary: "   ", intent: "booking", urgency: "high" });
    expect(() => parseClassifyResult(raw)).toThrow(/blank summary/i);
  });

  it("keeps a real summary even when intent and urgency are both missing", () => {
    // The summary and draft are the useful part of a card; intent and urgency
    // are a sorting aid that coerce to defaults. Rejecting this reply would
    // throw away good work because the model skipped two enum fields.
    const raw = JSON.stringify({
      summary: "Customer asks about a Kia",
      suggested_draft: "We have one available from Thursday.",
    });
    const result = parseClassifyResult(raw);
    expect(result.summary).toBe("Customer asks about a Kia");
    expect(result.intent).toBe("other");
    expect(result.urgency).toBe("med");
  });

  it("assumes a reply is still owed when the model omits awaiting_reply", () => {
    // Silence is not "nothing needed" — defaulting to false would drop the
    // customer out of the needs-reply queue without anyone deciding that.
    const raw = JSON.stringify({ summary: "Asks whether insurance is included" });
    expect(parseClassifyResult(raw).awaiting_reply).toBe(true);
  });

  it("honours an explicit awaiting_reply=false", () => {
    const raw = JSON.stringify({ summary: "Thanks, see you Monday", awaiting_reply: false });
    expect(parseClassifyResult(raw).awaiting_reply).toBe(false);
  });

  it("flags degeneracy distinctly from unparseable output", () => {
    const degenerate = (() => {
      try {
        parseClassifyResult("{}");
      } catch (err) {
        return err as Error;
      }
    })();
    const unparseable = (() => {
      try {
        parseClassifyResult("I'm sorry, I cannot help with that.");
      } catch (err) {
        return err as Error;
      }
    })();

    expect(degenerate?.name).toBe("DegenerateReplyError");
    expect(unparseable?.name).toBe("Error");
  });
});

describe("parseClassifyResult — informative replies still parse", () => {
  it("accepts a full result", () => {
    const raw = JSON.stringify({
      summary: "Customer wants a Nissan Sunny for 3 days",
      intent: "booking",
      urgency: "high",
      awaiting_reply: true,
      suggested_draft: "Sure — I will check availability and confirm.",
    });
    expect(parseClassifyResult(raw)).toEqual({
      summary: "Customer wants a Nissan Sunny for 3 days",
      intent: "booking",
      urgency: "high",
      awaiting_reply: true,
      suggested_draft: "Sure — I will check availability and confirm.",
    });
  });

  it("accepts a summary with only one of intent/urgency and coerces the other", () => {
    const raw = JSON.stringify({ summary: "Asks for the monthly price", urgency: "low" });
    const result = parseClassifyResult(raw);
    expect(result.summary).toBe("Asks for the monthly price");
    expect(result.intent).toBe("other");
    expect(result.urgency).toBe("low");
  });

  it("still strips markdown fences", () => {
    const raw = '```json\n{"summary":"Wants delivery to JLT","intent":"handover","urgency":"med"}\n```';
    expect(parseClassifyResult(raw).intent).toBe("handover");
  });
});

// ─── MLX repoint (2026-08-22: ollama 9B → mlx-lm 30B on :8081) ─────────────

const OPENAI_EP: ClassifyEndpoint = {
  url: "http://127.0.0.1:8081/v1/chat/completions",
  model: "mlx-community/Qwen3.5-9B-4bit",
  timeoutMs: 5_000,
  dialect: "openai",
  maxTokens: 4096,
};

const OLLAMA_EP: ClassifyEndpoint = {
  url: "http://localhost:11434/api/chat",
  model: "qwen3.5:9b-mlx",
  timeoutMs: 5_000,
  dialect: "ollama",
  maxTokens: 1024,
};

describe("resolveClassifyEndpoint", () => {
  it("defaults to the MLX server, openai dialect, 4x token headroom", () => {
    const ep = resolveClassifyEndpoint({});
    expect(ep.url).toBe("http://127.0.0.1:8081/v1/chat/completions");
    expect(ep.model).toBe("mlx-community/Qwen3.5-9B-4bit");
    expect(ep.dialect).toBe("openai");
    expect(ep.maxTokens).toBe(4096);
    expect(ep.timeoutMs).toBe(120_000);
  });

  it("honors LOCAL_AI_BASE_URL / LOCAL_AI_MODEL overrides", () => {
    const ep = resolveClassifyEndpoint({
      LOCAL_AI_BASE_URL: "http://100.1.2.3:9999/v1/",
      LOCAL_AI_MODEL: "some-other-model",
    });
    expect(ep.url).toBe("http://100.1.2.3:9999/v1/chat/completions"); // trailing slash stripped
    expect(ep.model).toBe("some-other-model");
    expect(ep.dialect).toBe("openai");
  });

  it("QWEN_BASE_URL=.../api/chat rolls back to the ollama dialect exactly", () => {
    const ep = resolveClassifyEndpoint({
      QWEN_BASE_URL: "http://localhost:11434/api/chat",
      QWEN_MODEL: "qwen3.5:9b-mlx",
    });
    expect(ep.dialect).toBe("ollama");
    expect(ep.model).toBe("qwen3.5:9b-mlx");
    expect(ep.maxTokens).toBe(1024); // the old think:false budget
  });

  it("QWEN_MODEL wins over LOCAL_AI_MODEL; CLASSIFY_MAX_TOKENS is honored", () => {
    const ep = resolveClassifyEndpoint({
      LOCAL_AI_MODEL: "a",
      QWEN_MODEL: "b",
      CLASSIFY_MAX_TOKENS: "8192",
    });
    expect(ep.model).toBe("b");
    expect(ep.maxTokens).toBe(8192);
  });
});

describe("buildChatRequestBody", () => {
  const msgs = [{ role: "system" as const, content: "s" }];

  it("openai dialect: max_tokens, json_object, enable_thinking:false, no ollama flags", () => {
    const body = buildChatRequestBody(OPENAI_EP, msgs);
    expect(body).toMatchObject({
      model: OPENAI_EP.model,
      stream: false,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      chat_template_kwargs: { enable_thinking: false },
    });
    expect(body).not.toHaveProperty("think");
    expect(body).not.toHaveProperty("options");
  });

  it("ollama dialect: the pre-MLX body, byte-compatible for rollback", () => {
    const body = buildChatRequestBody(OLLAMA_EP, msgs);
    expect(body).toMatchObject({
      model: OLLAMA_EP.model,
      stream: false,
      think: false,
      options: { temperature: 0, num_predict: 1024 },
    });
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("chat_template_kwargs");
  });
});

describe("extractChatContent — thinking-model tolerance", () => {
  const JSON_PAYLOAD = '{"summary":"Wants a Sunny","intent":"booking","urgency":"high"}';

  it("reads content that arrives AFTER a long reasoning field (mlx-lm shape)", () => {
    const data = {
      choices: [
        {
          message: {
            reasoning: "Let me think about this customer. ".repeat(500), // ~17k chars of thinking
            content: JSON_PAYLOAD,
          },
        },
      ],
    };
    expect(extractChatContent(OPENAI_EP, data)).toBe(JSON_PAYLOAD);
    expect(parseClassifyResult(extractChatContent(OPENAI_EP, data)).intent).toBe("booking");
  });

  it("strips an inline <think> block left in content", () => {
    const data = {
      choices: [{ message: { content: `<think>hmm {...} not json</think>${JSON_PAYLOAD}` } }],
    };
    expect(parseClassifyResult(extractChatContent(OPENAI_EP, data)).summary).toBe("Wants a Sunny");
  });

  it("a reasoning-only reply (budget exhausted mid-thought) throws a NAMED error", () => {
    const data = { choices: [{ message: { reasoning: "thinking forever…", content: "" } }] };
    expect(() => extractChatContent(OPENAI_EP, data)).toThrow(/only reasoning/);
  });

  it("ollama dialect still reads message.content", () => {
    expect(extractChatContent(OLLAMA_EP, { message: { content: JSON_PAYLOAD } })).toBe(JSON_PAYLOAD);
  });
});

describe("classifyThread — over a stubbed fetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  const thread: MessageThread = {
    tenant_id: "t-1",
    channel: "whatsapp",
    customer_ref: "971501234567@s.whatsapp.net",
    customer_name: "Ahmed",
    bodies: ["I need a car tomorrow"],
    last_seen: new Date(),
  };

  function okResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  it("posts the openai body to the endpoint and parses reasoning-then-content", async () => {
    let seen: { url: string; body: Record<string, unknown> } | null = null;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return okResponse({
        choices: [
          {
            message: {
              reasoning: "The customer wants to rent. ".repeat(300),
              content: '{"summary":"Wants a car tomorrow","intent":"booking","urgency":"high","awaiting_reply":true,"suggested_draft":"Yes, available."}',
            },
          },
        ],
      });
    });

    const { result, fallback } = await classifyThread(thread, OPENAI_EP);
    expect(fallback).toBe(false);
    expect(result.intent).toBe("booking");
    expect(seen).not.toBeNull();
    expect(seen!.url).toBe(OPENAI_EP.url);
    expect(seen!.body.model).toBe(OPENAI_EP.model);
    expect(seen!.body.chat_template_kwargs).toEqual({ enable_thinking: false });
  });

  it("a hung model rejects via AbortSignal.timeout, not by pinning the worker", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation timed out.", "TimeoutError"))
          );
        })
    );

    await expect(classifyThread(thread, { ...OPENAI_EP, timeoutMs: 25 })).rejects.toThrow(
      /timed out after 25ms/
    );
  });

  it("an HTTP 500 surfaces as an error (the caller logs and keeps the queue moving)", async () => {
    vi.stubGlobal("fetch", async () => new Response("boom", { status: 500 }));
    await expect(classifyThread(thread, OPENAI_EP)).rejects.toThrow(/HTTP 500/);
  });
});
