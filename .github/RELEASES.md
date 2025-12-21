# Releases

## [BookCars 8.3](https://github.com/aelassas/bookcars/releases/tag/v8.3) – 2025-12-21

* chore(backend): migrate to `mongoose` 9.0.2
* chore(deps): update dependencies

### Assets
- [bookcars-8.3.apk](https://github.com/aelassas/bookcars/releases/download/v8.3/bookcars-8.3.apk) (99.41 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v8.3/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v8.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v8.3)

## [BookCars 8.2](https://github.com/aelassas/bookcars/releases/tag/v8.2) – 2025-11-01

* feat(admin,frontend,mobile): add "pay in full" (deposit included) checkout option (#91)
* feat(admin): add license plate optional property to cars
* feat(admin,frontend,mobile): show deposit in car info cards
* fix(frontend): date pickers not set after page reload in homepage
* fix(frontend): spanish localization issues in checkout page
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v8.1...v8.2

### Assets
- [bookcars-8.2.apk](https://github.com/aelassas/bookcars/releases/download/v8.2/bookcars-8.2.apk) (99.40 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v8.2/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v8.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v8.2)

## [BookCars 8.1](https://github.com/aelassas/bookcars/releases/tag/v8.1) – 2025-10-26

* chore(mobile): upgrade to expo 54
* chore(deps): update dependencies
* fix(admin): select all checkbox not working in booking list and user list
* fix(mobile): prevent search component from hiding on startup
* fix(mobile): update dependencies to resolve expo doctor warnings
* fix(mobile): status bar background color and text color not applied on android
* fix(mobile): drawer navigator bottom inset for devices with home indicator

### Assets
- [bookcars-8.1.apk](https://github.com/aelassas/bookcars/releases/download/v8.1/bookcars-8.1.apk) (99.41 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v8.1/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v8.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v8.1)

## [BookCars 8.0](https://github.com/aelassas/bookcars/releases/tag/v8.0) – 2025-07-21

* feat(admin,frontend): add password visibility toggle with eye icon (#82)
* feat(pricing): add hourly and discounted hourly price support (#83)
* feat(pricing): optimize [price calculation algorithm](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* fix(frontend,mobile): gracefully handle settings context loading
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.9...v8.0

### Assets
- [bookcars-8.0.apk](https://github.com/aelassas/bookcars/releases/download/v8.0/bookcars-8.0.apk) (92.12 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v8.0/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v8.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v8.0)

## [BookCars 7.9](https://github.com/aelassas/bookcars/releases/tag/v7.9) – 2025-07-11

* fix(docker): .env.docker file not loaded in backend container and setup issues
* fix(backend): remove unecessary sentry imports
* fix(backend): include cars missing `blockOnPay` field in overlap booking query
* fix(backend): remove `maxDate` constraint from create and update booking froms
* fix(backend): hide prices when dates are invalid in update booking page
* fix(frontend): remove event listeners when analytics script starts
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.8...v7.9

### Assets
- [bookcars-7.9.apk](https://github.com/aelassas/bookcars/releases/download/v7.9/bookcars-7.9.apk) (92.12 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.9/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.9)

## [BookCars 7.8](https://github.com/aelassas/bookcars/releases/tag/v7.8) – 2025-07-05

* feat(admin): add flexible [rental date and time constraints](https://github.com/aelassas/bookcars/wiki/Rental-Date-and-Time-Constraints) #81
* feat(admin): add flexible [time-based car availability](https://github.com/aelassas/bookcars/wiki/FAQ#how-to-automatically-prevent-a-car-from-being-booked-multiple-times-when-its-already-booked)
* feat(backend): integrate [Sentry](https://github.com/aelassas/bookcars/wiki/Setup-Sentry) for error tracking and performance monitoring with configurable tracesSampleRate
* feat(tests): add Sentry integration tests for initialization and tracing behavior
* feat(tests): add tests for mail module with nodemailer mocks
* feat(tests): enhance logging tests with Sentry integration
* feat(tests): enhance access token validation tests with additional failure scenarios
* feat(tests): enhance PayPal and Stripe test coverage with mocks and improved error handling
* feat(tests): improve helper tests with JWT encryption and access token validation
* feat(tests): enhance database tests with multilingual support and TTL index handling
* feat(tests): add dateBetween filter test for bookings API
* feat(tests): add comprehensive tests for JWT and reCAPTCHA validation
* feat(tests): improve code coverage
* refactor(models): move manual index creation from models to initialization script
* refactor: rename `common` folder to `utils`
* fix(backend): improve TTL index handling and logging for updates
* fix(frontend): wrong minDate in CarFilter when updating from date
* fix(tests): increase test timeout to improve stability of test execution
* fix(tests): cleanup test data
* chore(backend): organize and document .env.example
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.7...v7.8

### Assets
- [bookcars-7.8.apk](https://github.com/aelassas/bookcars/releases/download/v7.8/bookcars-7.8.apk) (92.12 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.8/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.8)

## [BookCars 7.7](https://github.com/aelassas/bookcars/releases/tag/v7.7) – 2025-06-28

* feat(backend): add setup script to create admin user
* feat(backend): add reset script to delete admin user
* feat: add [Code of Conduct](https://github.com/aelassas/bookcars/blob/main/.github/CODE_OF_CONDUCT.md) to promote a respectful and inclusive community
* feat: add comprehensive [Contribution Guide](https://github.com/aelassas/bookcars/blob/main/.github/CONTRIBUTING.md) to assist new contributors
* feat: add GitHub Actions workflow to automatically update [RELEASES.md](https://github.com/aelassas/bookcars/blob/main/.github/RELEASES.md) on new releases
* fix(tests): add parent location tests
* fix(mobile): auth issues when jwt token expires #80
* fix(mobile): replace Paragraph with RNPText in BookingList cancellation dialog
* refactor(backend): move Stripe and PayPal integrations to a dedicated payment directory
* refactor(backend): replace bcrypt password hashing with helper function
* docs: add new sections to [software architecture](https://github.com/aelassas/bookcars/wiki/Architecture)
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.6...v7.7

### Assets
- [bookcars-7.7.apk](https://github.com/aelassas/bookcars/releases/download/v7.7/bookcars-7.7.apk) (92.11 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.7/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.7)

## [BookCars 7.6](https://github.com/aelassas/bookcars/releases/tag/v7.6) – 2025-06-22

* feat: add [parent locations](https://github.com/aelassas/bookcars/wiki/Locations) and include child locations in search results
* feat(mobile): upgrade to React Navigation v7
* fix(mobile): language not updated on login
* fix(mobile): wrong types in autocomplete context
* docs: update README with new features and usage instructions
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.5...v7.6

### Assets
- [bookcars-7.6.apk](https://github.com/aelassas/bookcars/releases/download/v7.6/bookcars-7.6.apk) (92.11 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.6/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.6)

## [BookCars 7.5](https://github.com/aelassas/bookcars/releases/tag/v7.5) – 2025-06-17

* refactor(admin): rename backend folder to admin for clarity
* refactor(backend): rename api folder to backend for clarity
* fix(backend): ensure globalAgent.maxSockets is set for HTTP server
* fix(script): update deployment script messages for consistency
* chore: clarify project identities with consistent package.json names and descriptions
* chore: update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.4...v7.5

### Assets
- [bookcars-7.5.apk](https://github.com/aelassas/bookcars/releases/download/v7.5/bookcars-7.5.apk) (92.11 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.5/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.5)

## [BookCars 7.4](https://github.com/aelassas/bookcars/releases/tag/v7.4) – 2025-06-14

#### What's Changed
* feat(admin): add loading indicator for suppliers
* feat(admin): replace loading backdrop with progress indicator in cars page
* fix(database): text indexes errors when adding new languages
* fix(logger): improve message formatting for VSCode terminal
* chore(index): update server startup logging for better visibility
* chore(tests): enhance database tests with additional scenarios and index handling
* chore: update dependencies
* refactor(mobile): making the code a bit more modular by segregating the logic into a function #79
* refactor(database): enhance connection management and improve logging; refactor initialization functions for better clarity
* refactor(mail): streamline email transporter creation
* refactor(api): modularized server creation supporting HTTP/HTTPS with async file reads
* refactor(api): added detailed JSDoc comments for functions and constants
* refactor(api): added robust database connection and initialization checks before starting server
* refactor(api): introduced configurable shutdown timeout to force exit if shutdown hangs
* refactor(api): improved shutdown handler to log received signals and handle cleanup gracefully
* refactor(api): used `process.once` for signal handling to avoid multiple shutdowns
* refactor(api): improved code readability with consistent naming and minor cleanup
* refactor(logger): reorganize prefixMap and simplify message formatting logic

#### New Contributors
* @aspirin01 made their first contribution in https://github.com/aelassas/bookcars/pull/79

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.3...v7.4

### Assets
- [bookcars-7.4.apk](https://github.com/aelassas/bookcars/releases/download/v7.4/bookcars-7.4.apk) (92.11 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.4/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.4)

## [BookCars 7.3](https://github.com/aelassas/bookcars/releases/tag/v7.3) – 2025-06-08

* fix(env): update CDN URLs to include port 4002 for admin, frontend, and mobile environments
* fix(database): explicitly wait for database connection to be open
* fix(mail): add ethereal test transporter for CI environment
* fix(admin, frontend): forms not updating values properly
* chore: update dependencies
* docs: update self-hosted, run from source and demo database docs

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.2...v7.3

### Assets
- [bookcars-7.3.apk](https://github.com/aelassas/bookcars/releases/download/v7.3/bookcars-7.3.apk) (92.13 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.3/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.3)

## [BookCars 7.2](https://github.com/aelassas/bookcars/releases/tag/v7.2) – 2025-05-21

* feat(frontend): add form submission state handling and disable buttons during submission
* refactor(frontend, admin): update forms to use react-hook-form and zod for validation
* refactor(frontend): improve form validation and error handling in Checkout, SignUp, and Settings pages
* refactor(frontend): migrate form validation schemas to separate model files
* refactor(package.json): reorganize type definitions and dependencies
* refactor(packages): add ESLint configuration and scripts to internal packages
* dev(pre-commit): replace string literals with Symbol constants for check types
* dev(pre-commit): add ESLint configuration and lint script
* chore(all): update dependencies
* fix(map): map component not centering position after updates
* fix(forms): minimize unnecessary renders by optimizing useWatch in react-hook-form
* fix(forms): updated multiple forms across the application to clear specific field errors when the corresponding input changes, improving user experience by providing immediate feedback
* fix(api): optimize additional driver data retrieval in supplier and user controllers
* fix(deploy): remove --omit=dev flag from npm install for complete dependency installation
* fix(checkout): initialize state for insurance options based on car options and update additional driver switch logic

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.1...v7.2

### Assets
- [bookcars-7.2.apk](https://github.com/aelassas/bookcars/releases/download/v7.2/bookcars-7.2.apk) (92.09 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.2/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.2)

## [BookCars 7.1](https://github.com/aelassas/bookcars/releases/tag/v7.1) – 2025-05-13

* chore(mobile): upgrade to expo 53 and react-native 0.79
* chore(all): update all dependencies to their latest versions across all projects
* refacor(frontend): update forms to use react-hook-form and zod for validation
* feat(admin): add blacklisted field to user and supplier forms and update related queries
* feat(admin): comprehensive supplier-specific data management #74
* feat(admin): add loading indicator to countries and locations pages
* fix(checkout): show unauthorized page for blacklisted users
* fix(admin): suppliers with no cars are not listed in suppliers page in admin dashboard
* fix(admin): email not validated properly in forgot password page in admin dashboard

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v7.0...v7.1

### Assets
- [bookcars-7.1.apk](https://github.com/aelassas/bookcars/releases/download/v7.1/bookcars-7.1.apk) (92.09 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.1/bookcars-db.zip) (8.64 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.1)

## [BookCars 7.0](https://github.com/aelassas/bookcars/releases/tag/v7.0) – 2025-05-08

* Refactor: migrate to `createBrowserRouter` for improved routing structure
* Refactor(tests): comment out user blacklisting logic in middleware tests
* Chore: update dependencies
* Fix: check user and notifications when navigating between routes
* Fix(pre-commit): exclude deleted files from ESLint check
* Fix(auth): show unauthorized page for blacklisted users

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.9...v7.0

### Assets
- [bookcars-7.0.apk](https://github.com/aelassas/bookcars/releases/download/v7.0/bookcars-7.0.apk) (86.79 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v7.0/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v7.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v7.0)

## [BookCars 6.9](https://github.com/aelassas/bookcars/releases/tag/v6.9) – 2025-05-04

* Feat: added the number of cars near the supplier's name in suppliers page in the admin dashboard
* Feat(pre-commit): optimized pre-commit hook to lint and type-check only changed projects with Docker fallback #70
* Feat(pre-commit): added file size checks for pre-commit validation
* Feat(pre-commit): added p-limit for concurrency control in ESLint checks and improved logging
* Chore: updated dependencies
* Fix(docker): corrected API log volume path in docker-compose files #71


**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.8...v6.9

### Assets
- [bookcars-6.9.apk](https://github.com/aelassas/bookcars/releases/download/v6.9/bookcars-6.9.apk) (86.79 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.9/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.9)

## [BookCars 6.8](https://github.com/aelassas/bookcars/releases/tag/v6.8) – 2025-04-25

##### What's Changed
* Feat: set up [Docker development environment](https://github.com/aelassas/bookcars/wiki/Run-from-Source-(Docker)) with CDN integration and data persistence #67
* Feat: added `mongo-express` service to docker-compose
* Feat: added `api_logs` volume to docker-compose for logging
* Feat: added CDN middleware to API to serve static files
* Feat: improved account activation and reset emails with styled HTML (auth) #69
* Feat: enabled `babel-plugin-react-compiler` in both backend and frontend vite.config.ts files
* Chore: updated dependencies
* Dev: added custom pre-commit hook for linting and type-checking #68
* Dev: enabled react-compiler rule in ESLint configuration
* Fix: updated button color scheme in Navigation in Scheduler component
* Fix: enabled reCAPTCHA check based on environment configuration
* Fix: removed console log from country selection in CreateLocation page
* Fix: updated service references in Docker configuration files
* Fix: updated lint script to use cache for all projects and add .eslintcache to .gitignore
* Fix: show contact form even if reCAPTCHA is disabled
* Fix: trigger data fetch on car and user changes in BookingList component

##### New Contributors
* @oxcodexo made their first contribution in https://github.com/aelassas/bookcars/pull/67

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.7...v6.8

### Assets
- [bookcars-6.8.apk](https://github.com/aelassas/bookcars/releases/download/v6.8/bookcars-6.8.apk) (86.79 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.8/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.8)

## [BookCars 6.7](https://github.com/aelassas/bookcars/releases/tag/v6.7) – 2025-04-18

* Upgrade to @mui/x-data-grid and @mui/x-date-pickers 8.0.0
* Updated admin dashboard main color
* Updated dependencies
* Fix: add early return for invalid booking confirmation in Stripe checkout session
* Fix: exclude @react-navigation/* packages from ncu command
* Fix: update AdapterDateFns import and adjust selectedIds handling in BookingList and UserList components
* Fix: update loading state in BookingList component
* Fix: update button type in UpdateUser page

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.6...v6.7

### Assets
- [bookcars-6.7.apk](https://github.com/aelassas/bookcars/releases/download/v6.7/bookcars-6.7.apk) (86.79 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.7/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.7)

## [BookCars 6.6](https://github.com/aelassas/bookcars/releases/tag/v6.6) – 2025-04-07

* Migrated to Express 5 for improved performance and future compatibility
* Fix: add loading indicator for supplier filter in admin dashboard
* Fix: remove supplier groups from supplier filter for improved performance in Cars page in admin dashboard
* Fix: adjust font size in car list for improved readability in admin dashboard
* Fix: format car count in Cars page in admin dashboard
* Fix: hide suppliers filter for suppliers in Cars page in admin dashboard
* Fix: update supplier filter layout to use grid for better alignment and spacing
* Fix: adjust car component dimensions for improved layout and responsiveness
* Fix: align car cards to the start for improved mobile layout consistency
* Fix: optimize `getCars` query in admin dashboard for improved performance
* Fix: update car supplier link styles for better visibility in admin dashboard
* Fix: unnecessary call to bank details service in Header component in admin dashboard
* Fix: add tests for invalid payloads and enforce language validation
* Fix: add hideDelete prop to DriverLicense component and update Checkout page logic
* Fix: add custom indexes to multiple models and handle sync errors
* Fix: add setting to ensure final newline in files
* Updated dependencies to their latest version

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.5...v6.6

### Assets
- [bookcars-6.6.apk](https://github.com/aelassas/bookcars/releases/download/v6.6/bookcars-6.6.apk) (86.79 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.6/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.6)

## [BookCars 6.5](https://github.com/aelassas/bookcars/releases/tag/v6.5) – 2025-03-31

* Upgrade to react 19.1 and mui 7.0
* Fix: wrong imports in scheduler component in admin dashboard
* Fix: improve car list component layout with flexbox for better responsiveness in admin dashboard
* Fix: improve car component layout with flexbox for better responsiveness in frontend
* Fix: restrict access to supplier and user update pages based on user roles
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.4...v6.5

### Assets
- [bookcars-6.5.apk](https://github.com/aelassas/bookcars/releases/download/v6.5/bookcars-6.5.apk) (86.46 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.5/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.5)

## [BookCars 6.4](https://github.com/aelassas/bookcars/releases/tag/v6.4) – 2025-03-24

* Add reCAPTCHA and enhance contact, tos and about pages in admin dashboard
* Fix: remove unnecessary trailing spaces in multiple components for consistency
* Fix: disable price change rate for suppliers in UpdateSupplier and UpdateUser pages
* Fix: update price change rate input pattern to allow decimal values in admin dashboard
* Fix: update numeric input pattern to correctly allow decimal values in admin dashboard
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.3...v6.4

### Assets
- [bookcars-6.4.apk](https://github.com/aelassas/bookcars/releases/download/v6.4/bookcars-6.4.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.4/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.4)

## [BookCars 6.3](https://github.com/aelassas/bookcars/releases/tag/v6.3) – 2025-03-20

* Added [Supplier Car Limit](https://github.com/aelassas/bookcars/wiki/FAQ#how-do-i-limit-the-number-of-cars-for-a-supplier-in-search-results): Max Allowed Cars in Search for a supplier
* Added [Notify Admin On New Car](https://github.com/aelassas/bookcars/wiki/FAQ#how-to-notify-the-admin-when-a-supplier-creates-a-new-car): to notify the admin when a supplier creates a new car
* Added [Bank Details](https://github.com/aelassas/bookcars/wiki/FAQ#how-can-i-show-bank-details-to-suppliers) Page and Settings to admin dashboard
* Added Pricing page with plans and features for suppliers in admin dashboard
* Fix: Add `isAuthenticated` state to manage user authentication in Activate and ResetPassword pages
* Fix: exclude fully booked cars in frontend and mobile car retrieval

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.2...v6.3

### Assets
- [bookcars-6.3.apk](https://github.com/aelassas/bookcars/releases/download/v6.3/bookcars-6.3.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.3/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.3)

## [BookCars 6.2](https://github.com/aelassas/bookcars/releases/tag/v6.2) – 2025-03-14

* Added [Price Change Rate](https://github.com/aelassas/bookcars/wiki/Price-Calculation#price-change-rate) to suppliers for flexible price calculation
* Added new car ranges: Bus, Truck, and Caravan
* Fix: Add payPalLoaded prop to CheckoutOptions and update disabled conditions for switches in checkout
* Fix: Merge price calculation in admin dashboard with frontend and mobile app

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.1...v6.2

### Assets
- [bookcars-6.2.apk](https://github.com/aelassas/bookcars/releases/download/v6.2/bookcars-6.2.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.2/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.2)

## [BookCars 6.1](https://github.com/aelassas/bookcars/releases/tag/v6.1) – 2025-03-10

* Upgrade to ESLint 9
* Updated dependencies
* Fix: update ESLint configuration to enforce single quotes for TS and double quotes for TSX
* Fix: update ncu and eslint commands in package.json
* Fix: add TypeScript build info files to .gitignore

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v6.0...v6.1

### Assets
- [bookcars-6.1.apk](https://github.com/aelassas/bookcars/releases/download/v6.1/bookcars-6.1.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.1/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.1)

## [BookCars 6.0](https://github.com/aelassas/bookcars/releases/tag/v6.0) – 2025-02-27

* Added PayPal debug environment variable `VITE_BC_PAYPAL_DEBUG` to frontend
* Fix: update PayPal order status check from `APPROVED` to `COMPLETED` and capture order on approval
* Fix: handle PayPal cancellation and error by resetting processing state
* Fix: disable console call removal in Vite configuration for easier debugging
* Fix: update NotificationList component to properly manage notification read/unread state
* Fix: optimize NotificationList state updates
* Fix: update error logging to use console.log

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.9...v6.0

### Assets
- [bookcars-6.0.apk](https://github.com/aelassas/bookcars/releases/download/v6.0/bookcars-6.0.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v6.0/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v6.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v6.0)

## [BookCars 5.9](https://github.com/aelassas/bookcars/releases/tag/v5.9) – 2025-02-22

* Fix: date and time pickers issues on iOS #66
* Fix: update car filter component offset height to fix accordion layout issues
* Fix: reduce transition duration for accordion panel for quicker animations
* Fix: update footer component to replace secure payment image with dynamic Stripe/PayPal powered by image
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.8...v5.9

### Assets
- [bookcars-5.9.apk](https://github.com/aelassas/bookcars/releases/download/v5.9/bookcars-5.9.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.9/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.9)

## [BookCars 5.8](https://github.com/aelassas/bookcars/releases/tag/v5.8) – 2025-02-13

* Added IPInfo integration for country code retrieval
* Added environment variables to frontend for flexible map settings
* Added environment variables to frontend and mobile app for improved date validation flexibility
* Enhanced PayPal order creation by refining payer and application context settings for improved payment flow
* Updated .gitignore files to use wildcard for production environment files
* Fix: async condition handling in api
* Fix: migrate deprecated MUI APIs
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.7...v5.8

### Assets
- [bookcars-5.8.apk](https://github.com/aelassas/bookcars/releases/download/v5.8/bookcars-5.8.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.8/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.8)

## [BookCars 5.7](https://github.com/aelassas/bookcars/releases/tag/v5.7) – 2025-02-10

* [Added Date Based Price Rates](https://github.com/aelassas/bookcars/wiki/Price-Calculation#date-based-price-rates) (Feature Request #57)
* Added total records header to search results in the frontend
* Added pay deposit option to checkout in the mobile app
* Added [update-version.ps1](https://github.com/aelassas/bookcars/blob/main/__scripts/update-version.ps1) for updating versions
* Updated demo database to include Date Based Price Rates car fields
* Fix: set "Listed in search results" to `true` by default when creating a new car from the admin dashboard
* Fix: maximum rental days of supplier not taken into consideration in search screen in mobile app

### Assets
- [bookcars-5.7.apk](https://github.com/aelassas/bookcars/releases/download/v5.7/bookcars-5.7.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.7/bookcars-db.zip) (8.65 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.7)

## [BookCars 5.6](https://github.com/aelassas/bookcars/releases/tag/v5.6) – 2025-02-08

* Added user context to admin dashboard
* Added `VITE_BC_HIDE_SUPPLIERS` setting to toggle supplier visibility in the frontend
* Updated navigation links in admin dashboard
* Updated dependencies
* Fix: PayPal order name and description violate PayPal's max length resulting in error 400 by @guillaumehussong in https://github.com/aelassas/bookcars/pull/63
* Fix: Stripe product name and description violate Stripe's max length resulting in error 400
* Fix: Forgot Password, Reset Password and Activate pages not working properly in frontend and admin dashboard
* Fix: update SMTP password and MongoDB URI formats in environment configuration files
* Fix: update BOOKCARS translation to use dynamic WEBSITE_NAME variable in mobile app

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.5...v5.6

### Assets
- [bookcars-5.6.apk](https://github.com/aelassas/bookcars/releases/download/v5.6/bookcars-5.6.apk) (86.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.6/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.6)

## [BookCars 5.5](https://github.com/aelassas/bookcars/releases/tag/v5.5) – 2025-02-02

* [Integrated PayPal Payment Gateway](https://github.com/aelassas/bookcars/wiki/Payment-Gateways)
* [Added Vehicle Scheduler](https://bookcars.github.io/content/screenshots/v5.5/backend-scheduler.png?raw=true)
* [Added manual tests](https://github.com/aelassas/bookcars/wiki/Manual-Tests)
* Added `BC_TIMEZONE` setting to api
* Added deposit payment option to checkout
* Added coming soon and already booked tags
* Added Full to Full and Full to Empty fuel policies
* Bump date-fns to 4.1.0
* Updated car range labels
* Updated dependencies
* Updated documentation
* Fix: pick-up date not working properly in frontend and mobile app
* Fix: sorting logic in car retrieval queries
* Fix: supplier lookup in Stripe order processing

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.4...v5.5

### Assets
- [bookcars-5.5.apk](https://github.com/aelassas/bookcars/releases/download/v5.5/bookcars-5.5.apk) (86.54 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.5/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.5)

## [BookCars 5.4](https://github.com/aelassas/bookcars/releases/tag/v5.4) – 2025-01-19

* Added dynamic company/website name setting #61
* Added spanish language to backend #60
* Added filters button to search screen in mobile app
* Added explicit text to about page
* Added cookie policy page
* Added AUD currency
* Updated dependencies
* Fix: escape dollar sign in currency environment variable in backend
* Fix: use environment variable for contact email in footer
* Fix: typos in Privacy and ToS pages

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.3...v5.4

### Assets
- [bookcars-5.4.apk](https://github.com/aelassas/bookcars/releases/download/v5.4/bookcars-5.4.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.4/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.4)

## [BookCars 5.3](https://github.com/aelassas/bookcars/releases/tag/v5.3) – 2025-01-08

* Added footer to sign in, sign up, forgot password, activate and reset password pages
* Fix: redirect to checkout from sign in page not working
* Fix: social login not redirecting properly
* Fix: checkout payment options are still active after online payment submitted
* Fix: sign up not working properly after submit
* Fix: update min-height for checkout session to improve layout
* Fix: change default VITE_PORT to 3002 in vite.config.ts
* Fix: Jest did not exit one second after the test run has completed

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.2...v5.3

### Assets
- [bookcars-5.3.apk](https://github.com/aelassas/bookcars/releases/download/v5.3/bookcars-5.3.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.3/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.3)

## [BookCars 5.2](https://github.com/aelassas/bookcars/releases/tag/v5.2) – 2025-01-04

* Fix: page reload not working properly on Firefox
* Fix: conditionally render Map component based on pickupLocation coordinates
* Fix: update Map rendering logic to include parking spots condition
* Fix: react-localization causing conflicting peer dependency with react 19
* Fix: reactjs-social-login causing conflicting peer dependency with react 19
* Fix: adjust map view size for better layout on search and checkout pages
* Fix: adjust footer link width for better layout
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.1...v5.2

### Assets
- [bookcars-5.2.apk](https://github.com/aelassas/bookcars/releases/download/v5.2/bookcars-5.2.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.2/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.2)

## [BookCars 5.1](https://github.com/aelassas/bookcars/releases/tag/v5.1) – 2024-12-31

* Added user context for managing user state
* Improved Header component responsiveness
* Added NProgress for loading indicators
* Added loading indicator to CarList and removed unused Progress from Search
* Replaced SuspenseRouter with BrowserRouter for routing

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v5.0...v5.1

### Assets
- [bookcars-5.1.apk](https://github.com/aelassas/bookcars/releases/download/v5.1/bookcars-5.1.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.1/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.1)

## [BookCars 5.0](https://github.com/aelassas/bookcars/releases/tag/v5.0) – 2024-12-29

* Improved global performance on [Google PageSpeed Insights](https://pagespeed.web.dev/) (95/100)
* Fix: reCAPTCHA context doesn't work properly
* Fix: Location carrousel badges don't have sufficient contrast ratio
* Fix: Faq titles are not bold
* Fix: dev script is not working properly for backend and frontend
* Fix: Dockerfile commands are not working properly for backend and frontend
* Fix: Commands in documentation are not up to date
* Update background image format to WebP for improved performance
* Update dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.9...v5.0

### Assets
- [bookcars-5.0.apk](https://github.com/aelassas/bookcars/releases/download/v5.0/bookcars-5.0.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v5.0/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v5.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v5.0)

## [BookCars 4.9](https://github.com/aelassas/bookcars/releases/tag/v4.9) – 2024-12-27

* Fix: Bookings not rendering properly on mobile view in the frontend
* Fix: preload link in frontend not working properly
* Fix: Some typos in homepage
* Updated dependencies

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.8...v4.9

### Assets
- [bookcars-4.9.apk](https://github.com/aelassas/bookcars/releases/download/v4.9/bookcars-4.9.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.9/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.9)

## [BookCars 4.8](https://github.com/aelassas/bookcars/releases/tag/v4.8) – 2024-12-23

* Added React Compiler ESLint rules
* Fix: Car price not being updated when changing dates
* Fix: Social links in footer not working properly
* Fix: Location page not responding after creating a new location
* Fix: Location and country validation not working properly
* Fix: Pull to refresh not working properly on search and checkout screens

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.7...v4.8

### Assets
- [bookcars-4.8.apk](https://github.com/aelassas/bookcars/releases/download/v4.8/bookcars-4.8.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.8/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.8)

## [BookCars 4.7](https://github.com/aelassas/bookcars/releases/tag/v4.7) – 2024-12-21

* Upgrade to React 19 stable
* Added [multiple currencies support](https://github.com/aelassas/bookcars/wiki/Add-New-Currency)
* Added newsletter subscription form
* Added social links to footer
* Added FAQ page
* Added driver's license to checkout
* Added minimum rental days to suppliers
* Added more sections to homepage
* Added [iOS App instructions](https://github.com/aelassas/bookcars/wiki/Run-Mobile-App#run-ios-app)
* Optimized production build
* Updated unit tests
* Updated dependencies
* Fixed AutocompleteDropdown on iOS
* Fixed multiple issues across the API, backend, frontend, and mobile app

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.6...v4.7

### Assets
- [bookcars-4.7.apk](https://github.com/aelassas/bookcars/releases/download/v4.7/bookcars-4.7.apk) (85.59 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.7/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.7)

## [BookCars 4.6](https://github.com/aelassas/bookcars/releases/tag/v4.6) – 2024-11-24

* Upgrade to Expo 52 and React Native 0.76
* Added [dynamic price calculation](https://github.com/aelassas/bookcars/wiki/Price-Calculation)
* Added [supplier contracts](https://github.com/aelassas/bookcars/wiki/Supplier-Contracts)
* Updated Docker and NGINX configurations
* Updated unit tests
* Updated dependencies
* Fixed some issues in the backend and the mobile app

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.5...v4.6

### Assets
- [bookcars-4.6.apk](https://github.com/aelassas/bookcars/releases/download/v4.6/bookcars-4.6.apk) (85.55 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.6/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.6)

## [BookCars 4.5](https://github.com/aelassas/bookcars/releases/tag/v4.5) – 2024-10-15

#### What's Changed
* Fix: Asynchronous Supplier Fetching Issue in Search Component by @fdikmen in https://github.com/aelassas/bookcars/pull/53
* Fix: checkout issues
* Fix: TextField deprecated props
* Fix: layout and db issues
* Spanish language added by @guillaumehussong in https://github.com/aelassas/bookcars/pull/54
* Added protection against Brute force, DoS and DDoS attacks, and Web scraping
* Added @ import alias
* Replaced `jsonwebtoken` by `jose`
* Updated Docker configuration
* Updated dependencies

#### New Contributors
* @fdikmen made their first contribution in https://github.com/aelassas/bookcars/pull/53
* @guillaumehussong made their first contribution in https://github.com/aelassas/bookcars/pull/54

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.4...v4.5

### Assets
- [bookcars-4.5.apk](https://github.com/aelassas/bookcars/releases/download/v4.5/bookcars-4.5.apk) (80.52 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.5/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.5)

## [BookCars 4.4](https://github.com/aelassas/bookcars/releases/tag/v4.4) – 2024-09-05

* Added rating, trips and co2 fields to cars
* Added car sizes section to homepage
* Add new search filters to mobile app
* Added pull to refresh to mobile app
* Added location distance to mobile app
* Updated cors middleware
* Updated car rating field
* Updated unit tests
* Updated demo database
* Updated dependencies
* Fix AutocompleteDropdown on iOS
* Fix infinite scroll in mobile app
* Fix mobile locatization issues
* Fix mobile checkout issues
* Fix authentication issues
* Fix layout issues
* Fix typos

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.3...v4.4

### Assets
- [bookcars-4.4.apk](https://github.com/aelassas/bookcars/releases/download/v4.4/bookcars-4.4.apk) (80.45 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.4/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.4)

## [BookCars 4.3](https://github.com/aelassas/bookcars/releases/tag/v4.3) – 2024-08-05

* Added country, latitude, longitude, image and parking spots to locations
* Added range, rating and multimedia fields to cars
* Added new search filters
* Updated booking status style
* Updated dependencies
* Updated demo database
* Fix search filter issues
* Fix infinite scroll
* Fix layout issues

#### New Contributors
* @jay51 made their first contribution in https://github.com/aelassas/bookcars/pull/52

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.2...v4.3

### Assets
- [bookcars-4.3.apk](https://github.com/aelassas/bookcars/releases/download/v4.3/bookcars-4.3.apk) (80.24 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.3/bookcars-db.zip) (8.63 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.3)

## [BookCars 4.2](https://github.com/aelassas/bookcars/releases/tag/v4.2) – 2024-06-22

* Added suppliers and locations pages
* Added footer component
* Added Map and suppliers carrousel to homepage
* Added contact form
* Added new search filters to the backend and the frontend
* Updated layout and colors
* Updated checkout page
* Fix localization issues
* Fix sort queries
* Fix layout issues
* API:
    * Bump @babel/cli from 7.24.6 to 7.24.7
    * Bump @babel/core from 7.24.6 to 7.24.7
    * Bump @babel/plugin-transform-modules-commonjs from 7.24.6 to 7.24.7
    * Bump @babel/preset-env from 7.24.6 to 7.24.7
    * Bump @babel/preset-typescript from 7.24.6 to 7.24.7
    * Bump @types/node from 20.12.12 to 20.14.7
    * Bump @types/uuid from 9.0.8 to 10.0.0
    * Bump @types/validator from 13.11.10 to 13.12.0
    * Bump @typescript-eslint/eslint-plugin from 7.10.0 to 7.13.1
    * Bump @typescript-eslint/parser from 7.10.0 to 7.13.1
    * Bump mongoose from 8.4.0 to 8.4.3
    * Bump nodemailer from 6.9.13 to 6.9.14
    * Bump nodemon from 3.1.1 to 3.1.4
    * Bump stripe from 15.8.0 to 15.12.0
    * Bump tsx from 4.11.0 to 4.15.7
    * Bump typescript from 5.4.5 to 5.5.2
    * Bump uuid from 9.0.1 to 10.0.0
* Backend and frontend:
    * Bump @mui/icons-material from 5.15.18 to 5.15.20
    * Bump @mui/material from 5.15.18 to 5.15.20
    * Bump @mui/x-data-grid from 7.5.0 to 7.7.1
    * Bump @mui/x-date-pickers from 7.5.0 to 7.7.1
    * Bump @stripe/stripe-js from 3.4.1 to 3.5.0
    * Bump @types/node from 20.12.12 to 20.14.7
    * Bump @types/validator from 13.11.10 to 13.12.0
    * Bump @typescript-eslint/eslint-plugin from 7.10.0 to 7.13.1
    * Bump @typescript-eslint/parser from 7.10.0 to 7.13.1
    * Bump @vitejs/plugin-react from 4.3.0 to 4.3.1
    * Bump stylelint from 16.6.0 to 16.6.1
    * Bump stylelint-config-standard from 36.0.0 to 36.0.1
    * Bump vite from 5.2.11 to 5.3.1
* Mobile App:
    * Bump @types/validator from 13.11.10 to 13.12.0
    * Bump axios-retry from 4.3.0 to 4.4.1
    * Bump expo from 51.0.8 to 51.0.14
    * Bump expo-asset from 10.0.6 to 10.0.9
    * Bump expo-constants from 16.0.1 to 16.0.2
    * Bump expo-notifications from 0.28.3 to 0.28.9
    * Bump expo-splash-screen from 0.27.4 to 0.27.5
    * Bump expo-updates from 0.25.14 to 0.25.17
    * Bump react-native from 0.74.1 to 0.74.2
    * Bump react-native-gesture-handler from 2.16.2 to 2.16.1
    * Bump react-native-screens from 3.31.1 to 3.31.1
    * Bump @babel/core from 7.24.6 to 7.24.7
    * Bump @typescript-eslint/eslint-plugin from 7.10.0 to 7.13.1
    * Bump @typescript-eslint/parser from 7.10.0 to 7.13.1
    * Bump eslint-plugin-react from 7.34.1 to 7.34.3

### Assets
- [bookcars-4.2.apk](https://github.com/aelassas/bookcars/releases/download/v4.2/bookcars-4.2.apk) (80.19 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.2/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.2)

## [BookCars 4.1](https://github.com/aelassas/bookcars/releases/tag/v4.1) – 2024-05-26

* Migrate from craco to vite
* Added `unknown` car engine type
* Added `VITE_BC_CURRENCY` and `VITE_BC_SET_LANGUAGE_FROM_IP` settings to *frontend/.env*
* Updated backend and frontend components
* Fix layout issues in the backend and the frontend
* Fix some queries in API
* API:
    * Bump @babel/cli from 7.24.5 to 7.24.6
    * Bump @babel/core from 7.24.5 to 7.24.6
    * Bump @babel/plugin-transform-modules-commonjs from 7.24.1 to 7.24.6
    * Bump @babel/preset-env from 7.24.5 to 7.24.6
    * Bump @babel/preset-typescript from 7.24.1 to 7.24.6
    * Bump @typescript-eslint/eslint-plugin from 7.9.0 to 7.10.0
    * Bump @typescript-eslint/parser from 7.9.0 to 7.10.0
    * Bump nodemon from 3.1.0 to 3.1.1
    * Bump stripe from 15.7.0 to 15.8.0
    * Bump tsx from 4.10.4 to 4.11.0
* Backend and frontend:
    * Bump @stripe/stripe-js from 3.4.0 to 3.4.1
    * Bump @types/react from 18.2.66 to 18.3.3
    * Bump @types/react-dom from 18.2.22 to 18.3.0
    * Bump @typescript-eslint/eslint-plugin from 7.2.0 to 7.10.0
    * Bump @typescript-eslint/parser from 7.2.0 to 7.10.0
    * Bump @vitejs/plugin-react from 4.2.1 to 4.3.0
    * Bump axios from 1.6.8 to 1.7.2
    * Bump eslint-plugin-react-hooks from 4.6.0 to 4.6.2
    * Bump eslint-plugin-react-refresh from 0.4.6 to 0.4.7
    * Bump react from 18.2.0 to 18.3.1
    * Bump react-dom from 18.2.0 to 18.3.1
    * Bump stylelint from 16.5.0 to 16.6.0
* Mobile App:
    * Bump axios from 1.6.8 to 1.7.2
    * Bump axios-retry from 4.2.0 to 4.3.0
    * Bump @babel/core from 7.24.5 to 7.24.6
    * Bump @typescript-eslint/eslint-plugin from 7.9.0 to 7.10.0
    * Bump @typescript-eslint/parser from 7.9.0 to 7.10.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v4.0...v4.1

### Assets
- [bookcars-4.1.apk](https://github.com/aelassas/bookcars/releases/download/v4.1/bookcars-4.1.apk) (80.18 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.1/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.1)

## [BookCars 4.0](https://github.com/aelassas/bookcars/releases/tag/v4.0) – 2024-05-18

* Added the following engine types: electric, hybrid and plug-in hybrid
* Upgrade to Google reCAPTCHA v3
* Fix checkout issues
* Fix image issues in mobile app
* API:
    * Bump @types/node from 20.12.11 to 20.12.12
    * Bump @types/validator from 13.11.9 to 13.11.10
    * Bump @typescript-eslint/eslint-plugin from 7.8.0 to 7.9.0
    * Bump @typescript-eslint/parser from 7.8.0 to 7.9.0
    * Bump mongoose from 8.3.4 to 8.4.0
    * Bump rimraf from 5.0.5 to 5.0.7
    * Bump stripe from 15.6.0 to 15.7.0
    * Bump tsx from 4.9.4 to 4.10.4
* Backend and frontend:
    * Bump @mui/icons-material from 5.15.17 to 5.15.18
    * Bump @mui/material from 5.15.17 to 5.15.18
    * Bump @mui/x-data-grid from 7.3.2 to 7.5.0
    * Bump @mui/x-date-pickers from 7.3.2 to 7.5.0
    * Bump @types/node from 20.12.11 to 20.12.12
    * Bump @types/react from 18.3.1 to 18.3.2
    * Bump @types/validator from 13.11.9 to 13.11.10
    * Bump react-router-dom from 6.23.0 to 6.23.1
* Mobile App:
    * Bump @react-native-community/datetimepicker from 7.7.0 to 8.0.1
    * Bump @types/validator from 13.11.9 to 13.11.10
    * Bump axios-retry from 4.1.0 to 4.2.0
    * Bump expo from 51.0.2 to 51.0.8
    * Bump expo-image-picker from 15.0.4 to 15.0.5
    * Bump expo-notifications from 0.28.1 to 0.28.3
    * Bump expo-updates from 0.25.11 to 0.25.14
    * Bump react-native-root-toast from 3.5.1 to 3.6.0
    * Bump @typescript-eslint/eslint-plugin from 7.8.0 to 7.9.0
    * Bump @typescript-eslint/parser from 7.8.0 to 7.9.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.9...v4.0

### Assets
- [bookcars-4.0.apk](https://github.com/aelassas/bookcars/releases/download/v4.0/bookcars-4.0.apk) (80.18 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v4.0/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v4.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v4.0)

## [BookCars 3.9](https://github.com/aelassas/bookcars/releases/tag/v3.9) – 2024-05-14

* Upgrade to Expo SDK 51
* Fix checkout issues
* Fix Stripe issues
* Fix Safari issues
* Fix notification issues
* API:
    * Bump @types/node from 20.12.10 to 20.12.11
    * Bump expo-server-sdk from 3.9.0 to 3.10.0
    * Bump stripe from 15.5.0 to 15.6.0
    * Bump tsx from 4.9.3 to 4.9.4
    * Bump validator from 13.11.0 to 13.12.0
* Backend and frontend:
    * Bump @mui/icons-material from 5.15.16 to 5.15.17
    * Bump @mui/material from 5.15.16 to 5.15.17
    * Bump @types/node from 20.12.10 to 20.12.11
    * Bump validator from 13.11.0 to 13.12.0
* Mobile app:
    * Bump @react-native-async-storage/async-storage from 1.21.0 to 1.23.1
    * Bump @react-native-community/datetimepicker from 7.6.1 to 7.7.0
    * Bump expo from 50.0.17 to 51.0.2
    * Bump expo-asset from 9.0.2 to 10.0.6
    * Bump expo-constants from 15.4.6 to 16.0.1
    * Bump expo-device from 5.9.4 to 6.0.2
    * Bump expo-image-picker from 14.7.1 to 15.0.4
    * Bump expo-localization from 14.8.4 to 15.0.3
    * Bump expo-notifications from 0.27.7 to 0.28.1
    * Bump expo-splash-screen from 0.26.5 to 0.27.4
    * Bump expo-status-bar from 1.11.1 to 1.12.1
    * Bump expo-updates from 0.24.12 to 0.25.11
    * Bump react-native from 0.73.6 to 0.74.1
    * Bump react-native-gesture-handler from 2.14.0 to 2.16.2
    * Bump react-native-reanimated from 3.6.2 to 3.10.1
    * Bump react-native-safe-area-context from 4.8.2 to 4.10.1
    * Bump react-native-screens from 3.29.0 to 3.31.1
    * Bump validator from 13.11.0 to 13.12.0
    * Bump @stripe/stripe-react-native from 0.35.1 to 0.37.2
    * Bump @types/react from 18.2.45 to 18.2.79
    * Bump typescript from 5.4.5 to 5.3.3

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.8...v3.9

### Assets
- [bookcars-3.9.apk](https://github.com/aelassas/bookcars/releases/download/v3.9/bookcars-3.9.apk) (80.12 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.9/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.9)

## [BookCars 3.8](https://github.com/aelassas/bookcars/releases/tag/v3.8) – 2024-05-07

* Added Google Pay and Apple Pay to mobile app
* Added `REACT_APP_BC_STRIPE_CURRENCY_CODE` setting to the frontend
* Added `BC_STRIPE_COUNTRY_CODE` and `BC_STRIPE_CURRENCY_CODE` to the mobile app
* API:
    * Bump @types/node from 20.12.8 to 20.12.10
    * Bump mongoose from 8.3.3 to 8.3.4
    * Bump stripe from 15.4.0 to 15.5.0
    * Bump tsx from 4.8.2 to 4.9.3
* Backend and frontend:
    * Bump @types/node from 20.12.8 to 20.12.10

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.7...v3.8

### Assets
- [bookcars-3.8.apk](https://github.com/aelassas/bookcars/releases/download/v3.8/bookcars-3.8.apk) (78.32 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.8/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.8)

## [BookCars 3.7](https://github.com/aelassas/bookcars/releases/tag/v3.7) – 2024-05-03

* Fixed push notifications issues in Android app related to FCM V1
* Fixed some issues in `DateTimePicker` component
* Fixed some issues in api related to sign up and logging
* CSS cleanup
* API:
    * Bump @types/node from 20.12.7 to 20.12.8
    * Bump @types/nodemailer from 6.4.14 to 6.4.15
    * Bump tsx from 4.7.3 to 4.8.2
* Backend and frontend:
    * Bump @mui/icons-material from 5.15.15 to 5.15.16
    * Bump @mui/material from 5.15.15 to 5.15.16
    * Bump @mui/x-data-grid from 7.3.1 to 7.3.2
    * Bump @mui/x-date-pickers from 7.3.1 to 7.3.2
    * Bump @types/node from 20.12.7 to 20.12.8
    * Bump stylelint from 16.4.0 to 16.5.0
* Mobile app:
    * Bump mime from 4.0.1 to 4.0.3
    * Bump react-native-vector-icons from 10.0.3 to 10.1.0
    * Bump @babel/core from 7.24.4 to 7.24.5
    * Bump @types/react from 18.2.79 to 18.2.45
    * Bump @typescript-eslint/eslint-plugin from 7.7.1 to 7.8.0
    * Bump @typescript-eslint/parser from 7.7.1 to 7.8.0
    * Bump eslint-plugin-react-hooks from 4.6.2 to 4.6.2
    * Bump npm-check-updates from 16.14.20 to 16.14.20

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.6...v3.7

### Assets
- [bookcars-3.7.apk](https://github.com/aelassas/bookcars/releases/download/v3.7/bookcars-3.7.apk) (78.32 MB)
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.7/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.7)

## [BookCars 3.6](https://github.com/aelassas/bookcars/releases/tag/v3.6) – 2024-04-30

* Added all active Stripe Payment methods to the frontend
* Updated Stripe Payment integration in the backend, the frontend and the mobile app
* Updated unit tests
* Fixed jest and babel issues
* Fixed TTL indexing issues
* Fixed some issues in unit tests
* API:
    * Bump @babel/cli from 7.24.1 to 7.24.5
    * Bump @babel/core from 7.24.4 to 7.24.5
    * Bump @babel/preset-env from 7.24.4 to 7.24.5
    * Bump @typescript-eslint/eslint-plugin from 7.7.1 to 7.8.0
    * Bump @typescript-eslint/parser from 7.7.1 to 7.8.0
    * Bump mongoose from 8.3.2 to 8.3.3

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.5...v3.6

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.6/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.6)

## [BookCars 3.5](https://github.com/aelassas/bookcars/releases/tag/v3.5) – 2024-04-27

* Added [stripe payment gateway](https://github.com/aelassas/bookcars/wiki/Setup-Stripe)
* API:
    * Bump npm-check-updates from 16.14.18 to 16.14.20
    * Bump supertest from 6.3.4 to 7.0.0
    * Bump tsx from 4.7.2 to 4.7.3
* Backend and frontend:
    * Bump @mui/x-data-grid from 7.3.0 to 7.3.1
    * Bump @mui/x-date-pickers from 7.2.0 to 7.3.1
    * Bump @types/react from 18.2.79 to 18.3.1
    * Bump @types/react-dom from 18.2.25 to 18.3.0
    * Bump npm-check-updates from 16.14.18 to 16.14.20
    * Bump react from 18.2.0 to 18.3.1
    * Bump react-dom from 18.2.0 to 18.3.1    
* Mobile App:
    * Bump expo-splash-screen from 0.26.4 0.26.5

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.4...v3.5

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.5/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.5)

## [BookCars 3.4](https://github.com/aelassas/bookcars/releases/tag/v3.4) – 2024-04-24

* Fixed some issues in `BookingList`, `DatePicker` and `DateTimePicker` components
* Fixed some issues in `Bookings` and `User` pages
* Updated mobile layout
* API:
    * Bump @typescript-eslint/eslint-plugin from 7.7.0 to 7.7.1
    * Bump @typescript-eslint/parser from 7.7.0 to 7.7.1
* Backend and frontend:
    * Bump react-router-dom from 6.22.3 to 6.23.0
    * Bump stylelint from 16.3.1 to 16.4.0
* Mobile app:
    * Bump @typescript-eslint/eslint-plugin from 7.7.0 to 7.7.1
    * Bump @typescript-eslint/parser from 7.7.0 to 7.7.1

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.3...v3.4

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.4/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.4)

## [BookCars 3.3](https://github.com/aelassas/bookcars/releases/tag/v3.3) – 2024-04-18

* Updated currency and price formats
* Fixed some issues related to `BookingList` and `MultipleSelect` components
* Fixed date and time issues
* Fixed some issues related mobile app local build
* API:
    * Bump @typescript-eslint/eslint-plugin from 7.6.0 to 7.7.0
    * Bump @typescript-eslint/parser from 7.6.0 to 7.7.0
    * Bump babel-plugin-module-resolver from 5.0.0 to 5.0.2
* Backend and frontend:
    * Bump @mui/x-data-grid from 7.1.1 to 7.3.0
    * Bump @mui/x-date-pickers from 7.1.1 to 7.2.0
    * Bump @types/react from 18.2.77 to 18.2.79
    * Bump date-fns from 2.25.0 to 2.29.3
* Mobile App:
    * Bump babel-plugin-module-resolver from 5.0.0 to 5.0.2
    * Bump expo from 50.0.15 to 50.0.17
    * Bump expo-constants from 15.4.5 to 15.4.6
    * Bump expo-device from 5.9.3 to 5.9.4
    * Bump expo-localization from 14.8.3 to 14.8.4
    * Bump expo-notifications from 0.27.6 to 0.27.7
    * Bump @types/react from 18.2.77 to 18.2.79
    * Bump @typescript-eslint/eslint-plugin from 7.6.0 to 7.7.0
    * Bump @typescript-eslint/parser from 7.6.0 to 7.7.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.2...v3.3

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.3/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.3)

## [BookCars 3.2](https://github.com/aelassas/bookcars/releases/tag/v3.2) – 2024-04-13

* Added winston logging to the API
* Added React Context to the backend, the frontend and the mobile app
* Updated Notifications page
* Updated `LocationList` and `Supplier` components
* Updated packages
* General cleanup and under the hood updates
* API:
    * Bump @types/node from 20.12.4 to 20.12.7
    * Bump @typescript-eslint/eslint-plugin from 7.5.0 to 7.6.0
    * Bump @typescript-eslint/parser from 7.5.0 to 7.6.0
    * Bump mongoose from 8.3.0 to 8.3.1
    * Bump typescript from 5.4.4 to 5.4.5
* Backend and frontend:
    * Bump @types/node from 20.12.4 to 20.12.7
    * Bump @types/react from 18.2.74 to 18.2.77
    * Bump @types/react-dom from 18.2.24 to 18.2.25
* Mobile App:
    * Bump expo from 50.0.14 to 50.0.15
    * Bump @types/react from 18.2.74 to 18.2.77
    * Bump @typescript-eslint/eslint-plugin from 7.5.0 to 7.6.0
    * Bump @typescript-eslint/parser from 7.5.0 to 7.6.0
    * Bump typescript from 5.4.4 to 5.4.5

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.1...v3.2

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.2/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.2)

## [BookCars 3.1](https://github.com/aelassas/bookcars/releases/tag/v3.1) – 2024-04-05

* Added `stylelint` scripts
* Updated home, search and checkout pages
* Updated `BookingList`, `UserList`, `DatePicker` and `DateTimePicker` components
* Updated CI workflows
* Fixed CSS issues
* API:
    * Bump @babel/cli from 7.23.9 to 7.24.1
    * Bump @babel/core from 7.24.0 to 7.24.4
    * Bump @babel/plugin-transform-modules-commonjs from 7.23.3 to 7.24.1
    * Bump @babel/preset-env from 7.24.0 to 7.24.4
    * Bump @babel/preset-typescript from 7.23.3 to 7.24.1
    * Bump @types/node from 20.11.28 to 20.12.4
    * Bump @typescript-eslint/eslint-plugin from 7.2.0 to 7.5.0
    * Bump @typescript-eslint/parser from 7.2.0 to 7.5.0
    * Bump expo-server-sdk from 3.7.0 to 3.9.0
    * Bump express from 4.18.3 to 4.19.2
    * Bump mongoose from 8.2.2 to 8.3.0
    * Bump nodemailer from 6.9.12 to 6.9.13
    * Bump npm-check-updates from 16.14.17 to 16.14.18
    * Bump tsx from 4.7.1 to 4.7.2
    * Bump typescript from 5.4.2 to 5.4.4
* Backend and frontend:
    * Bump @emotion/styled from 11.11.0 to 11.11.5
    * Bump @mui/icons-material from 5.15.13 to 5.15.15
    * Bump @mui/material from 5.15.13 to 5.15.15
    * Bump @mui/x-data-grid from 6.19.6 to 7.1.1
    * Bump @mui/x-date-pickers from 6.19.7 to 7.1.1
    * Bump @types/node from 20.11.28 to 20.12.4
    * Bump @types/react from 18.2.67 to 18.2.74
    * Bump @types/react-dom from 18.2.22 to 18.2.24
    * Bump npm-check-updates from 16.14.17 to 16.14.18
    * Bump stylelint from 16.2.1 to 16.3.1
* Mobile App:
    * Bump @react-navigation/drawer from 6.6.14 to 6.6.15
    * Bump @react-navigation/native from 6.1.16 to 6.6.17
    * Bump @react-navigation/native-stack from 6.9.25 to 6.6.26
    * Bump @react-navigation/stack from 6.3.28 to 6.6.29
    * Bump axios-retry from 4.0.0 to 4.1.0
    * Bump expo from 50.0.13 to 50.0.14
    * Bump react-native from 0.73.5 to 0.73.6
    * Bump @babel/core from 7.24.0 to 7.24.4
    * Bump @types/react from 18.2.67 to 18.2.74
    * Bump @typescript-eslint/eslint-plugin from 7.2.0 to 7.5.0
    * Bump @typescript-eslint/parser from 7.2.0 to 7.5.0
    * Bump typescript from 5.4.2 to 5.4.4

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v3.0...v3.1

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.1/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.1)

## [BookCars 3.0](https://github.com/aelassas/bookcars/releases/tag/v3.0) – 2024-03-18

* Reached 100% code coverage in the API
* Upgrade to TypeScript 5.4
* Fix an issue in checkout process
* Under the hood updates
* API:
    * Bump @types/cookie-parser from 1.4.6 to 1.4.7
    * Bump @types/node from 20.11.24 to 20.11.28
    * Bump @typescript-eslint/eslint-plugin from 7.1.0 to 7.2.0
    * Bump @typescript-eslint/parser from 7.1.0 to 7.2.0
    * Bump mongoose from 8.2.0 to 8.2.2
    * Bump nodemailer from 6.9.11 to 6.9.12
    * Bump typescript from 5.3.3 to 5.4.2
    * Bump npm-check-updates from 16.14.15 to 16.14.17
* Backend and frontend:
    * Bump @mui/icons-material from 5.15.11 to 5.15.13
    * Bump @mui/material from 5.15.11 to 5.15.13
    * Bump @mui/x-data-grid from 6.19.5 to 6.19.6
    * Bump @mui/x-date-pickers from 6.19.5 to 6.19.7
    * Bump @types/node from 20.11.24 to 20.11.28
    * Bump @types/react from 18.2.61 to 18.2.67
    * Bump @types/react-dom from 18.2.19 to 18.2.22
    * Bump axios from 1.6.7 to 1.6.8
    * Bump npm-check-updates from 16.14.15 to 16.14.17
    * Bump react-router-dom from 6.22.2 to 6.22.3
    * Bump react-toastify from 10.0.4 to 10.0.5
* Mobile App:
    * Bump @react-navigation/drawer from 6.6.11 to 6.6.14
    * Bump @react-navigation/native from 6.1.14 to 6.6.16
    * Bump @react-navigation/native-stack from 6.9.22 to 6.9.25
    * Bump @react-navigation/stack from 6.3.25 to 6.3.28
    * Bump axios from 1.6.7 to 1.6.8
    * Bump date-fns from 3.3.1 to 3.6.0
    * Bump expo from 50.0.8 to 50.0.13
    * Bump expo-updates from 0.24.11 to 0.24.12
    * Bump react-native from 0.73.4 to 0.73.5
    * Bump @types/react from 18.2.61 to 18.2.67
    * Bump @typescript-eslint/eslint-plugin from 7.1.0 to 7.2.0
    * Bump @typescript-eslint/parser from 7.1.0 to 7.2.0
    * Bump eslint-plugin-react from 7.33.2 to 7.34.1
    * Bump typescript from 5.3.3 to 5.4.2

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.9...v3.0

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v3.0/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v3.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v3.0)

## [BookCars 2.9](https://github.com/aelassas/bookcars/releases/tag/v2.9) – 2024-02-29

* Added [unit tests and coverage](https://github.com/aelassas/bookcars/wiki/Unit-Tests-and-Coverage)
* Updated eslint presets
* Updated the documentation
* Fix update avatar in mobile app
* Fix push notification issues
* Fix API issues
* Fix CodeFactor issues
* Fix eslint issues
* API:
    *  Bump @babel/core from 7.23.9 to 7.24.0
    *  Bump @babel/preset-env from 7.23.9 to 7.24.0
    *  Bump @types/jsonwebtoken from 9.0.5 to 9.0.6
    *  Bump @types/node from 20.11.10 to 20.11.24
    *  Bump @types/validator from 13.11.8 to 13.11.9
    *  Bump @typescript-eslint/eslint-plugin from 6.19.1 to 7.1.0
    *  Bump @typescript-eslint/parser from 6.19.1 to 7.1.0
    *  Bump dotenv from 16.4.1 to 16.4.5
    *  Bump eslint from 8.56.0 to 8.57.0
    *  Bump express from 4.18.2 to 4.18.3
    *  Bump mongoose from 8.1.1 to 8.2.0
    *  Bump nodemailer from 6.9.8 to 6.9.11
    *  Bump nodemon from 3.0.3 to 3.1.0
    *  Bump npm-check-updates from 16.14.14 to 16.14.15
    *  Bump tsx from 4.7.0 to 4.7.1
* Backend and frontend:
    * Bump @emotion/react from 11.11.3 to 11.11.4
    * Bump @mui/icons-material from 5.15.6 to 5.15.11
    * Bump @mui/material from 5.15.6 to 5.15.11
    * Bump @mui/x-data-grid from 6.19.2 to 6.19.5
    * Bump @mui/x-date-pickers from 6.19.2 to 6.19.5
    * Bump @types/node from 20.11.10 to 20.11.24
    * Bump @types/react from 18.2.48 to 18.2.61
    * Bump @types/react-dom from 18.2.18 to 18.2.19
    * Bump @types/validator from 13.11.8 to 13.11.9
    * Bump npm-check-updates from 16.14.14 to 16.14.15
    * Bump react-router-dom from 6.21.3 to 6.22.2    
* Mobile App:
    * Bump @react-navigation/drawer from 6.6.6 to 6.6.11
    * Bump @react-navigation/native from 6.1.9 to 6.6.14
    * Bump @react-navigation/native-stack from 6.9.17 to 6.9.22 
    * Bump @react-navigation/stack from 6.3.20 to 6.3.25
    * Bump @types/validator from 13.11.8 to 13.11.9
    * Bump expo from 50.0.4 to 50.0.8
    * Bump expo-updates from 0.24.9 to 0.24.11
    * Bump i18n-js from 4.3.2 to 4.4.3
    * Bump react-native from 0.73.2 to 0.73.10
    * Bump react-native-dotenv from 3.4.9 to 3.4.11
    * Bump react-native-gesture-handler from 2.14.1 to 2.14.0
    * Bump @babel/core from 7.23.9 to 7.24.0
    * Bump @types/react from 18.2.48 to 18.2.61
    * Bump @typescript-eslint/eslint-plugin from 6.19.1 to 7.1.0
    * Bump @typescript-eslint/parser from 6.19.1 to 7.1.0
    * Bump eslint from 8.56.0 to 8.57.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.8...v2.9

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.9/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.9)

## [BookCars 2.8](https://github.com/aelassas/bookcars/releases/tag/v2.8) – 2024-01-29

* Upgrade to Expo SDK 50
* Fixed `react-toastify` issues
* Fixed Mobile Drawer issues
* API:
    * @babel/cli from 7.23.4 to 7.23.9
    * @babel/preset-env from 7.23.8 to 7.23.9
    * @types/node from 20.10.8 to 20.11.10
    * @types/uuid from 9.0.7 to 9.0.8
    * @typescript-eslint/eslint-plugin from 6.18.1 to 6.19.1
    * @typescript-eslint/parser from 6.18.1 to 6.19.1
    * dotenv from 16.3.1 to 16.4.1
    * mongoose from 8.0.4 to 8.1.1
    * nodemon from 3.0.2 to 3.0.3
    * npm-check-updates from 16.14.12 to 16.14.14
* Backend and frontend:
    * @mui/icons-material from 5.15.3 to 5.15.6
    * @mui/material from 5.15.3 to 5.15.6
    * @mui/x-data-grid from 6.18.7 to 6.19.2
    * @mui/x-date-pickers from 6.18.7 to 6.19.2
    * @types/node from 20.10.8 to 20.11.10
    * @types/react from 18.2.47 to 18.2.48
    * axios from 1.6.5 to 1.6.7
    * npm-check-updates from 16.14.12 to 16.14.14
    * react-router-dom from 6.21.1 to 6.21.3
    * react-toastify from 9.1.3 to 10.0.4
* Mobile App:
    * Bump @react-native-async-storage/async-storage from 1.18.2 to 1.21.0
    * Bump @react-native-community/datetimepicker from 7.2.0 to 7.6.1
    * Bump axios from 1.6.5 to 1.6.7
    * Bump date-fns from 3.2.0 to 3.3.1
    * Bump expo from 49.0.21 to 50.0.4
    * Bump expo-asset from 8.10.1 to 9.0.2
    * Bump expo-constants from 14.4.2 to 15.4.5
    * Bump expo-device from 5.4.0 to 5.9.3
    * Bump expo-image-picker from 14.3.2 to 14.7.1
    * Bump expo-localization from 14.3.0 to 14.8.3
    * Bump expo-notifications from 0.20.1 to 0.27.6
    * Bump expo-splash-screen from 0.20.5 to 0.26.4
    * Bump expo-status-bar from 1.6.0, ~1.11.1
    * Bump expo-updates from 0.18.19 to 0.24.9
    * Bump react-native from 0.72.6 to 0.73.2
    * Bump react-native-gesture-handler from 2.12.0 to 2.14.1
    * Bump react-native-paper from 5.11.7 to 5.12.3
    * Bump react-native-reanimated from 3.3.0 to 3.6.2
    * Bump react-native-safe-area-context from 4.6.3 to 4.8.2
    * Bump react-native-screens from 3.22.0 to 3.29.0
    * Bump @babel/core from 7.23.7 to 7.23.9
    * Bump @types/react from 18.2.47 to 18.2.48
    * Bump @typescript-eslint/eslint-plugin from 6.18.1 to 6.19.1
    * Bump @typescript-eslint/parser from 6.18.1 to 6.19.1

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.7...v2.8

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.8/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.8)

## [BookCars 2.7](https://github.com/aelassas/bookcars/releases/tag/v2.7) – 2024-01-10

* Updated Search component
* Replaced `ts-node` by `tsx`
* Fixed permission issues on Android 13 and above
* API:
    * Bump @babel/preset-env from 7.23.6 to 7.23.8
    * Bump @types/node from 20.10.4 to 20.10.8
    * Bump @types/validator from 13.11.7 to 13.11.8
    * Bump @typescript-eslint/eslint-plugin from 6.14.0 to 6.18.1
    * Bump @typescript-eslint/parser from 6.14.0 to 6.18.1
    * Bump eslint from 8.55.0 to 8.56.0
    * Bump eslint-plugin-import from 2.29.0 to 2.29.1
    * Bump mongoose from 8.0.3 to 8.0.4
    * Bump nodemailer from 6.9.7 to 6.9.8
* Backend and frontend:
    * Bump @emotion/react from 11.11.1 to 11.11.3
    * Bump @mui/icons-material from 5.15.0 to 5.15.3
    * Bump @mui/material from 5.15.0 to 5.15.3
    * Bump @mui/x-data-grid from 6.18.5 to 6.18.7
    * Bump @mui/x-date-pickers from 6.18.5 to 6.18.7
    * Bump @types/node from 20.10.4 to 20.10.8
    * Bump @types/react from 18.2.45 to 18.2.47
    * Bump @types/react-dom from 18.2.17 to 18.2.18
    * Bump @types/validator from 13.11.7 to 13.11.8
    * Bump axios from 1.6.2 to 1.6.5
    * Bump date-fns from 2.30.0 to 3.2.0
    * Bump react-router-dom from 6.21.0 to 6.21.1
* Mobile app:
    * Bump @types/validator from 13.11.7 to 13.11.8
    * Bump axios from 1.6.2 to 1.6.5
    * Bump date-fns from 2.30.0 to 3.2.0
    * Bump expo-updates from 0.18.17 to 0.18.19
    * Bump mime from 4.0.0 to 4.0.1
    * Bump react-native-paper from 5.11.4 to 5.11.7
    * Bump react-native-web from 0.19.9 to 0.19.10
    * Bump @babel/core from 7.23.6 to 7.23.7
    * Bump @types/react from 18.2.45 to 18.2.47
    * Bump @typescript-eslint/eslint-plugin from 6.14.0 to 6.18.1
    * Bump @typescript-eslint/parser from 6.14.0 to 6.18.1
    * Bump eslint from 8.55.0 to 8.56.0
    * Bump eslint-plugin-import from 2.29.0 to 2.29.1

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.6...v2.7

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.7/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.7)

## [BookCars 2.6](https://github.com/aelassas/bookcars/releases/tag/v2.6) – 2023-12-14

* Fixed autocomplete issues
* Fixed TextField clear issues
* Updated dependencies
* API:
    * Bump ts-node from 10.9.1 to 10.9.2
    * Bump @babel/preset-env from 7.23.5 to 7.23.6
    * Bump @types/node from 20.10.2 to 20.10.4
    * Bump @typescript-eslint/eslint-plugin from 6.13.1 to 6.14.0
    * Bump @typescript-eslint/parser from 6.13.1 to 6.14.0
    * Bump mongoose from 8.0.2 to 8.0.3
    * Bump npm-check-updates from 16.14.11 to 16.14.12
    * Bump typescript from 5.3.2 to 5.3.3
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.19 to 5.15.0
    * Bump @mui/material from 5.14.19 to 5.15.0
    * Bump @mui/x-data-grid from 6.18.2 to 6.18.5
    * Bump @mui/x-date-pickers from 6.18.2 to 6.18.5
    * Bump @types/node from 20.10.2 to 20.10.4
    * Bump @types/react from 18.2.41 to 18.2.45
    * Bump npm-check-updates from 16.14.11 to 16.14.12
    * Bump react-router-dom from 6.20.1 to 6.21.0
* Mobile app:
    * Bump react-native-paper from 5.11.3 to 5.11.4
    * Bump react-native-vector-icons from 10.0.2 to 10.0.3
    * Bump @babel/core from 7.23.5 to 7.23.6
    * Bump @types/react from 18.2.41 to 18.2.45
    * Bump @typescript-eslint/eslint-plugin from 6.13.1 to 6.14.0
    * Bump @typescript-eslint/parser from 6.13.1 to 6.14.0
    * Bump typescript from 5.3.2 to 5.3.3

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.5...v2.6

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.6/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.6)

## [BookCars 2.5](https://github.com/aelassas/bookcars/releases/tag/v2.5) – 2023-12-03

* Upgrade to TypeScript 5.3
* API:
    * Bump @babel/cli from 7.23.0 to 7.23.4
    * Bump @babel/preset-env from 7.23.3 to 7.23.5
    * Bump @types/cors from 2.8.16 to 2.8.17
    * Bump @types/multer from 1.4.10 to 1.4.11
    * Bump @types/node from 20.9.1 to 20.10.2
    * Bump @types/validafromr from 13.11.6 to 13.11.7
    * Bump @typescript-eslint/eslint-plugin from 6.11.0 to 6.13.1
    * Bump @typescript-eslint/parser from 6.11.0 to 6.13.1
    * Bump eslint from 8.54.0 to 8.55.0
    * Bump mongoose from 8.0.1 to 8.0.2
    * Bump nodemon from 3.0.1 to 3.0.2
    * Bump npm-check-updates from 16.14.6 to 16.14.11
    * Bump typescript from 5.2.2 to 5.3.2
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.18 to 5.14.19
    * Bump @mui/material from 5.14.18 to 5.14.19
    * Bump @mui/x-data-grid from 6.18.1 to 6.18.2
    * Bump @mui/x-date-pickers from 6.18.1 to 6.18.2
    * Bump @types/node from 20.9.1 to 20.10.2
    * Bump @types/react from 18.2.37 to 18.2.41
    * Bump @types/react-dom from 18.2.15 to 18.2.17
    * Bump @types/validator from 13.11.6 to 13.11.7
    * Bump npm-check-updates from 16.14.6 to 16.14.11
    * Bump react-router-dom from 6.19.0 to 6.20.1
* Mobile app:
    * Bump @types/validator from 13.11.6 to 13.11.7
    * Bump axios-retry from 3.9.1 to 4.0.0
    * Bump expo from 49.0.19 to 49.0.21
    * Bump mime from 3.0.0 to 4.0.0
    * Bump react-native-paper from 5.11.1 to 5.11.3
    * Bump @babel/core from 7.23.3 to 7.23.5
    * Bump @types/react from 8.2.37 to 18.2.41
    * Bump @typescript-eslint/eslint-plugin from 6.11.0 to 6.13.1
    * Bump @typescript-eslint/parser from 6.11.0 to 6.13.1
    * Bump eslint from 8.54.0 to 8.55.0
    * Bump typescript from 5.2.2 to 5.3.2

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.4...v2.5

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.5/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.5)

## [BookCars 2.4](https://github.com/aelassas/bookcars/releases/tag/v2.4) – 2023-11-18

* Updated MongoDB queries
* Updated nodemon configuration
* Updated dependencies
* API:
    * Bump @babel/preset-env from 7.23.2 to 7.23.3
    * Bump @types/bcrypt from 5.0.1 to 5.0.2
    * Bump @types/compression from 1.7.4 to 1.7.5
    * Bump @types/cookie-parser from 1.4.5 to 1.4.6
    * Bump @types/cors from 2.8.15 to 2.8.16
    * Bump @types/express from 4.17.20 to 4.17.21
    * Bump @types/jsonwebtoken from 9.0.4 to 9.0.5
    * Bump @types/multer from 1.4.9 to 1.4.10
    * Bump @types/node from 20.8.10 to 20.9.1
    * Bump @types/nodemailer from 6.4.13 to 6.4.14
    * Bump @types/uuid from 9.0.6 to 9.0.7
    * Bump @types/validator from 13.11.5 to 13.11.6
    * Bump @typescript-eslint/eslint-plugin from 6.9.1 to 6.11.0
    * Bump @typescript-eslint/parser from 6.9.1 to 6.11.0
    * Bump eslint from 8.52.0 to 8.54.0
    * Bump helmet from 7.0.0 to 7.1.0
    * Bump mongoose from 8.0.0 to 8.0.1
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.16 to 5.14.18
    * Bump @mui/material from 5.14.16 to 5.14.18
    * Bump @mui/x-data-grid from 6.17.0 to 6.18.1
    * Bump @mui/x-date-pickers from 6.17.0 to 6.18.1
    * Bump @types/draftjs-to-html from 0.8.3 to 0.8.4
    * Bump @types/html-to-draftjs from 1.4.2 to 1.4.3
    * Bump @types/node from 20.8.10 to 20.9.1
    * Bump @types/react from 18.2.34 to 18.2.37
    * Bump @types/react-dom from 18.2.14 to 18.2.15
    * Bump @types/react-draft-wysiwyg from 1.13.6 to 1.13.7
    * Bump @types/validator from 13.11.5 to 13.11.6
    * Bump axios from 1.6.0 to 1.6.2
    * Bump react-router-dom from 6.18.0 to 6.19.0
* Mobile app:
    * Bump @react-navigation/native-stack from 6.9.16 to 6.9.17
    * Bump @types/lodash.debounce from 4.0.8 to 4.0.9
    * Bump @types/mime from 3.0.3 to 3.0.4
    * Bump @types/react-native-dotenv from 0.2.1 to 0.2.2
    * Bump @types/react-native-vector-icons from 6.4.16 to 6.4.18
    * Bump @types/validator from 13.11.5 to 13.11.6
    * Bump axios from 1.6.0 to 1.6.2
    * Bump axios-retry from 3.8.1 to 3.9.1
    * Bump expo from 49.0.16 to 49.0.19
    * Bump react-native-vector-icons from 10.0.1 to 10.0.2
    * Bump @babel/core from 7.23.2 to 7.23.3
    * Bump @types/react from 18.2.34 to 18.2.37
    * Bump @typescript-eslint/eslint-plugin from 6.9.1 to 6.11.0
    * Bump @typescript-eslint/parser from 6.9.1 to 6.11.0
    * Bump eslint from 8.52.0 to 8.54.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.3...v2.4

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.4/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.4)

## [BookCars 2.3](https://github.com/aelassas/bookcars/releases/tag/v2.3) – 2023-11-02

* Added Babel transcompiler to api
* Updated eslint preset
* Updated backend, frontend and mobile components
* Updated documentation
* Updated dependencies
* API:
    * Bump @types/bcrypt from 5.0.0 to 5.0.1
    * Bump @types/compression from 1.7.3 to 1.7.4
    * Bump @types/cookie-parser from 1.4.4 to 1.4.5
    * Bump @types/cors from 2.8.14 to 2.8.15
    * Bump @types/express from 4.17.19 to 4.17.20
    * Bump @types/jsonwebtoken from 9.0.3 to 9.0.4
    * Bump @types/multer from 1.4.8 to 1.4.9
    * Bump @types/node from 20.8.6 to 20.8.10
    * Bump @types/nodemailer from 6.4.11 to 6.4.13
    * Bump @types/uuid from 9.0.5 to 9.0.6
    * Bump @types/validator from 13.11.3 to 13.11.5
    * Bump @typescript-eslint/eslint-plugin from 6.7.5 to 6.9.1
    * Bump @typescript-eslint/parser from 6.7.5 to 6.9.1
    * Bump eslint from 8.51.0 to 8.52.0
    * Bump eslint-plugin-import from 2.28.1 to 2.29.0
    * Bump mongoose from 7.6.2 to 8.0.0
    * Bump nodemailer from 6.9.6 to 6.9.7
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.13 to 5.14.16
    * Bump @mui/material from 5.14.13 to 5.14.16
    * Bump @mui/x-data-grid from 6.16.2 to 6.17.0
    * Bump @mui/x-date-pickers from 6.16.2 to 6.17.0
    * Bump @types/node from 20.8.6 to 20.8.10
    * Bump @types/react from 18.2.28 to 18.2.34
    * Bump @types/react-dom from 18.2.13 to 18.2.14
    * Bump @types/validator from 13.11.3 to 13.11.5
    * Bump axios from 1.5.1 to 1.6.0
    * Bump react-router-dom from 6.16.0 to 6.18.0
* Mobile app:
    * Bump @react-navigation/drawer from 6.6.4 to 6.6.6
    * Bump @react-navigation/native from 6.1.8 to 6.1.9
    * Bump @react-navigation/native-stack from 6.9.14 to 6.9.16
    * Bump @react-navigation/stack from 6.3.18 to 6.3.20
    * Bump @types/lodash.debounce from 4.0.7 to 4.0.8
    * Bump @types/mime from 3.0.2 to 3.0.3
    * Bump @types/react-native-dotenv from 0.2.0 to 0.2.1
    * Bump @types/react-native-vector-icons from 6.4.15 to 6.4.16
    * Bump @types/validator from 13.11.3 to 13.11.5
    * Bump axios from 1.5.1 to 1.6.0
    * Bump axios-retry from 3.8.0 to 3.8.1
    * Bump expo from 49.0.13 to 49.0.16
    * Bump expo-updates from 0.18.16 to 0.18.17
    * Bump react-native from 0.72.5 to 0.72.6
    * Bump react-native-paper from 5.10.6 to 5.11.1
    * Bump react-native-vector-icons from 10.0.0 to 10.0.1
    * Bump @types/react from 18.2.28 to 18.2.34
    * Bump @typescript-eslint/eslint-plugin from 6.7.5 to 6.9.1
    * Bump @typescript-eslint/parser from 6.7.5 to 6.9.1
    * Bump eslint from 8.51.0 to 8.52.0
    * Bump eslint-plugin-import from 2.28.1 to 2.29.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.2...v2.3

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.3/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.3)

## [BookCars 2.2](https://github.com/aelassas/bookcars/releases/tag/v2.2) – 2023-10-14

* Added `cors` and `allowedMethods` middlewares
* Fixed some issues related to bookings
* API:
    * Bump @types/express from 4.17.18 to 4.17.19
    * Bump @types/node from 20.8.3 to 20.8.6
    * Bump @types/validator from 13.11.2 to 13.11.3
    * Bump @typescript-eslint/eslint-plugin from 6.7.4 to 6.7.5
    * Bump @typescript-eslint/parser from 6.7.4 to 6.7.5
    * Bump mongoose from 7.6.0 to 7.6.2
    * Bump nodemailer from 6.9.5 to 6.9.6
    * Bump npm-check-updates from 16.14.5 to 16.14.6
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.12 to 5.14.13
    * Bump @mui/material from 5.14.12 to 5.14.13
    * Bump @mui/x-data-grid from 6.16.1 to 6.16.2
    * Bump @mui/x-date-pickers from 6.16.1 to 6.16.2
    * Bump @types/node from 20.8.3 to 20.8.6
    * Bump @types/react from 18.2.25 to 18.2.28
    * Bump @types/react-dom from 18.2.11 to 18.2.13
    * Bump @types/validator from 13.11.2 to 13.11.3
    * Bump npm-check-updates from 16.14.5 to 16.14.6
* Mobile app:
    * Bump @types/validator from 13.11.2 to 13.11.3
    * Bump @babel/core from 7.23.0 to 7.23.2
    * Bump @types/react from 18.2.25 to 18.2.28
    * Bump @typescript-eslint/eslint-plugin from 6.7.4 to 6.7.5
    * Bump @typescript-eslint/parser from 6.7.4 to 6.7.5

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.1...v2.2

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.2/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.2)

## [BookCars 2.1](https://github.com/aelassas/bookcars/releases/tag/v2.1) – 2023-10-09

* Secured the backend and the frontend against XSS, XST, CSRF and MITM
* Made localization more generic
* Updated eslint preset
* Updated dependencies
* Updated documentation
* Updated CI workflows
* API:
    * Bump @types/node from 20.8.2 to 20.8.3
    * Bump @types/uuid from 9.0.4 to 9.0.5
    * Bump eslint from 8.50.0 to 8.51.0
    * Bump mongoose from 7.5.3 to 7.6.0
    * Bump npm-check-updates from 16.14.4 to 16.14.5
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.11 to 5.14.12
    * Bump @mui/material from 5.14.11 to 5.14.12
    * Bump @mui/x-data-grid from 6.16.0 to 6.16.1
    * Bump @mui/x-date-pickers from 6.16.0 to 6.16.1
    * Bump @types/node from 20.8.2 to 20.8.3
    * Bump @types/react from 18.2.24 to 18.2.25
    * Bump @types/react-dom from 18.2.8 to 18.2.11
    * Bump npm-check-updates from 16.14.4 to 16.14.5
* Mobile app:
    * Bump expo-updates from 0.18.14 to 0.18.16
    * Bump @types/react from 18.2.24 to 18.2.25
    * Bump eslint from 8.50.0 to 8.51.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v2.0...v2.1

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.1/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.1)

## [BookCars 2.0](https://github.com/aelassas/bookcars/releases/tag/v2.0) – 2023-10-04

* Added airbnb preset
* Fixed an issue in cars page
* Fixed other issues in the api, the backend, the frontend and the mobile app
* API:
    * Bump @types/node from 20.8.0 to 20.8.2
    * Bump @typescript-eslint/eslint-plugin from 6.7.3 to 6.7.4
    * Bump @typescript-eslint/parser from 6.7.3 to 6.7.4
* Backend and frontend:
    * Bump @mui/x-data-grid from 6.15.0 to 6.16.0
    * Bump @mui/x-date-pickers from 6.15.0 to 6.16.0
    * Bump @types/node from 20.7.0 to 20.8.2
    * Bump @types/react from 18.2.23 to 18.2.24
    * Bump @types/react-dom from 18.2.7 to 18.2.8
    * Bump @types/react-google-recaptcha from 2.1.5 to 2.1.6
* Mobile app:
    * Bump expo from 49.0.11 to 49.0.13
    * Bump @types/mime from 3.0.1 to 3.0.2
    * Bump @types/react-native-vector-icons from 6.4.14 to 6.4.15
    * Bump react-native-size-matters from 0.4.0 to 0.4.2
    * Bump @types/react from 18.2.23 to 18.2.24
    * Bump @typescript-eslint/eslint-plugin from 6.7.3 to 6.7.4
    * Bump @typescript-eslint/parser from 6.7.3 to 6.7.4

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.9...v2.0

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v2.0/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v2.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v2.0)

## [BookCars 1.9](https://github.com/aelassas/bookcars/releases/tag/v1.9) – 2023-09-29

* Added jsdoc to the api, the backend, the frontend and the mobile app
* Upgrade to `node:lts-alpine`
* Fixed some issues related to cars, users and bookings
* Fixed some issues related to dates and times
* Fixed some issues related to checkout options
* Fixed some issues related to cancellation
* API:
    * Bump @types/express from 4.17.17 to 4.17.18
    * Bump @types/node from 20.6.3 to 20.7.0
    * Bump @types/nodemailer from 6.4.10 to 6.4.11
    * Bump @types/validator from 13.11.1 to 13.11.2
    * Bump mongoose from 7.5.2 to 7.5.3
    * Bump rimraf from 5.0.1 to 5.0.4
    * Bump @typescript-eslint/eslint-plugin from 6.7.2 to 6.7.3
    * Bump @typescript-eslint/parser from 6.7.2 to 6.7.3
    * Bump eslint from 8.49.0 to 8.50.0
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.9 to 5.14.11
    * Bump @mui/material from 5.14.10 to 5.14.11
    * Bump @mui/x-data-grid from 6.14.0 to 6.15.0
    * Bump @mui/x-date-pickers from 6.14.0 to 6.15.0
    * Bump @types/node from 20.6.3 to 20.7.0
    * Bump @types/react from 18.2.22 to 18.2.23
    * Bump @types/validator from 13.11.1 to 13.11.2
    * Bump axios from 1.5.0 to 1.5.1
* Mobile app:
    * Bump @react-navigation/drawer from 6.6.3 to 6.6.4
    * Bump @react-navigation/native from 6.1.7 to 6.1.8
    * Bump @react-navigation/native-stack from 6.9.13 to 6.9.14
    * Bump @react-navigation/stack from 6.3.17 to 6.3.18
    * Bump @types/validator from 13.11.1 to 13.11.2
    * Bump axios from 1.5.0 to 1.5.1
    * Bump react-native from 0.72.4 to 0.72.5
    * Bump @babel/core from 7.22.20 to 7.23.0
    * Bump @types/react from 18.2.22 to 18.2.23
    * Bump @typescript-eslint/eslint-plugin from 6.7.2 to 6.7.3
    * Bump @typescript-eslint/parser from 6.7.2 to 6.7.3
    * Bump eslint from 8.49.0 to 8.50.0

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.8...v1.9

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.9/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.9)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.9)

## [BookCars 1.8](https://github.com/aelassas/bookcars/releases/tag/v1.8) – 2023-09-21

* Added `build:android:preview` and `build:ios:preview` commands
* Updated api helper and user controller
* Updated bookcars-helper, bookcars-types and disable-react-devtools packages
* Fixed some issues related to users, cars and bookings in the backend
* Fixed some issues related to auto-complete dropdowns
* Fixed some issues related to search and filters
* Fixed some issues related to password reset
* Fixed some issues related to inifinite scroll
* API:
    * Bump @types/jsonwebtoken from 9.0.2 to 9.0.3
    * Bump @types/node from 20.6.0 to 20.6.3
    * Bump @types/nodemailer from 6.4.9 to 6.4.10
    * Bump mongoose from 7.5.0 to 7.5.2
    * Bump uuid from 9.0.0 to 9.0.1
    * Bump @typescript-eslint/eslint-plugin from 6.6.0 to 6.7.2
    * Bump @typescript-eslint/parser from 6.6.0 to 16.14.4
* Backend and frontend:
    * Bump @mui/icons-material from 5.14.8 to 5.14.9
    * Bump @mui/material from 5.14.8 to 5.14.10
    * Bump @mui/x-data-grid from 6.13.0 to 6.14.0
    * Bump @mui/x-date-pickers from 6.13.0 to 6.14.0
    * Bump @types/node from 20.6.0 to 20.6.3
    * Bump @types/react from 18.2.21 to 18.2.22
    * Bump react-router-dom from 6.15.0 to 6.16.0
* Mobile App:
    * Bump axios-retry from 3.7.0 to 3.8.0
    * Bump expo from 49.0.9 to 49.0.11
    * Bump expo-updates from 0.18.12 to 0.18.13
    * Bump i18n-js from 4.3.0 to 4.3.2
    * Bump react-native-paper from 5.10.4 to 5.10.6
    * Bump react-native-web from 0.19.8 to 0.19.9
    * Bump @babel/core from 7.22.17 to 7.22.20
    * Bump @types/react from 18.2.21 to 18.2.22
    * Bump @typescript-eslint/eslint-plugin from 6.6.0 to 6.7.2
    * Bump @typescript-eslint/parser from 6.6.0 to 6.7.2

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.7...v1.8

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.8/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.8)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.8)

## [BookCars 1.7](https://github.com/aelassas/bookcars/releases/tag/v1.7) – 2023-09-09

* Rewrite of the entire platform to TypeScript
* Upgrade to Expo 49.0.9
* Added eslint recommendation extension to vscode
* Updated Docker and eslint configurations
* Removed unused and obsolete npm packages
* Fixed some issues related to users, suppliers and locations
* Fixed some issues related to account activation
* Fixed some issues related to bookings and cancellation
* Fixed some issues related to deleting cars
* Bump jsonwebtoken from 9.0.1 to 9.0.2
* Bump mongoose from 7.4.5 to 7.5.0
* Bump multer from 1.4.4 to 1.4.5-lts.1
* Bump nodemailer from 6.9.4 to 6.9.5
* Bump eslint from 8.48.0 to 8.49.0
* Bump @mui/icons-material from 5.14.6 to 5.14.8
* Bump @mui/material form 5.14.6 to 5.14.8
* Bump @mui/x-data-grid from 6.12.0 to 6.13.0
* Bump @mui/x-date-pickers from 6.12.0 to 6.13.0
* Bump axios-retry from 3.6.1 to 3.7.0
* Bump expo from 49.0.8 to 49.0.9
* Bump react-native-paper from 5.10.0 to 5.10.4
* Bump react-native-root-toast from 3.4.1 to 3.5.1
* Bump react-native-web from 0.19.7 to 0.19.8

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.6...v1.7

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.7/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.7)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.7)

## [BookCars 1.6](https://github.com/aelassas/bookcars/releases/tag/v1.6) – 2023-08-27

* Added one supplier support to mobile app
* Fixed an issue in frontend Settings page
* Fixed some issues in the backend
* Bump eslint from 8.47.0 to 8.48.0
* Bump mongoose from 7.4.3 to 7.4.5
* Bump @mui/icons-material from 5.14.3 to 5.14.6
* Bump @mui/material from 5.14.5 to 5.14.6
* Bump @mui/x-data-grid from 6.11.2 to 6.12.0
* Bump @mui/x-date-pickers from 6.11.2 to 6.12.0
* Bump axios from 1.4.0 to 1.5.0
* Bump axios-retry from 3.6.0 to 3.6.1
* Bump expo from 49.0.7 to 49.0.8

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.5...v1.6

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.6/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.6)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.6)

## [BookCars 1.5](https://github.com/aelassas/bookcars/releases/tag/v1.5) – 2023-08-18

* Added pure functional components in mobile app
* Added prettier configuration
* Simplified localization
* Added Docker [SSL instructions](https://github.com/aelassas/bookcars/wiki/Docker#ssl)
* Updated [Docker configuration](https://github.com/aelassas/bookcars/wiki/Docker)
* Updated CreateCar and UpdateCar backend pages
* Updated Cars and Checkout frontend pages
* Updated backend and frontend configuration
* Fixed some issues in userController.js
* Fixed some issues in supplierController.js
* Fixed addtional driver issues
* Fixed VirtualizedList mobile issues
* Bump mongoose from 7.4.1 to 7.4.3
* Bump bcrypt from 5.1.0 to 5.1.1
* Bump validator from 13.9.0 to 13.11.0
* Bump eslint from 8.46.0 to 8.47.0
* Bump @mui/material from 5.14.2 to 5.14.5
* Bump @mui/icons-material from 5.14.1 to 5.14.3
* Bump @mui/x-date-pickers from 6.10.2 to 6.11.2
* Bump @mui/x-data-grid from 6.10.2 to 6.11.2
* Bump react-router-dom from 6.14.2 to 6.15.0
* Bump expo from 49.0.6 to 49.0.7
* Bump @babel/core from 7.12.9 to 7.22.9
* Bump axios-retry from 3.5.1 to 3.6.0
* Bump i18n-js from 3.9.2 to 4.3.0
* Bump react-native-dotenv from 3.3.1 to 3.4.9
* Bump react-native-gesture-handler from 2.12.0 to 2.12.1
* Bump react-native-paper from 5.9.1 to 5.10.0
* Bump react-native-root-toast from 3.4.0 to 3.4.1
* Bump react-native-web from 0.19.6 to 0.19.7

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.4...v1.5

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.5/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.5)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.5)

## [BookCars 1.4](https://github.com/aelassas/bookcars/releases/tag/v1.4) – 2023-08-02

* Added [Docker support](https://github.com/aelassas/bookcars/wiki/Docker)
* Added eslint
* Upgrade to Expo 49.0.6
* Updated robots.txt
* Updated userController.js
* Updated bookingController.js
* Updated carController.js
* Updated locationController.js
* Updated notificationController.js
* Renamed CreateBooking to Checkout
* Optimized mobile images
* Fixed additional driver checkout issues
* Fixed DatePicker and DateTimePicker issues
* Fixed error handling issues
* Fixed some layout issues
* Fixed useNavigate issues
* Fixed supplier issues
* Fixed carController.js issues
* Fixed booking issues
* Fixed splash screen issues
* Fixed package-lock.json issues
* Bump @mui/x-date-pickers from 6.10.1 to 6.10.2
* Bump @mui/x-data-grid from 6.10.1 to 6.10.2
* Bump expo from 49.0.5 to 49.0.6
* Bump expo-splash-screen from 0.20.4 to 0.20.5

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.3...v1.4

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.4/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.4)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.4)

## [BookCars 1.3](https://github.com/aelassas/bookcars/releases/tag/v1.3) – 2023-07-27

* Upgrade to Expo SDK 49.0.5
* Added one supplier only support
* Added REACT_APP_BC_PAGINATION_MODE setting option
* Added REACT_APP_BC_RECAPTCHA_ENABLED setting option
* Added classic pagination
* Added infinite scroll pagination
* Added useNavigate
* Updated global layout
* Updated header style
* Updated fs/promises
* Updated bookingController.js
* Updated carController.js
* Updated locationController.js
* Updated notificationController.js
* Updated supplierController.js
* Updated userController.js
* Fixed image layout issues
* Bump mongoose from 7.3.4 to 7.4.1
* Bump nodemailer from 6.9.3 to 6.9.4
* Bump @mui/icons-material from 5.14.0 to 5.14.1
* Bump @mui/material from 5.14.0 to 5.14.2
* Bump @mui/x-data-grid from 6.10.0 to 6.10.1
* Bump @mui/x-date-pickers from 6.10.0 to 6.10.1
* Bump expo from 49.0.0 to 49.0.5
* Bump expo-image-picker from 14.3.1 to 14.3.2
* Bump expo-updates from 0.18.10 to 0.18.11

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.2...v1.3

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.3/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.3)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.3)

## [BookCars 1.2](https://github.com/aelassas/bookcars/releases/tag/v1.2) – 2023-07-18

* Upgrade to Expo SDK 49
* Added axios retries
* Updated push notifications
* Fixed splash screen issues
* Fixed expo update issues
* Fixed cars screen issues
* Fixed bookings screen issues
* Fixed settings screen issues
* Bump @react-native-async-storage/async-storage from 1.17.3 to 1.18.2
* Bump @react-native-community/datetimepicker from 6.1.2 to 7.2.0
* Bump @react-navigation/drawer from 6.4.1 to 6.6.3
* Bump @react-navigation/native from 6.0.10 to 6.1.7
* Bump @react-navigation/native-stack from 6.6.2 to 6.9.13
* Bump axios from 0.27.2 to 1.4.0
* Bump date-fns from 2.28.0 to 2.30.0
* Bump expo from 45.0.0 to 49.0.0
* Bump expo-asset from 8.5.0 to 8.10.1
* Bump expo-constants from 13.1.1 to 14.4.2
* Bump expo-device from 4.2.0 to 5.4.0
* Bump expo-image-picker from 13.1.1 to 14.3.1
* Bump expo-localization from 13.0.0 to 14.3.0
* Bump expo-notifications from 0.15.4 to 0.20.1
* Bump expo-splash-screen from 0.15.1 to 0.20.4
* Bump expo-status-bar from 1.3.0 to 1.6.0
* Bump expo-updates from 0.13.4 to 0.18.10
* Bump react from 17.0.2 to 18.2.0
* Bump react-dom 17.0.2 to 18.2.0
* Bump react-native from 0.68.2 to 0.72.3
* Bump react-native-gesture-handler from 2.2.1 to 2.12.0
* Bump react-native-paper from 4.12.1 to 5.9.1
* Bump react-native-reanimated from 2.8.0 to 3.3.0
* Bump react-native-safe-area-context from 4.2.4 to 4.6.3
* Bump react-native-screens from 3.11.1 to 3.22.0
* Bump react-native-web from 0.17.7 to 0.19.6
* Bump validator from 13.7.0 to 13.9.0
* Bump mongoose from 7.3.2 to 7.3.4
* Bump nodemon from 2.0.22 to 3.0.1
* Bump @mui/icons-material from 5.13.7 to 5.14.0
* Bump @mui/material from 5.13.7 to 5.14.0
* Bump @mui/x-data-grid from 6.9.2 to 6.10.0
* Bump @mui/x-date-pickers from 6.9.2 to 6.10.0
* Bump react-router-dom from 6.14.1 to 6.14.2

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.1...v1.2

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.2/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.2)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.2)

## [BookCars 1.1](https://github.com/aelassas/bookcars/releases/tag/v1.1) – 2023-07-08

* Updated DatePicker and DateTimePicker components
* Fixed some issues in bookingController.js
* Fixed localization issues
* Bumped jsonwebtoken to 9.0.1
* Bumped mongoose to 7.3.2
* Bumped @mui/icons-material to 5.13.7
* Bumped @mui/material to 5.13.7
* Bumped @mui/x-data-grid to 6.9.2
* Bumped @mui/x-date-pickers to 6.9.2
* Bumped react-router-dom to 6.14.1

**Full Changelog**: https://github.com/aelassas/bookcars/compare/v1.0...v1.1

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.1/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.1)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.1)

## [BookCars 1.0](https://github.com/aelassas/bookcars/releases/tag/v1.0) – 2023-06-15

Initial release

### Assets
- [bookcars-db.zip](https://github.com/aelassas/bookcars/releases/download/v1.0/bookcars-db.zip) (9.72 MB)

### Source Code
- [Source code (zip)](https://api.github.com/repos/aelassas/bookcars/zipball/v1.0)
- [Source code (tar)](https://api.github.com/repos/aelassas/bookcars/tarball/v1.0)
