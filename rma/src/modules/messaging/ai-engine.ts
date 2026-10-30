import { getAIProviderForTenant } from "@/platform/ai";
import type { ClassifyResult, VehicleSuggestion } from "@/platform/ai/types";
import {
  type Classification,
  type Department,
  type Urgency,
} from "./classify";

const URGENCIES: Urgency[] = ["low", "medium", "high"];

function mapClaudeToClassification(result: ClassifyResult): Classification {
  const deptMap: Record<string, Department> = {
    "rental inquiry": "sales",
    "luxury rental inquiry": "sales",
    "payment issue": "security",
    "breakdown report": "technical",
  };
  const department = deptMap[result.intent] ?? "primary";

  return {
    department,
    intent: result.intent,
    urgency: URGENCIES.includes(result.urgency as Urgency) ? (result.urgency as Urgency) : "medium",
    confidence: result.engine === "llm" ? 0.92 : 0.6,
    reason: `Classified by ${result.engine === "llm" ? "AI" : "heuristic"} as ${result.intent} (${result.language}).`,
    engine: result.engine,
  };
}

export async function classifyMessage(
  text: string,
  tenantId?: string
): Promise<Classification> {
  const provider = await getAIProviderForTenant(tenantId);
  const result = await provider.classifyMessage(text);
  return mapClaudeToClassification(result);
}

export interface DraftReplyContext {
  customerName?: string | null;
  channel: string;
  classification: Classification;
  availableVehicles?: { make: string; model: string; plate: string; dailyRate: number }[];
}

const DEPT_FALLBACK: Record<Department, string> = {
  sales:
    "Thank you for your interest! We'd be happy to help you find the perfect vehicle. Could you share your preferred dates and vehicle type?",
  technical:
    "Sorry to hear you're having an issue with the vehicle. Our technical team has been notified. Please share your current location and we'll assist immediately.",
  security:
    "Thank you for reaching out regarding your account. Our team will review your request and get back within 24 hours.",
  primary:
    "Thank you for contacting us — we've received your message and will get back to you shortly.",
};

function fallbackReply(body: string, ctx: DraftReplyContext): string {
  const greeting = ctx.customerName
    ? `Hi ${ctx.customerName.split(" ")[0]},`
    : "Hi there,";
  return `${greeting} ${DEPT_FALLBACK[ctx.classification.department]}`;
}

export async function draftReply(
  body: string,
  ctx: DraftReplyContext,
  tenantId?: string
): Promise<{ reply: string; engine: string }> {
  const vehicles: VehicleSuggestion[] =
    ctx.availableVehicles?.map((v) => ({
      make: v.make,
      model: v.model,
      plate: v.plate,
      dailyRate: v.dailyRate,
    })) ?? [];

  const thread = [
    {
      customerName: ctx.customerName,
      body,
      channel: ctx.channel,
    },
  ];

  try {
    const provider = await getAIProviderForTenant(tenantId);
    const result = await provider.draftReply(thread, vehicles);
    if (result.reply) return { reply: result.reply, engine: result.engine };
  } catch {
    // fall through
  }

  return { reply: fallbackReply(body, ctx), engine: "fallback" };
}
