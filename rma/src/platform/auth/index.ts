import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/platform/db/client";
import {
  user,
  account,
  session,
  verificationToken,
  tenantMember,
  tenant,
  platformAdmin,
  loginCode,
  loginRequest,
} from "@/platform/db/schema";
import { magicLinkProvider } from "./email-provider";
import { authorizeFloorName } from "./floor-login";
import {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure,
  LOGIN_LOCK_MAX_FAILURES,
} from "@/platform/security/login-lockout";
import { eq, and, desc, gt, isNull, isNotNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Access allow-list. A sign-in (magic link OR credentials) is permitted
 * ONLY for an email that already belongs to a known user who is either a
 * platform admin or a member of at least one active/trial tenant.
 *
 * This is what keeps the platform private: a random person who knows the
 * URL cannot request a link or auto-create an account. Suspending a tenant
 * (status != active/trial) immediately revokes its members' access.
 */
export async function canEmailSignIn(rawEmail: string | null | undefined): Promise<boolean> {
  const email = rawEmail?.toLowerCase().trim();
  if (!email) return false;
  // Case-INSENSITIVE match: staff emails are stored as typed (Ab7Abdullah@…,
  // Alisohielrent@…, Mohmdimad7@…) but this gate lowercases the input — a
  // plain eq() then silently fails and locks every capitalised-email user out
  // of EVERY sign-in path (found 2026-07-24: Abdullah/Ali/Mohammad couldn't
  // floor-login). Compare lower(stored) = lower(input).
  const [u] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);
  if (!u) return false; // unknown email — never sent a link, never created

  const [pa] = await db
    .select({ userId: platformAdmin.userId })
    .from(platformAdmin)
    .where(eq(platformAdmin.userId, u.id))
    .limit(1);
  if (pa) return true;

  const memberships = await db
    .select({ status: tenant.status })
    .from(tenantMember)
    .innerJoin(tenant, eq(tenantMember.tenantId, tenant.id))
    .where(eq(tenantMember.userId, u.id));
  return memberships.some((m) => m.status === "active" || m.status === "trial");
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  // JWT strategy is required for the Credentials provider — Auth.js v5
  // refuses database sessions for credentials logins. JWT works for
  // both credentials and magic link, so it's our single strategy.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    newUser: "/onboarding",
  },
  providers: [
    magicLinkProvider(),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const rows = await db
          .select()
          .from(user)
          .where(sql`lower(${user.email}) = ${email}`)
          .limit(1);
        const u = rows[0];
        if (!u || !u.password) return null;

        const valid = await bcrypt.compare(password, u.password);
        if (!valid) return null;

        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
        };
      },
    }),
    // Telegram OTP — additional identity factor (email is dead in this
    // deployment). Codes are requested via
    // platform/src/modules/auth-otp/actions.ts#requestLoginCode, which is
    // itself gated by canEmailSignIn() and rate-limited. This authorize()
    // re-checks canEmailSignIn() independently — a provider must never trust
    // that a code exists as proof of eligibility, since the allow-list can
    // change between request and verify (e.g. tenant suspended in between).
    Credentials({
      id: "telegram-otp",
      name: "Telegram code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const code = String(credentials.code).trim();
        if (!code) return null;

        if (!(await canEmailSignIn(email))) return null;

        const rows = await db
          .select()
          .from(user)
          .where(sql`lower(${user.email}) = ${email}`)
          .limit(1);
        const u = rows[0];
        if (!u) return null;

        // Newest outstanding (unconsumed, unexpired) code for this user.
        // login_code has no createdAt column — expiresAt is a fixed 5-min
        // offset from issuance, so ordering by it descending is equivalent.
        const [pending] = await db
          .select()
          .from(loginCode)
          .where(
            and(
              eq(loginCode.userId, u.id),
              isNull(loginCode.consumedAt),
              gt(loginCode.expiresAt, new Date())
            )
          )
          .orderBy(desc(loginCode.expiresAt))
          .limit(1);

        if (!pending) return null;
        if (pending.attempts >= 5) return null;

        const valid = await bcrypt.compare(code, pending.codeHash);
        if (!valid) {
          await db
            .update(loginCode)
            .set({ attempts: pending.attempts + 1 })
            .where(eq(loginCode.id, pending.id));
          return null;
        }

        await db
          .update(loginCode)
          .set({ consumedAt: new Date() })
          .where(eq(loginCode.id, pending.id));

        // Same shape as the password provider's return so jwt/session
        // callbacks (incl. mustChangePassword) work unchanged.
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
        };
      },
    }),
    // Telegram PREMIUM login — one-tap, no code typing. The login page
    // creates a `login_request` (auth-otp/actions.ts#startTelegramLogin),
    // opens the bot deep link, and polls until otp-bot/bot.js flips the row
    // to status:"authenticated" (either an already-linked chat, or a fresh
    // phone-number match). Only THEN does the client call this provider
    // with the token — authorize() re-validates the row itself (status,
    // expiry, user_id present) rather than trusting the client, and
    // consumes it atomically so a token is single-use. canEmailSignIn() is
    // re-checked here too, same reasoning as telegram-otp above: a code (or
    // in this case, an authenticated request) existing is never itself
    // proof of eligibility, since the allow-list can change between the bot
    // authenticating the request and the browser redeeming it.
    Credentials({
      id: "telegram-session",
      name: "Telegram",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token ? String(credentials.token).trim() : "";
        if (!token) return null;

        const [pending] = await db
          .select()
          .from(loginRequest)
          .where(
            and(
              eq(loginRequest.token, token),
              eq(loginRequest.status, "authenticated"),
              isNotNull(loginRequest.userId),
              gt(loginRequest.expiresAt, new Date())
            )
          )
          .limit(1);

        if (!pending || !pending.userId) return null;

        // Single-use: consume immediately, before touching anything else,
        // so a raced double-redeem of the same token can authorize at most
        // once.
        await db
          .update(loginRequest)
          .set({ status: "consumed" })
          .where(eq(loginRequest.id, pending.id));

        const rows = await db.select().from(user).where(eq(user.id, pending.userId)).limit(1);
        const u = rows[0];
        if (!u) return null;
        if (!(await canEmailSignIn(u.email))) return null;

        // Same shape as the password provider's return so jwt/session
        // callbacks (incl. mustChangePassword) work unchanged.
        return {
          id: u.id,
          email: u.email,
          name: u.name,
          image: u.image,
        };
      },
    }),
    // «Floor login» — passwordless, LAN-only. Staff open /login/<slug>/enter,
    // tap their name, and this provider mints their session; the office LAN is
    // the accepted trust boundary (owner order 2026-07-24). All the real
    // gating — FLOOR_LOGIN_ENABLED + sales-line-only membership — lives in
    // authorizeFloorName(), extracted so it is unit-tested in isolation; an
    // admin/CEO account can never come through here. Shaped exactly like
    // telegram-session above so the jwt/session callbacks are unchanged. The
    // top-level signIn() callback still re-checks canEmailSignIn() as for
    // every other provider.
    Credentials({
      id: "floor-name",
      name: "Floor",
      credentials: {
        userId: { label: "User", type: "text" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials) {
        return authorizeFloorName({
          userId: credentials?.userId,
          tenantSlug: credentials?.tenantSlug,
        });
      },
    }),
    // Name + PIN — the simple staff door (owner order 2026-07-26): sign in by
    // your NAME and a 4-digit PIN, works remotely over Tailscale (the PIN is the
    // auth factor, so no office-LAN gate) and for every role (managers included,
    // unlike floor-name). The name must be unique — an ambiguous match is denied.
    // Failed attempts are throttled per normalized name by login-lockout.ts
    // (5 misses → 15-min lock, checked before the PIN is even compared).
    Credentials({
      id: "name-pin",
      name: "Name + PIN",
      credentials: {
        name: { label: "Name", type: "text" },
        pin: { label: "PIN", type: "password" },
      },
      async authorize(credentials) {
        const name = String(credentials?.name ?? "").trim();
        const pin = String(credentials?.pin ?? "");
        if (!name || !pin) return null;

        // Per-account lockout (audit: name+PIN had no throttling — a 4-digit
        // PIN falls to unthrottled brute force in minutes). Keyed by the
        // NORMALIZED name (same trim/lower the lookup uses), so casing games
        // don't dodge the counter. The lock check runs BEFORE any DB/PIN
        // work: a locked name refuses every attempt with the same null, so a
        // correct PIN during the lock window is indistinguishable from a
        // wrong one — no timing oracle, no "the lock told me the PIN was
        // right" leak.
        const key = name.toLowerCase();
        if (isLoginLocked(key).locked) return null;

        // Any refusal for this name counts toward the lock; deny is always a
        // bare null (same as before), never revealing whether the account
        // exists or the name is locked.
        const fail = () => {
          const r = recordLoginFailure(key);
          if (r.justLocked) {
            console.warn(
              `[name-pin] login locked for 15m after ${LOGIN_LOCK_MAX_FAILURES} failed attempts`,
              { name: key }
            );
          }
          return null;
        };

        const rows = await db
          .select()
          .from(user)
          .where(sql`lower(${user.name}) = ${key}`)
          .limit(2);
        if (rows.length !== 1) return fail(); // unknown or ambiguous name
        const u = rows[0];
        if (!u.password) return fail();
        if (!(await bcrypt.compare(pin, u.password))) return fail();
        clearLoginFailures(key);
        return { id: u.id, email: u.email, name: u.name, image: u.image };
      },
    }),
  ],
  callbacks: {
    // Gate EVERY sign-in (magic link + credentials) against the allow-list.
    // For the email provider this runs before the link is sent, so unknown
    // emails get nothing. Returning false denies access.
    async signIn({ user: u }) {
      return canEmailSignIn(u?.email);
    },
    // First sign-in: stash user.id into the JWT. Subsequent requests
    // get it back via token.sub without another DB lookup.
    //
    // mustChangePassword (P0-2/P0-3): refreshed from the DB on sign-in and
    // on explicit `update()` calls (the account/password form calls update()
    // after a successful set/change so the redirect loop clears without
    // waiting for the JWT to expire). It is intentionally NOT refreshed on
    // every request — that would cost a DB round-trip per page load — so an
    // admin-initiated reset on an already-live session only takes effect on
    // that session's next sign-in or explicit update().
    async jwt({ token, user: u, trigger }) {
      if (u?.id) {
        token.sub = u.id;
        const [row] = await db
          .select({ mustChangePassword: user.mustChangePassword })
          .from(user)
          .where(eq(user.id, u.id))
          .limit(1);
        token.mustChangePassword = row?.mustChangePassword ?? false;
      } else if (trigger === "update" && token.sub) {
        const [row] = await db
          .select({ mustChangePassword: user.mustChangePassword })
          .from(user)
          .where(eq(user.id, token.sub))
          .limit(1);
        token.mustChangePassword = row?.mustChangePassword ?? false;
      }
      return token;
    },
    // Under JWT strategy the `user` arg is undefined; pull id from token.
    async session({ session: s, token }) {
      if (s.user && token?.sub) {
        s.user.id = token.sub;
        s.user.mustChangePassword = token.mustChangePassword ?? false;
      }
      return s;
    },
  },
});
