"use client";

import { useState, useRef } from "react";
import { MODULE_REGISTRY } from "@/platform/tenant-modules";
import { inviteMember } from "@/app/(tenant)/[tenantSlug]/settings/team/actions";
import {
  saveBrandStep,
  saveModulesStep,
  connectMigration,
  completeOnboarding,
} from "./actions";

const STEPS = ["Brand", "Modules", "Migrate", "Team", "Live"] as const;

const ACCENT = "#7B61FF";

const ROLE_OPTIONS = [
  { value: "sales", label: "Sales" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "general_manager", label: "General Manager" },
  { value: "programs_department", label: "Programs Dept" },
  { value: "security", label: "Security" },
  { value: "driver", label: "Driver" },
  { value: "fleet", label: "Fleet" },
  { value: "finance", label: "Finance" },
  { value: "primary", label: "Manager" },
  { value: "tenant_admin", label: "Admin" },
];

export function OnboardingWizard({
  slug,
  companyName,
  initialBrandName,
  initialLogoUrl,
  initialModules,
}: {
  slug: string;
  companyName: string;
  initialBrandName: string;
  initialLogoUrl: string | null;
  initialModules: string[];
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — brand
  const [brandName, setBrandName] = useState(initialBrandName || companyName);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — modules
  const [modules, setModules] = useState<Set<string>>(
    new Set(initialModules.length ? initialModules : MODULE_REGISTRY.map((m) => m.id))
  );

  // Step 3 — migrate
  const [source, setSource] = useState<"bitrix24" | "kaiten" | "skip">("bitrix24");
  const [credential, setCredential] = useState("");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [migrateConnected, setMigrateConnected] = useState(false);

  // Step 4 — team
  const [emails, setEmails] = useState<string[]>([""]);
  const [role, setRole] = useState("sales");
  const [invited, setInvited] = useState<string[]>([]);

  function clearMsg() {
    setError(null);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveBrand(): Promise<boolean> {
    const fd = new FormData();
    fd.set("brandName", brandName);
    const f = logoInputRef.current?.files?.[0];
    if (f) fd.set("logo", f);
    const r = await saveBrandStep(slug, fd);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    return true;
  }

  async function saveModules(): Promise<boolean> {
    const r = await saveModulesStep(slug, Array.from(modules));
    if (!r.ok) return false;
    return true;
  }

  async function runConnect() {
    clearMsg();
    setBusy(true);
    try {
      const r = await connectMigration(slug, source as "bitrix24" | "kaiten", credential);
      if (!r.ok) {
        setError(r.error);
        setMigrateConnected(false);
        return;
      }
      setCounts(r.counts ?? {});
      setMigrateConnected(true);
    } finally {
      setBusy(false);
    }
  }

  async function sendInvites() {
    clearMsg();
    const valid = emails.map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (!valid.length) {
      setError("Add at least one valid email, or skip this step.");
      return;
    }
    setBusy(true);
    try {
      const done: string[] = [];
      for (const email of valid) {
        const fd = new FormData();
        fd.set("email", email);
        fd.append("roles", role);
        try {
          await inviteMember(slug, fd);
          done.push(email);
        } catch {
          /* skip individual failures */
        }
      }
      setInvited(done);
      if (!done.length) setError("Could not send invites — check the addresses.");
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    clearMsg();
    setBusy(true);
    try {
      if (step === 0 && !(await saveBrand())) return;
      if (step === 1 && !(await saveModules())) return;
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } finally {
      setBusy(false);
    }
  }

  function back() {
    clearMsg();
    setStep((s) => Math.max(s - 1, 0));
  }

  async function finish() {
    setBusy(true);
    try {
      await completeOnboarding(slug); // server redirects to the workspace
    } finally {
      setBusy(false);
    }
  }

  function toggleModule(id: string) {
    setModules((prev) => {
      const n = new Set(prev);
      if (id === "dashboard") return n; // always on
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors"
                  style={{
                    backgroundColor: i <= step ? ACCENT : "#e8ecf4",
                    color: i <= step ? "white" : "#94a3b8",
                  }}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className="mt-1 text-[11px] font-medium"
                  style={{ color: i <= step ? "#222" : "#94a3b8" }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="mx-1 h-0.5 flex-1"
                  style={{ backgroundColor: i < step ? ACCENT : "#e8ecf4" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-8 shadow-sm">
        {/* Step 1 — Brand */}
        {step === 0 && (
          <div>
            <h1 className="text-xl font-semibold text-[#222]">Make it yours</h1>
            <p className="mt-1 text-sm text-slate-500">
              Add your logo and name. They appear across your workspace.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-slate-400">Logo</span>
                )}
              </div>
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={onLogoChange}
                  className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#7B61FF] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#6A4DF0]"
                />
                <p className="mt-1 text-[11px] text-slate-400">PNG, JPG, SVG or WEBP · up to 300 KB</p>
              </div>
            </div>
            <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Display name
            </label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#7B61FF] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
              placeholder={companyName}
            />
          </div>
        )}

        {/* Step 2 — Modules */}
        {step === 1 && (
          <div>
            <h1 className="text-xl font-semibold text-[#222]">Choose your modules</h1>
            <p className="mt-1 text-sm text-slate-500">
              Turn on what you need now — you can change this any time in settings.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MODULE_REGISTRY.map((m) => {
                const on = modules.has(m.id);
                const locked = m.id === "dashboard";
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleModule(m.id)}
                    className="flex items-center gap-2 rounded-lg border p-3 text-left transition-colors"
                    style={{
                      borderColor: on ? ACCENT : "#e2e8f0",
                      backgroundColor: on ? "#f5f3ff" : "white",
                      opacity: locked ? 0.7 : 1,
                      cursor: locked ? "default" : "pointer",
                    }}
                  >
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white"
                      style={{ backgroundColor: on ? ACCENT : "#cbd5e1" }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="text-sm text-slate-700">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Migrate */}
        {step === 2 && (
          <div>
            <h1 className="text-xl font-semibold text-[#222]">Bring your data over</h1>
            <p className="mt-1 text-sm text-slate-500">
              Connect the system you use today. We scan it read-only so you can preview before cutover.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { id: "bitrix24", label: "Bitrix24", hint: "Paste your inbound webhook URL" },
                { id: "kaiten", label: "Kaiten", hint: "Paste your API key" },
                { id: "skip", label: "I'll set this up later", hint: "Skip for now" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSource(opt.id as typeof source);
                    setCounts(null);
                    setMigrateConnected(false);
                    clearMsg();
                  }}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors"
                  style={{
                    borderColor: source === opt.id ? ACCENT : "#e2e8f0",
                    backgroundColor: source === opt.id ? "#f5f3ff" : "white",
                  }}
                >
                  <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                  <span className="text-[11px] text-slate-400">{opt.hint}</span>
                </button>
              ))}
            </div>

            {source !== "skip" && (
              <div className="mt-4">
                <input
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder={source === "bitrix24" ? "https://your.bitrix24.eu/rest/1/xxxx/" : "Kaiten API key"}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#7B61FF] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
                <button
                  type="button"
                  onClick={runConnect}
                  disabled={busy || !credential.trim()}
                  className="mt-3 rounded-lg border border-[#7B61FF] px-4 py-2 text-sm font-semibold text-[#7B61FF] hover:bg-slate-50 disabled:opacity-50"
                >
                  {busy ? "Scanning…" : "Connect & scan"}
                </button>
              </div>
            )}

            {migrateConnected && counts && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">✓ Connected — found in {source}:</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Object.entries(counts).map(([k, v]) => (
                    <div key={k} className="rounded-md bg-white px-3 py-2 text-center">
                      <div className="text-lg font-bold text-slate-900">{v}</div>
                      <div className="text-[11px] capitalize text-slate-500">{k}</div>
                    </div>
                  ))}
                  {Object.keys(counts).length === 0 && (
                    <div className="col-span-3 text-sm text-emerald-700">Connection saved.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Team */}
        {step === 3 && (
          <div>
            <h1 className="text-xl font-semibold text-[#222]">Invite your team</h1>
            <p className="mt-1 text-sm text-slate-500">
              They&apos;ll get a sign-in link. You can manage roles later in settings.
            </p>
            <label className="mt-5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Role for these invites
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#7B61FF] focus:outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <div className="mt-4 space-y-2">
              {emails.map((em, i) => (
                <input
                  key={i}
                  value={em}
                  onChange={(e) => setEmails((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder="teammate@company.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-[#7B61FF] focus:outline-none focus:ring-1 focus:ring-[#7B61FF]"
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEmails((p) => [...p, ""])}
                className="text-sm font-medium text-[#7B61FF] hover:underline"
              >
                + Add another
              </button>
              <button
                type="button"
                onClick={sendInvites}
                disabled={busy}
                className="rounded-lg border border-[#7B61FF] px-4 py-2 text-sm font-semibold text-[#7B61FF] hover:bg-slate-50 disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send invites"}
              </button>
            </div>
            {invited.length > 0 && (
              <p className="mt-3 text-sm text-emerald-700">✓ Invited {invited.length}: {invited.join(", ")}</p>
            )}
          </div>
        )}

        {/* Step 5 — Live */}
        {step === 4 && (
          <div className="text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white"
              style={{ backgroundColor: ACCENT }}
            >
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#222]">Your workspace is ready</h1>
            <p className="mt-1 text-sm text-slate-500">{brandName} is set up and good to go.</p>
            <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
              <SummaryRow label="Branding" value={logoPreview ? "Logo + name set" : "Name set"} />
              <SummaryRow label="Modules" value={`${modules.size} enabled`} />
              <SummaryRow
                label="Migration"
                value={source === "skip" ? "Set up later" : migrateConnected ? `${source} connected` : `${source} (not connected)`}
              />
              <SummaryRow label="Team" value={invited.length ? `${invited.length} invited` : "Just you for now"} />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-0"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <div className="flex items-center gap-2">
              {(step === 2 || step === 3) && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={busy}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={busy}
                className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {busy ? "Saving…" : "Continue"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={busy}
              className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
              style={{ backgroundColor: ACCENT }}
            >
              {busy ? "Entering…" : "Enter your workspace →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
