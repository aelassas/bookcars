[![build](https://github.com/aelassas/bookcars/actions/workflows/build.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/build.yml) [![test](https://github.com/aelassas/bookcars/actions/workflows/test.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/test.yml) [![coveralls](https://coveralls.io/repos/github/aelassas/bookcars/badge.svg?branch=main)](https://coveralls.io/github/aelassas/bookcars?branch=main) [![loc](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml) [![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki) [![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net:3002/) [![open-vscode](https://img.shields.io/badge/open-vscode-1f425f.svg)](https://vscode.dev/github/aelassas/bookcars/)

<!--
[![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki)
[![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net:3002/)
[![loc](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml) 
[![tested with jest](https://img.shields.io/badge/tested_with-jest-brightgreen?logo=jest)](https://github.com/jestjs/jest)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aelassas/bookcars/pulls)
[![codecov](https://codecov.io/gh/aelassas/bookcars/graph/badge.svg?token=FSB0H9RDEQ)](https://codecov.io/gh/aelassas/bookcars)
[![codecov](https://img.shields.io/codecov/c/github/aelassas/bookcars?logo=codecov)](https://codecov.io/gh/aelassas/bookcars)
[![coveralls](https://coveralls.io/repos/github/aelassas/bookcars/badge.svg?branch=main)](https://coveralls.io/github/aelassas/bookcars?branch=main)
[![open-vscode](https://img.shields.io/badge/open-vscode-1f425f.svg)](https://vscode.dev/github/aelassas/bookcars/)

https://github.com/user-attachments/assets/01afc5ec-3c0a-47b9-a4e1-3b8888b2a695
-->

## BookCars

BookCars is a modern, open-source, and highly customizable car rental platform built for scalability, efficiency, and low operating costs. Whether you're running a single rental business or a multi-supplier marketplace, BookCars provides all the tools you need to grow and manage your operations with ease.

It comes with built-in support for [Stripe](https://stripe.com/global) and [PayPal](https://www.paypal.com/us/webapps/mpp/country-worldwide) [payment gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways), allowing you to choose the one best suited for your country or business model. If Stripe isn't available in your region, PayPal serves as a secure and reliable alternative.

You can deploy BookCars with minimal cost using the [Docker-based setup](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)). It runs efficiently on a small virtual server with just 1GB of RAM—ideal for startups and small businesses. Hosting can cost as little as $5/month using cloud providers like [Hetzner](https://www.hetzner.com/cloud/) or [DigitalOcean](https://www.digitalocean.com/pricing/droplets).

BookCars supports both single-supplier and multi-supplier modes. Suppliers can manage their fleets and bookings through a dedicated admin panel. Each new supplier receives an email invitation prompting them to create their account and gain access to the system.

The admin panel allows admins to manage suppliers, cars, countries , locations, parking spots, customers, bookings, and payments.

Customers can register through the web frontend or mobile app, search for available cars based on pickup/drop-off details, and complete the booking and payment process in a few clicks.

BookCars is free and open source. You can customize and deploy it yourself by following the [documentation](https://github.com/aelassas/bookcars/wiki). If you prefer assistance with customization or deployment, feel free to [contact me](https://github.com/aelassas). My email is available on my GitHub profile (requires login).

## Features

### 🏢 Supplier & Fleet Management
* Supplier management
* [Supplier contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
* [Supplier search result limit](https://github.com/aelassas/bookcars/wiki/FAQ#how-do-i-limit-the-number-of-cars-for-a-supplier-in-search-results)
* Ready for single or multiple suppliers
* Car fleet management
* Booking management
* [Vehicle scheduler](https://bookcars.github.io/content/screenshots/v5.5/backend-scheduler.png?raw=true)
* [Auto-Notification System](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System)

### 💳 Pricing & Payments
* [Dynamic price calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* [Date-based price rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates)
* [Price change rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate)
* Payment management
* [Multiple payment gateways supported (Stripe, PayPal)](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)
* Multiple payment methods: Credit Card, PayPal, Google Pay, Apple Pay, Link, Pay at the counter, Pay in full, Pay deposit

### 🌍 Locations & Search
* [Hierarchical locations with country, map, and parking integration](https://github.com/aelassas/bookcars/wiki/Locations)
* Location-based search with nested child location support
* Map display for locations and parking spots

### 👥 User Experience
* Customer management
* [Multiple login options](https://github.com/aelassas/bookcars/wiki/Social-Login-Setup): Google, Facebook, Apple, Email
* Multiple language support: English, French, Spanish
* [Multiple currencies support](https://github.com/aelassas/bookcars/wiki/Add-New-Currency)
* Multiple pagination styles: classic (next/previous), infinite scroll
* Push notifications

### 🛡️ Security & Performance
* Secure against XSS, XST, CSRF, MITM, and DDoS attacks
* Responsive admin panel and frontend
* Native mobile app for Android and iOS (single codebase)
* [Docker](https://www.docker.com/) support for easy deployment and a better developer experience

### 🖥️ Supported Platforms
* iOS
* Android
* Web
* Docker

## Support & Contributing

If this project helped you, saved you time, or inspired you in any way, please consider supporting its future growth and maintenance. You can show your support by starring the repository (it helps increase visibility and shows your appreciation), sharing the project (recommend it to colleagues, communities, or on social media), or making a donation (if you'd like to financially support the development) via [GitHub Sponsors](https://github.com/sponsors/aelassas) (one-time or monthly), [PayPal](https://www.paypal.me/aelassaspp), or [Buy Me a Coffee](https://www.buymeacoffee.com/aelassas). Open-source software requires time, effort, and resources to maintain—your support helps keep this project alive, up-to-date, and accessible to everyone. Every contribution, big or small, makes a difference and motivates continued work on features, bug fixes, and new ideas.

<!--<a href="https://github.com/sponsors/aelassas"><img src="https://aelassas.github.io/content/github-sponsor-button.png" alt="GitHub" width="210"></a>-->
<a href="https://www.paypal.me/aelassaspp"><img src="https://aelassas.github.io/content/paypal-button-v2.png" alt="PayPal" width="208"></a>
<a href="https://www.buymeacoffee.com/aelassas"><img src="https://aelassas.github.io/content/bmc-button.png" alt="Buy Me A Coffee" height="38"></a>

To contribute code or report issues, please read our [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md) to learn about the process, coding standards, and how to submit pull requests.

We appreciate your help in making BookCars better!

## Live Demo
<!--
Some features are locked down on the demo links provided. To unlock all the features contact me by email and I will you give a full access. You can find my email on my [GitHub](https://github.com/aelassas) profile page.
-->
### Frontend

* URL: https://bookcars.dynv6.net:3002/
* Login: jdoe@bookcars.ma
* Password: B00kC4r5

### Admin Dashboard

* URL: https://bookcars.dynv6.net:3001/
* Login: admin@bookcars.ma
* Password: B00kC4r5

### Mobile App

You can install the Android app on any Android device.

#### Scan this code with a device

Open the Camera app and point it at this code. Then tap the notification that appears.

<img alt="" width="120" src="https://bookcars.github.io/content/qr-code-7.6.png">

#### How to install the Mobile App on Android

* On devices running Android 8.0 (API level 26) and higher, you must navigate to the Install unknown apps system settings screen to enable app installations from a particular location (i.e. the web browser you are downloading the app from).

* On devices running Android 7.1.1 (API level 25) and lower, you should enable the Unknown sources system setting, found in Settings > Security on your device.

#### Alternative Way

You can install the Android App by downloading the APK and installing it on any Android device.

* [Download APK](https://github.com/aelassas/bookcars/releases/download/v7.6/bookcars-7.6.apk)
* Login: jdoe@bookcars.ma
* Password: B00kC4r5

## Documentation

1. [Overview](https://github.com/aelassas/bookcars/wiki/Overview)
   1. [Frontend](https://github.com/aelassas/bookcars/wiki/Overview#frontend)
   1. [Admin Panel](https://github.com/aelassas/bookcars/wiki/Overview#admin-panel)
   1. [Mobile App](https://github.com/aelassas/bookcars/wiki/Overview#mobile-app)
2. [Why Use BookCars](https://github.com/aelassas/bookcars/wiki/Why-Use-BookCars)
3. [Software Architecture](https://github.com/aelassas/bookcars/wiki/Architecture)
   1. [Technologies Overview](https://github.com/aelassas/bookcars/wiki/Architecture#technologies-overview)
   1. [TypeScript Across the Stack](https://github.com/aelassas/bookcars/wiki/Architecture#typescript-across-the-stack)
   1. [Platform Highlights](https://github.com/aelassas/bookcars/wiki/Architecture#platform-highlights)
   1. [Backend](https://github.com/aelassas/bookcars/wiki/Architecture#backend)
   1. [Frontend](https://github.com/aelassas/bookcars/wiki/Architecture#frontend)
   1. [Admin Panel](https://github.com/aelassas/bookcars/wiki/Architecture#admin-panel)
   1. [Mobile App](https://github.com/aelassas/bookcars/wiki/Architecture#mobile-app)
   1. [Shared Packages](https://github.com/aelassas/bookcars/wiki/Architecture#shared-packages)
   1. [Architecture Principles](https://github.com/aelassas/bookcars/wiki/Architecture#architecture-principles)
   1. [Docker & Development Environment](https://github.com/aelassas/bookcars/wiki/Architecture#docker--development-environment)
   1. [Codebase Overview](https://github.com/aelassas/bookcars/wiki/Architecture#codebase-overview)
   1. [Production Readiness](https://github.com/aelassas/bookcars/wiki/Architecture#-production-readiness)
   1. [Git Pre-commit Checks with Husky](https://github.com/aelassas/bookcars/wiki/Architecture#git-pre-commit-checks-with-husky)
   1. [Continuous Integration (CI)](https://github.com/aelassas/bookcars/wiki/Architecture#continuous-integration-ci)
4. [Advanced Features](https://github.com/aelassas/bookcars/wiki/Advanced-Features)
   1. [Security Practices](https://github.com/aelassas/bookcars/wiki/Advanced-Features#security-practices)
   1. [Monitoring & Logging](https://github.com/aelassas/bookcars/wiki/Advanced-Features#monitoring--logging)
   1. [Deployment & Hosting](https://github.com/aelassas/bookcars/wiki/Advanced-Features#deployment--hosting)
   1. [Extensibility & Customization](https://github.com/aelassas/bookcars/wiki/Advanced-Features#extensibility--customization)
   1. [Analytics & Tracking](https://github.com/aelassas/bookcars/wiki/Advanced-Features#analytics--tracking)
5. [Installing (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))
6. [Installing (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))
   1. [Docker Image](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#docker-image)
   1. [SSL](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#ssl)
7. [Payment Gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)
8. [Setup Stripe](https://github.com/aelassas/bookcars/wiki/Setup-Stripe)
9. [Social Login Setup](https://github.com/aelassas/bookcars/wiki/Social-Login-Setup)
10. [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)
11. [Demo Database](https://github.com/aelassas/bookcars/wiki/Demo-Database)
    1. [Windows, Linux and macOS](https://github.com/aelassas/bookcars/wiki/Demo-Database#windows-linux-and-macos)
    1. [Docker](https://github.com/aelassas/bookcars/wiki/Demo-Database#docker)
12. [Run from Source](https://github.com/aelassas/bookcars/wiki/Run-from-Source)
13. [Run from Source (Docker)](https://github.com/aelassas/bookcars/wiki/Run-from-Source-(Docker))
14. [Run Mobile App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App)
    1. [Prerequisites](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#prerequisites)
    1. [Instructions](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#instructions)
    1. [Push Notifications](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#push-notifications)
    1. [Run iOS App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#run-ios-app)
15. [Locations](https://github.com/aelassas/bookcars/wiki/Locations)
16. [Auto‐Notification System](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System)
17. [Price Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
    1. [Pricing Fields](https://github.com/aelassas/bookcars/wiki/Price-Calculation#pricing-fields)
    1. [Discounted Prices](https://github.com/aelassas/bookcars/wiki/Price-Calculation#discounted-prices)
    1. [Date Based Price Rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates)
    1. [Price Change Rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate)
    1. [Calculation Algorithm](https://github.com/aelassas/bookcars/wiki/Price-Calculation#calculation-algorithm)
18. [Supplier Contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
19. [Add New Language](https://github.com/aelassas/bookcars/wiki/Add-New-Language)
20. [Add New Currency](https://github.com/aelassas/bookcars/wiki/Add-New-Currency)
21. [Logs](https://github.com/aelassas/bookcars/wiki/Logs)
22. [Testing](https://github.com/aelassas/bookcars/wiki/Testing)
    1. [Unit Tests and Coverage](https://github.com/aelassas/bookcars/wiki/Unit-Tests-and-Coverage)
    1. [Manual Tests](https://github.com/aelassas/bookcars/wiki/Manual-Tests)
23. [FAQ](https://github.com/aelassas/bookcars/wiki/FAQ)
24. [Release Notes](https://github.com/aelassas/bookcars/blob/main/.github/RELEASES.md)
25. [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md)
26. [Code of Conduct](https://github.com/aelassas/bookcars/blob/main/.github/CODE_OF_CONDUCT.md)

## License

BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
