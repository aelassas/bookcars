// Read-only mirror of wa-observer/bridge.js's `isSendEnabled()` — same two
// env vars, same logic — so the CRM chat composer can show an HONEST
// "queued, sending is paused" state instead of implying a reply will go out
// immediately. See bridge.js header comment for the source of truth.
//
// CAVEAT (cannot be verified from this worktree — no build/runtime access):
// the Next.js server process and the wa-observer bridge process are separate
// Node processes on the same box. This is only accurate if both load the
// same WA_SEND_ENABLED[_<BRAND>] values (shared .env / pm2 env, per the
// deployment notes in CLAUDE.md). Treat this as best-effort UI honesty, not
// a guarantee — the drain loop's own env is the actual source of truth.
export function isBrandSendEnabled(brandLine: string): boolean {
  const brandKey = "WA_SEND_ENABLED_" + brandLine.toUpperCase().replace(/-/g, "_");
  return process.env.WA_SEND_ENABLED === "true" && process.env[brandKey] !== "false";
}
