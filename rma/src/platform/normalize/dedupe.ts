// Dedupe primitives for the Bitrix24 → Twenty migration.
//
// Why this exists: the same person lives on up to three Bitrix portals with
// slightly different payloads, and the old ingest wrote every copy as a new
// customer — that cost a manual dedupe of 7,651 clients. The match keys here
// deliberately mirror the platform's existing contracts:
//   - phone keys are tail-9 digit runs (MIN_PHONE_MATCH_DIGITS from
//     platform/messaging/phone.ts) — the SAME key the CRM uses to link
//     WhatsApp messages, so a migrated record dedupes against what chat sees;
//   - email keys are simply lowercased;
//   - name keys are sortKey + brandLine — name alone is NOT enough across
//     portals ("Ahmed" exists in every brand), so the brand disambiguates.
//
// findDuplicates uses union-find over ALL keys, not grouping by the single
// best key: duplicates are transitive (A and B share a phone, B and C share an
// email ⇒ A, B, C are one person), and key-grouping would split that chain.

import { normalizePhone as digitsOnly, MIN_PHONE_MATCH_DIGITS } from "../messaging/phone";

export interface DedupeRecord {
  externalId: string;
  /** Normalized numbers (E.164 or raw) — reduced to tail-9 here. */
  phones?: string[];
  emails?: string[];
  /** Name sortKey (lowercase, whitespace-collapsed) — see normalize/name.ts. */
  name?: string | null;
  /** Brand / portal line ("takeauto" | "cardiwan" | "easyrent"). */
  brandLine?: string | null;
  /** Freshness signal for conflict resolution in mergeRecords. */
  updatedAt?: Date | string | null;
  customFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export type DedupeKeyKind = "phone" | "email" | "name";

export interface DedupeKey {
  kind: DedupeKeyKind;
  value: string;
}

export interface DuplicateGroup {
  /** Representative key (the first key that linked the group). */
  key: DedupeKey;
  records: DedupeRecord[];
}

export interface MergedRecord extends DedupeRecord {
  /** Every externalId ever seen for this person — the audit trail for re-runs. */
  externalIds: string[];
}

function phoneKey(raw: string): string | null {
  const digits = digitsOnly(raw);
  return digits.length >= MIN_PHONE_MATCH_DIGITS ? digits.slice(-MIN_PHONE_MATCH_DIGITS) : null;
}

function emailKey(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return e.includes("@") ? e : null;
}

function nameKey(rec: DedupeRecord): string | null {
  const name = (rec.name ?? "").trim().toLowerCase();
  if (!name) return null;
  // brandLine scopes the name key: identical names in different brands are
  // different people until a phone/email says otherwise.
  return `${name}|${(rec.brandLine ?? "").trim().toLowerCase()}`;
}

/** Every key a record can be found by — used for union-find edges. */
function allKeys(rec: DedupeRecord): DedupeKey[] {
  const keys: DedupeKey[] = [];
  for (const p of rec.phones ?? []) {
    const v = phoneKey(p);
    if (v) keys.push({ kind: "phone", value: v });
  }
  for (const e of rec.emails ?? []) {
    const v = emailKey(e);
    if (v) keys.push({ kind: "email", value: v });
  }
  const n = nameKey(rec);
  if (n) keys.push({ kind: "name", value: n });
  return keys;
}

function keyId(k: DedupeKey): string {
  return `${k.kind}:${k.value}`;
}

/**
 * The single strongest key for a record, in priority order
 * phone → email → name+brandLine. Null when the record carries no usable
 * identity at all (it can still be migrated, just not deduped).
 */
export function buildDedupeKey(rec: DedupeRecord): DedupeKey | null {
  const keys = allKeys(rec);
  for (const kind of ["phone", "email", "name"] as const) {
    const hit = keys.find((k) => k.kind === kind);
    if (hit) return hit;
  }
  return null;
}

/** Groups of records that share at least one identity key (transitively). */
export function findDuplicates(records: DedupeRecord[]): DuplicateGroup[] {
  // Union-find over record indexes; edges = shared key.
  const parent = records.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };

  const firstKeyForRoot = new Map<number, DedupeKey>();
  const seenKey = new Map<string, number>();
  records.forEach((rec, i) => {
    for (const k of allKeys(rec)) {
      const id = keyId(k);
      const other = seenKey.get(id);
      if (other === undefined) {
        seenKey.set(id, i);
        const root = find(i);
        if (!firstKeyForRoot.has(root)) firstKeyForRoot.set(root, k);
      } else {
        union(i, other);
      }
    }
  });

