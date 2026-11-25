# Handoff для Artem — RMA CRM, 2026-11-21

Branch: `feat/rma-mobile-native-2026-11-19`

Production: `https://crm.rma.network` → `rma-vps` / `srv2077538` / `31.97.105.52`

Deployed application commit: `69cfd3a0` (`fix(rma): report unconfigured Salik without stopping feeds`)

Migration applied on production: `0090_tars_automatic_submission.sql`; pending migrations: **0**.
Pre-deploy backup: `/root/rma-backups/pre-rental-automation-20261121-080759.sql.gz` (gzip integrity checked).

## Короткий статус для Artem

На production опубликован единый экран управления автомобилями, новые механизмы TARS и парковочных начислений, а также почасовой scheduler. Экран `/rma/operations` проверен через реальный вход в CRM: отображаются 21 автомобиль, клиент и аренда, пробег, остаток/перепробег, отдельные штрафы/Salik/Parkin/Parkonic и неоплаченные суммы, возврат/продление, ТО и свежесть телематики.

RTA fines реально синхронизируются каждый час. Timer включён, его последний запуск успешен. Автоматические уведомления клиентам специально оставлены выключенными, поэтому старые сообщения никому не отправлялись.

Осталось три внешних доступа: authenticated TEST dry-run для TARS, account JSON для Salik и официальные API/CSV доступы Parkin и Parkonic. Реальные заявки в TARS, сообщения клиентам, платежи и команды блокировки двигателя во время проверок не выполнялись.

## Общая проверка

- Локальный и production Next.js build: **passed**, включая application TypeScript в Next build.
- Полный Vitest: **1,367 passed, 1 failed**. Единственный failure — ранее известный unrelated `src/modules/availability/store.test.ts` phone-override test; этот модуль не изменялся.
- Standalone `npx tsc --noEmit`: пять ранее существующих ошибок в неизменённом `src/modules/fleet/permanent-delete.test.ts` (`returning()`/`never`). Ошибок в изменённых файлах проверка не показала; production Next build TypeScript прошёл.
- Changed-file ESLint и `git diff --check`: **passed**.
- Production HTTP: `/` → 307 login на `31.97.105.52`; `/rma/operations` → 307 login для anonymous; `/api/public/site-cars` → 200.
- Все TEST tenant/user fixtures удалены: `0 test-ops tenants`, `0 test-ui users`.
- Постороннее локальное изменение `backend/babel.config.js` не затрагивалось и не коммитилось.

## 1. TARS automatic submission — PARTIAL

### Сделано

Commits: `66731bf8`, `d389d351`.

- Менеджер сначала формирует server-built reviewed package: клиент, reviewed customer document metadata, автомобиль/VIN, период, signed private PDF, agreement, odometer/fuel.
- Отдельная вторая кнопка подтверждает dry-run или отправку. Нельзя отправить непроверенный или изменённый пакет: используется SHA-256 hash reviewed package.
- Migration `0090` хранит status/hash/payload/attempts/error/reviewer/completion. Каждый review/attempt/failure/success пишется в `audit_event`.
- Conditional database update не допускает два параллельных submit. Перед каждым browser retry ищется уже существующий TARS agreement, чтобы не создать дубль после неизвестного результата.
- До трёх попыток только для transient failures; validation/session errors не повторяются автоматически.
- Feature flags: `TARS_AUTO_SUBMIT_ENABLED=true`; `TARS_AUTO_SUBMIT_DRY_RUN` по умолчанию безопасно `true`. Production automatic submission сейчас **disabled**, manual handoff сохранён.
- `scripts/tars-prepare.ts` не нажимает final Submit в dry-run и проверяет customer/agreement/VIN на Summary.

### Доказательства

- Fake-browser E2E: dry-run не нажал Submit; первый submit создал TEST agreement; повтор нашёл его, счётчик Submit остался `1`.
- TARS/handoff/action-guard checks: **20 passed**; повторный targeted run после review fixes: **7 passed**.
- Migration `0090` применена локально и на production.
- На production browser проверен существующий rental со статусом `Uploaded to TARS`.

### Что осталось / доступ клиента

- Нужен существующий **TEST customer + TEST vehicle в TARS** и authenticated `rma-tars` agent-browser session на RMA VDS. Выполнить полный browser dry-run до Summary без final Submit, затем отдельно согласовать включение реального режима.
- Signed PDF должен находиться в RMA private documents; customer documents должны быть reviewed.
- Текущий automatic flow выбирает существующего TARS customer по Emirates ID. Создание passport-only tourist в TARS не проверено и не заявляется как готовое.
- **Ни одной реальной заявки реального клиента во время этой работы не отправлялось.**

## 2. Parkin / Parkonic automatic feeds — PARTIAL

### Сделано

Commits: `d655dfc7`, `24e50efe`.

- Общий connector interface и authenticated HTTPS JSON implementation для обоих операторов.
- Scheduled job и ручной sync выбранного автомобиля на `/charges`.
- CSV fallback: upload в UI и scheduled `PARKING_IMPORT_DIR/parkin.csv|parkonic.csv`.
- Matching по normalized plate + точному event timestamp; late charges остаются на covering rental. При двух VIN с одним plate выбирается только однозначно covering rental, иначе строка отклоняется с ошибкой.
- Оба пути пишут в существующий `rental_charge`; unique `(tenant, kind, reference)` исключает дубли. Суммы сохраняют два знака.
- Bulk API/CSV import не ставит customer WhatsApp notifications автоматически.
- Production browser подтвердил видимость Parkin/Parkonic sync и CSV controls.

### Доказательства

