import { describe, expect, it } from "vitest";
import { isTransientModelError } from "./local";

// 2026-09-01, live: 714 inbound messages over four hours produced ZERO lead
// cards. The brain answered a test call in 0.14s — it was never down. It was
// BUSY: one single-threaded MLX server serves both the lead qualifier and the
// media describer, and while a photo or a video frame is being described every
// qualifier call comes back "fetch failed". The thread was dropped and the
// customer never became a card.
//
// A lead must not be lost because a picture was being looked at. Transient
// refusals are retried; a real answer the model gives — even a bad one — is
// never retried, because that would just spend the model twice.
describe("isTransientModelError — retry a busy model, not a wrong one", () => {
  it("retries a refused connection", () => {
    expect(isTransientModelError(new TypeError("fetch failed"))).toBe(true);
  });

  it("retries our own timeout", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(isTransientModelError(abort)).toBe(true);
  });

  it("retries the server saying it is overloaded", () => {
    expect(isTransientModelError(new Error("LocalProvider chat returned 503: busy"))).toBe(true);
    expect(isTransientModelError(new Error("LocalProvider chat returned 429: slow down"))).toBe(true);
  });

  it("does NOT retry a malformed answer — the model already spoke", () => {
    expect(isTransientModelError(new Error("LocalProvider: response missing choices[0].message.content"))).toBe(false);
  });

  it("does NOT retry a request the model rejected", () => {
    expect(isTransientModelError(new Error("LocalProvider chat returned 400: bad request"))).toBe(false);
  });

  it("survives being handed something that is not an Error", () => {
    expect(isTransientModelError("fetch failed")).toBe(true);
    expect(isTransientModelError(null)).toBe(false);
  });
});
