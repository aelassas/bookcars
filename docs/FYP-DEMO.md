# SafarRent FYP demonstration (native Windows)

This is the primary local setup and does not require Docker. It uses synthetic demo accounts and cars. It does not represent real rental suppliers, verified vehicles, payment collection, or fulfilled trips. Disclose that distinction during the presentation.

## 1. Start native MongoDB

Install MongoDB Community as a Windows service and configure replica set `rs0`. The app connects to `mongodb://127.0.0.1:27017/safarrent?replicaSet=rs0`. Start the service from an Administrator PowerShell only if it is stopped:

```powershell
Start-Service MongoDB
```

The demo uses MongoDB on port `27017`; it does not require Redis. Redis is lazy-connected and rate limiting fails open in development when Redis is absent. The FYP demo suppresses outbound booking emails and uses persisted in-app notifications.

## 2. Seed the sample fleet (only when needed)

The local `.env` files are configured for the native SafarRent database. From `D:\bookcars\backend`, run:

```powershell
$env:NODE_ENV = 'development'
$env:BC_ENABLE_FYP_DEMO = 'true'
$env:BC_DB_URI = 'mongodb://127.0.0.1:27017/safarrent?replicaSet=rs0'
npm run seed:fyp-demo
```

The seeder is idempotent for its named synthetic demo records. It does not remove bookings or other collections. Do not point it at production or shared data. The local database currently has 12 cars, 11 locations, and 3 of the expected demo accounts.

## 2.1 CDN file storage

The backend stores uploaded images (car photos, supplier avatars, licenses) in a local CDN directory. For native Windows the `.env` defaults to `D:/bookcars/cdn/safarrent/`. Ensure the directory tree exists:

```powershell
# Run once; harmless if the directories already exist.
foreach ($sub in 'users','temp/users','cars','temp/cars','locations','temp/locations','contracts','temp/contracts','licenses','temp/licenses') {
  New-Item -ItemType Directory -Force -Path "D:\bookcars\cdn\safarrent\$sub" | Out-Null
}
```

The `cdn/` directory is git-ignored. For Docker, the `.env.docker` overrides these to `/var/www/cdn/bookcars/` paths inside the container volume.

## 3. Start the three app services

Open three PowerShell terminals in `D:\bookcars`. MongoDB should already be running. Run one command block per terminal.

### Terminal A — API (port 4002)

```powershell
Set-Location D:\bookcars\backend
$env:NODE_OPTIONS = '--max-old-space-size=1024'
$env:NODE_ENV = 'development'
$env:BC_PORT = '4002'
$env:BC_DB_URI = 'mongodb://127.0.0.1:27017/safarrent?replicaSet=rs0'
$env:BC_ENABLE_FYP_DEMO = 'true'
$env:BC_FYP_DEMO_MODE = 'true'
$env:BC_AUTO_VERIFY_ON_SIGNUP = 'true'
$env:BC_ADMIN_HOST = 'http://localhost:3001/'
$env:BC_FRONTEND_HOST = 'http://localhost:8080/'
$env:BC_AI_PROVIDER = 'ollama'
$env:BC_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$env:BC_OLLAMA_MODEL = 'qwen3:0.6b'
$env:BC_OLLAMA_TIMEOUT_MS = '8000'
.\node_modules\.bin\nodemon.cmd
```

### Terminal B — customer app (port 8080)

```powershell
Set-Location D:\bookcars\frontend
$env:VITE_BC_API_HOST = 'http://localhost:4002'
.\node_modules\.bin\vite.cmd --host 0.0.0.0 --port 8080 --strictPort
```

### Terminal C — operations portal (port 3001)

```powershell
Set-Location D:\bookcars\admin
$env:VITE_BC_API_HOST = 'http://localhost:4002'
.\node_modules\.bin\vite.cmd --host 0.0.0.0 --port 3001 --strictPort
```

