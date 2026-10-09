import 'dotenv/config'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as authHelper from '../src/utils/authHelper'
import * as logger from '../src/utils/logger'
import Car from '../src/models/Car'
import Country from '../src/models/Country'
import User from '../src/models/User'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'

const SEED_ID = 'bookcars-dev-seed-v1'
const SEED_COLLECTION = 'BookCarsDevSeed'
const DEV_SUPPLIER_EMAIL = process.env.SEED_DEV_SUPPLIER_EMAIL || 'dev-seed-supplier@bookcars.ma'
const DEV_CUSTOMER_EMAIL = process.env.SEED_DEV_CUSTOMER_EMAIL || 'dev-seed-customer@bookcars.ma'
const DEFAULT_DEV_PASSWORD = process.env.SEED_DEV_PASSWORD || 'B00kC4r5'

type SeedManifest = {
  [key: string]: any
  _id: string
  supplierId?: mongoose.Types.ObjectId
  customerId?: mongoose.Types.ObjectId
  locationId?: mongoose.Types.ObjectId
  countryId?: mongoose.Types.ObjectId
  locationValueIds?: mongoose.Types.ObjectId[]
  countryValueIds?: mongoose.Types.ObjectId[]
  carIds?: mongoose.Types.ObjectId[]
  bookingIds?: mongoose.Types.ObjectId[]
  additionalDriverIds?: mongoose.Types.ObjectId[]
  notificationIds?: mongoose.Types.ObjectId[]
  ownsSupplier?: boolean
  ownsCustomer?: boolean
  ownsLocation?: boolean
  ownsCountry?: boolean
  createdAt?: Date
}

const seedCars = [
  {
    name: 'Volkswagen Golf',
    dailyPrice: 35,
    deposit: 200,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Manual,
    seats: 5,
    doors: 4,
    range: bookcarsTypes.CarRange.Mini,
    mileage: 250,
    cancellation: 0,
    amendments: 0,
    theftProtection: 10,
    collisionDamageWaiver: 15,
    fullInsurance: 25,
    additionalDriver: 5,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    image: 'car1.png',
  },
  {
    name: 'Toyota Camry',
    dailyPrice: 55,
    deposit: 350,
    type: bookcarsTypes.CarType.Gasoline,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    seats: 5,
    doors: 4,
    range: bookcarsTypes.CarRange.Midi,
    mileage: 300,
    cancellation: 0,
    amendments: 0,
    theftProtection: 12,
    collisionDamageWaiver: 18,
    fullInsurance: 30,
    additionalDriver: 7,
    fuelPolicy: bookcarsTypes.FuelPolicy.FullToFull,
    image: 'car2.png',
  },
  {
    name: 'Tesla Model 3',
    dailyPrice: 65,
    deposit: 400,
    type: bookcarsTypes.CarType.Electric,
    gearbox: bookcarsTypes.GearboxType.Automatic,
    seats: 5,
    doors: 4,
    range: bookcarsTypes.CarRange.Mini,
    mileage: 200,
    cancellation: 0,
    amendments: 0,
    theftProtection: 12,
    collisionDamageWaiver: 20,
    fullInsurance: 35,
    additionalDriver: 7,
    fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
    image: 'car3.png',
  },
]

const createSeedSupplier = async () => {
  const passwordHash = await authHelper.hashPassword(DEFAULT_DEV_PASSWORD)
  return User.create({
    email: DEV_SUPPLIER_EMAIL,
    fullName: process.env.SEED_DEV_SUPPLIER_NAME || 'Apex Car Rentals',
    password: passwordHash,
    avatar: 'supplier.png',
    language: env.DEFAULT_LANGUAGE,
    type: bookcarsTypes.UserType.Supplier,
    active: true,
    verified: true,
    payLater: true,
  })
}

const createSeedCustomer = async () => {
  const passwordHash = await authHelper.hashPassword(DEFAULT_DEV_PASSWORD)
  return User.create({
    email: DEV_CUSTOMER_EMAIL,
    fullName: process.env.SEED_DEV_CUSTOMER_NAME || 'Alex Morgan',
    password: passwordHash,
    avatar: 'customer.png',
    phone: process.env.SEED_DEV_CUSTOMER_PHONE || '+12025550123',
    language: env.DEFAULT_LANGUAGE,
    type: bookcarsTypes.UserType.User,
    active: true,
    verified: true,
  })
}

