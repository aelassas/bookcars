"use client";

// LinesPanel — the /lines table: every WhatsApp observer line with live
// status, an inline-editable display name, full add/edit/retire management
// (overlay registry via the API — see modules/messaging/lines-overlay.ts),
// and a Pair modal offering BOTH a live QR and the 8-digit phone-code flow
// (the savos accounts-page equivalent). Polls /lines/api every 10s; the modal
// polls its pairing artifacts every 2.5s.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Label,
  Select,
  Table,
  TH,
  TD,
  cx,
  type BadgeTone,
} from "@/components/ui";
import { Modal, ModalFooter, ModalError } from "@/components/ui/Modal";

// Mirrors modules/lines/registry.ts shapes as returned by GET /lines/api.
type LineStatusInfo = {
  state: string | null;
  at: string | null;
  lastActivityAt: string | null;
  strikes: number;
  hasSession: boolean;
  badge:
    | "online"
    | "silent"
    | "qr_pending"
    | "pair_code_pending"
    | "reconnecting"
    | "dormant"
    | "no_session"
    | "banned"
    | "retired";
};
type LineRow = {
  slug: string;
  tenant: string;
  owner: { key: string; name: string } | null;
  phone: string | null;
  displayName: string;
  status: LineStatusInfo;
  cooldownUntil: string | null;
  managed: boolean;
};
type PairArtifacts = {
  state: string | null;
  at: string | null;
  qrSvg: string | null;
  pairCode: string | null;
};

const LIST_POLL_MS = 10_000;
const MODAL_POLL_MS = 2_500;

const BADGE_TONE: Record<LineStatusInfo["badge"], BadgeTone> = {
  online: "success",
  silent: "warning",
  qr_pending: "info",
  pair_code_pending: "info",
  reconnecting: "warning",
  dormant: "danger",
  no_session: "neutral",
  banned: "danger",
  retired: "neutral",
};
const BADGE_LABEL: Record<LineStatusInfo["badge"], string> = {
  online: "online",
  silent: "silent",
  qr_pending: "QR pending",
  pair_code_pending: "code pending",
  reconnecting: "reconnecting",
  dormant: "dormant",
  no_session: "no session",
  banned: "banned",
  retired: "retired",
};

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtPhone(digits: string | null): string {
  return digits ? `+${digits}` : "—";
}

/** Seconds until a cooldown ISO; 0 once it has passed. */
function cooldownSeconds(until: string | null): number {
  if (!until) return 0;
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 1000));
}

// ─── Inline display-name edit ────────────────────────────────────────────────

