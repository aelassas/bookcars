# RMA rental operations — 2026-11-18

Status: implemented locally on `feat/rma-meeting-20261117`, together with the earlier meeting fixes. **Not committed, not deployed, and no migration or production data change has been run.** PR #4 (fleet status/delete fixes) is separate and remains open.

## Requirement coverage

| Area | Code status | Implementation and remaining integration |
|---|---|---|
| 1. Customers and documents | IMPLEMENTED | Customer identity/contact fields, rental history, private Emirates ID/passport/licence/permit uploads, automatic Anthropic OCR draft, editable staff review, audited apply-to-customer. `src/modules/documents/`, `src/components/documents/`, `src/modules/crm/customer-actions.ts`, customer detail page. OCR requires `ANTHROPIC_API_KEY`; without it the UI explicitly requires manual entry. |
| 2. TARS application | AUTOMATIC FLOW IMPLEMENTED / LIVE WRITE DISABLED | Manager review → separate confirmation, audited attempts, idempotent agreement reconciliation, transient retries and feature-flagged dry-run are implemented in `src/modules/rental/tars-actions.ts`, `src/components/rental/TarsSection.tsx` and `scripts/tars-prepare.ts` (migration `0090`). Fake-browser tests prove dry-run does not press Submit and an exact retry does not duplicate. No real application was submitted during testing. Production keeps `TARS_AUTO_SUBMIT_ENABLED` off until an authenticated browser session is validated; existing-customer Emirates ID flow is covered, passport-only tourist creation still needs TARS validation. |
| 3. Rental and mileage | IMPLEMENTED | Handover/return odometers; default 150 km per paid day; allowance = `totalDays × 150`; 30 paid days = 4,500 km; no daily cap; live used/remaining/excess values from Pilot with stored fallback. `src/modules/rental/mileage.ts`, `operations-queries.ts`, booking/return/rental screens. |
| 4. Traffic fines | IMPLEMENTED | Existing real RTA connector imports and deduplicates by fine reference. Hourly sync is prepared, and `/charges` has a selected-car **Sync from RTA** button. Assignment uses vehicle + violation timestamp, including late charges after return. WhatsApp notice, 24-hour debt clock, payment confirmation and charge-linked Pilot block/unblock are coded. The 24 hours starts at actual outbox `sent_at`. Blocking requires current-renter match, fresh (<5 min) telemetry, speed 0 and ignition off. |
| 5. Salik | IMPLEMENTED | Restored the existing authenticated Salik customer-portal connector from the inherited implementation and connected it to `rental_charge`. Hourly sync and a selected-car **Sync from Salik** button import toll trips with exact decimal AED amounts. Each trip is assigned by its Dubai event timestamp to the covering rental; duplicates are ignored. Salik totals enter 15-day/final statements without sending a separate WhatsApp for every toll. Connector: `src/platform/integrations/salik/client.ts`; importer: `src/modules/rental-charges/salik.ts`. |
| 6. Oil and filters | IMPLEMENTED | Date, odometer, work performed and cost; editable warning interval; default warning at 8,000 km and limit at 10,000 km; remaining km before next issue; atomic service record resets the countdown. Parking/polishing/other costs do not reset oil service. `src/modules/fleet/maintenance.ts`, `service-actions.ts`, `VehicleServicePanel.tsx`, `src/modules/notify/service-due.ts`. |
| 7. Return reminder and extension | IMPLEMENTED | 48-hour WhatsApp reminder, saved inbound response, manager notification, awaiting/wants-extension/returning/confirmed statuses, overlap-checked extension, price/balance update and refreshed reminder cycle. `src/modules/rental/operations*`, `extension-actions.ts`, `RentalExtensionPanel.tsx`. |
| 8. Manager screen | IMPLEMENTED | `/operations`: car, current customer, rental dates, extension response, live mileage and allowance, fine/Salik/parking counts, outstanding debt, engine-block state and service remainder. |
| 9. Parkin and Parkonic | CONNECTORS + IMPORT READY / OPERATOR ACCESS MISSING | Authenticated HTTPS JSON connectors, scheduled pull, selected-car sync and CSV fallback write separate paid-parking types to the deduplicated charge ledger. Assignment uses plate + event time and bulk imports do not notify customers. No official operator endpoint/schema/credentials were available, so live feeds are not claimed. Exact required client access and feed formats: `PARKING-FEEDS.md`. |

## Data and safety

- Migration: `drizzle/0086_rental_operations.sql`. Apply only after the earlier `0083`, `0084` and fleet PR migration `0085`.
- New tenant tables have Postgres RLS and tenant-scoped queries. New server actions pass the repository's action-guard tests.
- Rental charge payments are linked to `payment.rental_charge_id` but do **not** reduce the rental's rent/deposit balance.
- `rental_charge.amount` and `payment.amount` support two decimal places, so a Salik trip such as AED 4.20 is not rounded to AED 4 or AED 5. Existing whole-AED rental payments remain valid.
- Duplicate `(tenant, kind, operator reference)` imports are ignored. Salik references are stable hashes of plate, event time, amount and gate.
- Charges with no rental covering their event time are refused rather than assigned to a guessed customer.
- Only charge-linked engine blocks are automatically released after that charge is paid.
- Customer WhatsApp uses configured `CUSTOMER_WA_SENDER_LINE`, with the existing RMA `rma-main` mapping as the RMA default.
- Salik credentials are read from `scripts/.salik-accounts.json` or `SALIK_ACCOUNTS_PATH`. That file is gitignored; credentials must not be committed or printed.

