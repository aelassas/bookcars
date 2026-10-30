// Fetch RTA fines for every car returning soon (or overdue) and record them on
// the rental's return checklist — so the desk sees the fines BEFORE handover,
// while the deposit is still in hand.
//
//   npx tsx scripts/rta-fines-returning.ts            # dry run, next 7 days + overdue
//   npx tsx scripts/rta-fines-returning.ts --days 14  # widen the window
//   npx tsx scripts/rta-fines-returning.ts --write     # persist into returnChecklist.fines
//
// Self-contained: talks to Postgres directly (DATABASE_URL) and to RTA via the
// integration client, so it runs on the deploy box regardless of the branch the
// app is built from. The durable version of this is a daily pg-boss worker;
// this script is both the one-shot "get me the fines now" tool and the exact
// core that worker will call.

import { Client } from "pg";
import { lookupFines, type RtaFinesResult } from "../src/platform/integrations/rta/client";
import { decodePlate } from "../src/platform/integrations/rta/plate";
import {
  getTwentyClientForInstance,
} from "../src/platform/integrations/twenty/client";
import { resolveTwentyInstance } from "../src/platform/integrations/twenty/instance";
import { fetchOpportunitiesForTails } from "../src/platform/integrations/twenty/deal-link";
import {
  finesAlreadyProtocoled,
  finesNoteBody,
  finesNoteTitle,
  twentyNotedAtOf,
} from "../src/platform/integrations/rta/fines-note";

const DAYS = argNumber("--days", 7);
const WRITE = process.argv.includes("--write");
const DB = process.env.DATABASE_URL;

function argNumber(flag: string, dflt: number): number {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n)) return n;
  }
  return dflt;
}

interface Row {
  id: string;
  return_date: Date;
  plate: string;
  make: string;
  model: string;
  customer_name: string | null;
  customer_phone: string | null;
  company_slug: string | null;
  return_checklist: Record<string, unknown> | null;
}

/**
 * Core Job 3 completion: after the checklist merge, protocol the fines on the
 * customer's Twenty deal so the charge lives on the CRM record, not only in
 * our table. IDEMPOTENT per return-window via a `twentyNotedAt` marker on
 * return_checklist.fines — a rental already marked is skipped (a re-run with
 * CHANGED fines is a human's call, not an auto-append). Never creates cards:
 * no matching opportunity → skip with a log line.
 *
 * `merged` is the post-merge checklist (the merge carries a prior marker
 * through — see the WRITE branch), so the marker survives re-runs.
 */
async function protocolFinesToTwenty(
  db: Client,
  row: Row,
  merged: Record<string, unknown>,
  fines: RtaFinesResult["fines"],
  totalAmount: number,
): Promise<void> {
  const checklistFines = merged.fines ?? null;
  if (finesAlreadyProtocoled({ fines: checklistFines })) return; // already protocoled this window
  if (!resolveTwentyInstance("rental").configured) {
    console.log("        ⏭  Twenty rental instance not configured — fines note skipped");
    return;
  }
  const digits = (row.customer_phone ?? "").replace(/\D/g, "");
  if (digits.length < 9) {
    console.log("        ⏭  no customer phone on the rental — fines note skipped");
    return;
  }
  // The rental book lives on the RENTAL workspace; the rental rows are under
  // take-auto split by company — ETM trades as EasyRent (mirror.ts).
  const brandLine = row.company_slug === "etm" ? "easyrent" : (row.company_slug ?? undefined);
  const client = getTwentyClientForInstance("rental");
  const index = await fetchOpportunitiesForTails(client, [digits.slice(-9)], brandLine);
  const match = index.get(digits.slice(-9));
  if (!match) {
    console.log("        ⏭  no Twenty opportunity for …" + digits.slice(-9) + " — fines note skipped");
    return;
  }
  const created = await client.batchCreate("notes", [
    {
      title: finesNoteTitle(row.plate, fines.length, totalAmount),
      bodyV2: { markdown: finesNoteBody(fines), blocknote: null },
    },
  ]);
  const noteId = (created[0] as Record<string, unknown> | undefined)?.id;
  if (typeof noteId !== "string") throw new Error("fines note created without id in response");
  await client.batchCreate("noteTargets", [{ noteId, targetOpportunityId: match.id }]);
  // The marker lands only AFTER the note exists — a failed write retries.
  const marked = {
    ...merged,
    fines: { ...(merged.fines as Record<string, unknown>), twentyNotedAt: new Date().toISOString() },
  };
  await db.query(`UPDATE rental SET return_checklist = $1, updated_at = now() WHERE id = $2`, [marked, row.id]);
  console.log(`        📝 protocoled on Twenty opportunity ${match.id}`);
}

