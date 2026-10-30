/**
 * rotation.ts — the rental main-line lead DISTRIBUTION logic (pure).
 *
 * Ayham's spec (2026-09): the two rental "main lines" — etm-website
 * (+971564048816, ETM) and cardiwan (+971569808087, Cardiwan) — are where new
 * leads arrive. A new lead on a main line is dealt round-robin to the next
 * AVAILABLE agent of that brand's rotation; an agent who does not act inside
 * the acceptance window loses the card to the next available agent, and the
 * manager is told about every step over WhatsApp.
 *
 * Everything here is PURE — no DB, no Twenty, no env reads outside the one
 * config loader (which takes the env as an argument so tests pin it). The DB
 * store lives in modules/availability/store.ts, the twenty_mirror_state
 * persistence in wa-lead-relay.ts (createRentalDistributionStore), the sweeper
 * pass in platform/notify/rental-distributor.ts.
 *
 * Rosters are CONFIG, never code: RENTAL_ROTATION_ETM / RENTAL_ROTATION_CARDIWAN
 * hold "Name:9715…,Name2:9715…". The kill-switch is RENTAL_DISTRIBUTOR=off —
 * the runner then never wires the desk and the relay keeps today's fixed
 * line-owner behaviour, byte-identical.
 */

// ─── Rotation identity ──────────────────────────────────────────────────────

/** The two brand rotations. Keys are stable — they key cursors and state. */
export type RentalRotationKey = "etm" | "cardiwan";

/**
 * Main line slug → its brand rotation. These two slugs are the PUBLIC numbers
 * (wa.me on the websites) — see modules/messaging/lines.ts. Any other rental
 * line keeps line-owner routing; only main lines distribute.
 */
export const RENTAL_MAIN_LINES: Readonly<Record<string, RentalRotationKey>> = {
  "etm-website": "etm",
  cardiwan: "cardiwan",
};

/** The brand rotation a line feeds, or null when it is not a main line. */
export function mainLineRotation(lineSlug: string | null | undefined): RentalRotationKey | null {
  if (!lineSlug) return null;
  return RENTAL_MAIN_LINES[lineSlug] ?? null;
}

// ─── Roster config ──────────────────────────────────────────────────────────

/** One agent in a brand rotation. `memberId` is filled by the runner once the
 *  name is resolved against the rental workspace (matchMemberForAgent). */
export interface RotationAgent {
  /** Display name as typed in the env roster ("Ali"). */
  name: string;
  /** Full phone digits (no '+') — the agent's own WhatsApp. */
  phone: string;
  /** Rental workspaceMember id; null until/unless the name resolves. */
  memberId: string | null;
}

/**
 * Parse one RENTAL_ROTATION_* value: "Ali:971542445835, Babek:971529965085".
 * Malformed entries (no name, no digits) are dropped and reported — a typo in
 * the roster must shrink the rotation, never crash the relay.
 */
export function parseRoster(raw: string | null | undefined): { agents: RotationAgent[]; dropped: string[] } {
  const agents: RotationAgent[] = [];
  const dropped: string[] = [];
  for (const pair of (raw ?? "").split(",")) {
    const entry = pair.trim();
    if (!entry) continue;
    const idx = entry.indexOf(":");
    const name = (idx === -1 ? entry : entry.slice(0, idx)).trim();
    const phone = (idx === -1 ? "" : entry.slice(idx + 1)).replace(/\D/g, "");
    if (!name || phone.length < 9) {
      dropped.push(entry);
      continue;
    }
    agents.push({ name, phone, memberId: null });
  }
  return { agents, dropped };
}

