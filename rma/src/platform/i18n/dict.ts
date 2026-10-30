/**
 * Lightweight i18n — RU/EN, no framework. A flat dictionary keyed by a short id,
 * each entry {ru, en}. `t(lang, key)` returns the string (falls back to RU, then
 * the key itself). Language is a per-browser cookie (see lang.ts); a switcher
 * flips it. Add strings here as surfaces get translated. LTR only (no Arabic yet).
 */
export type Lang = "ru" | "en";
export const LANGS: Lang[] = ["ru", "en"];
export const DEFAULT_LANG: Lang = "en";
/** Cookie name for the per-browser language — client-safe (used by the switcher). */
export const LANG_COOKIE = "lang";

type Entry = { ru: string; en: string };

export const DICT: Record<string, Entry> = {
  // ── Navigation (Sidebar) ──────────────────────────────────────────────
  "nav.myDay": { ru: "Мой день", en: "My Day" },
  "nav.monitor": { ru: "Монитор", en: "Monitor" },
  "nav.overview": { ru: "Обзор", en: "Overview" },
  "nav.leadsBoard": { ru: "Доска лидов", en: "Leads Board" },
  "nav.search": { ru: "Поиск", en: "Search" },
  "nav.sales": { ru: "Продажи", en: "Sales" },
  "nav.crm": { ru: "Воронка", en: "Pipeline" },
  "nav.rentPipeline": { ru: "Аренда", en: "Rent" },
  "nav.deals": { ru: "Сделки", en: "Deals" },
  "nav.watchers": { ru: "Наблюдатели", en: "Watchers" },
  "nav.pulse": { ru: "Пульс", en: "Pulse" },
  "nav.customers": { ru: "Клиенты", en: "Customers" },
  "nav.messages": { ru: "Сообщения", en: "Messages" },
  "nav.operations": { ru: "Сток", en: "Stock" },
  "nav.manager": { ru: "Руководителю", en: "Manager" },
  "nav.analytics": { ru: "Перфоманс", en: "Performance" },
  "nav.fleet": { ru: "Автопарк", en: "Fleet" },
  "nav.calendar": { ru: "Календарь", en: "Calendar" },
  "nav.rentals": { ru: "Аренды", en: "Rentals" },
  "nav.leasing": { ru: "Лизинг", en: "Leasing" },
  "nav.returns": { ru: "Возвраты", en: "Returns" },
  "nav.fines": { ru: "Штрафы и Salik", en: "Fines & Salik" },
  "nav.risks": { ru: "Риски", en: "Risks" },
  "nav.collections": { ru: "Взыскание", en: "Collections" },
  "nav.team": { ru: "Команда", en: "Team" },
  "nav.tasks": { ru: "Задачи", en: "Tasks" },
  "nav.settings": { ru: "Настройки", en: "Settings" },
  "nav.logout": { ru: "Выйти", en: "Log out" },

  // ── Login (name + PIN) ────────────────────────────────────────────────
  "login.pickName": { ru: "Выберите своё имя", en: "Choose your name" },
  "login.hi": { ru: "Привет", en: "Hi" },
  "login.enterPin": { ru: "Введите PIN", en: "Enter your PIN" },
  "login.wrongPin": { ru: "Неверный PIN", en: "Wrong PIN" },
  "login.reset": { ru: "Сброс", en: "Clear" },
  "login.back": { ru: "← назад", en: "← back" },
  "login.emptyRoster": { ru: "Список пуст — обратитесь к администратору.", en: "No staff listed — contact your admin." },
  "login.adminLink": { ru: "Вход по email / Telegram →", en: "Sign in by email / Telegram →" },

  // ── Rent page (tenant's own pipeline — non-Babek brands) ──────────────
  "rent.ownSubtitle": { ru: "Ваша воронка аренды — лиды и сделки", en: "Your rental funnel — leads and deals" },
  "rent.emptyTitle": { ru: "Пока нет лидов", en: "No leads yet" },
  "rent.emptyBody": { ru: "Новые заявки из WhatsApp и с сайта появятся здесь автоматически.", en: "New WhatsApp and website leads will appear here automatically." },

  // ── Account (password page chrome) ────────────────────────────────────
  "account.back": { ru: "← Назад", en: "← Back" },

  // ── Language switcher ─────────────────────────────────────────────────
  "lang.language": { ru: "Язык", en: "Language" },

  // ── Fleet board (DayPilot scheduler) ──────────────────────────────────
  "fleet.hint": {
    ru: "Потяните по пустым дням, чтобы создать бронь · перетащите полосу, чтобы перенести её · тяните края полосы, чтобы изменить даты · нажмите на полосу для деталей",
    en: "Drag across empty days to create a booking · drag a bar to move it · drag bar edges to change dates · click a bar for details",
  },
  "fleet.hintDismiss": { ru: "Скрыть", en: "Dismiss" },
  "fleet.editDates": { ru: "Изменить даты", en: "Edit dates" },
  "fleet.startRental": { ru: "Начать аренду", en: "Start rental" },
  "fleet.cancelBooking": { ru: "Отменить бронь", en: "Cancel booking" },
  "fleet.save": { ru: "Сохранить", en: "Save" },
  "fleet.cancel": { ru: "Отмена", en: "Cancel" },
  "fleet.startDate": { ru: "Начало", en: "Start" },
  "fleet.returnDate": { ru: "Возврат", en: "Return" },
  "fleet.confirmCancel": { ru: "Отменить эту аренду?", en: "Cancel this rental?" },
  "fleet.saving": { ru: "сохранение…", en: "saving…" },

  // ── Vehicle profile — edit form ───────────────────────────────────────
  "vehicle.edit": { ru: "Редактировать", en: "Edit" },
  "vehicle.editTitle": { ru: "Редактировать автомобиль", en: "Edit vehicle" },
  "vehicle.make": { ru: "Марка", en: "Make" },
  "vehicle.model": { ru: "Модель", en: "Model" },
  "vehicle.year": { ru: "Год", en: "Year" },
  "vehicle.plate": { ru: "Номер", en: "Plate" },
  "vehicle.dailyRate": { ru: "Ставка (AED/день)", en: "Daily rate (AED)" },
  "vehicle.odometer": { ru: "Пробег, км", en: "Odometer, km" },
  "vehicle.location": { ru: "Локация", en: "Location" },
  "vehicle.nextServiceDate": { ru: "Следующий сервис — дата", en: "Next service date" },
  "vehicle.nextServiceOdometer": { ru: "Следующий сервис — пробег, км", en: "Next service odometer, km" },
  "vehicle.save": { ru: "Сохранить", en: "Save" },
  "vehicle.saving": { ru: "Сохранение…", en: "Saving…" },
  "vehicle.cancel": { ru: "Отмена", en: "Cancel" },
  "vehicle.saveError": { ru: "Не удалось сохранить изменения.", en: "Couldn't save the vehicle." },

  // ── Vehicle profile — service panel ───────────────────────────────────
  "service.title": { ru: "Сервис", en: "Service" },
  "service.planned": { ru: "Плановый сервис", en: "Planned service" },
  "service.notPlanned": { ru: "Не запланирован", en: "Not planned" },
  "service.atOdometer": { ru: "при пробеге", en: "at odometer" },
  "service.dueSoon": { ru: "Сервис скоро", en: "Service due soon" },
  "service.overdue": { ru: "Сервис просрочен", en: "Service overdue" },
  "service.history": { ru: "История сервиса", en: "Service history" },
  "service.empty": { ru: "Записей о сервисе пока нет", en: "No service records yet" },
  "service.log": { ru: "Записать сервис", en: "Log service" },
  "service.logTitle": { ru: "Запись о сервисе", en: "Log service" },
  "service.date": { ru: "Дата", en: "Date" },
  "service.description": { ru: "Описание", en: "Description" },
  "service.cost": { ru: "Стоимость (AED, необязательно)", en: "Cost (AED, optional)" },
  "service.km": { ru: "км", en: "km" },
  "service.error": { ru: "Не удалось сохранить запись.", en: "Couldn't save the service record." },

  // ── Fleet board — arrange control, sold lifecycle, row headers ────────
  "fleetBoard.arrange": { ru: "Сортировка", en: "Arrange" },
  "fleetBoard.arrangeModelLine": { ru: "Линейка моделей", en: "Model line" },
  "fleetBoard.arrangePlate": { ru: "Номер", en: "Plate" },
  "fleetBoard.arrangeStatus": { ru: "Статус", en: "Status" },
  "fleetBoard.arrangeUtilisation": { ru: "Загрузка", en: "Utilisation" },
  "fleetBoard.status": { ru: "Статус", en: "Status" },
  "fleetBoard.statusAvailable": { ru: "Доступен", en: "Available" },
  "fleetBoard.statusInService": { ru: "В сервисе", en: "In service" },
  "fleetBoard.statusSold": { ru: "Продан", en: "Sold" },
  "fleetBoard.statusManagedHint": {
    ru: "Статусом управляет активная аренда",
    en: "Status is managed by the active rental",
  },
  "fleetBoard.filterSold": { ru: "Проданные", en: "Sold" },

  // ── Vehicle trips panel (Pilot GPS history) + vehicle drawer ──────────
  "trips.title": { ru: "Поездки · Pilot GPS", en: "Trips · Pilot GPS" },
  "trips.from": { ru: "С", en: "From" },
  "trips.to": { ru: "По", en: "To" },
  "trips.loading": { ru: "Загрузка…", en: "Loading…" },
  "trips.empty": { ru: "За выбранный период поездок нет", en: "No trips in the selected range" },
  "trips.noDevice": {
    ru: "К машине не привязан GPS-трекер — истории поездок нет",
    en: "No GPS device linked to this vehicle — trip history unavailable",
  },
  "trips.unavailable": {
    ru: "Pilot GPS сейчас недоступен — попробуйте позже",
    en: "Pilot GPS is unavailable right now — try again later",
  },
  "trips.rangeTooLong": { ru: "Максимальный период — 31 день", en: "Maximum range is 31 days" },
  "trips.colDate": { ru: "Дата", en: "Date" },
  "trips.colTime": { ru: "Время", en: "Time" },
  "trips.colDuration": { ru: "Длительность", en: "Duration" },
  "trips.colKm": { ru: "км", en: "km" },
  "trips.colMaxSpeed": { ru: "Макс. км/ч", en: "Max km/h" },
  "trips.ongoing": { ru: "в пути сейчас", en: "ongoing now" },
  "trips.download": { ru: "Скачать отчёт", en: "Download report" },
  "trips.unitKm": { ru: "км", en: "km" },
  "trips.unitTripOne": { ru: "поездка", en: "trip" },
  "trips.unitTripFew": { ru: "поездки", en: "trips" },
  "trips.unitTripMany": { ru: "поездок", en: "trips" },
  "trips.unitDayOne": { ru: "день", en: "day" },
  "trips.unitDayFew": { ru: "дня", en: "days" },
  "trips.unitDayMany": { ru: "дней", en: "days" },
  "trips.hourShort": { ru: "ч", en: "h" },
  "trips.minShort": { ru: "мин", en: "min" },
  "drawer.liveStatus": { ru: "Статус в реальном времени · Pilot GPS", en: "Live status · Pilot GPS" },
  "drawer.noGpsFix": { ru: "Нет GPS-фикса", en: "No GPS fix" },
  "drawer.gpsOffline": {
    ru: "GPS офлайн — позиция ещё не поступала",
    en: "GPS offline — no position reported yet",
  },
  "drawer.onTripSince": { ru: "В пути с", en: "On trip since" },
};

export function t(lang: Lang, key: string): string {
  const e = DICT[key];
  if (!e) return key;
  return e[lang] ?? e.ru ?? key;
}