// Small courtesy pause between RTA calls — the gateway sits behind F5; there's
// no captcha, but we don't hammer it.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!DB) throw new Error("DATABASE_URL is not set");

  const db = new Client({ connectionString: DB });
  await db.connect();

  // Active rentals due back from now through +DAYS, plus anything overdue.
  const { rows } = await db.query<Row>(
    `SELECT r.id, r.return_date, v.plate, v.make, v.model,
            c.name AS customer_name, c.phone AS customer_phone,
            co.slug AS company_slug, r.return_checklist
       FROM rental r
       JOIN vehicle v ON v.id = r.vehicle_id
       LEFT JOIN customer c ON c.id = r.customer_id
       LEFT JOIN company co ON co.id = r.company_id
      WHERE r.status = 'active'
        AND r.return_date <= now() + ($1 || ' days')::interval
      ORDER BY r.return_date ASC`,
    [String(DAYS)],
  );

  console.log(
    `${rows.length} car(s) returning within ${DAYS} days (or overdue). ` +
      `${WRITE ? "WRITING to returnChecklist." : "Dry run — pass --write to persist."}\n`,
  );

  let withFines = 0;
  let skipped = 0;

  for (const row of rows) {
    const label = `${row.plate.padEnd(12)} ${row.make} ${row.model}`.trim();
    const due = row.return_date.toISOString().slice(0, 10);

    const decoded = decodePlate(row.plate);
    if (!decoded) {
      skipped++;
      console.log(`  ⏭  ${label}  (due ${due}) — plate unreadable, skipped`);
      continue;
    }

    let result: RtaFinesResult;
    try {
      result = await lookupFines(decoded.query);
    } catch (e) {
      skipped++;
      console.log(`  ⚠️  ${label}  (due ${due}) — RTA lookup failed: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    const { fines, totalAmount, totalBlackPoints } = result;
    const flag = decoded.uncertain ? " (plate parse uncertain)" : "";
    if (fines.length === 0) {
      console.log(`  ✅ ${label}  (due ${due}) — no fines${flag}`);
    } else {
      withFines++;
      console.log(
        `  🚨 ${label}  (due ${due}) — ${totalAmount} AED, ${fines.length} fine(s), ` +
          `${totalBlackPoints} bp${flag}`,
      );
      for (const f of fines) {
        console.log(`        ${f.amount} AED  ${f.ticketDate.slice(0, 10)}  ${f.source}  ${f.description.slice(0, 48)}`);
      }
    }

    if (WRITE) {
      const note =
        fines.length === 0
          ? "No fines (RTA auto-check)"
          : fines
              .map((f) => `${f.amount} AED ${f.ticketDate.slice(0, 10)} ${f.source}: ${f.description}`.trim())
              .join("\n");
      const priorMarker = twentyNotedAtOf(row.return_checklist);
      const merged = {
        ...(row.return_checklist ?? {}),
        fines: {
          checked: true,
          amount: totalAmount,
          note,
          checkedAt: result.fetchedAt,
          source: "rta-auto",
          // Carry the Twenty-protocol marker through the merge so a protocoled
          // rental is not re-noted on the next run.
          ...(priorMarker ? { twentyNotedAt: priorMarker } : {}),
        },
      };
      await db.query(`UPDATE rental SET return_checklist = $1, updated_at = now() WHERE id = $2`, [
        merged,
        row.id,
      ]);

      // Core Job 3 completion: protocol the fines on the customer's Twenty
      // deal (idempotent via the marker; never creates cards).
      if (fines.length > 0) {
        try {
          await protocolFinesToTwenty(db, row, merged, fines, totalAmount);
        } catch (e) {
          // A failed note must not kill the run — the checklist row is
          // already written and the marker is NOT set, so the next run retries.
          console.log(`        ⚠️  Twenty fines note failed: ${e instanceof Error ? e.message : e}`);
        }
      }
    }

    await sleep(1200);
  }

  console.log(
    `\nDone. ${withFines} car(s) with fines, ${skipped} skipped, ${rows.length - skipped} checked.`,
  );
  await db.end();
}

main().catch((e) => {
  console.error("rta-fines-returning failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