/** Everything the distributor needs from the environment, in one object. */
export interface RentalDistributorConfig {
  /** false = RENTAL_DISTRIBUTOR=off — the runner wires NO desk at all. */
  enabled: boolean;
  rosters: Record<RentalRotationKey, RotationAgent[]>;
  /** Roster entries dropped as malformed (the runner logs them LOUD). */
  dropped: string[];
  /** Brand manager display names (resolved to member ids by the runner). */
  managerNames: Record<RentalRotationKey, string | null>;
  /** Brand manager WhatsApp digits (MANAGER_WA_ETM / MANAGER_WA_CARDIWAN). */
  managerPhones: Record<RentalRotationKey, string | null>;
  /** ONE sender line for internal notifications (RENTAL_NOTIFY_LINE) — Ayham
   *  2026-09-17: pings from every main line read as chaos; a single "bot" line
   *  sends them all. null = send from the lead's own main line (old behaviour).
   *  The CUSTOMER auto-reply always stays on the main line. */
  notifyLine: string | null;
  /** The one auto-reply the customer gets (RENTAL_AUTOREPLY_TEXT). */
  autoReplyText: string;
  /** false = RENTAL_AUTOREPLY=off — the CRM sends NO greeting at all.
   *  Ayham 2026-09-19: he runs the native WhatsApp Business greeting on the
   *  main lines (instant, from the phone); ours arrived minutes later through
   *  the relay, so every new customer got TWO greetings. */
  autoReplyEnabled: boolean;
  /** Preferred agents for RETURNING customers (Ayham, 2026-09-24) —
   *  RENTAL_RETURNING_PREFERRED_ETM="Babek" / _CARDIWAN="Ali,Abdullah"; a
   *  comma list is a round-robin. Empty = no preference, straight to the
   *  rotation. Names resolve against the roster in the runner. */
  returningPreferred: Record<RentalRotationKey, string[]>;
  /** Quiet time before the same card may be distributed AGAIN
   *  (RENTAL_RETURNING_GAP_HOURS, default 12) — a chatty customer must not
   *  re-ping an agent on every message. */
  returningGapMs: number;
  /** true = RENTAL_RETURNING_AUTOREPLY=on — returning assignments ALSO send
   *  the customer greeting. Default OFF: a returning customer is
   *  mid-relationship, not a new lead. */
  returningAutoReplyEnabled: boolean;
  /** Acceptance window, ms (RENTAL_ACCEPT_TIMEOUT_MIN, default 10). */
  acceptWindowMs: number;
  /** How long "Busy" lasts, ms (RENTAL_BUSY_TTL_MIN, default 60). */
  busyTtlMs: number;
  /** Per-event manager/agent texts (env-overridable, see TEXT_ENV). */
  texts: DistributorTexts;
}

export interface DistributorTexts {
  /** To the assigned agent: {lead} {phone} {message} {brand}. */
  agentAssigned: string;
  /** To the agent on a RETURNING-customer assignment — names the lead number
   *  and says plainly this is not a new lead (Ayham, 2026-09-24). */
  agentReturning: string;
  /** Manager events: assigned / accepted / ignored / declined / reassigned / allBusy. */
  managerAssigned: string;
  /** Manager notice for a returning-customer assignment. */
  managerReturning: string;
  managerAccepted: string;
  managerIgnored: string;
  /** The agent DECLINED by replying 2/нет/pass (or the manager forced "next")
   *  — distinct from ignored: he answered, he just won't take it (Ayham,
   *  2026-09-19). */
  managerDeclined: string;
  managerReassigned: string;
  managerAllBusy: string;
}

/**
 * Appended IN CODE (never inside the env-overridable texts, so a
 * RENTAL_TEXT_* override cannot silently drop them) — Ayham 2026-09-19:
 * agents accept/decline by replying to the ping, the manager steers by
 * replying with the lead number. The sweeper reads those replies off the
 * bot/main line inbox each pass (rental-distributor.ts).
 */
export const AGENT_REPLY_HINT = "\nReply: 1 = accept · 2 = decline (or 👍)";
export const MANAGER_STEER_HINT =
  "\nReply: {lead} next — reassign · {lead} <name> — assign to someone.";

export const DEFAULT_AUTOREPLY_TEXT =
  "Thank you for contacting us! An agent will contact you shortly.";

