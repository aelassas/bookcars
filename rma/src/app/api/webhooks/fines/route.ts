import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/platform/db/client";
import { log } from "@/platform/log";

// Fines snapshot push (owner, 2026-09-19): scripts/update-fines-tab.mjs
// rewrites the Google "Fines" tab hourly on the office Mac, then POSTs the
// same {header, rows} here; the /fines hub page reads fines_snapshot from the
// DB — no Google creds on the box, no dependency on that Mac staying awake
// for READS (only for the hourly refresh, as before).
//
// Auth: shared FINES_PUSH_TOKEN as `?token=` (the script signs nothing).
// Unset token → 500, fail CLOSED, same contract as the other webhooks.

export const dynamic = "force-dynamic";

function tokenMatches(given: string | null, expected: string): boolean {
  return (
    given !== null &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"))
  );
}

export async function POST(req: Request) {
  const expected = process.env.FINES_PUSH_TOKEN?.trim();
  if (!expected) {
    log.error("[fines] FINES_PUSH_TOKEN not configured");
    return NextResponse.json({ result: "error", reason: "not_configured" }, { status: 500 });
  }
  const url = new URL(req.url);
  if (!tokenMatches(url.searchParams.get("token"), expected)) {
    return NextResponse.json({ result: "error", reason: "unauthorized" }, { status: 401 });
  }

  let body: { header?: unknown; rows?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ result: "error", reason: "bad_json" }, { status: 400 });
  }
  if (!Array.isArray(body.header) || !Array.isArray(body.rows)) {
    return NextResponse.json({ result: "error", reason: "bad_shape" }, { status: 400 });
  }
  // Cap the payload: the sheet never exceeds ~125 rows x 15 cols; anything
  // bigger is a bug in the pusher, not data to store.
  if (body.header.length > 30 || body.rows.length > 500) {
    return NextResponse.json({ result: "error", reason: "too_big" }, { status: 400 });
  }

  await db.execute(sql`
    INSERT INTO fines_snapshot (id, fetched_at, header, rows)
    VALUES (1, now(), ${JSON.stringify(body.header)}::jsonb, ${JSON.stringify(body.rows)}::jsonb)
    ON CONFLICT (id) DO UPDATE
    SET fetched_at = now(), header = EXCLUDED.header, rows = EXCLUDED.rows
  `);
  return NextResponse.json({ result: "ok", rows: body.rows.length });
}
