import { describe, it, expect } from "vitest";
import { isStaleActionError } from "./stale-action";

// The detector guards a page reload, so both directions matter: missing a
// stale-action error leaves staff staring at a silently emptied form, while a
// false positive reloads a page and destroys whatever they had typed.
describe("isStaleActionError", () => {
  it("recognises Next's error code, which survives minification", () => {
    const err = Object.assign(new Error("anything at all"), { __NEXT_ERROR_CODE: "E715" });
    expect(isStaleActionError(err)).toBe(true);
  });

  it("recognises the client-side message when the code was dropped", () => {
    const err = new Error('Server Action "abc123" was not found on the server.');
    expect(isStaleActionError(err)).toBe(true);
  });

  it("recognises the server-side phrasing", () => {
    const err = new Error("Failed to find Server Action. This request might be from an older deployment.");
    expect(isStaleActionError(err)).toBe(true);
  });

  it("ignores unrelated application errors", () => {
    expect(isStaleActionError(new Error("Forbidden: not a member of this tenant"))).toBe(false);
    expect(isStaleActionError(new Error("connect ECONNREFUSED"))).toBe(false);
  });

  it("ignores a different Next error code", () => {
    const err = Object.assign(new Error("boom"), { __NEXT_ERROR_CODE: "E123" });
    expect(isStaleActionError(err)).toBe(false);
  });

  it("survives non-error rejection values", () => {
    expect(isStaleActionError(undefined)).toBe(false);
    expect(isStaleActionError(null)).toBe(false);
    expect(isStaleActionError("Failed to find Server Action")).toBe(false);
    expect(isStaleActionError({ message: 42 })).toBe(false);
  });
});
