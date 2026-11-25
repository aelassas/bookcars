import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      // Auth Wave 1 (P0-2/P0-3) — forces /account/password until cleared.
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    mustChangePassword?: boolean;
  }
}
