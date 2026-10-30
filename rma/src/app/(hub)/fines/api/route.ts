import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/platform/auth";
import { db } from "@/platform/db/client";

export const dynamic = "force-dynamic";

// /fines data feed (owner, 2026-09-19): reads the fines_snapshot mirror that
// scripts/update-fines-tab.mjs pushes hourly via /api/webhooks/fines. The
// Google "Fines" tab stays the source of truth (and the only place "Notes"
// gets edited); this route never talks to Google — the box holds no Google
// creds and the page must render even while the office Mac is asleep.

type SnapshotRow = { fetched_at: string; header: string[]; rows: string[][] };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await db.execute(
    sql`SELECT fetched_at, header, rows FROM fines_snapshot WHERE id = 1`
  );
  const row = (res.rows as unknown as SnapshotRow[])[0];
  if (!row) {
    return NextResponse.json(
      { error: "Снапшот ещё не приходил — ждём ближайший часовой прогон fines-tab." },
      { status: 503 },
    );
  }
  return NextResponse.json({ fetchedAt: row.fetched_at, header: row.header, rows: row.rows });
}
