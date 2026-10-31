/**
 * registry.ts — roster of WhatsApp observer lines for the /lines page.
 *
 * The roster is one row per mapped line: the static LINE_TENANT keys
 * (src/modules/messaging/lines.ts) plus the page-managed overlay registry
 * (src/modules/messaging/lines-overlay.ts — wa-observer/lines-registry.json,
 * written by the page's add/edit/retire actions), enriched with:
 *   owner       — BRAND_OWNERS / overlay owners (src/modules/board/owners.ts)
 *   phone       — digits from the LIVE session (session-<slug>/creds.json),
 *                 the constant of the page; fallback is the documented number
 *                 (LINE_PHONES reverse lookup, then the overlay entry)
 *   displayName — wa_line_name DB override, else the owner's name
 *   status      — derived from the observer's own files (see getLineStatus)
 *
 * The observer dir defaults to the production layout; tests pass a fixture dir.
 * Everything that reads files takes an optional dir/now so the derivation is
 * unit-testable without touching the real observer.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { db } from "@/platform/db/client";
import { tenant, waLineName } from "@/platform/db/schema";
import { LINE_TENANT, tenantSlugForLine } from "@/modules/messaging/lines";
import {
  LINE_SLUG_RE,
  OWNER_KEY_RE,
  overlayOwners,
  overlayRetiredSlugs,
  overlayTenants,
  readLinesOverlay,
  validateOverlayLine,
  writeLinesOverlay,
  type LinesOverlay,
  type OverlayLine,
} from "@/modules/messaging/lines-overlay";
import { BRAND_OWNERS, LINE_PHONES, type BrandOwner } from "@/modules/board/owners";

/** Observer checkout on the production box; overridable per env and per call. */
export const DEFAULT_OBSERVER_DIR = "/Users/takeauto/take-auto/wa-observer";

export function observerDir(): string {
  return process.env.WA_OBSERVER_DIR ?? DEFAULT_OBSERVER_DIR;
}

/** A line whose number WhatsApp has banned stays dark however often it is
 *  re-paired (mohammed-takeauto, banned 2026-08 — see lines.ts). Shown as
 *  "banned" so nobody burns a pairing attempt on it. */
const BANNED_LINES = new Set(["mohammed-takeauto"]);

/** A RETIRED slug keeps its historic rows but must never be re-paired — its
 *  handset already pairs under another slug (babek-rent-4's phone is live as
 *  babek-rent-2 since 2026-08-29 — see lines.ts). Pairing it would resurrect a
 *  duplicate session on the same number, the exact 15-duplicates failure mode. */
const RETIRED_LINES = new Set(["babek-rent-4"]);

/** Open but silent for longer than this = "silent" (the deaf-line failure
 *  mode from AGENTS.md — process online, socket delivering nothing). */
export const SILENCE_THRESHOLD_MS = 6 * 60 * 60 * 1000;

/** Per-line relink cooldown — echoes the 5-min --restart-delay ban rule the
 *  relink script enforces; the API re-checks before spawning it. */
export const RELINK_COOLDOWN_MS = 5 * 60 * 1000;

export type LineBadge =
  | "online"
  | "silent"
  | "qr_pending"
  | "pair_code_pending"
  | "reconnecting"
  | "dormant"
  | "no_session"
  | "banned"
  | "retired";

export type LineStatus = {
  /** Raw state from status-<slug>.json (qr | open | close | dormant), null when
   *  the observer predates status files. */
  state: string | null;
  at: string | null;
  /** mtime of observed-<slug>.jsonl — the last moment the line saw traffic. */
  lastActivityAt: string | null;
  /** 2-strike ban-protection counter (connect-fails-<slug>.json). */
  strikes: number;
  hasSession: boolean;
  badge: LineBadge;
};

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function mtimeIso(file: string): string | null {
  try {
    return statSync(file).mtime.toISOString();
  } catch {
    return null;
  }
}

