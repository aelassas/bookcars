// GROUP NAMES — WhatsApp group JIDs are opaque to humans
// ("120363394800667895@g.us"). The observers cache the real subjects in
// wa-observer/group-names-<brand>.json (one file per brand, written by
// bridge.js on first sighting); this module is the READ side for every
// human-facing label (lead cards, B2B offers, manager lines, backfills).
//
// The files change on the box between passes, so the merged map is cached
// in-process for CACHE_TTL_MS and re-read after. A missing dir (a dev
// machine, a fresh deploy) is not an error: every JID stays raw.

import { readFileSync, readdirSync } from "fs";
import { dirname, resolve } from "path";

const CACHE_TTL_MS = 60_000;

/** The observer directory: WA_OBSERVER_DIR, else the repo's own wa-observer
 *  (anchored to this file, not the process cwd — scripts run from anywhere). */
function observerDir(): string {
  return (
    process.env.WA_OBSERVER_DIR?.trim() ||
    resolve(dirname(import.meta.filename), "../../../../../wa-observer")
  );
}

let cached: { at: number; map: Map<string, string> } | null = null;

function loadMap(): Map<string, string> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.map;
  const map = new Map<string, string>();
  try {
    for (const f of readdirSync(observerDir())) {
      if (!/^group-names-.+\.json$/.test(f)) continue;
      try {
        const data = JSON.parse(readFileSync(resolve(observerDir(), f), "utf8")) as Record<
          string,
          { subject?: unknown }
        >;
        for (const [jid, v] of Object.entries(data)) {
          if (typeof v?.subject === "string" && v.subject.trim()) map.set(jid, v.subject.trim());
        }
      } catch {
        /* skip a malformed cache file — one brand's corruption is not fatal */
      }
    }
  } catch {
    /* observer dir absent — every JID stays raw */
  }
  cached = { at: Date.now(), map };
  return map;
}

/** The cached subject for one group JID, or null when unknown. */
export function groupSubject(jid: string | null | undefined): string | null {
  if (!jid) return null;
  return loadMap().get(jid.trim()) ?? null;
}

const JID_RE = /(\S+@g\.us)/;

/**
 * The display form for a group JID — or for a label carrying one
 * ("WhatsApp group: 120363…@g.us"): the cached subject when known, else the
 * raw JID. Never a guess. Input without a JID passes through unchanged.
 */
export function groupDisplayName(jidOrContext: string | null | undefined): string {
  const raw = (jidOrContext ?? "").trim();
  const m = JID_RE.exec(raw);
  if (!m) return raw;
  return groupSubject(m[1]) ?? m[1];
}

/** Replace every known group JID in a longer string with its subject (the
 *  backfill's rewrite of stored callSource/source_label values). Returns the
 *  input unchanged when nothing is known. */
export function replaceGroupJids(text: string): string {
  return text.replace(/\S+@g\.us/g, (jid) => groupSubject(jid) ?? jid);
}

/** Test seam: drop the in-process cache so a new WA_OBSERVER_DIR takes effect. */
export function resetGroupNameCache(): void {
  cached = null;
}
