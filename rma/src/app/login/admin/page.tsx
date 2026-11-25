"use client";

import LoginForm, { type Wordmark } from "@/components/auth/LoginForm";

// Admin / owner door — email + Telegram + magic link. Staff use the simple
// name+PIN roster at /login; this is kept for accounts that sign in by email.
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM_NAME || "MyCRM";
const PLATFORM_PARTS = PLATFORM.match(/^(My)(.+)$/i);
const WORDMARK: Wordmark = PLATFORM_PARTS
  ? { accent: PLATFORM_PARTS[1], rest: PLATFORM_PARTS[2] }
  : { accent: "", rest: PLATFORM };

export default function AdminLoginPage() {
  return <LoginForm wordmark={WORDMARK} titleName={PLATFORM} telegram={{ mode: "premium" }} />;
}
