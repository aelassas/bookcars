# BookCars Development Database Seeding & Testing Guide

This document explains how to safely seed, inspect, verify, and clean up sample development data in **BookCars** for end-to-end local and Docker testing.

---

## 1. Overview & Architecture

The BookCars development database seeding workflow creates a complete, realistic dataset across all entities required by the system:
- **Supplier Account**: Active and verified supplier with fleet management permissions.
- **Location & Country**: Multilingual (English/French) country and pickup/drop-off locations.
- **Car Fleet**: Multiple vehicle tiers (Mini, Midi) across transmission and fuel types (Manual, Automatic, Gasoline, Electric).
- **Customer Account**: Active and verified customer driver account ready for sign-in and bookings.
- **Bookings & Reservations**: Sample reservations covering multiple lifecycle statuses (`Paid`, `Deposit`, `PaidInFull`, `Cancelled`) with valid dates and price configurations.
- **Additional Drivers & Notifications**: Additional driver records and in-app notifications with unread counter sync.

---

## 2. Safety & Isolation Guarantee

The seed workflow conforms to strict safety standards:
1. **Environment Gate**: Only executes when `NODE_ENV=development`.
2. **Dedicated Manifest Ownership (`BookCarsDevSeed`)**: Every created record ID is recorded in the `BookCarsDevSeed` collection manifest (`_id: 'bookcars-dev-seed-v1'`).
3. **Non-Destructive Cleanup**: Cleanup deletes *only* records tracked by the seed manifest. Pre-existing admin accounts, locations, or non-seed data are never touched.
4. **Idempotency**: Running `npm run seed:dev` repeatedly checks existing records and does not produce duplicate entries.

---

## 3. Seeded Accounts & Credentials

| Role | Email | Password | Access Level & App URL |
|---|---|---|---|
| **Admin** | `admin@bookcars.ma` | `B00kC4r5` | Admin Panel (`http://localhost:3001` or `http://localhost:3001/`) |
| **Supplier** | `dev-seed-supplier@bookcars.ma` | `B00kC4r5` | Supplier Admin Panel (`http://localhost:3001`) |
| **Customer** | `dev-seed-customer@bookcars.ma` | `B00kC4r5` | Frontend App (`http://localhost:8080` or `http://localhost:3002`) |

---

## 4. Commands Reference

### From Repository Root:
```bash
# Seed development data
npm run seed:dev

# Clean up all seeded development data
npm run clean:dev
```

### From `backend/` Directory:
```bash
# Seed development data
npm run seed:dev

# Clean up development data
npm run clean:dev

# Audit database records and reference integrity
npx tsx scripts/audit-db.ts
```

---

## 5. Localhost Application URLs

Based on the actual project configuration in `.env` and Docker Compose:

- **Frontend Application**: [http://localhost:8080](http://localhost:8080) (Docker) / [http://localhost:3002](http://localhost:3002) (Local Dev)
- **Admin Panel**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:4002](http://localhost:4002)
- **Mongo Express**: [http://localhost:8084](http://localhost:8084) (Credentials: `admin` / `admin`)
- **MongoDB**: `127.0.0.1:27018` (Host Port mapped to Container `27017`)

---

## 6. Verification Checklist

To confirm the setup is working:
1. Run `npm run seed:dev` and verify log outputs `Development seed completed successfully.`
2. Run `npx tsx backend/scripts/audit-db.ts` to inspect all collection counts and reference integrity.
3. Open `http://localhost:3001` and log in as `admin@bookcars.ma` or `dev-seed-supplier@bookcars.ma` with `B00kC4r5` to inspect suppliers, cars, and bookings.
4. Open `http://localhost:8080` (or `http://localhost:3002`), log in as `dev-seed-customer@bookcars.ma` with `B00kC4r5`, and view your bookings under "My Bookings".
5. Run `npm run clean:dev` to safely remove all demo records when testing is complete.