export const DEFAULT_TEXTS: DistributorTexts = {
  agentAssigned:
    "🆕 Lead {lead} assigned to you ({brand}).\nCustomer: {phone}\nMessage: {message}\nPlease contact them within {minutes} min.",
  agentReturning:
    "🔁 Returning customer — Lead {lead} ({phone}) wrote again ({brand}).\nMessage: {message}\nPlease contact them within {minutes} min.",
  managerAssigned: "📥 Lead {lead} ({phone}) assigned to {agent} ({brand}).",
  managerReturning: "🔁 Returning customer — Lead {lead} ({phone}) assigned to {agent} ({brand}).",
  managerAccepted: "✅ Lead {lead} ({phone}) accepted by {agent} ({brand}).",
  managerIgnored: "⚠️ Lead {lead} ({phone}) — {agent} did not act within {minutes} min ({brand}).",
  managerDeclined: "🙅 Lead {lead} ({phone}) — {agent} declined ({brand}).",
  managerReassigned: "🔁 Lead {lead} ({phone}) reassigned to {agent} ({brand}).",
  managerAllBusy:
    "🚨 Lead {lead} ({phone}): ALL {brand} agents are busy/off — the card is in your queue, please assign manually.",
};

/** Template substitution for the texts above — unknown placeholders stay literal. */
export function renderText(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? m : String(v);
  });
}

// ─── Phone overrides + the merged roster view (Ayham, 2026-09-19) ───────────
// Roster phones were env-only, so a number change needed a deploy, and Ali /
// Abdullah render twice on /availability (they sit in BOTH brand rotations).
// The phone now has a DB override (agent_availability.phone, 0077) and the
// page shows ONE row per agent_key.

/** Normalize a manager-typed phone to digits, or null when unusable (<9). */
export function normalizePhoneOverride(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.length >= 9 ? d : null;
}

/**
 * DB phone override wins over the env-roster phone. Applied where the roster
 * is used for SENDING (the distributor's per-pass roster, the relay's roster
 * build), so a manager's /availability edit reaches the assignment pings
 * without an env change.
 */
export function applyPhoneOverrides<T extends RotationAgent>(
  roster: readonly T[],
  overrides: Record<string, string>
): T[] {
  return roster.map((a) => {
    const p = overrides[a.name.trim().toLowerCase()];
    return p ? { ...a, phone: p } : a;
  });
}

/** One /availability row per agent: brands merged, phone = DB override ?? env. */
export interface MergedRosterAgent {
  /** agent_key — the lowercased roster name. */
  key: string;
  name: string;
  /** Both brands when the agent sits in both rotations, env order. */
  brands: RentalRotationKey[];
  phone: string;
}

export function mergeRosterAgents(
  rosters: Record<RentalRotationKey, readonly RotationAgent[]>,
  phoneOverrides: Record<string, string | null> = {}
): MergedRosterAgent[] {
  const out: MergedRosterAgent[] = [];
  const byKey = new Map<string, MergedRosterAgent>();
  for (const brand of ["etm", "cardiwan"] as RentalRotationKey[]) {
    for (const a of rosters[brand] ?? []) {
      const key = a.name.trim().toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.brands.push(brand);
        continue;
      }
      const merged: MergedRosterAgent = {
        key,
        name: a.name,
        brands: [brand],
        phone: phoneOverrides[key] ?? a.phone,
      };
      byKey.set(key, merged);
      out.push(merged);
    }
  }
  return out;
}

function envText(env: NodeJS.ProcessEnv | Record<string, string | undefined>, name: string, fallback: string): string {
  const v = env[name]?.trim();
  return v ? v : fallback;
}

