# RMA meeting gaps — 2026-11-17

Source: `/Users/ceo/Documents/ZAMTEK.AE/notes/rma-meeting-20261117.md` (Gemini notes and low-quality transcript). Status is based on the code on 2026-11-17, not on production testing. No deployment or database migration was run.

## Feature audit

| Topic | Status | Evidence / gap |
|---|---|---|
| Balance due | DONE | Stored on rental, updated by confirmed payments and returns, shown in list/detail: `src/platform/db/schema.ts`, `src/modules/rental/payment-actions.ts`, `src/components/rental/RentalDetail.tsx`, `src/components/rental/RentalsList.tsx`. |
| Return inspection | PARTIAL | Return action and modal save dates, odometer, fuel, damage and extra charges: `src/modules/rental/actions.ts`, `src/components/modals/ProcessReturnModal.tsx`. Detail UI reads non-existent `lateFee`, `damageFee`, `extraDays`, `returnNotes`, so saved inspection data is shown incorrectly: `src/components/rental/RentalDetail.tsx`. |
| Contract generation + PDF | DONE | Authenticated generation route, PDF builder, document record and download UI: `src/app/api/rentals/[id]/contract/route.ts`, `src/lib/pdf/rental-contract.ts`, `src/components/rental/ContractSection.tsx`. |
| Stars / ratings | MISSING | No rental/customer rating field, update action or rating UI exists. Add a 1–5 customer rating at return and show it on the rental detail. |
| Payment history | DONE | Rental-scoped payment rows, pending/confirmed states and history table: `src/modules/rental/payment-actions.ts`, `src/modules/rental/queries.ts`, `src/components/rental/RentalDetail.tsx`. |
| Bank transfer payments | DONE | `bank_transfer` is a supported method in schema and payment modal: `src/platform/db/schema.ts`, `src/components/modals/RecordPaymentModal.tsx`. Server-side amount/method validation still needs tightening. |
| Create rental flow | DONE | Quote, overlap protection, customer/vehicle selection, mileage limit and create action: `src/components/modals/CreateRentalModal.tsx`, `src/modules/rental/actions.ts`, `src/modules/rental/queries.ts`. |
| B2B vs B2C rentals | DONE | Channel selector, channel-specific price tiers and persisted rental channel: `src/components/modals/CreateRentalModal.tsx`, `src/platform/db/rental-extras.ts`, `src/modules/rental/actions.ts`. |
| Customer creation | PARTIAL | Standalone add/edit modal exists: `src/components/modals/CreateCustomerModal.tsx`, `src/modules/crm/customer-actions.ts`. The rental form only searches existing customers and cannot create one inline: `src/components/ui/CustomerSearch.tsx`, `src/components/modals/CreateRentalModal.tsx`. |
| Daily rate options | PARTIAL | B2B/B2C duration tiers and manual fallback work, but manual pricing is available only when no tier matches: `src/platform/db/rental-extras.ts`, `src/components/modals/CreateRentalModal.tsx`, `src/modules/rental/actions.ts`. Managers need an explicit manual-rate option for quoted cars too. |
| Cars with history must not be deleted | DONE | Linked rentals, leases, timeline events and documents block deletion; `Sold` is editable and sold cars leave booking/operational views: `src/modules/fleet/actions.ts`, `src/modules/fleet/vehicle-options.ts`, `src/modules/rental/queries.ts`, `src/components/fleet/FleetView.tsx`. Keep this behavior. |

## Known bugs to fix first

1. Return detail shows zero late/damage fees and hides actual damage notes because its local type uses fields absent from the rental schema.
2. Payment API accepts non-finite amounts, arbitrary methods and amounts above the outstanding balance; confirmation then clamps balance to zero and loses the overpayment.
3. No way to create a customer without abandoning the rental flow.
4. No rating model/UI, so ratings cannot update.
5. Manual daily rate cannot be deliberately selected when a tier exists.

## Implementation order

1. Fix return inspection mapping and payment validation; add focused business-rule tests.
2. Add rental customer rating (additive migration `0083`, return action, modal and detail display). Do not run the migration until MC approves.
3. Add inline customer creation to the rental modal and return the new customer to the selector.
4. Add explicit manual daily-rate/deposit selection while preserving tier quotes as the default.
5. Run targeted tests, full tests, TypeScript, ESLint and production build locally. Do not deploy or run destructive DB changes.

## Implementation on `feat/rma-meeting-20261117`

- Fixed return detail mapping using the real `damageNotes`, `extraChargeAmount`, `extraChargeReason` and shared late-return calculation.
- Added optional 1–5 customer rating at return (`rental.customer_rating`, migration `0083`), star input and detail display. Because the transcript does not define a separate rating entity, the rating belongs to that rental's return inspection.
- Added inline customer creation to New booking; the saved customer is selected without closing the rental form.
- Added explicit manual daily-rate/deposit selection for quoted vehicles, with validation and audit text distinguishing it from tier pricing.
- Added positive-integer, supported-method and outstanding-balance checks for payments. Confirmation locks the rental, rejects overpayment and conditionally posts a pending payment once.
- Preserved zero odometer/fuel values and added server validation for fuel and extra charges.
- Added focused tests: `src/modules/rental/return-charges.test.ts`, `src/modules/rental/payment-rules.test.ts`, `src/modules/rental/pricing.test.ts`.

