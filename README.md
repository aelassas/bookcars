[![](https://bookcars.github.io/content/cover-small.jpg)](https://bookcars.github.io)

|**Supported Platforms**| ![](https://img.shields.io/badge/iOS-4630EB.svg?logo=APPLE&labelColor=999999&logoColor=fff) ![](https://img.shields.io/badge/Android-4630EB.svg?&logo=ANDROID&labelColor=A4C639&logoColor=fff) ![](https://img.shields.io/badge/web-4630EB.svg?logo=GOOGLE-CHROME&labelColor=4285F4&logoColor=fff) |
| --------------------- | ----------- |
| **CodeFactor**        | [![CodeFactor](https://www.codefactor.io/repository/github/aelassas/bookcars/badge)](https://www.codefactor.io/repository/github/aelassas/bookcars) |
| **API**               | [![API CI](https://github.com/aelassas/bookcars/actions/workflows/api.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/api.yml) |
| **Backend**           | [![Backend CI](https://github.com/aelassas/bookcars/actions/workflows/backend.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/backend.yml) |
| **Frontend**          | [![Frontend CI](https://github.com/aelassas/bookcars/actions/workflows/frontend.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/frontend.yml) |
| **Mobile App**        | [![Mobile CI](https://github.com/aelassas/bookcars/actions/workflows/mobile.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/mobile.yml) |

BookCars is an open source car rental platform, supplier-oriented, with a backend for managing car fleets and bookings, as well as a frontend and a mobile app for renting cars.

BookCars is user-friendly, straightforward, secure against XSS, XST, CSRF and MITM, and subtly crafted.

BookCars is designed to work with multiple suppliers. Each supplier can manage his car fleet and bookings from the backend. BookCars can also work with only one supplier as well.

From the backend, admins can create and manage suppliers, cars, locations, customers and bookings.

When new suppliers are created, they will receive an email prompting them to create an account in order to access the backend and manage their car fleet and bookings.

Customers can sign up from the frontend or the mobile app, search for available cars based on pickup and drop-off points and time, choose a car and complete the checkout process.

A key design decision was made to use TypeScript instead of JavaScript due to its numerous advantages. TypeScript offers strong typing, tooling, and integration, resulting in high-quality, scalable, more readable and maintainable code that is easy to debug and test.

<img src="https://bookcars.github.io/content/docker.png" alt="" width="220" />

BookCars can run in a Docker container. Follow this step by step [guide](https://github.com/aelassas/bookcars/wiki/Docker) to walk you through on how to build BookCars Docker image and run it in a Docker container.

## Features

* Supplier management
* Ready for one or multiple suppliers
* Car fleet management
* Booking management
* Customer management
* Multiple payment methods (Credit Card, Pay Later)
* Multiple language support (English, French)
* Multiple pagination options (Classic pagination with next and previous buttons, infinite scroll)
* Responsive backend and frontend
* Native Mobile app for Android and iOS with single codebase
* Push notifications
* Secure against XSS, XST, CSRF and MITM

## Contents

1. [Overview](https://github.com/aelassas/bookcars/wiki/Overview)
2. [Architecture](https://github.com/aelassas/bookcars/wiki/Architecture)
3. [Installing](https://github.com/aelassas/bookcars/wiki/Installing)
4. [Docker](https://github.com/aelassas/bookcars/wiki/Docker)
   1. [Docker Image](https://github.com/aelassas/bookcars/wiki/Docker#docker-image)
   2. [SSL](https://github.com/aelassas/bookcars/wiki/Docker#ssl)
5. [Build Mobile App](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App)
6. [Demo Database](https://github.com/aelassas/bookcars/wiki/Demo-Database)
   1. [Windows, Linux and macOS](https://github.com/aelassas/bookcars/wiki/Demo-Database#windows-linux-and-macos)
   2. [Docker](https://github.com/aelassas/bookcars/wiki/Demo-Database#docker)
8. [Run from Source](https://github.com/aelassas/bookcars/wiki/Run-from-Source)
9. [Run Mobile App](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App)
10. [Change Currency](https://github.com/aelassas/bookcars/wiki/Change-Currency)
11. [Add New Language](https://github.com/aelassas/bookcars/wiki/Add-New-Language)

### License

BookCars is [MIT licensed](https://github.com/aelassas/bookcars/blob/main/LICENSE).
