/**
 * CallGear agent display names — English, clean of CRM baggage.
 *
 * The agent names CallGear sends were synced from Bitrix once and read like
 * "(bitrix24) Садыгов Бабек" or multi-agent dumps
 * "(bitrix24) L.L.C CARDIWAN, (bitrix24) sohiel Ali". The desk works in
 * English (owner, 2026-08-13: "keep it english not arabic or russian"), so
 * every surface that prints an agent (Twenty card's callAgentName, manager
 * one-liners) passes the raw string through here first.
 *
 * Pure + unit-tested. Unknown names pass through unchanged except the
 * "(bitrix24)" prefix strip — a readable Russian name beats an invented one.
 */

/** Known roster, keyed on the name AFTER the "(bitrix24)" prefix is stripped.
 *  Зазалаев Асхаб left the team (owner, 2026-08-13) — the mapping stays ONLY
 *  so his historical cards keep reading correctly; no new calls carry him.
 *  Abdullah moved from CallGear to FreePBX — his calls arrive as ast-* events
 *  with agent "ext-100X"; ext-1002 is his softphone (owner, 2026-08-14: he is
 *  the only FreePBX user and the test calls rang him). ext-1001 was the
 *  original server-side test extension — left unmapped so its events stay
 *  visibly anonymous instead of borrowing a person's name. */
const KNOWN_AGENTS: Readonly<Record<string, string>> = {
  "Садыгов Бабек": "Babek Sadygov",
  "sohiel Ali": "Ali Sohiel",
  "Зазалаев Асхаб": "Askhab Zazalaev (former)",
  "L.L.C CARDIWAN": "Cardiwan LLC",
  "Петров Иван Иванович": "Ivan Petrov",
  "ext-1002": "Abdullah",
};

const BITRIX_PREFIX = /^\(bitrix24\)\s*/i;

/** One agent token → display form. */
function cleanOne(raw: string): string {
  const stripped = raw.trim().replace(BITRIX_PREFIX, "").trim();
  if (!stripped) return "";
  return KNOWN_AGENTS[stripped] ?? stripped;
}

/**
 * Full agent string → English display form, or null when nothing usable
 * remains. Multi-agent dumps ("a, b, c") are cleaned per name and rejoined.
 */
export function displayAgentName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map(cleanOne)
    .filter((p): p is string => !!p);
  // Dedupe keeps order: "(bitrix24) sohiel Ali, (bitrix24) sohiel Ali" → one.
  const unique = [...new Set(parts)];
  return unique.length ? unique.join(", ") : null;
}

export interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Display agent name → Twenty workspaceMember id (owner 2026-08-14: "if Babek
 * answered, the lead states Babek — the guys filter by who's doing what").
 * Exact "First Last" first; else a UNIQUE first-name match (Babek / Ali /
 * Abdullah are unique on the rental board). Unknown or ambiguous = null:
 * never guess an owner — an unowned card is assigned by hand, a wrongly-owned
 * card poisons the per-person filter the whole feature exists for.
 */
export function matchMemberForAgent(
  displayName: string | null | undefined,
  members: readonly MemberRef[]
): string | null {
  if (!displayName) return null;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const target = norm(displayName);
  if (!target) return null;
  const exact = members.filter((m) => norm(`${m.firstName} ${m.lastName}`) === target);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;
  const first = target.split(" ")[0];
  const byFirst = members.filter((m) => norm(m.firstName) === first);
  return byFirst.length === 1 ? byFirst[0].id : null;
}
