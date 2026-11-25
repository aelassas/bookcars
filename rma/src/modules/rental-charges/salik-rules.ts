import { createHash } from "node:crypto";

export function salikChargeReference(input: {
  plateNo: string;
  plateCode: string;
  occurredAt: Date;
  amount: number;
  gate: string;
}): string {
  const identity = [
    input.plateNo,
    input.plateCode,
    input.occurredAt.toISOString(),
    input.amount.toFixed(2),
    input.gate,
  ].join("|");
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 24);
  return `salik:${input.plateNo}:${input.occurredAt.toISOString()}:${digest}`;
}
