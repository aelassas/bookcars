// ============================================================================
// bot.ts — TAKE Auto Driver Telegram Bot (INTERNAL). Full guided flow:
//
//   /start -> [Handover | Return] -> plate (identify rental + company)
//   BLOCK 1 DOCUMENTS (ordered, per-doc [photo]/[no document], qwen3-vl OCR)
//     -> generate the COMPANY contract (official PDF + stamp), attach + send
//   BLOCK 2 CAR (front->back->left->right->details, then odometer, fuel)
//     -> generate the ACCEPTANCE ACT (photos embedded + items clause)
//   -> transition rental status, write driver_assignment, close task
//   -> send .ics delivery reminder + schedule Telegram fallback (-1d, -2h)
//
// This bot NEVER messages a customer. Every DB write is tenant-scoped (RLS).
// ============================================================================

import "dotenv/config";
import path from "node:path";
import { appendFileSync } from "node:fs";
import { Telegraf, session, Markup, type Context } from "telegraf";
import type { PoolClient } from "pg";
import { generateAcceptanceAct, savePdf, makeFilename, type CompanyInfo } from "./docgen";
import { fillContract, type ContractData } from "./contract-fill";
import { readDocument, downloadTelegramPhoto, type DocFields } from "./ocr";
import { DOCUMENT_STEPS, CAR_PHOTO_STEPS, LEGAL } from "./config";
import { buildIcs, scheduleTelegramReminders } from "./reminders";
import { resolveDriverByTelegramId, withTenant, closePool, type DriverIdentity } from "./db";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) { console.error("TELEGRAM_BOT_TOKEN is not set (see README)."); process.exit(1); }

const DOCS_DIR = process.env.DRIVER_BOT_DOCS_DIR ?? path.resolve(process.cwd(), "generated-docs");
const PUBLIC_BASE = process.env.DRIVER_BOT_PUBLIC_BASE ?? "";
const COMPANY: CompanyInfo = {
  name: process.env.DRIVER_BOT_COMPANY_NAME ?? "TAKE Auto Rent a Car LLC",
  addressLines: (process.env.DRIVER_BOT_COMPANY_ADDR ?? "Dubai, United Arab Emirates").split("|").map((s) => s.trim()).filter(Boolean),
};

type Kind = "handover" | "return";
type Phase = "plate" | "documents" | "car" | "odometer" | "fuel" | "done";

interface Flow {
  kind: Kind;
  phase: Phase;
  docIndex: number;
  carIndex: number;
  vehicle?: VehicleMatch;
  ocr: DocFields[];
  noDocs: string[];
  carPhotos: { label: string; image: Buffer }[];
  odometer?: number | null;
  fuel?: string;
  demo?: boolean; // fake run — generate PDFs but write NOTHING to the CRM/DB
}

// Hardcoded fake заявка for demo runs (no DB row, nothing persisted).
function demoVehicle(): VehicleMatch {
  return {
    vehicleId: "demo", make: "BMW", model: "430i (conv) 2025 black", plate: "63790 D", year: 2025, colour: "black",
    companySlug: "cardiwan", rentalId: null,
    startDate: new Date(Date.now() + 86_400_000), returnDate: new Date(Date.now() + 8 * 86_400_000),
    dailyRate: 500, totalDays: 7, deposit: 1500, total: 3500,
    customerName: "Ahmed Al Mansoori", customerPhone: "+971551234567",
  };
}

interface BotContext extends Context {
  driver?: DriverIdentity;
  session: { flow?: Flow };
}

// ─── Vehicle + rental lookup ─────────────────────────────────────────────────
interface VehicleMatch {
  vehicleId: string; make: string; model: string; plate: string; year: number | null; colour: string | null;
  companySlug: string | null;
  rentalId: string | null;
  startDate: Date | null; returnDate: Date | null; dailyRate: number | null; totalDays: number | null;
  deposit: number | null; total: number | null; customerName: string | null; customerPhone: string | null;
}

