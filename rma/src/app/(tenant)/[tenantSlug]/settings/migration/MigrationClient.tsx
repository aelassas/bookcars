"use client";

import { PLATFORM_NAME } from "@/platform/brand";
import { useState, useEffect, useRef } from "react";
import {
  testBitrixConnection,
  saveBitrixConnection,
  fetchBitrixPipelines,
  savePipelineMapping,
  runDiscoveryCounts,
  runBitrixDryRun,
  getDryRunProgress,
  runBitrixDemoImport,
} from "./actions";
import { Badge, Button, Card, Input, Select, cx } from "@/components/ui";

interface Props {
  tenantId: string;
  tenantSlug: string;
  initialConnected: boolean;
  initialMaskedUrl: string;
  initialMapping: Record<string, string>;
}

const PIPELINE_OPTIONS = [
  { value: "rent", label: "rent" },
  { value: "lease", label: "lease" },
  { value: "maintenance", label: "maintenance" },
  { value: "campaign", label: "campaign" },
];

export default function MigrationClient({
  tenantId,
  initialConnected,
  initialMaskedUrl,
  initialMapping,
}: Props) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [connected, setConnected] = useState(initialConnected);
  const [maskedUrl, setMaskedUrl] = useState(initialMaskedUrl);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");
  const [testSuccess, setTestSuccess] = useState("");

  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [mappingSaved, setMappingSaved] = useState(false);

  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryCounts, setDiscoveryCounts] = useState<Record<string, number> | null>(null);
  const [customFields, setCustomFields] = useState<string[]>([]);

  const [, setDryRunId] = useState<string | null>(null);
  const [dryRunRunning, setDryRunRunning] = useState(false);
  const [dryRunProgress, setDryRunProgress] = useState<{
    totals: Record<string, number>;
    counts: Record<string, number>;
    startedAt: Date | null;
  } | null>(null);
  const [dryRunDone, setDryRunDone] = useState(false);

  const [demoImportRunning, setDemoImportRunning] = useState(false);
  const [demoImportResult, setDemoImportResult] = useState<string | null>(null);

  // Poll timer for the dry run — held in a ref so it is always cleared, both
  // on completion and on unmount (previously leaked: the interval was only
  // ever cleared inside its own callback, so navigating away left it running).
  const dryRunTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (dryRunTimer.current) clearInterval(dryRunTimer.current);
    };
  }, []);

  // ─── Card 1: Connect ───────────────────────────────────────────────────────

  async function handleTest() {
    setTesting(true);
    setTestError("");
    setTestSuccess("");
    try {
      const info = await testBitrixConnection(tenantId, webhookUrl);
      setTestSuccess(`Connected to ${info.portalName} (${info.adminCount} admins)`);
      await saveBitrixConnection(tenantId, webhookUrl);
      setConnected(true);
      setMaskedUrl("…" + webhookUrl.slice(-4));
      setWebhookUrl("");
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setTesting(false);
    }
  }

  // ─── Card 2: Pipelines ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!connected || pipelines.length > 0) return;
    // setPipelines runs after the await resolves (never synchronously in the
    // effect body), so it cannot cascade renders.
    fetchBitrixPipelines(tenantId)
      .then((pls) => setPipelines(pls))
      .catch(() => {
        // ignore
      });
  }, [connected, pipelines.length, tenantId]);

  async function handleSaveMapping() {
    await savePipelineMapping(tenantId, mapping);
    setMappingSaved(true);
    setTimeout(() => setMappingSaved(false), 2000);
  }

  // ─── Card 3: Discovery ─────────────────────────────────────────────────────

  async function handleDiscovery() {
    setDiscoveryRunning(true);
    try {
      const data = await runDiscoveryCounts(tenantId);
      setDiscoveryCounts(data.counts ?? {});
      setCustomFields(data.customFields ?? []);
    } finally {
      setDiscoveryRunning(false);
    }
  }

  // ─── Card 4: Dry run ───────────────────────────────────────────────────────

  async function handleDryRun() {
    setDryRunRunning(true);
    setDryRunDone(false);
    try {
      const { runId, totals } = await runBitrixDryRun(tenantId);
      setDryRunId(runId);
      setDryRunProgress({ totals, counts: {}, startedAt: new Date() });
      // Poll progress. `counts` is now keyed by the same plural entity names
      // as `totals` (see bitrix-discovery.ts), so we compare key-for-key — the
      // old `k.replace(/s$/,"")` mis-mapped "activities"/"companies" and the
      // run never registered as complete.
      if (dryRunTimer.current) clearInterval(dryRunTimer.current);
      dryRunTimer.current = setInterval(async () => {
        try {
          const progress = await getDryRunProgress(tenantId, runId);
          setDryRunProgress({
            totals: progress.totals,
            counts: progress.counts,
            startedAt: progress.startedAt,
          });
          const allDone = Object.entries(progress.totals).every(
            ([k, total]) => (progress.counts[k] ?? 0) >= total
          );
          if (allDone) {
            if (dryRunTimer.current) clearInterval(dryRunTimer.current);
            dryRunTimer.current = null;
            setDryRunRunning(false);
            setDryRunDone(true);
          }
        } catch (e) {
          // Stop polling on error rather than spinning forever.
          if (dryRunTimer.current) clearInterval(dryRunTimer.current);
          dryRunTimer.current = null;
          setDryRunRunning(false);
          alert(e instanceof Error ? e.message : "Dry run progress check failed");
        }
      }, 3000);
    } catch (e) {
      setDryRunRunning(false);
      alert(e instanceof Error ? e.message : "Dry run failed");
    }
  }

  // ─── Card 4b: Demo import ──────────────────────────────────────────────────

  async function handleDemoImport() {
    setDemoImportRunning(true);
    setDemoImportResult(null);
    try {
      const result = await runBitrixDemoImport(tenantId);
      setDemoImportResult(
        `Imported ${result.contactsSynced} contacts, ${result.leadsSynced} leads, ${result.dealsSynced} deals, ${result.companiesSynced} companies.`
      );
    } catch (e) {
      setDemoImportResult(e instanceof Error ? e.message : "Import failed");
    } finally {
      setDemoImportRunning(false);
    }
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const discoveryComplete = discoveryCounts !== null;
  const mappingComplete = Object.keys(mapping).length > 0;

  return (
    <div className="space-y-6">
      {/* CARD 1 — Connect */}
      <Card className="p-6">
        <h2 className="mb-1 text-base font-semibold text-ink">1. Connect Bitrix24</h2>
        <p className="mb-4 text-sm text-ink-2">Paste your incoming webhook URL.</p>

        {connected && maskedUrl ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            Connected ({maskedUrl})
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="password"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://takeauto-bx24.com/rest/USER_ID/TOKEN/"
              className="w-full"
            />
            <Button
              type="button"
              onClick={handleTest}
              disabled={testing || !webhookUrl.includes("/rest/")}
            >
              {testing ? "Testing…" : "Test connection"}
            </Button>
            {testSuccess && <p className="text-sm text-success">{testSuccess}</p>}
            {testError && <p className="text-sm text-danger">{testError}</p>}
          </div>
        )}
      </Card>

      {/* CARD 2 — Pipelines */}
      <Card className={cx("p-6", !connected && "pointer-events-none opacity-50")}>
        <h2 className="mb-1 text-base font-semibold text-ink">2. Map your pipelines</h2>
        <p className="mb-4 text-sm text-ink-2">Match Bitrix pipelines to {PLATFORM_NAME} deal types.</p>

        <div className="space-y-3">
          {pipelines.length === 0 && (
            <p className="text-sm text-ink-3">Load pipelines after connecting.</p>
          )}
          {pipelines.map((p) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="flex-1 truncate text-sm text-ink-2">{p.name}</span>
              <Select
                value={mapping[p.id] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [p.id]: e.target.value }))}
              >
                <option value="">— select —</option>
                {PIPELINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          {pipelines.length > 0 && (
            <Button type="button" onClick={handleSaveMapping}>
              {mappingSaved ? "Saved ✓" : "Save mapping"}
            </Button>
          )}
        </div>
      </Card>

      {/* CARD 3 — Discovery */}
      <Card className={cx("p-6", !connected && "pointer-events-none opacity-50")}>
        <h2 className="mb-1 text-base font-semibold text-ink">3. Run discovery</h2>
        <p className="mb-4 text-sm text-ink-2">Quick count-only probe of every list endpoint.</p>

        {!discoveryComplete ? (
          <Button type="button" onClick={handleDiscovery} disabled={discoveryRunning}>
            {discoveryRunning ? "Probing…" : "Run discovery"}
          </Button>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(discoveryCounts).map(([key, count]) => (
                  <tr key={key} className="border-b border-line-soft last:border-0">
                    <td className="py-2 pr-4 font-medium capitalize text-ink-2">{key}</td>
                    <td className="py-2 text-right text-ink tnum">{count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customFields.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Custom fields detected
                </p>
                <div className="flex flex-wrap gap-1">
                  {customFields.map((f) => (
                    <Badge key={f} tone="neutral">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* CARD 4 — Dry run */}
      <Card
        className={cx(
          "p-6",
          (!discoveryComplete || !mappingComplete) && "pointer-events-none opacity-50"
        )}
      >
        <h2 className="mb-1 text-base font-semibold text-ink">4. Dry run import</h2>
        <p className="mb-4 text-sm text-ink-2">Import all records into integration_event (no live tables yet).</p>

        {!dryRunRunning && !dryRunDone && (
          <Button type="button" onClick={handleDryRun}>
            Start dry run
          </Button>
        )}

        {dryRunProgress && (
          <div className="space-y-3">
            {Object.entries(dryRunProgress.totals).map(([key, total]) => {
              const current = dryRunProgress.counts[key] ?? 0;
              const pct = total > 0 ? Math.round((current / total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-xs text-ink-2">
                    <span className="capitalize">{key}</span>
                    <span className="tnum">
                      {current.toLocaleString()} / {total.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-sunken">
                    <div
                      className="h-2 rounded-full bg-brand-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dryRunDone && (
          <div className="mt-4 rounded-field border border-success-line bg-success-soft p-3 text-sm text-success">
            Dry run complete. Review the report above before confirming cutover.
          </div>
        )}
      </Card>

      {/* CARD 4b — Demo import */}
      <Card className="p-6">
        <h2 className="mb-1 text-base font-semibold text-ink">Import demo subset</h2>
        <p className="mb-4 text-sm text-ink-2">Pull recent real data from Bitrix into live tables (500 records max per entity).</p>

        {!demoImportResult ? (
          <Button type="button" onClick={handleDemoImport} disabled={demoImportRunning}>
            {demoImportRunning ? "Importing…" : "Import demo data"}
          </Button>
        ) : (
          <div className="rounded-field border border-success-line bg-success-soft p-3 text-sm text-success">
            {demoImportResult}
          </div>
        )}
      </Card>

      {/* CARD 5 — Cutover */}
      <Card className="p-6 opacity-60">
        <h2 className="mb-1 text-base font-semibold text-ink">5. Live cutover</h2>
        <p className="mb-4 text-sm text-ink-2">
          After dry run, the founder reviews the report with you, then triggers cutover during your off-hours window.
        </p>
        <Button type="button" disabled variant="secondary">
          Confirm and project to live tables
        </Button>
      </Card>
    </div>
  );
}
