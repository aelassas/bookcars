-- ============================================================================
--  vehicle_pnl  —  per-car Profit & Loss view
-- ----------------------------------------------------------------------------
--  Reproduces the legacy "Handover Report" (a 148-column, one-row-per-car
--  Google Sheet / Bitrix export) margin logic on top of the platform's
--  event-sourced ledger.
--
--  Pipeline reproduced:
--     Покупка (purchase) -> Расходы (expenses) -> Аренда/доход (rental income)
--     -> Выкупной платеж (buyout) -> Продажа (sale) -> Маржа (margin per line)
--     -> Итого Маржа (total margin) -> Рентабельность (profitability)
--     -> Бонусы (department bonus) -> ФОТ/КиАУР (payroll / overhead allocation).
--
--  ANALYZE-ONLY STAGE. The platform is the source of truth; Bitrix is a
--  peripheral engine. This is SCAFFOLDING for human review — every formula
--  that could not be verified against a written spec is flagged
--  "-- ASSUMPTION:" so a reviewer can confirm or correct it against the real
--  Handover Report workbook before this view is trusted for reporting.
--
--  Scale context (sanity-check target): ~420 cars, ~AED 60M total purchase.
--
--  Multi-tenancy: this view reads only tenant-scoped base tables. Postgres RLS
--  on those tables (policy `<table>_tenant_isolation`, predicate
--  `tenant_id = current_setting('app.tenant_id', true)::uuid`) is enforced for
--  the app_runtime role. A plain (non-materialized) view runs with the
--  privileges + row-visibility of the *querying* role, so as long as callers
--  connect as app_runtime with `SET LOCAL app.tenant_id` set, the view is
--  automatically tenant-filtered and needs no WHERE tenant_id clause of its own.
--  tenant_id is still SELECTed so downstream materialized views / joins can
--  re-filter, and so `security_invoker` (below) has a column to key on.
-- ============================================================================


-- ── Assumed source-of-truth ledger contract ────────────────────────────────
--  This view is written against `vehicle_ledger_event`, the append-only,
--  double-entry-ish ledger that every money movement for a car projects into.
--  The table itself is defined elsewhere (schema / migration); the columns
--  this view depends on are listed here so a reviewer can confirm the contract:
--
--    tenant_id     uuid        -- RLS key
--    vehicle_id    uuid        -- FK -> vehicle.id (the car this line belongs to)
--    deal_id       uuid        -- FK -> deal.id   (nullable; ties line to a deal)
--    event_type    text        -- canonical category code (see category map below)
--    direction     text        -- 'cost' | 'income'  (-- ASSUMPTION, see below)
--    amount_aed    numeric      -- signed-or-unsigned money in AED (see ASSUMPTION)
--    occurred_at   timestamptz -- business date of the movement
--    voided_at     timestamptz -- nullable; non-null => reversed/excluded line
--
--  -- ASSUMPTION: `amount_aed` is stored as a POSITIVE magnitude and the
--  -- cost/income sign is carried by `direction`. If instead amounts are
--  -- already signed (costs negative), drop the abs()/CASE sign handling below.
--
--  -- ASSUMPTION: `direction` holds exactly 'cost' or 'income'. If the ledger
--  -- instead encodes direction implicitly in `event_type`, the CASE map below
--  -- (which classifies purely by event_type) is already sufficient and
--  -- `direction` can be ignored.
--
--  -- ASSUMPTION: money is whole/〈2dp〉 AED in `amount_aed numeric`. The
--  -- Handover Report shows AED with no fractional fils; numeric preserves both.
--
--  -- ASSUMPTION: a line with `voided_at IS NOT NULL` is a reversal/correction
--  -- and must be excluded from all sums (matches "cancelled row" behaviour in
--  -- the sheet). Confirm the ledger uses soft-void rather than compensating
--  -- negative entries; if it uses compensating entries, remove the filter.


