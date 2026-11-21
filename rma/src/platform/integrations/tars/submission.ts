import { createHash } from "node:crypto";
import type { TarsHandoff } from "./handoff";

export interface TarsSubmissionDocument {
  id: string;
  category: string;
  filename: string;
}

export interface TarsSubmissionPackage {
  handoff: TarsHandoff;
  contractDocumentId: string;
  customerDocuments: TarsSubmissionDocument[];
}

export type TarsRunnerResult = {
  status: "dry_run" | "succeeded";
  documentNumber?: string;
  summary: string;
};

export function hashTarsSubmissionPackage(value: TarsSubmissionPackage): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function isRetryableTarsError(message: string): boolean {
  return /timed? ?out|ECONNRESET|ECONNREFUSED|ETIMEDOUT|HTTP 50[234]|target closed|browser closed|outcome unknown|temporarily unavailable/i.test(message);
}

export function parseTarsRunnerResult(output: string): TarsRunnerResult {
  const line = output.trim().split("\n").filter(Boolean).at(-1);
  if (!line) throw new Error("TARS runner returned no result");
  const result = JSON.parse(line) as Partial<TarsRunnerResult>;
  if (!["dry_run", "succeeded"].includes(result.status ?? "") || typeof result.summary !== "string") {
    throw new Error("TARS runner returned an invalid result");
  }
  if (result.status === "succeeded" && !result.documentNumber) {
    throw new Error("TARS runner did not return the submitted document number");
  }
  return result as TarsRunnerResult;
}
