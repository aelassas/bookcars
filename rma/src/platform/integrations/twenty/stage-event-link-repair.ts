// stageEvent link repair — the pure selector for scripts/repair-stage-event-links.ts.
//
// Live forensics (2026-08-13): stageEvents audit rows with a NULL opportunity
// relation. The two writers key their rows by externalId:
//   stage:<opportunityUuid>:<changedAtISO>   (stage-progression)
//   broadcast:<opportunityUuid>              (deal-confirmation marker)
// so the lost relation is RECOVERABLE from the externalId itself. The mirror's
// stageEvents key on a Bitrix scoped id ("cardiwan:12345:…") — NOT a Twenty
// uuid — and are deliberately NOT matched here (their relation target is
// resolved by the mirror's own index, not parseable from the key).

/**
 * The opportunity id encoded in an audit row's externalId, or null when the
 * key is not one of ours (mirror rows, hand-made rows, junk).
 */
export function linkedOpportunityIdFromExternalId(externalId: unknown): string | null {
  if (typeof externalId !== "string") return null;
  const stage = /^stage:([0-9a-fA-F-]{36}):\d{4}-\d{2}-\d{2}T/.exec(externalId);
  if (stage) return stage[1];
  const broadcast = /^broadcast:([0-9a-fA-F-]{36})$/.exec(externalId);
  return broadcast ? broadcast[1] : null;
}
