// Local embeddings for semantic search (ADR-001 §15.2). No data leaves the box.
//
// ⚠️ NOT WIRED since 2026-08-31. This still calls Ollama, and Ollama was removed
// from the machine (see docs/AI-STACK.md): it was holding 9.4 GB resident to run
// a vision model the brain never needed. Nothing broke — `indexDoc` is called
// from nowhere, the heartbeat runs the KEYWORD reindexer ("no embeddings —
// cheap"), and search_doc carries 27 vectors against 403,759 rows, left over
// from an experiment.
//
// The frozen design puts RAG embeddings on BGE (small). Point EMBED_BASE_URL /
// EMBED_MODEL at it and confirm the dimension still matches
// search_doc.embedding vector(1024) BEFORE re-enabling any caller — a
// dimension change means a re-index of every row, not a config edit.

const EMBED_BASE = process.env.EMBED_BASE_URL || "http://localhost:11434";
const EMBED_MODEL = process.env.EMBED_MODEL || "qwen3-embedding:0.6b";
export const EMBED_DIM = 1024;

export async function embed(text: string): Promise<number[]> {
  const input = (text || "").slice(0, 8000);
  const res = await fetch(`${EMBED_BASE}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // keep_alive "5m": let ollama's TTL unload the model instead of pinning
    // ~1 GB forever (keep_alive:-1) — the box's RAM belongs to the MLX 30B.
    body: JSON.stringify({ model: EMBED_MODEL, input, keep_alive: "5m" }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`embed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 200));
  const json = (await res.json()) as { embeddings?: number[][] };
  const v = json.embeddings?.[0];
  if (!Array.isArray(v) || v.length === 0) throw new Error("embed: empty embedding");
  return v;
}

/** pgvector literal: [0.1,0.2,...] */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
