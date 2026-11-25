// A redeploy invalidates the Server Action ids held by already-open tabs, so
// the next form submit from such a tab POSTs an id the new build has never
// heard of. Next answers 404 + NEXT_ACTION_NOT_FOUND_HEADER and the client
// router throws UnrecognizedActionError (E715) — which, unhandled, looks to
// the user like the form silently cleared itself and lost their work.
//
// Staff hit this after every deploy, so the app treats it as a recoverable
// staleness signal rather than an error: reload once and the tab is current.

/** True when `err` is Next's "this action id is from another build" error. */
export function isStaleActionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  // Preferred signal: Next stamps a stable error code that survives
  // minification, unlike the message text.
  if ((err as { __NEXT_ERROR_CODE?: unknown }).__NEXT_ERROR_CODE === "E715") return true;

  // Fallback for wrapped/rethrown errors where the code was dropped. Both
  // phrasings appear across Next's server and client paths.
  const message = (err as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return (
    message.includes("Failed to find Server Action") ||
    message.includes("was not found on the server")
  );
}

// Guard against a reload loop: if reloading did not resolve it (a genuinely
// broken deploy, say), show the error instead of cycling the tab forever.
const RELOAD_MARKER = "takeauto:stale-action-reloaded";

/**
 * Reloads once to pick up the current build. Returns false if we already
 * tried within this tab's session, so callers can fall back to showing the
 * error rather than looping.
 */
export function reloadForStaleAction(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(RELOAD_MARKER)) return false;
    window.sessionStorage.setItem(RELOAD_MARKER, String(Date.now()));
  } catch {
    // Private mode / storage disabled: reloading once is still better than
    // leaving the user staring at a silently emptied form.
  }
  window.location.reload();
  return true;
}

/** Called after a successful interaction so a later deploy can reload again. */
export function clearStaleActionMarker(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RELOAD_MARKER);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