const createSeedLocation = async (supplierId: mongoose.Types.ObjectId) => {
  const countryValues = await LocationValue.create([
    { language: 'en', value: 'United States' },
    { language: 'fr', value: 'États-Unis' },
  ])
  const country = await Country.create({
    values: countryValues.map((value) => value._id),
    supplier: supplierId,
  })
  const locationValues = await LocationValue.create([
    { language: 'en', value: 'San Francisco Airport (SFO)' },
    { language: 'fr', value: 'Aéroport de San Francisco (SFO)' },
  ])
  const location = await Location.create({
    country: country._id,
    values: locationValues.map((value) => value._id),
    supplier: supplierId,
    latitude: 37.7749,
    longitude: -122.4194,
    image: 'location.png',
  })

  return {
    country,
    location,
    countryValues,
    locationValues,
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Development seed commands require NODE_ENV=development.')
  }

  const connected = await databaseHelper.connect(
    env.DB_URI,
    env.DB_SSL,
    env.DB_DEBUG,
  )

  if (!connected) {
    throw new Error(
      'MongoDB connection failed. Check backend/.env and DB_URI.',
    )
  }

  try {
    const manifestCollection =
      mongoose.connection.collection<SeedManifest>(SEED_COLLECTION)

    let manifest = await manifestCollection.findOne({
      _id: SEED_ID,
    })

    if (!manifest) {
      // 1. Supplier
      let supplier = await User.findOne({
        type: bookcarsTypes.UserType.Supplier,
        active: true,
      })
      let ownsSupplier = false

      if (!supplier) {
        const existingSeedSupplier = await User.findOne({ email: DEV_SUPPLIER_EMAIL })
        if (existingSeedSupplier) {
          if (existingSeedSupplier.type !== bookcarsTypes.UserType.Supplier || !existingSeedSupplier.active) {
            throw new Error('The development seed supplier exists but is not active and valid.')
          }
          supplier = existingSeedSupplier
          if (!supplier.avatar) {
            supplier.avatar = 'supplier.png'
          }
          if (supplier.fullName === '[DEV SEED] Supplier') {
            supplier.fullName = process.env.SEED_DEV_SUPPLIER_NAME || 'Apex Car Rentals'
          }
          await supplier.save()
        } else {
          supplier = await createSeedSupplier()
          ownsSupplier = true
        }
      } else {
        let changed = false
        if (!supplier.avatar) {
          supplier.avatar = 'supplier.png'
          changed = true
        }
        if (supplier.fullName === '[DEV SEED] Supplier') {
          supplier.fullName = process.env.SEED_DEV_SUPPLIER_NAME || 'Apex Car Rentals'
          changed = true
        }
        if (changed) {
          await supplier.save()
        }
      }

      // 2. Customer
      let customer = await User.findOne({
        type: bookcarsTypes.UserType.User,
        active: true,
      })
      let ownsCustomer = false

      if (!customer) {
        const existingSeedCustomer = await User.findOne({ email: DEV_CUSTOMER_EMAIL })
        if (existingSeedCustomer) {
          customer = existingSeedCustomer
          if (!customer.avatar) {
            customer.avatar = 'customer.png'
            await customer.save()
          }
        } else {
          customer = await createSeedCustomer()
          ownsCustomer = true
        }
      } else if (!customer.avatar) {
        customer.avatar = 'customer.png'
        await customer.save()
      }

      // 3. Country & Location
      const location = await Location.findOne({})
      let locationId = location?._id
      let countryId: mongoose.Types.ObjectId | undefined
      let locationValueIds: mongoose.Types.ObjectId[] | undefined
      let countryValueIds: mongoose.Types.ObjectId[] | undefined
      let ownsLocation = false
      let ownsCountry = false

      if (!location) {
        const seedLocation = await createSeedLocation(supplier._id)
        locationId = seedLocation.location._id
        countryId = seedLocation.country._id
        locationValueIds = seedLocation.locationValues.map((value) => value._id)
        countryValueIds = seedLocation.countryValues.map((value) => value._id)
        ownsLocation = true
        ownsCountry = true
      }

      await manifestCollection.insertOne({
        _id: SEED_ID,
        supplierId: supplier._id,
        customerId: customer._id,
        locationId,
        countryId,
        locationValueIds,
        countryValueIds,
        carIds: [],
        bookingIds: [],
        additionalDriverIds: [],
        notificationIds: [],
        ownsSupplier,
        ownsCustomer,
        ownsLocation,
        ownsCountry,
        createdAt: new Date(),
      })

      manifest = await manifestCollection.findOne({
        _id: SEED_ID,
      })

      if (!manifest) {
        throw new Error('Could not create the seed manifest.')
      }
    }

    const supplierId = manifest.supplierId
    const customerId = manifest.customerId
    const locationId = manifest.locationId
    const carIds = manifest.carIds ?? []
    const bookingIds = manifest.bookingIds ?? []

    if (!supplierId || !locationId || !customerId) {
      throw new Error(
        'Seed manifest is missing supplier or location IDs. Clean up the incomplete manifest and retry.',
      )
    }

    // Verify references still exist
    const supplier = await User.findById(supplierId)
    const customer = await User.findById(customerId)
    const location = await Location.findById(locationId)

    if (
      !supplier ||
      supplier.type !== bookcarsTypes.UserType.Supplier ||
      !supplier.active
    ) {
      throw new Error(
        'The original active supplier is missing or no longer valid.',
      )
    }

    let supplierChanged = false
    if (!supplier.avatar) {
      supplier.avatar = 'supplier.png'
      supplierChanged = true
    }
    if (supplier.fullName === '[DEV SEED] Supplier') {
      supplier.fullName = process.env.SEED_DEV_SUPPLIER_NAME || 'Apex Car Rentals'
      supplierChanged = true
    }
    if (supplierChanged) {
      await supplier.save()
    }

    if (!customer || customer.type !== bookcarsTypes.UserType.User) {
      throw new Error('The original seed customer is missing or no longer valid.')
    }

    if (!customer.avatar) {
      customer.avatar = 'customer.png'
      await customer.save()
    }

    if (!location) {
      throw new Error('The original seed location no longer exists.')
    }

    // 4. Seed Cars
    const createdCars: any[] = []
    for (const data of seedCars) {
      let car = await Car.findOne({
        _id: { $in: carIds },
        name: data.name,
      })

      if (car) {
        if (!car.image) {
          car.image = data.image
          await car.save()
        }
        logger.info(`Already seeded car: ${data.name}`)
        createdCars.push(car)
        continue
      }

      car = await Car.create({
        ...data,
        supplier: supplierId,
        locations: [locationId],
        minimumAge: env.MINIMUM_AGE,
        available: true,
        aircon: true,
        multimedia: [
          bookcarsTypes.CarMultimedia.Bluetooth,
        ],
        isDateBasedPrice: false,
        dateBasedPrices: [],
        trips: 10,
        rating: 4.5,
        co2: 120,
        blockOnPay: false,
      })

      await manifestCollection.updateOne(
        { _id: SEED_ID },
        { $addToSet: { carIds: car._id } },
      )

      createdCars.push(car)
      logger.info(`Created car ${data.name}: ${car._id.toString()}`)
    }

    // 5. Seed Bookings
    const now = new Date()
    const bookingConfigs = [
      {
        carIndex: 0,
        status: bookcarsTypes.BookingStatus.Paid,
        daysOffsetStart: 10,
        daysDuration: 4,
        price: 140,
        cancellation: true,
        hasAdditionalDriver: false,
      },
      {
        carIndex: 1,
        status: bookcarsTypes.BookingStatus.Deposit,
        daysOffsetStart: 20,
        daysDuration: 5,
        price: 275,
        isDeposit: true,
        hasAdditionalDriver: true,
      },
      {
        carIndex: 2,
        status: bookcarsTypes.BookingStatus.PaidInFull,
        daysOffsetStart: -30,
        daysDuration: 5,
        price: 325,
        isPayedInFull: true,
        hasAdditionalDriver: false,
      },
      {
        carIndex: 0,
        status: bookcarsTypes.BookingStatus.Cancelled,
        daysOffsetStart: -15,
        daysDuration: 3,
        price: 105,
        cancellation: true,
        hasAdditionalDriver: false,
      },
    ]

    for (let i = 0; i < bookingConfigs.length; i++) {
      const cfg = bookingConfigs[i]
      const car = createdCars[cfg.carIndex]
      if (!car) {
        continue
      }

      const fromDate = new Date(now.getTime() + cfg.daysOffsetStart * 24 * 60 * 60 * 1000)
      const toDate = new Date(fromDate.getTime() + cfg.daysDuration * 24 * 60 * 60 * 1000)

      // Check if booking already exists in manifest
      const existingBooking = await Booking.findOne({
        _id: { $in: bookingIds },
        car: car._id,
        driver: customerId,
        status: cfg.status,
      })

      if (existingBooking) {
        logger.info(`Already seeded booking #${i + 1} (${cfg.status})`)
        continue
      }

      let additionalDriverId: mongoose.Types.ObjectId | undefined
      if (cfg.hasAdditionalDriver) {
        const additionalDriver = await AdditionalDriver.create({
          fullName: process.env.SEED_DEV_EXTRA_DRIVER_NAME || 'Sarah Jenkins',
          email: process.env.SEED_DEV_EXTRA_DRIVER_EMAIL || 'dev-extra-driver@bookcars.ma',
          phone: process.env.SEED_DEV_EXTRA_DRIVER_PHONE || '+12025550199',
          birthDate: new Date('1995-05-15'),
        })
        additionalDriverId = additionalDriver._id
        await manifestCollection.updateOne(
          { _id: SEED_ID },
          { $addToSet: { additionalDriverIds: additionalDriver._id } },
        )
      }

      const booking = await Booking.create({
        supplier: supplierId,
        car: car._id,
        driver: customerId,
        pickupLocation: locationId,
        dropOffLocation: locationId,
        from: fromDate,
        to: toDate,
        status: cfg.status,
        cancellation: cfg.cancellation || false,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: false,
        fullInsurance: false,
        additionalDriver: cfg.hasAdditionalDriver,
        _additionalDriver: additionalDriverId,
        price: cfg.price,
        isDeposit: cfg.isDeposit || false,
        isPayedInFull: cfg.isPayedInFull || false,
      })

      await manifestCollection.updateOne(
        { _id: SEED_ID },
        { $addToSet: { bookingIds: booking._id } },
      )

      // Create notification for supplier
      const notifMsg = `Booking #${booking._id.toString().slice(-6)} update: ${cfg.status}`
      const notifSupplier = await Notification.create({
        user: supplierId,
        message: notifMsg,
        booking: booking._id,
        car: car._id,
        isRead: false,
      })

      // Create notification for customer
      const notifCustomer = await Notification.create({
        user: customerId,
        message: `Your booking for ${car.name} is ${cfg.status}`,
        booking: booking._id,
        car: car._id,
        isRead: false,
      })

      await manifestCollection.updateOne(
        { _id: SEED_ID },
        { $addToSet: { notificationIds: { $each: [notifSupplier._id, notifCustomer._id] } } },
      )

      logger.info(`Created booking #${i + 1} (${cfg.status}): ${booking._id.toString()}`)
    }

    // Update notification counter for supplier and customer
    const supplierPendingCount = await Notification.countDocuments({ user: supplierId, isRead: false })
    await NotificationCounter.findOneAndUpdate(
      { user: supplierId },
      { count: supplierPendingCount },
      { upsert: true },
    )
    const customerPendingCount = await Notification.countDocuments({ user: customerId, isRead: false })
    await NotificationCounter.findOneAndUpdate(
      { user: customerId },
      { count: customerPendingCount },
      { upsert: true },
    )

    logger.info('Development seed completed successfully.')
  } finally {
    await databaseHelper.close()
  }
}

try {
  await main()
} catch (error) {
  logger.error(
    'Development seed failed:',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
}