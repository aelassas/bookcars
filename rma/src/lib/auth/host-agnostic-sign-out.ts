"use client";

import { signOut } from "next-auth/react";

/**
 * Sign out and land on /login ON THE CURRENT HOST.
 *
 * NextAuth v5 resolves callbackUrl/redirectTo against a base URL that, in this
 * deployment, comes back as `http://localhost:3000` no matter which host the
 * user actually typed (office LAN IP / tailscale / .local / localhost). AUTH_URL
 * is deliberately unset so auth stays host-agnostic (see server.cjs, which
 * injects X-Forwarded-Host), so we must never let NextAuth issue the redirect —
 * it would bounce the user to localhost, which is broken on their machine. This
 * is the sign-OUT twin of LoginForm#redirectAfterSignIn, which strips the host
 * off the sign-IN result for the same reason.
 *
 * `redirect: false` still clears the session cookie server-side (the
 * /api/auth/signout response carries the Max-Age=0 Set-Cookie); we then navigate
 * with a relative URL, which the browser resolves against the current host.
 */
export async function hostAgnosticSignOut(): Promise<void> {
  await signOut({ redirect: false });
  window.location.href = "/login";
}
