# SafarRent Test Report

Last verified: 2026-11-15 against the local development Compose stack.

## Verified in this run

- Backend, customer frontend, admin frontend, MongoDB, Redis, and Ollama containers were running; MongoDB and Ollama reported healthy.
- Backend, customer frontend, and admin TypeScript project builds passed. Customer and admin Vite production builds passed.
- Customer authentication succeeded with the local synthetic FYP account.
- Sahiwal date/location search returned one matching synthetic supplier and eight available vehicle listings for the requested dates.
- Pay-later checkout created a MongoDB booking; the authenticated customer could retrieve it and the customer booking list showed it when filtered by its supplier.
- The admin status endpoint changed that booking from pending to reserved. The demo booking was then finalized as cancelled by admin so it did not remain an active reservation.
- Customer cancellation requests are conditional on the booking's cancellation option. A request against the test booking (created without that option) returned 204; this is an expected policy gate, not a successful cancellation. A separate full cancel-request flow with the option enabled remains unverified.
- Local AI booking intake returned HTTP 200 from `ollama-local`, `degraded: false`, parsed the Sahiwal to Lahore route and requested dates, required human approval, and created an audit visible in the admin audit endpoint.
- AI city extraction is not an exact pickup/drop-off location. The admin review screen now offers matching location choices so an operator can select a real listed pickup point before approval.
- A temporary customer registration through the phone/LAN API returned HTTP 200, sign-in succeeded, and the generated smoke-test user was removed through the admin endpoint.
- The customer, admin, and backend LAN URLs returned HTTP 200 from the host. A customer-origin API request from the LAN URL passed CORS.
- Registration is responsive by layout; its date field now forces the MUI floating label to shrink so it does not overlap the date placeholder. The Google OAuth control is hidden when only the placeholder client ID is configured.
- No live payment was initiated. Local demo checkout is pay-later and does not charge a card or mobile wallet.

## Not yet verified or not available locally

- Full browser end-to-end coverage for every customer and admin screen, mobile/responsive UI, and the entire Jest suite.
- Physical-phone access and rendering has not been checked on a separate phone; the local Wi-Fi URLs and host/API behavior were checked from the development computer.
- MongoDB replica-set integration/concurrency tests and the 20-case AI extraction accuracy evaluation.
- A customer cancellation request with the cancellation option selected, followed by supplier/admin resolution.
- Production supplier identity/fleet verification, supplier-authorized pilot, and genuine inventory availability.
- JazzCash, Easypaisa, card/bank merchant onboarding, sandbox/live transactions, refunds, and reconciliation.
- Production email/SMS delivery, legal review, managed hosting, HTTPS, backups/restore, monitoring, and incident response.

Demo suppliers, cars, accounts, and generated bookings are synthetic records for the FYP demonstration. They must not be represented as verified businesses or live marketplace supply. Payment options remain setup-only unless their provider integrations and merchant accounts are configured and verified. The local Ollama model is bounded by this machine's resources and is not a hosted production availability guarantee.

No secret values are recorded in this report.
