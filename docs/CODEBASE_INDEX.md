# BookCars Codebase Index & Explanation

## Overview

**BookCars** is a comprehensive, open-source, cross-platform car rental booking system built with modern web technologies. It supports multiple deployment modes (single-supplier and multi-supplier) and includes payment gateway integrations (Stripe and PayPal).

**Version:** 8.3.0  
**License:** MIT  
**Architecture:** Monorepo with separate frontend, backend, admin, and mobile applications

---

## Project Structure

```
bookcars/
├── backend/          # Node.js/Express/TypeScript REST API
├── frontend/         # React/TypeScript customer-facing web app
├── admin/            # React/TypeScript admin panel
├── mobile/           # React Native mobile app (iOS & Android)
├── packages/         # Shared TypeScript packages
├── __config/         # Nginx configuration
├── __scripts/        # Deployment and utility scripts
├── __services/       # Systemd service files
└── docker-compose.yml # Docker orchestration
```

---

## 1. Backend (`/backend`)

### Technology Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js 5.x
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) using `jose` library
- **Security:** Helmet, CORS, cookie-parser, bcrypt
- **Payment:** Stripe SDK, PayPal integration
- **Monitoring:** Sentry for error tracking
- **Testing:** Jest with Supertest

### Architecture

#### Entry Point
- **`src/index.ts`**: Server initialization, database connection, HTTP/HTTPS server creation, graceful shutdown handling
- **`src/app.ts`**: Express app configuration, middleware setup, route registration

#### Core Components

**Models (`src/models/`):**
- `User.ts` - User accounts (Admin, Supplier, Customer)
- `Car.ts` - Vehicle fleet management with pricing, availability, specifications
- `Booking.ts` - Rental bookings with status tracking
- `Location.ts` - Hierarchical location system (country → location → parking spots)
- `Country.ts` - Country management
- `Notification.ts` - User notifications
- `Setting.ts` - System-wide settings
- `BankDetails.ts` - Supplier banking information
- `DateBasedPrice.ts` - Dynamic date-based pricing
- `AdditionalDriver.ts` - Additional driver information
- `Token.ts` - Authentication tokens
- `PushToken.ts` - Mobile push notification tokens

**Controllers (`src/controllers/`):**
- Business logic for each domain entity
- Handles request/response processing
- Interacts with models and utilities

**Routes (`src/routes/`):**
- RESTful API endpoints
- Route configuration and middleware application
- Maps HTTP methods to controller functions

**Middlewares (`src/middlewares/`):**
- `authJwt.ts` - JWT authentication verification
- `cors.ts` - Cross-origin resource sharing configuration
- `allowedMethods.ts` - HTTP method validation

**Utilities (`src/utils/`):**
- `authHelper.ts` - Authentication utilities
- `databaseHelper.ts` - MongoDB connection and initialization
- `helper.ts` - General utility functions
- `mailHelper.ts` - Email sending (Nodemailer)
- `logger.ts` - Winston logging
- `ipinfoHelper.ts` - IP geolocation

**Payment (`src/payment/`):**
- `stripe.ts` - Stripe payment processing
- `paypal.ts` - PayPal payment integration

**Setup (`src/setup/`):**
- `setup.ts` - Initial database setup
- `reset.ts` - Database reset utility

**Configuration (`src/config/`):**
- `env.config.ts` - Environment variables and configuration
- Route-specific config files for each domain

### Key Features
- RESTful API design
- JWT-based authentication
- Role-based access control (Admin, Supplier, User)
- File upload handling (Multer)
- CDN integration for static assets
- Multi-language support (i18n)
- Automatic TTL indexes for temporary data cleanup
- Comprehensive error handling and logging

---

## 2. Frontend (`/frontend`)

### Technology Stack
- **Framework:** React 19.x with TypeScript
- **Build Tool:** Vite 7.x
- **UI Library:** Material-UI (MUI) 7.x
- **Routing:** React Router DOM 7.x
- **Forms:** React Hook Form with Zod validation
- **Maps:** Leaflet with React Leaflet
- **Payments:** Stripe React SDK, PayPal React SDK
- **State Management:** React Context API
- **Styling:** Emotion (CSS-in-JS), CSS modules

### Architecture

#### Entry Point
- **`src/main.tsx`**: Application bootstrap
- **`src/App.tsx`**: Root component with routing configuration

#### Core Components

**Pages (`src/pages/`):**
- `Home.tsx` - Landing page with search
- `Search.tsx` - Car search results
- `Checkout.tsx` - Booking checkout process
- `Bookings.tsx` - User booking list
- `Booking.tsx` - Individual booking details
- `SignIn.tsx` / `SignUp.tsx` - Authentication
- `Settings.tsx` - User settings
- `Locations.tsx` - Location browsing
- `Suppliers.tsx` - Supplier listing
- Legal pages (ToS, Privacy, Cookie Policy, About, Contact, FAQ)

