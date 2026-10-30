/**
 * capture-twenty-process-ru.mjs — съёмка русского гида «как сюда приходит
 * работа» с ЖИВОГО Twenty: настоящие скриншоты, стрелки рисуются в самой
 * странице, все числа читаются из базы в момент съёмки.
 *
 *   node scripts/capture-twenty-process-ru.mjs --brand "EasyRent (ETM)" --out /tmp/process-ru
 *
 * Запускается НА БОКСЕ: фронт Twenty собран с SERVER_URL=http://10.255.254.12:3002
 * и отвечает только браузеру, который резолвит этот адрес.
 *
 * Отличия от capture-twenty-guide.mjs (тот — инструкция для менеджеров, этот —
 * процесс для владельца):
 *   - русский язык;
 *   - открытая сделка — САМАЯ СВЕЖАЯ настоящая (с brandLine), а не одна из 6
 *     sample-записей: у настоящих сделок сумма/контакт почти всегда пусты,
 *     и гид обязан это показать честно;
 *   - kanban «By Stage» снимается с честной подписью «обе компании вперемешку» —
 *     у представления нет фильтра по бренду;
 *   - лаги (последний лид, последняя WA-заметка) ЗАМЕРЯЮТСЯ, не предполагаются.
 *
 * Credentials: ~/twenty-doc-login.txt (line 1 email, line 2 password). Never printed.
 * PINGS_3D — необязательная env: число WA-пингов менеджерам за 3 дня (замеряется
 * отдельно по platform-базе, скрипт сам её не трогает).
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { execFileSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const BRAND = arg("brand", "EasyRent (ETM)");
const OUT = arg("out", "/tmp/process-ru");
const BASE = process.env.TWENTY_UI_URL || "http://10.255.254.12:3002";
const SCHEMA = process.env.TWENTY_SCHEMA || "workspace_7tkxm1eeqb4iopvi5ica5vos4";
const CONTAINER = process.env.TWENTY_DB_CONTAINER || "twenty-rental-db-1";
const BRAND_KEY = /cardiwan/i.test(BRAND) ? "cardiwan" : "easyrent";

const creds = readFileSync(join(homedir(), "twenty-doc-login.txt"), "utf8").split(/\r?\n/);
const EMAIL = creds[0]?.trim();
const PASSWORD = creds[1] ?? "";
if (!EMAIL || !PASSWORD) throw new Error("~/twenty-doc-login.txt needs email on line 1, password on line 2");

mkdirSync(OUT, { recursive: true });

const sql = (q) =>
  execFileSync("docker", ["exec", CONTAINER, "psql", "-U", "postgres", "-d", "default", "-At", "-c", q],
    { encoding: "utf8" }).trim();
const num = (n) => Number(n).toLocaleString("ru-RU");
const CALL_TITLE = "^(Новый лид|Пропущенный|Сделка|Гость)";

/* Все числа — запросами, сейчас. Ничего не набирается руками. */
const F = {
  deals: sql(`select count(*) from "${SCHEMA}".opportunity where "brandLine"='${BRAND_KEY}'`),
  dealsAll: sql(`select count(*) from "${SCHEMA}".opportunity where "brandLine" is not null`),
  people: sql(`select count(*) from "${SCHEMA}".person where "brandLine"='${BRAND_KEY}'`),
  peopleAll: sql(`select count(*) from "${SCHEMA}".person`),
  notes: sql(`select count(*) from "${SCHEMA}".note`),
  dealsNew24h: sql(`select count(*) from "${SCHEMA}".opportunity where "brandLine" is not null and "createdAt">now()-interval '1 day'`),
  notes24h: sql(`select count(*) from "${SCHEMA}".note where "createdAt">now()-interval '1 day'`),
  notesLagMin: sql(`select coalesce(round(extract(epoch from (now()-max("createdAt")))/60),-1) from "${SCHEMA}".note`),
  leadLagMin: sql(`select coalesce(round(extract(epoch from (now()-max("createdAt")))/60),-1) from "${SCHEMA}".opportunity where "brandLine" is not null`),
  pings3d: process.env.PINGS_3D || "",
};
/* Самая свежая настоящая сделка (brandLine NOT NULL отсекает sample-записи). */
F.freshDealId = sql(`select id from "${SCHEMA}".opportunity where "brandLine" is not null order by "createdAt" desc limit 1`);
F.freshDealName = sql(`select name from "${SCHEMA}".opportunity where id='${F.freshDealId}'`);
/* Карточка клиента: человек с наибольшим числом WA-заметок и НАСТОЯЩИМ именем
 * (не заголовком звонка) — иначе кадр учит на записи, которая сама выглядит
 * сломанной. Фолбэк — любой человек с заметками. */
