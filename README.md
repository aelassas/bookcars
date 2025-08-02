[![build](https://github.com/aelassas/bookcars/actions/workflows/build.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/build.yml) [![test](https://github.com/aelassas/bookcars/actions/workflows/test.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/test.yml) [![coveralls](https://coveralls.io/repos/github/aelassas/bookcars/badge.svg?branch=main)](https://coveralls.io/github/aelassas/bookcars?branch=main) [![loc](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml) [![docs](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki) [![live demo](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net:3002/)

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
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md)

https://github.com/user-attachments/assets/01afc5ec-3c0a-47b9-a4e1-3b8888b2a695
-->

[![](https://bookcars.github.io/content/cover-1.png)](https://bookcars.dynv6.net:3002/)

## BookCars

BookCars is an open-source and cross-platform car rental platform with an admin panel for managing fleets and bookings, as well as a frontend and a mobile app for renting cars.

It comes with built-in support for [Stripe](https://stripe.com/global) and [PayPal](https://www.paypal.com/us/webapps/mpp/country-worldwide) payment gateways, allowing you to choose the one best suited for your country or business model. If Stripe isn't available in your region, PayPal serves as a secure and reliable alternative.

BookCars supports both single-supplier and multi-supplier modes. Suppliers can manage their fleets and bookings through a dedicated admin panel. Each new supplier receives an email prompting them to create their account and gain access to the system.

The admin panel allows admins to manage suppliers, cars, countries, locations, parking spots, customers, bookings, and payments.

Customers can register through the web frontend or mobile app, search for available cars based on pickup and drop-off points and time, choose a car and complete the checkout process in a few clicks.

## Quick Links
* [Overview](https://github.com/aelassas/bookcars/wiki/Overview)  
* [Software Architecture](https://github.com/aelassas/bookcars/wiki/Software-Architecture)  
* [Install Guide (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))
* [Install Guide (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))
* [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)  
* [Price Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* [Locations](https://github.com/aelassas/bookcars/wiki/Locations)
* [Auto‐Notification System](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System)  
* [Rental Date and Time Constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints)
* [Supplier Contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)  
* [Social Login Setup Guide](https://github.com/aelassas/bookcars/wiki/Social-Login-Setup)  
* [Payment Gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)
* [Free SSL Setup Guide](https://github.com/aelassas/bookcars/wiki/Free-SSL-Setup-Guide)
* [Run from Source](https://github.com/aelassas/bookcars/wiki/Run-from-Source)
* [Run from Source (Docker)](https://github.com/aelassas/bookcars/wiki/Run-from-Source-(Docker))
* [Run Mobile App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App)
* [Fork, Customize, and Sync](https://github.com/aelassas/bookcars/wiki/Fork,-Customize,-and-Sync)
* [FAQ](https://github.com/aelassas/bookcars/wiki/FAQ)  

## Features

### Supplier & Fleet Management
* Supplier management
* [Supplier contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
* [Supplier search result limit](https://github.com/aelassas/bookcars/wiki/FAQ#how-do-i-limit-the-number-of-cars-for-a-supplier-in-search-results)
* Ready for single or multiple suppliers
* Car fleet management
* [Flexible Time-Based Car Availability](https://github.com/aelassas/bookcars/wiki/FAQ#how-to-automatically-prevent-a-car-from-being-booked-multiple-times-when-its-already-booked)
* [Flexible Rental Date and Time Constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints)
* Booking management
* [Vehicle scheduler](https://bookcars.github.io/content/screenshots/v5.5/backend-scheduler.png?raw=true)
* [Auto-Notification System](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System)

### Pricing & Payments
* [Dynamic price calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation): Hourly, daily, weekly, bi-weekly, and monthly rates
* [Date-based price rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates)
* [Price change rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate)
* Payment management
* [Multiple payment gateways supported](https://github.com/aelassas/bookcars/wiki/Payment-Gateways): Stripe, PayPal
* Multiple payment methods: Credit Card, PayPal, Google Pay, Apple Pay, Link, Pay at the counter, Pay in full, Pay deposit

### Locations & Search
* [Hierarchical locations with country, map, and parking integration](https://github.com/aelassas/bookcars/wiki/Locations)
* Location-based search with nested child location support
* Map display for locations and parking spots

### User Experience
* Customer management
* [Multiple login options](https://github.com/aelassas/bookcars/wiki/Social-Login-Setup): Google, Facebook, Apple, Email
* Multiple language support: English, French, Spanish
* [Multiple currencies support](https://github.com/aelassas/bookcars/wiki/Add-New-Currency)
* Multiple pagination styles: classic (next/previous), infinite scroll
* Push notifications

### Security & Performance
* Secure against XSS, XST, CSRF, MITM, and DDoS attacks
* Responsive admin panel and frontend
* Native mobile app for Android and iOS (single codebase)
* [Docker](https://www.docker.com/) support for easy deployment and a better developer experience
* Error monitoring and performance tracing with [Sentry](https://github.com/aelassas/bookcars/wiki/Setup-Sentry)

### Supported Platforms
* iOS
* Android
* Web
* Docker

## Support & Contributing

If this project helped you, saved you time, or inspired you in any way, please consider supporting its future growth and maintenance. You can show your support by starring the repository (it helps increase visibility and shows your appreciation), sharing the project (recommend it to colleagues, communities, or on social media), or making a donation (if you'd like to financially support the development) via [GitHub Sponsors](https://github.com/sponsors/aelassas) (one-time or monthly), [PayPal](https://www.paypal.me/aelassaspp), or [Buy Me a Coffee](https://www.buymeacoffee.com/aelassas). Open-source software requires time, effort, and resources to maintain—your support helps keep this project alive, up-to-date, and accessible to everyone. Every contribution, big or small, makes a difference and motivates continued work on features, bug fixes, and new ideas.

<!--<a href="https://github.com/sponsors/aelassas"><img src="https://aelassas.github.io/content/github-sponsor-button.png" alt="GitHub" width="210"></a>-->
<a href="https://www.paypal.me/aelassaspp"><img src="https://aelassas.github.io/content/paypal-button-v2.png" alt="PayPal" width="208"></a>
<a href="https://www.buymeacoffee.com/aelassas"><img src="https://aelassas.github.io/content/bmc-button.png" alt="Buy Me A Coffee" width="160"></a>

To contribute code or report issues, please read the [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md) to learn about the process, coding standards, and how to submit pull requests.

If you want to customize BookCars while keeping your fork up to date with the latest changes, check out the [Fork, Customize, and Sync](https://github.com/aelassas/bookcars/wiki/Fork,-Customize,-and-Sync) guide in the Wiki.

## Live Demo
<!--
Some features are locked down on the demo links provided. To have access to all the features contact me by email. You can find it on my [profile page](https://github.com/aelassas) (requires login).
-->
### Frontend

* URL: https://bookcars.dynv6.net:3002/
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

<img alt="" width="120" src="https://bookcars.github.io/content/qr-code-8.0.png">

#### How to install the Mobile App on Android

* On devices running Android 8.0 (API level 26) and higher, you must navigate to the Install unknown apps system settings screen to enable app installations from a particular location (i.e. the web browser you are downloading the app from).

* On devices running Android 7.1.1 (API level 25) and lower, you should enable the Unknown sources system setting, found in Settings > Security on your device.

#### Alternative Way

You can install the Android App by downloading the APK and installing it on any Android device.

* [Download APK](https://github.com/aelassas/bookcars/releases/download/v8.0/bookcars-8.0.apk)
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
## Documentation

<!--
1. [Overview](https://github.com/aelassas/bookcars/wiki/Overview)  
   1. [Frontend](https://github.com/aelassas/bookcars/wiki/Overview#frontend)  
   1. [Admin Panel](https://github.com/aelassas/bookcars/wiki/Overview#admin-panel)  
   1. [Mobile App](https://github.com/aelassas/bookcars/wiki/Overview#mobile-app)  
1. [Why Use BookCars](https://github.com/aelassas/bookcars/wiki/Why-Use-BookCars)  
1. [Advanced Features](https://github.com/aelassas/bookcars/wiki/Advanced-Features)  
-->
1. [Overview](https://github.com/aelassas/bookcars/wiki/Overview)  
1. [Software Architecture](https://github.com/aelassas/bookcars/wiki/Software-Architecture)  
1. [Install Guide (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))  
1. [Install Guide (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))  
   1. [Docker Image](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#docker-image)  
   1. [SSL](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#ssl)  
1. [Free SSL Setup Guide](https://github.com/aelassas/bookcars/wiki/Free-SSL-Setup-Guide)
1. [Setup Sentry](https://github.com/aelassas/bookcars/wiki/Setup-Sentry)  
1. [Rental Date and Time Constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints)  
1. [Payment Gateways](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)  
1. [Setup Stripe](https://github.com/aelassas/bookcars/wiki/Setup-Stripe)  
1. [Social Login Setup Guide](https://github.com/aelassas/bookcars/wiki/Social-Login-Setup)  
1. [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)  
1. [Demo Database](https://github.com/aelassas/bookcars/wiki/Demo-Database)  
   1. [Windows, Linux and macOS](https://github.com/aelassas/bookcars/wiki/Demo-Database#windows-linux-and-macos)  
   1. [Docker](https://github.com/aelassas/bookcars/wiki/Demo-Database#docker)  
1. [Run from Source](https://github.com/aelassas/bookcars/wiki/Run-from-Source)  
1. [Run from Source (Docker)](https://github.com/aelassas/bookcars/wiki/Run-from-Source-(Docker))  
1. [Run Mobile App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App)  
   1. [Prerequisites](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#prerequisites)  
   1. [Instructions](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#instructions)  
   1. [Push Notifications](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#push-notifications)  
   1. [Run iOS App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#run-ios-app)  
1. [Fork, Customize, and Sync](https://github.com/aelassas/bookcars/wiki/Fork,-Customize,-and-Sync)
1. [Locations](https://github.com/aelassas/bookcars/wiki/Locations)  
1. [Auto‐Notification System](https://github.com/aelassas/bookcars/wiki/Auto%E2%80%90Notification-System)  
1. [Price Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)  
   1. [Pricing Fields](https://github.com/aelassas/bookcars/wiki/Price-Calculation#pricing-fields)  
   1. [Discounted Prices](https://github.com/aelassas/bookcars/wiki/Price-Calculation#discounted-prices)  
   1. [Date-Based Price Rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates)  
      1. [How to Set](https://github.com/aelassas/bookcars/wiki/Price-Calculation#how-to-set)  
      1. [Behavior](https://github.com/aelassas/bookcars/wiki/Price-Calculation#behavior)  
   1. [Price Change Rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate)  
   1. [Calculation Algorithm](https://github.com/aelassas/bookcars/wiki/Price-Calculation#calculation-algorithm)  
      1. [Date-Based Price Rates Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates-calculation)  
      1. [Default Pricing Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation#default-pricing-calculation)  
         1. [Basic Rules](https://github.com/aelassas/bookcars/wiki/Price-Calculation#basic-rules)  
         1. [Examples](https://github.com/aelassas/bookcars/wiki/Price-Calculation#examples)  
            1. [Example 1: 10 Hours](https://github.com/aelassas/bookcars/wiki/Price-Calculation#example-1-rental-for-10-hours)  
            1. [Example 2: 36 Hours](https://github.com/aelassas/bookcars/wiki/Price-Calculation#example-2-rental-for-36-hours-1-day-and-12-hours)  
            1. [Example 3: 10 Days](https://github.com/aelassas/bookcars/wiki/Price-Calculation#example-3-rental-for-10-days)  
            1. [Example 4: 42 Days](https://github.com/aelassas/bookcars/wiki/Price-Calculation#example-4-rental-for-42-days)  
      1. [Function Reference](https://github.com/aelassas/bookcars/wiki/Price-Calculation#function-reference)  
1. [Supplier Contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)  
1. [Add New Language](https://github.com/aelassas/bookcars/wiki/Add-New-Language)  
1. [Add New Currency](https://github.com/aelassas/bookcars/wiki/Add-New-Currency)  
1. [Logs](https://github.com/aelassas/bookcars/wiki/Logs)  
1. [Testing](https://github.com/aelassas/bookcars/wiki/Testing)  
   1. [Integration Tests and Coverage](https://github.com/aelassas/bookcars/wiki/Integration-Tests-and-Coverage)  
   1. [Manual Tests](https://github.com/aelassas/bookcars/wiki/Manual-Tests)  
1. [FAQ](https://github.com/aelassas/bookcars/wiki/FAQ)  
1. [Release Notes](https://github.com/aelassas/bookcars/blob/main/.github/RELEASES.md)  
1. [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md)  
1. [Code of Conduct](https://github.com/aelassas/bookcars/blob/main/.github/CODE_OF_CONDUCT.md)

## License

BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
