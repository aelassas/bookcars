// SPEC §4.1 — HeuristicProvider: the no-network fallback.
//
// Used when no AI backend is configured/reachable (no ANTHROPIC_API_KEY,
// no local endpoint). Pure regex/keyword logic — never throws, never
// blocks on I/O — so the inbox always degrades gracefully instead of
// erroring.

import type { AIProvider, ClassifyResult, DraftReplyResult } from "../types";

export class HeuristicProvider implements AIProvider {
  name = "heuristic" as const;

  async classifyMessage(message: string): Promise<ClassifyResult> {
    const t = message.toLowerCase();
    const urgency: "low" | "medium" | "high" = /urgent|emergency|accident|broke|stuck/.test(t)
      ? "high"
      : /pay|invoice|fine/.test(t)
        ? "medium"
        : "low";
    return {
      intent:
        t.includes("rent") || t.includes("lease") || t.includes("available")
          ? "rental inquiry"
          : "general enquiry",
      urgency,
      language: /[а-яё]/i.test(message)
        ? "ru"
        : /[؀-ۿ]/.test(message)
          ? "ar"
          : "en",
      customer_segment: "retail",
      vehicle_class_hint: /mclaren|ferrari|lamborghini|rolls|bentley/.test(t)
        ? "ultra_luxury"
        : /g63|range rover|patrol/.test(t)
          ? "suv"
          : null,
      engine: "heuristic",
    };
  }

  // Canned reply — ignores the thread/vehicles args of AIProvider.draftReply.
  async draftReply(): Promise<DraftReplyResult> {
    return {
      reply:
        "Thank you for reaching out! We'll get back to you shortly with availability and pricing.",
      engine: "fallback",
    };
  }
}
