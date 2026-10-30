// Bitrix24 field → TAKE Auto domain mappings

import type { Bitrix24Client } from "./client";

/** Bitrix multi-field entry (PHONE/EMAIL arrays). */
export type BitrixMultiField = { VALUE?: string };

/**
 * A Bitrix CRM record as returned by crm.*.list / crm.*.get — the fields the
 * mappings read, plus an index signature for UF_* and everything else.
 */
export interface BitrixCrmRecord {
  ID: string | number;
  NAME?: string;
  SECOND_NAME?: string;
  LAST_NAME?: string;
  TITLE?: string;
  COMMENTS?: string;
  SOURCE_ID?: string;
  /** Free text behind SOURCE_ID — on social-sourced records often the profile URL. */
  SOURCE_DESCRIPTION?: string;
  STATUS_ID?: string;
  STAGE_ID?: string;
  CATEGORY_ID?: string;
  DATE_MODIFY?: string;
  ASSIGNED_BY_ID?: string | number;
  // Deal stage-movement audit fields (standard, not UF_*).
  MOVED_TIME?: string;
  MOVED_BY_ID?: string | number;
  PREVIOUS_STAGE_ID?: string;
  // Deal → contact link. Bitrix carries the single CONTACT_ID on most portals;
  // CONTACT_IDS (the multi binding) shows up when a deal has several contacts.
  CONTACT_ID?: string | number | null;
  CONTACT_IDS?: (string | number)[] | null;
  IS_RETURN_CUSTOMER?: string; // "Y" | "N"
  IS_REPEATED_APPROACH?: string; // "Y" | "N"
  PHONE?: BitrixMultiField[];
  EMAIL?: BitrixMultiField[];
  WEB?: BitrixMultiField[];
  [key: string]: unknown;
}

export function mapBitrixContactToCustomer(bx: BitrixCrmRecord) {
  const phones = extractPhones(bx);
  const emails = extractEmails(bx);

  return {
    externalId: String(bx.ID),
    name: [bx.NAME, bx.SECOND_NAME, bx.LAST_NAME].filter(Boolean).join(" ").trim() || "Unknown",
    phone: phones[0] ?? null,
    email: emails[0] ?? null,
    source: normalizeSource(bx.SOURCE_ID),
    notes: bx.COMMENTS || null,
    // First http(s) URL in the contact's WEB multi-field — usually the social
    // profile (instagram.com/…) the lead came from. Null like the other fields:
    // the contacts branch spreads this mapper wholesale into the UPDATE, and
    // only the sync writes the column, so a cleared WEB wiping it is honest.
    socialUrl: extractSocialUrl(bx.WEB),
  };
}

export function mapBitrixLeadToLead(bx: BitrixCrmRecord) {
  const phones = extractPhones(bx);
  const emails = extractEmails(bx);

  return {
    externalId: String(bx.ID),
    customerName: [bx.NAME, bx.LAST_NAME].filter(Boolean).join(" ").trim() || bx.TITLE || "Unknown",
    phone: phones[0] ?? null,
    email: emails[0] ?? null,
    source: normalizeSource(bx.SOURCE_ID),
    status: mapLeadStatus(bx.STATUS_ID),
    notes: bx.COMMENTS || null,
    // Raw SOURCE_DESCRIPTION — on social-sourced leads it often IS the profile
    // URL (https://instagram.com/…). Stored verbatim; the Twenty mirror mines
    // the URL out of it (firstHttpUrl) for the person's socialProfile link.
    sourceDescription: bx.SOURCE_DESCRIPTION?.trim() || null,
    // The real intake date from Bitrix (DATE_CREATE) — "when it came in".
    // Bitrix never changes it, so writing it on every pass is idempotent and
    // backfills the leads imported before this mapping (their createdAt had
    // been the import date — the platform was throwing away the true one).
    createdAt: bx.DATE_CREATE ? new Date(bx.DATE_CREATE as string) : undefined,
  };
}

