// Minimal, dependency-free structured logger.
//
// Emits one JSON object per line to stdout/stderr so log aggregators (and
// `docker logs`) can parse level, message, tenantId and arbitrary fields
// without a regex. Prefer this over bare `console.log` in server code that
// runs per-tenant (job workers, webhook handlers) so events are attributable.
//
// This is intentionally tiny: no transports, no async, no new deps. If we ever
// outgrow it, swap the `emit` body for pino/winston without touching callers.

type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = {
  // Convention: pass `tenantId` (and `tenantSlug` when known) so every line is
  // attributable to a tenant, matching the Sentry per-tenant tag.
  tenantId?: string;
  tenantSlug?: string;
  // Anything else callers want to attach.
  [key: string]: unknown;
};

// How deep to walk nested fields looking for Error values. Errors are rarely
// passed at the top level in real call sites (`{ ctx: { err } }`, `err.cause`),
// and `JSON.stringify(new Error())` is `{}` — so without this every nested
// failure logs as an empty object.
const MAX_DEPTH = 4;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function serializeError(err: Error, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  // `cause` carries the real root failure for wrapped errors (and for
  // `AggregateError`/undici's `fetch failed`), so never drop it.
  const cause: unknown = (err as { cause?: unknown }).cause;
  if (cause !== undefined && depth < MAX_DEPTH) {
    out.cause = serializeValue(cause, depth + 1);
  }
  return out;
}

// Replace Error values anywhere in the first few levels of a field payload.
// Only plain objects/arrays are walked — class instances (Date, Buffer, …)
// are left alone so their own JSON representation still wins.
function serializeValue(v: unknown, depth: number): unknown {
  if (v instanceof Error) return serializeError(v, depth);
  if (depth >= MAX_DEPTH) return v;
  if (Array.isArray(v)) return v.map((item) => serializeValue(item, depth + 1));
  if (isPlainObject(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = serializeValue(val, depth + 1);
    return out;
  }
  return v;
}

function emit(level: LogLevel, msg: string, fields?: LogFields): void {
  const record: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...fields,
  };

  // Serialize Error values in fields (including nested ones) to something readable.
  for (const [k, v] of Object.entries(record)) {
    record[k] = serializeValue(v, 0);
  }

  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    // Circular / non-serializable payload — fall back to a safe line.
    line = JSON.stringify({ level, ts: record.ts, msg, note: "unserializable fields" });
  }

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};

// Bind a set of fields (e.g. `{ tenantId }`) once and reuse across many lines.
export function childLogger(base: LogFields) {
  return {
    debug: (msg: string, fields?: LogFields) => emit("debug", msg, { ...base, ...fields }),
    info: (msg: string, fields?: LogFields) => emit("info", msg, { ...base, ...fields }),
    warn: (msg: string, fields?: LogFields) => emit("warn", msg, { ...base, ...fields }),
    error: (msg: string, fields?: LogFields) => emit("error", msg, { ...base, ...fields }),
  };
}
