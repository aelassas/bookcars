// SPEC §4.5 / §6.2 — health probe for a tenant's local AI endpoint.
//
// Used by the /settings/ai "Test connection" button and (later) the
// per-tenant background health-check job. Hits GET /models and a one-line
// /chat/completions probe, returns latency + the model list.

import { LocalProvider } from "./providers/local";

export interface HealthResult {
  ok: boolean;
  latencyMs: number;
  models: string[];
  sample?: string;
  error?: string;
}

export async function testLocalEndpoint(cfg: {
  baseURL: string;
  model: string;
}): Promise<HealthResult> {
  const start = Date.now();
  try {
    const lp = new LocalProvider({ baseURL: cfg.baseURL, model: cfg.model, timeoutMs: 6000 });
    const models = await lp.listModels();
    const draft = await lp.draftReply(
      [{ body: "Reply with the single word OK.", channel: "test", customerName: null }],
      []
    );
    return {
      ok: true,
      latencyMs: Date.now() - start,
      models,
      sample: draft.reply.slice(0, 160),
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      models: [],
      error: (e as Error).message,
    };
  }
}
