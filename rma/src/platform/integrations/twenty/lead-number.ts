/**
 * Lead serial numbers (owner, 2026-08-13): every lead card carries a stable
 * serial — in the `leadNumber` field and as a `#N` prefix on the card name —
 * so the manager can reference a lead by number ("#42") in conversation and
 * to the staff bot.
 *
 * The numbers come from a Postgres sequence in the platform database: the lead
 * relays (CallGear + WhatsApp/Telegram) run as separate processes and race by
 * design; `nextval` is the only allocator that cannot hand the same number
 * twice. Gaps are fine (a crashed pass burns a number), duplicates are not.
 *
 * ONE SEQUENCE PER DEPLOYMENT. It used to be one for both, and a lead carded on
 * the sales board therefore consumed a number the rental board never showed.
 * Within an hour of the 1 September restart Ayham's board read 1…8, then 11 —
 * to a manager that is two leads that went missing, which is precisely the
 * anxiety a clean restart was supposed to end. The boards are separate
 * businesses; they count separately.
 *
 * The sequence is created lazily on first use so a fresh database needs no
 * manual step; the migration file (drizzle/0070_lead_seq.sql) exists for
 * environments where DDL is applied ahead of time.
 */
import { sql } from "drizzle-orm";
import type { TwentyInstanceKey } from "./instance";
import type { db as platformDb } from "@/platform/db/client";

export type LeadNumberSource = () => Promise<number>;

/**
 * Which deployment's counter — the SAME type the router uses, imported rather
 * than re-declared.
 *
 * It was hand-copied as `"rental" | "sales"` first, and production answered
 * within minutes: the real keys are "default" and "rental" ("default" IS the
 * sales deployment), so three tenants died with `unknown deployment "default"`
 * until this was corrected. A parallel list of names that must agree with
 * another module is a bug waiting for a deploy.
 */
export type LeadSequenceInstance = TwentyInstanceKey;

const KNOWN: readonly LeadSequenceInstance[] = ["default", "rental"];

/**
 * The sequence for one deployment.
 *
 * An ALLOW-LIST, not a pattern. The first version tested the name against
 * /^[a-z][a-z0-9_]*$/, and within minutes of shipping a caller passed
 * `undefined` — which stringifies to "undefined", passes that test perfectly,
 * and quietly created `twenty_lead_seq_undefined` starting at 1. The next lead
 * came out as a SECOND #1 on a board that already had one.
 *
 * That is the failure mode worth guarding: not injection, but a counter nobody
 * meant to create. An unknown instance must stop the pass, because the only
 * alternative is duplicate lead numbers that a human has to find by eye.
 */
export function leadSequenceName(instance: LeadSequenceInstance): string {
  if (!KNOWN.includes(instance)) {
    throw new Error(
      `lead sequence: unknown deployment ${JSON.stringify(instance)} — expected one of ${KNOWN.join(", ")}`
    );
  }
  return `twenty_lead_seq_${instance}`;
}

/** node-postgres returns QueryResult; drizzle's typing hides the rows field. */
function firstRow(res: unknown): { n: string | number } {
  const rows = (Array.isArray(res) ? res : (res as { rows?: { n: string | number }[] }).rows) ?? [];
  if (!rows[0]) throw new Error("lead sequence nextval returned no row");
  return rows[0];
}

export function createLeadNumberSource(
  platform: typeof platformDb,
  instance: LeadSequenceInstance
): LeadNumberSource {
  const seq = leadSequenceName(instance);
  let ensured: Promise<unknown> | null = null;
  return async () => {
    ensured ??= platform.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS ${seq}`));
    // A rejected ensure must NOT wedge the process: reset so the next call
    // retries the DDL instead of re-throwing the cached failure forever.
    try {
      await ensured;
    } catch (e) {
      ensured = null;
      throw e;
    }
    return Number(firstRow(await platform.execute(sql.raw(`SELECT nextval('${seq}') AS n`))).n);
  };
}
