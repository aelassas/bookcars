"use client";
// «Мой день» — одна колонка, крупные тапы, для телефона. Логика Kvadrat:
// каждая строка = владелец + статус в жизненном цикле + свежесть. «⏳ Ждут
// ответа» — красное число-заголовок (это метрика «Missed Entry»); «✅ Отвечено
// сегодня» — метрика «сделано-отправлено». Ноль навигации: всё на экране.
//
// Styling: design-system tokens ONLY (bg-surface/bg-sunken, text-ink*,
// border-line, rounded-card/field) — как в PulseBoard.tsx, НИКАКИХ slate/white.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MessageCircle, X } from "lucide-react";
import type { ConvoLink, MyDay as MyDayData } from "@/modules/crm/my-queries";
import { dismissCard, type DismissCardKind } from "@/modules/crm/actions";

function waitLabel(min: number): string {
  if (min < 60) return `waiting ${min} min`;
  const h = Math.floor(min / 60);
  return `waiting ${h} h`;
}

function waitBadgeClass(min: number): string {
  // Свежесть: чем дольше молчим, тем горячее бейдж.
  if (min >= 120) return "bg-red-600 text-white";
  if (min >= 30) return "bg-amber-500 text-white";
  return "bg-sunken text-ink-2";
}

// Куда ведёт «Ответить»: в полноэкранный ChatThread на карточке лида/клиента,
// если разговор пришит к записи; иначе — в живую доску /pulse (owner ask
// 2026-07-24: «нажал → вошёл в диалог», без тесного окошка).
function convoHref(link: ConvoLink, tenantSlug: string): string {
  if (link.relatedEntityType === "lead" && link.relatedEntityId) {
    return `/${tenantSlug}/crm/leads/${link.relatedEntityId}`;
  }
  const customerId =
    link.relatedEntityType === "customer" ? link.relatedEntityId : link.customerId;
  if (customerId) return `/${tenantSlug}/customers/${customerId}`;
  return `/${tenantSlug}/pulse`;
}

// Цифры для wa.me из контакта (coalesce(from_pn, from)). from_pn — настоящий
// номер; DM-jid «<номер>@s.whatsapp.net» тоже даёт номер. Приватные @lid и
// группы @g.us НЕ содержат настоящего номера — тогда кнопки нет.
function waDigits(contact: string): string | null {
  if (contact.includes("@lid") || contact.includes("@g.us")) return null;
  const digits = contact.split("@")[0].replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function Chips({ car, priceAed }: { car: string | null; priceAed: number | null }) {
  if (!car && priceAed == null) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1 text-[13px]">
      {car && <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-2">{car}</span>}
      {priceAed != null && (
        <span className="rounded-full bg-sunken px-2 py-0.5 text-ink-2 tnum">
          {priceAed.toLocaleString()} AED
        </span>
      )}
    </div>
  );
}

function SectionHeader({
  emoji,
  title,
  count,
  tone = "ink",
}: {
  emoji: string;
  title: string;
  count: number;
  tone?: "ink" | "danger";
}) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-[15px] font-semibold text-ink">
        {emoji} {title}
      </h2>
      <span
        className={`ml-auto text-[15px] font-bold tnum ${
          tone === "danger" && count > 0 ? "text-red-500" : "text-ink-2"
        }`}
      >
        {count}
      </span>
    </div>
  );
}

// Быстрые причины закрытия — чтобы «учиться, что закрываем» (0057). Пусто →
// закрыть без причины.
const QUICK_REASONS = ["Replied on WhatsApp", "Not relevant", "Duplicate"] as const;