async function findVehicle(client: PoolClient, plate: string): Promise<VehicleMatch | null> {
  const veh = await client.query(
    `SELECT v.id, v.make, v.model, v.plate, v.year,
            c.slug AS company_slug
       FROM vehicle v LEFT JOIN company c ON c.id = v.company_id
      WHERE upper(replace(v.plate,' ','')) = upper(replace($1,' ',''))
      LIMIT 1`, [plate]);
  if (veh.rows.length === 0) return null;
  const v = veh.rows[0];
  const rent = await client.query(
    `SELECT r.id, r.start_date, r.return_date, r.daily_rate, r.total_days, r.deposit, r.total,
            cu.name AS customer_name, cu.phone AS customer_phone
       FROM rental r LEFT JOIN customer cu ON cu.id = r.customer_id
      WHERE r.vehicle_id = $1
      ORDER BY (r.status = 'completed') ASC, r.start_date DESC LIMIT 1`, [v.id]);
  const r = rent.rows[0] ?? null;
  return {
    vehicleId: v.id, make: v.make, model: v.model, plate: v.plate, year: v.year, colour: null,
    companySlug: v.company_slug,
    rentalId: r?.id ?? null,
    startDate: r?.start_date ?? null, returnDate: r?.return_date ?? null, dailyRate: r?.daily_rate ?? null,
    totalDays: r?.total_days ?? null, deposit: r?.deposit ?? null, total: r?.total ?? null,
    customerName: r?.customer_name ?? null, customerPhone: r?.customer_phone ?? null,
  };
}

async function findByRentalId(client: PoolClient, rentalId: string): Promise<VehicleMatch | null> {
  const q = await client.query(
    `SELECT v.id AS vehicle_id, v.make, v.model, v.plate, v.year, c.slug AS company_slug,
            r.id AS rental_id, r.start_date, r.return_date, r.daily_rate, r.total_days, r.deposit, r.total,
            cu.name AS customer_name, cu.phone AS customer_phone
       FROM rental r JOIN vehicle v ON v.id = r.vehicle_id
       LEFT JOIN company c ON c.id = v.company_id
       LEFT JOIN customer cu ON cu.id = r.customer_id
      WHERE r.id = $1 LIMIT 1`, [rentalId]);
  if (!q.rows.length) return null;
  const r = q.rows[0];
  return { vehicleId: r.vehicle_id, make: r.make, model: r.model, plate: r.plate, year: r.year, colour: null,
    companySlug: r.company_slug, rentalId: r.rental_id, startDate: r.start_date, returnDate: r.return_date,
    dailyRate: r.daily_rate, totalDays: r.total_days, deposit: r.deposit, total: r.total,
    customerName: r.customer_name, customerPhone: r.customer_phone };
}

async function insertDocument(client: PoolClient, a: { tenantId: string; entityType: string; entityId: string; category: string; filename: string; sizeBytes: number; storageKey: string; publicUrl: string }): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO document (tenant_id, entity_type, entity_id, category, filename, mime_type, size_bytes, storage_key, public_url, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,'application/pdf',$6,$7,$8,NULL) RETURNING id`,
    [a.tenantId, a.entityType, a.entityId, a.category, a.filename, a.sizeBytes, a.storageKey, a.publicUrl]);
  return rows[0].id;
}

/**
 * Put an event on the car's own timeline.
 *
 * A document filed against a rental is invisible from the car: `document` links
 * polymorphically to the rental, so opening the vehicle showed nothing of the
 * handover that just happened. Writing the event here is what makes the car's
 * calendar a real archive — every contract, act, handover and return lands on
 * the timeline with the moment it occurred, which is also what a later RAG
 * layer reads to answer "what happened with this car".
 *
 * Deliberately best-effort: the driver already has their PDF and the rental has
 * already transitioned by the time this runs. Losing a timeline row is a gap in
 * the archive; throwing here would fail a handover that physically happened.
 */
async function insertTimelineEvent(
  client: PoolClient,
  a: {
    tenantId: string; vehicleId: string; type: string; title: string;
    at: Date; documentId?: string | null; rentalId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO vehicle_timeline_event
         (tenant_id, vehicle_id, type, starts_at, ends_at, status, title, rental_id, document_id, meta)
       VALUES ($1,$2,$3,$4,$4,'done',$5,$6,$7,$8)`,
      [a.tenantId, a.vehicleId, a.type, a.at, a.title, a.rentalId ?? null,
       a.documentId ?? null, JSON.stringify({ source: "driver-bot", ...(a.meta ?? {}) })],
    );
  } catch (e) {
    console.error("[timeline] could not record event:", e);
  }
}

