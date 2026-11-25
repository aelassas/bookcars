// RTA fines → Twenty deal note (Core Job 3) — the pure pieces of
// scripts/rta-fines-returning.ts, extracted so the harness can test them
// without booting the script (scripts run main() on import).
//
// The note protocols the charge on the customer's Twenty opportunity:
//   title: RTA fines · <plate> · <n> fines · <total> AED
//   body:  one line per fine — date · source · amount · description
// Idempotency: a `twentyNotedAt` marker on return_checklist.fines, carried
// through the checklist merge so a protocoled rental is never re-noted.

export interface FineLine {
  amount: number;
  ticketDate: string;
  source: string;
  description: string;
}

/** The marker check — true = this return-window is already protocoled. */
export function finesAlreadyProtocoled(checklist: unknown): boolean {
  const fines = (checklist as { fines?: { twentyNotedAt?: unknown } } | null | undefined)?.fines;
  return typeof fines?.twentyNotedAt === "string" && fines.twentyNotedAt.length > 0;
}

/** The marker value to carry through a checklist merge (null when absent). */
export function twentyNotedAtOf(checklist: unknown): string | null {
  const fines = (checklist as { fines?: { twentyNotedAt?: unknown } } | null | undefined)?.fines;
  return typeof fines?.twentyNotedAt === "string" && fines.twentyNotedAt ? fines.twentyNotedAt : null;
}

export function finesNoteTitle(plate: string, count: number, totalAed: number): string {
  return `RTA fines · ${plate} · ${count} fines · ${totalAed} AED`;
}

export function finesNoteBody(fines: FineLine[]): string {
  return fines
    .map((f) => `${f.ticketDate.slice(0, 10)} · ${f.source} · ${f.amount} AED · ${f.description}`)
    .join("\n");
}
