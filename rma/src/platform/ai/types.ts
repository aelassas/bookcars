// SPEC §4.2 — the provider interface every AI backend implements.
//
// The router (index.ts) picks a concrete provider per tenant; callers
// (ai-engine.ts) only ever see this interface, so swapping Claude for a
// customer's on-prem model is a config change, never a code change.

export type ProviderName = "claude" | "local" | "auto" | "heuristic";

export interface ClassifyResult {
  intent: string;
  urgency: "low" | "medium" | "high";
  language: string;
  customer_segment: "retail" | "corporate" | "vip" | "walk_in";
  vehicle_class_hint: string | null;
  engine: "llm" | "heuristic";
}

export interface VehicleSuggestion {
  make: string;
  model: string;
  plate: string;
  dailyRate: number;
}

export interface ThreadMessage {
  customerName?: string | null;
  body: string;
  channel: string;
}

export interface DraftReplyResult {
  reply: string;
  engine: string;
}

export interface AIProvider {
  name: ProviderName;
  classifyMessage(text: string): Promise<ClassifyResult>;
  draftReply(
    thread: ThreadMessage[],
    availableVehicles: VehicleSuggestion[]
  ): Promise<DraftReplyResult>;
}