export function mapBitrixDealToDeal(bx: BitrixCrmRecord) {
  // Bitrix is ARCHIVE-ONLY backfill — the platform is the replacement CRM, not
  // a mirror. Per owner directive (2026-07-21) we do NOT import Bitrix money
  // fields (OPPORTUNITY/BALANCE are declared fiction); the platform counts its
  // own vouched numbers. Only two mappings survive here: STAGE_ID → stage/status
  // and (in sync.ts) ASSIGNED_BY_ID → owner_id. `value`/`balanceDue` are left
  // to the platform's own defaults and never overwritten from Bitrix.
  return {
    externalId: String(bx.ID),
    ref: bx.TITLE || `BX-${bx.ID}`,
    type: mapDealType(bx.CATEGORY_ID),
    status: mapDealStatus(bx.STAGE_ID),
    stage: mapDealStage(bx.STAGE_ID),
    // Bitrix's own last-modified stamp (0053) — the honest freshness signal;
    // our updated_at gets bumped by every reconcile pass and lies.
    sourceModifiedAt: bx.DATE_MODIFY ? new Date(bx.DATE_MODIFY) : null,
    // Real intake date (DATE_CREATE), idempotent like the lead mapping.
    createdAt: bx.DATE_CREATE ? new Date(bx.DATE_CREATE as string) : undefined,
    // `notes` is deliberately ABSENT, not null. It used to be `notes: null`,
    // and because this object is spread straight into the UPDATE in sync.ts,
    // every note a salesperson typed on a deal was erased by the next sync
    // pass — within a minute. Unlike leads, Bitrix deal COMMENTS is not read
    // here at all, so that line destroyed data and imported nothing in return.
    // deal.notes belongs to the platform; the sync must not touch it.
  };
}

/**
 * The deal's Bitrix contact id, as a string: CONTACT_ID first, then the first
 * entry of the CONTACT_IDS multi binding. Null when the deal names no contact
 * (Bitrix sometimes serializes "0"/"" for absent — those count as none).
 */
export function bitrixDealContactId(bx: BitrixCrmRecord): string | null {
  const single = bx.CONTACT_ID != null ? String(bx.CONTACT_ID).trim() : "";
  if (single && single !== "0") return single;
  if (Array.isArray(bx.CONTACT_IDS)) {
    for (const id of bx.CONTACT_IDS) {
      const s = String(id ?? "").trim();
      if (s && s !== "0") return s;
    }
  }
  return null;
}

function extractPhones(bx: BitrixCrmRecord): string[] {
  const arr = bx.PHONE;
  if (!Array.isArray(arr)) return [];
  return arr.map((p) => p.VALUE).filter((v): v is string => Boolean(v));
}

/**
 * The first http(s) URL inside a free-text value. Bitrix SOURCE_DESCRIPTION on
 * social-sourced records is often exactly the profile URL, sometimes wrapped in
 * prose — either way the URL is what we want. Trailing punctuation that a chat
 * message would glue to the link (".", ",", ")") is stripped.
 */
export function firstHttpUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = /https?:\/\/[^\s<>"']+/i.exec(text);
  return m ? m[0].replace(/[.,;!?)\]]+$/, "") : null;
}

/** First dialable-looking URL across a WEB multi-field, in Bitrix order. */
function extractSocialUrl(web: BitrixMultiField[] | undefined): string | null {
  if (!Array.isArray(web)) return null;
  for (const entry of web) {
    const url = firstHttpUrl(entry?.VALUE);
    if (url) return url;
  }
  return null;
}

function extractEmails(bx: BitrixCrmRecord): string[] {
  const arr = bx.EMAIL;
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => e.VALUE).filter((v): v is string => Boolean(v));
}

// Exported for platform/normalize (Bitrix→Twenty migration) — one SOURCE_ID
// vocabulary, not two.
export function normalizeSource(src?: string): string {
  if (!src) return "unknown";
  const map: Record<string, string> = {
    WEBFORM: "website",
    CALLBACK: "callback",
    CALL: "call",
    EMAIL: "email",
    WHATSAPP: "whatsapp",
    INSTAGRAM: "instagram",
    FACEBOOK: "facebook",
  };
  return map[src.toUpperCase()] || src.toLowerCase();
}

// Returns null for an UNKNOWN STATUS_ID — never a blind "new". cardiwan and
// easyrent are separate Bitrix portals with their own UC_* status codes that
// are NOT in this take-auto map; returning "new" here meant every 60-second
// sync pass reset those two brands' every lead back to "new" (and skewed the
// status='new' load metric that round-robins leads to Azat/Firuz). Callers must
// treat null as "leave the existing status alone" — same absent-vs-null
// discipline mapBitrixDealToDeal uses for notes. Add a portal's real codes here
// to map them; until then the platform's own status is preserved, not clobbered.
function mapLeadStatus(status?: string): string | null {
  const map: Record<string, string> = {
    NEW: "new",
    UC_PJVWHB: "new", // Заявки без ответа
    UC_ONFVC6: "contacted", // Выявление потребности
    UC_D3UG8A: "contacted", // Повторное касание 1
    UC_977RKG: "contacted", // Повторное касание 2
    WON: "qualified",
    LOSE: "lost",
  };
  return map[status ?? ""] ?? null;
}

