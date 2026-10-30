// SPEC §4.3 — the AI provider router.
//
// Resolves the right AIProvider for a tenant from its ai_provider_config
// row plus environment. Callers (ai-engine.ts) never construct providers
// directly — they ask the router. `tenantId` is optional so legacy call
// sites that don't yet thread it keep working (they get the env default:
// Claude if a key is set, else heuristic).

import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { aiProviderConfig } from "@/platform/db/schema";
import type { AIProvider } from "./types";
import { ClaudeProvider } from "./providers/claude";
import { LocalProvider } from "./providers/local";
import { AutoFailoverProvider } from "./providers/auto";
import { HeuristicProvider } from "./providers/heuristic";

export type AIConfigRow = typeof aiProviderConfig.$inferSelect;

const DEFAULT_LOCAL_MODEL = "qwen2.5:14b";

/**
 * How long AutoFailoverProvider lets the local model take before falling back.
 * 2s was tuned for a warm 7B; the prod 9B (qwen3.5:9b-mlx) needs 10-30s just to
 * cold-load into memory, so 2s meant local NEVER served and every call silently
 * went to Claude (cost + PII leaving the box). Callers run in pg-boss jobs, not
 * the request path, so a generous budget is safe.
 */
const LOCAL_FAILOVER_TIMEOUT_MS = 20_000;

/** Load the per-tenant AI config row, or null if none / unavailable. */
export async function loadAIConfig(tenantId: string): Promise<AIConfigRow | null> {
  try {
    return await withDrizzleTenant(tenantId, async (tx) => {
      const rows = await tx
        .select()
        .from(aiProviderConfig)
        .where(eq(aiProviderConfig.tenantId, tenantId))
        .limit(1);
      return rows[0] ?? null;
    });
  } catch {
    // Config table unreachable (pre-migration, DB blip) — fall back to env.
    return null;
  }
}

/**
 * Pick the provider for a tenant. Resolution order per SPEC §4.3:
 *   local config       → LocalProvider
 *   auto config        → AutoFailoverProvider(local, claude, LOCAL_FAILOVER_TIMEOUT_MS)
 *   else + ANTHROPIC   → ClaudeProvider
 *   else               → HeuristicProvider
 */
export async function getAIProviderForTenant(tenantId?: string): Promise<AIProvider> {
  const cfg = tenantId ? await loadAIConfig(tenantId) : null;

  if (cfg?.provider === "local" && cfg.localEndpoint) {
    return new LocalProvider({
      baseURL: cfg.localEndpoint,
      model: cfg.localModel ?? DEFAULT_LOCAL_MODEL,
    });
  }

  if (cfg?.provider === "auto" && cfg.localEndpoint) {
    return new AutoFailoverProvider(
      new LocalProvider({
        baseURL: cfg.localEndpoint,
        model: cfg.localModel ?? DEFAULT_LOCAL_MODEL,
        timeoutMs: LOCAL_FAILOVER_TIMEOUT_MS,
      }),
      process.env.ANTHROPIC_API_KEY ? new ClaudeProvider() : new HeuristicProvider(),
      { timeoutMs: LOCAL_FAILOVER_TIMEOUT_MS }
    );
  }

  if (process.env.ANTHROPIC_API_KEY) return new ClaudeProvider();

  return new HeuristicProvider();
}

export type { AIProvider, ClassifyResult, VehicleSuggestion } from "./types";