/** Positive-number env with a fallback (minutes, hours — the unit is the caller's). */
function envMinutes(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Default quiet time between two distributions of the SAME card. */
export const DEFAULT_RETURNING_GAP_MS = 12 * 3600_000;

/**
 * Parse one RENTAL_RETURNING_PREFERRED_* value: "Ali, Abdullah". No phones
 * here — preferred names resolve against the roster (which carries them) in
 * the runner; an unknown name is dropped LOUD there, never guessed.
 */
export function parseNameList(raw: string | null | undefined): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Read the whole distributor config from env. Pure (env passed in). The
 * kill-switch is `RENTAL_DISTRIBUTOR=off`; an empty/unparseable rotation is
 * NOT an error here — it yields an empty roster, and the caller falls back to
 * line-owner behaviour after logging loud.
 */
export function loadRentalDistributorConfig(
  env: Record<string, string | undefined> = process.env
): RentalDistributorConfig {
  const etm = parseRoster(env.RENTAL_ROTATION_ETM);
  const cardiwan = parseRoster(env.RENTAL_ROTATION_CARDIWAN);
  const managerPhone = (v: string | undefined) => {
    const d = (v ?? "").replace(/\D/g, "");
    return d.length >= 9 ? d : null;
  };
  return {
    enabled: env.RENTAL_DISTRIBUTOR?.trim() !== "off",
    rosters: { etm: etm.agents, cardiwan: cardiwan.agents },
    dropped: [...etm.dropped, ...cardiwan.dropped],
    managerNames: {
      // Ayham manages both rental brands (modules/board/owners.ts); overridable
      // per brand without a deploy.
      etm: env.RENTAL_MANAGER_ETM?.trim() || "Ayham",
      cardiwan: env.RENTAL_MANAGER_CARDIWAN?.trim() || "Ayham",
    },
    managerPhones: {
      etm: managerPhone(env.MANAGER_WA_ETM),
      cardiwan: managerPhone(env.MANAGER_WA_CARDIWAN),
    },
    notifyLine: env.RENTAL_NOTIFY_LINE?.trim() || null,
    autoReplyText: envText(env, "RENTAL_AUTOREPLY_TEXT", DEFAULT_AUTOREPLY_TEXT),
    autoReplyEnabled: env.RENTAL_AUTOREPLY?.trim() !== "off",
    returningPreferred: {
      etm: parseNameList(env.RENTAL_RETURNING_PREFERRED_ETM),
      cardiwan: parseNameList(env.RENTAL_RETURNING_PREFERRED_CARDIWAN),
    },
    returningGapMs: envMinutes(env, "RENTAL_RETURNING_GAP_HOURS", 12) * 3600_000,
    returningAutoReplyEnabled: env.RENTAL_RETURNING_AUTOREPLY?.trim() === "on",
    acceptWindowMs: envMinutes(env, "RENTAL_ACCEPT_TIMEOUT_MIN", 10) * 60_000,
    busyTtlMs: envMinutes(env, "RENTAL_BUSY_TTL_MIN", 60) * 60_000,
    texts: {
      agentAssigned: envText(env, "RENTAL_TEXT_AGENT_ASSIGNED", DEFAULT_TEXTS.agentAssigned),
      agentReturning: envText(env, "RENTAL_TEXT_AGENT_RETURNING", DEFAULT_TEXTS.agentReturning),
      managerAssigned: envText(env, "RENTAL_TEXT_MANAGER_ASSIGNED", DEFAULT_TEXTS.managerAssigned),
      managerReturning: envText(env, "RENTAL_TEXT_MANAGER_RETURNING", DEFAULT_TEXTS.managerReturning),
      managerAccepted: envText(env, "RENTAL_TEXT_MANAGER_ACCEPTED", DEFAULT_TEXTS.managerAccepted),
      managerIgnored: envText(env, "RENTAL_TEXT_MANAGER_IGNORED", DEFAULT_TEXTS.managerIgnored),
      managerDeclined: envText(env, "RENTAL_TEXT_MANAGER_DECLINED", DEFAULT_TEXTS.managerDeclined),
      managerReassigned: envText(env, "RENTAL_TEXT_MANAGER_REASSIGNED", DEFAULT_TEXTS.managerReassigned),
      managerAllBusy: envText(env, "RENTAL_TEXT_MANAGER_ALL_BUSY", DEFAULT_TEXTS.managerAllBusy),
    },
  };
}

// ─── Availability ───────────────────────────────────────────────────────────

export type AvailabilityStatus = "available" | "busy" | "off";

/** One agent's stored availability row (modules/availability/store.ts). */
export interface AgentAvailability {
  status: AvailabilityStatus;
  /** Set when status='busy' — the moment the busy period ends. */
  busyUntil: Date | null;
  /**
   * Weekly day off (JS weekday 0=Sun..6=Sat, DUBAI day) — auto-enforced:
   * the whole Dubai day the agent reads "off" whatever the toggle says.
   * Shift hours are deliberately NOT here — after-hours acceptance is a
   * manual toggle, per Ayham (2026-09-18). NULL/undefined = no day off.
   */
  dayOff?: number | null;
}

/** Dubai is UTC+4 year-round (no DST) — weekday arithmetic on the shifted clock. */
export function dubaiWeekday(now: Date): number {
  return new Date(now.getTime() + 4 * 3600_000).getUTCDay();
}

/**
 * The status that counts RIGHT NOW. Busy auto-expires at read time — there is
 * no janitor: a busy row whose busyUntil has passed IS available. Off-duty
 * never expires on its own; the agent flips it back. A configured weekly day
 * off (Dubai day) always wins over the toggle.
 */
export function effectiveStatus(a: AgentAvailability | null | undefined, now: Date): AvailabilityStatus {
  if (!a) return "available"; // no row = never touched the toggle = available
  if (a.dayOff != null && dubaiWeekday(now) === a.dayOff) return "off";
  if (a.status === "busy" && a.busyUntil && a.busyUntil.getTime() <= now.getTime()) {
    return "available";
  }
  return a.status;
}

/**
 * Whose turn is it, skipping the unavailable?
 *
 * `cursor` is the index of the NEXT candidate (unbounded, taken mod the roster
 * size — same semantics as the girls' cursor in wa-lead-relay.ts). Walks the
 * roster from the cursor and returns the first agent whose effective status is
 * "available", with the cursor pointing past them. `excludeNames` (the agent
 * who just ignored the card) are skipped even when available — a reassignment
 * must never hand the card back to the agent who let it age out.
 *
 * null = NOBODY is available → the caller falls to the manager's queue.
 */
export function nextAvailableAgent(
  roster: readonly RotationAgent[],
  availability: Record<string, AgentAvailability>,
  cursor: number | null,
  now: Date,
  excludeNames: ReadonlySet<string> = new Set()
): { agent: RotationAgent; nextCursor: number } | null {
  if (roster.length === 0) return null;
  const start = (((cursor ?? 0) % roster.length) + roster.length) % roster.length;
  for (let i = 0; i < roster.length; i++) {
    const idx = (start + i) % roster.length;
    const agent = roster[idx];
    if (excludeNames.has(agent.name.trim().toLowerCase())) continue;
    if (effectiveStatus(availability[agent.name.trim().toLowerCase()], now) !== "available") continue;
    return { agent, nextCursor: idx + 1 };
  }
  return null;
}

/**
 * Who gets a RETURNING customer (Ayham, 2026-09-24): the brand's PREFERRED
 * list first (RENTAL_RETURNING_PREFERRED_* — a comma list is its own little
 * round-robin with its own persisted cursor, so "Ali,Abdullah" alternates),
 * walked with the same availability rules as the rotation; when NO preferred
 * agent is available the normal rotation takes over unchanged. null = nobody
 * at all is available → the manager queue.
 *
 * The cursors are advanced by the CALLER, and only the one that was used —
 * a preferred pick leaves the rotation cursor alone and vice versa.
 */
export function planReturningPick(input: {
  preferred: readonly RotationAgent[];
  preferredCursor: number | null;
  roster: readonly RotationAgent[];
  rosterCursor: number | null;
  availability: Record<string, AgentAvailability>;
  now: Date;
}): { agent: RotationAgent; via: "preferred" | "rotation"; nextCursor: number } | null {
  const pref = nextAvailableAgent(input.preferred, input.availability, input.preferredCursor, input.now);
  if (pref) return { agent: pref.agent, via: "preferred", nextCursor: pref.nextCursor };
  const rot = nextAvailableAgent(input.roster, input.availability, input.rosterCursor, input.now);
  if (rot) return { agent: rot.agent, via: "rotation", nextCursor: rot.nextCursor };
  return null;
}
