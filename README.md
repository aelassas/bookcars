[![Backend CI](https://github.com/aelassas/bookcars/actions/workflows/backend.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/aelassas/bookcars/actions/workflows/frontend.yml/badge.svg)](https://github.com/aelassas/bookcars/actions/workflows/frontend.yml)

<p align="center">
  <img src="https://bookcars.github.io/content/bookcars.drawio.png" alt="" width="500" />
</p>

BookCars is an open source car rental platform, supplier oriented, with a backend for managing car fleet and bookings, a frontend and a mobile app for car rental.

No more endless forms filling and redirecting. BookCars frontend and mobile app are straightforward, easy to use and secure. Book your car quickly and stay informed about your booking with push notifications.

# Features

* Car fleet management
* Supplier management
* Booking management
* Client management
* Multiple payment methods
* Multiple language support
* Responsive backend and frontend
* Native Mobile app for Android and iOS

# Download

You can download the latest release from [here](https://github.com/aelassas/bookcars/releases/latest).

# Install

You can find installation instructions [here](https://github.com/aelassas/bookcars/wiki/Installation).

# Build Mobile App

You can find instructions [here](https://github.com/aelassas/bookcars/wiki/Build-Mobile-App).

# Run from Code

You can find instructions in the [wiki](https://github.com/aelassas/bookcars/wiki/Run-from-code) to run BookCars from code.

# Documentation

You can find documentation [here](https://github.com/aelassas/bookcars/wiki).

# Overview

In this section, you'll see the main pages of the frontend, the backend and the mobile app.

## Frontend

From the frontend, the user can search for available cars, choose a car and checkout.

Below is the main page of the frontend where the user can choose a pickup and drop-off locations, dates and time booking, and search for available cars.

![Frontend](screenshots/frontend-1.png)

Below is the search result of the main page where the user can choose a car for rental.

![Frontend](screenshots/frontend-2.png)

Below is the checkout page where the user can set rental options and checkout. If the user is not registered, he can checkout and register at the same time. He will receive a confirmation and activation email to set his password if he is not registered yet.

![Frontend](screenshots/frontend-3.png)

Below is the sign up page.

![Frontend](screenshots/frontend-4.png)

Below is the sign in page.

![Frontend](screenshots/frontend-5.png)

Below is page where the user can see and manage his bookings.

![Frontend](screenshots/frontend-6.png)

Below is the page where the user can see a booking in detail.

![Frontend](screenshots/frontend-7.png)

That's it. That's the main pages of the frontend.

## Mobile App

<div>
  <p>
From the mobile app, the user can search for available cars, choose a car and checkout.

The user can also receive push notifications, if the status of his booking is updated.

Below is the main page of the mobile app where the user can choose pickup and drop-off locations, dates and time booking, and search for available cars.
  </p>
  <img src="screenshots/mobileapp-1.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-2.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-3.jpg" alt="" width="200" style="float: left; margin: 5px"/>
    <p> 
  Below is the search result of the main page where user can choose a car for rental and checkout pages.
  </p>
  <img src="screenshots/mobileapp-4.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-5.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-6.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-7.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <p>
  Below are sign up and sign in pages.
  </p>
  <img src="screenshots/mobileapp-8.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-9.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-10.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <p> 
  Below are the pages where the user can see and manage his bookings.
  </p>
  <img src="screenshots/mobileapp-11.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-12.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-13.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-14.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-15.jpg" alt="" width="200" style="float: left; margin: 5px"/>
    <p> 
  Below are the pages where the user can update his profile information, change his password and see his notifications.
  </p>
  <img src="screenshots/mobileapp-16.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-17.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-18.jpg" alt="" width="200" style="float: left; margin: 5px"/>
  <img src="screenshots/mobileapp-19.jpg" alt="" width="200" style="float: left; margin: 5px"/>
</div>

That's it for the main pages of the mobile app.

## Backend
BookCars is supplier oriented. This means that there are three types of users:

* Admin: He has full access to backend. He can do everything.
* Supplier: He has restricted access to backend. He can only manage his cars and bookings.
* User: He has only access to frontend and mobile app. He cannot access the backend.

BookCars is designed to work with multiple suppliers. Each supplier can manage his car fleet and bookings from the backend. BookCars can also work with only one supplier too.

From the backend, the admin user can create and manage suppliers, cars, locations, users and bookings.

When the admin user creates a new supplier, the supplier will receive an automatic email for creating his account to access the backend so he can manage his car fleet and bookings.

Below is the sign in page of the backend.

![Backend](screenshots/backend-1.png)

Below is the dashboard page of the backend where admins and suppliers can see and manage bookings.

![Backend](screenshots/backend-2.png)

Below is the page where to edit bookings.

![Backend](screenshots/backend-3.png)

Below is the page where car fleet is displayed and can be managed.

![Backend](screenshots/backend-4.png)

Below is the page where admins and suppliers can create new cars by providing an image and car info. 

![Backend](screenshots/backend-5.png)

Below is the page where admins and suppliers can edit cars.

![Backend](screenshots/backend-6.png)

Below is the page where admins can manage platform users.

![Backend](screenshots/backend-7.png)

That's it. That's the main pages of the backend.

# Architecture

This section describes the software architecture of BookCars including the API, the frontend, the mobile app and the backend.

BookCars API is built with Node.js, Express and MongoDB.

BookCars backend and frontend are built with Node.js, React and MUI.

BookCars mobile app is built with React Native and Expo.

## API

<p align="center">
  <img src="https://bookcars.github.io/content/bookcars-architecture.drawio.png" alt="" width="500" />
</p>

BookCars API exposes all BookCars functions needed for the backend, the frontend and the mobile app. The API follows the MVC design pattern. JWT is used for authentication. There are some functions that need authentication and others that does not need authentication.

* *./api/models/* folder contains MongoDB models.
* *./api/routes/* folder contains Express routes.
* *./api/controllers/* folder contains controllers.
* *./api/middlewares/* folder contains middlewares.
* *./api/server.js* is the main server where database connection is established and routes are loaded.
* *./api/app.js* is the main entry point of BookCars API.

## Frontend

The frontend is a web application built with Node.js, ReactJS and MUI. From the frontend the user can search for available cars depending on pickup and drop-off locations, dates and time booking. He can then select his booking options and finally checkout.

* *./frontend/assets/* folder contains CSS and images.
* *./frontend/components/* folder contains ReactJS pages.
* *./frontend/elements/* folder contains ReactJS components.
* *./frontend/services/* contains BookCars API client services.
* *./frontend/App.js* is the main ReactJS App that contains routes.
* *./frontend/index.js* is the main entry point of the frontend.

## Mobile App

BookCars provides a native mobile app for Android and iOS. The mobile app is built with React Native and Expo. Like for the frontend, the mobile app allows the user to search for available cars depending on pickup and drop-off locations, dates and time booking. He can then select his booking options and finally checkout.

The user receives push notifications when his bookings are updated. Push notifications are built with Node.js, Expo Server SDK and Firebase.

* *./mobile/assets/* folder contains images.
* *./mobile/screens/* folder contains main pages.
* *./mobile/elements/* folder contains React Native components.
* *./mobile/services/* contains BookCars API client services.
* *./mobile/App.js* is the main React Native App.
* *./mobile/index.js* is the main entry point of the mobile app.

## Backend

The backend is a web application built with Node.js, ReactJS and MUI. From the backend, the admin user can create and manage suppliers, cars, locations, users and bookings. When the admin user creates a new supplier, the supplier will receive an automatic email for creating his account to access the backend so he can manage his car fleet and bookings.

* *./backend/assets/* folder contains CSS and images.
* *./backend/components/* folder contains ReactJS pages.
* *./backend/elements/* folder contains ReactJS components.
* *./backend/services/* contains BookCars API client services.
* *./backend/App.js* is the main ReactJS App that contains routes.
* *./backend/index.js* is the main entry point of the backend.
