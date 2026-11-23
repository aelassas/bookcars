# Deployment

## Local Docker setup

For a production or non-demo database, set `BC_ADMIN_EMAIL` and a unique `BC_ADMIN_PASSWORD` of at least 12 characters before running the one-time backend setup. The setup command refuses to create the administrator when that password is absent; it has no built-in default credential. For local FYP demonstrations, use the synthetic demo administrator created by the development-only seed documented in [FYP-DEMO.md](FYP-DEMO.md).

1. Copy `.env.compose.example` to an ignored root `.env` and replace every sample value with unique secrets. Keep the Mongo username/password in `BC_DB_URI` identical to `MONGO_ROOT_USERNAME` and `MONGO_ROOT_PASSWORD`; URL-encode special characters in URI credentials.
2. Configure `backend/.env.docker` from `backend/.env.docker.example`. Backend AI, SMTP, payment, JWT and cookie secrets belong there and must not be put in frontend/admin `VITE_` variables.
3. For a brand-new database volume, start with `docker compose -f docker-compose.dev.yml up --build` (development) or `docker compose up --build` (production-like local stack). The MongoDB replica set is required by booking reservation transactions.
4. Existing Mongo volumes keep their original root account. Do not change Mongo credentials in Compose without migrating that account and updating the URI; merely changing `MONGO_INITDB_ROOT_PASSWORD` does not rotate credentials in an initialized volume.
5. Mongo Express is a development database viewer. Do not publish it to the internet. Restrict its port or remove the service for production.

## Production deployment requirements

Use managed MongoDB with replica set/transaction support, managed Redis, private object storage for identity documents, HTTPS at the edge, and a secret manager. Set unique authentication secrets, SMTP credentials, domain allowlists, reCAPTCHA and monitoring. Configure backups and prove a restore before accepting bookings. Keep public app builds free of server secrets.

Payments currently support only the configured upstream Stripe or PayPal implementation. JazzCash, Easypaisa, bank transfer and Raast are not integrated by these changes. Obtain a merchant account, official API credentials, callback/webhook configuration, settlement/reconciliation process and refund procedures before adding any payment method. Do not mark a method live or collect customer funds until sandbox and authorized low-value live checks pass.

The FYP development stack uses a local Ollama service and does not require a cloud AI key. Pull the configured model once with `docker compose -f docker-compose.dev.yml exec ollama ollama pull qwen3:4b-instruct`; the model stays in the `ollama_models` volume. Booking intake falls back to a clearly labeled rules-based draft if the local service or model is unavailable. For cloud deployment, configure an approved provider and key only in the backend environment, apply usage limits, and retain operator review of AI drafts.

Supplier onboarding is an operational/legal step, not something the code can perform: verify the business and contact, authority to list each vehicle, registration/ownership documents, insurance/fitness, driver/license obligations, pickup locations, price rules, availability, cancellation/refund terms and payout details. Obtain consent for the pilot transaction and retain verification evidence securely.
