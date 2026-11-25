// SPEC §4.1 — ClaudeProvider: the Anthropic-backed implementation.
//
// This is the original platform/ai/claude.ts logic, now behind the
// AIProvider interface. Construction assumes ANTHROPIC_API_KEY is set
// (the router only instantiates this when it is); if it isn't, calls
// throw so AutoFailoverProvider can react rather than silently degrade.

import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  ClassifyResult,
  DraftReplyResult,
  ThreadMessage,
  VehicleSuggestion,
} from "../types";

const apiKey = process.env.ANTHROPIC_API_KEY;

/** Shared client — null when no key is configured. */
export const claude = apiKey ? new Anthropic({ apiKey }) : null;

// ─── Prompt caching helpers ─────────────────────────────────────────────────

function cachedSystem(text: string): Anthropic.TextBlockParam {
  return {
    type: "text",
    text,
    cache_control: { type: "ephemeral" },
  };
}

// ─── classifyMessage ────────────────────────────────────────────────────────

const CLASSIFY_SYSTEM = cachedSystem(
  `You are a classifier for a UAE car rental company. ` +
    `Given an inbound customer message, analyze it and return structured JSON with these fields:\n` +
    `- intent: short label describing what the customer wants (e.g. "luxury rental inquiry", "payment issue", "breakdown report")\n` +
    `- urgency: "low" | "medium" | "high"\n` +
    `- language: detected language code ("en", "ru", "ar", etc.)\n` +
    `- customer_segment: "retail" | "corporate" | "vip" | "walk_in"\n` +
    `- vehicle_class_hint: "economy" | "suv" | "luxury" | "sports" | "ultra_luxury" | null if unclear`
);

const classifyTool: Anthropic.Tool = {
  name: "classify_inbound_message",
  description: "Classify an inbound customer message",
  input_schema: {
    type: "object",
    properties: {
      intent: { type: "string" },
      urgency: { type: "string", enum: ["low", "medium", "high"] },
      language: { type: "string" },
      customer_segment: { type: "string", enum: ["retail", "corporate", "vip", "walk_in"] },
      vehicle_class_hint: {
        type: "string",
        enum: ["economy", "suv", "luxury", "sports", "ultra_luxury"],
        nullable: true,
      },
    },
    required: ["intent", "urgency", "language", "customer_segment", "vehicle_class_hint"],
  },
};

// ─── draftReply system prompt ───────────────────────────────────────────────

const DRAFT_SYSTEM = cachedSystem(
  `You are Kimberly, AI assistant for TAKE Auto Car Rental in Dubai. ` +
    `Reply in the customer's language (Russian / Arabic / English). ` +
    `Confirm vehicle make+model+plate, dates, total price in AED. ` +
    `Never invent a vehicle — only suggest from the list provided. ` +
    `Be warm, concise, and professional. Use 2-4 sentences max.`
);

export class ClaudeProvider implements AIProvider {
  name = "claude" as const;

  async classifyMessage(message: string): Promise<ClassifyResult> {
    if (!claude) {
      throw new Error("ClaudeProvider: ANTHROPIC_API_KEY is not configured");
    }

    const res = await claude.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 512,
      system: [CLASSIFY_SYSTEM],
      messages: [{ role: "user", content: message }],
      tools: [classifyTool],
      tool_choice: { type: "tool", name: "classify_inbound_message" },
    });

    const toolUse = res.content.find((c) => c.type === "tool_use") as
      | Anthropic.ToolUseBlock
      | undefined;
    if (!toolUse) {
      throw new Error("Claude did not return a tool use block");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args = toolUse.input as any;
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
    if (!claude) {
      throw new Error("ClaudeProvider: ANTHROPIC_API_KEY is not configured");
    }

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

    const res = await claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: [DRAFT_SYSTEM],
      messages: [
        {
          role: "user",
          content: `Draft a reply to the latest customer message.\n\n${context}\n\nReply directly with the message text only — no headers, no markdown.`,
        },
      ],
    });

    const text = res.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")
      .trim();

    return {
      reply: text || "Thank you for reaching out! We'll get back to you shortly.",
      engine: "llm",
    };
  }
}