// Ряд действий под карточкой: «Перейти в WhatsApp» (wa.me, 1:1 к человеку) и ✕
// «Закрыть». Оба — соседи блока-ссылки карточки, НЕ вложены в неё (вложенные
// <a> невалидны), поэтому тап по телу карточки и по кнопкам не конфликтует.
function CardActions({
  kind,
  line,
  contact,
  tenantSlug,
}: {
  kind: DismissCardKind;
  line: string;
  contact: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState(false);
  const digits = waDigits(contact);

  function dismiss(reason: string | null) {
    startTransition(async () => {
      await dismissCard(tenantSlug, kind, line, contact, reason);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 border-t border-line-soft pt-2">
      <div className="flex items-center gap-2 text-[12px]">
        {digits ? (
          <a
            href={`https://wa.me/${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : (
          <span className="text-ink-3">No number found</span>
        )}
        <button
          type="button"
          onClick={() => setChoosing((v) => !v)}
          disabled={pending}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-ink-3 transition-colors hover:bg-sunken hover:text-ink-2 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </div>
      {choosing && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => dismiss(r)}
              disabled={pending}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-brand-400 disabled:opacity-50"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => dismiss(null)}
            disabled={pending}
            className="rounded-full px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:text-ink-2 disabled:opacity-50"
          >
            Just close
          </button>
        </div>
      )}
    </div>
  );
}

export function MyDay({
  data,
  ownerName,
  tenantSlug,
}: {
  data: MyDayData;
  ownerName: string | null;
  tenantSlug: string;
}) {
  const { waiting, hot, answeredToday, intel } = data;

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 pb-16 text-[15px]">
      <header className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          ☀️ My day{ownerName ? `, ${ownerName}` : ""}
        </h1>
        <p className="text-[13px] text-ink-3">Updates automatically</p>
      </header>

      {/* Верхняя сводка: два больших числа — что горит и что уже сделано. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div
            className={`text-4xl font-bold tnum ${
              waiting.length > 0 ? "text-red-500" : "text-ink"
            }`}
          >
            {waiting.length}
          </div>
          <div className="mt-1 text-[13px] text-ink-2">⏳ Awaiting reply</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="text-4xl font-bold tnum text-emerald-500">{answeredToday}</div>
          <div className="mt-1 text-[13px] text-ink-2">✅ Answered today</div>
        </div>
      </div>

      {/* 1. Ждут ответа — самый старый молчащий сверху. */}
      <section className="space-y-2">
        <SectionHeader emoji="⏳" title="Awaiting reply" count={waiting.length} tone="danger" />
        {waiting.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-soft px-4 py-6 text-center text-[13px] text-ink-3">
            No one is waiting — nice. 🎉
          </p>
        ) : (
          waiting.map((w) => (
            <div
              key={`${w.line}:${w.contact}`}
              className="rounded-card border border-line bg-surface p-3 shadow-card"
            >
              <Link
                href={convoHref(w, tenantSlug)}
                className="block rounded-field transition-colors active:bg-sunken"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{w.name}</span>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${waitBadgeClass(
                      w.waitingMin
                    )}`}
                  >
                    {waitLabel(w.waitingMin)}
                  </span>
                </div>
                {w.lastLine && (
                  <p className="mt-1 line-clamp-2 text-[14px] text-ink-2">{w.lastLine}</p>
                )}
                <Chips car={w.car} priceAed={w.priceAed} />
                <div className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-3">
                  {w.ownerName && <span>Line: {w.ownerName}</span>}
                  <span className="ml-auto font-medium text-brand-400">Reply →</span>
                </div>
              </Link>
              <CardActions kind="waiting" line={w.line} contact={w.contact} tenantSlug={tenantSlug} />
            </div>
          ))
        )}
      </section>

      {/* 2. Горячее за 24ч. */}
      <section className="space-y-2">
        <SectionHeader emoji="🔥" title="Hot in last 24h" count={hot.length} />
        {hot.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-soft px-4 py-6 text-center text-[13px] text-ink-3">
            Nothing yet.
          </p>
        ) : (
          hot.map((h) => (
            <div
              key={h.id}
              className="rounded-card border border-red-500/50 bg-red-500/5 p-3 shadow-card"
            >
              <Link
                href={convoHref(h, tenantSlug)}
                className="block rounded-field transition-colors active:bg-red-500/10"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-ink">{h.name}</span>
                  {h.fromGroup && (
                    <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[12px] text-ink-3">
                      group
                    </span>
                  )}
                </div>
                {h.lastLine && (
                  <p className="mt-1 line-clamp-2 text-[14px] text-ink-2">{h.lastLine}</p>
                )}
                <Chips car={h.car} priceAed={h.priceAed} />
                <div className="mt-1.5 flex items-center gap-2 text-[12px] text-ink-3">
                  {h.ownerName && <span>Line: {h.ownerName}</span>}
                  <span className="ml-auto font-medium text-brand-400">Reply →</span>
                </div>
              </Link>
              <CardActions kind="hot" line={h.line} contact={h.contact} tenantSlug={tenantSlug} />
            </div>
          ))
        )}
      </section>

      {/* 3. Интел из групп — спрос рынка. */}
      <section className="space-y-2">
        <SectionHeader emoji="📡" title="Intel from groups" count={intel.length} />
        {intel.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-soft px-4 py-6 text-center text-[13px] text-ink-3">
            No demand caught in the groups over the last day.
          </p>
        ) : (
          intel.map((it) => (
            <div
              key={it.id}
              className="rounded-card border border-line bg-surface p-3 shadow-card"
            >
              <p className="line-clamp-3 text-[14px] text-ink-2">{it.body}</p>
              <Chips car={it.car} priceAed={it.priceAed} />
              {it.ownerName && (
                <div className="mt-1.5 text-[12px] text-ink-3">Line: {it.ownerName}</div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
