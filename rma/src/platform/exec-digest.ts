// Executive digest for Moe (management overview) — morning full digest and
// night watchman mode.
//
// Sources: Twenty REST (pipeline stage distribution, stageEvents movement)
// + platform DB (unanswered WA threads, today's returns, overdue rentals).
// AI narrative is OPTIONAL: when the tenant's local model is configured the
// facts get an executive summary; when it is down the digest still sends as a
// plain structured report — the digest must never die with the model.
//
// Delivery: notifyTelegram to MOE_DIGEST_CHAT_ID. Not configured → the run
// logs and exits ok (visible, honest no-op).

import { sql } from "drizzle-orm";
import type { db as platformDb } from "@/platform/db/client";
import { loadAIConfig } from "@/platform/ai";
import { getTwentyClient, type TwentyClient } from "@/platform/integrations/twenty/client";

type PlatformDb = typeof platformDb;

export interface UnansweredChat {
  tenantSlug: string;
  customerName: string | null;
  thread: string;
  body: string;
  lastAt: Date;
}

export interface ReturnRow {
  tenantSlug: string;
  plate: string;
  make: string;
  model: string;
  customerName: string;
  balanceDue: number;
  returnDate: Date;
}

export interface StageMove {
  dealType: string;
  toStage: string;
  changedBy: string;
  changedAt: Date;
}

export interface DigestFacts {
  unanswered: UnansweredChat[];
  todayReturns: ReturnRow[];
  overdue: ReturnRow[];
  leaseStages: Record<string, number>;
  rentStages: Record<string, number>;
  stageMoves: StageMove[];
}

// ─── Collectors ─────────────────────────────────────────────────────────────

/** WA threads whose LATEST message is inbound and older than `olderThanHours`. */
export async function collectUnanswered(db: PlatformDb, olderThanHours = 2): Promise<UnansweredChat[]> {
  const res = await db.execute(sql`
    WITH latest AS (
      SELECT DISTINCT ON (m.tenant_id, m."from")
        m.tenant_id, m."from" AS thread, m.customer_name, m.body, m.direction, m.created_at
      FROM message m
      WHERE m.channel = 'whatsapp'
        AND m."from" NOT LIKE '%@g.us'
        AND m.created_at > now() - interval '48 hours'
      ORDER BY m.tenant_id, m."from", m.created_at DESC
    )
    SELECT t.slug AS tenant_slug, l.customer_name, l.thread, l.body, l.created_at AS last_at
    FROM latest l JOIN tenant t ON t.id = l.tenant_id
    WHERE l.direction = 'inbound'
      AND l.created_at < now() - make_interval(hours => ${olderThanHours})
    ORDER BY l.created_at ASC
    LIMIT 50
  `);
  return (res as unknown as { rows: Record<string, unknown>[] }).rows.map((r) => ({
    tenantSlug: String(r.tenant_slug),
    customerName: (r.customer_name as string | null) ?? null,
    thread: String(r.thread),
    body: String(r.body ?? "").slice(0, 120),
    lastAt: new Date(String(r.last_at)),
  }));
}

async function collectRentals(db: PlatformDb, overdueOnly: boolean): Promise<ReturnRow[]> {
  const cond = overdueOnly
    ? sql`r.status = 'active' AND r.return_date < now() - interval '12 hours'`
    : sql`r.status = 'active' AND r.return_date::date = now()::date`;
  const res = await db.execute(sql`
    SELECT t.slug AS tenant_slug, v.plate, v.make, v.model,
           c.name AS customer_name, r.balance_due, r.return_date
    FROM rental r
    JOIN vehicle v ON v.id = r.vehicle_id
    JOIN customer c ON c.id = r.customer_id
    JOIN tenant t ON t.id = r.tenant_id
    WHERE ${cond}
    ORDER BY r.return_date ASC
    LIMIT 50
  `);
  return (res as unknown as { rows: Record<string, unknown>[] }).rows.map((r) => ({
    tenantSlug: String(r.tenant_slug),
    plate: String(r.plate),
    make: String(r.make),
    model: String(r.model),
    customerName: String(r.customer_name ?? ""),
    balanceDue: Number(r.balance_due ?? 0),
    returnDate: new Date(String(r.return_date)),
  }));
}