**Components (`src/components/`):**
- Reusable UI components (Header, Footer, Car, BookingList, etc.)
- Form components (DatePicker, PasswordInput, etc.)
- Filter components (CarFilter, BookingFilter, etc.)
- Map components (Map, MapDialog, ViewOnMapButton)
- Payment components (CheckoutOptions, CheckoutStatus)

**Context (`src/context/`):**
- `UserContext.tsx` - User authentication state
- `NotificationContext.tsx` - Notification management
- `SettingContext.tsx` - Application settings
- `PayPalContext.tsx` - PayPal integration
- `RecaptchaContext.tsx` - reCAPTCHA integration
- `FallbackContext.tsx` - Error boundary fallback

**Services (`src/services/`):**
- API service layer (axios-based)
- `UserService.ts`, `CarService.ts`, `BookingService.ts`, etc.
- `StripeService.ts`, `PayPalService.ts` - Payment services

**Models (`src/models/`):**
- Form validation schemas (Zod)
- Type definitions for forms

**Utils (`src/utils/`):**
- `helper.ts` - Utility functions
- `langHelper.ts` - Language utilities
- `ga4.ts` - Google Analytics integration
- `customHooks.ts` - Custom React hooks

**Language (`src/lang/`):**
- Multi-language support (English, French, Spanish)
- Localized strings for all pages and components

### Key Features
- Responsive design (mobile-first)
- Lazy loading for code splitting
- Progressive Web App capabilities
- Social login (Google, Facebook, Apple)
- Real-time search with filters
- Interactive maps for locations
- Multiple payment methods
- Infinite scroll pagination option
- SEO optimization

---

## 3. Admin Panel (`/admin`)

### Technology Stack
- **Framework:** React 19.x with TypeScript
- **Build Tool:** Vite 7.x
- **UI Library:** Material-UI (MUI) 7.x
- **Routing:** React Router DOM 7.x
- **Forms:** React Hook Form with Zod validation
- **Scheduler:** Custom vehicle scheduler component
- **State Management:** React Context API

### Architecture

Similar structure to frontend but focused on administrative tasks:

**Pages (`src/pages/`):**
- `Suppliers.tsx` - Supplier management
- `Cars.tsx` - Fleet management
- `Bookings.tsx` - Booking management
- `Users.tsx` - User management
- `Locations.tsx` - Location management
- `Countries.tsx` - Country management
- `Scheduler.tsx` - Vehicle availability scheduler
- `Settings.tsx` - System settings
- `BankDetails.tsx` - Supplier banking details
- `Pricing.tsx` - Pricing management

**Components (`src/components/`):**
- Admin-specific components
- `VehicleScheduler.tsx` - Visual booking scheduler
- `BankDetailsForm.tsx` - Banking information form
- `ContractList.tsx` - Supplier contract management
- Various list and filter components

### Key Features
- Comprehensive CRUD operations
- Vehicle availability scheduler with calendar view
- Supplier contract management
- Date-based pricing management
- Booking management and status updates
- User role management
- System configuration
- Multi-supplier support

---

## 4. Mobile App (`/mobile`)

### Technology Stack
- **Framework:** React Native with Expo
- **Navigation:** React Navigation 7.x
- **UI Library:** React Native Paper
- **Payments:** Stripe React Native SDK
- **Notifications:** Expo Notifications
- **Location:** Expo Location
- **State Management:** React Context API

### Architecture

**Entry Point:**
- **`App.tsx`**: Root component with navigation setup, push notification handling

**Screens (`screens/`):**
- `HomeScreen.tsx` - Main search interface
- `SearchScreen.tsx` - Car search results
- `BookingScreen.tsx` - Booking details
- `BookingsScreen.tsx` - User bookings list
- `CheckoutScreen.tsx` - Payment checkout
- `SignInScreen.tsx` / `SignUpScreen.tsx` - Authentication
- `SettingsScreen.tsx` - User settings
- `NotificationsScreen.tsx` - Push notifications

**Components (`components/`):**
- Reusable mobile UI components
- Custom form inputs
- Car display components

**Context (`context/`):**
- `AuthContext.tsx` - Authentication state
- `GlobalContext.tsx` - Global app state
- `SettingContext.tsx` - App settings

**Services (`services/`):**
- API service layer (similar to frontend)
- `NotificationService.ts` - Push notification handling

**Utils (`utils/`):**
- `AsyncStorage.ts` - Local storage wrapper
- `axiosHelper.ts` - HTTP client configuration
- `helper.ts` - Utility functions
- `toastHelper.ts` - Toast notifications

### Key Features
- Native iOS and Android support
- Push notifications
- Offline capability with AsyncStorage
- Location services integration
- Stripe mobile payments
- Social authentication
- Responsive mobile UI

---

