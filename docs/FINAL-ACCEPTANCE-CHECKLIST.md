# Final Acceptance Checklist

- [x] Backend build passes
- [x] Admin build passes
- [x] Frontend build passes sequentially
- [x] Maintenance and document features compile
- [x] AI approval and booking audit linkage compile
- [ ] MongoDB integration tests against an isolated replica-set database
- [ ] Full browser demo across customer and admin roles
- [ ] 20-case AI dataset execution with measured extraction accuracy
- [x] Project documentation set (architecture, database, API, security, user, deployment, test and limitations notes)
- [ ] Production security review by an authorized reviewer
- [ ] Real Sahiwal supplier identity and fleet verification
- [ ] Supplier-authorized end-to-end pilot booking
- [ ] Payment provider merchant account and sandbox/live transaction, refund and reconciliation checks
- [ ] Production email/SMS delivery checks
- [ ] Managed production hosting, HTTPS, backups, restore, monitoring and incident response
- [ ] Legal, tax, privacy and consumer-protection review for intended operating model

## Booking and operations acceptance cases

Run each case on an isolated test deployment, save request/response evidence with secrets and personal data redacted, and record build/version, expected result, actual result and pass/fail.

| Case | Action | Expected result |
|---|---|---|
| Auth 1 | Register with valid unique email and password | Account is created according to verification policy; no credentials are logged |
| Auth 2 | Register duplicate email / invalid input | Request is rejected without duplicate account |
| Auth 3 | Sign in, read session, sign out | Authenticated routes work until sign-out; session then fails |
| Auth 4 | Attempt admin-only endpoint as customer | Access is denied |
| Search 1 | Search a city/date range with verified available inventory | Only matching available listings are returned with current price |
| Search 2 | Search with no inventory, invalid dates, or overlapping reservation | Empty/validation/conflict result; no unrelated city inventory leaks |
| Booking 1 | Submit valid pay-later booking where supplier permits it | Booking is persisted, supplier/admin notified, customer receives configured confirmation |
| Booking 2 | Supplier/admin accepts then rejects a booking | State changes are authorized, auditable, and notifications match the state |
| Booking 3 | Two customers reserve the same car and overlapping dates concurrently | At most one reservation succeeds |
| Booking 4 | Cancel within/outside the supplier's stated terms | Correct policy is applied and refund obligation is visible/auditable |
| Payment 1 | Successful provider payment | Server verifies provider, amount, currency and idempotency before finalizing |
| Payment 2 | Failed, pending, duplicate and interrupted provider callback | No false paid state or duplicate booking; retry/reconciliation path is available |
| Payment 3 | Authorized refund and provider reconciliation | Refund status, provider reference, operator and timestamps are auditable |
| Admin 1 | Verify supplier/car documents, activate listing, then deactivate it | Only active verified inventory is public; all changes have an actor and time |
| Admin 2 | Review AI intake draft and correct/approve/reject it | Draft remains non-booking until human action; audit links any resulting booking |
| Admin 3 | Review metrics, documents, maintenance and booking records | Metrics reflect active verified suppliers and authorized roles only |
| Notify 1 | Exercise configured email/SMS/push success and failure | Delivery outcomes are observable; booking state is not falsely reported as notified |

Payment and supplier cases require provider sandbox accounts and an authorized real supplier; do not substitute invented live records.

The project is not complete until unchecked items are honestly completed.