function mapDealType(categoryId?: string): string {
  const map: Record<string, string> = {
    "2": "rent", // Подбор авто
    "4": "lease", // TakeAuto.Инвест
    "6": "rent", // Отдел Продаж
    "8": "rent", // Клиенты ТО
    "10": "rent", // Рассылка WhatsApp
  };
  return map[categoryId ?? ""] || "rent";
}

// Bitrix STAGE_ID carries a pipeline prefix for every non-default funnel:
// "C6:UC_FLL5Y2", "C6:WON", "C6:LOSE". Only the DEFAULT pipeline (category 0)
// uses bare codes ("NEW", "WON", "LOSE"). The old map matched bare codes only,
// so EVERY category-6/4/2/8/10 deal collapsed to inquiry/open — including WON
// and LOSE deals, which stayed "open inquiry". strip the prefix for the
// status test; keep the FULL id for the stage table (EXECUTING / FINAL_INVOICE
// mean different things in different funnels, so a suffix-only map is wrong).
function stripStagePrefix(stageId?: string): string {
  if (!stageId) return "";
  const i = stageId.indexOf(":");
  return i >= 0 ? stageId.slice(i + 1) : stageId;
}

// open | won | lost — decided by the terminal-stage suffix, funnel-independent.
function mapDealStatus(stageId?: string): string {
  const code = stripStagePrefix(stageId);
  if (code === "WON") return "won";
  if (code === "LOSE" || code === "APOLOGY") return "lost";
  return "open";
}

// Deterministic Bitrix STAGE_ID → platform stage (inquiry | quote | contract |
// handover | closed). Keyed on the FULL STATUS_ID and ordered monotonically per
// funnel so a deal's platform stage matches where Azat sees it in Bitrix.
// Built from the live funnels (crm.dealcategory.stage.list) on 2026-07-21:
//   cat0 default · cat2 Подбор авто · cat4 TakeAuto.Инвест ·
//   cat6 Отдел Продаж · cat8 Клиенты ТО · cat10 Рассылка WhatsApp
const DEAL_STAGE_MAP: Record<string, string> = {
  // ── cat 0 — default pipeline ──────────────────────────────────────────
  NEW: "inquiry",
  UC_PJVWHB: "inquiry", // Заявки без ответа
  UC_ONFVC6: "inquiry", // Выявление потребности
  UC_D3UG8A: "quote", //   Повторное касание 1
  UC_977RKG: "quote", //   Повторное касание 2
  WON: "closed",
  LOSE: "closed",
  // ── cat 2 — Подбор авто ───────────────────────────────────────────────
  "C2:NEW": "inquiry",
  "C2:UC_M8NYPN": "inquiry", // Выявление потребности
  "C2:UC_T0XYEP": "quote", //   Подбор
  "C2:UC_1OQL6E": "contract", // Проверка
  "C2:UC_FB9Q25": "handover", // Регистрация
  "C2:UC_WN49WU": "handover", // Подготовка
  "C2:UC_TOQ93S": "handover", // Финальная проверка
  "C2:WON": "closed",
  "C2:LOSE": "closed",
  // ── cat 4 — TakeAuto.Инвест (lease) ───────────────────────────────────
  "C4:NEW": "inquiry",
  "C4:UC_VBJ2YO": "inquiry", //   Ожидание номера
  "C4:PREPARATION": "quote", //    Отправка КП
  "C4:PREPAYMENT_INVOICE": "quote", // Прогрев партнёра
  "C4:EXECUTING": "contract", //   Отправка в СБ
  "C4:FINAL_INVOICE": "handover", // Подписание договора
  "C4:WON": "closed",
  "C4:LOSE": "closed",
  // ── cat 6 — Отдел Продаж (sales — Azat's funnel) ──────────────────────
  "C6:NEW": "inquiry",
  "C6:UC_FLL5Y2": "inquiry", //     Выявление потребности
  "C6:PREPAYMENT_INVOICE": "quote", // КП отправлено
  "C6:EXECUTING": "quote", //       Прогрев КП
  "C6:UC_0MI2QI": "contract", //    Встреча назначена
  "C6:FINAL_INVOICE": "contract", // Встреча проведена
  "C6:UC_S86GRC": "handover", //    Отправил на СБ
  "C6:UC_LWVEC3": "handover", //    Одобрено СБ
  "C6:WON": "closed",
  "C6:LOSE": "closed",
  // ── cat 8 — Клиенты ТО ────────────────────────────────────────────────
  "C8:NEW": "inquiry",
  "C8:EXECUTING": "inquiry", //  Выявление потребности
  "C8:FINAL_INVOICE": "contract", // В работе
  "C8:UC_GYN4L4": "handover", // На проверке
  "C8:WON": "closed",
  "C8:LOSE": "closed",
  // ── cat 10 — Рассылка WhatsApp ────────────────────────────────────────
  "C10:NEW": "inquiry",
  "C10:EXECUTING": "contract", // В работе
  "C10:UC_1DE026": "handover", // На оформлении
  "C10:WON": "closed",
  "C10:LOSE": "closed",
};

