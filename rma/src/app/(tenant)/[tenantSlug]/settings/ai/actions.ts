"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { withDrizzleTenant } from "@/platform/tenancy/rls";
import { aiProviderConfig, auditEvent } from "@/platform/db/schema";
import { requireTenantAdmin, requireAuth } from "@/platform/auth/authorization";
import { testLocalEndpoint, type HealthResult } from "@/platform/ai/health";

// SPEC §6.2 — tenant AI provider configuration + connection test.

export async function saveAIConfig(slug: string, formData: FormData): Promise<void> {
  const t = await requireTenantAdmin(slug);
  const actorId = await requireAuth();

  const provider = String(formData.get("provider") ?? "claude");
  const localEndpoint = String(formData.get("localEndpoint") ?? "").trim() || null;
  const localModel = String(formData.get("localModel") ?? "").trim() || null;

  if (!["claude", "local", "auto"].includes(provider)) {
    throw new Error("Invalid provider");
  }
  if ((provider === "local" || provider === "auto") && !localEndpoint) {
    throw new Error("Local endpoint is required for local/auto");
  }

  await withDrizzleTenant(t.id, async (tx) => {
    const [existing] = await tx
      .select()
      .from(aiProviderConfig)
      .where(eq(aiProviderConfig.tenantId, t.id))
      .limit(1);
    const values = {
      provider,
      localEndpoint,
      localModel,
      fallbackProvider: provider === "auto" ? "claude" : null,
      updatedAt: new Date(),
    };
    if (existing) {
      await tx.update(aiProviderConfig).set(values).where(eq(aiProviderConfig.id, existing.id));
    } else {
      await tx.insert(aiProviderConfig).values({ tenantId: t.id, ...values });
    }
    await tx.insert(auditEvent).values({
      tenantId: t.id,
      actorId,
      action: "ai_config_updated",
      entityType: "ai_provider_config",
      entityId: t.id,
      intent: `provider=${provider}${localEndpoint ? ` endpoint=${localEndpoint}` : ""}`,
    });
  });

  revalidatePath(`/${slug}/settings/ai`);
}

export async function testConnection(
  slug: string,
  input: { baseURL: string; model: string }
): Promise<HealthResult> {
  const t = await requireTenantAdmin(slug);
  if (!input.baseURL) {
    return { ok: false, latencyMs: 0, models: [], error: "No endpoint provided" };
  }
  const res = await testLocalEndpoint({ baseURL: input.baseURL, model: input.model || "qwen2.5:14b" });

  // Record the probe result on the config row if one exists.
  try {
    await withDrizzleTenant(t.id, async (tx) => {
      const [existing] = await tx
        .select()
        .from(aiProviderConfig)
        .where(eq(aiProviderConfig.tenantId, t.id))
        .limit(1);
      if (existing) {
        await tx
          .update(aiProviderConfig)
          .set(
            res.ok
              ? { lastHealthyAt: new Date(), updatedAt: new Date() }
              : { lastErrorAt: new Date(), lastErrorText: (res.error ?? "").slice(0, 500), updatedAt: new Date() }
          )
          .where(eq(aiProviderConfig.id, existing.id));
      }
    });
  } catch {
    // health recording is best-effort
  }

  return res;
}