/** Live line health, derived from the observer's own files only. */
export function getLineStatus(slug: string, dir = observerDir(), now = Date.now()): LineStatus {
  const sessionDir = path.join(dir, `session-${slug}`);
  const hasSession = existsSync(sessionDir);
  const status = readJson(path.join(dir, `status-${slug}.json`));
  const state = typeof status?.state === "string" ? status.state : null;
  const at = typeof status?.at === "string" ? status.at : null;
  const lastActivityAt = mtimeIso(path.join(dir, `observed-${slug}.jsonl`));
  const strikes = Number(readJson(path.join(dir, `connect-fails-${slug}.json`))?.count ?? 0) || 0;
  const pairCodePending = existsSync(path.join(dir, `pair-code-${slug}.txt`));
  const qrPending = existsSync(path.join(dir, `qr-${slug}.txt`));

  const silentFor = lastActivityAt ? now - new Date(lastActivityAt).getTime() : Infinity;
  const recentlyActive = silentFor <= SILENCE_THRESHOLD_MS;

  let badge: LineBadge;
  if (BANNED_LINES.has(slug)) badge = "banned";
  else if (RETIRED_LINES.has(slug)) badge = "retired";
  else if (state === "dormant") badge = "dormant";
  else if (state === "open") badge = recentlyActive ? "online" : "silent";
  // Pending pairings are checked before no_session: relink archives the old
  // session dir, so a line mid-pairing can legitimately have none.
  else if (pairCodePending) badge = "pair_code_pending";
  else if (qrPending || state === "qr") badge = "qr_pending";
  else if (state === "close") badge = "reconnecting";
  else if (!hasSession) badge = "no_session";
  else if (strikes >= 2) badge = "dormant"; // 2-strike lockout, pre-status-file observer
  else badge = recentlyActive ? "online" : "silent";

  return { state, at, lastActivityAt, strikes, hasSession, badge };
}

/** The line's own number, digits only, from the live session credentials —
 *  Baileys stores it as me.id = "9715…:4@s.whatsapp.net". */
export function phoneFromCreds(slug: string, dir = observerDir()): string | null {
  const creds = readJson(path.join(dir, `session-${slug}`, "creds.json"));
  const id = (creds as { me?: { id?: unknown } } | null)?.me?.id;
  if (typeof id !== "string") return null;
  return id.split("@")[0].split(":")[0].replace(/\D/g, "") || null;
}

/** Reverse of LINE_PHONES + the overlay's documented numbers: the number for
 *  a slug whose session is currently archived (mid-relink, retired, or never
 *  paired — a page-added line's number lives only in the overlay). */
export function phoneFromRegistry(slug: string, overlay: LinesOverlay = readLinesOverlay()): string | null {
  for (const [phone, s] of Object.entries(LINE_PHONES)) {
    if (s === slug) return phone;
  }
  return overlay.lines[slug]?.phone ?? null;
}

// ─── Validation helpers (shared by the API routes and the tests) ─────────────

/** Only a mapped slug may ever be relinked — an unmapped line re-files its
 *  whole archive into the default tenant (importer dedupes on tenant+ext id).
 *  Mapped = static LINE_TENANT key OR an overlay entry carrying a tenant. */
export function isKnownLine(slug: string, overlay: LinesOverlay = readLinesOverlay()): boolean {
  return Object.hasOwn(LINE_TENANT, slug) || Boolean(overlay.lines[slug]?.tenant);
}

/** Banned/retired lines may be VIEWED but never relinked: a banned number
 *  stays banned, and a retired slug's handset already pairs elsewhere —
 *  re-pairing it resurrects a duplicate session on the same number. Retirement
 *  from the /lines page (overlay `retired` flag) blocks relinking just the
 *  same — that is the point of retiring. */
export function isRelinkableLine(slug: string, overlay: LinesOverlay = readLinesOverlay()): boolean {
  return (
    isKnownLine(slug, overlay) &&
    !BANNED_LINES.has(slug) &&
    !RETIRED_LINES.has(slug) &&
    !overlay.lines[slug]?.retired
  );
}

export const PAIR_PHONE_RE = /^[0-9]{10,15}$/;

export function isValidLineName(name: string): boolean {
  const t = name.trim();
  return t.length >= 1 && t.length <= 60;
}

// ─── Display names (wa_line_name table) ─────────────────────────────────────

async function readNameOverrides(): Promise<Record<string, string>> {
  const rows = await db
    .select({ slug: waLineName.slug, displayName: waLineName.displayName })
    .from(waLineName);
  return Object.fromEntries(rows.map((r) => [r.slug, r.displayName]));
}

/** Tenant slugs that actually exist in THIS deployment. The static LINE_TENANT
 *  map is shared heritage across every deployment of the platform (TAKE Auto,
 *  EasyRent, Cardiwan, RMA…); the roster must only show lines whose tenant is
 *  real here, or one client's box renders every other client's lines. */
async function readTenantSlugs(): Promise<Set<string>> {
  const rows = await db.select({ slug: tenant.slug }).from(tenant);
  return new Set(rows.map((r) => r.slug));
}

/** Upsert the display-name override for a line (slug must be allowlisted by
 *  the caller). */
export async function setLineDisplayName(slug: string, name: string): Promise<void> {
  const displayName = name.trim();
  await db
    .insert(waLineName)
    .values({ slug, displayName, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: waLineName.slug,
      set: { displayName, updatedAt: new Date() },
    });
}