Migration `0083_rental_customer_rating.sql` is additive but intentionally NOT applied. Production was not deployed. A live browser/database walkthrough must wait until MC approves a safe test database or migration.

## Calculator follow-up

- Daily rate and deposit are now always visible, editable inputs in New booking; no hidden manual-pricing checkbox.
- Added a separate renter profile: **Tourist** or **Local / UAE resident**. It is independent of B2B/B2C pricing.
- Deposit defaults follow the existing RMA policy templates: tourist AED 1,500 (or the vehicle tier's explicit deposit), resident AED 0. The manager can override either amount.
- The calculator now continuously shows rent subtotal, deposit and total including deposit from the edited values.
- The renter profile is stored on the rental via additive migration `0084_rental_customer_type.sql` and shown on rental detail. Historic rows remain NULL rather than being guessed.
- Fixed contract PDF mapping: **Total Rent price** is now `dailyRate × totalDays`; it no longer incorrectly includes the deposit. The deposit remains a separate PDF field.

## Verification

- Full suite after calculator follow-up: **1319 passed, 13 skipped** across 91 test files (88 passed, 3 skipped).
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; two pre-existing unused-import warnings in `src/modules/rental/actions.ts` (`lease`, `insertPurposeChangeEvent`).
- `npm run build`: passed locally. Existing Turbopack Edge/NFT warnings remain.
- Final `git diff --check`: passed.
- Not performed by design: deployment, migration execution, destructive DB operations or live DB/browser walkthrough.

## Screenshot review from the shared Google Doc

1. **Fleet / Edit vehicle:** the screenshot confirms Available / In service / Sold, Delete, daily rate, odometer, 8000 km oil interval and next-service fields. The correct retirement path for a car with history is Sold; no additional fleet-schema gap is shown.
2. **Rental detail:** the AED 3,780 balance is internally consistent: 8 days × AED 285 + AED 1,500 deposit. Contract PDF has not been generated yet; TARS correctly lists the missing Emirates ID and VIN as prerequisites. Deposit is still held.
3. **Payment bug visible only in the screenshot:** two pending rows each claim the full AED 3,780 — one Cash and one Bank_transfer. Pending rows must not reduce balance before confirmation, but the system must also prevent multiple pending rows from collectively exceeding the remaining balance and let staff reject the duplicate.

### Additional payment hardening after screenshot review

- `recordPayment` now locks the rental and subtracts existing pending payments before accepting another one.
- Added `rejectPayment`: pending payments can be rejected without changing balance; confirmed payments cannot be rejected; repeat rejection is idempotent.
- Added Confirm & post / Reject controls in payment history and readable `bank transfer` labels.
- Added `src/modules/rental/payment-actions.test.ts` for rejection, confirmed-payment protection and balance immutability; expanded pending-balance tests in `payment-rules.test.ts`.
- Existing duplicate rows are NOT modified by this branch. After deployment, staff must confirm only the actually received payment and reject the duplicate manually.

## Текст для группы клиента

**RMA CRM — статус исправлений после встречи 17.11**

Готово в рабочей версии, но пока **не опубликовано на production**:

1. **Калькулятор аренды.** Цена за день и залог теперь всегда доступны для редактирования. Система показывает отдельно стоимость аренды, залог и общий итог.
2. **Турист / местный житель.** Добавлен отдельный выбор типа клиента. Для туриста по умолчанию залог AED 1,500, для местного жителя — AED 0. Любую сумму менеджер может изменить вручную.
3. **B2B / B2C.** Оба канала сохранены; можно использовать тариф по сроку аренды или собственную цену.
4. **Создание клиента.** Нового клиента можно добавить прямо из формы бронирования, не закрывая её.
5. **Оплаты.** Добавлены банковский перевод, подтверждение и отклонение платежа. Дубли и суммы выше остатка теперь блокируются, включая ожидающие подтверждения платежи.
6. **Возврат автомобиля.** Исправлены осмотр, повреждения, дополнительные расходы и просрочка. Нулевой пробег и уровень топлива больше не теряются. Добавлена оценка клиента от 1 до 5 звёзд.
7. **Договор PDF.** Исправлена строка Total Rent price: теперь там только стоимость аренды без залога; залог указан отдельно.
8. **Автопарк.** Автомобиль с историей нельзя удалить — его нужно перевести в Sold. Это сохраняет аренды, документы и историю.

**Проверка:** 1,319 автотестов пройдены, проверка TypeScript и production-сборка успешны.

**Следующий шаг:** применить два безопасных добавления в базу (оценка клиента и тип турист/местный), опубликовать обновление и провести один полный тест: клиент → бронирование → договор → выдача → оплата → возврат. Старый дублированный платёж на скриншоте после публикации нужно вручную отклонить, подтвердив только реально полученный платёж.
