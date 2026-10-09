import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Booking from '../models/Booking'
import Car from '../models/Car'

export const BOOKING_RESERVATION_STATUSES = [
  bookcarsTypes.BookingStatus.Deposit,
  bookcarsTypes.BookingStatus.Paid,
  bookcarsTypes.BookingStatus.PaidInFull,
  bookcarsTypes.BookingStatus.Reserved,
]

export class BookingConflictError extends Error {
  constructor() {
    super('The car is no longer available for the selected rental dates')
    this.name = 'BookingConflictError'
  }
}

export interface BookingSaveOptions {
  expectedStatus?: bookcarsTypes.BookingStatus
  requireExpireAt?: boolean
}

const reservesCar = (booking: env.Booking, now: Date) =>
  BOOKING_RESERVATION_STATUSES.includes(booking.status)
  || (booking.status === bookcarsTypes.BookingStatus.Void && !!booking.expireAt && booking.expireAt > now)

const overlaps = (first: env.Booking, second: env.Booking) =>
  first.from <= second.to && first.to >= second.from

// Simple queue-based lock for non-transactional environments
const carLocks = new Map<string, Promise<void>>()

const acquireLocks = async (carIds: string[]): Promise<() => void> => {
  const sortedCarIds = [...new Set(carIds)].sort()
  const releaseFns: (() => void)[] = []

  for (const carId of sortedCarIds) {
    let release: () => void
    const nextLock = new Promise<void>((resolve) => {
      release = resolve
    })

    const currentLock = carLocks.get(carId) || Promise.resolve()
    carLocks.set(carId, currentLock.then(() => nextLock))

    await currentLock
    releaseFns.push(release!)
  }

  return () => {
    for (const release of releaseFns) {
      release()
    }
  }
}

export const saveBookingsWithAvailability = async (bookings: env.Booking[], options: BookingSaveOptions = {}) => {
  const now = new Date()
  const reservingBookings = bookings.filter((booking) => reservesCar(booking, now))

  if (reservingBookings.length === 0) {
    for (const booking of bookings) {
      await booking.save()
    }
    return true
  }

  const client = mongoose.connection.getClient() as any
  const topologyType = client?.topology?.description?.type
  const supportsTransactions = topologyType && topologyType !== 'Single' && topologyType !== 'Unknown'

  const executeLogic = async (session?: mongoose.ClientSession) => {
    const sessionOpt = session ? { session } : {}

    if (options.expectedStatus) {
      const query = Booking.findOne({
        _id: bookings[0]._id,
        status: options.expectedStatus,
        ...(options.requireExpireAt ? { expireAt: { $ne: null } } : {}),
      }).select('_id').lean()

      if (session) {
        query.session(session)
      }
      const expectedBooking = await query

      if (!expectedBooking) {
        return false
      }
    }

    const carIds = [...new Set(reservingBookings.map((booking) => booking.car.toString()))].sort()
    const blockingCars = new Set<string>()

    for (const carId of carIds) {
      const query = Car.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(carId) },
        { $inc: { bookingReservationVersion: 1 } },
        { new: true, timestamps: false, ...sessionOpt },
      ).select('blockOnPay').lean()

      const car = await query

      if (!car) {
        throw new Error(`Car ${carId} not found`)
      }

      if (car.blockOnPay) {
        blockingCars.add(carId)
      }
    }

    const bookingIds = bookings.map((booking) => booking._id).filter(Boolean)

    for (const booking of reservingBookings) {
      const carId = booking.car.toString()
      if (!blockingCars.has(carId)) {
        continue
      }

      const query = Booking.findOne({
        _id: { $nin: bookingIds },
        car: new mongoose.Types.ObjectId(carId),
        from: { $lte: booking.to },
        to: { $gte: booking.from },$or: [
          { status: { $in: BOOKING_RESERVATION_STATUSES } },
          { status: bookcarsTypes.BookingStatus.Void, expireAt: { $gt: now } },
        ],
      }).select('_id').lean()

      if (session) {
        query.session(session)
      }
      const conflict = await query

      if (conflict) {
        throw new BookingConflictError()
      }
    }

    for (let firstIndex = 0; firstIndex < reservingBookings.length; firstIndex += 1) {
      const first = reservingBookings[firstIndex]
      if (!blockingCars.has(first.car.toString())) {
        continue
      }

      for (let secondIndex = firstIndex + 1; secondIndex < reservingBookings.length; secondIndex += 1) {
        const second = reservingBookings[secondIndex]
        if (first.car.toString() === second.car.toString() && overlaps(first, second)) {
          throw new BookingConflictError()
        }
      }
    }

    for (const booking of bookings) {
      await booking.save(sessionOpt)
    }

    return true
  }

  if (supportsTransactions) {
    return mongoose.connection.transaction(executeLogic)
  }

  const carIds = reservingBookings.map((b) => b.car.toString())
  const release = await acquireLocks(carIds)
  try {
    return await executeLogic()
  } finally {
    release()
  }
}

export const saveBookingWithAvailability = async (booking: env.Booking, options?: BookingSaveOptions) =>
  saveBookingsWithAvailability([booking], options)