// ─── Flow helpers ────────────────────────────────────────────────────────────
function fresh(kind: Kind): Flow {
  return { kind, phase: "plate", docIndex: 0, carIndex: 0, ocr: [], noDocs: [], carPhotos: [] };
}
function photoFileId(ctx: BotContext): string | undefined {
  const m = ctx.message;
  if (m && "photo" in m && Array.isArray(m.photo) && m.photo.length) return m.photo[m.photo.length - 1].file_id;
  return undefined;
}
function textOf(ctx: BotContext): string | undefined {
  const m = ctx.message;
  return m && "text" in m && typeof m.text === "string" ? m.text.trim() : undefined;
}

async function askNextDoc(ctx: BotContext, f: Flow): Promise<void> {
  if (f.docIndex >= DOCUMENT_STEPS.length) return startCarBlock(ctx, f);
  const d = DOCUMENT_STEPS[f.docIndex];
  const kb = d.required
    ? undefined
    : Markup.inlineKeyboard([Markup.button.callback(`🚫 ${d.skipLabel}`, "nodoc")]);
  await ctx.reply(`📄 Block 1 — Documents (${f.docIndex + 1}/${DOCUMENT_STEPS.length})\nSend a photo of the *${d.label}*.` + (d.required ? " (required)" : ""),
    { parse_mode: "Markdown", ...(kb ?? {}) });
}

async function startCarBlock(ctx: BotContext, f: Flow): Promise<void> {
  // Generate + deliver the company contract from OCR + rental data first.
  await ctx.reply("Documents captured. Generating the rental contract…");
  await generateAndSendContract(ctx, f);
  f.phase = "car"; f.carIndex = 0;
  await askNextCarPhoto(ctx, f);
}

async function askNextCarPhoto(ctx: BotContext, f: Flow): Promise<void> {
  if (f.carIndex >= CAR_PHOTO_STEPS.length) { f.phase = "odometer"; await ctx.reply("🔢 Send the *odometer* — a photo or the number in km.", { parse_mode: "Markdown" }); return; }
  const s = CAR_PHOTO_STEPS[f.carIndex];
  await ctx.reply(`📷 Block 2 — Vehicle (${f.carIndex + 1}/${CAR_PHOTO_STEPS.length})\nSend a photo: *${s.label}*.`, { parse_mode: "Markdown" });
}

// Merge OCR results into contract fields (first non-empty wins per field).
function mergeOcr(f: Flow): ContractData {
  const g = (k: keyof DocFields) => f.ocr.map((o) => o[k]).find((v) => v && String(v).trim());
  const v = f.vehicle!;
  const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-GB") : "");
  const time = (d: Date | null) => (d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "");
  return {
    contractNo: v.rentalId ?? v.vehicleId,
    firstName: g("firstName"), lastName: g("lastName"), dob: g("dob"), nationality: g("nationality"),
    mobile: v.customerPhone ?? undefined,
    eid: f.ocr.find((o) => o.number && o.raw?.includes("784"))?.number, // Emirates ID heuristic
    passport: undefined, license: g("number"), issueDate: g("issueDate"), expiryDate: g("expiryDate"),
    make: v.make, model: v.model, plate: v.plate, colour: v.colour ?? undefined,
    dropOffDate: fmt(v.startDate), dropOffTime: time(v.startDate), pickupDate: fmt(v.returnDate), pickupTime: time(v.returnDate),
    ratePerDay: v.dailyRate != null ? String(v.dailyRate) : "", totalDays: v.totalDays != null ? String(v.totalDays) : "",
    totalPrice: v.total != null ? String(v.total) : "", deposit: v.deposit != null ? String(v.deposit) : "",
    odometer: f.odometer != null ? String(f.odometer) : "",
  };
}