-- ── event_type -> Handover Report line mapping ──────────────────────────────
--  -- ASSUMPTION: the following canonical `event_type` codes map 1:1 to the
--  -- Handover Report Russian column headers. These codes are the contract the
--  -- projector must emit. Reviewer: confirm each Russian label below matches
--  -- the exact 148-col header and that no cost/income line is missing.
--
--    COST side (Расходы):
--      'purchase_with_title'  Покупка с ПТС      (purchase, incl. title/ПТС)
--      'rent_expense'         Аренда             (rent we PAY on the car)
--      'buyout_payment'       Выкупной платеж    (buyout instalment we pay)
--      'kasko'                КАСКО              (comprehensive insurance)
--      'osago'                ОСАГО              (compulsory motor insurance)
--      'interest'             Проценты           (financing interest)
--      'transport'            Автовоз            (car-carrier transport)
--      'agent_fee'            Агентское вознаграждение (agency commission)
--      'fines'                Штрафы             (traffic fines)
--      'tow'                  Эвакуатор          (tow truck)
--      'registration_service' Услуги регистрации (registration services)
--      'tracker'              Трекер             (GPS tracker hardware/install)
--      'wrap'                 Оклейка            (vinyl wrap / branding)
--      'repair'               Ремонт ТС          (vehicle repair)
--      'wash_fuel'            Мойка/бензин       (wash + fuel)
--      'dry_cleaning'         Химчистка          (interior dry cleaning)
--      'state_duty'           Госпошлина         (state duty)
--      'transport_tax'        Транспортный налог (transport/road tax)
--      'luxury_tax'           Налог на роскошь   (luxury tax)
--
--    INCOME side (Доходы):
--      'sale_with_title'      Продажа с ПТС      (sale proceeds, incl. title)
--      'rent_income'          Аренда             (rent we RECEIVE)
--      'buyout_income'        Выкупной платеж    (buyout received)
--      -- + "mirrors": some Handover lines net an expense against a matching
--      -- income (e.g. fines re-billed to the client). Those mirror-income
--      -- codes are assumed to reuse the income codes above; see the per-line
--      -- margin block for how mirror netting is expressed.


CREATE OR REPLACE VIEW vehicle_pnl
    -- security_invoker=on so the view executes with the caller's RLS context
    -- (app_runtime + app.tenant_id), NOT the view owner's — otherwise RLS on
    -- the underlying tenant tables would be bypassed. Requires PG >= 15.
    WITH (security_invoker = on)
AS
WITH
-- ── 1. Ledger lines, cleaned & classified ───────────────────────────────────
ledger AS (
    SELECT
        e.tenant_id,
        e.vehicle_id,
        e.deal_id,
        e.event_type,
        e.occurred_at,
        -- Normalise to a positive magnitude regardless of storage convention.
        -- -- ASSUMPTION: see amount_aed note above.
        abs(e.amount_aed) AS amount_aed
    FROM vehicle_ledger_event e
    WHERE e.voided_at IS NULL          -- exclude reversed/cancelled lines
),