// Suffix fallback for any funnel not enumerated above — keeps a new/unknown
// Bitrix pipeline monotonic instead of collapsing everything to inquiry.
const STAGE_SUFFIX_FALLBACK: Record<string, string> = {
  NEW: "inquiry",
  PREPARATION: "quote",
  PREPAYMENT_INVOICE: "quote",
  EXECUTING: "contract",
  FINAL_INVOICE: "handover",
  WON: "closed",
  LOSE: "closed",
  APOLOGY: "closed",
};

function mapDealStage(stageId?: string): string {
  if (!stageId) return "inquiry";
  return DEAL_STAGE_MAP[stageId] ?? STAGE_SUFFIX_FALLBACK[stripStagePrefix(stageId)] ?? "inquiry";
}

// ─── Funnel-fidelity: Azat's "Отдел Продаж" (category 6) board ──────────────
// The kanban's detail columns ARE Azat's Bitrix category-6 funnel, in Bitrix
// SORT order. `name` is the exact stage NAME the sync writes into
// deal.stage_detail (so cards group by string-equality). `stageId` is the
// Bitrix STATUS_ID we POST back on a two-way move. `coarse` keeps the row's
// legacy `deal.stage` in step so won/lost math and the coarse fallback board
// stay correct. WON (успешна) / LOSE (провалена) are terminal and excluded
// from the OPEN board, exactly as the coarse board excludes `closed`.
// Confirmed against crm.dealcategory.stage.list id=6 on 2026-07-21.
export type FunnelColumn = {
  name: string;
  label: string;
  stageId: string;
  coarse: "inquiry" | "quote" | "contract" | "handover";
};

// `name` = the exact Bitrix stage NAME (matches deal.stage_detail — the match
// key, must stay verbatim). `label` = English column header shown on the board.
export const FUNNEL_C6_COLUMNS: FunnelColumn[] = [
  { name: "Новая заявка", label: "New request", stageId: "C6:NEW", coarse: "inquiry" },
  { name: "Выявление потребности", label: "Needs assessment", stageId: "C6:UC_FLL5Y2", coarse: "inquiry" },
  { name: "КП отправлено", label: "Quote sent", stageId: "C6:PREPAYMENT_INVOICE", coarse: "quote" },
  { name: "Прогрев КП", label: "Quote follow-up", stageId: "C6:EXECUTING", coarse: "quote" },
  { name: "Встреча назначена", label: "Meeting scheduled", stageId: "C6:UC_0MI2QI", coarse: "contract" },
  { name: "Встреча проведена", label: "Meeting held", stageId: "C6:FINAL_INVOICE", coarse: "contract" },
  { name: "Отправил на СБ", label: "Sent to Security", stageId: "C6:UC_S86GRC", coarse: "handover" },
  { name: "Одобрено СБ", label: "Security approved", stageId: "C6:UC_LWVEC3", coarse: "handover" },
];

// Bitrix stage NAME (Russian, as stored in deal.stage_detail) → English column
// label, for anywhere that renders a raw stage_detail. Falls back to the raw
// value so an unmapped/foreign stage still shows something.
//
// The C6 columns are only Azat's sales funnel. Every OTHER portal writes its
// own names into stage_detail too — the terminal deal states, easyrent's rent
// funnel, and its junk/refusal statuses — and those surface raw on the lead and
// deal cards. The app is English-only, so they get labels here rather than at
// each render site. Keys stay verbatim (they are the match key against Bitrix).
const OTHER_STAGE_LABELS: Record<string, string> = {
  // Terminal deal states — the two biggest by row count across every portal.
  "Сделка провалена": "Deal lost",
  "Сделка успешна": "Deal won",
  // easyrent lead funnel (crm.status.list on their portal).
  "Не обработан": "Unprocessed",
  "В работе": "In progress",
  "Обработан": "Processed",
  "Качественный лид": "Qualified",
  "Некачественный лид": "Junk",
  // easyrent refusal/junk statuses.
  "Новая": "New",
  "Отказ клиента": "Customer declined",
  "Отказ компании": "Company declined",
  "Отказ по языку": "Language mismatch",
  "Некорректный номер": "Invalid number",
  "Работа(Резюме)": "Job application",
};