Open `http://localhost:8080` for customers and `http://localhost:3001` for operations. The API landing page is `http://localhost:4002`.

#### Quick Launch via npm prefix commands

Alternatively, from the repository root `D:\bookcars`, you can run the three standard dev commands directly in separate PowerShell terminals (with environment defaults loaded from each folder's `.env`):

```powershell
# Terminal A — Backend API (port 4002)
npm --prefix backend run dev

# Terminal B — Customer Frontend (port 8080)
npm --prefix frontend run dev

# Terminal C — Operations Admin Portal (port 3001)
npm --prefix admin run dev
```

Or run the automated LAN startup script:
```powershell
.\scripts\start-lan-demo.ps1 -Launch
```

If a port is already in use, close the previous SafarRent terminal before starting another copy. Do not run the Docker Compose launcher for this native setup.

## Demo accounts

All seeded demo accounts use the password printed by the seed command. Unless `BC_FYP_DEMO_PASSWORD` is set, the development-only default is `SafarRent-Demo-2026!`.

| Role | Login | App |
|---|---|---|
| Supplier operations | `sahiwal@safarrent.pk` | `http://localhost:3001` |
| Customer | `demo-customer@safarrent.local` | `http://localhost:8080` |
| Administrator | `demo-admin@safarrent.local` | `http://localhost:3001` |

Additional synthetic supplier records exercise searches in Lahore, Islamabad, Karachi, and northern Pakistan. Demo-only search visibility is gated by both `NODE_ENV=development` and `BC_ENABLE_FYP_DEMO=true`; it does not mark the synthetic suppliers as verified.

## Five-minute presentation flow

1. Sign in as the demo customer and search future dates to show sample Pakistani listings.
2. Choose self-drive or with-driver and a trip scope; review the server-calculated PKR quote.
3. Submit a demo CNIC and driving-license number for self-drive, then approve KYC in the admin customer view.
4. Create a booking request and confirm a simulated JazzCash, Easypaisa, Raast/bank-transfer, or demo-card payment. Show the `SR-DEMO-*` receipt and printable e-Parchi.
5. Open booking details in operations, save the handover inspection, and return to the customer account to show persisted status.

AI trip intake creates a draft only. It does not check inventory, calculate the booking quote, or create a booking. With Ollama offline or unavailable, the API labels its deterministic result `rules-fallback`. A northern route may be flagged for operator review even when its city is not yet in the local location catalog.

## Local AI intake (optional)

If native Ollama is installed, configure its model storage on a drive with space, pull `qwen3:0.6b`, and confirm that `http://127.0.0.1:11434` responds. If Ollama is unavailable, booking intake falls back to deterministic rules after the configured timeout. The API remains usable; AI output must remain a draft for human review.

The current local workstation may not have Ollama installed. Do not claim live model inference unless the local Ollama service is running; the fallback response should be demonstrated honestly.

## Simulated payment, KYC, and operations

Checkout calculates the PKR quote on the server from the selected car, supplier pricing, dates, rental mode, and trip scope. Self-drive bookings require a valid CNIC, driving-license number, and admin-approved KYC. With-driver bookings require a valid CNIC. The local payment flow stores an `SR-DEMO-*` reference and simulates payment state only. It does not contact a provider or move money. Supplier accounts and cars are synthetic; they are not real-world verified listings.

The admin booking page saves fuel level, odometer, spare-tire status, and exterior notes to the handover checklist. Do not use real identity or payment information in this local demonstration.

## Optional Docker workflow for teammates

Docker Compose and Dockerfiles remain in the repository for teammates who choose a container setup. They are not part of this native Windows workflow. See `docker-compose.dev.yml` and the `.env.docker.example` files for that optional setup; never mix Docker hostnames with the native MongoDB URI.

## Cleanup

The seed is intentionally non-destructive because demo records may be referenced by bookings. For a clean evaluation dataset, use a dedicated local demo database. Do not drop or reset shared or production data.
