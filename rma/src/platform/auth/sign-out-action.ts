"use server";

import { redirect } from "next/navigation";
import { signOut } from "./index";

/**
 * Real sign-out for server-rendered contexts that cannot use
 * next-auth/react's client-side `signOut()` (e.g. the suspended-tenant
 * screen in the tenant layout, which is a server component). Clears the
 * session cookie/JWT server-side — unlike a bare `<a href="/login">`,
 * which left the JWT intact and let the user land back in an authenticated
 * state without re-entering credentials.
 *
 * `redirect: false` + a next/navigation redirect (not signOut's own
 * `redirectTo`) keeps this host-agnostic: NextAuth would resolve the redirect
 * to http://localhost:3000/login (AUTH_URL is deliberately unset — see
 * server.cjs), which is broken on the LAN/tailscale hosts. signOut still clears
 * the cookie; the relative redirect below stays on the user's current host.
 * Same rationale as lib/auth/host-agnostic-sign-out.ts for the client paths.
 */
export async function serverSignOut(): Promise<void> {
  await signOut({ redirect: false });
  redirect("/login");
}