## 5. Shared Packages (`/packages`)

### `bookcars-types`
- Shared TypeScript type definitions
- Used across all applications for type consistency

### `bookcars-helper`
- Shared utility functions
- Common business logic

### `currency-converter`
- Currency conversion utilities
- Exchange rate handling

### `reactjs-social-login`
- Social authentication components
- Supports: Google, Facebook, Apple, Amazon, GitHub, etc.

### `disable-react-devtools`
- Development tool for disabling React DevTools in production

---

## 6. Infrastructure & DevOps

### Docker
- **`docker-compose.yml`**: Production Docker setup
- **`docker-compose.dev.yml`**: Development Docker setup
- Separate Dockerfiles for each service (backend, frontend, admin)
- MongoDB and Mongo Express containers

### Scripts (`__scripts/`)
- `bc-deploy.sh` - Main deployment script
- `bc-deploy-backend.sh` - Backend deployment
- `bc-deploy-frontend.sh` - Frontend deployment
- `bc-deploy-admin.sh` - Admin deployment
- `bc-logs.sh` - Log viewing utility
- Utility scripts for memory management, version bumping

### Configuration (`__config/`)
- `nginx.conf` - Nginx reverse proxy configuration

### Services (`__services/`)
- `bookcars.service` - Systemd service file

---

## 7. Database Schema

### Core Collections

**User:**
- Types: Admin, Supplier, User (Customer)
- Fields: email, password (hashed), fullName, phone, type, verified, active
- Supplier-specific: contracts, licenseRequired, supplierCarLimit
- Indexes: email (unique), type, expireAt (TTL)

**Car:**
- Fields: name, supplier, locations, pricing (hourly/daily/weekly/monthly)
- Specifications: type, gearbox, seats, doors, fuelPolicy, mileage
- Insurance options: cancellation, amendments, theftProtection, etc.
- Availability: available, fullyBooked, comingSoon
- Indexes: supplier, available, locations, text search on name

**Booking:**
- Fields: supplier, car, driver, pickupLocation, dropOffLocation, from, to
- Status: Void, Pending, Deposit, Paid, PaidInFull, Reserved, Cancelled
- Payment: price, sessionId, paymentIntentId, paypalOrderId
- Insurance selections: cancellation, amendments, theftProtection, etc.
- Indexes: supplier, driver, car, date ranges, expireAt (TTL)

**Location:**
- Hierarchical structure with parent-child relationships
- Parking spots with coordinates
- Map integration

**Country:**
- Country information and settings

**Notification:**
- User notifications with read/unread status
- Push notification support

---

## 8. Security Features

- **Helmet.js**: Security headers (XSS, CSRF, MITM protection)
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **CORS**: Configurable cross-origin policies
- **Input Validation**: Validator.js and Zod schemas
- **Rate Limiting**: Protection against DDoS
- **HTTPS Support**: SSL/TLS encryption
- **Cookie Security**: Secure, httpOnly cookies

---

## 9. Payment Integration

### Stripe
- Checkout sessions
- Payment intents
- Customer management
- Webhook handling
- Mobile SDK support

### PayPal
- Order creation and capture
- Webhook handling
- Mobile integration

### Payment Methods Supported
- Credit/Debit Cards
- PayPal
- Google Pay
- Apple Pay
- Link (Stripe)
- Pay at counter
- Pay in full / Pay deposit

---

## 10. Internationalization

- **Languages:** English, French, Spanish
- **Backend:** i18n-js library
- **Frontend/Admin:** localized-strings
- **Mobile:** i18n-js with Expo Localization
- Language detection and switching
- Currency conversion support

---

## 11. Testing

- **Backend:** Jest with Supertest
- Test coverage for controllers, models, utilities
- Integration tests for API endpoints
- Test helpers and fixtures
- Coverage reporting (Codecov)

---

## 12. Monitoring & Logging

- **Sentry:** Error tracking and performance monitoring
- **Winston:** Structured logging
- **Log Files:** Rotating log files in `/logs`
- **Health Checks:** Server health monitoring

---

## 13. Development Workflow

### Setup
1. Install dependencies: `npm install` in each directory
2. Configure environment variables (`.env` files)
3. Setup database: `npm run setup` in backend
4. Start development servers

### Scripts
- **Backend:** `npm run dev` (nodemon), `npm run build`, `npm run test`
- **Frontend/Admin:** `npm run dev` (Vite), `npm run build`
- **Mobile:** `npm start` (Expo), `npm run android/ios`

### Linting
- ESLint configuration across all projects
- Pre-commit hooks for code quality
- Stylelint for CSS

---

## 14. Deployment

### Docker Deployment
- Multi-container setup with docker-compose
- Nginx reverse proxy
- Volume management for CDN and logs
- Environment-based configuration