/** Fresh tenant slug for a known line (static ∪ overlay) — for audit writes
 *  on lines added since this process started. */
export function tenantForLine(slug: string): string {
  return tenantSlugForLine(slug);
}

// ─── Page-managed add / edit / retire (overlay registry) ────────────────────

export function isValidLineSlug(slug: string): boolean {
  return LINE_SLUG_RE.test(slug);
}

export function isValidOwnerKey(key: string): boolean {
  return OWNER_KEY_RE.test(key);
}

/** The slug a phone number already belongs to (static LINE_PHONES or overlay),
 *  or null when the number is free. A number paired under two slugs is the
 *  duplicate-session failure mode — writers must refuse it. */
export function phoneTakenBy(phone: string, overlay: LinesOverlay = readLinesOverlay()): string | null {
  if (Object.hasOwn(LINE_PHONES, phone)) return LINE_PHONES[phone];
  for (const [slug, e] of Object.entries(overlay.lines)) {
    if (e.phone === phone) return slug;
  }
  return null;
}

export type NewLineInput = {
  slug: string;
  tenant: string;
  ownerKey: string;
  ownerName: string;
  phone?: string | null;
  note?: string;
  actor: string;
};

/**
 * Add a brand-new line from the /lines page. Born fully mapped — tenant +
 * owner are required, so the line is never routable-but-unmapped. Tenant
 * existence (a real row in the tenant table) is the caller's check — this
 * layer validates shape and collisions. Throws Error with a user-readable
 * message on any violation.
 */