function countByStage(records: Record<string, unknown>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    const s = String(r.stage ?? "UNKNOWN");
    out[s] = (out[s] ?? 0) + 1;
  }
  return out;
}

async function collectTwenty(client: TwentyClient): Promise<Pick<DigestFacts, "leaseStages" | "rentStages" | "stageMoves">> {
  const [leases, rents, moves] = await Promise.all([
    client.get<{ data?: { leaseDeals?: Record<string, unknown>[] } }>("rest/leaseDeals?limit=1000"),
    client.get<{ data?: { rentDeals?: Record<string, unknown>[] } }>("rest/rentDeals?limit=1000"),
    client.get<{ data?: { stageEvents?: Record<string, unknown>[] } }>(
      `rest/stageEvents?filter=changedAt[gte]:${new Date(Date.now() - 24 * 3600 * 1000).toISOString()}&limit=100`
    ),
  ]);
  return {
    leaseStages: countByStage(leases.data?.leaseDeals ?? []),
    rentStages: countByStage(rents.data?.rentDeals ?? []),
    stageMoves: (moves.data?.stageEvents ?? []).map((e) => ({
      dealType: String(e.dealType ?? "?"),
      toStage: String(e.toStage ?? "?"),
      changedBy: String(e.changedBy ?? "?"),
      changedAt: new Date(String(e.changedAt)),
    })),
  };
}

export async function collectFacts(db: PlatformDb, client?: TwentyClient): Promise<DigestFacts> {
  const twentyClient = client ?? getTwentyClient();
  const [unanswered, todayReturns, overdue] = await Promise.all([
    collectUnanswered(db),
    collectRentals(db, false),
    collectRentals(db, true),
  ]);
  let twenty: Pick<DigestFacts, "leaseStages" | "rentStages" | "stageMoves">;
  try {
    twenty = await collectTwenty(twentyClient);
  } catch {
    // Twenty down → digest still sends, pipeline section shows "недоступно".
    twenty = { leaseStages: {}, rentStages: {}, stageMoves: [] };
  }
  return { unanswered, todayReturns, overdue, ...twenty };
}

// ─── Formatting ─────────────────────────────────────────────────────────────

function fmtStages(stages: Record<string, number>): string {
  const entries = Object.entries(stages).filter(([, n]) => n > 0);
  if (entries.length === 0) return "  (нет данных)";
  return entries.map(([s, n]) => `  ${s}: ${n}`).join("\n");
}

function hoursSince(d: Date): number {
  return Math.round((Date.now() - d.getTime()) / 360000) / 10;
}

/** Critical sections only — the night watchman pings ONLY when this is non-empty. */
export function criticalLines(facts: DigestFacts, cap = 15): string[] {
  const lines: string[] = [];
  for (const c of facts.unanswered) {
    lines.push(`🔴 Без ответа ${hoursSince(c.lastAt)}ч — ${c.customerName ?? c.thread} [${c.tenantSlug}]: ${c.body}`);
  }
  for (const r of facts.overdue) {
    lines.push(`🔴 Просрочка возврата — ${r.plate} ${r.make} ${r.model}, ${r.customerName} [${r.tenantSlug}]${r.balanceDue > 0 ? `, долг ${r.balanceDue} AED` : ""}`);
  }
  // Telegram caps at ~4k chars; a flood of stale threads must not swallow the
  // message. Over-cap remainder is summarised, not dropped silently.
  if (lines.length > cap) {
    const rest = lines.length - cap;
    return [...lines.slice(0, cap), `…и ещё ${rest} (полный список — в платформе)`];
  }
  return lines;
}