-- ── 2. Pivot ledger into Handover Report line items, per car ────────────────
--  One row per vehicle. Each column is SUM(amount) FILTER (event_type = code),
--  coalesced to 0 so a car that never incurred a cost shows 0, not NULL —
--  matching the sheet where blank cells behave as 0 in the margin formulas.
lines AS (
    SELECT
        l.tenant_id,
        l.vehicle_id,

        ----- COST side (Расходы) --------------------------------------------
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'purchase_with_title'),  0) AS cost_purchase_with_title, -- Покупка с ПТС
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'rent_expense'),          0) AS cost_rent,                -- Аренда (paid)
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'buyout_payment'),        0) AS cost_buyout,              -- Выкупной платеж
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'kasko'),                 0) AS cost_kasko,               -- КАСКО
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'osago'),                 0) AS cost_osago,               -- ОСАГО
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'interest'),              0) AS cost_interest,            -- Проценты
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'transport'),             0) AS cost_transport,           -- Автовоз
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'agent_fee'),             0) AS cost_agent_fee,           -- Агентское вознаграждение
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'fines'),                 0) AS cost_fines,               -- Штрафы
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'tow'),                   0) AS cost_tow,                 -- Эвакуатор
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'registration_service'),  0) AS cost_registration,       -- Услуги регистрации
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'tracker'),               0) AS cost_tracker,             -- Трекер
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'wrap'),                  0) AS cost_wrap,                -- Оклейка
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'repair'),                0) AS cost_repair,              -- Ремонт ТС
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'wash_fuel'),             0) AS cost_wash_fuel,           -- Мойка/бензин
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'dry_cleaning'),          0) AS cost_dry_cleaning,       -- Химчистка
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'state_duty'),            0) AS cost_state_duty,          -- Госпошлина
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'transport_tax'),         0) AS cost_transport_tax,       -- Транспортный налог
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'luxury_tax'),            0) AS cost_luxury_tax,          -- Налог на роскошь

        ----- INCOME side (Доходы) -------------------------------------------
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'sale_with_title'),       0) AS income_sale_with_title,   -- Продажа с ПТС
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'rent_income'),           0) AS income_rent,              -- Аренда (received)
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'buyout_income'),         0) AS income_buyout,            -- Выкупной платеж (received)

        ----- Timing --------------------------------------------------------
        -- Last movement date, used as a fallback "as-of" for the report.
        MAX(l.occurred_at) AS last_ledger_at
    FROM ledger l
    GROUP BY l.tenant_id, l.vehicle_id
),

-- ── 3. Identity + last-handover date, per car ───────────────────────────────
--  The Handover Report header block: №, Manager, Month, Status, Позывной,
--  Brand, Model, Car Class, VIN, Deal, last-handover date.
identity AS (
    SELECT
        v.tenant_id,
        v.id                                   AS vehicle_id,
        v.make                                 AS brand,          -- Brand
        v.model                                AS model,          -- Model
        -- -- ASSUMPTION: "Car Class" is not yet a first-class column on
        -- vehicle; derived class lives in external_source-fed data. Emit NULL
        -- placeholder so the report shape is stable. Reviewer: wire to the
        -- real class field (e.g. vehicle.car_class) once it exists.
        NULL::text                             AS car_class,      -- Car Class
        -- -- ASSUMPTION: VIN is not yet a column on `vehicle` (only plate/imei
        -- exist today). Placeholder NULL until a `vin` column is added.
        NULL::text                             AS vin,            -- VIN
        v.plate                                AS plate,
        v.status                               AS status,         -- Status
        v.division                             AS division,
        -- -- ASSUMPTION: Позывной ("callsign", format D-0001a) is not stored
        -- yet. We synthesise a stable, human-readable placeholder from a
        -- division letter + the vehicle's per-tenant sequence. Reviewer:
        -- replace with the authoritative callsign column when available so it
        -- matches the workbook exactly (letter suffix, re-use rules, etc.).
        (
            CASE lower(v.division)
                WHEN 'lease' THEN 'L'
                WHEN 'rent'  THEN 'D'   -- -- ASSUMPTION: rent -> 'D' prefix (D-0001a)
                ELSE 'X'
            END
            || '-'
            || lpad(
                 (row_number() OVER (
                     PARTITION BY v.tenant_id
                     ORDER BY v.created_at, v.id
                 ))::text, 4, '0')
        )                                      AS callsign,       -- Позывной
        v.created_at                           AS vehicle_created_at
    FROM vehicle v
),

