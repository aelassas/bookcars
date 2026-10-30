/**
 * lines-overlay.ts — the page-managed line registry overlay.
 *
 * The static maps (LINE_TENANT here in modules/messaging/lines.ts, BRAND_OWNERS
 * and LINE_PHONES in modules/board/owners.ts) remain the base source of truth,
 * pinned by lines.test.ts / owners.test.ts. The /lines page's add/edit/remove
 * actions write ONE JSON file — wa-observer/lines-registry.json — and every
 * consumer merges it over the static maps:
 *
 *   tenant  — overlay may only ADD slugs; a static slug's tenant is immutable
 *             (changing a tenant re-files the whole archive — the importer
 *             dedupes on (tenant_id, external_message_id)).
 *   owner   — overlay wins when it carries both ownerKey and ownerName (the
 *             page is the newest admin decision), but can never REMOVE one.
 *   phone   — overlay adds phone → slug entries that do not collide with a
 *             static LINE_PHONES key (a phone already paired under another
 *             slug is a duplicate session waiting to happen).
 *   retired — a retired slug keeps its tenant/owner/phone mapping forever
 *             (historic rows stay filed right) but is hidden from the roster
 *             and refused by every relink path. Removal NEVER deletes message
 *             history — it only stops the observer and archives the session.
 *
 * Read path: mtime-cached, re-read within a second of any write, so the
 * long-running beats (importer, relays, mycrm) pick up page changes without a
 * restart. Write path: full-file validation + tmp-file rename (atomic), and
 * every mutation re-validates before touching disk.
 *
 * The file lives next to the observer sessions so app, scripts AND the shell
 * relink guard (wa-observer/relink-web.sh) all read the same copy regardless
 * of cwd. WA_LINES_REGISTRY overrides the path (tests).
 */
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_LINES_REGISTRY = "/Users/takeauto/take-auto/wa-observer/lines-registry.json";

export function linesRegistryPath(): string {
  return process.env.WA_LINES_REGISTRY ?? DEFAULT_LINES_REGISTRY;
}

export const LINE_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const OWNER_KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const TENANT_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

export type OverlayLine = {
  slug: string;
  /** Required for page-added lines; absent on override entries for static
   *  slugs (a static line's tenant is code-only, forever). Kept on retired
   *  lines — the mapping is what files historic rows correctly. */
  tenant?: string;
  ownerKey?: string;
  ownerName?: string;
  /** Documented number (digits). The live session's own number always wins
   *  while paired; this is the fallback for unpaired/archived sessions. */
  phone?: string;
  retired?: boolean;
  note?: string;
  addedBy?: string;
  addedAt?: string;
  retiredBy?: string;
  retiredAt?: string;
};

export type LinesOverlay = { version: 1; lines: Record<string, OverlayLine> };

export const EMPTY_OVERLAY: LinesOverlay = { version: 1, lines: {} };

/** Validate ONE entry. Returns an error string, or null when valid.
 *  `requireTenant` is true for page-added lines (a new slug is born mapped —
 *  never routable-but-unmapped). */
export function validateOverlayLine(entry: OverlayLine, requireTenant: boolean): string | null {
  if (!LINE_SLUG_RE.test(entry.slug)) return "slug must be 2-40 chars of a-z 0-9 -";
  if (requireTenant && !entry.tenant) return "tenant is required for a new line";
  if (entry.tenant !== undefined && !TENANT_SLUG_RE.test(entry.tenant)) {
    return "tenant must be a lowercase slug";
  }
  if ((entry.ownerKey === undefined) !== (entry.ownerName === undefined)) {
    return "ownerKey and ownerName come together — a line is never half-owned";
  }
  if (entry.ownerKey !== undefined && !OWNER_KEY_RE.test(entry.ownerKey)) {
    return "ownerKey must be a lowercase slug";
  }
  if (entry.ownerName !== undefined && (entry.ownerName.trim().length < 1 || entry.ownerName.length > 60)) {
    return "ownerName must be 1-60 characters";
  }
  if (entry.phone !== undefined && !/^[0-9]{10,15}$/.test(entry.phone)) {
    return "phone must be 10-15 digits";
  }
  return null;
}

/** Parse raw JSON into an overlay, dropping invalid entries (a hand-edited
 *  file must never crash the importer — a bad row is skipped, loudly). */