- Parking parser/ledger/action-guard tests: **9 passed**; последующий combined operations run: **15 passed**.
- TEST E2E создал Parkin и Parkonic charges и повторил импорт: duplicates обработаны, новых строк нет.
- Последний production journal содержит `configured:false` для обоих операторов и `errors:[]`; это ожидание доступа, не успешный live pull.

### Что осталось / доступ клиента

Полный список и форматы: `rma/PARKING-FEEDS.md`. Кратко, для каждого оператора нужны:

1. Corporate/fleet account с разрешением на автоматический transaction export для RMA plates.
2. Официальные endpoint + schema documentation и read-only bearer token для reference/plate/time/amount/location/description; либо регулярная CSV выгрузка со stable unique reference.
3. TEST account/plate для первого authenticated pull.

Публичный официальный transaction API и RMA credentials не были доступны. Consumer portal scraping без письменного разрешения не реализовывался.

## 3. Production `rma-rental-operations.timer` — PARTIAL

### Сделано и проверено

Commits: `08262d4d`, `69cfd3a0`.

- Timer **enabled** и **active** на `srv2077538`.
- Timer-triggered last run: **2026-11-21 08:19 UTC**, `Result=success`, `ExecMainStatus=0`; next run: **09:00 UTC**.
- RTA live sync работает. Первый run создал 5 реальных fine charges без уведомлений; повторные runs создали `0` дублей. 17 записей без covering rental были отклонены, а не назначены предполагаемому клиенту.
- `RMA_OPERATIONS_NOTIFICATIONS_ENABLED=false`: reminders `sent:0, disabled:true`, statements `sent:0, disabled:true`.
- Дополнительная защита на будущее: включение требует одновременно `ENABLED=true` и валидный `NOTIFICATIONS_AFTER`; reminders/statements и automatic fine notices ограничены cutoff.
- Engine blocking flag отсутствует в unit; команд block/unblock не было.

### Что осталось / доступ клиента

- Salik на VDS не настроен: нет `SALIK_ACCOUNTS_PATH` и нет default `scripts/.salik-accounts.json`. Journal явно показывает `salik.configured=false`; live Salik retrieval не выполнялся.
- Клиент должен через credential store предоставить read-only Salik account(s), где видны RMA plates. Установить JSON как root-only server file и задать `SALIK_ACCOUNTS_PATH` в `/etc/rma-crm-notify.env` либо использовать защищённый default path. Не хранить его в git.
- После установки проверить, что journal показывает `configured:true`, `accountsReady>0`, корректный found/created и отсутствие errors. До этого Salik считается **blocked**, несмотря на успешный общий service run.

## 4. Unified manager screen per vehicle — DONE

Commit: `dbf8ef94`.

- `/rma/operations` показывает current rental/client, rental start/status, return date и extension state, overdue badge.
- Mileage used / allowed / left / over limit рассчитывается по существующему whole-paid-term правилу.
- Отдельно видны Fine, Salik, Parkin и Parkonic counts + unpaid AED, общий unpaid charges и total debt.
- Oil/filter service status и remaining km, последняя выполненная работа/date.
- Pilot last fix, fresh ≤5 min / stale / no live fix, speed/ignition и engine state.
- Existing UI table/style и ссылки на fleet/rental profiles сохранены.

Production authenticated browser evidence: **21 rows**, headers `Vehicle`, `Customer / rental`, `Return / extension`, `Mileage / allowance`, `Charges / unpaid`, `Total debt`, `Telematics / engine`, `Oil / filters`; Parkin/Parkonic/telematics/service markers все `true`.

## 5. Live E2E fines, Salik, extensions — PARTIAL

Commits: `dbf8ef94`, `24e50efe`.

### Проверено

`npx tsx --conditions=react-server scripts/e2e-rental-operations.ts --commit-test-fixture` выполнен локально и на production schema.

- Создавался отдельный временный tenant с `TEST ONLY - DO NOT CONTACT` customer и `TEST / DO NOT BLOCK` vehicle.
- Fine, Salik, Parkin, Parkonic: 4 charges созданы; 4 повторных импорта проигнорированы как duplicates.
- Real extension service: 3 → 5 paid days, total/balance 300 → 500 AED, `extension_confirmed`.
- Assertions: **0 outbound messages, 0 payments, 0 engine_block rows/commands**. Все TEST rows удалены.
- Live RTA dry/scheduled retrieval подтверждён реальными successful runs и idempotent repeat.

### Не проверено / блокер

- Live Salik account retrieval не выполнялся из-за отсутствующих server credentials (см. пункт 3).
- Parkin/Parkonic live operator pulls не выполнялись из-за отсутствующего operator access (см. пункт 2).
- TARS live browser dry-run не выполнялся; только изолированный fake browser (см. пункт 1).
- Реальным клиентам ничего не отправлялось, реальные деньги не списывались, engine-block/immobilizer команды не вызывались.

## Коммиты этой работы

- `66731bf8` — reviewed automatic TARS submission.
- `d655dfc7` — parking feeds и charge ledger integration.
- `dbf8ef94` — unified operations screen, extension service, E2E runner.
- `08262d4d` — automatic notification/backlog safety gate.
- `24e50efe` — feed/E2E hardening.
- `d389d351` — server-side TARS flags и temp-file cleanup fix.
- `db0c6908` — rollout documentation.
- `69cfd3a0` — explicit unconfigured Salik state; deployed to production.

**Одной строкой:** RMA production обновлён, unified screen и hourly RTA scheduler работают без backlog-уведомлений; для запуска TARS dry-run, Salik и Parkin/Parkonic live feeds нужны внешние TEST/operator credentials.
