import 'dotenv/config'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/utils/databaseHelper'
import User from '../src/models/User'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import Country from '../src/models/Country'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'
import Token from '../src/models/Token'
import PushToken from '../src/models/PushToken'
import AdditionalDriver from '../src/models/AdditionalDriver'
import BankDetails from '../src/models/BankDetails'
import Setting from '../src/models/Setting'

async function audit() {
  const connected = await databaseHelper.connect(env.DB_URI, env.DB_SSL, env.DB_DEBUG)
  if (!connected) {
    console.error('Failed to connect to database at', env.DB_URI)
    process.exit(1)
  }

  console.log('=== DATABASE AUDIT REPORT ===')
  console.log('Connected to:', env.DB_URI.replace(/\/\/.*@/, '//<credentials>@'))
  console.log('Database Name:', mongoose.connection.db?.databaseName)

  // 1. Collections & counts
  const rawCollections = await mongoose.connection.db?.listCollections().toArray() || []
  console.log('\n--- Collections and Document Counts ---')
  const collectionCounts: Record<string, number> = {}
  for (const col of rawCollections) {
    const count = await mongoose.connection.db?.collection(col.name).countDocuments() || 0
    collectionCounts[col.name] = count
    console.log(`  - ${col.name.padEnd(25)}: ${count}`)
  }

  // 2. Users Audit
  console.log('\n--- Users Audit ---')
  const users = await User.find({}).lean()
  const admins = users.filter(u => u.type === bookcarsTypes.UserType.Admin)
  const suppliers = users.filter(u => u.type === bookcarsTypes.UserType.Supplier)
  const customers = users.filter(u => u.type === bookcarsTypes.UserType.User)

  console.log(`Total Users: ${users.length}`)
  console.log(`  - Admins (${admins.length}):`)
  admins.forEach(a => console.log(`      * [${a._id}] ${a.email} (${a.fullName}) - Active: ${a.active}, Verified: ${a.verified}`))
  
  console.log(`  - Suppliers (${suppliers.length}):`)
  suppliers.forEach(s => console.log(`      * [${s._id}] ${s.email} (${s.fullName}) - Active: ${s.active}, Verified: ${s.verified}, PayLater: ${s.payLater}`))

  console.log(`  - Customers (${customers.length}):`)
  customers.forEach(c => console.log(`      * [${c._id}] ${c.email} (${c.fullName}) - Active: ${c.active}, Verified: ${c.verified}`))

  // 3. Countries & Locations Audit
  console.log('\n--- Countries & Locations Audit ---')
  const countries = await Country.find({}).populate<{ values: env.LocationValue[] }>('values').lean()
  console.log(`Total Countries: ${countries.length}`)
  countries.forEach(c => {
    const names = c.values?.map(v => `${v.language}:${v.value}`).join(', ') || 'No values'
    console.log(`  - Country [${c._id}]: ${names}`)
  })

  const locations = await Location.find({}).populate<{ values: env.LocationValue[] }>('values').lean()
  console.log(`Total Locations: ${locations.length}`)
  locations.forEach(l => {
    const names = l.values?.map(v => `${v.language}:${v.value}`).join(', ') || 'No values'
    console.log(`  - Location [${l._id}] in Country [${l.country}]: ${names}`)
  })

  // 4. Cars Audit
  console.log('\n--- Cars Audit ---')
  const cars = await Car.find({}).lean()
  console.log(`Total Cars: ${cars.length}`)
  cars.forEach(car => {
    console.log(`  - Car [${car._id}] "${car.name}" - Supplier: ${car.supplier}, Available: ${car.available}, DailyPrice: ${car.dailyPrice}, Locations: [${car.locations?.join(', ')}]`)
  })

  // 5. Bookings Audit
  console.log('\n--- Bookings Audit ---')
  const bookings = await Booking.find({}).lean()
  console.log(`Total Bookings: ${bookings.length}`)
  bookings.forEach(b => {
    console.log(`  - Booking [${b._id}]: Status: ${b.status}, Driver: ${b.driver}, Car: ${b.car}, Supplier: ${b.supplier}, From: ${b.from?.toISOString?.() || b.from} To: ${b.to?.toISOString?.() || b.to}, Price: ${b.price}`)
  })

  // 6. Additional Records
  console.log('\n--- Additional Records ---')
  const notifsCount = await Notification.countDocuments()
  const notifCountersCount = await NotificationCounter.countDocuments()
  const tokensCount = await Token.countDocuments()
  const pushTokensCount = await PushToken.countDocuments()
  const additionalDriversCount = await AdditionalDriver.countDocuments()
  const bankDetailsCount = await BankDetails.countDocuments()
  const settingsCount = await Setting.countDocuments()
  const locValuesCount = await LocationValue.countDocuments()

  console.log(`  - Notifications: ${notifsCount}`)
  console.log(`  - NotificationCounters: ${notifCountersCount}`)
  console.log(`  - Tokens: ${tokensCount}`)
  console.log(`  - PushTokens: ${pushTokensCount}`)
  console.log(`  - AdditionalDrivers: ${additionalDriversCount}`)
  console.log(`  - BankDetails: ${bankDetailsCount}`)
  console.log(`  - Settings: ${settingsCount}`)
  console.log(`  - LocationValues: ${locValuesCount}`)

  // 7. Reference Integrity Checks
  console.log('\n--- Reference Integrity & Broken References ---')
  let brokenRefs = 0

  // Check cars
  for (const car of cars) {
    const sup = await User.findById(car.supplier)
    if (!sup) {
      console.log(`  [BROKEN] Car ${car._id} references non-existent supplier ${car.supplier}`)
      brokenRefs++
    } else if (sup.type !== bookcarsTypes.UserType.Supplier) {
      console.log(`  [INVALID] Car ${car._id} supplier ${car.supplier} is not of type Supplier (is: ${sup.type})`)
      brokenRefs++
    }
    for (const locId of car.locations || []) {
      const loc = await Location.findById(locId)
      if (!loc) {
        console.log(`  [BROKEN] Car ${car._id} references non-existent location ${locId}`)
        brokenRefs++
      }
    }
  }

  // Check locations
  for (const loc of locations) {
    const cty = await Country.findById(loc.country)
    if (!cty) {
      console.log(`  [BROKEN] Location ${loc._id} references non-existent country ${loc.country}`)
      brokenRefs++
    }
  }

  // Check bookings
  for (const b of bookings) {
    const driver = await User.findById(b.driver)
    if (!driver) {
      console.log(`  [BROKEN] Booking ${b._id} references non-existent driver ${b.driver}`)
      brokenRefs++
    }
    const car = await Car.findById(b.car)
    if (!car) {
      console.log(`  [BROKEN] Booking ${b._id} references non-existent car ${b.car}`)
      brokenRefs++
    }
    const sup = await User.findById(b.supplier)
    if (!sup) {
      console.log(`  [BROKEN] Booking ${b._id} references non-existent supplier ${b.supplier}`)
      brokenRefs++
    }
    const pLoc = await Location.findById(b.pickupLocation)
    if (!pLoc) {
      console.log(`  [BROKEN] Booking ${b._id} references non-existent pickup location ${b.pickupLocation}`)
      brokenRefs++
    }
    const dLoc = await Location.findById(b.dropOffLocation)
    if (!dLoc) {
      console.log(`  [BROKEN] Booking ${b._id} references non-existent drop-off location ${b.dropOffLocation}`)
      brokenRefs++
    }
  }

  if (brokenRefs === 0) {
    console.log('  No broken references detected.')
  }

  // 8. Seed Manifest Check
  const manifest = await mongoose.connection.db?.collection('BookCarsDevSeed').findOne({ _id: 'bookcars-dev-seed-v1' as any })
  console.log('\n--- Seed Manifest (BookCarsDevSeed) ---')
  if (manifest) {
    console.log('  Manifest found:', JSON.stringify(manifest, null, 2))
  } else {
    console.log('  No BookCarsDevSeed manifest found.')
  }

  await databaseHelper.close()
  console.log('\n=== AUDIT FINISHED ===')
}

audit().catch(console.error)
