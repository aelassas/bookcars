"use client";

import { useState } from "react";
import { saveAIConfig, testConnection } from "./actions";
import type { HealthResult } from "@/platform/ai/health";
import { Button, Card, Input, Label, cx } from "@/components/ui";

interface Props {
  slug: string;
  initial: {
    provider: string;
    localEndpoint: string;
    localModel: string;
    lastHealthyAt: string | null;
    lastErrorAt: string | null;
    lastErrorText: string | null;
  };
}

export default function AiSettingsForm({ slug, initial }: Props) {
  const [provider, setProvider] = useState(initial.provider || "claude");
  const [endpoint, setEndpoint] = useState(initial.localEndpoint || "");
  const [model, setModel] = useState(initial.localModel || "qwen2.5:14b");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);

  const needsLocal = provider === "local" || provider === "auto";

  async function onTest() {
    setTesting(true);
    setResult(null);
    try {
      const r = await testConnection(slug, { baseURL: endpoint, model });
      setResult(r);
    } catch (e) {
      setResult({ ok: false, latencyMs: 0, models: [], error: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <form action={saveAIConfig.bind(null, slug)} className="space-y-5 p-5">
          <div className="space-y-2">
            <Label>Provider</Label>
            {[
              { v: "claude", label: "Claude (cloud)", desc: "Anthropic API. Simplest, always available." },
              { v: "deepseek", label: "DeepSeek (cloud)", desc: "DeepSeek API. Low-cost classifier; needs DEEPSEEK_API_KEY on the server." },
              { v: "local", label: "Local (on-prem)", desc: "Your Mac Studio over Tailscale. Data never leaves your office." },
              { v: "auto", label: "Auto (local-first)", desc: "Try local first, fall back to Claude if offline." },
            ].map((opt) => (
              <label
                key={opt.v}
                className={cx(
                  "flex cursor-pointer items-start gap-3 rounded-field border p-3 transition-colors",
                  provider === opt.v
                    ? "border-brand-300 bg-brand-50"
                    : "border-line hover:bg-sunken"
                )}
              >
                <input
                  type="radio"
                  name="provider"
                  value={opt.v}
                  checked={provider === opt.v}
                  onChange={() => setProvider(opt.v)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-ink-2">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>

          {needsLocal && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ai-endpoint">Endpoint URL</Label>
                <Input
                  id="ai-endpoint"
                  name="localEndpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://100.x.x.x:1234/v1"
                  className="w-full font-mono"
                />
              </div>
              <div>
                <Label htmlFor="ai-model">Model</Label>
                <Input
                  id="ai-model"
                  name="localModel"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="qwen2.5:14b"
                  className="w-full font-mono"
                />
              </div>
            </div>
          )}
          {!needsLocal && <input type="hidden" name="localEndpoint" value="" />}

          <div className="flex items-center gap-3">
            <Button type="submit">Save</Button>
            {needsLocal && (
              <Button
                type="button"
                variant="secondary"
                onClick={onTest}
                disabled={testing || !endpoint}
              >
                {testing ? "Testing…" : "Test connection"}
              </Button>
            )}
          </div>

          {result && (
            <div
              className={cx(
                "rounded-field border p-3 text-sm",
                result.ok
                  ? "border-success-line bg-success-soft text-success"
                  : "border-danger-line bg-danger-soft text-danger"
              )}
            >
              {result.ok ? (
                <>
                  <div className="font-semibold">✓ Connected ({result.latencyMs}ms)</div>
                  <div className="mt-1 text-xs">
                    Models: {result.models.join(", ") || "(none reported)"}
                  </div>
                  {result.sample && <div className="mt-1 text-xs">Sample reply: “{result.sample}”</div>}
                </>
              ) : (
                <>
                  <div className="font-semibold">✗ Failed ({result.latencyMs}ms)</div>
                  <div className="mt-1 font-mono text-xs">{result.error}</div>
                </>
              )}
            </div>
          )}

          {(initial.lastHealthyAt || initial.lastErrorAt) && (
            <p className="text-xs text-ink-3">
              {initial.lastHealthyAt && <>Last healthy: {initial.lastHealthyAt}. </>}
              {initial.lastErrorAt && <>Last error: {initial.lastErrorAt} — {initial.lastErrorText}.</>}
            </p>
          )}
        </form>
      </Card>

      <div className="rounded-card border border-line bg-sunken p-6 text-sm text-ink-2">
        <h3 className="mb-3 font-semibold text-ink">Set up your on-prem model (LM Studio + Tailscale)</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            On the Mac Studio, install <span className="font-mono">LM Studio</span>, download an MLX
            model (e.g. <span className="font-mono">Qwen2.5 14B Instruct</span>), and start the local
            server (Developer → Start Server). It serves an OpenAI-compatible API on{" "}
            <span className="font-mono">http://localhost:1234/v1</span>.
          </li>
          <li>
            Install Tailscale on the Mac Studio and on the server:{" "}
            <span className="font-mono">brew install tailscale &amp;&amp; sudo tailscale up</span>.
          </li>
          <li>
            Find the Mac Studio&apos;s Tailscale IP: <span className="font-mono">tailscale ip -4</span>{" "}
            (looks like <span className="font-mono">100.x.x.x</span>).
          </li>
          <li>
            In LM Studio, enable &ldquo;Serve on local network&rdquo; so it binds beyond localhost.
          </li>
          <li>
            Set the endpoint above to{" "}
            <span className="font-mono">http://100.x.x.x:1234/v1</span>, the model to your loaded
            model id, then click <strong>Test connection</strong>.
          </li>
        </ol>
      </div>
    </div>
  );
}
