// Монитор руководителя направления — «что команда роняет прямо сейчас».
//
// Отличие от «Моего дня»: там очередь рядового, отсортированная по свежести;
// здесь — то же самое, но худшим вверх, с колонкой ответственного и разбивкой
// по брендам направления. Экран настенный, поэтому серверный компонент без
// интерактива: обновляется сам раз в минуту.
//
// Styling: только токены дизайн-системы (bg-surface/bg-sunken, text-ink*,
// border-line, rounded-card) — как в MyDay.tsx и PulseBoard.tsx.
import Link from "next/link";
import type { LineMonitor as LineMonitorData } from "@/modules/monitor/queries";
import type { ConvoLink } from "@/modules/crm/my-queries";

function waitLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

function waitBadgeClass(min: number): string {
  if (min >= 120) return "bg-red-600 text-white";
  if (min >= 30) return "bg-amber-500 text-white";
  return "bg-sunken text-ink-2";
}

// Куда ведёт строка: в полноэкранный диалог на карточке записи, если разговор
// пришит; иначе — в живую доску, где его можно связать вручную.
function convoHref(link: ConvoLink, tenantSlug: string): string {
  if (link.relatedEntityType === "lead" && link.relatedEntityId) {
    return `/${tenantSlug}/crm/leads/${link.relatedEntityId}`;
  }
  const customerId =
    link.relatedEntityType === "customer" ? link.relatedEntityId : link.customerId;
  if (customerId) return `/${tenantSlug}/customers/${customerId}`;
  return `/${tenantSlug}/pulse`;
}

function Section({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-baseline gap-2 text-[15px] font-semibold text-ink">
        {title}
        <span className={`tnum ${count > 0 ? "text-red-600" : "text-ink-3"}`}>{count}</span>
        {hint && <span className="text-[13px] font-normal text-ink-3">{hint}</span>}
      </h2>
      <div className="rounded-card border border-line bg-surface">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-4 py-6 text-center text-[14px] text-ink-3">{text}</p>;
}

// Contact actions for a row — WhatsApp (1:1) + call. Digits-only for wa.me.
// This is the «Contact» button Babek drew on every card of his cockpit sketch.
function Contact({ phone }: { phone: string | null | undefined }) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer"
        className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100">WA</a>
      <a href={`tel:+${digits}`} className="rounded-full bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">☎</a>
    </span>
  );
}