const STAGE_NAME_TO_LABEL: Record<string, string> = {
  ...OTHER_STAGE_LABELS,
  ...Object.fromEntries(FUNNEL_C6_COLUMNS.map((c) => [c.name, c.label])),
};
export function funnelStageLabel(stageDetail: string | null | undefined): string {
  if (!stageDetail) return "—";
  return STAGE_NAME_TO_LABEL[stageDetail] ?? stageDetail;
}

// The coarse `stage` a null/foreign-funnel deal maps INTO so it still appears
// on the detail board (never vanishes) — the first C6 column carrying that
// coarse bucket. Keyed by coarse stage → detail column NAME.
export const COARSE_TO_DETAIL_COLUMN: Record<string, string> = {
  inquiry: "Выявление потребности",
  quote: "КП отправлено",
  contract: "Встреча назначена",
  handover: "Отправил на СБ",
};

// ─── Live stage catalog (STATUS_ID ↔ NAME per Bitrix category) ──────────────
// The sync writes the exact stage NAME, resolved from the LIVE funnel config
// (crm.dealcategory.stage.list) rather than a hardcoded table, so a portal
// that renames or adds a stage is mirrored without a code change. One API call
// per distinct category id, cached (and de-duped while in flight). Read-only:
// `.list` is not a write verb, so it passes the SOURCE_READ_ONLY guard.
export type StageCatalog = {
  /** STATUS_ID (e.g. "C6:UC_FLL5Y2") → stage NAME (e.g. "Выявление потребности"). */
  nameFor(categoryId: string | number | undefined, stageId: string | undefined): Promise<string | null>;
  /** stage NAME → STATUS_ID within a category (for two-way write-back). */
  stageIdFor(categoryId: string | number | undefined, name: string | undefined): Promise<string | null>;
};

export function createStageCatalog(client: Bitrix24Client): StageCatalog {
  // categoryId → { byId: STATUS_ID→NAME, byName: NAME→STATUS_ID }
  const cache = new Map<string, { byId: Map<string, string>; byName: Map<string, string> }>();
  const inflight = new Map<string, Promise<{ byId: Map<string, string>; byName: Map<string, string> }>>();

  async function load(catKey: string) {
    const hit = cache.get(catKey);
    if (hit) return hit;
    const pending = inflight.get(catKey);
    if (pending) return pending;
    const p = (async () => {
      const byId = new Map<string, string>();
      const byName = new Map<string, string>();
      try {
        const res = await client.call<Array<{ STATUS_ID?: string; NAME?: string }>>(
          "crm.dealcategory.stage.list",
          { id: Number(catKey) }
        );
        const stages = Array.isArray(res.result) ? res.result : [];
        for (const s of stages) {
          const id = s?.STATUS_ID ? String(s.STATUS_ID) : null;
          const name = s?.NAME != null ? String(s.NAME) : null;
          if (id && name) {
            byId.set(id, name);
            // First writer wins on name collisions within a category (unlikely).
            if (!byName.has(name)) byName.set(name, id);
          }
        }
      } catch {
        // Leave empty — nameFor/stageIdFor return null and the caller degrades
        // gracefully (stage_detail stays null → coarse fallback).
      }
      const entry = { byId, byName };
      cache.set(catKey, entry);
      inflight.delete(catKey);
      return entry;
    })();
    inflight.set(catKey, p);
    return p;
  }

  return {
    async nameFor(categoryId, stageId) {
      if (!stageId) return null;
      const entry = await load(String(categoryId ?? "0"));
      return entry.byId.get(String(stageId)) ?? null;
    },
    async stageIdFor(categoryId, name) {
      if (!name) return null;
      const entry = await load(String(categoryId ?? "0"));
      return entry.byName.get(name) ?? null;
    },
  };
}

export type LeadStatusCatalog = {
  /** STATUS_ID → human status NAME for this portal's LEAD funnel, or null. */
  nameFor(statusId: string | undefined): Promise<string | null>;
};

