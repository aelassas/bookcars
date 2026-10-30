/**
 * access.ts — who may open /lines and call its API routes.
 *
 * Signed-in AND (platform admin OR the session user's name is in the
 * LINES_ADMIN_NAMES env allowlist, comma-separated, case-insensitive). The
 * audience is the owner + on-site manager(s) — the same name+PIN accounts the
 * hub uses, so the allowlist matches on the lowercased display name.
 *
 * The page redirects to /login when this returns null; the API routes answer
 * 404 (an unmapped route — the roster's existence is not advertised).
 *
 * auth()/authorization are imported LAZILY inside canManageLines: a top-level
 * import chains into next-auth → next/server, which vitest cannot resolve —
 * and the pure helpers above are unit-tested. (Every other module that needs
 * auth imports it directly; only the testability requirement differs here.)
 */
export type LinesAccess = { userId: string; name: string | null };

/** Parsed LINES_ADMIN_NAMES value — trimmed, lowercased, empties dropped. */
export function linesAdminNames(env: string | undefined = process.env.LINES_ADMIN_NAMES): string[] {
  return (env ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Pure name check, unit-tested; canManageLines adds the session + admin halves. */
export function nameCanManageLines(
  name: string | null | undefined,
  env?: string
): boolean {
  if (!name) return false;
  return linesAdminNames(env).includes(name.trim().toLowerCase());
}

/** Returns the acting user when allowed, null otherwise. Every /lines route
 *  re-checks this — the page's redirect is convenience, not the boundary. */
export async function canManageLines(): Promise<LinesAccess | null> {
  const { auth } = await import("@/platform/auth");
  const { isPlatformAdmin } = await import("@/platform/auth/authorization");
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const name = session.user?.name ?? null;
  if (await isPlatformAdmin(userId)) return { userId, name };
  if (nameCanManageLines(name)) return { userId, name };
  return null;
}