export function formatMorning(facts: DigestFacts, aiNarrative: string | null): string {
  const parts: string[] = ["☀️ Утренний дайджест TAKE Auto\n"];
  if (aiNarrative) parts.push(aiNarrative + "\n");

  const critical = criticalLines(facts);
  parts.push(critical.length > 0 ? "ПРОБЛЕМЫ:\n" + critical.join("\n") : "ПРОБЛЕМЫ: нет — все чаты отвечены, просрочек нет.");

  parts.push(
    `\nВОЗВРАТЫ СЕГОДНЯ (${facts.todayReturns.length}):\n` +
      (facts.todayReturns.length > 0
        ? facts.todayReturns.map((r) => `  ${r.plate} ${r.make} ${r.model} — ${r.customerName} [${r.tenantSlug}]`).join("\n")
        : "  нет")
  );

  parts.push(`\nЛИЗИНГ (TakeAuto):\n${fmtStages(facts.leaseStages)}`);
  parts.push(`РЕНТ (Babek):\n${fmtStages(facts.rentStages)}`);

  if (facts.stageMoves.length > 0) {
    parts.push(
      `\nДВИЖЕНИЕ ПО СДЕЛКАМ за 24ч (${facts.stageMoves.length}):\n` +
        facts.stageMoves
          .slice(0, 15)
          .map((m) => `  ${m.dealType} → ${m.toStage} (${m.changedBy})`)
          .join("\n")
    );
  }
  return parts.join("\n");
}

export function formatNight(facts: DigestFacts): string | null {
  const critical = criticalLines(facts);
  if (critical.length === 0) return null; // night rule: silence when all is fine
  return "🌙 Ночной дежурный — требует внимания:\n" + critical.join("\n");
}

// ─── AI narrative (optional) ────────────────────────────────────────────────

async function aiNarrative(db: PlatformDb, facts: DigestFacts, tenantId: string | null): Promise<string | null> {
  if (!tenantId) return null;
  const cfg = await loadAIConfig(tenantId);
  if (cfg?.provider !== "local" || !cfg.localEndpoint) return null;
  const base = cfg.localEndpoint.replace(/\/+$/, "");
  const prompt =
    "Ты — executive-ассистент автопроката в Дубае. По фактам ниже напиши короткое " +
    "(3-5 предложений) резюме для руководителя по-русски: главные проблемы, что идёт " +
    "хорошо, на что обратить внимание сегодня. Без markdown, без заголовков.\n\nФакты:\n" +
    JSON.stringify({
      unanswered: facts.unanswered.length,
      overdue: facts.overdue.length,
      todayReturns: facts.todayReturns.length,
      leaseStages: facts.leaseStages,
      rentStages: facts.rentStages,
      stageMoves24h: facts.stageMoves.length,
    });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer local" },
      body: JSON.stringify({
        model: cfg.localModel ?? "qwen2.5:14b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.4,
        stream: false,
        reasoning_effort: "none",
        // The prod brain (mlx_lm.server, Qwen3-30B) ignores reasoning_effort
        // and spends 150+ tokens thinking before any content, so a 300-token
        // budget often returned a message with NO content — and the catch-all
        // below turned that into a silent "model down → plain digest". mlx-lm
        // does honour this flag; Ollama's OpenAI surface ignores it harmlessly.
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null; // model down → plain digest, never a failed digest
  }
}

// ─── Entry point ────────────────────────────────────────────────────────────

export async function runDigest(
  db: PlatformDb,
  opts: { mode: "morning" | "night"; takeAutoTenantId: string | null; send: (text: string) => Promise<{ ok: boolean; error?: string }> }
): Promise<{ sent: boolean; reason?: string }> {
  const facts = await collectFacts(db);
  const text =
    opts.mode === "morning"
      ? formatMorning(facts, await aiNarrative(db, facts, opts.takeAutoTenantId))
      : formatNight(facts);
  if (!text) return { sent: false, reason: "quiet" };
  const res = await opts.send(text);
  return res.ok ? { sent: true } : { sent: false, reason: res.error };
}