-- ── 4. Deal linkage: manager, month, deal ref, last handover date ───────────
--  A car may touch several deals over its life. -- ASSUMPTION: the Handover
--  Report shows the MOST RECENT deal that reached the 'handover' stage (that
--  is the report's subject). We pick the latest such deal per vehicle.
deal_pick AS (
    SELECT DISTINCT ON (le.vehicle_id)
        le.tenant_id,
        le.vehicle_id,
        d.id            AS deal_id,
        d.ref           AS deal_ref,       -- Deal
        d.owner_id      AS manager_id,     -- Manager (user id)
        d.stage         AS deal_stage,
        d.updated_at    AS deal_updated_at
    FROM (
        -- distinct vehicle/deal pairs seen in the ledger
        SELECT DISTINCT tenant_id, vehicle_id, deal_id
        FROM vehicle_ledger_event
        WHERE deal_id IS NOT NULL
    ) le
    JOIN deal d ON d.id = le.deal_id AND d.tenant_id = le.tenant_id
    -- -- ASSUMPTION: prefer handover-stage deals; among them (or if none, among
    -- all linked deals) prefer the most recently updated as "the" deal/handover.
    ORDER BY
        le.vehicle_id,
        (d.stage = 'handover') DESC,
        d.updated_at DESC
),

-- ── 5. Department bonus + payroll/overhead inputs ───────────────────────────
--  -- ASSUMPTION: department bonus (Бонусы) and ФОТ/КиАУР (payroll +
--  administrative/managerial overhead — "Фонд оплаты труда" / "Коммерческие,
--  административные и управленческие расходы") are NOT per-car ledger lines.
--  In the workbook they are period totals allocated across cars. Until the
--  allocation model is confirmed we surface them as ledger lines IF the
--  projector emits them per car, else 0. Reviewer MUST confirm the real
--  allocation basis (per-car flat? by margin share? by department headcount?).
overhead AS (
    SELECT
        l.tenant_id,
        l.vehicle_id,
        -- -- ASSUMPTION: 'department_bonus' event_type, if emitted per car.
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'department_bonus'), 0) AS department_bonus, -- Бонусы
        -- -- ASSUMPTION: 'payroll_overhead' event_type carries the allocated
        -- ФОТ/КиАУР share for this car, if the projector allocates it per car.
        COALESCE(SUM(l.amount_aed) FILTER (WHERE l.event_type = 'payroll_overhead'), 0) AS payroll_overhead  -- ФОТ / КиАУР
    FROM ledger l
    GROUP BY l.tenant_id, l.vehicle_id
)

