/**
 * sql.ts — READ-ONLY SQL access for the rental reports page.
 *
 * Two data sources, both queried with SELECT-only statements:
 *   1. The rental Twenty Postgres, via `docker exec twenty-rental-db-1 psql`
 *      over the container's unix socket (no credentials required — the
 *      postgres:16 image trusts the local socket for the `postgres` user).
 *      The rental DB publishes no host port, so the container exec is the
 *      only host-side path to it.
 *   2. The platform DB (localhost:5432/mycrm), via `psql` + DATABASE_URL.
 *
 * Every query is wrapped as `json_agg(row_to_json(...))` so the result is a
 * single JSON document on stdout — no CSV/tab escaping to get wrong. Queries
 * are fully internal (never built from user input); date bounds are validated
 * ISO strings before interpolation.
 */
import { execFile } from "node:child_process";

const DOCKER = "/opt/homebrew/bin/docker";
const PSQL = "/opt/homebrew/bin/psql";

const RENTAL_CONTAINER = "twenty-rental-db-1";
const RENTAL_DB = "default";
const RENTAL_USER = "postgres";

const EXEC_TIMEOUT_MS = 60_000;

/** Run a command and return stdout. Rejects on non-zero exit or timeout. */
function run(
  file: string,
  args: string[],
  label: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { timeout: EXEC_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          const detail = (stderr || String(error.message || error)).trim();
          reject(new Error(`${label} failed: ${detail.slice(0, 400)}`));
          return;
        }
        resolve(stdout);
      }
    );
  });
}

function wrapJson(sql: string): string {
  // json_agg over a zero-row set is NULL; COALESCE keeps the parse simple.
  return `SELECT COALESCE(json_agg(t), '[]'::json) FROM (${sql}) t`;
}

function parseRows(stdout: string, label: string): unknown[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error(`expected a JSON array, got ${typeof parsed}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(
      `${label}: could not parse psql output (${String(err).slice(0, 200)}): ${trimmed.slice(0, 200)}`
    );
  }
}

/** Run a SELECT against the rental Twenty Postgres; returns row objects. */
export async function queryRental<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const wrapped = wrapJson(sql);
  const stdout = await run(
    DOCKER,
    [
      "exec",
      RENTAL_CONTAINER,
      "psql",
      "-U",
      RENTAL_USER,
      "-d",
      RENTAL_DB,
      "-X",
      "-A",
      "-t",
      "-c",
      wrapped,
    ],
    "rental psql"
  );
  return parseRows(stdout, "rental psql") as T[];
}

/** Run a SELECT against the platform DB (localhost mycrm); returns row objects. */
export async function queryPlatform<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in this process");
  const wrapped = wrapJson(sql);
  const stdout = await run(
    PSQL,
    [url, "-X", "-A", "-t", "-c", wrapped],
    "platform psql"
  );
  return parseRows(stdout, "platform psql") as T[];
}
