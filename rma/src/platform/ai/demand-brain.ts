/**
 * demand-brain.ts — turn a messy WhatsApp rent thread into a STRUCTURED request.
 *
 * This is the only place the AI touches a rent-watcher decision, and it is kept
 * deliberately narrow: it parses the customer's ASK (which car, when, budget,
 * B2C vs B2B). It never decides price or availability — the platform matcher
 * does that from price_tier + rental, so a model that hallucinates a number
 * cannot put a wrong quote in front of a client.
 *
 * Provider seam: the local Ollama model on the box now, the Kimi API later.
 * `KIMI_API_KEY` present → Kimi; otherwise the local model. Either failure
 * (timeout, non-JSON, network) resolves to `null`, and the caller SKIPS the
 * request rather than emit a wrong ping. It never throws into the watcher loop.
 */

export type Channel = "b2c" | "b2b";

export interface StructuredRequest {
  make: string | null;
  model: string | null;
  /** ISO YYYY-MM-DD, or null when the thread didn't say. */
  dateFrom: string | null;
  dateTo: string | null;
  /** Budget in AED (monthly or daily as the client stated), or null. */
  budgetAed: number | null;
  /** 'b2b' when the asker is itself a rental company; 'b2c' for an individual. */
  channel: Channel | null;
  intent: string | null;
}

const EMPTY: StructuredRequest = {
  make: null, model: null, dateFrom: null, dateTo: null,
  budgetAed: null, channel: null, intent: null,
};

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const LOCAL_MODEL = process.env.RENT_BRAIN_MODEL || "qwen3.5-takeauto:latest";
const TIMEOUT_MS = 20_000;

const PROMPT = [
  "You extract a CAR RENTAL request from a WhatsApp message for a Dubai rental desk.",
  "Return ONLY a JSON object, no prose, with exactly these keys:",
  '{"make": string|null, "model": string|null, "dateFrom": "YYYY-MM-DD"|null,',
  ' "dateTo": "YYYY-MM-DD"|null, "budgetAed": number|null, "channel": "b2c"|"b2b"|null,',
  ' "intent": string|null}',
  "Rules: make/model = the car the customer wants (null if none named).",
  "channel = 'b2b' if the sender is itself a rental company (mentions 'rent a car',",
  "'car rental', a company name), else 'b2c'. budgetAed = any AED figure they gave.",
  "If the message is not a car request at all, return every field null.",
].join("\n");

/**
 * PURE: pull the StructuredRequest out of a model's raw text. Tolerates the
 * model wrapping JSON in prose or code fences. Returns null when there is no
 * parseable object or it carries no usable signal (no car and no dates/budget).
 */
export function parseStructuredDemand(raw: string): StructuredRequest | null {
  if (!raw) return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  const str = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s && s.toLowerCase() !== "null" ? s : null;
  };
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseInt(v.replace(/[^\d]/g, ""), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  };
  const ch = str(obj.channel)?.toLowerCase();
  const req: StructuredRequest = {
    make: str(obj.make),
    model: str(obj.model),
    dateFrom: str(obj.dateFrom),
    dateTo: str(obj.dateTo),
    budgetAed: num(obj.budgetAed),
    channel: ch === "b2b" ? "b2b" : ch === "b2c" ? "b2c" : null,
    intent: str(obj.intent),
  };
  // No usable signal → treat as "not a request" so the watcher skips it.
  if (!req.make && !req.model && !req.dateFrom && !req.budgetAed) return null;
  return req;
}

async function callOllama(thread: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        format: "json",
        stream: false,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: thread.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callKimi(thread: string): Promise<string | null> {
  const key = process.env.KIMI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.KIMI_MODEL || "moonshot-v1-8k",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: thread.slice(0, 4000) },
        ],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Which brain is active — Kimi when its key is set, else the local model. */
export function activeBrain(): "kimi" | "local" {
  return process.env.KIMI_API_KEY?.trim() ? "kimi" : "local";
}

/**
 * Structure a rent thread. Returns null on any failure or when the thread
 * carries no car request — the caller treats null as "skip", never as an error.
 */
export async function structureDemand(thread: string): Promise<StructuredRequest | null> {
  if (!thread?.trim()) return null;
  const raw = activeBrain() === "kimi" ? await callKimi(thread) : await callOllama(thread);
  return raw ? parseStructuredDemand(raw) : null;
}

export const _EMPTY_STRUCTURED = EMPTY;