-- ── 6. Final projection: totals, per-line margin, profitability ─────────────
SELECT
    -- ─── Header block (Handover Report identity columns) ───────────────────
    -- №  — stable per-tenant ordinal. -- ASSUMPTION: the sheet's "№" is a
    -- display row number, not a business key; we derive it deterministically.
    row_number() OVER (PARTITION BY i.tenant_id ORDER BY i.callsign) AS row_no,        -- №
    i.tenant_id,
    dp.manager_id                                                    AS manager_id,     -- Manager
    -- Month — -- ASSUMPTION: the reporting "Month" is the month of the last
    -- handover (deal update) if a handover deal exists, else the last ledger
    -- movement month. Confirm whether the workbook keys Month off handover
    -- date, sale date, or the report generation date.
    to_char(
        COALESCE(dp.deal_updated_at, ln.last_ledger_at),
        'YYYY-MM'
    )                                                                AS report_month,   -- Month
    i.status                                                         AS status,         -- Status
    i.callsign                                                       AS callsign,       -- Позывной
    i.brand                                                          AS brand,          -- Brand
    i.model                                                          AS model,          -- Model
    i.car_class                                                      AS car_class,      -- Car Class
    i.vin                                                            AS vin,            -- VIN
    i.plate                                                          AS plate,
    i.division                                                       AS division,
    dp.deal_id                                                       AS deal_id,
    dp.deal_ref                                                      AS deal_ref,       -- Deal
    -- last-handover date. -- ASSUMPTION: the date the (latest handover) deal
    -- was last updated is the "last handover date". If a dedicated
    -- handover_at timestamp exists on deal, prefer it.
    dp.deal_updated_at                                               AS last_handover_at,

    -- ─── COST side (Расходы) — one column per Handover line ────────────────
    ln.cost_purchase_with_title,   -- Покупка с ПТС
    ln.cost_rent,                  -- Аренда
    ln.cost_buyout,                -- Выкупной платеж
    ln.cost_kasko,                 -- КАСКО
    ln.cost_osago,                 -- ОСАГО
    ln.cost_interest,              -- Проценты
    ln.cost_transport,             -- Автовоз
    ln.cost_agent_fee,             -- Агентское вознаграждение
    ln.cost_fines,                 -- Штрафы
    ln.cost_tow,                   -- Эвакуатор
    ln.cost_registration,          -- Услуги регистрации
    ln.cost_tracker,               -- Трекер
    ln.cost_wrap,                  -- Оклейка
    ln.cost_repair,                -- Ремонт ТС
    ln.cost_wash_fuel,             -- Мойка/бензин
    ln.cost_dry_cleaning,          -- Химчистка
    ln.cost_state_duty,            -- Госпошлина
    ln.cost_transport_tax,         -- Транспортный налог
    ln.cost_luxury_tax,            -- Налог на роскошь

    -- Итого расходов (total cost). -- ASSUMPTION: the report's total expense
    -- is the plain sum of every cost line above. Department bonus and
    -- ФОТ/КиАУР are treated as SEPARATE overhead blocks (see below), NOT part
    -- of this operational-cost subtotal — matching the sheet's layout where
    -- Бонусы / ФОТ sit under their own headers. Confirm inclusion/exclusion.
    (
        ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
      + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
      + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
      + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
      + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
      + ln.cost_luxury_tax
    )                                                                AS total_cost,      -- Итого расходов

    -- ─── INCOME side (Доходы) ─────────────────────────────────────────────
    ln.income_sale_with_title,     -- Продажа с ПТС
    ln.income_rent,                -- Аренда
    ln.income_buyout,              -- Выкупной платеж

    -- Итого доходов (total income). -- ASSUMPTION: plain sum of income lines.
    (
        ln.income_sale_with_title + ln.income_rent + ln.income_buyout
    )                                                                AS total_income,    -- Итого доходов

    -- ─── Per-line Маржа (margin) — income line minus its mirror cost line ──
    --  The Handover Report computes a margin PER category where a category has
    --  both a cost and an income leg ("mirrors"). -- ASSUMPTION: the three
    --  mirrored pairs are: sale-vs-purchase, rent-received-vs-rent-paid, and
    --  buyout-received-vs-buyout-paid. All other cost lines have no income
    --  mirror and therefore only depress the overall margin (captured in the
    --  Итого Маржа below), not a per-line margin. Reviewer: confirm the exact
    --  set of mirrored pairs and the sign convention.
    (ln.income_sale_with_title - ln.cost_purchase_with_title)        AS margin_sale,     -- Маржа: Продажа − Покупка
    (ln.income_rent            - ln.cost_rent)                       AS margin_rent,     -- Маржа: Аренда(получено) − Аренда(уплачено)
    (ln.income_buyout          - ln.cost_buyout)                     AS margin_buyout,   -- Маржа: Выкуп(получено) − Выкуп(уплачено)

    -- Итого Маржа (total margin). -- ASSUMPTION: total margin = total income
    -- minus total OPERATIONAL cost (all Расходы lines), i.e. it already nets
    -- the mirrored pairs plus every non-mirrored cost. It is computed here
    -- from the subtotals to stay consistent with them.
    (
        (ln.income_sale_with_title + ln.income_rent + ln.income_buyout)
      - (
            ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
          + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
          + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
          + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
          + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
          + ln.cost_luxury_tax
        )
    )                                                                AS total_margin,    -- Итого Маржа

    -- ─── Overhead blocks (surfaced separately from operational cost) ───────
    ov.department_bonus,                                                                 -- Бонусы
    ov.payroll_overhead,                                                                 -- ФОТ / КиАУР

    -- Итого Маржа после накладных (net margin after bonus + overhead).
    -- -- ASSUMPTION: the workbook's bottom-line profit deducts department
    -- bonus and ФОТ/КиАУР from Итого Маржа. Provided as a convenience column;
    -- confirm whether the sheet nets these here or reports them purely
    -- informationally (in which case downstream can ignore this column).
    (
        (
            (ln.income_sale_with_title + ln.income_rent + ln.income_buyout)
          - (
                ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
              + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
              + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
              + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
              + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
              + ln.cost_luxury_tax
            )
        )
      - ov.department_bonus
      - ov.payroll_overhead
    )                                                                AS net_margin,      -- Итого Маржа − Бонусы − ФОТ

    -- ─── Рентабельность (profitability %) ─────────────────────────────────
    --  -- ASSUMPTION: profitability = Итого Маржа / total OPERATIONAL cost,
    --  expressed as a fraction (multiply by 100 for a percentage). This is
    --  return-on-cost. If the workbook instead divides margin by total income
    --  (a margin ratio) or by purchase price only, swap the denominator.
    --  Guarded against divide-by-zero: a car with zero cost yields NULL.
    CASE
        WHEN (
            ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
          + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
          + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
          + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
          + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
          + ln.cost_luxury_tax
        ) = 0 THEN NULL
        ELSE round(
            (
                (ln.income_sale_with_title + ln.income_rent + ln.income_buyout)
              - (
                    ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
                  + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
                  + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
                  + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
                  + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
                  + ln.cost_luxury_tax
                )
            )
            / NULLIF(
                (
                    ln.cost_purchase_with_title + ln.cost_rent + ln.cost_buyout
                  + ln.cost_kasko + ln.cost_osago + ln.cost_interest + ln.cost_transport
                  + ln.cost_agent_fee + ln.cost_fines + ln.cost_tow + ln.cost_registration
                  + ln.cost_tracker + ln.cost_wrap + ln.cost_repair + ln.cost_wash_fuel
                  + ln.cost_dry_cleaning + ln.cost_state_duty + ln.cost_transport_tax
                  + ln.cost_luxury_tax
                ), 0),
            4)
    END                                                              AS profitability,   -- Рентабельность (fraction; ×100 = %)

    -- ─── Timing convenience ───────────────────────────────────────────────
    ln.last_ledger_at                                                AS last_ledger_at

