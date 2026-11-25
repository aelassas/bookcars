import { describe, expect, it } from "vitest";
import { taqeeqSignedAt, type TaqeeqSubmission } from "./client";

describe("taqeeqSignedAt", () => {
  it("returns null until every signer has completed", () => {
    const submission: TaqeeqSubmission = {
      id: 12,
      status: "pending",
      submitters: [{ submission_id: 12, slug: "abc", status: "pending", completed_at: null }],
    };
    expect(taqeeqSignedAt(submission)).toBeNull();
  });

  it("uses the latest signer completion timestamp", () => {
    const submission: TaqeeqSubmission = {
      id: 12,
      status: "completed",
      submitters: [
        { submission_id: 12, slug: "abc", status: "completed", completed_at: "2026-11-19T10:00:00Z" },
        { submission_id: 12, slug: "def", status: "completed", completed_at: "2026-11-19T11:00:00Z" },
      ],
    };
    expect(taqeeqSignedAt(submission)?.toISOString()).toBe("2026-11-19T11:00:00.000Z");
  });
});
