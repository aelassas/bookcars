[![build](https://github.com/aelassas/bookcars/actions/workflows/build.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/build.yml) 
[![test](https://github.com/aelassas/bookcars/actions/workflows/test.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/test.yml) 
[![codecov](https://img.shields.io/codecov/c/github/aelassas/bookcars?label=coverage)](https://codecov.io/gh/aelassas/bookcars)
[![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.wexdev.com/)
[![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki)

<!--
[![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki)
[![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.wexdev.com/)
[![loc](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml) 
[![tested with jest](https://img.shields.io/badge/tested_with-jest-brightgreen?logo=jest)](https://github.com/jestjs/jest)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aelassas/bookcars/pulls)
[![codecov](https://codecov.io/gh/aelassas/bookcars/graph/badge.svg?token=FSB0H9RDEQ)](https://codecov.io/gh/aelassas/bookcars)
[![codecov](https://img.shields.io/codecov/c/github/aelassas/bookcars?label=coverage)](https://codecov.io/gh/aelassas/bookcars)
[![coveralls](https://coveralls.io/repos/github/aelassas/bookcars/badge.svg?branch=main)](https://coveralls.io/github/aelassas/bookcars?branch=main)
[![open-vscode](https://img.shields.io/badge/open-vscode-1f425f.svg)](https://vscode.dev/github/aelassas/bookcars/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md)

[![containerize](https://github.com/aelassas/bookcars/actions/workflows/containerize.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/containerize.yml)

https://github.com/user-attachments/assets/01afc5ec-3c0a-47b9-a4e1-3b8888b2a695
-->

[![](https://bookcars.github.io/content/cover-1.png)](https://bookcars.wexdev.com/)

## BookCars

BookCars is an open-source, cross-platform car rental platform. It includes an admin panel for managing fleets and bookings, a responsive web frontend, and a native mobile app for Android and iOS, so customers can rent cars from any device.

BookCars supports both single-supplier and multi-supplier modes. Suppliers manage their own fleets and bookings through a dedicated admin panel, with a vehicle scheduler, [supplier contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts), search result limits, and an [automatic notification system](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System). Each new supplier receives an email prompting them to create their account and gain access to the system. Admins can manage suppliers, cars, countries, locations, parking spots, customers, bookings, and payments.

Pricing is flexible. Each car can have hourly, daily, bi-weekly, weekly, and monthly rates, discounted prices, [date-based price rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates), and a supplier [price change rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate), all combined by a [dynamic price calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation). Admins can also configure [rental date and time constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints), such as the minimum notice before pick-up, the minimum rental duration, the allowed pick-up and drop-off hours, and a minimum number of rental days per supplier. [Car availability is flexible too](https://github.com/aelassas/bookcars/wiki/FAQ#how-to-automatically-prevent-a-car-from-being-booked-multiple-times-when-its-already-booked): a car can be blocked automatically after a successful payment, or stay available for overlapping bookings.

Locations are [hierarchical](https://github.com/aelassas/bookcars/wiki/Locations), with countries, nested child locations, parking spots, and a map display.

BookCars comes with built-in support for the [Stripe and PayPal payment gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways), allowing you to choose the one best suited for your country or business model. If Stripe isn't available in your region, PayPal serves as a secure and reliable alternative. Customers can pay by credit card, PayPal, Google Pay, Apple Pay, or Link, pay in full, pay a deposit, or pay at the counter.

Customers can register through the web frontend or mobile app, or sign in with email, Google, Facebook, or Apple. They can search for available cars by pickup and drop-off locations and times, choose a car, and complete the checkout process in a few clicks.

BookCars supports 8 languages (English, French, Spanish, German, Portuguese, Italian, Chinese, and Japanese) and [134 currencies](https://github.com/aelassas/bookcars/wiki/Add-New-Currency), and you can [add a new language](https://github.com/aelassas/bookcars/wiki/Add-New-Language) by following the guide. The platform is protected by JWT authentication, HttpOnly cookies, TLS encryption, Redis-backed rate limiting, Google reCAPTCHA on public forms, and request validation against common web attacks (XSS, CSRF, MITM, and DDoS). It includes error monitoring with [Sentry](https://github.com/aelassas/bookcars/wiki/Setup-Sentry), and is easy to deploy with [Docker](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)).

## Quick Links
* [Overview](https://github.com/aelassas/bookcars/wiki/Overview)  
* [Install Guide (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))
* [Install Guide (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))
* [Development Database](https://github.com/aelassas/bookcars/wiki/Development-Database)
* [Full Documentation](https://github.com/aelassas/bookcars/wiki)

## Stats for Nerds

<!--
[![LoC Prod](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/loc-prod.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml)
[![LoC Tests](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/loc-tests.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml)
-->
[![LoC Total](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/loc-total.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml)

## Support

BookCars is free and open source. If it helped you, saved you time, or powered your production workflows, consider supporting the project via [PayPal](https://www.paypal.me/aelassaspp), [GitHub Sponsors](https://github.com/sponsors/aelassas), [Liberapay](https://liberapay.com/aelassas/), or [Buy Me a Coffee](https://www.buymeacoffee.com/aelassas) to keep it active, independent, and free for everyone.

<!--
If this project helped you, saved you time, or inspired you, consider supporting its future growth and maintenance. You can show your support by starring the repository, sharing the project, or via [PayPal](https://www.paypal.me/aelassaspp), [GitHub Sponsors](https://github.com/sponsors/aelassas), [Liberapay](https://liberapay.com/aelassas/), or [Buy Me a Coffee](https://www.buymeacoffee.com/aelassas).

Open-source software requires time, effort, and resources to maintain. Your support helps keep this project alive, up-to-date, and accessible to everyone. Every contribution, big or small, makes a difference and motivates continued work on features, bug fixes, and new ideas.
-->

<!--<a href="https://github.com/sponsors/aelassas"><img src="https://aelassas.github.io/content/github-sponsor-button.png" alt="GitHub" width="210"></a>
<a href="https://www.paypal.me/aelassaspp"><img src="https://aelassas.github.io/content/paypal-button-v2.png" alt="PayPal" width="208"></a>
<a href="https://www.buymeacoffee.com/aelassas"><img src="https://aelassas.github.io/content/bmc-button.png" alt="Buy Me A Coffee" width="160"></a>-->
<!--
To contribute code or report issues, please read the [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md) to learn about the process, coding standards, and how to submit pull requests.

If you want to customize BookCars while keeping your fork up to date with the latest changes, check out the [Fork, Customize, and Sync](https://github.com/aelassas/bookcars/wiki/Fork,-Customize,-and-Sync) guide in the Wiki.
-->

## Live Demo

| App | URL | Login | Password |
|-----|-----|-------|----------|
| Frontend | https://bookcars.wexdev.com/ | `jdoe@bookcars.ma` | `B00kC4r5` |
| Admin Panel | https://bookcars.wexdev.com:3001/ | `admin@bookcars.ma` | `B00kC4r5` |

### Mobile App

Install the Android app on any Android device by scanning the QR code with the Camera app, or by [downloading the APK](https://github.com/aelassas/bookcars/releases/download/v9.2/bookcars-9.2.apk). Sign in with the frontend login above.

<img alt="QR code to download the BookCars Android APK" width="120" src="https://github.com/user-attachments/assets/5085a2cb-bd37-4282-9f20-9b92c179d043">

<details>
<summary>How to install the Mobile App on Android</summary>

* Android 8.0 (API level 26) and higher: open the Install unknown apps system settings screen and allow app installations from the source you are downloading the app from (e.g. your web browser).
* Android 7.1.1 (API level 25) and lower: enable the Unknown sources system setting, found in Settings > Security.

</details>

## License

BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