FROM identity      i
-- LEFT JOIN so a car with an identity row but no ledger movements still
-- appears (all cost/income 0) — the workbook lists every car, even fresh ones.
LEFT JOIN lines    ln ON ln.vehicle_id = i.vehicle_id AND ln.tenant_id = i.tenant_id
LEFT JOIN deal_pick dp ON dp.vehicle_id = i.vehicle_id AND dp.tenant_id = i.tenant_id
LEFT JOIN overhead ov ON ov.vehicle_id = i.vehicle_id AND ov.tenant_id = i.tenant_id;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- app_runtime is the non-superuser role RLS is enforced for. Because the view
-- is security_invoker, app_runtime needs SELECT on the view AND on the base
-- tables it reads (vehicle, deal, vehicle_ledger_event) — its tenant policies
-- then scope every row. -- ASSUMPTION: those base-table grants already exist
-- (they are created with the tables); we grant only the view here.
-- -- ASSUMPTION: role name is `app_runtime` (per DB_APP_ROLE default). If a
-- deployment overrides DB_APP_ROLE, re-grant to the configured role.
GRANT SELECT ON vehicle_pnl TO app_runtime;

COMMENT ON VIEW vehicle_pnl IS
    'Per-car P&L reproducing the legacy 148-column Handover Report margin logic '
    'from vehicle_ledger_event. ANALYZE-ONLY scaffolding: every unverified '
    'formula is flagged -- ASSUMPTION -- in the source and must be confirmed '
    'against the real workbook before use. security_invoker=on; relies on RLS '
    'tenant isolation of the base tables under the app_runtime role.';
