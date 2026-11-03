/**
 * backfill-note-opportunities.ts — give the WhatsApp notes that ALREADY exist
 * the deal target they were written without.
 *
 *   npx tsx scripts/backfill-note-opportunities.ts easyrent            (dry run)
 *   npx tsx scripts/backfill-note-opportunities.ts easyrent --commit   (writes)
 *   npx tsx scripts/backfill-note-opportunities.ts                     (all)
 *
 * Dry-run is the DEFAULT and prints exactly what the committing run would do.
 *
 * ── WHAT IT MATCHES ON ──────────────────────────────────────────────────────
 * The projector wrote each note's title as "WhatsApp ← клиент · <date>" and
 * put the customer's number nowhere machine-readable, so the note itself
 * cannot say whose deal it belongs to. The link is recovered from the side
 * that does know: our own `message` table. Each message is re-matched to its
 * person (tail9, exactly as the projector did) and to its deal (deal-link.ts),
 * and the note is found by the (person, timestamp) pair the projector used to
 * build the title. Anything ambiguous is skipped and counted, never guessed.
 *
 * ── IDEMPOTENCE ─────────────────────────────────────────────────────────────
 * Existing noteTargets are read first and a note that already points at ANY
 * opportunity is left alone. A second run is a no-op — that is the acceptance
 * test, and `--commit` twice is safe by design.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import { db, pool } from "@/platform/db/client";
import { message, tenant } from "@/platform/db/schema";
import { MIN_PHONE_MATCH_DIGITS, normalizePhone } from "@/platform/messaging/phone";
import { getTwentyClientForTenantSlug, type TwentyClient } from "@/platform/integrations/twenty/client";
import { fetchOpportunityPhoneIndex } from "@/platform/integrations/twenty/deal-link";
import { brandLineForTenantSlug, buildTwentyIndex } from "@/platform/integrations/twenty/mirror";
import { formatDateTime } from "@/lib/format";

const DEFAULT_SLUGS = ["take-auto", "cardiwan", "easyrent"];
/** Twenty's batch ceiling. */
const BATCH = 60;

interface Tally {
  notes: number;
  alreadyLinked: number;
  linked: number;
  noDeal: number;
  failed: number;
  firstError?: string;
}

/** The projector's title, rebuilt so a note can be found by it. */
function noteTitle(direction: string, name: string | null, at: Date): string {
  const arrow = direction === "outbound" ? "→" : "←";
  return `WhatsApp ${arrow} ${name ?? "клиент"} · ${formatDateTime(at)}`;
}

async function backfillTenant(
  client: TwentyClient,
  tenantId: string,
  brandLine: string | null,
  commit: boolean
): Promise<Tally> {
  const tally: Tally = {
    notes: 0,
    alreadyLinked: 0,
    linked: 0,
    noDeal: 0,
    failed: 0,
  };

  const peopleIndex = await buildTwentyIndex(client, "people");
  // Brand-scoped for the same reason the projector is: Cardiwan and EasyRent
  // live in one workspace and share 1,346 phone numbers between them.
  const dealIndex = await fetchOpportunityPhoneIndex(client, brandLine);

  // title → the deal it should point at. Built from OUR messages, because the
  // note text alone cannot identify the customer.
  const dealByTitle = new Map<string, string>();
  const rows = await db
    .select({
      direction: message.direction,
      from: message.from,
      fromPn: message.fromPn,
      to: message.to,
      customerName: message.customerName,
      createdAt: message.createdAt,
    })
    .from(message)
    .where(
      and(
        eq(message.tenantId, tenantId),
        eq(message.channel, "whatsapp"),
        isNotNull(message.body),
        sql`${message.from} NOT LIKE '%@g.us'`
      )
    )
    .orderBy(asc(message.createdAt));

  for (const m of rows) {
    const raw = m.direction === "outbound" ? m.to : (m.fromPn ?? m.from);
    const digits = normalizePhone(raw);
    if (digits.length < MIN_PHONE_MATCH_DIGITS) continue;
    const tail = digits.slice(-MIN_PHONE_MATCH_DIGITS);
    // A note only exists where the projector found a person — same gate.
    if (!peopleIndex.byPhoneTail9.get(tail)) continue;
    const deal = dealIndex.get(tail);
    if (!deal) continue;
    dealByTitle.set(noteTitle(m.direction ?? "inbound", m.customerName, m.createdAt), deal.id);
  }

  // Which notes already carry an opportunity target — the idempotence gate.
  const linkedNoteIds = new Set<string>();
  for await (const t of client.listAll<Record<string, unknown>>("noteTargets")) {
    if (t.deletedAt) continue;
    if (typeof t.noteId === "string" && typeof t.targetOpportunityId === "string") {
      linkedNoteIds.add(t.noteId);
    }
  }

  const pending: { noteId: string; targetOpportunityId: string }[] = [];
  for await (const n of client.listAll<Record<string, unknown>>("notes")) {
    if (n.deletedAt) continue;
    const id = typeof n.id === "string" ? n.id : null;
    const title = typeof n.title === "string" ? n.title : "";
    // Only the projector's own notes — a note somebody typed by hand is not
    // ours to re-file.
    if (!id || !title.startsWith("WhatsApp ")) continue;
    tally.notes++;
    if (linkedNoteIds.has(id)) {
      tally.alreadyLinked++;
      continue;
    }
    const dealId = dealByTitle.get(title);
    if (!dealId) {
      // Either that customer's number matches no deal, or no message in our
      // table reproduces this title. Both are "leave it on the person".
      tally.noDeal++;
      continue;
    }
    pending.push({ noteId: id, targetOpportunityId: dealId });
  }

  if (!commit) {
    tally.linked = pending.length;
    return tally;
  }

  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    try {
      await client.batchCreate("noteTargets", slice);
      tally.linked += slice.length;
    } catch (e) {
      tally.failed += slice.length;
      tally.firstError ??= (e as Error).message.slice(0, 200);
    }
  }
  return tally;
}

async function main() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const requested = args.filter((a) => !a.startsWith("-"));
  const slugs = requested.length > 0 ? requested : DEFAULT_SLUGS;

  console.log(commit ? "MODE: COMMIT — writing note targets" : "MODE: DRY RUN — nothing is written");
  for (const slug of slugs) {
    const [t] = await db.select({ id: tenant.id }).from(tenant).where(eq(tenant.slug, slug)).limit(1);
    if (!t) {
      console.warn(`[backfill] ${slug}: no such tenant — skipped`);
      continue;
    }
    try {
      const r = await backfillTenant(
        getTwentyClientForTenantSlug(slug),
        t.id,
        brandLineForTenantSlug(slug),
        commit
      );
      // `scanned` is the WORKSPACE's WhatsApp notes, not this tenant's — notes
      // carry no brand, and Cardiwan and EasyRent share one workspace. A note
      // belonging to the other brand simply matches nothing here and lands in
      // noDeal, so that number is not a per-brand miss count.
      console.log(
        `[backfill] ${slug}: scannedWaNotes=${r.notes} alreadyOnDeal=${r.alreadyLinked} ` +
          `${commit ? "linked" : "wouldLink"}=${r.linked} noDeal=${r.noDeal} failed=${r.failed}` +
          (r.firstError ? ` first=${r.firstError}` : "")
      );
    } catch (e) {
      console.error(`[backfill] ${slug} failed:`, (e as Error).message);
    }
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  });
