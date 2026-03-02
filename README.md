[![build](https://github.com/aelassas/bookcars/actions/workflows/build.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/build.yml) 
[![test](https://github.com/aelassas/bookcars/actions/workflows/test.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/test.yml) 
[![codecov](https://img.shields.io/codecov/c/github/aelassas/bookcars?label=coverage)](https://codecov.io/gh/aelassas/bookcars)
[![loc](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml) 
[![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net/)
[![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki)

<!--
[![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki)
[![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net/)
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

[![](https://bookcars.github.io/content/cover-1.png)](https://bookcars.dynv6.net:3002/)

## BookCars

BookCars is a car rental platform with an admin panel for managing fleets and bookings, as well as a frontend and a mobile app for renting cars.

It comes with built-in support for Stripe and PayPal payment gateways, allowing you to choose the one best suited for your country or business model. If Stripe isn't available in your region, PayPal serves as a secure and reliable alternative.

BookCars supports both single-supplier and multi-supplier modes. Suppliers can manage their fleets and bookings through a dedicated admin panel. Each new supplier receives an email prompting them to create their account and gain access to the system.

The admin panel allows admins to manage suppliers, cars, countries, locations, parking spots, customers, bookings, and payments.

Customers can register through the web frontend or mobile app, search for available cars based on pickup and drop-off points and time, choose a car and complete the checkout process in a few clicks.

## Quick Links
* [Overview](https://github.com/aelassas/bookcars/wiki/Overview)  
* [Install Guide (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))
* [Install Guide (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))
* [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)  
* [Price Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* [Rental Date and Time Constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints)
* [Payment Gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)
* [FAQ](https://github.com/aelassas/bookcars/wiki/FAQ)
* [Full Documentation](https://github.com/aelassas/bookcars/wiki)

## Features

### Supplier & Fleet Management

* Supplier management
* Supplier contracts
* Supplier search result limit
* Ready for single or multiple suppliers
* Car fleet management
* Flexible time-based car availability
* Flexible rental date and time constraints
* Booking management
* Vehicle scheduler
* Auto-notification system

### Pricing & Payments

* Dynamic price calculation: hourly, daily, weekly, bi-weekly, and monthly rates
* Date-based price rates
* Price change rate
* Payment management
* Multiple payment gateways supported: Stripe, PayPal
* Multiple payment methods: Credit Card, PayPal, Google Pay, Apple Pay, Link, Pay at the counter, Pay in full, Pay deposit

### Locations & Search

* Hierarchical locations with country, map, and parking integration
* Location-based search with nested child location support
* Map display for locations and parking spots

### User Experience

* Customer management
* Multiple login options: Google, Facebook, Apple, Email
* Multiple language support: English, French, Spanish
* Multiple currencies support
* Multiple pagination styles: classic (next/previous), infinite scroll
* Push notifications

### Security & Performance

* Secure against XSS, XST, CSRF, MITM, and DDoS attacks
* Responsive admin panel and frontend
* Native mobile app for Android and iOS (single codebase)
* Docker support for easy deployment and better developer experience
* Error monitoring and performance tracing

### Supported Platforms
* iOS
* Android
* Web
* Docker

## Support & Contributing

If this project helped you, saved you time, or inspired you in any way, please consider supporting its future growth and maintenance. You can show your support by starring the repository (it helps increase visibility and shows your appreciation), sharing the project (recommend it to colleagues, communities, or on social media), or making a donation (if you'd like to financially support the development) via [GitHub Sponsors](https://github.com/sponsors/aelassas) (one-time or monthly), [PayPal](https://www.paypal.me/aelassaspp), or [Buy Me a Coffee](https://www.buymeacoffee.com/aelassas). Open-source software requires time, effort, and resources to maintain—your support helps keep this project alive, up-to-date, and accessible to everyone. Every contribution, big or small, makes a difference and motivates continued work on features, bug fixes, and new ideas.

<!--<a href="https://github.com/sponsors/aelassas"><img src="https://aelassas.github.io/content/github-sponsor-button.png" alt="GitHub" width="210"></a>
<a href="https://www.paypal.me/aelassaspp"><img src="https://aelassas.github.io/content/paypal-button-v2.png" alt="PayPal" width="208"></a>
<a href="https://www.buymeacoffee.com/aelassas"><img src="https://aelassas.github.io/content/bmc-button.png" alt="Buy Me A Coffee" width="160"></a>-->
<!--
To contribute code or report issues, please read the [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md) to learn about the process, coding standards, and how to submit pull requests.

If you want to customize BookCars while keeping your fork up to date with the latest changes, check out the [Fork, Customize, and Sync](https://github.com/aelassas/bookcars/wiki/Fork,-Customize,-and-Sync) guide in the Wiki.
-->
## Live Demo
<!--
Some features are locked down on the demo links provided. To have access to all the features contact me by email. You can find it on my [profile page](https://github.com/aelassas) (requires login).
-->
### Frontend

* URL: https://bookcars.dynv6.net/
* Login: jdoe@bookcars.ma
* Password: B00kC4r5

### Admin Panel

* URL: https://bookcars.dynv6.net:3001/
* Login: admin@bookcars.ma
* Password: B00kC4r5

### Mobile App

You can install the Android app on any Android device.

#### Scan this code with a device

Open the Camera app and point it at this code. Then tap the notification that appears.

<img alt="" width="120" src="https://bookcars.github.io/content/qr-code-8.5.png">

#### How to install the Mobile App on Android

* On devices running Android 8.0 (API level 26) and higher, you must navigate to the Install unknown apps system settings screen to enable app installations from a particular location (i.e. the web browser you are downloading the app from).

* On devices running Android 7.1.1 (API level 25) and lower, you should enable the Unknown sources system setting, found in Settings > Security on your device.

#### Alternative Way

You can install the Android App by downloading the APK and installing it on any Android device.

* [Download APK](https://github.com/aelassas/bookcars/releases/download/v8.5/bookcars-8.5.apk)
* Login: jdoe@bookcars.ma
* Password: B00kC4r5
<!--
## Website Source Code (bookcars.github.io)

The source code for the official BookCars website is available here:

[https://github.com/bookcars/bookcars.github.io](https://github.com/bookcars/bookcars.github.io)

It features a clean landing page with multilingual support, dark mode, and SEO optimizations to help it reach users in different languages and regions.

The codebase follows the Separation of Concerns (SoC) principle, with a modular and maintainable architecture that aligns with the Single Responsibility Principle (SRP), modularity, and modern frontend best practices. It uses GitHub Actions for automatic builds and deployments. The Android demo app download link is dynamically fetched and updated on the site.

⚡ **Ultra-fast performance**

The website loads in under 1.5 seconds on slow 4G with **0ms blocking**, **0 layout shift**, and a blazing **Speed Index of 0.8**.

Feel free to explore the code, suggest improvements, or use it as a template for your own landing page.
-->

## License

BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