## Scheduler and on-demand sync

Dry run (no writes, messages or Pilot commands):

```bash
cd rma
npx tsx --conditions=react-server scripts/run-rental-operations.ts
```

After migration, backup, Salik configuration review and explicit go-live approval:

```bash
npx tsx --conditions=react-server scripts/run-rental-operations.ts --commit --sync-fines --sync-salik --sync-parking
```

Debt blocking is deliberately a second opt-in and is not part of the hourly service:

```bash
npx tsx --conditions=react-server scripts/run-rental-operations.ts --commit --sync-fines --sync-salik --sync-parking --block-overdue-fines
```

`deploy/rma-rental-operations.service` and `.timer` run RTA, Salik, Parkin and Parkonic sync **hourly**. Automatic customer notifications are OFF by default. Enabling them requires both `RMA_OPERATIONS_NOTIFICATIONS_ENABLED=true` and a valid ISO `RMA_OPERATIONS_NOTIFICATIONS_AFTER`; reminders/statements only consider rentals created after that cutoff, and automatic fine notices only consider events after it. This prevents enabling the timer from sending old/backlog customer notices. At approved release time:

```bash
sudo cp deploy/rma-rental-operations.service deploy/rma-rental-operations.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rma-rental-operations.timer
systemctl list-timers rma-rental-operations.timer
```

Staff can also select a car on `/charges` and sync its RTA fines or Salik trips immediately. Do not enable the blocking flag during the first rental walkthrough.

## Verification

- Targeted RTA/Salik/payment/action-guard checks: **17 passed**.
- Full suite: **1,334 passed, 13 skipped** across 92 passed and 3 skipped test files.
- Salik Dubai-time parsing is tested explicitly so a UTC server cannot shift a trip by four hours.
- TypeScript: passed on the final code. Targeted ESLint: no errors; one pre-existing unused-variable warning remains in `scripts/rental-fines-sync.ts`.
- Production Next.js build: passed on the final code. Existing Turbopack Edge/NFT warnings remain.
- `git diff --check`: passed.
- Not performed: live Salik account retrieval in this round, live OCR with a real identity document, RTA call in this round, real WhatsApp delivery, real Pilot commands, production migration, browser/database walkthrough. These need a non-production migrated environment or explicit production approval.

## Follow-up verification — 2026-11-21

- TARS fake-browser E2E: dry-run never pressed final Submit; an exact repeat reconciled the existing agreement and submitted only once. TARS/action-guard checks: **20 passed**. No real TARS application was submitted.
- Parking parser, charge and action-guard checks passed; API and CSV use the same idempotent ledger path. Live Parkin/Parkonic pulls were not run because operator access is missing.
- Isolated TEST tenant E2E passed for fine, Salik, Parkin and Parkonic charge creation/deduplication and the real extension service: four duplicates ignored, extension recalculated to 5 days / 500 AED, and **0 notifications, payments or engine commands**. All test rows were removed.
- Local migration `0090` and production Next.js build passed. Full suite: **1,367 passed, 1 failed**; the only failure is the previously known unrelated `availability/store.test.ts` phone-override test. Standalone `tsc` reports five pre-existing type errors in unchanged `fleet/permanent-delete.test.ts`; Next.js application TypeScript during the production build passed.


## Краткий статус для группы

Мы собрали рабочую версию всех девяти пунктов в коде:

1. Карточка клиента хранит документы и историю. Emirates ID, паспорт и права можно загрузить; система распознаёт данные, а сотрудник проверяет их перед сохранением.
2. TARS: проверка и подготовка заявки уже есть. Полностью автоматическую отправку пока не обещаем — для туриста без Emirates ID нужно отдельно проверить сценарий TARS.
3. Пробег: общий лимит на весь срок — 150 км за оплаченный день, 4 500 км за 30 дней. Отдельного суточного лимита нет. Видны использованные, оставшиеся и лишние километры.
4. Штрафы RTA и Salik проверяются автоматически каждый час; также менеджер может запустить проверку выбранной машины кнопкой. Каждое начисление привязывается к аренде по машине и точному времени события. Поздние начисления остаются на прежнем клиенте.
5. Для Salik сохраняются точные суммы, включая копейки. Начисления входят в отчёт каждые 15 дней и итоговый расчёт без отдельного сообщения клиенту после каждого проезда.
6. По штрафу есть уведомление, оплата и задолженность. Блокировка возможна только для текущего должника, через 24 часа после фактической доставки уведомления и при подтверждении, что машина стоит с заглушенным двигателем.
7. ТО: предупреждение через 8 000 км после обслуживания, предел 10 000 км. Можно записать дату, пробег, работы и стоимость; после замены масла отсчёт начинается заново.
8. Возврат и продление: напоминание за 48 часов, ответ клиента в CRM, статусы и подтверждение продления менеджером с пересчётом цены. Добавлен общий экран менеджера по каждой машине.
9. Parkin и Parkonic предусмотрены отдельно от штрафов и Salik; до подключения их операторских выгрузок доступен ручной ввод.

Важно: это пока **не опубликовано на production**. Почасовой timer подготовлен, но ещё не включён. Сначала применим миграции на тестовой копии, проверим реальную выгрузку RTA/Salik и проведём одну полную аренду. Только после согласования включим автоматические уведомления. Автоматическую блокировку двигателя в первом тесте не включаем.
