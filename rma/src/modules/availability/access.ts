/**
 * access.ts — who may open /availability and toggle rotation agents.
 *
 * Same PIN session as /lines (modules/lines/access.ts — name + 4-digit PIN,
 * next-auth credentials). The audience is wider, though: every agent IN a
 * rental rotation (RENTAL_ROTATION_* env) may toggle THEIR OWN row, and the
 * privileged set (platform admin OR LINES_ADMIN_NAMES) may toggle anyone's.
 *
 * The page redirects to /login when this returns null; the API routes answer
 * 404 — the rotations' composition is not advertised to outsiders.
 *
 * auth()/authorization are imported LAZILY inside canUseAvailability (the
 * modules/lines/access.ts pattern): a top-level import chains into next-auth
 * → next/server, which vitest cannot resolve — and the pure helper below is
 * unit-tested.
 */
import { loadRentalDistributorConfig } from "@/modules/rental/rotation";
import { nameCanManageLines } from "@/modules/lines/access";

export type AvailabilityAccess = {
  userId: string;
  name: string | null;
  /** Roster display names this session may toggle. */
  allowedNames: string[];
  /** True for managers/admins — the panel lets them pick any roster name. */
  canPickAny: boolean;
};

/** Roster display names from the live env config (both brand rotations). */
export function rotationAgentNames(
  env: Record<string, string | undefined> = process.env
): string[] {
  const cfg = loadRentalDistributorConfig(env);
  const seen = new Set<string>();
  const names: string[] = [];
  for (const a of [...cfg.rosters.etm, ...cfg.rosters.cardiwan]) {
    const key = a.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(a.name);
  }
  return names;
}

/**
 * Which roster names a session may toggle. Privilege wins FIRST (a manager who
 * is also in the rotation — Ayham added as a test agent 2026-09-19 — must keep
 * the manager view; checking "own row" first silently stripped his Edit/agent
 * picker the moment his name joined the roster). A non-privileged agent whose
 * PIN-login name is a roster name gets exactly their own row. Anything else is
 * denied. Pure, unit-tested; canUseAvailability adds the session + privilege.
 */
export function allowedAvailabilityNames(
  sessionName: string | null | undefined,
  rosterNames: readonly string[],
  privileged: boolean
): { allowedNames: string[]; canPickAny: boolean } | null {
  const norm = (s: string) => s.trim().toLowerCase();
  if (privileged) return { allowedNames: [...rosterNames], canPickAny: true };
  const own = sessionName ? rosterNames.find((n) => norm(n) === norm(sessionName)) : undefined;
  if (own) return { allowedNames: [own], canPickAny: false };
  return null;
}

/** Returns the acting user when allowed, null otherwise. Every /availability
 *  route re-checks this — the page's redirect is convenience, not the boundary. */
export async function canUseAvailability(): Promise<AvailabilityAccess | null> {
  const { auth } = await import("@/platform/auth");
  const { isPlatformAdmin } = await import("@/platform/auth/authorization");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const name = session.user?.name ?? null;
  const roster = rotationAgentNames();
  const privileged = (await isPlatformAdmin(userId)) || nameCanManageLines(name);
  const allowed = allowedAvailabilityNames(name, roster, privileged);
  if (!allowed) return null;
  return { userId, name, ...allowed };
}