export function addOverlayLine(input: NewLineInput): OverlayLine {
  const overlay = readLinesOverlay();
  const entry: OverlayLine = {
    slug: input.slug.trim(),
    tenant: input.tenant.trim(),
    ownerKey: input.ownerKey.trim(),
    ownerName: input.ownerName.trim(),
    ...(input.phone ? { phone: input.phone } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    addedBy: input.actor,
    addedAt: new Date().toISOString(),
  };
  const err = validateOverlayLine(entry, true);
  if (err) throw new Error(err);
  if (isKnownLine(entry.slug, overlay)) {
    throw new Error(`slug "${entry.slug}" already exists`);
  }
  if (entry.phone) {
    const taken = phoneTakenBy(entry.phone, overlay);
    if (taken) throw new Error(`+${entry.phone} already belongs to ${taken}`);
  }
  writeLinesOverlay({ version: 1, lines: { ...overlay.lines, [entry.slug]: entry } });
  return entry;
}

export type LinePatch = {
  phone?: string | null;
  ownerKey?: string;
  ownerName?: string;
  note?: string;
  actor: string;
};

/**
 * Edit a line's number/owner from the /lines page. Works for static slugs too
 * (an override entry with no tenant — a static line's tenant is immutable,
 * period). The overlay can never REMOVE an owner: ownerKey+ownerName come
 * together or not at all. Pass phone: null to clear a documented number.
 */
export function updateOverlayLine(slug: string, patch: LinePatch): OverlayLine {
  const overlay = readLinesOverlay();
  if (!isKnownLine(slug, overlay)) throw new Error(`unknown line "${slug}"`);
  if (overlay.lines[slug]?.retired) throw new Error(`"${slug}" is retired`);
  const prev = overlay.lines[slug] ?? { slug };
  const next: OverlayLine = { ...prev, slug };
  if (patch.phone !== undefined) {
    if (patch.phone === null) {
      delete next.phone;
    } else {
      const taken = phoneTakenBy(patch.phone, overlay);
      if (taken && taken !== slug) throw new Error(`+${patch.phone} already belongs to ${taken}`);
      next.phone = patch.phone;
    }
  }
  if (patch.ownerKey !== undefined || patch.ownerName !== undefined) {
    next.ownerKey = (patch.ownerKey ?? "").trim();
    next.ownerName = (patch.ownerName ?? "").trim();
  }
  if (patch.note !== undefined) {
    if (patch.note.trim()) next.note = patch.note.trim();
    else delete next.note;
  }
  const err = validateOverlayLine(next, false);
  if (err) throw new Error(err);
  writeLinesOverlay({ version: 1, lines: { ...overlay.lines, [slug]: next } });
  return next;
}

/**
 * Retire a line from the /lines page: hidden from the roster, refused by every
 * relink path — but the tenant/owner/phone mapping is KEPT, so historic rows
 * stay filed and attributed. Message history (DB rows + observed-*.jsonl) is
 * never touched; the session archive is the shell script's job
 * (wa-observer/retire-line.sh), called by the API route after this write.
 */
export function retireOverlayLine(slug: string, actor: string): OverlayLine {
  const overlay = readLinesOverlay();
  if (!isKnownLine(slug, overlay)) throw new Error(`unknown line "${slug}"`);
  if (overlay.lines[slug]?.retired) throw new Error(`"${slug}" is already retired`);
  const prev = overlay.lines[slug] ?? { slug };
  const next: OverlayLine = {
    ...prev,
    slug,
    retired: true,
    retiredBy: actor,
    retiredAt: new Date().toISOString(),
  };
  writeLinesOverlay({ version: 1, lines: { ...overlay.lines, [slug]: next } });
  return next;
}

// ─── Relink cooldown (stamp file written by wa-observer/relink-web.sh) ───────

/** True when the line may be relinked NOW (stamp missing or ≥ 5 min old). */
export function relinkCooldownOk(slug: string, dir = observerDir(), now = Date.now()): boolean {
  return relinkCooldownUntil(slug, dir, now) === null;
}

/** ISO moment the cooldown ends, or null when the line may be relinked. */
export function relinkCooldownUntil(slug: string, dir = observerDir(), now = Date.now()): string | null {
  try {
    const mtime = statSync(path.join(dir, `relink-${slug}.stamp`)).mtimeMs;
    const until = mtime + RELINK_COOLDOWN_MS;
    return now < until ? new Date(until).toISOString() : null;
  } catch {
    return null; // never relinked — no cooldown
  }
}

// ─── Roster ──────────────────────────────────────────────────────────────────

export type LineRow = {
  slug: string;
  tenant: string;
  owner: { key: string; name: string } | null;
  phone: string | null;
  displayName: string;
  status: LineStatus;
  cooldownUntil: string | null;
  /** True when the line was added from the /lines page (overlay registry) and
   *  has never been paired — staff pair it later from the Pair modal. */
  managed: boolean;
};

/**
 * One row per LIVE mapped line — static LINE_TENANT keys plus page-managed
 * overlay entries. Retired and banned slugs stay mapped forever (their
 * historic rows need the tenant) but are NOT listed: a retired row shows the
 * same phone as its successor line (the handset moved), and a banned number
 * is dead weight that invites a pairing attempt that can only fail (owner
 * 2026-09-11: "remove them so no confusion occurs"). Retirement via the page
 * (overlay `retired` flag) hides a line exactly the same way.
 * `nameOverrides`/`overlay` may be injected by tests to skip the DB/fs;
 * production callers leave them unset.
 */
export async function listLines(opts?: {
  dir?: string;
  now?: number;
  nameOverrides?: Record<string, string>;
  overlay?: LinesOverlay;
  /** Tenants existing in this deployment; tests inject it to skip the DB. */
  tenantSlugs?: Set<string>;
}): Promise<LineRow[]> {
  const dir = opts?.dir ?? observerDir();
  const now = opts?.now ?? Date.now();
  const names = opts?.nameOverrides ?? (await readNameOverrides());
  const overlay = opts?.overlay ?? readLinesOverlay();
  const liveTenants = opts?.tenantSlugs ?? (await readTenantSlugs());
  const hidden = new Set([...RETIRED_LINES, ...BANNED_LINES, ...overlayRetiredSlugs(overlay)]);

  // Static map first (module-load merged), then overlay tenants fresh — a
  // line added from the page appears on the next poll without a restart.
  const tenants: Record<string, string> = { ...overlayTenants(overlay), ...LINE_TENANT };
  const owners = overlayOwners(overlay);

  return Object.entries(tenants)
    .filter(([slug, t]) => !hidden.has(slug) && liveTenants.has(t))
    .map(([slug, tenant]) => {
      // Overlay owner wins a complete pair (same rule as resolveOwnerForLine);
      // telegramChatId carries over from the static entry when overriding.
      const fresh = owners[slug];
      const owner: BrandOwner | null = fresh
        ? { key: fresh.key, name: fresh.name, telegramChatId: BRAND_OWNERS[slug]?.telegramChatId ?? null }
        : BRAND_OWNERS[slug] ?? null;
      // Page-managed = the overlay carries this slug's tenant (static lines
      // with an owner/phone override are still code lines at heart).
      const managed = Boolean(overlay.lines[slug]?.tenant);
      return {
        slug,
        tenant,
        owner: owner ? { key: owner.key, name: owner.name } : null,
        phone: phoneFromCreds(slug, dir) ?? phoneFromRegistry(slug, overlay),
        displayName: names[slug] ?? owner?.name ?? slug,
        status: getLineStatus(slug, dir, now),
        cooldownUntil: relinkCooldownUntil(slug, dir, now),
        managed,
      };
    });
}
