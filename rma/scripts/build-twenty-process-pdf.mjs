/**
 * build-twenty-process-pdf.mjs — собрать русский гид «как сюда приходит
 * работа» в один PDF для печати/пересылки.
 *
 *   node scripts/build-twenty-process-pdf.mjs --in /tmp/process-ru --out /tmp/Twenty-Process-RU.pdf
 *
 * Читает steps.json + PNG из capture-twenty-process-ru.mjs. Каждое число
 * приходит из steps.json, т.е. запрошено у живой базы в день съёмки.
 */
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg("in", "/tmp/process-ru");
if (!existsSync(join(IN, "steps.json"))) throw new Error(`нет steps.json в ${IN} — сначала capture-twenty-process-ru.mjs`);

const { brand, base, facts: F, steps } = JSON.parse(readFileSync(join(IN, "steps.json"), "utf8"));
const OUT = arg("out", join(IN, "Twenty-Process-RU.pdf"));
const dataUri = (f) => `data:image/png;base64,${readFileSync(join(IN, f)).toString("base64")}`;
const n = (v) => Number(v).toLocaleString("ru-RU");
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* Что происходит само — каждая цифра замерена в день съёмки. */
const FLOW = [
  ["Входящий звонок (CallGear) или заявка из Instagram",
   "Новая сделка в Opportunities со стадией NEW + карточка клиента с номером",
   `Автоматически. Последний лид на момент съёмки пришёл ${n(F.leadLagMin)} мин назад; за 24 часа — ${n(F.dealsNew24h)}.`],
  ["Сообщение WhatsApp от известного клиента",
   "Заметка (Note) в карточке этого клиента, текст сообщения внутри",
   `Автоматически. Всего заметок: ${n(F.notes)}; последняя появилась ${n(F.notesLagMin)} мин назад.`],
  ["Ответ менеджера клиенту",
   "Из обычного WhatsApp, как раньше. Ответ сам появится заметкой в карточке",
   "Автоматически, тем же путём."],
  [F.pings3d ? "Пинг менеджеру о горячем сообщении" : "Пинг менеджеру",
   F.pings3d
     ? `Приходит в WhatsApp менеджеру (${n(F.pings3d)} пингов за последние 3 дня)`
     : "Приходит в WhatsApp менеджеру",
   "Автоматически, в течение минуты после сообщения клиента."],
  ["Смена стадии сделки",
   "Вручную: в карточке сделки (шаг 4) или перетаскиванием на доске (шаг 8)",
   "Система стадии сама не двигает — это работа менеджера."],
];

/* Чего пока НЕТ — честно, чтобы это не приняли за поломку. */
const GAPS = [
  ["Сообщение с незнакомого номера",
   "Пока не создаёт карточку клиента в Twenty: заметка прикрепляется только к уже существующему клиенту. Такой лид виден в WhatsApp, но в Twenty его ещё нет. В списке доработок."],
  ["Задача «перезвонить по новому лиду»",
   "Автоматически не ставится. Новый лид виден в списке Opportunities (стадия NEW), но напоминания о нём нет."],
  ["Доска «By Stage» без фильтра по компании",
   "Показывает Cardiwan и EasyRent вперемешку. Для работы по своей компании — список с переключателем (шаг 2)."],
  ["Лиды Cardiwan",
   "Старая система Cardiwan мёртвая: звонки и Instagram Cardiwan в сделки не превращаются. Рабочий канал Cardiwan — WhatsApp."],
  ["Доступ из дома / с мобильного",
   "Twenty открывается только в офисной сети. Снаружи — «Unable to Reach Back-end». Настройка наша, чиним."],
];