async function generateAndSendContract(ctx: BotContext, f: Flow): Promise<void> {
  const driver = ctx.driver!; const v = f.vehicle!;
  try {
    const data = mergeOcr(f);
    const buf = await fillContract(v.companySlug, data);
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `${makeFilename("rental-contract", v.plate, stamp)}.pdf`;
    if (!f.demo) {
      const savedPath = await savePdf(buf, DOCS_DIR, name);
      const url = PUBLIC_BASE ? `${PUBLIC_BASE.replace(/\/$/, "")}/${name}` : `file://${savedPath}`;
      await withTenant(driver.tenantId, async (client) => {
        const entityType = v.rentalId ? "rental" : "vehicle";
        const entityId = v.rentalId ?? v.vehicleId;
        const documentId = await insertDocument(client, { tenantId: driver.tenantId, entityType, entityId, category: "rental_contract", filename: name, sizeBytes: buf.length, storageKey: savedPath, publicUrl: url });
        if (v.rentalId) await client.query(`UPDATE rental SET contract_url = $2, updated_at = now() WHERE id = $1`, [v.rentalId, url]).catch(() => {});
        await insertTimelineEvent(client, {
          tenantId: driver.tenantId, vehicleId: v.vehicleId, type: "document",
          title: "Договор аренды", at: new Date(), documentId, rentalId: v.rentalId ?? null,
          meta: { category: "rental_contract", filename: name },
        });
      });
    }
    await ctx.replyWithDocument({ source: buf, filename: name }, { caption: f.demo ? "✍️ (ДЕМО) Договор с печатью компании — в CRM НЕ сохранён." : "✍️ Company-signed rental contract. The client signs at handover. Sent to Admin (attached to the deal)." });
  } catch (e) {
    console.error("[contract] failed:", e);
    await ctx.reply("⚠️ Could not generate the contract (template/stamp issue). Continuing with the vehicle photos; contract can be regenerated.");
  }
}

async function finalizeAct(ctx: BotContext, f: Flow): Promise<void> {
  const driver = ctx.driver!; const v = f.vehicle!;
  await ctx.reply("Generating the acceptance act…");
  try {
    const now = new Date();
    const actBuf = await generateAcceptanceAct({
      kind: f.kind, company: COMPANY,
      vehicle: { make: v.make, model: v.model, plate: v.plate, year: v.year },
      customer: { name: v.customerName ?? "—", phone: v.customerPhone },
      condition: { odometer: f.odometer ?? null, fuel: f.fuel ?? null, notes: f.noDocs.length ? `Missing docs: ${f.noDocs.join(", ")}` : null },
      date: now, reference: v.rentalId ?? v.vehicleId,
      photos: f.carPhotos, itemsClause: LEGAL.itemsLeftClause,
    });
    const stamp = now.toISOString().slice(0, 10);
    const name = `${makeFilename(f.kind === "return" ? "return-act" : "handover-act", v.plate, stamp)}.pdf`;

    let transitioned = false;
    if (!f.demo) {
      const savedPath = await savePdf(actBuf, DOCS_DIR, name);
      const url = PUBLIC_BASE ? `${PUBLIC_BASE.replace(/\/$/, "")}/${name}` : `file://${savedPath}`;
      await withTenant(driver.tenantId, async (client) => {
        const entityType = v.rentalId ? "rental" : "vehicle";
        const entityId = v.rentalId ?? v.vehicleId;
        const documentId = await insertDocument(client, { tenantId: driver.tenantId, entityType, entityId, category: f.kind === "return" ? "return_act" : "handover_act", filename: name, sizeBytes: actBuf.length, storageKey: savedPath, publicUrl: url });
        // The act IS the moment of handover/return, so it goes on the timeline
        // as that event rather than as a generic document — the calendar then
        // shows when the car physically left and came back, with the signed
        // paper attached to the exact moment.
        await insertTimelineEvent(client, {
          tenantId: driver.tenantId, vehicleId: v.vehicleId,
          type: f.kind === "return" ? "return" : "handover",
          title: f.kind === "return" ? "Возврат машины" : "Выдача машины",
          at: now, documentId, rentalId: v.rentalId ?? null,
          meta: {
            odometer: f.odometer ?? null, fuel: f.fuel ?? null,
            driver: driver.name, photos: f.carPhotos.length,
            missingDocs: f.noDocs.length ? f.noDocs : undefined,
          },
        });
        if (v.rentalId) {
          if (f.kind === "handover") {
            const { rowCount } = await client.query(`UPDATE rental SET status='active', updated_at=now() WHERE id=$1 AND status='reserved'`, [v.rentalId]);
            transitioned = (rowCount ?? 0) > 0;
            if (transitioned) await client.query(`INSERT INTO driver_assignment (tenant_id, driver_id, vehicle_id, rental_id, from_ts) VALUES ($1,$2,$3,$4,now()) ON CONFLICT DO NOTHING`, [driver.tenantId, driver.id, v.vehicleId, v.rentalId]);
          } else {
            const { rowCount } = await client.query(`UPDATE rental SET status='returned', actual_return_date=now(), updated_at=now() WHERE id=$1 AND status='active'`, [v.rentalId]);
            transitioned = (rowCount ?? 0) > 0;
            await client.query(`UPDATE driver_assignment SET to_ts=now(), updated_at=now() WHERE rental_id=$1 AND to_ts IS NULL`, [v.rentalId]);
          }
        }
        await client.query(`UPDATE task SET status='done', updated_at=now() WHERE status<>'done' AND (description ILIKE '%'||$1||'%' OR title ILIKE '%'||$1||'%')`, [v.vehicleId]).catch(() => {});
      });
    }

    await ctx.replyWithDocument({ source: actBuf, filename: name }, { caption: f.demo ? "(ДЕМО) Акт приёма-передачи — фото вшиты, в CRM НЕ сохранён." : `${f.kind === "return" ? "Return" : "Handover"} acceptance act — photos embedded, attached to the deal.` });

    // Reminders (handover only, when a delivery date exists).
    if (f.kind === "handover" && v.startDate) {
      const title = `Deliver ${v.make} ${v.model} (${v.plate})${v.customerName ? " to " + v.customerName : ""}`;
      const ics = buildIcs({ uid: v.rentalId ?? v.vehicleId, deliveryAt: new Date(v.startDate), title, notes: "TAKE Auto delivery" });
      await ctx.replyWithDocument({ source: ics, filename: "delivery-reminder.ics" }, { caption: "📅 Add this to your phone calendar (reminds you -1 day and -2 hours). If you don't, I'll message you as a fallback." });
      if (ctx.chat) scheduleTelegramReminders(bot, ctx.chat.id, { uid: v.rentalId ?? v.vehicleId, deliveryAt: new Date(v.startDate), title });
    }

    await ctx.reply(f.demo
      ? `✅ ДЕМО-выдача пройдена — ${v.make} ${v.model} (${v.plate}). В CRM ничего не записано. Оба PDF выше. Нажми ✅ Подтвердить на карточке для нового прогона.`
      : `✅ ${f.kind === "return" ? "Return" : "Handover"} recorded for ${v.make} ${v.model} (${v.plate}).` + (transitioned ? (f.kind === "handover" ? " Rental is now ACTIVE." : " Rental marked RETURNED.") : " (status unchanged — check manually.)") + "\nSend /start for another.");
  } catch (e) {
    console.error("[act] failed:", e);
    await ctx.reply("⚠️ Something went wrong generating the act. Nothing partial was saved. Please /start again or contact the office.");
  } finally {
    ctx.session.flow = undefined;
  }
}