  const groups = new Map<number, DedupeRecord[]>();
  records.forEach((rec, i) => {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(rec);
    groups.set(root, list);
  });

  const out: DuplicateGroup[] = [];
  for (const [root, recs] of groups) {
    if (recs.length < 2) continue;
    // The representative key may have been recorded under a pre-union root;
    // fall back to the first record's primary key.
    const key = firstKeyForRoot.get(root) ?? buildDedupeKey(recs[0]);
    if (key) out.push({ key, records: recs });
  }
  return out;
}

// ─── merge ──────────────────────────────────────────────────────────────────

function toTime(v: Date | string | null | undefined): number {
  if (!v) return Number.NEGATIVE_INFINITY;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === "";
}

/**
 * Conflict rule for scalar fields: a non-empty value always beats an empty one
 * (migrating a blank over real data is how the old import lost information);
 * when BOTH sides have a value, the fresher record wins — DATE_MODIFY is the
 * honest "which copy did a human touch last" signal.
 */
function better(a: unknown, b: unknown, aIsFresher: boolean): unknown {
  if (isEmpty(a)) return b;
  if (isEmpty(b)) return a;
  return aIsFresher ? a : b;
}

function dedupeStrings(values: string[], key: (v: string) => string = (v) => v): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    const k = key(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

const MERGE_HANDLED = new Set([
  "externalId",
  "externalIds",
  "phones",
  "emails",
  "updatedAt",
  "customFields",
]);

/**
 * Merge two copies of one person into a single record.
 *
 * Data-preservation rules (each one is a past data-loss incident):
 *   - phones and emails are UNIONED, never truncated — the old mapping kept
 *     [0] and threw the rest away;
 *   - every externalId is accumulated into externalIds so a re-run can still
 *     find the source rows;
 *   - scalars: non-empty beats empty, fresher (updatedAt) beats stale;
 *   - customFields merge per-key with the same conflict rule.
 */
export // Auto-generated system labels (missed-call / lost-lead markers) must NEVER
// beat a human name by freshness alone (data audit: CallGear touches the
// record last, so "Пропущенный лид по звонку с 97147035579" was winning over
// "Du corporate sales executive").
const AUTO_LABEL_RE = /пропущенн|lost lead|заявка с сайта|входящий звонок|missed call|callgea|whatsapp support/i;
function isAutoLabel(name: unknown): boolean {
  return typeof name === "string" && AUTO_LABEL_RE.test(name);
}

export function mergeRecords(a: DedupeRecord, b: DedupeRecord): MergedRecord {
  let aIsFresher = toTime(a.updatedAt) >= toTime(b.updatedAt);
  // Anti-label: a human name beats a fresher auto-label on the name field.
  if (isAutoLabel(a.name) && !isAutoLabel(b.name) && b.name) aIsFresher = false;
  if (isAutoLabel(b.name) && !isAutoLabel(a.name) && a.name) aIsFresher = true;

  const externalIds = dedupeStrings([
    a.externalId,
    ...((a.externalIds as string[] | undefined) ?? []),
    b.externalId,
    ...((b.externalIds as string[] | undefined) ?? []),
  ]);

  // Phones dedupe by tail-9 (the same number in two formats collapses);
  // emails dedupe case-insensitively but keep the first-seen spelling.
  const phones = dedupeStrings([...(a.phones ?? []), ...(b.phones ?? [])], (p) => phoneKey(p) ?? p);
  const emails = dedupeStrings([...(a.emails ?? []), ...(b.emails ?? [])], (e) => e.toLowerCase());

  const customFields: Record<string, unknown> = {};
  for (const src of [a.customFields ?? {}, b.customFields ?? {}]) {
    for (const [k, v] of Object.entries(src)) {
      customFields[k] = k in customFields ? better(customFields[k], v, aIsFresher) : v;
    }
  }

  const merged: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (MERGE_HANDLED.has(k)) continue;
    merged[k] = better(a[k], b[k], aIsFresher);
  }

  const fresherUpdatedAt = aIsFresher
    ? (a.updatedAt ?? b.updatedAt ?? null)
    : (b.updatedAt ?? a.updatedAt ?? null);

  return {
    ...merged,
    externalId: externalIds[0] ?? a.externalId,
    externalIds,
    phones,
    emails,
    customFields,
    updatedAt: fresherUpdatedAt,
  } as MergedRecord;
}