function NameCell({
  line,
  onSaved,
}: {
  line: LineRow;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(line.displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const name = draft.trim();
    if (!name || name === line.displayName) {
      setEditing(false);
      setDraft(line.displayName);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/lines/api/${encodeURIComponent(line.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        title="Click to rename"
        onClick={() => {
          setDraft(line.displayName);
          setEditing(true);
        }}
        className="rounded-field px-1.5 py-0.5 text-left font-medium text-ink transition-colors hover:bg-sunken"
      >
        {line.displayName}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <Input
        autoFocus
        value={draft}
        disabled={saving}
        maxLength={60}
        className="h-7 w-44 px-1.5 text-sm"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(line.displayName);
          }
        }}
        onBlur={save}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}

// ─── Pair modal ──────────────────────────────────────────────────────────────

type PairPhase = "idle" | "starting" | "waiting" | "linked" | "error";

function PairModal({ line, onClose }: { line: LineRow; onClose: () => void }) {
  const [tab, setTab] = useState<"qr" | "code">("qr");
  const [phone, setPhone] = useState(line.phone ?? "");
  const [phase, setPhase] = useState<PairPhase>("idle");
  const [confirmed, setConfirmed] = useState(false);
  const [artifacts, setArtifacts] = useState<PairArtifacts | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(line.cooldownUntil);
  const [, forceTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLinked = artifacts?.state === "open" || (phase === "idle" && line.status.state === "open");
  const cooling = cooldownSeconds(cooldown) > 0;

  const pollArtifacts = useCallback(async () => {
    try {
      const res = await fetch(`/lines/api/${encodeURIComponent(line.slug)}/qr`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PairArtifacts;
      setArtifacts(data);
      if (data.state === "open") setPhase((p) => (p === "waiting" || p === "starting" ? "linked" : p));
    } catch {
      /* transient fetch failure — next tick retries */
    }
  }, [line.slug]);

  // While pairing is in flight, poll the artifacts every 2.5s; stop on linked.
  useEffect(() => {
    if (phase !== "waiting" && phase !== "starting") return;
    pollArtifacts();
    pollRef.current = setInterval(pollArtifacts, MODAL_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [phase, pollArtifacts]);

  // 1s ticker so the cooldown countdown actually counts.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // First paint of the modal: read the current artifacts (shows "already
  // linked" without triggering anything).
  useEffect(() => {
    pollArtifacts();
  }, [pollArtifacts]);

  const startPairing = async () => {
    setPhase("starting");
    setError(null);
    setOutput(null);
    try {
      const res = await fetch(`/lines/api/${encodeURIComponent(line.slug)}/relink`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          tab === "code" ? { mode: "code", phone: phone.replace(/\D/g, "") } : { mode: "qr" }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.cooldownUntil) setCooldown(data.cooldownUntil);
      if (!res.ok || data?.ok === false) {
        setPhase("error");
        setError(data?.error ?? "relink failed");
        setOutput(data?.output ?? null);
        return;
      }
      setOutput(data?.output ?? null);
      setPhase("waiting");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "relink failed");
    }
  };

  const cooldownLeft = cooldownSeconds(cooldown);
  const cooldownLabel = `${Math.floor(cooldownLeft / 60)}:${String(cooldownLeft % 60).padStart(2, "0")}`;

  return (
    <Modal
      title={`Pair · ${line.displayName}`}
      subtitle={
        <>
          {fmtPhone(line.phone)} · <span className="font-mono text-xs">{line.slug}</span>
        </>
      }
      onClose={onClose}
      width="lg"
    >
      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-field bg-sunken p-1">
        {(["qr", "code"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 rounded-field px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"
            )}
          >
            {t === "qr" ? "QR code" : "Phone code"}
          </button>
        ))}
      </div>

      {error && <ModalError>{error}</ModalError>}

      {/* A live line must never be re-paired by accident — require an explicit
          confirmation before any relink is triggered. */}
      {phase === "idle" && isLinked && !confirmed ? (
        <div className="rounded-field border border-line bg-sunken/50 px-4 py-3 text-sm text-ink-2">
          This line is <span className="font-medium text-success">already linked</span>. Re-pairing
          archives the session and asks WhatsApp for a new device link — do it only when the line is
          actually dead.
          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={() => setConfirmed(true)}>
              Re-pair anyway
            </Button>
          </div>
        </div>
      ) : phase === "idle" ? (
        <div className="text-sm text-ink-2">
          {tab === "qr" ? (
            <p>
              Starts the observer and shows a live QR here. Have the phone at{" "}
              <span className="font-medium text-ink">WhatsApp → Linked Devices → Link a Device</span>{" "}
              before you start.
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-2">Phone number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9715…"
                  className="font-mono"
                  inputMode="numeric"
                />
              </div>
              <p className="rounded-field border border-warn-line bg-warn-soft px-3 py-2 text-warn">
                ONE code only — the phone must be on &quot;Link with phone number instead&quot;
                BEFORE you request it. Unused codes count against ban protection.
              </p>
            </div>
          )}
          <div className="mt-4">
            <Button onClick={startPairing} disabled={cooling}>
              {cooling ? `Cooldown — ${cooldownLabel}` : tab === "qr" ? "Start QR pairing" : "Request pairing code"}
            </Button>
          </div>
        </div>
      ) : phase === "starting" ? (
        <p className="text-sm text-ink-2">Restarting the line…</p>
      ) : phase === "linked" ? (
        <p className="rounded-field border border-success-line bg-success-soft px-4 py-3 text-sm font-medium text-success">
          ✅ linked — the observer is live again.
        </p>
      ) : (
        /* waiting | error — show whatever artifacts the observer has produced */
        <div>
          {tab === "qr" ? (
            artifacts?.qrSvg ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="rounded-card border border-line bg-white p-3 [&>svg]:h-56 [&>svg]:w-56"
                  // Server-rendered on this box from qr-<slug>.txt — no
                  // third-party QR service ever sees the pairing credential.
                  dangerouslySetInnerHTML={{ __html: artifacts.qrSvg }}
                />
                <p className="text-sm text-ink-2">
                  Scan: <span className="font-medium text-ink">WhatsApp → Linked Devices</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-2">Waiting for the QR… the observer refreshes it until the phone links.</p>
            )
          ) : artifacts?.pairCode ? (
            <div className="flex flex-col items-center gap-3">
              <div className="font-mono text-4xl font-semibold tracking-[0.2em] text-ink tnum">
                {artifacts.pairCode}
              </div>
              <p className="text-sm text-ink-2">
                Type it on the phone — valid a few minutes, one code per restart.
              </p>
            </div>
          ) : (
            <p className="text-sm text-ink-2">Waiting for the pairing code…</p>
          )}
        </div>
      )}

      {output && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-field border border-line bg-sunken/60 p-3 text-[11px] leading-relaxed text-ink-2">
          {output}
        </pre>
      )}

      <ModalFooter>
        {phase === "error" && (
          <Button variant="secondary" onClick={() => setPhase("idle")} disabled={cooling}>
            Try again
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ─── Add / Edit / Retire modals ──────────────────────────────────────────────

/** Same derivation the API uses when owner key is left blank. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function AddLineModal({
  tenants,
  onClose,
  onSaved,
}: {
  tenants: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [tenant, setTenant] = useState(tenants[0] ?? "");
  const [ownerName, setOwnerName] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [ownerKeyTouched, setOwnerKeyTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/lines/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          tenant,
          phone: phone.trim() || undefined,
          ownerName: ownerName.trim(),
          ownerKey: ownerKey.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "add failed");
    } finally {
      setBusy(false);
    }
  };

  const valid =
    /^[a-z0-9][a-z0-9-]{1,39}$/.test(slug.trim()) &&
    tenant.length > 0 &&
    ownerName.trim().length > 0 &&
    (!phone.trim() || /^\+?[0-9][0-9 ]{8,14}$/.test(phone.trim()));

  return (
    <Modal title="Add WhatsApp line" subtitle="Born unpaired — pair it from this page when the handset is ready." onClose={onClose} width="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) submit();
        }}
        className="space-y-3"
      >
        {error && <ModalError>{error}</ModalError>}
        <div>
          <Label htmlFor="add-name">Display name</Label>
          <Input
            id="add-name"
            value={name}
            maxLength={60}
            placeholder="Askhab (EasyRent)"
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
              if (!ownerKeyTouched) setOwnerKey(slugify(e.target.value));
              if (!ownerName) setOwnerName(e.target.value);
            }}
          />
        </div>
        <div>
          <Label htmlFor="add-slug">Slug (observer session name — immutable)</Label>
          <Input
            id="add-slug"
            value={slug}
            placeholder="askhab-easyrent"
            className="font-mono"
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
          />
          <p className="mt-1 text-[11px] text-ink-3">
            The observer pairs as <span className="font-mono">wa-{slug || "…"}</span>. Lowercase letters, digits, dashes.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="add-phone">Number (digits, optional)</Label>
            <Input
              id="add-phone"
              value={phone}
              placeholder="9715…"
              className="font-mono"
              inputMode="numeric"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="add-tenant">Tenant / brand</Label>
            <Select id="add-tenant" value={tenant} onChange={(e) => setTenant(e.target.value)} className="w-full">
              {tenants.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="add-owner">Owner name</Label>
            <Input
              id="add-owner"
              value={ownerName}
              maxLength={60}
              placeholder="Askhab (EasyRent)"
              onChange={(e) => {
                setOwnerName(e.target.value);
                if (!ownerKeyTouched) setOwnerKey(slugify(e.target.value));
              }}
            />
          </div>
          <div>
            <Label htmlFor="add-ownerkey">Owner key</Label>
            <Input
              id="add-ownerkey"
              value={ownerKey}
              className="font-mono"
              placeholder="askhab"
              onChange={(e) => {
                setOwnerKeyTouched(true);
                setOwnerKey(e.target.value.toLowerCase());
              }}
            />
          </div>
        </div>
        <p className="rounded-field border border-line bg-sunken/50 px-3 py-2 text-[11px] text-ink-2">
          The line is mapped to its tenant and owner the moment it is added — an unmapped line would
          file its chats on the wrong desk. History is never deleted; removing a line later only
          retires its session.
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || busy}>
            {busy ? "Adding…" : "Add line"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function EditLineModal({
  line,
  onClose,
  onSaved,
}: {
  line: LineRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(line.displayName);
  const [phone, setPhone] = useState(line.phone ?? "");
  const [ownerName, setOwnerName] = useState(line.owner?.name ?? "");
  const [ownerKey, setOwnerKey] = useState(line.owner?.key ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/lines/api/${encodeURIComponent(line.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.replace(/\D/g, "") || null,
          ownerName: ownerName.trim(),
          ownerKey: ownerKey.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(false);
    }
  };

  const valid =
    name.trim().length > 0 &&
    ownerName.trim().length > 0 &&
    /^[a-z0-9][a-z0-9-]{0,39}$/.test(ownerKey.trim()) &&
    (!phone.trim() || /^\+?[0-9][0-9 ]{8,14}$/.test(phone.trim()));

  return (
    <Modal
      title={`Edit · ${line.displayName}`}
      subtitle={
        <>
          <span className="font-mono text-xs">{line.slug}</span> · tenant{" "}
          <span className="font-medium text-ink">{line.tenant}</span> (tenants are immutable — re-tenanting
          re-files the line&apos;s whole history)
        </>
      }
      onClose={onClose}
      width="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !busy) submit();
        }}
        className="space-y-3"
      >
        {error && <ModalError>{error}</ModalError>}
        <div>
          <Label htmlFor="edit-name">Display name</Label>
          <Input id="edit-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-phone">Documented number (digits; empty clears)</Label>
          <Input
            id="edit-phone"
            value={phone}
            className="font-mono"
            inputMode="numeric"
            placeholder="9715…"
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-ink-3">
            While the line is paired, the session&apos;s own number wins — this is the fallback for an
            archived or never-paired session.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit-owner">Owner name</Label>
            <Input id="edit-owner" value={ownerName} maxLength={60} onChange={(e) => setOwnerName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-ownerkey">Owner key</Label>
            <Input
              id="edit-ownerkey"
              value={ownerKey}
              className="font-mono"
              onChange={(e) => setOwnerKey(e.target.value.toLowerCase())}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function RetireLineModal({
  line,
  onClose,
  onSaved,
}: {
  line: LineRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/lines/api/${encodeURIComponent(line.slug)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmSlug: line.slug }),
      });
      const data = await res.json().catch(() => ({}));
      // 207 = retired, but the session-archive script reported a problem.
      if (!res.ok && res.status !== 207) throw new Error(data?.error ?? `HTTP ${res.status}`);
      if (data?.output) setOutput(data.output);
      setDone(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "retire failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Remove · ${line.displayName}`}
      subtitle={<span className="font-mono text-xs">{line.slug}</span>}
      onClose={onClose}
      width="md"
    >
      {error && <ModalError>{error}</ModalError>}
      {done ? (
        <div className="space-y-3">
          <p className="rounded-field border border-success-line bg-success-soft px-4 py-3 text-sm font-medium text-success">
            Line retired. Its history stays exactly where it was.
          </p>
          {output && (
            <pre className="max-h-40 overflow-auto rounded-field border border-line bg-sunken/60 p-3 text-[11px] leading-relaxed text-ink-2">
              {output}
            </pre>
          )}
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-field border border-warn-line bg-warn-soft px-3 py-2 text-sm text-warn">
            This stops the observer and archives the WhatsApp session. The line disappears from this
            table and can never be re-paired from here.
          </div>
          <p className="text-sm text-ink-2">
            Nothing is deleted: every message stays in the CRM, and the line keeps its tenant/owner
            mapping so its history stays filed under <span className="font-medium text-ink">{line.tenant}</span>.
          </p>
          <div>
            <Label htmlFor="retire-confirm">
              Type <span className="font-mono text-ink">{line.slug}</span> to confirm
            </Label>
            <Input
              id="retire-confirm"
              value={confirm}
              className="font-mono"
              autoFocus
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submit} disabled={confirm !== line.slug || busy}>
              {busy ? "Retiring…" : "Retire line"}
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}

// ─── The table ───────────────────────────────────────────────────────────────

export default function LinesPanel() {
  const [lines, setLines] = useState<LineRow[] | null>(null);
  const [tenants, setTenants] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pairSlug, setPairSlug] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [retireSlug, setRetireSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/lines/api", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLines(data.lines ?? []);
      setTenants(data.tenants ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const pairLine = lines?.find((l) => l.slug === pairSlug) ?? null;
  const editLine = lines?.find((l) => l.slug === editSlug) ?? null;
  const retireLine = lines?.find((l) => l.slug === retireSlug) ?? null;

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-ink-3">
          New lines are mapped to a tenant + owner the moment they are added — never pair a line that
          isn&apos;t in this table.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          + Add line
        </Button>
      </div>
      <Card>
        <CardHeader title="Observer lines" count={lines?.length ?? "…"} />
        <Table>
          <thead>
            <tr>
              <TH>Name</TH>
              <TH>Number</TH>
              <TH>Slug</TH>
              <TH>Tenant</TH>
              <TH>Owner</TH>
              <TH>Status</TH>
              <TH>Last activity</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </thead>
          <tbody>
            {lines === null && (
              <tr>
                <TD colSpan={8} className="text-ink-3">
                  {error ? `Failed to load: ${error}` : "Loading…"}
                </TD>
              </tr>
            )}
            {lines?.map((line) => (
              <tr key={line.slug}>
                <TD>
                  <NameCell line={line} onSaved={load} />
                  {line.managed && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-ink-3">added here</span>
                  )}
                </TD>
                {/* The live session's number wins while paired; the documented
                    number (editable) is the fallback. */}
                <TD className="font-mono text-xs tnum">{fmtPhone(line.phone)}</TD>
                <TD className="font-mono text-xs text-ink-3">{line.slug}</TD>
                <TD>{line.tenant}</TD>
                <TD>{line.owner?.name ?? "—"}</TD>
                <TD>
                  <Badge tone={BADGE_TONE[line.status.badge]}>{BADGE_LABEL[line.status.badge]}</Badge>
                  {line.status.strikes > 0 && (
                    <span className="ml-1.5 text-[11px] text-warn tnum" title="ban-protection strikes">
                      {line.status.strikes} strike{line.status.strikes > 1 ? "s" : ""}
                    </span>
                  )}
                </TD>
                <TD className="tnum">{relTime(line.status.lastActivityAt)}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPairSlug(line.slug)}
                      // Banned stays banned; a retired slug's handset pairs under
                      // another line — re-pairing it would duplicate a session.
                      disabled={line.status.badge === "banned" || line.status.badge === "retired"}
                    >
                      Pair
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditSlug(line.slug)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger-soft"
                      onClick={() => setRetireSlug(line.slug)}
                    >
                      Remove
                    </Button>
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {pairLine && <PairModal line={pairLine} onClose={() => setPairSlug(null)} />}
      {addOpen && <AddLineModal tenants={tenants} onClose={() => setAddOpen(false)} onSaved={load} />}
      {editLine && <EditLineModal line={editLine} onClose={() => setEditSlug(null)} onSaved={load} />}
      {retireLine && (
        <RetireLineModal line={retireLine} onClose={() => setRetireSlug(null)} onSaved={load} />
      )}
    </>
  );
}
