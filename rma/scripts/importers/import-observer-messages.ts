/**
 * Bridge: WhatsApp observer JSONL logs → the platform `message` table.
 * Read-only from the logs; inbound only; nothing is ever sent.
 * DRY-RUN default; --commit to write.
 *
 * REWRITTEN 2026-07-23 (the "fundamental fix", owner escalation):
 *  1. INCREMENTAL — the old version DELETE'd every waobs row and re-inserted
 *     from scratch each pass, wiping extracted_* and stitched links every 15
 *     minutes. Now: INSERT … ON CONFLICT (tenant_id, external_message_id)
 *     DO NOTHING (unique index 0054) — existing rows and everything computed
 *     on them survive; only genuinely new lines land.
 *  2. MULTI-TENANT — each observer LINE routes to its business tenant via
 *     modules/messaging/lines.ts (owner mapping: babek/abdullah/cardiwan →
 *     cardiwan; azat/mohammed/leasing → take-auto; easyrent → easyrent).
 *     Unknown lines fall back to take-auto with a warning.
 *  3. ATTRIBUTION — message.to = the line slug, so "whose phone got it"
 *     survives on the row (the owner names every line at QR time).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { pool } from "@/platform/db/client";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tenantSlugForLine, isMappedLine, LINE_TENANT, DEFAULT_LINE_TENANT } from "@/modules/messaging/lines";
import { resolveOutboundCustomerPhone } from "@/platform/messaging/phone";

const DIR =
  process.env.WA_OBSERVER_DIR ??
  "/Users/takeauto/Downloads/TAKE AUTO AI/TAKE-AUTO/wa-observer";
const COMMIT = process.argv.includes("--commit");

type Obs = { ts: string; brand: string; from: string; direction?: string; senderPhone?: string | null; pushName?: string; text?: string; media?: string; mediaType?: string };

async function main() {
  // Resolve every tenant this run might touch, once.
  const slugs = Array.from(new Set([...Object.values(LINE_TENANT), DEFAULT_LINE_TENANT]));
  const tenantIds = new Map<string, string>();
  for (const slug of slugs) {
    const row = (await pool.query("SELECT id FROM tenant WHERE slug=$1", [slug])).rows[0];
    if (row) tenantIds.set(slug, row.id);
    else console.warn(`⚠️  tenant '${slug}' not found — its lines will be skipped`);
  }

  const files = readdirSync(DIR).filter((f) => f.startsWith("observed-") && f.endsWith(".jsonl"));
  const msgs: (Obs & { extId: string })[] = [];
  const mediaMap = new Map<string, string>();
  try {
    for (const l of readFileSync(join(DIR, "media-text.jsonl"), "utf8").split(/\r?\n/)) {
      if (!l.trim()) continue;
      try { const j = JSON.parse(l); if (j.file && j.text) mediaMap.set(j.file, j.text); } catch { /* skip malformed line */ }
    }
  } catch { /* media-text.jsonl is optional */ }
  for (const f of files) {
    const brand = f.replace(/^observed-/, "").replace(/\.jsonl$/, "");
    for (const line of readFileSync(join(DIR, f), "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      let r: Obs;
      try { r = JSON.parse(line); } catch { continue; }
      if (!r.from || !r.text) continue;
      msgs.push({
      ...r,
      text: (() => {
        const vision = r.media ? mediaMap.get(r.media) : undefined;
        if (!vision) return r.text;
        const prefix = r.mediaType === "audio" ? "[voice] " : "[image] ";
        // Only treat r.text as a placeholder when it is empty or exactly "[image]"/"[voice]".
        // A real caption (e.g. "This is the car I want") is preserved and the vision text appended.
        const isPlaceholder = !r.text || r.text.trim() === "[image]" || r.text.trim() === "[voice]";
        return isPlaceholder ? (prefix + vision) : (r.text + " " + prefix + vision);
      })(),
      brand: r.brand || brand,
      extId: `waobs:${r.brand || brand}:${r.ts}:${r.from}`,
    });
    }
  }

  console.log(`\n📨 Parsed ${msgs.length} observer messages from ${files.length} files.`);

  if (!COMMIT) { console.log(`\n— DRY-RUN — no writes. Re-run with --commit.\n`); await pool.end(); return; }

  const perTenant = new Map<string, number>();
  const warnedLines = new Set<string>();
  // lid → phone for OUTBOUND `to` resolution. Outbound observer rows name the
  // customer's remoteJid in `from` — a privacy JID ("<n>@lid") for modern
  // DMs — and the importer used to store the BRAND SLUG in `to`, which is how
  // 35,039 agent replies ended up with no customer number and were dropped as
  // noPerson by the Twenty sync (owner report 2026-08-22: «the client's
  // messages show but the agent's replies don't»). A plain phone JID resolves
  // directly; a @lid resolves via wa_identity (maintained by the observer on
  // every inbound); an unresolved lid keeps the brand slug and is counted.
  const identityByLid = new Map<string, string>();
  {
    // The observer appends wa-identity-<slug>.jsonl whenever WhatsApp shows it
    // both halves of a privacy-JID identity (lid + phone). Fold those into
    // wa_identity FIRST so this same run's outbound rows resolve their "to".
    for (const f of readdirSync(DIR).filter((f) => f.startsWith("wa-identity-") && f.endsWith(".jsonl"))) {
      const brand = f.replace(/^wa-identity-/, "").replace(/\.jsonl$/, "");
      for (const line of readFileSync(join(DIR, f), "utf8").split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          if (!j.lid || !j.phone) continue;
          await pool.query(
            `INSERT INTO wa_identity (lid, phone, push_name, brand_line, last_seen)
             VALUES ($1,$2,$3,$4,now())
             ON CONFLICT (lid) DO UPDATE SET
               phone = EXCLUDED.phone,
               push_name = COALESCE(EXCLUDED.push_name, wa_identity.push_name),
               last_seen = now()`,
            [j.lid, j.phone, j.pushName ?? null, brand]
          );
        } catch { /* skip malformed line */ }
      }
    }
    const res = await pool.query("SELECT lid, phone FROM wa_identity WHERE phone IS NOT NULL");
    for (const r of res.rows as { lid: string; phone: string }[]) identityByLid.set(r.lid, r.phone);
  }
  let unresolvedOutboundTo = 0;
  // Media placeholders that a LATER media-processor pass has since transcribed.
  // A voice/photo message is imported within a minute as "[voice/audio]"/"[image]",
  // but media-processor.py (qwen3-vl + mlx-whisper) only writes media-text.jsonl a
  // few minutes later — so the transcript is built on the NEXT import, and the old
  // DO NOTHING dropped it on the floor forever. Upgrade a placeholder row in place
  // when a real transcript now exists, and reset extracted_at so backfill-stitch
  // re-mines car/price/intent from the recognised text (it gates on extracted_at
  // IS NULL). Non-placeholder rows and untranscribed placeholders are untouched.
  const PLACEHOLDERS = ["[image]", "[voice/audio]", "[voice]", "[document]", "[non-text]"];
  let inserted = 0;
  let upgraded = 0;
  for (const m of msgs) {
    const slug = tenantSlugForLine(m.brand);
    if (!isMappedLine(m.brand) && !warnedLines.has(m.brand)) {
      warnedLines.add(m.brand);
      console.warn(`⚠️  unmapped line '${m.brand}' → defaulting to ${DEFAULT_LINE_TENANT} (add it to modules/messaging/lines.ts or from the /lines page)`);
    }
    const tid = tenantIds.get(slug);
    if (!tid) continue;
    // Relative media locator ("wa/<line>/<file>") — the /api/media token route
    // resolves it under WA_MEDIA_ROOT; an absolute path never leaves this box.
    const mediaRel = m.media?.includes("/wa-observer/media/")
      ? "wa/" + m.media.split("/wa-observer/media/")[1]
      : null;
    // Outbound: `to` is the CUSTOMER's phone (resolved from the remoteJid in
    // `from`), never the brand slug — see the identityByLid note above.
    // Inbound keeps `to` = the line slug, byte-identical to before.
    let to = m.brand;
    if (m.direction === "outbound") {
      const resolved = resolveOutboundCustomerPhone(m.from, identityByLid);
      if (resolved) to = resolved;
      else unresolvedOutboundTo++;
    }
    const res = await pool.query(
      `INSERT INTO message (tenant_id, channel, direction, "from", from_pn, "to", customer_name, body, status, external_message_id, created_at, media_path)
       VALUES ($1,'whatsapp',$2,$3,$4,$5,$6,$7,'received',$8,$9,$11)
       ON CONFLICT (tenant_id, external_message_id) WHERE external_message_id IS NOT NULL
       DO UPDATE SET
         body = CASE WHEN message.body = ANY($10::text[]) AND NOT (EXCLUDED.body = ANY($10::text[])) THEN EXCLUDED.body ELSE message.body END,
         extracted_at = CASE WHEN message.body = ANY($10::text[]) AND NOT (EXCLUDED.body = ANY($10::text[])) THEN NULL ELSE message.extracted_at END,
         media_path = COALESCE(message.media_path, EXCLUDED.media_path)
       WHERE (message.body = ANY($10::text[]) AND NOT (EXCLUDED.body = ANY($10::text[])))
          OR (message.media_path IS NULL AND EXCLUDED.media_path IS NOT NULL)
       RETURNING (xmax = 0) AS is_insert`,
      [tid, m.direction === "outbound" ? "outbound" : "inbound", m.from, m.senderPhone ?? null, to, m.pushName ?? null, m.text, m.extId, m.ts ?? new Date().toISOString(), PLACEHOLDERS, mediaRel],
    );
    if (res.rowCount === 1) {
      if (res.rows[0]?.is_insert) {
        inserted++;
        perTenant.set(slug, (perTenant.get(slug) ?? 0) + 1);
      } else {
        upgraded++;
      }
    }
  }
  const breakdown = Array.from(perTenant.entries()).map(([s, n]) => `${s}=${n}`).join(" ") || "none";
  console.log(`✅ Inserted ${inserted} NEW messages (${breakdown}); upgraded ${upgraded} media placeholder(s) with transcript/OCR; ${msgs.length - inserted - upgraded} already present.`);
  if (unresolvedOutboundTo > 0) {
    console.log(`⚠️  ${unresolvedOutboundTo} outbound row(s) kept the brand slug in "to" — @lid with no wa_identity mapping yet (the observer records it on the customer's next inbound; fix-outbound-wa-to.ts heals history).`);
  }
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