F.personId = sql(`select p.id from "${SCHEMA}".person p join "${SCHEMA}"."noteTarget" nt on nt."targetPersonId"=p.id where p."nameFirstName" !~ '${CALL_TITLE}' group by p.id order by count(nt.id) desc limit 1`)
  || sql(`select p.id from "${SCHEMA}".person p join "${SCHEMA}"."noteTarget" nt on nt."targetPersonId"=p.id group by p.id order by count(nt.id) desc limit 1`);
F.personName = sql(`select trim(concat_ws(' ', "nameFirstName", "nameLastName")) from "${SCHEMA}".person where id='${F.personId}'`);
F.personNotes = sql(`select count(*) from "${SCHEMA}"."noteTarget" where "targetPersonId"='${F.personId}'`);
F.personPhone = sql(`select concat_ws('', "phonesPrimaryPhoneCallingCode", "phonesPrimaryPhoneNumber") from "${SCHEMA}".person where id='${F.personId}'`);

/* ── annotation (скопировано из capture-twenty-guide.mjs нарочно: два скрипта
 * независимы, правки одного не ломают другой) ────────────────────────────── */
async function annotate(page, marks) {
  await page.evaluate((marks) => {
    document.querySelectorAll("[data-guide-mark]").forEach((n) => n.remove());
    const layer = document.createElement("div");
    layer.setAttribute("data-guide-mark", "1");
    Object.assign(layer.style, {
      position: "fixed", inset: "0", zIndex: "2147483647", pointerEvents: "none",
      font: "700 15px -apple-system, Segoe UI, sans-serif",
    });
    for (const m of marks) {
      const el = document.querySelector(m.sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const box = document.createElement("div");
      Object.assign(box.style, {
        position: "absolute", left: `${r.left - 4}px`, top: `${r.top - 4}px`,
        width: `${r.width + 8}px`, height: `${r.height + 8}px`,
        border: "3px solid #E11D48", borderRadius: "8px",
        boxShadow: "0 0 0 4px rgba(225,29,72,.18)",
      });
      layer.appendChild(box);
      const lab = document.createElement("div");
      lab.textContent = m.text;
      const toLeft = r.right + 290 > window.innerWidth;
      Object.assign(lab.style, {
        position: "absolute", top: `${Math.max(4, r.top + r.height / 2 - 17)}px`,
        [toLeft ? "right" : "left"]: toLeft ? `${window.innerWidth - r.left + 18}px` : `${r.right + 18}px`,
        maxWidth: "290px", background: "#E11D48", color: "#fff",
        padding: "8px 12px", borderRadius: "8px", lineHeight: "1.35",
        boxShadow: "0 6px 18px rgba(0,0,0,.25)",
      });
      layer.appendChild(lab);
      const arrow = document.createElement("div");
      Object.assign(arrow.style, {
        position: "absolute", top: `${r.top + r.height / 2 - 7}px`,
        [toLeft ? "right" : "left"]: toLeft ? `${window.innerWidth - r.left + 4}px` : `${r.right + 4}px`,
        width: "0", height: "0", borderTop: "7px solid transparent", borderBottom: "7px solid transparent",
        [toLeft ? "borderLeft" : "borderRight"]: "14px solid #E11D48",
      });
      layer.appendChild(arrow);
    }
    document.body.appendChild(layer);
  }, marks);
}
const clearMarks = (page) => page.evaluate(() => {
  document.querySelectorAll("[data-guide-mark]").forEach((n) => n.remove());
  document.querySelectorAll("[data-guide-target]").forEach((n) => n.removeAttribute("data-guide-target"));
});
async function target(locator, id) {
  if (!(await locator.count())) return null;
  await locator.first().evaluate((el, id) => el.setAttribute("data-guide-target", id), id);
  return `[data-guide-target="${id}"]`;
}
const menuItem = (page, label) =>
  page.getByRole("link", { name: label, exact: true }).or(page.getByText(label, { exact: true })).first();

const steps = [];
async function shot(page, name, caption, note = "", clip = null) {
  await page.mouse.move(1430, 890);
  await page.waitForTimeout(600);
  const file = `${String(steps.length + 1).padStart(2, "0")}-${name}.png`;
  await page.screenshot({ path: join(OUT, file), ...(clip ? { clip } : {}) });
  steps.push({ file, caption, note });
  console.log("  captured", file);
}

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  page.setDefaultTimeout(45_000);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  // ── 1. Вход ────────────────────────────────────────────────────────────
  await shot(page, "sign-in", "Шаг 1 — вход",
    `В офисе: открыть ${BASE} в Chrome, ввести рабочую почту, Enter, затем пароль. Из дома и с мобильного интернета Twenty пока не открывается — это наша настройка, чиним.`,
    { x: 380, y: 120, width: 680, height: 560 });

  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  if (await email.count()) { await email.fill(EMAIL); await page.keyboard.press("Enter"); await page.waitForTimeout(3000); }
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) { await pw.fill(PASSWORD); await page.keyboard.press("Enter"); await page.waitForTimeout(9000); }
  if (/sign|login/i.test(page.url())) throw new Error("логин не принят — проверь ~/twenty-doc-login.txt");

  // ── 2. Opportunities → переключатель бренда ────────────────────────────
  await menuItem(page, "Opportunities").click();
  await page.waitForTimeout(5000);
  const chip = page.getByText("All Opportunities", { exact: true }).first();
  const chipSel = await target(chip, "viewchip");
  if (chipSel) await annotate(page, [{ sel: chipSel, text: "Это ПЕРЕКЛЮЧАТЕЛЬ компаний, а не заголовок" }]);
  await shot(page, "view-switcher", "Шаг 2 — переключатель компаний наверху списка",
    "По умолчанию видны сделки обеих компаний вперемешку. Одно нажатие на имя списка — и видна только нужная компания. Twenty запоминает выбор.",
    { x: 0, y: 0, width: 900, height: 300 });
  await clearMarks(page);
  if (chipSel) {
    await chip.click();
    await page.waitForTimeout(2500);
    const opt = page.getByText(BRAND, { exact: true }).first();
    if (await opt.count()) { await opt.click(); await page.waitForTimeout(6000); }
  }

  // ── 3. Список сделок бренда — сюда падают лиды ─────────────────────────
  await shot(page, "brand-opportunities", `Шаг 3 — сюда падают лиды: ${BRAND}`,
    `Сделок у компании: ${num(F.deals)} (у двух вместе: ${num(F.dealsAll)}). Новых лидов за последние 24 часа (обе компании): ${num(F.dealsNew24h)}. Последний лид появился здесь ${num(F.leadLagMin)} мин назад — звонки и Instagram приезжают из старой системы автоматически.`);

  // ── 4. Открытая сделка: свежая настоящая, со всеми пустотами ───────────
  // Записи живут на /object/<nameSingular>/<id> (проверено кликом по строке —
  // /objects/<plural>/<id> отдаёт 404 «Off the beaten path»).
  await page.goto(`${BASE}/object/opportunity/${F.freshDealId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  const stageSel = await target(page.getByText("Stage", { exact: true }).first(), "stagef");
  const marks = [];
  if (stageSel) marks.push({ sel: stageSel, text: "Стадия меняется здесь — вручную, одним нажатием" });
  if (marks.length) await annotate(page, marks);
  await shot(page, "deal-open", "Шаг 4 — карточка сделки (самая свежая на момент съёмки)",
    `Это настоящий лид: «${F.freshDealName}», появился сам ${num(F.leadLagMin)} мин назад. У большинства старых сделок сумма и дата пусты — старая система их не передала; это недоделка данных, а не ошибка менеджера.`);
  await clearMarks(page);

  // ── 5. Карточка клиента: WhatsApp приезжает заметками ──────────────────
  await page.goto(`${BASE}/object/person/${F.personId}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(7000);
  const notesTab = await target(page.getByRole("tab", { name: "Notes" }).first(), "notestab")
    || await target(page.locator("main").getByText("Notes", { exact: true }).first(), "notestab");
  if (notesTab) await annotate(page, [{ sel: notesTab, text: "Переписка WhatsApp подтягивается сюда сама" }]);
  await shot(page, "person-card", "Шаг 5 — карточка клиента: здесь живёт WhatsApp",
    `Клиент: ${F.personName || "—"}. К его карточке привязано сообщений: ${num(F.personNotes)}. Всего в системе уже ${num(F.notes)} сообщений (последнее — ${num(F.notesLagMin)} мин назад). Отвечать клиенту — по-прежнему из WhatsApp: ответ сам появится здесь заметкой.`);
  await clearMarks(page);

  // ── 6. Лента всех сообщений (прямой URL — клик по меню может перехватить
  //    ошибочный оверлей от прошлой страницы) ─────────────────────────────
  await page.goto(`${BASE}/objects/notes`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  await shot(page, "notes-list", "Шаг 6 — все сообщения одной лентой",
    `Раздел Notes — вся WhatsApp-переписка обеих компаний по мере поступления. Здесь видно, что линия жива, даже не открывая карточки.`);

  // ── 7. Поиск по номеру телефона ────────────────────────────────────────
  // Результаты меню — НЕ ссылки (div'ы), поэтому детектор по a[href] даёт
  // ложный «не нашлось» (поймано: при этом в кадре уже стоял найденный
  // клиент). Детектируем по прибавке текста с именем клиента. Ввод — медленно
  // и с долгим ожиданием: у меню дебаунс.
  await page.goto(`${BASE}/objects/people`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  let searchedBy = "";
  {
    const nameText = (F.personName || "").trim();
    const baseCount = nameText ? await page.getByText(nameText).count() : 0;
    for (const [kind, query] of [["phone", (F.personPhone || "").replace(/^\+/, "")], ["name", (F.personName || "").split(" ")[0]]]) {
      if (!query || !nameText) continue;
      await page.mouse.click(175, 23);         // лупа в левом верхнем углу шапки
      await page.waitForTimeout(3000);
      const si = page.locator('input[placeholder*="anything" i]').first();
      if (!(await si.count())) { await page.keyboard.press("Escape"); await page.waitForTimeout(1000); continue; }
      await si.click();
      await si.pressSequentially(query, { delay: 130 });
      await page.waitForTimeout(9000);
      if ((await page.getByText(nameText).count()) > baseCount) { searchedBy = kind; break; }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);
    }
  }
  await shot(page, "search-phone", "Шаг 7 — поиск клиента: лупа слева вверху",
    searchedBy === "phone"
      ? `Лупа в левом верхнем углу (или ⌘K) ищет по номеру телефона — в кадре клиент найден именно так. Номер надёжнее имени: клиентов ${num(F.peopleAll)}, и у многих вместо имени — заголовок звонка.`
      : searchedBy === "name"
        ? `Лупа в левом верхнем углу (или ⌘K). В кадре клиент найден по имени.`
        : `Лупа в левом верхнем углу (или ⌘K). При съёмке поиск не вернул результат — зафиксируйте и скажите нам, это повод для отдельной починки.`);

  // ── 8. Kanban — с честной подписью ─────────────────────────────────────
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/objects/opportunities`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(6000);
  const chip2 = page.getByText("All Opportunities", { exact: true }).first();
  if (await chip2.count()) {
    await chip2.click();
    await page.waitForTimeout(2500);
    const kb = page.getByText("By Stage", { exact: true }).first();
    if (await kb.count()) { await kb.click(); await page.waitForTimeout(6000); }
  }
  await shot(page, "kanban", "Шаг 8 — доска по стадиям (пока: обе компании вместе)",
    "Колонки — это стадии сделки; карточку можно таскать между ними. ВНИМАНИЕ: у этой доски пока нет фильтра по компании — здесь Cardiwan и EasyRent вперемешку. Поэтому стадию надёжнее менять в карточке сделки (шаг 4), а доску использовать как общий обзор.");

  writeFileSync(join(OUT, "steps.json"), JSON.stringify({ brand: BRAND, base: BASE, facts: F, steps }, null, 2));
  await browser.close();
  console.log(`${steps.length} screenshots + steps.json → ${OUT}  (brand: ${BRAND})`);
};

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