const html = `
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 12.5px/1.55 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 0; }
  .cover { padding-top: 8mm; }
  h1 { font-size: 28px; margin: 0 0 2px; letter-spacing: -.4px; }
  .sub { color: #6B7280; font-size: 14px; margin: 0 0 20px; }
  .kpis { display: flex; gap: 10px; margin: 0 0 18px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 110px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 12px 14px; }
  .kpi b { display: block; font-size: 22px; line-height: 1.1; }
  .kpi span { color: #6B7280; font-size: 11px; }
  .box { border-radius: 10px; padding: 13px 15px; margin: 0 0 12px; }
  .ok { background: #ECFDF5; border: 1px solid #A7F3D0; }
  .warn { background: #FFF7ED; border: 1px solid #FED7AA; }
  .step { page-break-inside: avoid; }
  .step + .step { page-break-before: always; }
  .cap { font-size: 17px; font-weight: 700; margin: 0 0 3px; }
  .num { display: inline-block; background: #E11D48; color: #fff; border-radius: 999px;
         width: 25px; height: 25px; text-align: center; line-height: 25px; font-size: 13px;
         margin-right: 9px; vertical-align: 2px; }
  .note { color: #374151; margin: 0 0 10px; }
  img { max-width: 100%; border: 1px solid #D1D5DB; border-radius: 8px; display: block; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 9px 10px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  td.k { font-weight: 700; width: 30%; }
  h2 { font-size: 20px; margin: 0 0 4px; }
  .foot { margin-top: 14px; color: #6B7280; font-size: 11.5px; }
</style>

<div class="cover">
  <h1>Twenty — как сюда приходит работа</h1>
  <p class="sub">TAKE Auto Rental · аренда (Cardiwan + EasyRent) · ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>

  <div class="kpis">
    <div class="kpi"><b>${n(F.dealsAll)}</b><span>сделок (обе компании)</span></div>
    <div class="kpi"><b>${n(F.dealsNew24h)}</b><span>новых лидов за 24 ч</span></div>
    <div class="kpi"><b>${n(F.peopleAll)}</b><span>клиентов</span></div>
    <div class="kpi"><b>${n(F.notes)}</b><span>WhatsApp-заметок</span></div>
  </div>

  <div class="box ok">
    <b>Коротко:</b> лиды со звонков и Instagram падают в <b>Opportunities</b> сами; переписка WhatsApp
    сама подтягивается в карточку клиента. Менеджер отвечает из обычного WhatsApp — ничего нового
    учить не нужно, Twenty просто всё записывает.
  </div>

  <div class="box warn">
    <b>Процесс не изменился.</b> WhatsApp остаётся рабочим инструментом; Twenty — учёт и контроль.
    Если цифра или имя выглядят странно — это недоехавшие данные из старой системы, а не поломка.
    Все числа в этом документе считаны из живой базы в день печати.
  </div>
</div>

${steps.map((s, i) => `
  <div class="step">
    <p class="cap"><span class="num">${i + 1}</span>${esc(s.caption)}</p>
    ${s.note ? `<p class="note">${esc(s.note)}</p>` : ""}
    <img src="${dataUri(s.file)}" alt="">
  </div>`).join("")}

<div class="step">
  <h2>Что происходит само — и как быстро</h2>
  <p class="note">Замерено на живой системе в день печати, не предположено.</p>
  <table>${FLOW.map(([a, b, c]) => `<tr><td class="k">${esc(a)}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}</table>
</div>

<div class="step">
  <h2>Чего пока нет — и это не поломка</h2>
  <p class="note">Известные дыры процесса. Каждая в списке доработок; важно не принимать их за «всё пропало».</p>
  <table>${GAPS.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
  <p class="foot">Адрес в офисе: <b>${esc(base)}</b> · Снято с живой системы · Скриншоты сняты с компании ${esc(brand)} — у второй компании всё то же самое, свой переключатель.</p>
</div>
`;

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: OUT, format: "A4", printBackground: true,
    margin: { top: "14mm", bottom: "16mm", left: "12mm", right: "12mm" },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `<div style="width:100%;font:9px -apple-system,sans-serif;color:#9CA3AF;padding:0 12mm;display:flex;justify-content:space-between">
        <span>TAKE Auto Rental — как сюда приходит работа</span><span class="pageNumber"></span></div>`,
  });
  await browser.close();
  console.log("PDF →", OUT);
};
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