export function parseLinesOverlay(raw: unknown): LinesOverlay {
  const out: LinesOverlay = { version: 1, lines: {} };
  const lines = (raw as { lines?: unknown } | null)?.lines;
  if (!lines || typeof lines !== "object") return out;
  for (const [slug, v] of Object.entries(lines as Record<string, unknown>)) {
    const e = { ...(v as Record<string, unknown>), slug } as OverlayLine;
    // Override entries (no tenant) are legitimate; tenant is only REQUIRED at
    // write time for new slugs. A retired override entry is how a static line
    // is retired from the page.
    if (validateOverlayLine(e, false) !== null) {
      console.warn(`[lines-overlay] skipping invalid entry "${slug}" in ${linesRegistryPath()}`);
      continue;
    }
    out.lines[slug] = e;
  }
  return out;
}

// ─── Cached read ─────────────────────────────────────────────────────────────

let cache: { path: string; mtimeMs: number; size: number; value: LinesOverlay } | null = null;

/** The overlay, fresh within one stat() of any write. Missing/unparseable file
 *  = empty overlay (the static maps carry the system alone, as before). */
export function readLinesOverlay(): LinesOverlay {
  const p = linesRegistryPath();
  let st: { mtimeMs: number; size: number };
  try {
    const s = statSync(p);
    st = { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    if (cache?.path === p && cache.mtimeMs === -1) return cache.value;
    const value = EMPTY_OVERLAY;
    cache = { path: p, mtimeMs: -1, size: -1, value };
    return value;
  }
  if (cache && cache.path === p && cache.mtimeMs === st.mtimeMs && cache.size === st.size) {
    return cache.value;
  }
  let value: LinesOverlay = EMPTY_OVERLAY;
  try {
    value = parseLinesOverlay(JSON.parse(readFileSync(p, "utf8")));
  } catch (e) {
    console.warn(
      `[lines-overlay] ${p} is unreadable — static maps only: ${e instanceof Error ? e.message : e}`
    );
  }
  cache = { path: p, mtimeMs: st.mtimeMs, size: st.size, value };
  return value;
}

/** Test hook — the cache is process-global. */
export function resetLinesOverlayCache(): void {
  cache = null;
}

// ─── Derived views ───────────────────────────────────────────────────────────

/** slug → tenant for overlay entries that carry one. Retired lines KEEP their
 *  tenant — removal hides them from the roster, never from history. */
export function overlayTenants(o: LinesOverlay = readLinesOverlay()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slug, e] of Object.entries(o.lines)) {
    if (e.tenant) out[slug] = e.tenant;
  }
  return out;
}

/** slug → owner for entries carrying a complete owner pair. */
export function overlayOwners(
  o: LinesOverlay = readLinesOverlay()
): Record<string, { key: string; name: string }> {
  const out: Record<string, { key: string; name: string }> = {};
  for (const [slug, e] of Object.entries(o.lines)) {
    if (e.ownerKey && e.ownerName) out[slug] = { key: e.ownerKey, name: e.ownerName };
  }
  return out;
}

/** phone → slug for entries carrying a number. Callers merge this UNDER the
 *  static LINE_PHONES (a static mapping always wins a collision). */
export function overlayPhones(o: LinesOverlay = readLinesOverlay()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slug, e] of Object.entries(o.lines)) {
    if (e.phone) out[e.phone] = slug;
  }
  return out;
}

export function overlayRetiredSlugs(o: LinesOverlay = readLinesOverlay()): Set<string> {
  return new Set(Object.values(o.lines).filter((e) => e.retired).map((e) => e.slug));
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Atomically replace the overlay file (tmp + rename) and update the cache. */
export function writeLinesOverlay(next: LinesOverlay): void {
  // Validate the WHOLE file before it touches disk — a half-valid registry is
  // how a line ends up routable-but-unmapped.
  for (const e of Object.values(next.lines)) {
    const err = validateOverlayLine(e, false);
    if (err) throw new Error(`refusing to write registry: ${e.slug}: ${err}`);
  }
  const p = linesRegistryPath();
  mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
  renameSync(tmp, p);
  const s = statSync(p);
  cache = { path: p, mtimeMs: s.mtimeMs, size: s.size, value: next };
}
