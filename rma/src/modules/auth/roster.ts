import { sql } from "drizzle-orm";
import { db } from "@/platform/db/client";

export type RosterEntry = { name: string };

/**
 * The name+PIN sign-in roster: staff who have a PIN set AND at least one brand
 * membership (so orphan/second-number accounts and un-provisioned rows never
 * appear as a tappable name). Distinct names only — the name is the login key,
 * so an ambiguous name is excluded rather than shown twice. Ordered A→Z.
 */
export async function loginRoster(): Promise<RosterEntry[]> {
  const rows = (await db.execute(sql`
    SELECT u.name
    FROM "user" u
    WHERE u.password IS NOT NULL
      AND u.roster_visible = true
      AND u.name IS NOT NULL AND btrim(u.name) <> ''
      AND EXISTS (SELECT 1 FROM tenant_member tm WHERE tm.user_id = u.id)
    GROUP BY u.name
    HAVING count(*) = 1
    ORDER BY u.name
  `)) as unknown as { rows: { name: string }[] };
  return rows.rows.map((r) => ({ name: r.name }));
}
