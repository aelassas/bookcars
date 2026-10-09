import 'dotenv/config'
import mongoose from 'mongoose'
import * as env from '../src/config/env.config'
import * as databaseHelper from '../src/utils/databaseHelper'
import * as logger from '../src/utils/logger'
import Booking from '../src/models/Booking'
import Car from '../src/models/Car'
import Country from '../src/models/Country'
import Location from '../src/models/Location'
import LocationValue from '../src/models/LocationValue'
import User from '../src/models/User'
import AdditionalDriver from '../src/models/AdditionalDriver'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'

const SEED_ID = 'bookcars-dev-seed-v1'
const SEED_COLLECTION = 'BookCarsDevSeed'

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

    const manifest = await manifestCollection.findOne({
      _id: SEED_ID,
    })

    if (!manifest) {
      logger.info('No development seed data found. Nothing to clean.')
      return
    }

    // 1. Delete notifications
    const notificationIds = manifest.notificationIds ?? []
    if (notificationIds.length > 0) {
      const notifResult = await Notification.deleteMany({ _id: { $in: notificationIds } })
      logger.info(`Deleted ${notifResult.deletedCount} seeded notification(s).`)
    }

    // 2. Delete bookings
    const bookingIds = manifest.bookingIds ?? []
    if (bookingIds.length > 0) {
      const bookingResult = await Booking.deleteMany({ _id: { $in: bookingIds } })
      logger.info(`Deleted ${bookingResult.deletedCount} seeded booking(s).`)
    }

    // 3. Delete additional drivers
    const additionalDriverIds = manifest.additionalDriverIds ?? []
    if (additionalDriverIds.length > 0) {
      const adResult = await AdditionalDriver.deleteMany({ _id: { $in: additionalDriverIds } })
      logger.info(`Deleted ${adResult.deletedCount} seeded additional driver(s).`)
    }

    // 4. Delete cars
    const carIds = manifest.carIds ?? []
    if (carIds.length > 0) {
      const carResult = await Car.deleteMany({ _id: { $in: carIds } })
      logger.info(`Deleted ${carResult.deletedCount} seeded car(s).`)
    }

    // 5. Delete seeded customer
    if (manifest.ownsCustomer && manifest.customerId) {
      const remainingCustomerBookings = await Booking.countDocuments({ driver: manifest.customerId })
      if (remainingCustomerBookings === 0) {
        await NotificationCounter.deleteMany({ user: manifest.customerId })
        await User.deleteOne({ _id: manifest.customerId })
        logger.info('Deleted owned development customer.')
      } else {
        logger.info('Preserved owned development customer because non-seed bookings reference it.')
      }
    }

    // 6. Delete seeded location
    const supplierId = manifest.supplierId
    const locationId = manifest.locationId

    if (manifest.ownsLocation && locationId) {
      const [remainingCars, bookings] = await Promise.all([
        Car.countDocuments({ locations: locationId }),
        Booking.countDocuments({ $or: [{ pickupLocation: locationId }, { dropOffLocation: locationId }] }),
      ])

      if (remainingCars === 0 && bookings === 0) {
        await Location.deleteOne({ _id: locationId })
        if (manifest.locationValueIds?.length) {
          await LocationValue.deleteMany({ _id: { $in: manifest.locationValueIds } })
        }
        logger.info('Deleted owned development location data.')
      } else {
        logger.info('Preserved owned development location data because it is still referenced.')
      }
    }

    // 7. Delete seeded country
    if (manifest.ownsCountry && manifest.countryId) {
      const remainingLocations = await Location.countDocuments({ country: manifest.countryId })
      if (remainingLocations === 0) {
        await Country.deleteOne({ _id: manifest.countryId })
        if (manifest.countryValueIds?.length) {
          await LocationValue.deleteMany({ _id: { $in: manifest.countryValueIds } })
        }
        logger.info('Deleted owned development country data.')
      }
    }

    // 8. Delete seeded supplier & reset counter
    if (manifest.ownsSupplier && supplierId) {
      const [remainingCars, bookings] = await Promise.all([
        Car.countDocuments({ supplier: supplierId }),
        Booking.countDocuments({ supplier: supplierId }),
      ])

      if (remainingCars === 0 && bookings === 0) {
        await NotificationCounter.deleteMany({ user: supplierId })
        await User.deleteOne({ _id: supplierId })
        logger.info('Deleted owned development supplier.')
      } else {
        logger.info('Preserved owned development supplier because it is still referenced.')
      }
    }

    // 9. Remove manifest
    await manifestCollection.deleteOne({
      _id: SEED_ID,
    })

    logger.info('Development seed cleanup completed successfully.')
  } finally {
    await databaseHelper.close()
  }
}

try {
  await main()
} catch (error) {
  logger.error(
    'Development seed cleanup failed:',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
}