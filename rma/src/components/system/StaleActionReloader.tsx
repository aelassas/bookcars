"use client";

import { useEffect } from "react";
import { clearStaleActionMarker, isStaleActionError, reloadForStaleAction } from "@/lib/stale-action";

/**
 * Catches the post-deploy stale Server Action error on the paths an error
 * boundary never sees.
 *
 * A form submitted through `useActionState` (or any action whose promise the
 * component owns) rejects rather than throwing during render, so React's error
 * boundary is not involved and the user just watches their input vanish. Those
 * rejections surface here as `unhandledrejection`.
 *
 * Mounted once in the tenant layout.
 */
export function StaleActionReloader() {
  useEffect(() => {
    // The tab is alive on the current build, so allow a future deploy to
    // trigger its own single reload.
    clearStaleActionMarker();

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isStaleActionError(event.reason)) return;
      // Claim the event so Next's overlay doesn't flash before the reload.
      event.preventDefault();
      reloadForStaleAction();
    };

    const onError = (event: ErrorEvent) => {
      if (!isStaleActionError(event.error)) return;
      event.preventDefault();
      reloadForStaleAction();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