/**
 * Live catalog of a portal's LEAD statuses (crm.status.list, ENTITY_ID=STATUS),
 * loaded once and cached — the lead counterpart to createStageCatalog. Rent
 * portals each define their OWN lead funnel (cardiwan has 10 stages, easyrent
 * 5), so the coarse mapLeadStatus() can't name them; this resolves the exact
 * NAME to store in lead.stage_detail. Degrades to null (→ stage_detail stays
 * null, coarse `status` still applies) if the call fails.
 */
export function createLeadStatusCatalog(client: Bitrix24Client): LeadStatusCatalog {
  let byId: Map<string, string> | null = null;
  let inflight: Promise<Map<string, string>> | null = null;

  async function load(): Promise<Map<string, string>> {
    if (byId) return byId;
    if (inflight) return inflight;
    inflight = (async () => {
      const m = new Map<string, string>();
      try {
        const res = await client.call<Array<{ STATUS_ID?: string; NAME?: string }>>(
          "crm.status.list",
          { filter: { ENTITY_ID: "STATUS" } }
        );
        const rows = Array.isArray(res.result) ? res.result : [];
        for (const s of rows) {
          const id = s?.STATUS_ID ? String(s.STATUS_ID) : null;
          const name = s?.NAME != null ? String(s.NAME) : null;
          if (id && name) m.set(id, name);
        }
      } catch {
        // Leave empty — nameFor returns null, caller keeps coarse status.
      }
      byId = m;
      inflight = null;
      return m;
    })();
    return inflight;
  }

  return {
    async nameFor(statusId) {
      if (!statusId) return null;
      const m = await load();
      return m.get(String(statusId)) ?? null;
    },
  };
}

// ─── Per-portal deal user-field (UF_*) resolution ───────────────────────────
// The semantically rich deal data lives in USER FIELDS whose ids differ per
// portal: on sales (takeauto-bx24.com) UF_CRM_1651487785 is the loss reason,
// but cardiwan/easyrent number their equivalent fields differently (or lack
// them). Hardcoding the sales ids would silently break the rental sync, so the
// fields are resolved BY MEANING from crm.deal.userfield.list — a field whose
// enumeration LIST contains a known marker value is the field we want:
//
//   loss reason       LIST contains "Не отвечает"
//   language segment  LIST contains "Русскоязычные"
//   car model(s)      LIST contains "Kia Cerato"   (multi-enumeration)
//
// A portal that lacks a field resolves it to null and the sync simply skips
// that mapping for the whole portal — never a wrong guess.

/** One row of crm.deal.userfield.list (only what the resolution reads). */
export interface BitrixUserFieldRow {
  ID?: string | number;
  FIELD_NAME?: string;
  USER_TYPE_ID?: string;
  LIST?: { ID?: string | number; VALUE?: string }[] | null;
}

/** A resolved enumeration user field: its name plus id → label dictionary. */
export interface ResolvedUserField {
  fieldName: string;
  /** Enumeration option id (as string) → human VALUE (e.g. "282" → "Не отвечает"). */
  list: Map<string, string>;
}

export interface DealUserFieldResolution {
  lossReason: ResolvedUserField | null;
  language: ResolvedUserField | null;
  carModels: ResolvedUserField | null;
}

// Marker values that identify each field BY MEANING (see the header above).
const LOSS_REASON_MARKER = "Не отвечает";
const LANGUAGE_MARKER = "Русскоязычные";
const CAR_MODEL_MARKER = "Kia Cerato";

function toResolvedField(row: BitrixUserFieldRow): ResolvedUserField | null {
  if (!row.FIELD_NAME || !Array.isArray(row.LIST)) return null;
  const list = new Map<string, string>();
  for (const opt of row.LIST) {
    if (opt?.ID == null || opt.VALUE == null) continue;
    list.set(String(opt.ID), String(opt.VALUE));
  }
  return list.size > 0 ? { fieldName: row.FIELD_NAME, list } : null;
}

function listContains(row: BitrixUserFieldRow, marker: string): boolean {
  return (row.LIST ?? []).some((o) => String(o?.VALUE ?? "").trim() === marker);
}

/**
 * Find the loss-reason / language / car-model user fields in a portal's
 * crm.deal.userfield.list response, by their enumeration content. First match
 * wins; a portal without the field gets null (→ skipped, not guessed).
 */