### Manual Deployment
- Build scripts for each service
- Deployment scripts in `__scripts/`
- Systemd service integration
- Nginx configuration

---

## 15. Key Business Logic

### Pricing
- Dynamic pricing: hourly, daily, weekly, bi-weekly, monthly
- Date-based pricing for special periods
- Discounted prices
- Price change rate for suppliers
- Deposit calculation

### Booking Flow
1. Search cars by location and dates
2. Filter by specifications
3. Select car and extras
4. Checkout with payment
5. Booking confirmation
6. Status tracking

### Availability Management
- Time-based availability blocks
- Vehicle scheduler for visual management
- Automatic conflict detection
- Fully booked status tracking

### Supplier Management
- Multi-supplier support
- Supplier contracts (multi-language)
- Car limit per supplier
- Supplier-specific pricing rules
- Admin approval workflow

---

## 16. API Endpoints Overview

### Authentication
- `POST /api/sign-in` - User login
- `POST /api/sign-up` - User registration
- `POST /api/activate` - Account activation
- `POST /api/forgot-password` - Password reset request

### Cars
- `GET /api/cars` - List/search cars
- `GET /api/cars/:id` - Get car details
- `POST /api/cars` - Create car (admin/supplier)
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car

### Bookings
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Payments
- `POST /api/stripe/checkout` - Create Stripe checkout session
- `POST /api/stripe/webhook` - Stripe webhook handler
- `POST /api/paypal/create-order` - Create PayPal order
- `POST /api/paypal/capture-order` - Capture PayPal payment

### Locations
- `GET /api/locations` - List locations
- `GET /api/locations/:id` - Get location details

### Users
- `GET /api/users` - List users (admin)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier (admin)

---

## 17. Environment Variables

Key environment variables (configured in `.env` files):

**Backend:**
- `DB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `COOKIE_SECRET` - Cookie encryption secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` - PayPal credentials
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` - Email configuration
- `SENTRY_DSN` - Sentry error tracking
- `CDN_ROOT` - CDN directory path

**Frontend/Admin:**
- `VITE_API_URL` - Backend API URL
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `VITE_PAYPAL_CLIENT_ID` - PayPal client ID

**Mobile:**
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key

---

## 18. File Structure Summary

```
bookcars/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express app setup
│   │   ├── index.ts               # Server entry point
│   │   ├── config/                # Configuration files
│   │   ├── controllers/           # Business logic
│   │   ├── models/                # Mongoose schemas
│   │   ├── routes/                # API routes
│   │   ├── middlewares/           # Express middlewares
│   │   ├── utils/                 # Utility functions
│   │   ├── payment/               # Payment integrations
│   │   ├── setup/                 # Database setup
│   │   └── lang/                  # Translations
│   ├── __tests__/                 # Test files
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Root component
│   │   ├── main.tsx               # Entry point
│   │   ├── pages/                 # Page components
│   │   ├── components/            # Reusable components
│   │   ├── context/               # React contexts
│   │   ├── services/              # API services
│   │   ├── models/                # Form models
│   │   ├── utils/                 # Utilities
│   │   └── lang/                  # Translations
│   └── package.json
│
├── admin/
│   └── [Similar structure to frontend]
│
├── mobile/
│   ├── App.tsx                    # Root component
│   ├── screens/                   # Screen components
│   ├── components/                # Reusable components
│   ├── context/                   # React contexts
│   ├── services/                  # API services
│   └── package.json
│
└── packages/                      # Shared packages
```

---

## 19. Technology Versions

- **Node.js:** Latest LTS
- **TypeScript:** 5.9.x
- **React:** 19.x
- **React Native:** 0.81.x
- **Express:** 5.1.x
- **MongoDB:** Latest (via Docker)
- **Mongoose:** 8.19.x
- **Material-UI:** 7.3.x
- **Vite:** 7.1.x
- **Expo:** 54.x

---

## 20. Best Practices Implemented

- **Separation of Concerns:** Clear separation between layers
- **Type Safety:** TypeScript throughout
- **Code Reusability:** Shared packages and components
- **Security First:** Multiple security layers
- **Error Handling:** Comprehensive error handling
- **Logging:** Structured logging
- **Testing:** Unit and integration tests
- **Documentation:** Code comments and type definitions
- **Performance:** Lazy loading, code splitting, indexing
- **Scalability:** Modular architecture, Docker support

---

## Conclusion

BookCars is a well-architected, production-ready car rental platform with:
- **4 applications** (Backend API, Frontend Web, Admin Panel, Mobile App)
- **Modern tech stack** (React, TypeScript, Node.js, MongoDB)
- **Comprehensive features** (Multi-supplier, payments, notifications, scheduling)
- **Production-ready** (Docker, monitoring, testing, security)
- **Developer-friendly** (TypeScript, ESLint, clear structure)

The codebase follows modern best practices and is designed for scalability and maintainability.