// Каждая строка несёт свой бренд, поэтому ссылки строятся из row.tenantSlug —
// экран сводный, и «текущий» бренд из адреса тут ничего не решает.
export function LineMonitor({
  data,
  tenantSlug,
  activeAssignee = null,
}: {
  data: LineMonitorData;
  tenantSlug?: string;
  activeAssignee?: string | null;
}) {
  // Per-person filter (Babek: "when he puts a filter to see his own"). Options
  // are the distinct assignees on the leads; "unassigned" is its own bucket.
  const assignees = Array.from(
    new Set(data.newLeads.map((l) => l.assignee).filter((a): a is string => Boolean(a))),
  ).sort();
  const leads = activeAssignee
    ? data.newLeads.filter((l) => (activeAssignee === "unassigned" ? !l.assignee : l.assignee === activeAssignee))
    : data.newLeads;
  const chipHref = (a: string | null) =>
    `/${tenantSlug ?? data.brands[0]?.slug ?? ""}/monitor?line=${data.lineKey}${a ? `&assignee=${encodeURIComponent(a)}` : ""}`;
  const chipCls = (on: boolean) =>
    `rounded-full px-3 py-1 text-[13px] font-medium ${on ? "bg-brand-600 text-white" : "bg-surface text-ink-2 border border-line hover:border-brand-300"}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5">
      <header className="mb-5">
        <h1 className="text-[20px] font-semibold text-ink">{data.lineLabel}</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          {data.brands.map((b) => b.name).join(" · ")}
          {data.skippedBrands.length > 0 && (
            <span className="text-amber-600">
              {" · no access: "}
              {data.skippedBrands.join(", ")}
            </span>
          )}
        </p>
      </header>

      {assignees.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-ink-3">Owner:</span>
          <a href={chipHref(null)} className={chipCls(!activeAssignee)}>All</a>
          {assignees.map((a) => (
            <a key={a} href={chipHref(a)} className={chipCls(activeAssignee === a)}>{a}</a>
          ))}
          <a href={chipHref("unassigned")} className={chipCls(activeAssignee === "unassigned")}>unassigned</a>
        </div>
      )}

      <Section title="New leads" count={leads.length} hint="newest first · time from Bitrix">
        {leads.length === 0 ? (
          <Empty text="No new leads" />
        ) : (
          <ul className="divide-y divide-line">
            {leads.slice(0, 40).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <a href={`/${l.tenantSlug}/crm/leads/${l.id}`} className="min-w-0 truncate text-[14px] text-ink hover:underline">
                  {l.customerName || l.phone || "—"}
                  {l.car ? <span className="text-ink-3"> · {l.car}</span> : null}
                  {l.assignee ? <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">{l.assignee}</span> : <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">unassigned</span>}
                  <span className="ml-1 text-[11px] text-ink-3">· {l.brandName}</span>
                </a>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tnum text-[13px] text-ink-3">
                    {new Date(l.at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Contact phone={l.phone} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Inbound messages" count={data.inbound.length} hint="latest · WhatsApp">
        {data.inbound.length === 0 ? (
          <Empty text="No new inbound" />
        ) : (
          <ul className="divide-y divide-line">
            {data.inbound.map((m, i) => (
              <li key={`${m.contact}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-ink">{m.name || m.contact}</span>
                    {m.lang === "ar" && <span className="shrink-0 rounded bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-700">AR</span>}
                  </div>
                  {m.snippet ? <div className="truncate text-[13px] text-ink-3">{m.snippet}</div> : null}
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tnum text-[12px] text-ink-3">
                    {new Date(m.at).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Contact phone={m.contact} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {data.lineKey === "rent" && (
        <Section title="Returns today" count={data.returningToday.length} hint="vehicles due back">
          {data.returningToday.length === 0 ? (
            <Empty text="No returns today" />
          ) : (
            <ul className="divide-y divide-line">
              {data.returningToday.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate text-[14px] text-ink">
                    {r.car || "—"} {r.plate ? <span className="text-ink-3">({r.plate})</span> : null}
                    {r.customerName ? <span className="text-ink-3"> · {r.customerName}</span> : null}
                  </span>
                  <Contact phone={r.phone} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section title="Fleet" count={data.fleetSnapshot.reduce((s, r) => s + r.count, 0)} hint="total fleet · tap for calendar">
        {data.fleetSnapshot.length === 0 ? (
          <Empty text="No fleet data" />
        ) : (
          <a href={`/${data.brands[0]?.slug ?? ""}/fleet/availability`} className="flex flex-wrap gap-2 px-4 py-3 hover:bg-canvas">
            {data.fleetSnapshot
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((r) => {
                const label =
                  { available: "Available", on_rent: "On rent", reserved: "Reserved", in_service: "Service", overdue: "Overdue" }[r.status] ?? r.status;
                const tone =
                  r.status === "available" ? "bg-emerald-50 text-emerald-700"
                  : r.status === "on_rent" ? "bg-blue-50 text-blue-700"
                  : r.status === "reserved" ? "bg-amber-50 text-amber-700"
                  : "bg-ink-3/10 text-ink-2";
                return (
                  <span key={r.status} className={`rounded-full px-3 py-1 text-[13px] font-medium ${tone}`}>
                    {label}: <span className="tnum font-semibold">{r.count}</span>
                  </span>
                );
              })}
            <span className="ml-auto self-center text-[13px] text-brand-600">Availability calendar →</span>
          </a>
        )}
      </Section>

      <Section
        title="Not answered"
        count={data.waiting.length}
        hint="longest waiting first"
      >
        {data.waiting.length === 0 ? (
          <Empty text="Nobody is waiting" />
        ) : (
          <ul className="divide-y divide-line">
            {data.waiting.slice(0, 40).map((row) => (
              <li key={`${row.tenantSlug}:${row.line}:${row.contact}`} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={convoHref(row, row.tenantSlug)}
                    className="truncate text-[15px] font-medium text-ink hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[13px] tnum ${waitBadgeClass(row.waitingMin)}`}
                  >
                    {waitLabel(row.waitingMin)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-ink-2">{row.lastLine}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-[13px] text-ink-3">
                  <span>{row.brandName}</span>
                  <span>·</span>
                  <span>{row.ownerName ?? "unassigned"}</span>
                  {row.car && <span className="text-ink-2">· {row.car}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Team load" count={data.teamLoad.length}>
        {data.teamLoad.length === 0 ? (
          <Empty text="All clear" />
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-line text-left text-[13px] text-ink-3">
                <th className="px-4 py-2 font-normal">Person</th>
                <th className="px-4 py-2 font-normal tnum">Waiting</th>
                <th className="px-4 py-2 font-normal">Longest wait</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.teamLoad.map((row) => (
                <tr key={row.ownerKey ?? "unassigned"}>
                  <td className="px-4 py-2 text-ink">{row.ownerName}</td>
                  <td className="px-4 py-2 tnum text-ink">{row.waiting}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[13px] tnum ${waitBadgeClass(row.oldestWaitMin)}`}
                    >
                      {waitLabel(row.oldestWaitMin)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {data.lineKey === "rent" && (
        <Section
          title="Overdue"
          count={data.overdueRentals.length + data.overdueReturns.length}
        >
          {data.overdueRentals.length + data.overdueReturns.length === 0 ? (
            <Empty text="Nothing overdue" />
          ) : (
            <ul className="divide-y divide-line">
              {data.overdueReturns.map((r) => (
                <li key={`ret:${r.id}`} className="flex items-baseline justify-between px-4 py-2.5">
                  <Link
                    href={`/${r.tenantSlug}/rentals/${r.id}`}
                    className="truncate text-[14px] text-ink hover:underline"
                  >
                    {r.customerName ?? "—"}
                  </Link>
                  <span className="shrink-0 text-[13px] text-ink-3">
                    not returned · {r.brandName}
                  </span>
                </li>
              ))}
              {data.overdueRentals.map((r) => (
                <li key={`col:${r.id}`} className="flex items-baseline justify-between px-4 py-2.5">
                  <Link
                    href={`/${r.tenantSlug}/rentals/${r.id}`}
                    className="truncate text-[14px] text-ink hover:underline"
                  >
                    {r.customerName ?? "—"}
                  </Link>
                  <span className="shrink-0 text-[13px] text-ink-3 tnum">
                    {r.balanceDue != null ? `${Number(r.balanceDue).toLocaleString()} AED` : "debt"}
                    {" · "}
                    {r.brandName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
