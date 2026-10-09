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

export const saveBookingsWithAvailability = async (bookings: env.Booking[], options: BookingSaveOptions = {}) => {
  const now = new Date()
  const reservingBookings = bookings.filter((booking) => reservesCar(booking, now))

  if (reservingBookings.length === 0) {
    for (const booking of bookings) {
      await booking.save()
    }
    return
  }

  return mongoose.connection.transaction(async (session) => {
    if (options.expectedStatus) {
      const expectedBooking = await Booking.findOne({
        _id: bookings[0]._id,
        status: options.expectedStatus,
        ...(options.requireExpireAt ? { expireAt: { $ne: null } } : {}),
      }).session(session).select('_id').lean()

      if (!expectedBooking) {
        return false
      }
    }

    const carIds = [...new Set(reservingBookings.map((booking) => booking.car.toString()))].sort()
    const blockingCars = new Set<string>()

    for (const carId of carIds) {
      const car = await Car.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(carId) },
        { $inc: { bookingReservationVersion: 1 } },
        { new: true, session, timestamps: false },
      ).select('blockOnPay').lean()

      if (!car) {
        throw new Error(`Car ${carId} not found`)
      }

      if (car.blockOnPay) {
        blockingCars.add(carId)
      }
    }

    const bookingIds = bookings.map((booking) => booking._id)

    for (const booking of reservingBookings) {
      const carId = booking.car.toString()
      if (!blockingCars.has(carId)) {
        continue
      }

      const conflict = await Booking.findOne({
        _id: { $nin: bookingIds },
        car: booking.car,
        from: { $lte: booking.to },
        to: { $gte: booking.from },
        $or: [
          { status: { $in: BOOKING_RESERVATION_STATUSES } },
          { status: bookcarsTypes.BookingStatus.Void, expireAt: { $gt: now } },
        ],
      }).select('_id').session(session).lean()

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
      await booking.save({ session })
    }

    return true
  })
}

export const saveBookingWithAvailability = async (booking: env.Booking, options?: BookingSaveOptions) =>
  saveBookingsWithAvailability([booking], options)