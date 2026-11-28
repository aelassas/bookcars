# SafarRent

SafarRent is a Pakistan-focused car-rental marketplace prototype for a final-year project. The web application has a customer portal, an operations portal, an Express/Mongoose API, MongoDB, and optional local Ollama trip intake.

## Native Windows development

Docker is **not required** to run the local FYP demo. The standard local endpoints are:

| Service | Local address | Purpose |
| --- | --- | --- |
| Customer app | http://localhost:8080 | Search sample cars, create accounts, and submit rental requests |
| Operations portal | http://localhost:3001 | Manage demo suppliers, cars, bookings, and review workflows |
| API | http://localhost:4002 | Customer and operations API |
| MongoDB | `127.0.0.1:27017/safarrent` | Native Windows MongoDB Community with replica set `rs0` |
| Ollama (optional) | `http://127.0.0.1:11434` | Local model for AI trip intake; deterministic rules fallback works while it is offline |

Install Node.js and MongoDB Community on Windows, configure MongoDB with replica set `rs0`, and follow the [native FYP demo guide](docs/FYP-DEMO.md) for seeding and the three app-terminal commands. Redis is optional for local development: its client connects lazily, and ordinary development rate limits fail open when Redis is unavailable. Email-dependent flows still require a configured email service outside the local FYP demo.

The Docker Compose files remain available as an **optional teammate/container workflow**. They are not used by the native Windows instructions.

## Demo inventory and payment behavior

The FYP fleet is synthetic sample data, not a public dataset or verified supplier inventory. In explicit development demo mode, the search API may show the clearly named synthetic demo suppliers so the search and booking flow can be demonstrated. This does not represent supplier verification or real-world fulfillment. Payment methods are simulated and do not contact JazzCash, Easypaisa, Raast, a bank, or a card network.

AI trip intake returns a draft. It does not confirm availability, price, or a booking. A human must review it before an operator creates a booking. If Ollama is offline or returns invalid output, the endpoint uses deterministic rules-based extraction and labels the result as a fallback.

## Pakistan domain support

The data model includes PKR pricing, Pakistani mobile and CNIC validation, self-drive and with-driver modes, trip scope and terrain capability, fuel policy, payment state fields, and a vehicle handover checklist. Existing legacy fields remain where application compatibility requires them; production migrations must preserve and reconcile existing data.

BookCars supports 8 languages (English, French, Spanish, German, Portuguese, Italian, Chinese, and Japanese) and [134 currencies](https://github.com/aelassas/bookcars/wiki/Add-New-Currency), and you can [add a new language](https://github.com/aelassas/bookcars/wiki/Add-New-Language) by following the guide. The platform is protected against common web attacks (XSS, CSRF, MITM, and DDoS) and secured with JWT authentication, HttpOnly cookies, TLS encryption, Redis-backed rate limiting, Google reCAPTCHA on public forms, and request validation. It includes error monitoring with [Sentry](https://github.com/aelassas/bookcars/wiki/Setup-Sentry), and is easy to deploy with [Docker](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)).

- FYP supplier and customer records are synthetic; no real supplier has approved fulfillment.
- Payment credentials, provider callbacks, refunds, and settlement reconciliation are not configured.
- Google OAuth requires valid client settings; use email/password for the local demo.
- Public access needs a separate deployment, domain, HTTPS, production database, secret management, backups, and monitoring.
- The responsive web app can be opened in a phone browser; a native Android/iOS app remains on the roadmap.

## Roadmap: Native Mobile App

A responsive web application is included. A dedicated native Android/iOS app can be configured after the web deployment and API contracts are stable.

## Open-source notices

This project is derived from the BookCars open-source project. Required upstream copyright and license notices are retained in [LICENSE](LICENSE). SafarRent branding and demo workflows do not imply that the upstream project or any third party operates this rental service.
