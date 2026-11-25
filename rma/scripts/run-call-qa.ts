import { config } from "dotenv";
config({ path: ".env.local" });
import { db, pool } from "@/platform/db/client";
import { sql } from "drizzle-orm";
import { writeFile, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";

// P3 — call QA pipeline. Takes calls that HAVE a recording but no transcript
// yet, downloads the audio (Twilio basic auth), transcribes it with the box's
// own Whisper (mlx_whisper, the same engine the WA voice notes use), then
// asks Claude for a QA scorecard. Everything lands back on the `call` row
// (transcript + qa jsonb). Idempotent, small batches, runs on a heartbeat.

const execFileP = promisify(execFile);
const BATCH = 3;

type Row = { id: string; tenant_id: string; recording_url: string; manager: string | null };

async function transcribe(path: string): Promise<string> {
  const { stdout } = await execFileP("python3", [
    "-c",
    `import mlx_whisper, sys
print(mlx_whisper.transcribe(sys.argv[1], path_or_hf_repo="mlx-community/whisper-large-v3-turbo")["text"].strip())`,
    path,
  ], { timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

async function qaScore(transcript: string, manager: string | null): Promise<object> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 400,
    messages: [{
      role: "user",
      content:
        `You are a sales-call QA reviewer for a car rental/leasing company. ` +
        `Score this call transcript (manager: ${manager ?? "unknown"}). ` +
        `Return ONLY compact JSON: {"score":1-10,"flags":["..."],"summary":"one sentence"}. ` +
        `Flags to use when seen: "no_greeting","no_needs_discovery","rude","overpromising",` +
        `"no_price_discussion","no_next_step","good_close".\n\nTRANSCRIPT:\n${transcript.slice(0, 12000)}`,
    }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { score: null, flags: ["qa_parse_error"], summary: text.slice(0, 200) };
  }
}

async function main() {
  // qa_error rows are terminal — without this exclusion the same broken
  // recording was re-downloaded + re-transcribed every 5 min forever
  // (swarm audit), and one poisoned row blocked the whole queue (ASC order).
  const rows = (await db.execute(sql`
    SELECT c.id, c.tenant_id, c.recording_url, u.name AS manager
    FROM "call" c LEFT JOIN "user" u ON u.id = c.manager_id
    WHERE c.recording_url IS NOT NULL AND c.transcript IS NULL
      AND (c.qa IS NULL OR NOT (c.qa->'flags' @> '["qa_error"]'))
    ORDER BY c.created_at ASC
    LIMIT ${BATCH}
  `)) as unknown as { rows: Row[] };

  if (rows.rows.length === 0) {
    console.log("[call-qa] nothing to process");
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();

  for (const r of rows.rows) {
    const path = `/tmp/call-${r.id}.mp3`;
    try {
      // Host allowlist (swarm audit): recording_url comes from a webhook and
      // could point anywhere — we must never send account credentials to a
      // non-Twilio host (cred leak), nor fetch arbitrary hosts at all (SSRF).
      const allowed = /^https:\/\/[a-z0-9.-]*\.twilio\.com\//i.test(r.recording_url);
      if (!allowed) throw new Error(`recording host not in allowlist`);
      const res = await fetch(r.recording_url, {
        headers: sid && token ? { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") } : {},
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`download ${res.status}`);
      await writeFile(path, Buffer.from(await res.arrayBuffer()));

      const transcript = await transcribe(path);
      if (!transcript) throw new Error("empty transcript");
      const qa = await qaScore(transcript, r.manager);

      await db.execute(sql`
        UPDATE "call" SET transcript = ${transcript}, qa = ${JSON.stringify(qa)}::jsonb, updated_at = now()
        WHERE id = ${r.id}
      `);
      console.log(`[call-qa] ${r.id} — transcribed + scored`);
    } catch (e) {
      // Mark so we don't retry a broken recording forever, but keep the reason.
      await db.execute(sql`
        UPDATE "call" SET qa = ${JSON.stringify({ flags: ["qa_error"], summary: (e as Error).message })}::jsonb, updated_at = now()
        WHERE id = ${r.id}
      `);
      console.error(`[call-qa] ${r.id} failed:`, (e as Error).message);
    } finally {
      await unlink(path).catch(() => {});
    }
  }
}

main().then(async () => { await pool.end(); process.exit(0); })
      .catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