// ─── Bot wiring ──────────────────────────────────────────────────────────────
const bot = new Telegraf<BotContext>(BOT_TOKEN);
bot.use(session({ defaultSession: () => ({}) }));

// Passive group observer: in groups/supergroups the bot ONLY logs messages
// (for coordination analysis) and NEVER runs driver flows or replies — this
// prevents "not a driver" spam once privacy mode is off.
const GROUP_LOG = path.resolve(process.cwd(), "observed-telegram-groups.jsonl");
// Loose view over the heterogeneous Telegram message union — only the fields
// the group observer logs; everything is optional because service messages
// carry none of them.
interface ObservedGroupMessage {
  message_id?: number;
  text?: string;
  caption?: string;
  photo?: unknown;
  document?: unknown;
  video?: unknown;
  voice?: unknown;
  audio?: unknown;
  sticker?: unknown;
  reply_to_message?: { message_id?: number };
}

bot.use(async (ctx, next) => {
  const chat = ctx.chat;
  if (chat && (chat.type === "group" || chat.type === "supergroup")) {
    try {
      const m = ((ctx.message ?? ctx.editedMessage) ?? {}) as ObservedGroupMessage;
      appendFileSync(GROUP_LOG, JSON.stringify({
        ts: new Date().toISOString(),
        chatId: chat.id, chatTitle: chat.title ?? null, chatType: chat.type,
        fromId: ctx.from?.id ?? null,
        fromName: [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || ctx.from?.username || null,
        username: ctx.from?.username ?? null,
        messageId: m.message_id ?? null,
        text: m.text ?? m.caption ?? null,
        hasMedia: !!(m.photo || m.document || m.video || m.voice || m.audio || m.sticker),
        replyTo: m.reply_to_message?.message_id ?? null,
      }) + "\n");
    } catch { /* never break on logging */ }
    return; // groups: log only, skip identity + all handlers
  }
  return next();
});

bot.use(async (ctx, next) => {
  const tgId = ctx.from?.id;
  if (!tgId) return;
  try {
    const driver = await resolveDriverByTelegramId(tgId);
    if (!driver) { await ctx.reply("You are not registered as a driver. Ask the office to add your Telegram ID: " + tgId); return; }
    ctx.driver = driver;
  } catch (e) { console.error("[identity]", e); await ctx.reply("Temporary problem verifying your account. Try again shortly."); return; }
  return next();
});

bot.start(async (ctx) => {
  ctx.session.flow = undefined;
  await ctx.reply(`Hello ${ctx.driver?.name ?? "driver"}. What are you recording?`,
    Markup.inlineKeyboard([[Markup.button.callback("🚗 Handover", "kind:handover"), Markup.button.callback("↩️ Return", "kind:return")]]));
});

bot.action(/^kind:(handover|return)$/, async (ctx) => {
  const kind = ctx.match[1] as Kind;
  ctx.session.flow = fresh(kind);
  await ctx.answerCbQuery();
  await ctx.reply("Enter the vehicle *plate number*:", { parse_mode: "Markdown" });
});

bot.action("nodoc", async (ctx) => {
  const f = ctx.session.flow; if (!f || f.phase !== "documents") { await ctx.answerCbQuery(); return; }
  const d = DOCUMENT_STEPS[f.docIndex];
  f.noDocs.push(d.label); f.docIndex++;
  await ctx.answerCbQuery(`Marked: ${d.skipLabel}`);
  await askNextDoc(ctx, f);
});

// Delivery-request card buttons: Confirm -> schedule reminders + start handover; Calendar -> .ics.
bot.action(/^confirm:(.+)$/, async (ctx) => {
  const driver = ctx.driver!; const rentalId = ctx.match[1];
  await ctx.answerCbQuery("Заявка подтверждена ✅");
  if (rentalId === "demo") {
    ctx.session.flow = { kind: "handover", phase: "documents", docIndex: 0, carIndex: 0, vehicle: demoVehicle(), ocr: [], noDocs: [], carPhotos: [], demo: true };
    await ctx.reply("✅ Демо-заявка подтверждена (ТЕСТ — в CRM ничего не пишется).\nНачинаем выдачу: BMW 430i (63790 D). Документы:");
    await askNextDoc(ctx, ctx.session.flow);
    return;
  }
  const match = await withTenant(driver.tenantId, (c) => findByRentalId(c, rentalId));
  if (!match) { await ctx.reply("Заявка не найдена."); return; }
  if (match.startDate && ctx.chat) scheduleTelegramReminders(bot, ctx.chat.id, { uid: rentalId, deliveryAt: new Date(match.startDate), title: `Deliver ${match.make} ${match.model} (${match.plate})` });
  ctx.session.flow = { kind: "handover", phase: "documents", docIndex: 0, carIndex: 0, vehicle: match, ocr: [], noDocs: [], carPhotos: [] };
  await ctx.reply(`✅ Заявка подтверждена. Напоминания за 24ч и 2ч поставлены.\nНачинаем выдачу — ${match.make} ${match.model} (${match.plate}).`);
  await askNextDoc(ctx, ctx.session.flow);
});

bot.action(/^cal:(.+)$/, async (ctx) => {
  const driver = ctx.driver!; const rentalId = ctx.match[1];
  await ctx.answerCbQuery("Календарь");
  if (rentalId === "demo") {
    const v = demoVehicle();
    const ics = buildIcs({ uid: "demo", deliveryAt: v.startDate as Date, title: `Deliver ${v.make} ${v.model} (${v.plate})`, notes: `Client: ${v.customerName}` });
    await ctx.replyWithDocument({ source: ics, filename: "delivery.ics" }, { caption: "📅 (ДЕМО) Добавь в календарь — напомнит за 1 день и за 2 часа." });
    return;
  }
  const match = await withTenant(driver.tenantId, (c) => findByRentalId(c, rentalId));
  if (!match || !match.startDate) { await ctx.reply("Дата доставки не найдена."); return; }
  const ics = buildIcs({ uid: rentalId, deliveryAt: new Date(match.startDate), title: `Deliver ${match.make} ${match.model} (${match.plate})`, notes: `Client: ${match.customerName ?? "—"}` });
  await ctx.replyWithDocument({ source: ics, filename: "delivery.ics" }, { caption: "📅 Добавь в календарь телефона — напомнит за 1 день и за 2 часа." });
});

bot.command("cancel", async (ctx) => { ctx.session.flow = undefined; await ctx.reply("Cancelled. Send /start to begin."); });
bot.help(async (ctx) => ctx.reply("TAKE Auto Driver Bot. /start — record a Handover or Return. /cancel — abort."));

// Photos: route by phase (documents -> OCR; car block; odometer photo).
bot.on("photo", async (ctx) => {
  const f = ctx.session.flow; if (!f) { await ctx.reply("Send /start to begin."); return; }
  const fileId = photoFileId(ctx); if (!fileId) return;
  if (f.phase === "documents") {
    const d = DOCUMENT_STEPS[f.docIndex];
    await ctx.reply(`Reading ${d.label}…`);
    try {
      const img = await downloadTelegramPhoto(fileId, BOT_TOKEN);
      const fields = await readDocument(img, d.ocrKind);
      f.ocr.push(fields);
      await ctx.reply(`✅ ${d.label}: ${[fields.firstName, fields.lastName, fields.number].filter(Boolean).join(" · ") || "captured"}`);
    } catch (e) { console.error("[ocr]", e); f.ocr.push({}); await ctx.reply(`✅ ${d.label} received (could not read all fields).`); }
    f.docIndex++;
    await askNextDoc(ctx, f);
  } else if (f.phase === "car") {
    const s = CAR_PHOTO_STEPS[f.carIndex];
    try { const img = await downloadTelegramPhoto(fileId, BOT_TOKEN); f.carPhotos.push({ label: s.label, image: img }); }
    catch (e) { console.error("[carphoto]", e); }
    await ctx.reply(`✅ ${s.label} — saved.`);
    f.carIndex++;
    await askNextCarPhoto(ctx, f);
  } else if (f.phase === "odometer") {
    try { const img = await downloadTelegramPhoto(fileId, BOT_TOKEN); f.carPhotos.push({ label: "Odometer", image: img }); } catch { /* */ }
    await ctx.reply("✅ Odometer photo saved. Now send the *fuel* level (e.g. Full, 3/4, 1/2, 1/4, Empty).", { parse_mode: "Markdown" });
    f.phase = "fuel";
  } else {
    await ctx.reply("Please follow the current step (or /cancel).");
  }
});

// Text: route by phase (plate; odometer number; fuel).
bot.on("text", async (ctx) => {
  const f = ctx.session.flow; if (!f) { await ctx.reply("Send /start to record a handover or return."); return; }
  const text = textOf(ctx) ?? "";
  if (text === "/cancel") { ctx.session.flow = undefined; await ctx.reply("Cancelled."); return; }

  if (f.phase === "plate") {
    const driver = ctx.driver!;
    const match = await withTenant(driver.tenantId, (c) => findVehicle(c, text));
    if (!match) { await ctx.reply(`No vehicle found for plate "${text}". Try again or /cancel.`); return; }
    f.vehicle = match; f.phase = "documents"; f.docIndex = 0;
    await ctx.reply(`Vehicle: ${match.make} ${match.model} (${match.plate})${match.companySlug ? " · " + match.companySlug : ""}.`);
    await askNextDoc(ctx, f);
  } else if (f.phase === "odometer") {
    const n = Number(text.replace(/[^\d]/g, ""));
    f.odometer = Number.isFinite(n) && n > 0 ? n : null;
    f.phase = "fuel";
    await ctx.reply("Now send the *fuel* level (e.g. Full, 3/4, 1/2, 1/4, Empty).", { parse_mode: "Markdown" });
  } else if (f.phase === "fuel") {
    f.fuel = text;
    await finalizeAct(ctx, f);
  } else {
    await ctx.reply("Please send a *photo* for the current step, or /cancel.", { parse_mode: "Markdown" });
  }
});

bot.catch((err, ctx) => console.error(`[bot] error for update ${ctx.update.update_id}:`, err));

async function main(): Promise<void> { await bot.launch(); console.log("TAKE Auto Driver Bot running (full flow)."); }
async function shutdown(sig: string): Promise<void> { console.log(`\n${sig} shutting down…`); try { bot.stop(sig); } catch { /* */ } await closePool(); process.exit(0); }
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
main().catch((e) => { console.error("Fatal startup error:", e); process.exit(1); });
