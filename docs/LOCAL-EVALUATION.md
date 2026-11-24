# Local evaluation

The customer app runs at http://localhost:8080, operations at http://localhost:3001, and API at http://localhost:4002. MongoDB and Redis must be running with the existing backend `.env` configuration. Do not publish that file.

From `D:\bookcars`, use three separate terminals (stop existing instances on these ports first):

```powershell
npm --prefix backend run dev:local
```

```powershell
npm --prefix admin run dev:local
```

```powershell
npm --prefix frontend run dev:local
```

These commands use the dependencies already installed in this checkout and do not reinstall packages. Shared packages have been compiled locally. A fresh clone still requires its documented dependency setup.

## Demo accounts

All accounts below use password `SafarRent-Demo-2026!` in this local demo only.

| Role | Email | Application |
| --- | --- | --- |
| Administrator | demo-admin@safarrent.local | Operations |
| Customer | demo-customer@safarrent.local | Customer |
| Margalla supplier | margalla@safarrent.pk | Operations |
| Lahore supplier | lahore@safarrent.pk | Operations |
| Karakoram supplier | karakoram@safarrent.pk | Operations |
| Sindh supplier | karachi@safarrent.pk | Operations |

## Repeatable checks

Run `npm --prefix backend run test:evaluation` against the running local API. It tests role login, searches across 14 cities, AI fallback, PKR pricing, KYC enforcement, review visibility, supplier isolation, simulated payment replay, handover, lifecycle transitions and cancellation. Results are written to `backend/evaluation-smoke-results.json`. It removes the bookings it successfully creates and restores the review/KYC states it changes. Run against demo data only, without simultaneous edits to those demo accounts.

Run `node pre-commit.js` at the repository root for the repository's staged-file lint, type and size checks. Full source lint and production builds were also run separately. The focused Jest run covers `pakistanFeatures`, `bookingIntake`, `pricing`, and `logger`: 32 tests across four suites, using `safarrent_evaluation_tests`, separate from the demo database.

## Data and behavior

The seed is non-destructive and identifies vehicles by stable demonstration registration plate and bookings by seed key. It preserves historical bookings and operator changes. The current fleet contains 25 approved vehicles and two pending review vehicles across four suppliers and 14 cities; historical bookings are retained alongside the ten keyed evaluation fixtures. The seed repairs invalid location references only on identifiable synthetic vehicles.

Use the administrator review screen to approve or suspend a listing. A self-drive booking requires verified CNIC and license details. Save the supplier handover checklist before moving a paid trip to in progress, then completed. Customer cancellation immediately changes the trip state; cancellation does not claim that a refund has been issued.

## Evaluation boundaries

JazzCash, Easypaisa, Raast and card confirmations are explicitly simulated. No money moves. AI has an offline fallback; fallback success does not establish live model-provider availability. Demo confirmation emails are intentionally suppressed. Live payment settlement, real email delivery, production deployment and every third-party integration have not been certified by these checks.

The UI uses shared light/dark theme tokens and the supplied orange/teal rental-site inspiration. The final targeted browser audit passed 36 cases at 360, 768 and 1440 pixels, across light/dark checkout, error, users, vehicle creation, supplier profile and scheduler screens, with no detected text contrast or document-width overflow failures. Reports are in `docs/evaluation/`. These automated checks are not a substitute for a complete accessibility or manual acceptance audit.
