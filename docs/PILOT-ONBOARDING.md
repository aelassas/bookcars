# SafarRent Pakistan Pilot Onboarding

This runbook is for a final-year-project demonstration and a controlled pilot. It separates workflows the software can perform from external approvals and real-world checks.

## Roles and responsibility

- **Platform admin:** verifies supplier evidence, activates/deactivates supplier accounts and vehicles, audits bookings/payments, handles escalations and maintains access control.
- **Supplier operator:** confirms availability and listing accuracy, accepts/rejects requests, hands over the vehicle and follows the listing's rental/cancellation terms.
- **Customer:** supplies accurate contact/driver details, reviews vehicle requirements and terms, and follows pickup instructions.
- **Payment operator:** reconciles provider events and settlements, investigates pending/duplicate transactions and records refund references.

## Supplier and vehicle onboarding record

Keep the following in a restricted admin process; never put CNIC, license or registration scans in this public project repository.

| Record | Required verification before public listing |
|---|---|
| Supplier | Legal/business name, authorized representative, verified email/phone, operating address, payout account ownership, signed supplier agreement |
| Vehicle | Make/model/year, plate and registration evidence, ownership/authority to rent, insurance/fitness validity, seats/transmission/fuel, accurate current photos |
| Terms | Per-day/hour/intercity pricing, included mileage/fuel, deposit, driver option, delivery/pickup fees, cancellation/refund, claims and support contact |
| Availability | Calendar owner, blackout/maintenance periods, response SLA and a real-time process for confirming or declining requests |
| Evidence | Reviewer identity, verification date, document expiry date, decision and reason; access limited to authorized staff |

Add the first consenting supplier and a small number of vehicles in Sahiwal. Do not expand to another city until search isolation, availability and supplier response are reliable for the pilot. Add Pakistan cities only alongside actual inventory and a local support/fulfillment plan.

## Booking state policy to agree before pilot

1. A customer submits a request against a verified vehicle and available dates.
2. The supplier accepts or rejects within an agreed response window. Until accepted, display the exact pending state and explain whether a payment is only authorized, captured or not yet collected.
3. A confirmed booking records the supplier, vehicle, driver, locations, dates, agreed price, terms version and payment/provider reference.
4. Cancellation applies the terms shown to the customer at booking time. Record who initiated it, timestamp, fee/refund calculation, provider refund ID and settlement outcome.
5. If a provider says payment succeeded but the booking failed, stop the handoff, raise an operations incident and reconcile/refund. Never tell the user a refund completed until the provider confirms it.
6. Support escalation needs a monitored contact channel, operating hours, response target and named operator before launch.

The current backend's payment and booking code does not by itself prove the supplier's business policy, legal enforceability, provider settlement or messaging delivery. Configure those rules with the real supplier and payment provider; have local counsel review customer-facing terms.

## Service credentials

- OpenAI: create/rotate the project key, attach billing/limits, confirm model access. Store only as `BC_OPENAI_API_KEY` in the backend secret store. Check AI intake status and usage without placing sensitive identity data in prompts.
- Stripe/PayPal: use only an account supported for the operating entity and region. Configure matching server secret and frontend public/client key, sandbox first. Reconcile booking amount/currency, provider event/signature, duplicate callback, expiry, capture and refund.
- JazzCash/Easypaisa/Raast/bank: these require their respective merchant/bank onboarding and officially issued integration details. They are not available simply by showing their logos. Build an adapter and verified callback handling only against provider documentation and test credentials.
- Notifications: set an SMTP sender/domain and deliverability records; for SMS/WhatsApp use an approved provider account, templates/consent, delivery callbacks and opt-out handling.

Never commit `.env`, log provider tokens, ask customers for OTPs, or send identity documents to an AI provider.

## FYP evidence and demo

Use the cases in `FINAL-ACCEPTANCE-CHECKLIST.md`. Capture sanitized screenshots/logs, retain test fixtures separately from production data, and report measurements including failures. Clearly label unavailable provider integrations and any rules-fallback AI result. For a supervised demo, use a consenting supplier/test account and a provider sandbox; do not claim a real transaction unless you have its settlement/refund evidence.

## Expansion gate: Sahiwal to Pakistan

For each new city, require verified supplier capacity, explicit pickup/drop-off coverage, vehicle availability ownership, local escalation coverage and successful city-isolation/date-overlap tests. Keep city/country/airport records separate from fleet availability: a location existing in the directory does not mean a car is actually available there.