export function resolveDealUserFields(rows: BitrixUserFieldRow[]): DealUserFieldResolution {
  const find = (marker: string): ResolvedUserField | null => {
    for (const row of rows) {
      if (row.USER_TYPE_ID !== "enumeration") continue;
      if (!listContains(row, marker)) continue;
      const resolved = toResolvedField(row);
      if (resolved) return resolved;
    }
    return null;
  };
  return {
    lossReason: find(LOSS_REASON_MARKER),
    language: find(LANGUAGE_MARKER),
    carModels: find(CAR_MODEL_MARKER),
  };
}

/**
 * Enumeration LABELS for a raw UF value. Bitrix stores the option ID(s), not
 * the text: a single enumeration arrives as "282", a multi-enumeration as
 * ["12","34"]. Unknown ids are dropped (a raw id is meaningless to a reader).
 */
export function enumLabels(field: ResolvedUserField | null, raw: unknown): string[] {
  if (!field || raw == null || raw === false || raw === "") return [];
  const ids = Array.isArray(raw) ? raw : [raw];
  const labels: string[] = [];
  for (const id of ids) {
    const label = field.list.get(String(id));
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

export type DealUserFieldCatalog = {
  /** The resolved fields — loaded once from the portal, then cached. */
  resolution(): Promise<DealUserFieldResolution>;
};

/**
 * Live per-portal resolver, loaded once and cached — the user-field twin of
 * createStageCatalog. One paged read of crm.deal.userfield.list per sync run;
 * on any failure the resolution stays empty (all nulls) and the sync skips
 * the UF mappings for that run rather than failing the whole deals pass.
 * Read-only: `.list` passes the SOURCE_READ_ONLY guard.
 */
export function createDealUserFieldCatalog(client: Bitrix24Client): DealUserFieldCatalog {
  let cached: Promise<DealUserFieldResolution> | null = null;
  return {
    resolution() {
      cached ??= (async () => {
        const rows: BitrixUserFieldRow[] = [];
        try {
          // Offset-paginated (this method answers `next`, not an ID cursor),
          // capped — a portal has dozens of deal UFs, not thousands.
          let start: number | undefined;
          for (let page = 0; page < 10; page++) {
            const res = await client.call<BitrixUserFieldRow[]>(
              "crm.deal.userfield.list",
              start === undefined ? {} : { start }
            );
            if (!Array.isArray(res.result) || res.result.length === 0) break;
            rows.push(...res.result);
            if (typeof res.next !== "number") break;
            start = res.next;
          }
        } catch {
          // Leave empty — every mapping resolves null and is skipped cleanly.
        }
        return resolveDealUserFields(rows);
      })();
      return cached;
    },
  };
}

// ─── Deal semantic fields (the data the original import DROPPED) ─────────────
// Verified live on the sales portal (deal 188502, 2026-08): the Bitrix deal
// carries an AI summary of client needs in COMMENTS, the loss reason /
// language / car-model enums in UF fields, the social profile in
// SOURCE_DESCRIPTION, and the stage-movement audit in MOVED_*. The original
// mapping kept ~10 admin fields and threw all of this away.

/**
 * English display labels for the KNOWN Russian enumeration values — used for
 * Twenty SELECT option labels. This is presentation only, NOT the option set:
 * the set itself is enumerated from the portal's userfield.list at deploy time,
 * and any value missing here simply keeps its raw Russian label.
 */
export const MIRROR_SEMANTIC_EN_LABELS: Record<string, string> = {
  // Loss reasons (sales portal, crm.deal.userfield.list 2026-08).
  "Не отвечает": "No answer",
  "Большая стоимость автомобиля": "Car price too high",
  "Нужен автомобиль старше 2021": "Needs a car older than 2021",
  "Не хватает денег на первый взнос": "Cannot afford the down payment",
  "Не хватает на ежемесячный платеж": "Cannot afford the monthly payment",
  "Отложил покупку на длительное время": "Postponed the purchase",
  // Language segments.
  "Англоязычные": "English-speaking",
  "Русскоязычные": "Russian-speaking",
  "Арабы": "Arabic-speaking",
};

export function mirrorSemanticEnglishLabel(value: string): string {
  return MIRROR_SEMANTIC_EN_LABELS[value] ?? value;
}

/**
 * ASCII option VALUES for the Twenty SELECTs — Twenty rejects Cyrillic option
 * values (METADATA_VALIDATION_ERROR, verified live 2026-08-07), so the match
 * key is a stable code and the Russian text lives in the option label.
 * Unknown raw values collapse to OTHER — never invented per-run codes, so the
 * option set stays bounded.
 */
export const MIRROR_SEMANTIC_VALUE_CODES: Record<string, string> = {
  // Loss reasons (sales portal, crm.deal.userfield.list 2026-08).
  "Не отвечает": "NO_ANSWER",
  "Большая стоимость автомобиля": "CAR_TOO_EXPENSIVE",
  "Нужен автомобиль старше 2021": "WANTS_OLDER_CAR",
  "Не хватает денег на первый взнос": "NO_DOWN_PAYMENT",
  "Не хватает на ежемесячный платеж": "NO_MONTHLY_BUDGET",
  "Отложил покупку на длительное время": "POSTPONED",
  "Купил в другом месте": "BOUGHT_ELSEWHERE",
  "Передумал": "CHANGED_MIND",
  "Попросили спросить": "JUST_ASKING",
  "Позвонил по ошибке": "WRONG_NUMBER",
  "Вопрос к СБ/АО": "SECURITY_QUERY",
  "комментарий / дубль": "DUPLICATE",
  "Не устраивает переплата": "OVERPAYMENT_TOO_HIGH",
  "Нецелевые лиды": "NOT_TARGET",
  "Не интересует, не устроил подбор/проверка": "NOT_INTERESTED",
  "Обзвон успешных лидов": "WON_FOLLOWUP",
  // Language segments.
  "Англоязычные": "ENGLISH_SPEAKING",
  "Русскоязычные": "RUSSIAN_SPEAKING",
  "Арабы": "ARABIC_SPEAKING",
};

export function mirrorSemanticValueCode(value: string): string {
  return MIRROR_SEMANTIC_VALUE_CODES[value] ?? "OTHER";
}

export interface BitrixDealSemanticFields {
  sourceComments?: string;
  sourceDescription?: string;
  lossReason?: string;
  carModels?: string;
  languageSegment?: string;
  returnCustomer?: boolean;
  sourceMovedAt?: Date;
  sourceMovedById?: string;
}

/**
 * The semantic deal fields, as optional keys: a key is PRESENT only when
 * Bitrix actually carries a value, so the sync can spread the result into both
 * INSERT and UPDATE without ever wiping a stored value with null (the same
 * absent-vs-null discipline the deals branch applies to stageDetail). Pure —
 * the per-portal UF resolution is handed in, not fetched.
 */
export function mapBitrixDealSemanticFields(
  bx: BitrixCrmRecord,
  uf: DealUserFieldResolution
): BitrixDealSemanticFields {
  const out: BitrixDealSemanticFields = {};

  // Deal COMMENTS hold the BitrixGPT summary of client needs. Stored in its
  // OWN column (deal.source_comments), never in deal.notes — notes belongs to
  // the platform (see mapBitrixDealToDeal), this is Bitrix's text.
  const comments = bx.COMMENTS?.trim();
  if (comments) out.sourceComments = comments;

  const sourceDescription = bx.SOURCE_DESCRIPTION?.trim();
  if (sourceDescription) out.sourceDescription = sourceDescription;

  const lossReason = enumLabels(uf.lossReason, uf.lossReason ? bx[uf.lossReason.fieldName] : null);
  if (lossReason.length > 0) out.lossReason = lossReason[0];

  const language = enumLabels(uf.language, uf.language ? bx[uf.language.fieldName] : null);
  if (language.length > 0) out.languageSegment = language[0];

  // Multi-enumeration → one searchable text ("Kia Cerato; Kia K5"). Twenty's
  // SELECT-multiple over the API is brittle; TEXT keeps every value.
  const cars = enumLabels(uf.carModels, uf.carModels ? bx[uf.carModels.fieldName] : null);
  if (cars.length > 0) out.carModels = cars.join("; ");

  // "Y"/"N" — either flag names a return client. Absent when Bitrix sends
  // neither, so an update never invents false for a deal Bitrix didn't mark.
  const flag = bx.IS_RETURN_CUSTOMER ?? bx.IS_REPEATED_APPROACH;
  if (flag === "Y" || flag === "N") out.returnCustomer = flag === "Y";

  if (bx.MOVED_TIME) {
    const movedAt = new Date(String(bx.MOVED_TIME));
    if (!Number.isNaN(movedAt.getTime())) out.sourceMovedAt = movedAt;
  }
  if (bx.MOVED_BY_ID != null && String(bx.MOVED_BY_ID) !== "" && String(bx.MOVED_BY_ID) !== "0") {
    out.sourceMovedById = String(bx.MOVED_BY_ID);
  }

  return out;
}
