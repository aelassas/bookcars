export const DEAL_STAGES = ["inquiry", "quote", "contract", "tars", "handover", "closed"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export type DealStatus = "open" | "won" | "lost";
export type DealStageOption = { key: DealStage; label: string };

const LEGACY_STAGES: readonly DealStageOption[] = [
  { key: "inquiry", label: "inquiry" },
  { key: "quote", label: "quote" },
  { key: "contract", label: "contract" },
  { key: "handover", label: "handover" },
  { key: "closed", label: "closed" },
];

// RMA meeting, 2026-10-23: inquiry → reply → signature → TARS → rental → closed.
export const RMA_RENTAL_STAGES: readonly DealStageOption[] = [
  { key: "inquiry", label: "Incoming" },
  { key: "quote", label: "In progress" },
  { key: "contract", label: "Signed" },
  { key: "tars", label: "Uploaded to TARS" },
  { key: "handover", label: "Active rental" },
  { key: "closed", label: "Closed" },
];

export function dealStageOptions(tenantSlug?: string): readonly DealStageOption[] {
  return tenantSlug === "rma" ? RMA_RENTAL_STAGES : LEGACY_STAGES;
}

export function dealStageLabel(tenantSlug: string | undefined, stage: string): string {
  return dealStageOptions(tenantSlug).find((option) => option.key === stage)?.label ?? stage;
}

export function isDealStage(stage: string): stage is DealStage {
  return (DEAL_STAGES as readonly string[]).includes(stage);
}

export function statusForDealStage(stage: DealStage, currentStatus: DealStatus = "open"): DealStatus {
  if (stage !== "closed") return "open";
  return currentStatus === "lost" ? "lost" : "won";
}
