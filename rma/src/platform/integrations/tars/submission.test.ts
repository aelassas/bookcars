import { expect, it } from "vitest";
import { parseTarsHandoff, TARS_HANDOFF_VERSION } from "./handoff";
import { hashTarsSubmissionPackage, isRetryableTarsError, parseTarsRunnerResult } from "./submission";

const handoff = parseTarsHandoff({
  version: TARS_HANDOFF_VERSION,
  rentalId: "6ee540e3-0c13-4f0b-a3f2-e8c5f8c2f750",
  agreementNumber: "TEST-DRY-RUN",
  signatureConfirmed: true,
  customer: { name: "TEST CUSTOMER", emiratesId: "784200142184884" },
  vehicle: { plate: "TEST 00001", vin: "TESTVIN0000000001" },
  rental: { startAt: "2026-11-21T06:00:00.000Z", returnAt: "2026-11-22T06:00:00.000Z", location: "TEST", odometer: 1, fuelPercent: 50 },
});

it("hashes the exact reviewed package", () => {
  const value = { handoff, contractDocumentId: "contract", customerDocuments: [{ id: "doc", category: "passport", filename: "test.pdf" }] };
  expect(hashTarsSubmissionPackage(value)).toBe(hashTarsSubmissionPackage({ ...value }));
  expect(hashTarsSubmissionPackage(value)).not.toBe(hashTarsSubmissionPackage({ ...value, contractDocumentId: "other" }));
});

it("retries only transient runner failures", () => {
  expect(isRetryableTarsError("browser request timed out")).toBe(true);
  expect(isRetryableTarsError("TARS submission outcome unknown")).toBe(true);
  expect(isRetryableTarsError("The selected TARS vehicle does not match the CRM VIN")).toBe(false);
  expect(isRetryableTarsError("TARS session expired")).toBe(false);
});

it("requires a document number for a real submission result", () => {
  expect(parseTarsRunnerResult('log\n{"status":"dry_run","summary":"reviewed"}').status).toBe("dry_run");
  expect(parseTarsRunnerResult('{"status":"succeeded","documentNumber":"TEST-1","summary":"done"}').documentNumber).toBe("TEST-1");
  expect(() => parseTarsRunnerResult('{"status":"succeeded","summary":"done"}')).toThrow("document number");
});
