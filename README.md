[![build](https://github.com/aelassas/bookcars/actions/workflows/build.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/build.yml) [![test](https://github.com/aelassas/bookcars/actions/workflows/test.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/test.yml) [![codecov](https://codecov.io/gh/aelassas/bookcars/graph/badge.svg?token=FSB0H9RDEQ)](https://codecov.io/gh/aelassas/bookcars) [![](https://img.shields.io/badge/docs-wiki-brightgreen)](https://github.com/aelassas/bookcars/wiki) [![](https://img.shields.io/badge/live-demo-brightgreen)](https://bookcars.dynv6.net:3002/) [![](https://raw.githubusercontent.com/aelassas/bookcars/refs/heads/loc/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/loc.yml)

# BookCars

BookCars is a car rental platform, supplier-oriented, with an admin dashboard for managing car fleets and bookings, as well as a frontend and a mobile app for renting cars.

BookCars is built with React for its powerful rendering capabilities, MongoDB for flexible data modeling, and Stripe for secure payment processing.

This project emerged from a desire to build without boundaries – a fully customizable and operational car rental platform where every aspect is within your control:

- **Own the UI/UX**: Design unique customer experiences without fighting against template limitations
- **Control the Backend**: Implement custom business logic and data structures that perfectly match the requirements
- **Master DevOps**: Deploy, scale, and monitor the application with preferred tools and workflows
- **Extend Freely**: Add new features and integrations without platform constraints or additional fees

With this solution, you can deploy your own customizable car rental marketplace at minimal cost using the [Docker-based setup](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)). The platform integrates Stripe for secure payments and can be efficiently hosted on a 1GB RAM droplet, making it an ideal choice for single/multi-supplier operations looking for a scalable and cost-effective solution. You can deploy this solution for under $5/month using cloud providers like [Hetzner](https://www.hetzner.com/cloud/) or [DigitalOcean](https://www.digitalocean.com/pricing/droplets).

BookCars is designed to work with multiple suppliers. Each supplier can manage his car fleet and bookings from the admin dashboard. BookCars can also work with only one supplier and can be used as a car rental aggregator.

From the admin dashboard, admins can create and manage suppliers, cars, locations, customers and bookings.

When new suppliers are created, they receive an email prompting them to create an account in order to access the admin dashboard and manage their car fleet and bookings.

Customers can sign up from the frontend or the mobile app, search for available cars based on pickup and drop-off points and time, choose a car and complete the checkout process.

A key design decision was made to use TypeScript instead of JavaScript due to its numerous advantages. TypeScript offers strong typing, tooling, and integration, resulting in high-quality, scalable, more readable and maintainable code that is easy to debug and test.

I invested significant time and effort into building this open-source project to make it freely available to the community. If this project has been helpful in your work, consider supporting its continued development and maintenance. You can contribute through [GitHub Sponsorship](https://github.com/sponsors/aelassas) (one-time or monthly), [PayPal](https://www.paypal.me/aelassaspp), or [Buy Me a Coffee](https://buymeacoffee.com/aelassas). Even a simple star on the GitHub repository helps spread the word and is greatly appreciated.

# Features

* Supplier management
* [Supplier contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
* Ready for one or multiple suppliers
* Car fleet management
* [Dynamic price calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* Location, country, parking spots and map features
* Booking management
* Payment management
* Customer management
* Multiple login options (Google, Facebook, Apple, Email)
* Multiple payment methods (Credit Card, PayPal, Google Pay, Apple Pay, Link, Pay Later)
* Operational Stripe Payment Gateway
* Multiple language support (English, French, Spanish)
* Multiple pagination options (Classic pagination with next and previous buttons, infinite scroll)
* Responsive admin dashboard and frontend
* Native Mobile app for Android and iOS with single codebase
* Push notifications
* Secure against XSS, XST, CSRF and MITM
* Supported Platforms: iOS, Android, Web, Docker

# Live Demo

Some features are locked down on the demo links provided. To unlock all the features and have a full access to all the features contact me by email and I will give you access to all the features unlocked. You can find my email on my [GitHub](https://github.com/aelassas) profile page.

## Frontend
* URL: https://bookcars.dynv6.net:3002/
* Login: jdoe@bookcars.ma
* Password: B00kC4r5

## Admin Dashboard
* URL: https://bookcars.dynv6.net:3001/
* Login: admin@bookcars.ma
* Password: B00kC4r5

## Mobile App

You can install the Android app on any Android device.

### Scan this code with a device

Open the Camera app and point it at this code. Then tap the notification that appears.

![QR](https://bookcars.github.io/content/qr-code-4.5.png)

### How to install the Mobile App on Android

* On devices running Android 8.0 (API level 26) and higher, you must navigate to the Install unknown apps system settings screen to enable app installations from a particular location (i.e. the web browser you are downloading the app from).

* On devices running Android 7.1.1 (API level 25) and lower, you should enable the Unknown sources system setting, found in Settings > Security on your device.

### Alternative Way

You can also install the Android App by directly downloading the APK and installing it on any Android device.

* [Download APK](https://github.com/aelassas/bookcars/releases/download/v4.5/bookcars-4.5.apk)
* Login: jdoe@bookcars.ma
* Password: B00kC4r5

# Resources

1. [Overview](https://github.com/aelassas/bookcars/wiki/Overview)
2. [Architecture](https://github.com/aelassas/bookcars/wiki/Architecture)
3. [Installing (Self-hosted)](https://github.com/aelassas/bookcars/wiki/Installing-(Self%E2%80%90hosted))
4. [Installing (VPS)](https://github.com/aelassas/bookcars/wiki/Installing-(VPS))
5. [Installing (Docker)](https://github.com/aelassas/bookcars/wiki/Installing-(Docker))
   1. [Docker Image](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#docker-image)
   2. [SSL](https://github.com/aelassas/bookcars/wiki/Installing-(Docker)#ssl)
6. [Setup Stripe](https://github.com/aelassas/bookcars/wiki/Setup-Stripe)
7. [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)
8. [Demo Database](https://github.com/aelassas/bookcars/wiki/Demo-Database)
   1. [Windows, Linux and macOS](https://github.com/aelassas/bookcars/wiki/Demo-Database#windows-linux-and-macos)
   2. [Docker](https://github.com/aelassas/bookcars/wiki/Demo-Database#docker)
9. [Run from Source](https://github.com/aelassas/bookcars/wiki/Run-from-Source)
10. [Run Mobile App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App)
    1. [Prerequisites](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#prerequisites)
    2. [Instructions](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#instructions)
    3. [Push Notifications](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#push-notifications)
11. [Change Currency](https://github.com/aelassas/bookcars/wiki/Change-Currency)
12. [Add New Language](https://github.com/aelassas/bookcars/wiki/Add-New-Language)
13. [Unit Tests and Coverage](https://github.com/aelassas/bookcars/wiki/Unit-Tests-and-Coverage)
14. [Price Calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
15. [Supplier Contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
16. [Logs](https://github.com/aelassas/bookcars/wiki/Logs)

# Why Use BookCars for Your Car Rental Business

BookCars is a versatile, open-source platform tailored for car rental businesses of all sizes. Here's why it’s an excellent choice:

## 1. Comprehensive Functionality

- **Multi-Supplier Support**: Suitable for single or multiple suppliers. Each supplier can manage their fleet, bookings, and pricing independently.
- **Customer Features**: A user-friendly interface for customers to search, book, and manage rentals seamlessly.
- **Payment Integration**: Secure payment options via Stripe, supporting multiple methods like credit cards, PayPal, and Google Pay.

## 2. Advanced Technology Stack

- **Modern Frontend**: Built with React and TypeScript for a scalable and responsive web application.
- **Robust Backend**: Leverages Node.js and MongoDB for efficient and scalable data management.
- **Native Mobile Apps**: React Native provides a unified codebase for both iOS and Android apps, ensuring high performance across platforms.

## 3. Cost-Effectiveness

- **Affordable Hosting**: Runs on lightweight cloud setups, such as a 1GB RAM droplet on platforms like DigitalOcean or Hetzner, costing as little as $5/month.
- **No Licensing Fees**: As an open-source solution, it eliminates recurring licensing costs, making it budget-friendly.

## 4. Customization and Extensibility

- **Control Over UI/UX**: Fully customizable design and backend to align with business branding and operations.
- **Scalable Features**: New functionalities, like GPS tracking or advanced reports, can be integrated with ease.

## 5. Security and Reliability

- **Advanced Protections**: Guards against common web threats such as XSS, CSRF, and MITM attacks.
- **Data Security**: Ensures secure handling of user data and transactions, vital for payment processing.

## 6. Global Usability

- **Multi-Language Support**: Operates globally with built-in support for languages like English, French, and Spanish.
- **Responsive Design**: Optimized for both web and mobile devices, ensuring accessibility across platforms.

## 7. Community and Open-Source Benefits

- **Active Development**: Backed by contributors for ongoing updates and improvements.
- **Transparency**: Full access to source code ensures no hidden fees or licensing traps.

## Conclusion

BookCars is a highly customizable, scalable, and cost-efficient solution for car rental businesses. Its robust feature set and open-source nature make it a sustainable choice for long-term growth in the rental industry.

### Explore More:
Check out the [documentation](https://github.com/aelassas/bookcars/wiki) for setup instructions and further details.

# License
BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
